"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useTransition } from "react";

const REFRESH_INTERVAL_MS = 30_000;

export function AnalyticsRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    if (pending || document.visibilityState !== "visible") return;
    startTransition(() => router.refresh());
  }, [pending, router]);

  useEffect(() => {
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[11px] text-white/45">
        Engagement and active time refresh automatically every 30 seconds.
      </p>
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/75 hover:border-brand-200 hover:text-brand-100 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending && (
          <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {pending ? "Refreshing…" : "Refresh now"}
      </button>
    </div>
  );
}
