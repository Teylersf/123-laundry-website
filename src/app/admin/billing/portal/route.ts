import { NextResponse } from "next/server";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import {
  createPortalSession,
  getBillingAccount,
} from "@/lib/stripe-billing";
import { SITE_URL } from "@/lib/site-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await requireAdminSessionOrRedirect();
  const account = await getBillingAccount();
  if (!account?.customerId) {
    return NextResponse.redirect(
      new URL("/admin/billing?error=no-account", req.url),
      { status: 303 },
    );
  }

  const requestOrigin = new URL(req.url).origin;
  const origin =
    process.env.VERCEL_ENV === "production" ? SITE_URL : requestOrigin;
  const portal = await createPortalSession(
    account.customerId,
    `${origin}/admin/billing`,
  );
  return NextResponse.redirect(portal.url, { status: 303 });
}
