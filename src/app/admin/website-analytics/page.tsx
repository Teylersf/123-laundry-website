import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import {
  loadWebsiteAnalytics,
  type AnalyticsRankedRow,
  type AnalyticsSeriesPoint,
  type WebsiteAnalyticsReport,
} from "@/lib/website-analytics";
import { parseRange } from "../_range";
import { RangePicker } from "../_range-picker";
import { AnalyticsRefresh } from "./_analytics-refresh";

export const metadata: Metadata = {
  title: "Website analytics — 123 Laundry Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function wholeNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function percentage(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function duration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function MetricCard({
  label,
  value,
  note,
  live = false,
}: {
  label: string;
  value: string;
  note: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-soft p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">
        {live && <span className="size-2 rounded-full bg-emerald-300" />}
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-white/45">{note}</p>
    </div>
  );
}

function ReportCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-soft p-4 md:p-5">
      <header className="mb-4">
        <h2 className="font-display text-base font-bold text-white md:text-lg">
          {title}
        </h2>
        <p className="text-xs text-white/50 md:text-sm">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function EmptyData() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-white/75">No traffic yet</p>
      <p className="mt-1 text-xs leading-relaxed text-white/45">
        Collection starts with this launch. New visits appear here immediately.
      </p>
    </div>
  );
}

function RankedList({
  rows,
  primaryLabel,
  secondaryLabel,
}: {
  rows: AnalyticsRankedRow[];
  primaryLabel: string;
  secondaryLabel: string;
}) {
  if (rows.length === 0) return <EmptyData />;
  const max = Math.max(1, ...rows.map((row) => row.primary));

  return (
    <ol className="space-y-3">
      {rows.map((row, index) => (
        <li
          key={`${row.label}-${row.detail ?? ""}-${index}`}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"
        >
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-semibold text-white">
                {row.label}
              </p>
              <p className="shrink-0 text-xs font-semibold tabular-nums text-white/75">
                {wholeNumber(row.primary)} {primaryLabel}
              </p>
            </div>
            {row.detail && (
              <p className="truncate text-[11px] text-white/40">{row.detail}</p>
            )}
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-brand-300"
                style={{ width: `${Math.max(2, (row.primary / max) * 100)}%` }}
              />
            </div>
          </div>
          <span className="self-end pb-0.5 text-[11px] tabular-nums text-white/40">
            {wholeNumber(row.secondary)} {secondaryLabel}
          </span>
        </li>
      ))}
    </ol>
  );
}

function dayLabel(raw: string): string {
  if (!/^\d{8}$/.test(raw)) return raw;
  return `${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
}

function TrafficChart({ points }: { points: AnalyticsSeriesPoint[] }) {
  if (points.length === 0) return <EmptyData />;
  const maxViews = Math.max(1, ...points.map((point) => point.pageViews));
  const shown = points.slice(-31);

  return (
    <div>
      <div className="flex h-52 items-end gap-1 rounded-xl border border-white/5 bg-ink/40 px-3 pt-4">
        {shown.map((point) => (
          <div
            key={point.date}
            className="group relative flex h-full min-w-0 flex-1 items-end"
            title={`${dayLabel(point.date)}: ${wholeNumber(point.pageViews)} page views, ${wholeNumber(point.activeUsers)} visitors`}
          >
            <div
              className="w-full min-w-1 rounded-t bg-brand-300/80 transition-colors group-hover:bg-brand-200"
              style={{
                height: `${Math.max(3, (point.pageViews / maxViews) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/35">
        <span>{dayLabel(shown[0]?.date ?? "")}</span>
        <span>Page views per day</span>
        <span>{dayLabel(shown.at(-1)?.date ?? "")}</span>
      </div>
    </div>
  );
}

function SetupState() {
  return (
    <ReportCard
      title="Analytics report unavailable"
      subtitle="The dashboard is private to the existing 123 Laundry admin account."
    >
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-100">
        The private analytics database could not be loaded. No customer data or
        administrative credentials are exposed here.
      </div>
    </ReportCard>
  );
}

export default async function WebsiteAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireAdminSessionOrRedirect();
  const range = parseRange(await searchParams);
  let report: WebsiteAnalyticsReport | null = null;

  try {
    report = await loadWebsiteAnalytics(range);
  } catch {
    report = null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">
            Private first-party analytics
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white md:text-3xl">
            Website traffic
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Visitors, page views, acquisition, location, and device insights for
            123-laundry.com. Stored privately without Google, advertising IDs,
            or access to another project.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-semibold text-brand-200 hover:text-brand-100"
        >
          ← Machine dashboard
        </Link>
      </div>

      <RangePicker active={range} basePath="/admin/website-analytics" />
      <AnalyticsRefresh />

      {!report ? (
        <SetupState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Active now"
              value={wholeNumber(report.realtimeUsers)}
              note="Last 30 minutes"
              live
            />
            <MetricCard
              label="Visitors"
              value={wholeNumber(report.summary.activeUsers)}
              note={`${wholeNumber(report.summary.newUsers)} new`}
            />
            <MetricCard
              label="Sessions"
              value={wholeNumber(report.summary.sessions)}
              note="Total visits"
            />
            <MetricCard
              label="Page views"
              value={wholeNumber(report.summary.pageViews)}
              note="Pages viewed"
            />
            <MetricCard
              label="Engagement"
              value={percentage(report.summary.engagementRate)}
              note="10s active or 2+ pages"
            />
            <MetricCard
              label="Avg. session"
              value={duration(report.summary.averageSessionDuration)}
              note="Active time per visit"
            />
          </div>

          <ReportCard
            title={`Traffic trend — ${range.label}`}
            subtitle="Daily page views for the most recent 31 days in the selected range."
          >
            <TrafficChart points={report.daily} />
          </ReportCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ReportCard
              title="Top pages"
              subtitle="Which pages customers view most."
            >
              <RankedList
                rows={report.topPages}
                primaryLabel="views"
                secondaryLabel="visitors"
              />
            </ReportCard>
            <ReportCard
              title="Traffic sources"
              subtitle="How visitors found the website."
            >
              <RankedList
                rows={report.sources}
                primaryLabel="sessions"
                secondaryLabel="visitors"
              />
            </ReportCard>
            <ReportCard
              title="Visitor countries"
              subtitle="Aggregate geographic traffic—never individual addresses."
            >
              <RankedList
                rows={report.countries}
                primaryLabel="visitors"
                secondaryLabel="sessions"
              />
            </ReportCard>
            <ReportCard
              title="Devices"
              subtitle="Desktop, mobile, and tablet traffic."
            >
              <RankedList
                rows={report.devices}
                primaryLabel="visitors"
                secondaryLabel="sessions"
              />
            </ReportCard>
            <ReportCard
              title="Browsers & operating systems"
              subtitle="Technology used to reach the site."
            >
              <RankedList
                rows={report.browsers}
                primaryLabel="visitors"
                secondaryLabel="sessions"
              />
            </ReportCard>
          </div>

          <p className="text-center text-[11px] text-white/35">
            Report refreshed {report.generatedAt.toLocaleString("en-US")}
            {report.collectionStartedAt
              ? ` · Collection began ${report.collectionStartedAt.toLocaleString("en-US")}`
              : " · Collection begins with the first public visit"}
          </p>
        </>
      )}
    </div>
  );
}
