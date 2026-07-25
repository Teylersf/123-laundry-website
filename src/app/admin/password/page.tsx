import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Change password — 123 Laundry Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PasswordPage(props: {
  searchParams: Promise<{ changed?: string; error?: string }>;
}) {
  await requireAdminSessionOrRedirect();
  const { changed, error } = await props.searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-200">
        Admin security
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold">
        Change the admin password
      </h1>
      <p className="mt-2 text-sm text-white/60">
        Use at least 10 characters. The new password is securely hashed before
        it is stored.
      </p>

      {changed && (
        <div className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          Password changed successfully.
        </div>
      )}
      {error === "current" && (
        <div className="mt-5 rounded-xl border border-red-300/25 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          The current password did not match.
        </div>
      )}
      {error === "new" && (
        <div className="mt-5 rounded-xl border border-red-300/25 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          New passwords must match and contain at least 10 characters.
        </div>
      )}

      <form
        action="/admin/password/update"
        method="post"
        className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-ink-soft p-6"
      >
        {[
          ["currentPassword", "Current password", "current-password"],
          ["newPassword", "New password", "new-password"],
          ["confirmPassword", "Confirm new password", "new-password"],
        ].map(([name, label, autoComplete]) => (
          <div key={name}>
            <label
              htmlFor={name}
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60"
            >
              {label}
            </label>
            <input
              id={name}
              name={name}
              type="password"
              autoComplete={autoComplete}
              minLength={name === "currentPassword" ? undefined : 10}
              required
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-base text-white focus:border-brand-300 focus:outline-none"
            />
          </div>
        ))}
        <button
          type="submit"
          className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-600"
        >
          Save new password
        </button>
      </form>

      <Link
        href="/admin"
        className="mt-6 inline-flex text-sm font-semibold text-brand-200 hover:text-white"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
