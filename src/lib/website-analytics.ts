import "server-only";

import { Prisma } from "@prisma/client";
import type { ActiveRange } from "@/app/admin/_range";
import { db } from "@/lib/db";

export type AnalyticsSummary = {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  engagementRate: number;
  averageSessionDuration: number;
};

export type AnalyticsSeriesPoint = {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
};

export type AnalyticsRankedRow = {
  label: string;
  detail?: string;
  primary: number;
  secondary: number;
};

export type WebsiteAnalyticsReport = {
  summary: AnalyticsSummary;
  realtimeUsers: number;
  daily: AnalyticsSeriesPoint[];
  topPages: AnalyticsRankedRow[];
  sources: AnalyticsRankedRow[];
  countries: AnalyticsRankedRow[];
  devices: AnalyticsRankedRow[];
  browsers: AnalyticsRankedRow[];
  generatedAt: Date;
  collectionStartedAt: Date | null;
};

type SummaryRow = {
  active_users: bigint;
  new_users: bigint;
  sessions: bigint;
  page_views: bigint;
  engagement_rate: number | null;
  average_session_duration: number | null;
  realtime_users: bigint;
  generated_at: Date;
  collection_started_at: Date | null;
};

type DailyRow = {
  day: Date;
  active_users: bigint;
  sessions: bigint;
  page_views: bigint;
};

type RankedRow = {
  label: string | null;
  detail: string | null;
  primary_value: bigint;
  secondary_value: bigint;
};

function eventRangeFilter(range: ActiveRange) {
  if (range.from && range.to) {
    return Prisma.sql`AND e."occurredAt" >= ${range.from} AND e."occurredAt" < ${range.to}`;
  }
  if (range.from) {
    return Prisma.sql`AND e."occurredAt" >= ${range.from}`;
  }
  return Prisma.empty;
}

function firstVisitRangeFilter(range: ActiveRange) {
  if (range.from && range.to) {
    return Prisma.sql`AND f.first_seen >= ${range.from} AND f.first_seen < ${range.to}`;
  }
  if (range.from) {
    return Prisma.sql`AND f.first_seen >= ${range.from}`;
  }
  return Prisma.empty;
}

function asNumber(value: bigint | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ranked(rows: RankedRow[]): AnalyticsRankedRow[] {
  return rows.map((row) => ({
    label: row.label || "Unknown",
    detail: row.detail || undefined,
    primary: asNumber(row.primary_value),
    secondary: asNumber(row.secondary_value),
  }));
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export async function loadWebsiteAnalytics(
  range: ActiveRange,
): Promise<WebsiteAnalyticsReport> {
  const rangeFilter = eventRangeFilter(range);
  const firstFilter = firstVisitRangeFilter(range);

  const [
    summaryRows,
    dailyRows,
    pageRows,
    sourceRows,
    countryRows,
    deviceRows,
    browserRows,
  ] = await db.$transaction([
    db.$queryRaw<SummaryRow[]>`
        WITH ranged AS (
          SELECT *
          FROM web_analytics_events e
          WHERE TRUE ${rangeFilter}
        ),
        session_stats AS (
          SELECT
            "sessionId",
            COUNT(*)::bigint AS page_views,
            SUM("engagedSeconds")::bigint AS engaged_seconds
          FROM ranged
          GROUP BY "sessionId"
        ),
        first_visits AS (
          SELECT "visitorId", MIN("occurredAt") AS first_seen
          FROM web_analytics_events
          GROUP BY "visitorId"
        ),
        ranged_visitors AS (
          SELECT DISTINCT "visitorId" FROM ranged
        )
        SELECT
          (SELECT COUNT(DISTINCT "visitorId")::bigint FROM ranged) AS active_users,
          (SELECT COUNT(*)::bigint
             FROM ranged_visitors rv
             JOIN first_visits f ON f."visitorId" = rv."visitorId"
            WHERE TRUE ${firstFilter}) AS new_users,
          (SELECT COUNT(DISTINCT "sessionId")::bigint FROM ranged) AS sessions,
          (SELECT COUNT(*)::bigint FROM ranged) AS page_views,
          COALESCE((SELECT AVG(
            CASE WHEN page_views >= 2 OR engaged_seconds >= 10 THEN 1.0 ELSE 0.0 END
          )::float FROM session_stats), 0)::float AS engagement_rate,
          COALESCE((SELECT AVG(engaged_seconds)::float FROM session_stats), 0)::float
            AS average_session_duration,
          (SELECT COUNT(DISTINCT "visitorId")::bigint
             FROM web_analytics_events
            WHERE "occurredAt" >= NOW() - INTERVAL '30 minutes') AS realtime_users,
          NOW() AS generated_at,
          (SELECT MIN("occurredAt") FROM web_analytics_events) AS collection_started_at
      `,
    db.$queryRaw<DailyRow[]>`
        SELECT
          DATE_TRUNC('day', e."occurredAt" AT TIME ZONE 'America/Los_Angeles') AS day,
          COUNT(DISTINCT e."visitorId")::bigint AS active_users,
          COUNT(DISTINCT e."sessionId")::bigint AS sessions,
          COUNT(*)::bigint AS page_views
        FROM web_analytics_events e
        WHERE TRUE ${rangeFilter}
        GROUP BY 1
        ORDER BY 1
      `,
    db.$queryRaw<RankedRow[]>`
        SELECT
          e.path AS label,
          MAX(e.title) AS detail,
          COUNT(*)::bigint AS primary_value,
          COUNT(DISTINCT e."visitorId")::bigint AS secondary_value
        FROM web_analytics_events e
        WHERE TRUE ${rangeFilter}
        GROUP BY e.path
        ORDER BY primary_value DESC, e.path
        LIMIT 12
      `,
    db.$queryRaw<RankedRow[]>`
        SELECT
          CASE
            WHEN e."adSource" = 'google_ads' THEN 'Google Ads'
            WHEN LOWER(COALESCE(e."utmSource", '')) = 'p3d'
              AND LOWER(COALESCE(e."utmMedium", '')) = 'display'
              THEN 'StackAdapt Display'
            ELSE COALESCE(
              NULLIF(e."utmSource", ''),
              NULLIF(e."referrerHost", ''),
              'Direct'
            )
          END AS label,
          CASE
            WHEN e."adSource" = 'google_ads' THEN CONCAT_WS(
              ' · ',
              'Paid ad',
              NULLIF(e."utmCampaign", '')
            )
            WHEN LOWER(COALESCE(e."utmSource", '')) = 'p3d'
              AND LOWER(COALESCE(e."utmMedium", '')) = 'display'
              THEN CONCAT_WS(
                ' · ',
                'Original source: P3D',
                NULLIF(e."utmCampaign", '')
              )
            ELSE COALESCE(
              NULLIF(e."utmMedium", ''),
              CASE WHEN e."referrerHost" IS NOT NULL THEN 'referral' ELSE NULL END
            )
          END AS detail,
          COUNT(DISTINCT e."sessionId")::bigint AS primary_value,
          COUNT(DISTINCT e."visitorId")::bigint AS secondary_value
        FROM web_analytics_events e
        WHERE e."isLanding" = TRUE ${rangeFilter}
        GROUP BY 1, 2
        ORDER BY primary_value DESC, label
        LIMIT 12
      `,
    db.$queryRaw<RankedRow[]>`
        SELECT
          COALESCE(e.country, 'Unknown') AS label,
          NULL::text AS detail,
          COUNT(DISTINCT e."visitorId")::bigint AS primary_value,
          COUNT(DISTINCT e."sessionId")::bigint AS secondary_value
        FROM web_analytics_events e
        WHERE TRUE ${rangeFilter}
        GROUP BY e.country
        ORDER BY primary_value DESC, label
        LIMIT 10
      `,
    db.$queryRaw<RankedRow[]>`
        SELECT
          INITCAP(e."deviceCategory") AS label,
          NULL::text AS detail,
          COUNT(DISTINCT e."visitorId")::bigint AS primary_value,
          COUNT(DISTINCT e."sessionId")::bigint AS secondary_value
        FROM web_analytics_events e
        WHERE TRUE ${rangeFilter}
        GROUP BY e."deviceCategory"
        ORDER BY primary_value DESC, label
        LIMIT 10
      `,
    db.$queryRaw<RankedRow[]>`
        SELECT
          e.browser AS label,
          e."operatingSystem" AS detail,
          COUNT(DISTINCT e."visitorId")::bigint AS primary_value,
          COUNT(DISTINCT e."sessionId")::bigint AS secondary_value
        FROM web_analytics_events e
        WHERE TRUE ${rangeFilter}
        GROUP BY e.browser, e."operatingSystem"
        ORDER BY primary_value DESC, label
        LIMIT 10
      `,
  ]);

  const summary = summaryRows[0] ?? {
    active_users: BigInt(0),
    new_users: BigInt(0),
    sessions: BigInt(0),
    page_views: BigInt(0),
    engagement_rate: 0,
    average_session_duration: 0,
    realtime_users: BigInt(0),
    generated_at: new Date(0),
    collection_started_at: null,
  };

  return {
    summary: {
      activeUsers: asNumber(summary.active_users),
      newUsers: asNumber(summary.new_users),
      sessions: asNumber(summary.sessions),
      pageViews: asNumber(summary.page_views),
      engagementRate: asNumber(summary.engagement_rate),
      averageSessionDuration: asNumber(summary.average_session_duration),
    },
    realtimeUsers: asNumber(summary.realtime_users),
    daily: dailyRows.map((row) => ({
      date: row.day.toISOString().slice(0, 10).replaceAll("-", ""),
      activeUsers: asNumber(row.active_users),
      sessions: asNumber(row.sessions),
      pageViews: asNumber(row.page_views),
    })),
    topPages: ranked(pageRows),
    sources: ranked(sourceRows),
    countries: ranked(countryRows).map((row) => ({
      ...row,
      label: row.label === "Unknown" ? row.label : countryName(row.label),
    })),
    devices: ranked(deviceRows),
    browsers: ranked(browserRows),
    generatedAt: summary.generated_at,
    collectionStartedAt: summary.collection_started_at,
  };
}
