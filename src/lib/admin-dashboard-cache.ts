import "server-only";

type CacheEntry = {
  expiresAt: number;
  value?: unknown;
  pending?: Promise<unknown>;
};

declare global {
  // Serverless requests can overlap inside one warm instance. Keep dashboard
  // work behind one small queue because production intentionally gives Prisma
  // a one-connection pool. The short cache also coalesces repeated clicks.
  var laundryAdminDashboardCache: Map<string, CacheEntry> | undefined;
  var laundryAdminDashboardQueue: Promise<void> | undefined;
}

const dashboardCache =
  globalThis.laundryAdminDashboardCache ?? new Map<string, CacheEntry>();

globalThis.laundryAdminDashboardCache = dashboardCache;

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const before = globalThis.laundryAdminDashboardQueue ?? Promise.resolve();
  const result = before.then(work, work);
  globalThis.laundryAdminDashboardQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function cachedDashboardQuery<T>(
  key: string,
  ttlMs: number,
  work: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const existing = dashboardCache.get(key);

  if (existing?.pending) return existing.pending as Promise<T>;
  if (existing?.value !== undefined && existing.expiresAt > now) {
    return Promise.resolve(existing.value as T);
  }

  const pending = enqueue(work);
  dashboardCache.set(key, { expiresAt: 0, pending });

  return pending.then(
    (value) => {
      dashboardCache.set(key, {
        expiresAt: Date.now() + ttlMs,
        value,
      });
      return value;
    },
    (error) => {
      dashboardCache.delete(key);
      throw error;
    },
  );
}
