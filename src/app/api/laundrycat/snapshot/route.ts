/**
 * Snapshot ingest endpoint.
 *
 * The local relay daemon runs a persistent Playwright window pointed at
 * https://www.laundrycat.com/availability. It polls the same `/machines`
 * JSON endpoint LaundryCat's own page uses, then POSTs the raw response
 * here so we can normalize it and cache it for the homepage.
 *
 * This bypasses the entire CAPTCHA/proxy/2Captcha morass — the page itself
 * authenticates via the owner's already-trusted browser session, and the
 * session keeps refreshing as long as the tab stays open.
 *
 * Auth: shared bearer token in `ADMIN_INGEST_TOKEN` (or `x-ingest-token`
 * header for cross-origin scripts).
 */
import { NextResponse } from "next/server";
import { kv, KV_KEYS } from "@/lib/kv";
import {
  inferLocationSlug,
  snapshotFromJson,
  type LocationSnapshot,
} from "@/lib/laundrycat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_INGEST_TOKEN;
  if (!expected) return false;
  const auth =
    req.headers.get("authorization") ??
    req.headers.get("Authorization") ??
    "";
  if (auth === `Bearer ${expected}`) return true;
  return (req.headers.get("x-ingest-token") ?? "") === expected;
}

const CORS = {
  "Access-Control-Allow-Origin": "https://www.laundrycat.com",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, authorization, x-ingest-token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const SNAPSHOT_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: CORS },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "expected JSON body" },
      { status: 400, headers: CORS },
    );
  }

  // Accept both shapes:
  //  { rawJson: <the /machines response> }
  //  <the /machines response itself>
  const raw =
    body && typeof body === "object" && "rawJson" in body
      ? (body as Record<string, unknown>).rawJson
      : body;

  if (
    !raw ||
    typeof raw !== "object" ||
    !("display_locations" in (raw as Record<string, unknown>))
  ) {
    return NextResponse.json(
      { error: "expected /machines JSON shape with display_locations" },
      { status: 400, headers: CORS },
    );
  }

  const snapshots = snapshotFromJson(raw as Parameters<typeof snapshotFromJson>[0]);
  if (snapshots.length === 0) {
    return NextResponse.json(
      { error: "no display_locations in payload" },
      { status: 400, headers: CORS },
    );
  }

  const now = new Date().toISOString();
  const stored: Array<{
    slug: string;
    label: string;
    washersAvailable: number;
    dryersAvailable: number;
    machineCount: number;
  }> = [];

  try {
    // LaundryCat already owns machine history. Keep only the latest state for
    // each location instead of duplicating every machine on every poll.
    for (const snapshot of snapshots) {
      const slug = inferLocationSlug(snapshot.locationLabel);
      if (!slug) continue;

      await storeSnapshot(slug, snapshot);
      stored.push({
        slug,
        label: snapshot.locationLabel,
        washersAvailable: snapshot.washersAvailable,
        dryersAvailable: snapshot.dryersAvailable,
        machineCount: snapshot.machines.length,
      });
    }

    await kv.set(KV_KEYS.lastSyncAt, now);
    await kv.set(KV_KEYS.lastSyncOk, now);
    await kv.del(KV_KEYS.lastSyncError);
  } catch (err) {
    return NextResponse.json(
      {
        error: "storage failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500, headers: CORS },
    );
  }

  return NextResponse.json({ ok: true, fetchedAt: now, locations: stored }, {
    headers: CORS,
  });
}

async function storeSnapshot(slug: string, snapshot: LocationSnapshot) {
  await kv.set(KV_KEYS.snapshot(slug), snapshot, { ex: SNAPSHOT_TTL_SECONDS });
}
