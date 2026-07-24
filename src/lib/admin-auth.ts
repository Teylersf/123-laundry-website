/**
 * Master-password gate for the /admin surface.
 *
 * Model: single shared password (env var ADMIN_PASSWORD). Login sets a
 * signed HMAC cookie carrying only an issued-at timestamp. Every admin
 * request re-verifies the HMAC and enforces a max-age. No user records,
 * no email, no reset flow — one owner, one password.
 *
 * We deliberately keep the crypto in Node's stdlib (no dependencies) so
 * this can run both on Vercel serverless (Node runtime) and inside Next's
 * Edge middleware where the surface is more limited.
 */
import crypto from "node:crypto";

export const ADMIN_COOKIE = "laundry_admin";
// 30 days — the owner uses mobile and shouldn't have to re-auth constantly.
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function requireSecret(): string {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_COOKIE_SECRET is not set (or too short). Set it in the Vercel env.",
    );
  }
  return secret;
}

/**
 * Constant-time comparison for the master password. `crypto.timingSafeEqual`
 * throws if the buffers differ in length — pad both to a common width.
 */
export function verifyPassword(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = Buffer.from(submitted, "utf8");
  const b = Buffer.from(expected, "utf8");
  const width = Math.max(a.length, b.length, 1);
  const ap = Buffer.alloc(width);
  const bp = Buffer.alloc(width);
  a.copy(ap);
  b.copy(bp);
  return crypto.timingSafeEqual(ap, bp) && a.length === b.length;
}

function base64url(input: Buffer | string): string {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(s: string): Buffer {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}

/**
 * Issue a fresh signed cookie value for the current time. The cookie carries
 * only the issued-at ms as its payload; freshness is enforced on read via the
 * max-age check.
 */
export function issueCookie(now: number = Date.now()): string {
  const secret = requireSecret();
  const payload = base64url(String(now));
  const sig = base64url(
    crypto.createHmac("sha256", secret).update(payload).digest(),
  );
  return `${payload}.${sig}`;
}

export type AdminSession = { issuedAt: number };

export function verifyCookie(
  value: string | null | undefined,
  now: number = Date.now(),
): AdminSession | null {
  if (!value || typeof value !== "string") return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  let secret: string;
  try {
    secret = requireSecret();
  } catch {
    return null;
  }
  const expected = base64url(
    crypto.createHmac("sha256", secret).update(payload).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const issuedAtStr = fromBase64url(payload).toString("utf8");
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return null;
  const ageSeconds = (now - issuedAt) / 1000;
  if (ageSeconds < 0 || ageSeconds > ADMIN_COOKIE_MAX_AGE_SECONDS) return null;
  return { issuedAt };
}

/**
 * Gate helper for admin server components. Import this at the top of every
 * page under /admin (except /admin/login). Returns the session or redirects
 * to /admin/login. Keep the call site trivial so a missed page can't leak.
 */
export async function requireAdminSessionOrRedirect(): Promise<AdminSession> {
  const { cookies } = await import("next/headers");
  const { redirect } = await import("next/navigation");
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  const session = verifyCookie(raw);
  if (session) return session;
  redirect("/admin/login");
  // `redirect` throws internally, but its typing through the dynamic import
  // isn't `never`, so satisfy the compiler explicitly.
  throw new Error("unreachable");
}
