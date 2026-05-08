/**
 * Public read-only API — returns the most recent cached machine snapshot for
 * each known 123 Laundry location. The frontend polls this every minute and
 * runs its own client-side countdown ticker between polls.
 */
import { NextResponse } from "next/server";
import { kv, KV_KEYS } from "@/lib/kv";
import type { LocationSnapshot } from "@/lib/laundrycat";
import { buildAllSimulated } from "@/lib/simulated-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_SLUGS = ["spokane-valley", "deer-park"] as const;

export async function GET() {
  // The KV layer is backed by Postgres. In environments where DATABASE_URL
  // isn't set yet (e.g. the first prod deploy before we provision a hosted
  // DB), we don't want the route to 500 — we just gracefully fall through to
  // the simulated snapshot below.
  let lastSyncAt: string | null = null;
  let lastSyncOk: string | null = null;
  let lastError: { at: string; reason: string; detail: string | null } | null =
    null;
  let snapshots: (LocationSnapshot | null)[] = KNOWN_SLUGS.map(() => null);
  try {
    const results = await Promise.all([
      kv.get<string>(KV_KEYS.lastSyncAt),
      kv.get<string>(KV_KEYS.lastSyncOk),
      kv.get<{ at: string; reason: string; detail: string | null }>(
        KV_KEYS.lastSyncError,
      ),
      ...KNOWN_SLUGS.map((slug) =>
        kv.get<LocationSnapshot>(KV_KEYS.snapshot(slug)),
      ),
    ]);
    lastSyncAt = (results[0] as string | null) ?? null;
    lastSyncOk = (results[1] as string | null) ?? null;
    lastError =
      (results[2] as {
        at: string;
        reason: string;
        detail: string | null;
      } | null) ?? null;
    snapshots = results.slice(3) as (LocationSnapshot | null)[];
  } catch {
    // Postgres unreachable — fall through with empty data, the simulated
    // snapshot below keeps the homepage looking alive.
  }

  type Entry = {
    slug: (typeof KNOWN_SLUGS)[number];
    snapshot: LocationSnapshot;
  };
  let locations: Entry[] = KNOWN_SLUGS.flatMap((slug, i) => {
    const snapshot = snapshots[i];
    return snapshot ? [{ slug, snapshot }] : [];
  });

  // No real data in the cache yet (cold start, fresh deploy, relay offline
  // since boot). Render a synthesized example layout so the homepage stays
  // visually alive — the UI marks it clearly as "Example layout — live feed
  // paused" so visitors aren't misled.
  let isSimulated = false;
  if (locations.length === 0) {
    isSimulated = true;
    locations = buildAllSimulated() as Entry[];
  }

  return NextResponse.json(
    {
      lastSyncAt: lastSyncAt ?? null,
      lastSyncOk: lastSyncOk ?? null,
      lastError: lastError ?? null,
      simulated: isSimulated,
      locations,
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
