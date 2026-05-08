/**
 * Vercel cron target — runs every 5 minutes (see vercel.json).
 *
 * Vercel signs cron requests with the `CRON_SECRET` env var and includes it
 * in the `Authorization: Bearer …` header. We require that match to prevent
 * arbitrary internet requests from triggering a CAPTCHA-spending login loop.
 */
import { NextResponse } from "next/server";
import {
  fetchLaundryCatSnapshot,
  inferLocationSlug,
  type LocationSnapshot,
} from "@/lib/laundrycat";
import { kv, KV_KEYS } from "@/lib/kv";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // local dev — no secret required
  const got =
    req.headers.get("authorization") ??
    req.headers.get("Authorization") ??
    "";
  return got === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await fetchLaundryCatSnapshot();
  const now = new Date().toISOString();
  await kv.set(KV_KEYS.lastSyncAt, now);

  if (!result.ok) {
    await kv.set(KV_KEYS.lastSyncError, {
      at: now,
      reason: result.reason,
      detail: result.detail ?? null,
    });
    return NextResponse.json(
      { ok: false, reason: result.reason, detail: result.detail ?? null },
      { status: 502 },
    );
  }

  const stored: {
    slug: string;
    label: string;
    washersAvailable: number;
    washersTotal: number;
    dryersAvailable: number;
    dryersTotal: number;
    machineCount: number;
  }[] = [];

  for (const snapshot of result.snapshots) {
    const slug =
      inferLocationSlug(snapshot.locationLabel) ?? "spokane-valley";
    await storeSnapshot(slug, snapshot);
    revalidateTag(`machines:${slug}`, "max");
    stored.push({
      slug,
      label: snapshot.locationLabel,
      washersAvailable: snapshot.washersAvailable,
      washersTotal: snapshot.washersTotal,
      dryersAvailable: snapshot.dryersAvailable,
      dryersTotal: snapshot.dryersTotal,
      machineCount: snapshot.machines.length,
    });
  }

  // Track *successful* syncs separately from sync attempts. The UI uses this
  // (and the snapshot's own fetchedAt) to decide whether the live data is
  // fresh, slightly stale, or really stale.
  await kv.set(KV_KEYS.lastSyncOk, now);
  await kv.del(KV_KEYS.lastSyncError);

  return NextResponse.json({
    ok: true,
    fetchedAt: now,
    locations: stored,
  });
}

// Snapshots persist for 7 days. Even if the relay or cron is wedged for a
// while, the homepage will keep showing the last known floor with a clear
// "stale" indicator instead of silently emptying out.
const SNAPSHOT_TTL_SECONDS = 7 * 24 * 60 * 60;

async function storeSnapshot(slug: string, snapshot: LocationSnapshot) {
  await kv.set(KV_KEYS.snapshot(slug), snapshot, { ex: SNAPSHOT_TTL_SECONDS });
}
