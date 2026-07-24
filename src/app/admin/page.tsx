import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import { LOCATION_LIST } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Admin dashboard — 123 Laundry",
  robots: { index: false, follow: false },
};

// The admin surface is data-driven — never precompute.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MachineRow = {
  locationSlug: string | null;
  machineNumber: string;
  kind: string;
  status: string;
  rawLabel: string;
  remainingSeconds: number | null;
  endsAt: Date | null;
  statusTimestamp: Date | null;
  isOnline: boolean;
  rssi: number | null;
  errorCode1: number | null;
  errorCode2: number | null;
  errorCode3: number | null;
  isFirmwareUpdatePending: boolean | null;
  firmwareFilename: string | null;
  dateAdded: Date | null;
};

type UtilBucket = {
  bucket: Date;
  kind: string;
  busy_ratio: number | null;
};

type ErrorRow = {
  capturedAt: Date;
  locationSlug: string | null;
  machineNumber: string;
  errorCode1: number | null;
  errorCode2: number | null;
  errorCode3: number | null;
  rawLabel: string;
};

async function loadDashboard() {
  // Latest observation per machine (per location) — DISTINCT ON keeps this to
  // one row per machine even with 60s-cadence writes.
  const latestMachines = await db.$queryRaw<MachineRow[]>`
    SELECT DISTINCT ON ("locationSlug", "machineNumber")
      "locationSlug",
      "machineNumber",
      kind,
      status,
      "rawLabel",
      "remainingSeconds",
      "endsAt",
      "statusTimestamp",
      "isOnline",
      rssi,
      "errorCode1",
      "errorCode2",
      "errorCode3",
      "isFirmwareUpdatePending",
      "firmwareFilename",
      "dateAdded"
    FROM machine_observations
    ORDER BY "locationSlug", "machineNumber", "capturedAt" DESC
  `;

  // Pipeline health: how much data have we captured, when was the last poll.
  const pipeline = await db.$queryRaw<
    Array<{
      raw_count: bigint;
      machine_count: bigint;
      first_capture: Date | null;
      last_capture: Date | null;
    }>
  >`
    SELECT
      (SELECT COUNT(*)::bigint FROM raw_snapshots)          AS raw_count,
      (SELECT COUNT(*)::bigint FROM machine_observations)   AS machine_count,
      (SELECT MIN("capturedAt") FROM raw_snapshots)         AS first_capture,
      (SELECT MAX("capturedAt") FROM raw_snapshots)         AS last_capture
  `;

  // Hourly utilization for the last 24h, per machine kind. Empty until we
  // have a few hours of data.
  const util = await db.$queryRaw<UtilBucket[]>`
    SELECT
      DATE_TRUNC('hour', "capturedAt") AS bucket,
      kind,
      (SUM(CASE WHEN status='busy' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0)) AS busy_ratio
    FROM machine_observations
    WHERE kind IN ('washer','dryer')
      AND "capturedAt" > NOW() - INTERVAL '24 hours'
    GROUP BY 1, 2
    ORDER BY 1
  `;

  // Error events in the last 7 days — non-zero on any of the three codes.
  const errors = await db.$queryRaw<ErrorRow[]>`
    SELECT
      "capturedAt",
      "locationSlug",
      "machineNumber",
      "errorCode1",
      "errorCode2",
      "errorCode3",
      "rawLabel"
    FROM machine_observations
    WHERE ("errorCode1" IS NOT NULL AND "errorCode1" <> 0)
       OR ("errorCode2" IS NOT NULL AND "errorCode2" <> 0)
       OR ("errorCode3" IS NOT NULL AND "errorCode3" <> 0)
    ORDER BY "capturedAt" DESC
    LIMIT 50
  `;

  return {
    latestMachines,
    pipeline: pipeline[0] ?? {
      raw_count: BigInt(0),
      machine_count: BigInt(0),
      first_capture: null,
      last_capture: null,
    },
    util,
    errors,
  };
}

function formatDuration(fromMs: number): string {
  if (!Number.isFinite(fromMs)) return "—";
  const s = Math.max(0, Math.floor(fromMs / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function StatusPill({ status, isOnline }: { status: string; isOnline: boolean }) {
  if (!isOnline) {
    return (
      <span className="inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300">
        offline
      </span>
    );
  }
  if (status === "busy") {
    return (
      <span className="inline-block rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
        busy
      </span>
    );
  }
  if (status === "available") {
    return (
      <span className="inline-block rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
        available
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60">
      {status}
    </span>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-soft p-4 md:p-5">
      <header className="mb-3">
        <h2 className="font-display text-base font-bold text-white md:text-lg">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-white/50 md:text-sm">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}

export default async function AdminDashboard() {
  await requireAdminSessionOrRedirect();

  const { latestMachines, pipeline, util, errors } = await loadDashboard();
  const now = Date.now();

  const knownSlugs = LOCATION_LIST.map((l) => l.slug);
  const byLocation = new Map<string, MachineRow[]>();
  for (const slug of knownSlugs) byLocation.set(slug, []);
  for (const m of latestMachines) {
    const slug = m.locationSlug ?? "unknown";
    if (!byLocation.has(slug)) byLocation.set(slug, []);
    byLocation.get(slug)!.push(m);
  }

  const summarise = (rows: MachineRow[]) => {
    const washers = rows.filter((r) => r.kind === "washer");
    const dryers = rows.filter((r) => r.kind === "dryer");
    const other = rows.filter((r) => r.kind === "other");
    return {
      washerAvail: washers.filter((r) => r.status === "available").length,
      washerTotal: washers.length,
      washerOffline: washers.filter((r) => !r.isOnline).length,
      dryerAvail: dryers.filter((r) => r.status === "available").length,
      dryerTotal: dryers.length,
      dryerOffline: dryers.filter((r) => !r.isOnline).length,
      otherCount: other.length,
      readerWeakSignals: rows.filter(
        (r) => typeof r.rssi === "number" && r.rssi < 0,
      ).length,
      firmwareUpdates: rows.filter((r) => r.isFirmwareUpdatePending === true)
        .length,
    };
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">
          Live analytics
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Every LaundryCat data point, captured every 60 seconds. Charts fill
          in as more history accumulates.
        </p>
      </div>

      {/* PIPELINE STATUS */}
      <Card
        title="Data pipeline"
        subtitle="How much history we've collected so far."
      >
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-white/50">Raw polls</dt>
            <dd className="mt-0.5 font-display text-xl font-bold text-white">
              {pipeline.raw_count.toString()}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Machine rows</dt>
            <dd className="mt-0.5 font-display text-xl font-bold text-white">
              {pipeline.machine_count.toString()}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Last poll</dt>
            <dd className="mt-0.5 font-display text-base font-bold text-white">
              {pipeline.last_capture
                ? `${formatDuration(now - pipeline.last_capture.getTime())} ago`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">First poll</dt>
            <dd className="mt-0.5 font-display text-base font-bold text-white">
              {pipeline.first_capture
                ? pipeline.first_capture.toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      {/* PER-LOCATION LIVE OVERVIEW */}
      {Array.from(byLocation.entries()).map(([slug, rows]) => {
        const s = summarise(rows);
        const loc = LOCATION_LIST.find((l) => l.slug === slug);
        if (rows.length === 0) return null;
        return (
          <Card
            key={slug}
            title={loc?.name ?? slug}
            subtitle={loc?.fullAddress ?? ""}
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/5 p-3">
                <div className="font-display text-3xl font-black text-emerald-200">
                  {s.washerAvail}
                  <span className="text-lg text-white/50">/{s.washerTotal}</span>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-white/60">
                  Washers open
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="font-display text-3xl font-black text-emerald-200">
                  {s.dryerAvail}
                  <span className="text-lg text-white/50">/{s.dryerTotal}</span>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-white/60">
                  Dryers open
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="font-display text-3xl font-black text-white">
                  {s.otherCount}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-white/60">
                  Companions
                </div>
              </div>
            </div>
            {(s.washerOffline > 0 ||
              s.dryerOffline > 0 ||
              s.firmwareUpdates > 0) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {s.washerOffline > 0 && (
                  <span className="rounded-full bg-red-500/15 px-2 py-1 text-red-300">
                    {s.washerOffline} washer{s.washerOffline > 1 ? "s" : ""} offline
                  </span>
                )}
                {s.dryerOffline > 0 && (
                  <span className="rounded-full bg-red-500/15 px-2 py-1 text-red-300">
                    {s.dryerOffline} dryer{s.dryerOffline > 1 ? "s" : ""} offline
                  </span>
                )}
                {s.firmwareUpdates > 0 && (
                  <span className="rounded-full bg-amber-400/20 px-2 py-1 text-amber-200">
                    {s.firmwareUpdates} firmware update pending
                  </span>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {/* ERROR TRACKER */}
      <Card
        title="Errors"
        subtitle="Any machine that reported a non-zero error code."
      >
        {errors.length === 0 ? (
          <p className="rounded-xl bg-emerald-400/10 px-3 py-4 text-sm text-emerald-200">
            No error codes in the observation history. All machines healthy.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {errors.slice(0, 20).map((e, idx) => (
              <li
                key={`${e.capturedAt.toISOString()}-${e.machineNumber}-${idx}`}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-white/50">
                  {e.capturedAt.toLocaleString()}
                </span>
                <span className="text-white">
                  <b>{e.machineNumber}</b>{" "}
                  <span className="text-white/50">
                    ({e.locationSlug ?? "?"})
                  </span>
                </span>
                <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
                  {[e.errorCode1, e.errorCode2, e.errorCode3]
                    .filter((c) => c != null && c !== 0)
                    .join(" / ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* UTILIZATION */}
      <Card
        title="Utilization (last 24h)"
        subtitle="Share of machines busy, bucketed by hour and by kind."
      >
        {util.length === 0 ? (
          <p className="text-sm text-white/60">
            Not enough history yet — chart will populate as data accumulates.
          </p>
        ) : (
          <UtilChart util={util} />
        )}
      </Card>

      {/* MACHINE ROSTER */}
      {Array.from(byLocation.entries()).map(([slug, rows]) => {
        if (rows.length === 0) return null;
        const loc = LOCATION_LIST.find((l) => l.slug === slug);
        return (
          <Card
            key={`roster-${slug}`}
            title={`Machine roster — ${loc?.city ?? slug}`}
            subtitle="Current state of every machine. Sorted by number."
          >
            <ul className="divide-y divide-white/5">
              {rows
                .slice()
                .sort((a, b) => a.machineNumber.localeCompare(b.machineNumber))
                .map((m) => (
                  <li
                    key={`${slug}-${m.machineNumber}`}
                    className="grid grid-cols-[minmax(0,72px)_1fr_auto] items-center gap-3 py-2.5 text-sm"
                  >
                    <div>
                      <div className="font-mono text-base font-bold text-white">
                        {m.machineNumber}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-white/50">
                        {m.kind}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <StatusPill status={m.status} isOnline={m.isOnline} />
                      {m.status === "busy" && m.remainingSeconds != null && (
                        <span className="ml-2 text-xs text-white/60">
                          {formatDuration(m.remainingSeconds * 1000)} left
                        </span>
                      )}
                      {m.statusTimestamp && (
                        <div className="mt-0.5 truncate text-[11px] text-white/40">
                          since{" "}
                          {formatDuration(
                            now - m.statusTimestamp.getTime(),
                          )}{" "}
                          ago
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-white/40">
                      {typeof m.rssi === "number" && (
                        <div>RSSI {m.rssi}</div>
                      )}
                      {m.isFirmwareUpdatePending && (
                        <div className="text-amber-200">FW pending</div>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function UtilChart({ util }: { util: UtilBucket[] }) {
  const byKind: Record<string, UtilBucket[]> = { washer: [], dryer: [] };
  for (const u of util) {
    if (u.kind === "washer" || u.kind === "dryer") byKind[u.kind].push(u);
  }
  return (
    <div className="space-y-4">
      {(["washer", "dryer"] as const).map((kind) => {
        const buckets = byKind[kind];
        if (buckets.length === 0) return null;
        return (
          <div key={kind}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-white/60">
                {kind}s
              </span>
              <span className="text-white/40">
                {buckets.length} hour{buckets.length === 1 ? "" : "s"} of data
              </span>
            </div>
            <div className="flex h-24 items-end gap-1">
              {buckets.map((b) => {
                const pct = Math.round((b.busy_ratio ?? 0) * 100);
                return (
                  <div
                    key={b.bucket.toISOString() + kind}
                    className="flex-1 rounded-t bg-brand"
                    style={{
                      height: `${Math.max(4, pct)}%`,
                      opacity: 0.35 + 0.65 * (pct / 100),
                    }}
                    title={`${b.bucket.toLocaleString()} — ${pct}% busy`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
