/**
 * Synthetic floor snapshot used when no real data is in the database yet
 * (cold start, relay offline for a long time, etc.). We render the actual
 * machine layout for each store with a small handful of plausibly busy
 * machines so the homepage stays visually alive instead of going empty.
 *
 * The result is marked `simulated: true` and the UI displays an "Example
 * layout — live feed paused" pill so visitors are never misled.
 *
 * We deliberately seed the random choices off the current half-hour window
 * so the simulated countdowns look like real ones across consecutive page
 * loads, but slowly evolve over time.
 */
import type { LocationSnapshot, Machine } from "./laundrycat";

export type SimulatedLocationSnapshot = LocationSnapshot & {
  simulated: true;
};

// Real machine layouts. Only Spokane Valley is on the LaundryCat account
// today, so that's the only location we render in the live-status block —
// matching what production looks like once the relay is feeding data.
// Deer Park's machines aren't reported by the portal yet.
const FLOOR_PLANS: Record<
  string,
  { label: string; locationId: string; washers: string[]; dryers: string[] }
> = {
  "spokane-valley": {
    label: "110 South Pines Road, Spokane Valley, WA",
    locationId: "0100002",
    washers: range("W", 26, 47),
    dryers: range("D", 1, 25),
  },
};

function range(prefix: string, start: number, end: number): string[] {
  const out: string[] = [];
  for (let i = start; i <= end; i++) {
    out.push(`${prefix}${i.toString().padStart(2, "0")}`);
  }
  return out;
}

// Mulberry32 — small deterministic PRNG so SSR and CSR pick the same machines.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSimulatedSnapshot(
  slug: keyof typeof FLOOR_PLANS,
  now: Date = new Date(),
): SimulatedLocationSnapshot {
  const plan = FLOOR_PLANS[slug];
  // Seed off the half-hour window so the example layout looks consistent for
  // anyone refreshing the page repeatedly, but rotates over time.
  const halfHour = Math.floor(now.getTime() / (30 * 60 * 1000));
  const rand = mulberry32(halfHour ^ slug.length);

  const busyWasherCount = 2 + Math.floor(rand() * 2); // 2–3
  const busyDryerCount = 3 + Math.floor(rand() * 3); // 3–5

  const pickBusy = (ids: string[], count: number) => {
    const pool = [...ids];
    const picked: string[] = [];
    for (let i = 0; i < count && pool.length; i++) {
      const idx = Math.floor(rand() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return new Set(picked);
  };

  const busyWashers = pickBusy(plan.washers, busyWasherCount);
  const busyDryers = pickBusy(plan.dryers, busyDryerCount);

  const buildMachine = (
    id: string,
    kind: Machine["kind"],
    busySet: Set<string>,
  ): Machine => {
    const isBusy = busySet.has(id);
    if (!isBusy) {
      return {
        id,
        kind,
        status: "available",
        rawLabel: "Available",
        remainingSeconds: null,
        endsAt: null,
        isOnline: true,
      };
    }
    // Spread remaining-time across 2–28 minutes so countdowns look natural.
    const remaining = Math.floor(2 * 60 + rand() * (26 * 60));
    return {
      id,
      kind,
      status: "busy",
      rawLabel: "Busy",
      remainingSeconds: remaining,
      endsAt: new Date(now.getTime() + remaining * 1000).toISOString(),
      isOnline: true,
    };
  };

  const washers = plan.washers.map((id) =>
    buildMachine(id, "washer", busyWashers),
  );
  const dryers = plan.dryers.map((id) =>
    buildMachine(id, "dryer", busyDryers),
  );
  const machines = [...washers, ...dryers];

  return {
    locationLabel: plan.label,
    locationId: plan.locationId,
    fetchedAt: now.toISOString(),
    washersAvailable: washers.filter((m) => m.status === "available").length,
    washersTotal: washers.length,
    dryersAvailable: dryers.filter((m) => m.status === "available").length,
    dryersTotal: dryers.length,
    machines,
    simulated: true,
  };
}

type SimSlug = keyof typeof FLOOR_PLANS;

export function buildAllSimulated(): {
  slug: SimSlug;
  snapshot: SimulatedLocationSnapshot;
}[] {
  const now = new Date();
  const slugs = Object.keys(FLOOR_PLANS) as SimSlug[];
  return slugs.map((slug) => ({
    slug,
    snapshot: buildSimulatedSnapshot(slug, now),
  }));
}
