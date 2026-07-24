import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyCookie } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "123 Laundry — Admin sign-in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage(props: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await props.searchParams;

  // If they've already got a valid cookie, skip the form.
  const store = await cookies();
  if (verifyCookie(store.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-ink-soft p-6 shadow-xl">
        <h1 className="font-display text-2xl font-bold text-white">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Master password only. No email, no username.
        </p>
        <form action="/admin/auth" method="post" className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60"
            >
              Master password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder-white/30 focus:border-brand-300 focus:outline-none"
              placeholder="•••••••••••••"
            />
          </div>
          {err && (
            <p className="text-sm text-red-300">
              That password didn't match. Try again.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-full bg-brand px-4 py-3 text-base font-semibold text-white hover:bg-brand-600"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
