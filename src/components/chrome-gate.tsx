"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Hides the public-site chrome (header, footer, LocalBusiness JSON-LD) on
 * paths that shouldn't look like the marketing site — right now that's the
 * whole /admin surface. Keep this dumb: no state, no fetches, just path
 * matching, so it's cheap to run on every navigation.
 */
export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
