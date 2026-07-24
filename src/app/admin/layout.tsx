import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "123 Laundry — Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-[var(--color-paper)]">
      <header className="border-b border-white/10 bg-[var(--color-ink-soft)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/admin"
            className="font-display text-base font-bold tracking-tight text-white"
          >
            123 Laundry <span className="text-brand-200">· admin</span>
          </Link>
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-brand-200 hover:text-brand-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">{children}</div>
    </div>
  );
}
