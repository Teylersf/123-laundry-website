import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import { LOCATION_LIST } from "@/lib/site-data";
import { parseRange, type ActiveRange } from "./_range";
import { RangePicker } from "./_range-picker";
import { kv, KV_KEYS } from "@/lib/kv";

export const metadata: Metadata = {
  title: "Admin dashboard — 123 Laundry",
  robots: { index: false, follow: false },
};

// The admin surface is data-driven — never precompute.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERCEL_ANALYTICS_URL =
  "https://vercel.com/teylerks-projects/123-laundry/analytics";

// SQL fragment for the WHERE clause. Empty when "all time" so Postgres does
// not add a bogus lower bound.
function rangeFilter(range: ActiveRange) {
  if (range.from && range.to) {
    return Prisma.sql`AND "capturedAt" >= ${range.from} AND "capturedAt" < ${range.to}`;
  }
  if (range.from) {
    return Prisma.sql`AND "capturedAt" >= ${range.from}`;
  }
  return Prisma.empty;
}

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

// 30-day aggregate per machine. Every poll is one minute apart, so
// busy_polls ≈ total minutes the machine was running in the window.
// `cycles` counts distinct statusTimestamp values while busy — LaundryCat
// updates statusTimestamp when a new cycle begins, so distinct values within
// the busy state give us a good approximation of load count.
type UsageRow = {
  locationSlug: string | null;
  machineNumber: string;
  kind: string;
  cycles: bigint;
  busy_polls: bigint;
  offline_polls: bigint;
  error_polls: bigint;
  total_polls: bigint;
  worst_rssi: number | null;
};

async function loadDashboard(range: ActiveRange) {
  const rf = rangeFilter(range);
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

  // Per-machine usage aggregate over the picked window. Everything the two
  // analytics cards below need in a single scan.
  const usage = await db.$queryRaw<UsageRow[]>`
    SELECT
      "locationSlug",
      "machineNumber",
      kind,
      COALESCE(COUNT(DISTINCT "statusTimestamp") FILTER (
        WHERE status = 'busy' AND "statusTimestamp" IS NOT NULL
      ), 0)::bigint AS cycles,
      SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END)::bigint AS busy_polls,
      SUM(CASE WHEN NOT "isOnline" THEN 1 ELSE 0 END)::bigint AS offline_polls,
      SUM(CASE
        WHEN ("errorCode1" IS NOT NULL AND "errorCode1" <> 0)
          OR ("errorCode2" IS NOT NULL AND "errorCode2" <> 0)
          OR ("errorCode3" IS NOT NULL AND "errorCode3" <> 0)
        THEN 1 ELSE 0
      END)::bigint AS error_polls,
      COUNT(*)::bigint AS total_polls,
      MIN("rssi") AS worst_rssi
    FROM machine_observations
    WHERE kind IN ('washer', 'dryer')
      ${rf}
    GROUP BY "locationSlug", "machineNumber", kind
  `;

  // Error events inside the picked window — non-zero on any of the three
  // codes. Top 50 most recent, so this doubles as an "all time" view when
  // the range is set to All.
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
    WHERE (("errorCode1" IS NOT NULL AND "errorCode1" <> 0)
       OR  ("errorCode2" IS NOT NULL AND "errorCode2" <> 0)
       OR  ("errorCode3" IS NOT NULL AND "errorCode3" <> 0))
      ${rf}
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
    usage,
  };
}

// ---------- Usage / risk shaping -------------------------------------------
type UsageMetric = {
  slug: string | null;
  id: string;
  kind: string;
  cycles: number;
  busyMinutes: number;    // 1 poll ≈ 1 minute
  offlineMinutes: number;
  errorMinutes: number;
  totalPolls: number;
  offlinePct: number;
  errorPct: number;
  worstRssi: number | null;
  // Composite repair-risk score. Weights are picked so a machine with any
  // real error signal outranks a merely well-used machine, but sustained
  // usage still contributes (moving parts wear out).
  wearScore: number;
};

function toUsageMetrics(rows: UsageRow[]): UsageMetric[] {
  return rows.map((r) => {
    const total = Number(r.total_polls);
    const busyMin = Number(r.busy_polls);
    const offlineMin = Number(r.offline_polls);
    const errorMin = Number(r.error_polls);
    const cycles = Number(r.cycles);
    const offlinePct = total > 0 ? offlineMin / total : 0;
    const errorPct = total > 0 ? errorMin / total : 0;
    const wearScore = cycles * 1 + errorMin * 5 + offlineMin * 2;
    return {
      slug: r.locationSlug,
      id: r.machineNumber,
      kind: r.kind,
      cycles,
      busyMinutes: busyMin,
      offlineMinutes: offlineMin,
      errorMinutes: errorMin,
      totalPolls: total,
      offlinePct,
      errorPct,
      worstRssi: r.worst_rssi,
      wearScore,
    };
  });
}

function formatMinutes(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
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

export default async function AdminDashboard(
  props: {
    searchParams: Promise<{ range?: string; from?: string; to?: string }>;
  },
) {
  await requireAdminSessionOrRedirect();
  const sp = await props.searchParams;
  const range = parseRange(sp);

  const { latestMachines, pipeline, util, errors, usage } = await loadDashboard(range);
  const homepageMachineDisplay =
    (await kv.get<"summary" | "detailed" | "off">(
      KV_KEYS.homepageMachineDisplay,
    )) ?? "summary";
  const now = Date.now();

  const usageMetrics = toUsageMetrics(usage);
  const usageByLocation = new Map<string, UsageMetric[]>();
  for (const m of usageMetrics) {
    const slug = m.slug ?? "unknown";
    if (!usageByLocation.has(slug)) usageByLocation.set(slug, []);
    usageByLocation.get(slug)!.push(m);
  }
  // Repair-risk watchlist: any machine that showed an error OR spent >5% of
  // the window offline OR is in the top quartile of usage (heavy wear).
  const cyclesSorted = [...usageMetrics].sort((a, b) => b.cycles - a.cycles);
  const q1Cycles = cyclesSorted[Math.floor(cyclesSorted.length / 4)]?.cycles ?? 0;
  const watchlist = usageMetrics
    .filter(
      (m) =>
        m.errorMinutes > 0 ||
        m.offlinePct > 0.05 ||
        (q1Cycles > 0 && m.cycles >= q1Cycles),
    )
    .sort((a, b) => b.wearScore - a.wearScore)
    .slice(0, 10);

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
          Every LaundryCat data point, captured every 60 seconds. Nothing is
          ever pruned — history grows forever.
        </p>
      </div>

      <Card
        title="Website traffic — Vercel Analytics"
        subtitle="The complete visitor dashboard for 123-laundry.com, hosted securely by Vercel."
      >
        <div className="rounded-2xl border border-brand-200/20 bg-linear-to-br from-brand/15 via-brand/5 to-transparent p-4 md:p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/25 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-100">
                <span className="size-2 rounded-full bg-emerald-300" />
                Official Vercel dashboard
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                See visitors, page views, bounce rate, top pages, referrers,
                countries, devices, browsers, and operating systems. Change the
                reporting window, filter to production traffic, and export
                panel data as CSV.
              </p>
            </div>
            <a
              href={VERCEL_ANALYTICS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              Open website analytics ↗
            </a>
          </div>
          <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/50">
            Vercel sign-in is required. Use the email address that was invited
            as a read-only Viewer; Viewer access cannot change the website or
            its settings.
          </p>
        </div>
      </Card>

      {/* ============================ LIVE ============================
          Current state of the stores. Numbers here reflect the most
          recent poll — they don't depend on the historical range picker
          below. */}
      <SectionDivider
        label="Live · right now"
        hint="Current state as of the last poll. Not affected by the time-range picker below."
      />

      <Card
        title="Homepage machine display"
        subtitle="This only changes what customers see on the homepage. Collection, history, and this admin dashboard always keep running."
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              Currently showing:{" "}
              <span className="text-brand-200">
                {homepageMachineDisplay === "detailed"
                  ? "Detailed live machines"
                  : homepageMachineDisplay === "summary"
                    ? "Friendly activity summary"
                    : "Hidden completely"}
              </span>
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
              The friendly summary groups live usage into four positive
              activity levels without publishing machine counts or timers.
              Detailed mode restores the original homepage floor exactly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { mode: "summary", label: "Friendly summary" },
              { mode: "detailed", label: "Detailed machines" },
              { mode: "off", label: "Hide section" },
            ].map((option) => (
              <form
                key={option.mode}
                action="/admin/homepage-status"
                method="post"
              >
                <input type="hidden" name="mode" value={option.mode} />
                <button
                  type="submit"
                  disabled={homepageMachineDisplay === option.mode}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    homepageMachineDisplay === option.mode
                      ? "cursor-default bg-brand text-white"
                      : "border border-white/15 bg-white/5 text-white/75 hover:border-brand-200 hover:text-brand-200"
                  }`}
                >
                  {option.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      </Card>

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

      {/* MACHINE ROSTER (live — one card per store) */}
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

      {/* TODAY'S RHYTHM — fixed 24h view, doesn't respond to the picker.
          Kept in the LIVE section because "the last day" reads as current
          activity to the owner, not as a historical trend. */}
      <Card
        title="Today's rhythm — last 24h"
        subtitle="Share of machines busy, bucketed by hour and by kind. Fixed 24-hour view."
      >
        {util.length === 0 ? (
          <p className="text-sm text-white/60">
            Not enough history yet — chart will populate as data accumulates.
          </p>
        ) : (
          <UtilChart util={util} />
        )}
      </Card>

      {/* ========================= HISTORICAL =========================
          Everything below responds to the RangePicker. Loading state is
          shown inside the picker so it's obvious a query is in flight. */}
      <SectionDivider
        label="Historical analytics"
        hint="Pick a window and every card below updates. Watch the spinner in the picker so you know when it's done."
      />

      <RangePicker active={range} />

      {/* USAGE RANKING */}
      <Card
        title={`Machine usage — ${range.label}`}
        subtitle="Which machines are pulling weight, which are barely touched. Cycles are load starts; run time is total minutes turning."
      >
        {usageMetrics.length === 0 ? (
          <p className="text-sm text-white/60">
            No usage data yet. Ranked lists appear as poll history builds up.
          </p>
        ) : (
          <div className="space-y-5">
            {Array.from(usageByLocation.entries()).map(([slug, rows]) => {
              const loc = LOCATION_LIST.find((l) => l.slug === slug);
              return (
                <div key={`usage-${slug}`}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-200">
                    {loc?.city ?? slug}
                  </h3>
                  {(["washer", "dryer"] as const).map((kind) => (
                    <UsageGroup
                      key={`usage-${slug}-${kind}`}
                      kind={kind}
                      rows={rows.filter((r) => r.kind === kind)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* REPAIR-RISK WATCHLIST */}
      <Card
        title={`Repair-risk watchlist — ${range.label}`}
        subtitle="Composite of cycles (wear), error events, and offline time. Higher score = more attention worth giving."
      >
        {watchlist.length === 0 ? (
          <p className="rounded-xl bg-emerald-400/10 px-3 py-4 text-sm text-emerald-200">
            No machines flagging. Once we have more history, the top wear +
            repair-risk machines will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {watchlist.map((m) => {
              const reasons: string[] = [];
              if (m.errorMinutes > 0)
                reasons.push(`${m.errorMinutes}m in error`);
              if (m.offlinePct > 0.05)
                reasons.push(`${Math.round(m.offlinePct * 100)}% offline`);
              if (m.cycles > 0) reasons.push(`${m.cycles} cycles`);
              if (typeof m.worstRssi === "number" && m.worstRssi < -80)
                reasons.push(`weak signal ${m.worstRssi} dBm`);
              return (
                <li
                  key={`risk-${m.slug}-${m.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 text-sm"
                >
                  <div>
                    <div className="font-mono text-base font-bold text-white">
                      {m.id}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50">
                      {m.kind} · {m.slug ?? "?"}
                    </div>
                  </div>
                  <div className="min-w-0 text-xs text-white/70">
                    {reasons.join(" · ")}
                  </div>
                  <div
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      m.errorMinutes > 0
                        ? "bg-red-500/20 text-red-200"
                        : m.offlinePct > 0.05
                          ? "bg-amber-400/20 text-amber-200"
                          : "bg-white/10 text-white/70"
                    }`}
                    title="Composite wear-and-tear score"
                  >
                    {m.wearScore}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ERROR TRACKER (scoped to picker window) */}
      <Card
        title={`Errors — ${range.label}`}
        subtitle="Any machine that reported a non-zero error code inside the selected window. Most recent first, top 50."
      >
        {errors.length === 0 ? (
          <p className="rounded-xl bg-emerald-400/10 px-3 py-4 text-sm text-emerald-200">
            No error codes in this window. All machines healthy.
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
    </div>
  );
}

// Visual break between the "live / right now" cards and the range-picker-
// driven historical analytics section. Big enough to signal a section
// change on mobile without spending a full card of vertical space.
function SectionDivider({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="pt-2">
      <div className="mb-2 flex items-center gap-3">
        <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-brand-200">
          {label}
        </span>
        <span className="h-px flex-1 bg-linear-to-r from-brand-200/40 to-transparent" />
      </div>
      {hint && <p className="text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

// Compact horizontal-bar list for one (location, kind) slice. Sorts by
// cycles desc so the busiest sit at the top; a small footer flags the
// quietest machine in the group so the owner can spot underused units.
function UsageGroup({ kind, rows }: { kind: "washer" | "dryer"; rows: UsageMetric[] }) {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.cycles - a.cycles);
  const maxCycles = Math.max(1, ...sorted.map((r) => r.cycles));
  const busiest = sorted[0];
  const quietest = sorted[sorted.length - 1];
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          {kind}s
        </h4>
        <span className="text-[11px] text-white/40">
          busiest {busiest.id} · quietest {quietest.id}
        </span>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((m) => {
          const pct = Math.round((m.cycles / maxCycles) * 100);
          return (
            <li
              key={`ug-${m.slug}-${m.id}`}
              className="grid grid-cols-[52px_1fr_auto] items-center gap-2 text-xs"
            >
              <span className="font-mono font-bold text-white">{m.id}</span>
              <div className="relative h-2 rounded-full bg-white/5">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    kind === "washer" ? "bg-brand-400" : "bg-amber-300"
                  }`}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-right text-white/70 tabular-nums">
                {m.cycles} · {formatMinutes(m.busyMinutes)}
              </span>
            </li>
          );
        })}
      </ul>
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
