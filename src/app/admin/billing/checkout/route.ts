import { NextResponse } from "next/server";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import { createCheckoutSession } from "@/lib/stripe-billing";
import { SITE_URL } from "@/lib/site-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await requireAdminSessionOrRedirect();
  const requestOrigin = new URL(req.url).origin;
  const origin =
    process.env.VERCEL_ENV === "production" ? SITE_URL : requestOrigin;
  const session = await createCheckoutSession(
    `${origin}/admin/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    `${origin}/admin/billing?checkout=cancelled`,
  );

  if (!session.url) {
    return NextResponse.redirect(
      new URL("/admin/billing?error=checkout", req.url),
      { status: 303 },
    );
  }
  return NextResponse.redirect(session.url, { status: 303 });
}
