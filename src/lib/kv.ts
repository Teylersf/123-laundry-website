/**
 * Storage layer for the live-machine-status pipeline.
 *
 * Backed by a single `kv_entries` table in Postgres (see prisma/schema.prisma).
 * The API mirrors a tiny KV/Redis surface so we can swap to Upstash, Vercel KV,
 * or any other store later without touching callers. Expired rows are pruned
 * lazily on read.
 */
import { db } from "./db";

export const KV_KEYS = {
  session: "lc:session", // { cookie, capturedAt, expiresAt }
  snapshot: (locationSlug: string) => `lc:snapshot:${locationSlug}`,
  lastSyncError: "lc:lastError",
  lastSyncAt: "lc:lastSyncAt", // last sync attempt (success or failure)
  lastSyncOk: "lc:lastSyncOk", // last *successful* sync — drives the UI's stale indicator
  adminPassword: "admin:password",
  billingAccount: "billing:account",
} as const;

export type StoredSession = {
  cookie: string;
  capturedAt: string; // ISO
  expiresAt: string; // ISO
};

async function get<T>(key: string): Promise<T | null> {
  const row = await db.kvEntry.findUnique({ where: { key } });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    // Best-effort prune; ignore concurrent-delete errors.
    db.kvEntry
      .delete({ where: { key } })
      .catch(() => undefined);
    return null;
  }
  return row.value as T;
}

async function set(
  key: string,
  value: unknown,
  opts?: { ex?: number },
): Promise<void> {
  const expiresAt = opts?.ex ? new Date(Date.now() + opts.ex * 1000) : null;
  // Prisma's Json type doesn't accept `undefined`; coerce to `null`.
  const safe = (value ?? null) as object;
  await db.kvEntry.upsert({
    where: { key },
    create: { key, value: safe, expiresAt },
    update: { value: safe, expiresAt },
  });
}

async function del(key: string): Promise<void> {
  await db.kvEntry.deleteMany({ where: { key } });
}

export const kv = { get, set, del };
