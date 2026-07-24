// Shared time-range definitions for the /admin dashboard. Kept dependency
// free (no Prisma, no server-only imports) so the client-side range picker
// can import from the same source of truth as the server-side query.

export type RangeKey = "1d" | "7d" | "30d" | "90d" | "1y" | "all" | "custom";

export type RangeOption = {
  key: Exclude<RangeKey, "custom">;
  label: string;
  days: number | null; // null = all time
};

export const RANGES: RangeOption[] = [
  { key: "1d", label: "24h", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
  { key: "1y", label: "1y", days: 365 },
  { key: "all", label: "All time", days: null },
];

export type ActiveRange = {
  key: RangeKey;
  label: string;
  from: Date | null; // null = beginning of time
  to: Date | null;   // null = now
  customFromIso?: string;
  customToIso?: string;
};

export function parseIsoDate(v: string | undefined): Date | null {
  if (!v) return null;
  // Accept plain YYYY-MM-DD (treated as UTC midnight) or full ISO.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T00:00:00Z`)
    : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseRange(sp: {
  range?: string;
  from?: string;
  to?: string;
}): ActiveRange {
  const from = parseIsoDate(sp.from);
  const to = parseIsoDate(sp.to);
  if (from && to && to > from) {
    return {
      key: "custom",
      label: `${sp.from} → ${sp.to}`,
      from,
      to,
      customFromIso: sp.from,
      customToIso: sp.to,
    };
  }
  const picked =
    RANGES.find((r) => r.key === sp.range) ??
    RANGES.find((r) => r.key === "30d")!;
  if (picked.days === null) {
    return { key: picked.key, label: picked.label, from: null, to: null };
  }
  return {
    key: picked.key,
    label: picked.label,
    from: new Date(Date.now() - picked.days * 24 * 60 * 60 * 1000),
    to: null,
  };
}
