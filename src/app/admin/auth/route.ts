import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  issueCookie,
  verifyPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Plain form POST for the admin master password.
 *
 * We use a route (not a server action) because:
 *   1. Master-password sign-in is a one-shot boundary event, not a data
 *      mutation on a page — matches the shape of "POST /session" in
 *      classic web auth.
 *   2. It works from anywhere without Next's server-action handshake
 *      headers, which makes it trivial to smoke-test with curl.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const submitted = String(form.get("password") ?? "");
  if (!verifyPassword(submitted)) {
    return NextResponse.redirect(new URL("/admin/login?err=1", req.url), {
      status: 303,
    });
  }
  const res = NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, issueCookie(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
