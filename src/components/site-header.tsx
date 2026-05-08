"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { BUSINESS } from "@/lib/site-data";

const NAV = [
  { label: "Locations", href: "/locations" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Amenities", href: "/amenities" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link
          href="/"
          aria-label="123 Laundry — home"
          className="flex items-center gap-2"
        >
          <Image
            src="/images/logo.png"
            alt="123 Laundry logo"
            width={140}
            height={84}
            priority
            className="h-10 w-auto md:h-12"
          />
          <span className="sr-only">{BUSINESS.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-6 text-[15px] font-medium">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-ink hover:text-brand"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href={BUSINESS.cardBalanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink hover:border-brand hover:text-brand"
          >
            Check Card Balance
          </a>
          <a
            href={`tel:${BUSINESS.phoneRaw}`}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Call {BUSINESS.phone}
          </a>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-ink md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {open ? (
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                d="M6 6l12 12M18 6l-12 12"
              />
            ) : (
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                d="M4 7h16M4 12h16M4 17h16"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-line bg-paper md:hidden"
        >
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-brand-50 hover:text-brand"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 grid grid-cols-2 gap-2">
              <a
                href={BUSINESS.cardBalanceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="rounded-full border border-line px-3 py-2.5 text-center text-sm font-medium hover:border-brand hover:text-brand"
              >
                Card Balance
              </a>
              <a
                href={`tel:${BUSINESS.phoneRaw}`}
                onClick={() => setOpen(false)}
                className="rounded-full bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
              >
                Call us
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
