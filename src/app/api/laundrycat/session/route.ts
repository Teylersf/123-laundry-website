/**
 * Receives a freshly-captured LaundryCat `laravel_session` cookie from the
 * owner's browser (via the Tampermonkey userscript) and stores it for the
 * cron job to use.
 *
 * Auth model: shared bearer token in `ADMIN_INGEST_TOKEN`. We also accept the
 * token in a `x-ingest-token` header so the userscript can use a custom one
 * (browser fetch() forbids setting the standard Authorization header from
 * cross-origin scripts in some configurations).
 *
 * The route also exposes GET so the userscript can health-check before
 * posting (and so the owner can curl it for status).
 */
import { NextResponse } from "next/server";
import { kv, KV_KEYS, type StoredSession } from "@/lib/kv";

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
  const x = req.headers.get("x-ingest-token") ?? "";
  return x === expected;
}

export async function GET() {
  const stored = await kv.get<StoredSession>(KV_KEYS.session);
  return NextResponse.json(
    {
      hasSession: !!stored,
      capturedAt: stored?.capturedAt ?? null,
      expiresAt: stored?.expiresAt ?? null,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "https://www.laundrycat.com",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "content-type, authorization, x-ingest-token",
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://www.laundrycat.com",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "content-type, authorization, x-ingest-token",
    },
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": "https://www.laundrycat.com",
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "expected JSON body" }, { status: 400 });
  }

  const cookie =
    typeof body === "object" && body && "cookie" in body
      ? String((body as Record<string, unknown>).cookie ?? "")
      : "";
  if (!cookie || cookie.length < 20) {
    return NextResponse.json(
      { error: "missing or too-short cookie value" },
      { status: 400 },
    );
  }

  // Default TTL: assume 110 minutes from now (Laravel typically rotates
  // every 2 hours). Allow override via `ttlSeconds`.
  const ttlSeconds =
    typeof body === "object" && body && "ttlSeconds" in body
      ? Number((body as Record<string, unknown>).ttlSeconds)
      : 110 * 60;
  const safeTtl = Number.isFinite(ttlSeconds) && ttlSeconds > 60 ? ttlSeconds : 110 * 60;

  const now = new Date();
  const session: StoredSession = {
    cookie,
    capturedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + safeTtl * 1000).toISOString(),
  };
  await kv.set(KV_KEYS.session, session, { ex: safeTtl });

  return NextResponse.json(
    { ok: true, capturedAt: session.capturedAt, expiresAt: session.expiresAt },
    { headers: { "Access-Control-Allow-Origin": "https://www.laundrycat.com" } },
  );
}
