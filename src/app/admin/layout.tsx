import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "123 Laundry — Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-white/10 bg-ink-soft/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          {/* Logo → public homepage; admin title → admin dashboard.
              Two separate tap targets so the owner can jump back to the
              customer-facing site without leaving the admin app entirely. */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="123 Laundry — public homepage"
              className="-my-1 inline-flex shrink-0 items-center rounded-md bg-white/95 px-2 py-1 hover:bg-white"
            >
              <Image
                src="/images/logo.png"
                alt="123 Laundry logo"
                width={200}
                height={120}
                priority
                className="h-8 w-auto md:h-9"
              />
            </Link>
            <Link
              href="/admin"
              className="font-display text-sm font-bold tracking-tight text-white md:text-base"
            >
              <span className="text-brand-200">admin</span>
            </Link>
          </div>
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
