import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import { cachedDashboardQuery } from "@/lib/admin-dashboard-cache";
import { LOCATION_LIST } from "@/lib/site-data";
import { parseRange, type ActiveRange } from "./_range";
import { RangePicker } from "./_range-picker";
import {
  HistoricalViewPicker,
  type HistoricalView,
} from "./_historical-view-picker";
import { kv, KV_KEYS } from "@/lib/kv";

export const metadata: Metadata = {
  title: "Admin dashboard — 123 Laundry",
  robots: { index: false, follow: false },
};

// The admin surface is data-driven — never precompute.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  currentTime: Date;
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

type PipelineRow = {
  raw_count: bigint;
  machine_count: bigint;
  first_capture: Date | null;
  last_capture: Date | null;
  current_time: Date;
};

function rangeCacheKey(range: ActiveRange): string {
  return [
    range.key,
    range.from?.toISOString() ?? "start",
    range.to?.toISOString() ?? "now",
  ].join(":");
}

function loadLatestMachines() {
  return cachedDashboardQuery("admin:latest-machines", 15_000, () =>
    db.$queryRaw<MachineRow[]>`
    WITH latest_location_snapshots AS (
      SELECT DISTINCT ON ("locationSlug")
        "locationSlug",
        "snapshotId"
      FROM location_observations
      WHERE "locationSlug" IS NOT NULL
      ORDER BY "locationSlug", "capturedAt" DESC
    )
    SELECT
      m."locationSlug",
      m."machineNumber",
      m.kind,
      m.status,
      m."rawLabel",
      m."remainingSeconds",
      m."endsAt",
      m."statusTimestamp",
      m."isOnline",
      m.rssi,
      m."errorCode1",
      m."errorCode2",
      m."errorCode3",
      m."isFirmwareUpdatePending",
      m."firmwareFilename",
      m."dateAdded",
      NOW() AS "currentTime"
    FROM machine_observations m
    INNER JOIN latest_location_snapshots latest
      ON latest."snapshotId" = m."snapshotId"
     AND latest."locationSlug" = m."locationSlug"
    ORDER BY m."locationSlug", m."machineNumber"
  `,
  );
}

function loadPipeline() {
  return cachedDashboardQuery("admin:pipeline", 30_000, async () => {
    const rows = await db.$queryRaw<PipelineRow[]>`
    SELECT
      GREATEST(COALESCE((
        SELECT reltuples::bigint FROM pg_class WHERE oid = 'raw_snapshots'::regclass
      ), 0), 0) AS raw_count,
      GREATEST(COALESCE((
        SELECT reltuples::bigint FROM pg_class WHERE oid = 'machine_observations'::regclass
      ), 0), 0) AS machine_count,
      (SELECT "capturedAt" FROM raw_snapshots ORDER BY "capturedAt" ASC LIMIT 1) AS first_capture,
      (SELECT "capturedAt" FROM raw_snapshots ORDER BY "capturedAt" DESC LIMIT 1) AS last_capture,
      NOW() AS current_time
    `;
    return rows[0] ?? {
      raw_count: BigInt(0),
      machine_count: BigInt(0),
      first_capture: null,
      last_capture: null,
      current_time: new Date(0),
    };
  });
}

function loadUtilization() {
  return cachedDashboardQuery("admin:utilization-24h", 60_000, () =>
    db.$queryRaw<UtilBucket[]>`
    SELECT
      DATE_TRUNC('hour', "capturedAt") AS bucket,
      kind,
      (SUM(CASE WHEN status='busy' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0)) AS busy_ratio
    FROM machine_observations
    WHERE kind IN ('washer','dryer')
      AND "capturedAt" > NOW() - INTERVAL '24 hours'
    GROUP BY 1, 2
    ORDER BY 1
  `,
  );
}

function loadUsage(range: ActiveRange) {
  const rf = rangeFilter(range);
  return cachedDashboardQuery(
    `admin:usage:${rangeCacheKey(range)}`,
    60_000,
    () => db.$queryRaw<UsageRow[]>`
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
  `,
  );
}

function loadErrors(range: ActiveRange) {
  const rf = rangeFilter(range);
  return cachedDashboardQuery(
    `admin:errors:${rangeCacheKey(range)}`,
    60_000,
    () => db.$queryRaw<ErrorRow[]>`
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
  `,
  );
}

function loadHomepageMachineDisplay() {
  return cachedDashboardQuery("admin:homepage-display", 15_000, async () =>
    ((await kv.get<"summary" | "detailed" | "off">(
      KV_KEYS.homepageMachineDisplay,
    )) ?? "summary"),
  );
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

export default async function AdminDashboard(props: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
}) {
  await requireAdminSessionOrRedirect();
  const searchParams = await props.searchParams;
  const range = parseRange(searchParams);
  const historicalView: HistoricalView | null =
    searchParams.view === "rhythm" ||
    searchParams.view === "usage" ||
    searchParams.view === "errors"
      ? searchParams.view
      : null;

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
          The dashboard appears immediately. Live database cards fill in as
          their data arrives; historical reports run only when requested.
        </p>
      </div>

      <WebsiteTrafficCard />

      <SectionDivider
        label="Live · right now"
        hint="Each box loads independently. A slow database section cannot hold up or crash the rest of the page."
      />

      <Suspense fallback={<DashboardCardSkeleton title="Homepage machine display" />}>
        <HomepageDisplayCard />
      </Suspense>
      <Suspense fallback={<DashboardCardSkeleton title="Data pipeline" />}>
        <PipelineCard />
      </Suspense>
      <Suspense fallback={<LiveMachinesSkeleton />}>
        <LiveMachineCards />
      </Suspense>

      <SectionDivider
        label="Historical analytics · load on request"
        hint="No historical database query runs until you choose one report below."
      />
      <HistoricalViewPicker active={historicalView} />

      {historicalView && (
        <>
          {historicalView !== "rhythm" && (
            <RangePicker
              active={range}
              persistentParams={{ view: historicalView }}
            />
          )}
          {historicalView === "rhythm" ? (
            <Suspense fallback={<DashboardCardSkeleton title="Today's rhythm — last 24h" tall />}>
              <UtilizationCard />
            </Suspense>
          ) : historicalView === "usage" ? (
            <Suspense fallback={<HistoricalUsageSkeleton />}>
              <HistoricalUsageCards range={range} />
            </Suspense>
          ) : (
            <Suspense fallback={<DashboardCardSkeleton title={`Errors — ${range.label}`} tall />}>
              <HistoricalErrorsCard range={range} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}

function WebsiteTrafficCard() {
  return (
    <Card
      title="Website traffic — private analytics"
      subtitle="A private customer-safe dashboard for 123-laundry.com, built directly into this admin."
    >
      <div className="rounded-2xl border border-brand-200/20 bg-linear-to-br from-brand/15 via-brand/5 to-transparent p-4 md:p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/25 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-100">
              <span className="size-2 rounded-full bg-emerald-300" />
              First-party admin report
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              See live visitors, sessions, page views, engagement, top pages,
              traffic sources, countries, devices, browsers, and operating
              systems without opening Vercel or seeing any other project.
            </p>
          </div>
          <Link
            href="/admin/website-analytics"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            View website traffic →
          </Link>
        </div>
      </div>
    </Card>
  );
}

async function HomepageDisplayCard() {
  let mode: "summary" | "detailed" | "off";
  try {
    mode = await loadHomepageMachineDisplay();
  } catch {
    return <SectionLoadError title="Homepage machine display" />;
  }
  return (
      <Card
        title="Homepage machine display"
        subtitle="This changes what customers see; collection and history keep running."
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-white">
            Currently showing:{" "}
            <span className="text-brand-200">
              {mode === "detailed"
                ? "Detailed live machines"
                : mode === "summary"
                  ? "Friendly activity summary"
                  : "Hidden completely"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { mode: "summary", label: "Friendly summary" },
              { mode: "detailed", label: "Detailed machines" },
              { mode: "off", label: "Hide section" },
            ].map((option) => (
              <form key={option.mode} action="/admin/homepage-status" method="post">
                <input type="hidden" name="mode" value={option.mode} />
                <button
                  type="submit"
                  disabled={mode === option.mode}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    mode === option.mode
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
  );
}

async function PipelineCard() {
  let pipeline: PipelineRow;
  try {
    pipeline = await loadPipeline();
  } catch {
    return <SectionLoadError title="Data pipeline" />;
  }
  const now = pipeline.current_time.getTime();
  return (
      <Card
        title="Data pipeline"
        subtitle="Approximate stored-row totals and exact first/last poll times."
      >
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <PipelineMetric label="Raw polls" value={pipeline.raw_count.toString()} />
          <PipelineMetric label="Machine rows" value={pipeline.machine_count.toString()} />
          <PipelineMetric
            label="Last poll"
            value={pipeline.last_capture ? `${formatDuration(now - pipeline.last_capture.getTime())} ago` : "—"}
          />
          <PipelineMetric
            label="First poll"
            value={pipeline.first_capture ? pipeline.first_capture.toLocaleString() : "—"}
          />
        </dl>
      </Card>
  );
}

function PipelineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-white/50">{label}</dt>
      <dd className="mt-0.5 font-display text-base font-bold text-white md:text-xl">
        {value}
      </dd>
    </div>
  );
}

function summarizeMachines(rows: MachineRow[]) {
  const washers = rows.filter((row) => row.kind === "washer");
  const dryers = rows.filter((row) => row.kind === "dryer");
  return {
    washerAvail: washers.filter((row) => row.status === "available").length,
    washerTotal: washers.length,
    washerOffline: washers.filter((row) => !row.isOnline).length,
    dryerAvail: dryers.filter((row) => row.status === "available").length,
    dryerTotal: dryers.length,
    dryerOffline: dryers.filter((row) => !row.isOnline).length,
    otherCount: rows.filter((row) => row.kind === "other").length,
    firmwareUpdates: rows.filter((row) => row.isFirmwareUpdatePending === true)
      .length,
  };
}

async function LiveMachineCards() {
  let machines: MachineRow[];
  try {
    machines = await loadLatestMachines();
  } catch {
    return <SectionLoadError title="Live machine status" />;
  }
  const now = machines[0]?.currentTime.getTime() ?? 0;
  const byLocation = new Map<string, MachineRow[]>();
  for (const location of LOCATION_LIST) byLocation.set(location.slug, []);
  for (const machine of machines) {
    const slug = machine.locationSlug ?? "unknown";
    if (!byLocation.has(slug)) byLocation.set(slug, []);
    byLocation.get(slug)!.push(machine);
  }

  return (
      <>
        {Array.from(byLocation.entries()).map(([slug, rows]) => {
          if (rows.length === 0) return null;
          const summary = summarizeMachines(rows);
          const location = LOCATION_LIST.find((item) => item.slug === slug);
          return (
            <Card key={slug} title={location?.name ?? slug} subtitle={location?.fullAddress ?? ""}>
              <div className="grid grid-cols-3 gap-2 text-center md:gap-3">
                <AvailabilityMetric value={summary.washerAvail} total={summary.washerTotal} label="Washers open" />
                <AvailabilityMetric value={summary.dryerAvail} total={summary.dryerTotal} label="Dryers open" />
                <AvailabilityMetric value={summary.otherCount} label="Companions" />
              </div>
              {(summary.washerOffline > 0 || summary.dryerOffline > 0 || summary.firmwareUpdates > 0) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {summary.washerOffline > 0 && <StatusWarning>{summary.washerOffline} washer offline</StatusWarning>}
                  {summary.dryerOffline > 0 && <StatusWarning>{summary.dryerOffline} dryer offline</StatusWarning>}
                  {summary.firmwareUpdates > 0 && <StatusWarning amber>{summary.firmwareUpdates} firmware update pending</StatusWarning>}
                </div>
              )}
            </Card>
          );
        })}

        {Array.from(byLocation.entries()).map(([slug, rows]) => {
          if (rows.length === 0) return null;
          const location = LOCATION_LIST.find((item) => item.slug === slug);
          return (
            <Card key={`roster-${slug}`} title={`Machine roster — ${location?.city ?? slug}`} subtitle="Current state of every machine. Sorted by number.">
              <ul className="divide-y divide-white/5">
                {rows.slice().sort((a, b) => a.machineNumber.localeCompare(b.machineNumber)).map((machine) => (
                  <li key={`${slug}-${machine.machineNumber}`} className="grid grid-cols-[minmax(0,72px)_1fr_auto] items-center gap-3 py-2.5 text-sm">
                    <div>
                      <div className="font-mono text-base font-bold text-white">{machine.machineNumber}</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/50">{machine.kind}</div>
                    </div>
                    <div className="min-w-0">
                      <StatusPill status={machine.status} isOnline={machine.isOnline} />
                      {machine.status === "busy" && machine.remainingSeconds != null && (
                        <span className="ml-2 text-xs text-white/60">{formatDuration(machine.remainingSeconds * 1000)} left</span>
                      )}
                      {machine.statusTimestamp && now > 0 && (
                        <div className="mt-0.5 truncate text-[11px] text-white/40">
                          since {formatDuration(now - machine.statusTimestamp.getTime())} ago
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-white/40">
                      {typeof machine.rssi === "number" && <div>RSSI {machine.rssi}</div>}
                      {machine.isFirmwareUpdatePending && <div className="text-amber-200">FW pending</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </>
  );
}

function AvailabilityMetric({ value, total, label }: { value: number; total?: number; label: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-2.5 md:p-3">
      <div className="font-display text-2xl font-black text-emerald-200 md:text-3xl">
        {value}
        {total != null && <span className="text-base text-white/50 md:text-lg">/{total}</span>}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-white/60 md:text-[11px]">{label}</div>
    </div>
  );
}

function StatusWarning({ children, amber = false }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-1 ${amber ? "bg-amber-400/20 text-amber-200" : "bg-red-500/15 text-red-300"}`}>
      {children}
    </span>
  );
}

async function UtilizationCard() {
  let util: UtilBucket[];
  try {
    util = await loadUtilization();
  } catch {
    return <SectionLoadError title="Today's rhythm — last 24h" />;
  }
  return (
      <Card title="Today's rhythm — last 24h" subtitle="Share of machines busy, bucketed by hour and by kind. Fixed 24-hour view.">
        {util.length === 0 ? (
          <p className="text-sm text-white/60">Not enough history yet — chart will populate as data accumulates.</p>
        ) : (
          <UtilChart util={util} />
        )}
      </Card>
  );
}

async function HistoricalUsageCards({ range }: { range: ActiveRange }) {
  let usage: UsageRow[];
  try {
    usage = await loadUsage(range);
  } catch {
    return <SectionLoadError title={`Usage and repair risk — ${range.label}`} />;
  }
  const metrics = toUsageMetrics(usage);
  const byLocation = new Map<string, UsageMetric[]>();
  for (const metric of metrics) {
    const slug = metric.slug ?? "unknown";
    if (!byLocation.has(slug)) byLocation.set(slug, []);
    byLocation.get(slug)!.push(metric);
  }
  const cyclesSorted = [...metrics].sort((a, b) => b.cycles - a.cycles);
  const threshold = cyclesSorted[Math.floor(cyclesSorted.length / 4)]?.cycles ?? 0;
  const watchlist = metrics
    .filter((metric) => metric.errorMinutes > 0 || metric.offlinePct > 0.05 || (threshold > 0 && metric.cycles >= threshold))
    .sort((a, b) => b.wearScore - a.wearScore)
    .slice(0, 10);

  return (
      <>
        <Card title={`Machine usage — ${range.label}`} subtitle="Cycles and runtime by machine. Loaded only on request.">
          {metrics.length === 0 ? (
            <p className="text-sm text-white/60">No usage data in this window.</p>
          ) : (
            <div className="space-y-5">
              {Array.from(byLocation.entries()).map(([slug, rows]) => {
                const location = LOCATION_LIST.find((item) => item.slug === slug);
                return (
                  <div key={`usage-${slug}`}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-200">{location?.city ?? slug}</h3>
                    {(["washer", "dryer"] as const).map((kind) => (
                      <UsageGroup key={`usage-${slug}-${kind}`} kind={kind} rows={rows.filter((row) => row.kind === kind)} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card title={`Repair-risk watchlist — ${range.label}`} subtitle="Composite of cycles, error events, and offline time.">
          {watchlist.length === 0 ? (
            <p className="rounded-xl bg-emerald-400/10 px-3 py-4 text-sm text-emerald-200">No machines are flagging in this window.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {watchlist.map((machine) => {
                const reasons: string[] = [];
                if (machine.errorMinutes > 0) reasons.push(`${machine.errorMinutes}m in error`);
                if (machine.offlinePct > 0.05) reasons.push(`${Math.round(machine.offlinePct * 100)}% offline`);
                if (machine.cycles > 0) reasons.push(`${machine.cycles} cycles`);
                return (
                  <li key={`risk-${machine.slug}-${machine.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 text-sm">
                    <div>
                      <div className="font-mono text-base font-bold text-white">{machine.id}</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/50">{machine.kind} · {machine.slug ?? "?"}</div>
                    </div>
                    <div className="min-w-0 text-xs text-white/70">{reasons.join(" · ")}</div>
                    <div className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/70">{machine.wearScore}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </>
  );
}

async function HistoricalErrorsCard({ range }: { range: ActiveRange }) {
  let errors: ErrorRow[];
  try {
    errors = await loadErrors(range);
  } catch {
    return <SectionLoadError title={`Errors — ${range.label}`} />;
  }
  return (
      <Card title={`Errors — ${range.label}`} subtitle="Non-zero LaundryCat error codes. Most recent first, top 50.">
        {errors.length === 0 ? (
          <p className="rounded-xl bg-emerald-400/10 px-3 py-4 text-sm text-emerald-200">No error codes in this window. All machines healthy.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {errors.slice(0, 20).map((error, index) => (
              <li key={`${error.capturedAt.toISOString()}-${error.machineNumber}-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2 text-sm">
                <span className="font-mono text-xs text-white/50">{error.capturedAt.toLocaleString()}</span>
                <span className="text-white"><b>{error.machineNumber}</b> <span className="text-white/50">({error.locationSlug ?? "?"})</span></span>
                <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
                  {[error.errorCode1, error.errorCode2, error.errorCode3].filter((code) => code != null && code !== 0).join(" / ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
  );
}

function DashboardCardSkeleton({ title, tall = false }: { title: string; tall?: boolean }) {
  return (
    <section className={`animate-pulse rounded-2xl border border-white/10 bg-ink-soft p-4 md:p-5 ${tall ? "min-h-48" : "min-h-32"}`} aria-busy="true" aria-label={`Loading ${title}`}>
      <h2 className="font-display text-base font-bold text-white/70 md:text-lg">{title}</h2>
      <div className="mt-3 h-3 w-64 max-w-full rounded bg-white/10" />
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 rounded-xl bg-white/5" />)}
      </div>
    </section>
  );
}

function LiveMachinesSkeleton() {
  return (
    <>
      <DashboardCardSkeleton title="Deer Park live machines" tall />
      <DashboardCardSkeleton title="Spokane Valley live machines" tall />
    </>
  );
}

function HistoricalUsageSkeleton() {
  return (
    <>
      <DashboardCardSkeleton title="Machine usage" tall />
      <DashboardCardSkeleton title="Repair-risk watchlist" tall />
    </>
  );
}

function SectionLoadError({ title }: { title: string }) {
  return (
    <Card title={title} subtitle="The rest of the dashboard is still available.">
      <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-4 text-sm text-amber-100">
        This box could not load. Reload once to retry; repeated clicks are automatically coalesced.
      </p>
    </Card>
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
