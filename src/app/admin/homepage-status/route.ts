import { NextResponse } from "next/server";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import { kv, KV_KEYS } from "@/lib/kv";

export async function POST(req: Request) {
  await requireAdminSessionOrRedirect();

  const form = await req.formData();
  const mode = form.get("mode");
  if (mode !== "summary" && mode !== "detailed" && mode !== "off") {
    return NextResponse.redirect(
      new URL("/admin?homepage-status=invalid", req.url),
      { status: 303 },
    );
  }

  await kv.set(KV_KEYS.homepageMachineDisplay, mode);

  return NextResponse.redirect(
    new URL(`/admin?homepage-status=${mode}`, req.url),
    { status: 303 },
  );
}
