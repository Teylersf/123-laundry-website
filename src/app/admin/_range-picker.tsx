"use client";

// Client-side range picker. Uses useTransition so the clicked chip shows a
// spinner + all chips disable until the server component re-renders with
// the new data — prevents the "keep clicking, keep querying" problem where
// nothing visibly changes before hydration.

import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { RANGES, type ActiveRange } from "./_range";

export function RangePicker({
  active,
  basePath = "/admin",
}: {
  active: ActiveRange;
  basePath?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Which specific chip / form is being loaded — used so only that one
  // shows a spinner rather than the whole row.
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const visiblePendingKey = pending ? pendingKey : null;

  function pick(key: string, href: string) {
    if (pending) return;
    setPendingKey(key);
    startTransition(() => {
      router.push(href);
    });
  }

  function submitCustom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    const from = form.get("from")?.toString() ?? "";
    const to = form.get("to")?.toString() ?? "";
    if (!from || !to) return;
    setPendingKey("custom");
    startTransition(() => {
      router.push(
        `${basePath}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-soft p-3 md:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          Time range
        </p>
        <p className="text-[11px] text-white/50">
          {pending
            ? "Loading…"
            : active.key === "custom"
              ? active.label
              : `Showing: ${active.label}`}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {RANGES.map((r) => {
          const isActive = active.key === r.key;
          const isPendingChip = visiblePendingKey === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => pick(r.key, `${basePath}?range=${r.key}`)}
              disabled={pending}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-brand-200 bg-brand-200/20 text-brand-100"
                  : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
              } ${pending && !isPendingChip ? "opacity-50" : ""} ${
                pending ? "cursor-wait" : ""
              } disabled:pointer-events-none`}
            >
              {isPendingChip && <Spinner />}
              {r.label}
            </button>
          );
        })}
      </div>
      <details open={active.key === "custom"} className="group mt-3">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wider text-white/50 hover:text-white/80">
          Custom date range
          <span className="ml-1 text-white/30 group-open:hidden">▾</span>
          <span className="ml-1 hidden text-white/30 group-open:inline">▴</span>
        </summary>
        <form
          onSubmit={submitCustom}
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="flex flex-col gap-1 text-[11px] text-white/60">
            From
            <input
              type="date"
              name="from"
              defaultValue={active.customFromIso ?? ""}
              required
              className="scheme-dark rounded-lg border border-white/15 bg-ink px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/60">
            To
            <input
              type="date"
              name="to"
              defaultValue={active.customToIso ?? ""}
              required
              className="scheme-dark rounded-lg border border-white/15 bg-ink px-2 py-1.5 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 self-end rounded-lg bg-brand-200 px-3 py-2 text-xs font-bold text-ink hover:bg-brand-100 disabled:opacity-70"
          >
            {visiblePendingKey === "custom" ? (
              <>
                <Spinner ink />
                Loading…
              </>
            ) : (
              "Apply"
            )}
          </button>
        </form>
      </details>
    </div>
  );
}

function Spinner({ ink = false }: { ink?: boolean }) {
  return (
    <svg
      className={`h-3 w-3 animate-spin ${ink ? "text-ink" : "text-current"}`}
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
