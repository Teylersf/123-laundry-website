"use client";

import { useEffect, useMemo, useState } from "react";

type Snapshot = {
  locationLabel: string;
  washersAvailable: number;
  washersTotal: number;
  dryersAvailable: number;
  dryersTotal: number;
};

type ApiResponse = {
  locations: { slug: string; snapshot: Snapshot }[];
};

type BusynessLevel = {
  label: string;
  availability: string;
  note: string;
  accent: string;
  glow: string;
  bars: number;
};

const LOCATION_DISPLAY: Record<string, { city: string; address: string }> = {
  "spokane-valley": {
    city: "Spokane Valley",
    address: "110 S Pines Rd",
  },
  "deer-park": {
    city: "Deer Park",
    address: "22 S Vernon Ave",
  },
};

const LEVELS: BusynessLevel[] = [
  {
    label: "Slightly busy",
    availability: "Machines available",
    note: "A relaxed time to stop in.",
    accent: "text-cyan-200",
    glow: "from-cyan-400/25 to-brand/5",
    bars: 1,
  },
  {
    label: "Pretty busy",
    availability: "Machines available",
    note: "A friendly, steady flow.",
    accent: "text-emerald-200",
    glow: "from-emerald-400/25 to-brand/5",
    bars: 2,
  },
  {
    label: "Busier than normal",
    availability: "Machines available",
    note: "The laundry room is buzzing.",
    accent: "text-amber-200",
    glow: "from-amber-400/25 to-brand/5",
    bars: 3,
  },
  {
    label: "Very busy",
    availability: "Machines available",
    note: "Popular right now, with room for your load.",
    accent: "text-orange-200",
    glow: "from-orange-400/25 to-brand/5",
    bars: 4,
  },
];

function levelFor(snapshot: Snapshot): BusynessLevel {
  const total = snapshot.washersTotal + snapshot.dryersTotal;
  const available =
    snapshot.washersAvailable + snapshot.dryersAvailable;
  const utilization = total > 0 ? (total - available) / total : 0;

  if (utilization < 0.2) return LEVELS[0];
  if (utilization < 0.45) return LEVELS[1];
  if (utilization < 0.7) return LEVELS[2];
  return LEVELS[3];
}

export function HomepageBusynessStatus() {
  const [data, setData] = useState<ApiResponse | null>(null);

  useEffect(() => {
    let alive = true;

    async function pull() {
      try {
        const response = await fetch("/api/machines", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as ApiResponse;
        if (alive) setData(next);
      } catch {
        // Keep the last friendly status if a refresh briefly fails.
      }
    }

    pull();
    const interval = setInterval(pull, 60_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const locations = useMemo(() => data?.locations ?? [], [data]);

  return (
    <section
      aria-label="Current laundromat activity"
      className="relative isolate overflow-hidden bg-ink text-paper"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 90% at 0% 0%, rgba(17,143,171,0.24), transparent 62%), radial-gradient(60% 80% at 100% 100%, rgba(244,157,55,0.12), transparent 65%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-200">
              <span className="relative inline-flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-200/60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-brand-200" />
              </span>
              How busy are we?
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-tight md:text-5xl">
              There&apos;s a good buzz—and room for your laundry.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-paper/70 md:text-base">
              A simple activity snapshot for both stores. Whatever the pace,
              you can still find a machine and get your laundry moving.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-paper/15 bg-paper/5 px-4 py-2 text-xs text-paper/75 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Updated throughout the day
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(locations.length > 0
            ? locations
            : [
                {
                  slug: "deer-park",
                  snapshot: {
                    locationLabel: "Deer Park",
                    washersAvailable: 0,
                    washersTotal: 0,
                    dryersAvailable: 0,
                    dryersTotal: 0,
                  },
                },
                {
                  slug: "spokane-valley",
                  snapshot: {
                    locationLabel: "Spokane Valley",
                    washersAvailable: 0,
                    washersTotal: 0,
                    dryersAvailable: 0,
                    dryersTotal: 0,
                  },
                },
              ]
          ).map((entry) => {
            const display = LOCATION_DISPLAY[entry.slug] ?? {
              city: entry.snapshot.locationLabel,
              address: "",
            };
            const level = levelFor(entry.snapshot);

            return (
              <article
                key={entry.slug}
                className={`relative overflow-hidden rounded-3xl border border-paper/12 bg-linear-to-br ${level.glow} p-6 shadow-2xl shadow-black/15 backdrop-blur md:p-8`}
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-paper/55">
                      {display.city}
                      {display.address ? ` · ${display.address}` : ""}
                    </p>
                    <h3 className={`mt-3 font-display text-3xl font-black ${level.accent}`}>
                      {level.label}
                    </h3>
                    <p className="mt-1 font-display text-xl font-bold text-paper">
                      {level.availability}
                    </p>
                    <p className="mt-3 text-sm text-paper/65">{level.note}</p>
                  </div>

                  <div
                    aria-hidden="true"
                    className="flex h-16 items-end gap-1.5 rounded-2xl border border-paper/10 bg-black/15 px-4 py-3"
                  >
                    {[1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className={`w-2 rounded-full ${
                          bar <= level.bars
                            ? "bg-brand-200"
                            : "bg-paper/15"
                        }`}
                        style={{ height: `${bar * 9 + 5}px` }}
                      />
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-paper/50">
          Activity levels are a friendly snapshot and can change as customers
          finish their loads.
        </p>
      </div>
    </section>
  );
}
