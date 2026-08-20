"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type HistoricalView = "rhythm" | "usage" | "errors";

const OPTIONS: Array<{
  view: HistoricalView;
  label: string;
  description: string;
}> = [
  {
    view: "rhythm",
    label: "View today's rhythm",
    description: "Loads the fixed 24-hour washer and dryer activity chart.",
  },
  {
    view: "usage",
    label: "View usage & repair risk",
    description: "Loads cycle, runtime, offline, and repair-risk history.",
  },
  {
    view: "errors",
    label: "View error history",
    description: "Loads recent non-zero LaundryCat error codes.",
  },
];

export function HistoricalViewPicker({
  active,
}: {
  active: HistoricalView | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingView, setPendingView] = useState<HistoricalView | "hide" | null>(
    null,
  );
  const visiblePendingView = pending ? pendingView : null;

  function navigate(view: HistoricalView | null) {
    if (pending || view === active) return;
    setPendingView(view ?? "hide");
    startTransition(() => {
      router.push(view ? `/admin?view=${view}&range=30d` : "/admin");
    });
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {OPTIONS.map((option) => {
        const selected = active === option.view;
        const loading = visiblePendingView === option.view;
        return (
          <button
            key={option.view}
            type="button"
            onClick={() => navigate(option.view)}
            disabled={pending || selected}
            aria-pressed={selected}
            className={`rounded-2xl border p-4 text-left transition disabled:pointer-events-none ${
              selected
                ? "border-brand-200 bg-brand/15"
                : "border-white/10 bg-ink-soft hover:border-brand-200/60"
            } ${pending && !loading ? "opacity-50" : ""}`}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-white">
              {loading && <Spinner />}
              {loading ? "Loading report…" : option.label}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-white/50">
              {option.description}
            </span>
          </button>
        );
      })}
      {active && (
        <button
          type="button"
          onClick={() => navigate(null)}
          disabled={pending}
          className="justify-self-start text-xs font-semibold text-white/55 hover:text-white disabled:pointer-events-none disabled:opacity-50 md:col-span-2"
        >
          {visiblePendingView === "hide" ? "Closing…" : "Hide historical data"}
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
