import { NextResponse } from "next/server";
import {
  requireAdminSessionOrRedirect,
  updatePassword,
  verifyPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await requireAdminSessionOrRedirect();
  const form = await req.formData();
  const current = String(form.get("currentPassword") ?? "");
  const next = String(form.get("newPassword") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");

  if (!(await verifyPassword(current))) {
    return NextResponse.redirect(
      new URL("/admin/password?error=current", req.url),
      { status: 303 },
    );
  }
  if (next.length < 10 || next !== confirm) {
    return NextResponse.redirect(
      new URL("/admin/password?error=new", req.url),
      { status: 303 },
    );
  }

  await updatePassword(next);
  return NextResponse.redirect(
    new URL("/admin/password?changed=1", req.url),
    { status: 303 },
  );
}
