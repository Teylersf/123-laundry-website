"use client";

import { useEffect, useMemo, useState } from "react";

// ---------- Types -----------------------------------------------------------
type Machine = {
  id: string;
  kind: "washer" | "dryer" | "other";
  status: "available" | "busy" | "done" | "offline" | "unknown";
  rawLabel: string;
  remainingSeconds: number | null;
  endsAt: string | null;
  isOnline: boolean;
};

type Snapshot = {
  locationLabel: string;
  locationId: string;
  fetchedAt: string;
  washersAvailable: number;
  washersTotal: number;
  dryersAvailable: number;
  dryersTotal: number;
  machines: Machine[];
};

type ApiResponse = {
  lastSyncAt: string | null;
  lastSyncOk: string | null;
  lastError: { at: string; reason: string; detail: string | null } | null;
  locations: { slug: string; snapshot: Snapshot }[];
};

type Freshness = "live" | "recent" | "stale" | "very-stale";

function freshnessOf(iso: string | null, now: number): Freshness {
  if (!iso) return "very-stale";
  const ageSec = (now - new Date(iso).getTime()) / 1000;
  if (ageSec < 6 * 60) return "live"; // <6 min — within one cron interval
  if (ageSec < 30 * 60) return "recent"; // <30 min
  if (ageSec < 6 * 60 * 60) return "stale"; // <6 hours
  return "very-stale";
}

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

const POLL_MS = 60_000;
const TICK_MS = 1_000;

// ---------- Helpers ---------------------------------------------------------
function fmtCountdown(secs: number): string {
  if (secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtRelative(iso: string | null, now: number): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

type Live = Machine & {
  liveSeconds: number | null;
  liveStatus: Machine["status"];
};

function liveify(m: Machine, now: number): Live {
  if (m.status === "busy" && m.endsAt) {
    const sec = Math.max(
      0,
      Math.round((new Date(m.endsAt).getTime() - now) / 1000),
    );
    // When the client-side countdown hits zero the cycle is over but
    // nobody has picked up the load yet — optimistically flip to "done"
    // (waiting for pickup) rather than "available", since the machine
    // isn't actually free until someone opens the door. The next server
    // poll will confirm the real state.
    return {
      ...m,
      liveSeconds: sec,
      liveStatus: sec === 0 ? "done" : "busy",
    };
  }
  return { ...m, liveSeconds: m.remainingSeconds, liveStatus: m.status };
}

// ---------- Component -------------------------------------------------------
type LiveProps = {
  /**
   * When set, only render the matching location's floor. Used on
   * /locations/[slug] pages where the visitor is already scoped to one store.
   * When omitted, render every location in the API response (homepage).
   */
  slug?: string;
  /**
   * Override the "See what's open right now." headline — useful on a
   * per-location page where a shorter caption reads better.
   */
  heading?: string;
  /**
   * Override the sub-copy under the headline.
   */
  subheading?: string;
};

export function LiveMachineStatus({ slug, heading, subheading }: LiveProps = {}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let lastFetchAt = 0;

    async function pull() {
      lastFetchAt = Date.now();
      try {
        const r = await fetch("/api/machines", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const json = (await r.json()) as ApiResponse;
        if (alive) setData(json);
      } catch {
        /* keep last data */
      } finally {
        if (alive) setLoading(false);
      }
    }

    function schedule() {
      if (intervalId !== undefined) clearInterval(intervalId);
      intervalId = setInterval(pull, POLL_MS);
    }

    // Wake handler for every "tab became usable again" signal a browser
    // sends. Mobile Safari and Chrome pause / heavily throttle setInterval
    // once the tab is backgrounded or the phone screen sleeps, so without
    // this the grid would fall arbitrarily far behind reality by the time
    // the owner looks at it. On wake we (a) push the countdown clock to
    // real now, (b) trigger a fresh poll if it's been more than half an
    // interval, and (c) restart the interval so the next scheduled poll
    // is a full interval away.
    function onWake() {
      if (!alive) return;
      setNow(Date.now());
      if (Date.now() - lastFetchAt > POLL_MS / 2) {
        pull();
      }
      schedule();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") onWake();
    }

    pull();
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    // pageshow fires on both first paint and bfcache restore (Safari
    // aggressively caches the whole page state when the user navigates
    // back — without this, they'd see a stale snapshot until the next
    // interval tick).
    window.addEventListener("pageshow", onWake);

    return () => {
      alive = false;
      if (intervalId !== undefined) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      window.removeEventListener("pageshow", onWake);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const filteredLocations = useMemo(() => {
    if (!data) return [];
    if (!slug) return data.locations;
    return data.locations.filter((e) => e.slug === slug);
  }, [data, slug]);

  const hasData = filteredLocations.length > 0;

  return (
    <section
      aria-label="Live machine availability"
      className="relative isolate overflow-hidden bg-ink text-paper"
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(17,143,171,0.25), transparent 60%), radial-gradient(40% 60% at 100% 100%, rgba(17,143,171,0.15), transparent 60%)",
        }}
      />

      {/* Header — contained for readability */}
      <div className="border-b border-paper/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-6 md:py-14">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-200">
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-200/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-200" />
              </span>
              Live machine status
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-5xl">
              {heading ?? "See what's open right now."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-paper/70 md:text-base">
              {subheading ??
                "Pulled in real time from our card-system portal. Save a wasted drive — peek before you pack the basket."}
            </p>
          </div>
          <FreshnessPill
            lastSyncOk={data?.lastSyncOk ?? null}
            firstSnapshotAt={
              filteredLocations[0]?.snapshot.fetchedAt ?? null
            }
            isSimulated={
              !!(
                filteredLocations[0] &&
                (filteredLocations[0].snapshot as Snapshot & { simulated?: boolean })
                  .simulated
              )
            }
            now={now}
          />
        </div>
      </div>

      {loading && !hasData && <SkeletonFloor />}
      {!loading && !hasData && <EmptyState />}

      {hasData &&
        filteredLocations.map((entry) => (
          <LocationFloor key={entry.slug} entry={entry} now={now} />
        ))}
    </section>
  );
}

function FreshnessPill({
  lastSyncOk,
  firstSnapshotAt,
  isSimulated,
  now,
}: {
  lastSyncOk: string | null;
  firstSnapshotAt: string | null;
  isSimulated: boolean;
  now: number;
}) {
  // When the snapshot is simulated, neither freshness flavor applies — we
  // surface a calm "example layout" pill so visitors know it's not live.
  if (isSimulated) {
    return (
      <div className="flex shrink-0 items-center gap-2 rounded-full border border-paper/15 bg-paper/5 px-4 py-2 text-xs text-paper/70 backdrop-blur">
        <span className="size-1.5 rounded-full bg-paper/50" />
        Example layout — live feed paused
      </div>
    );
  }
  const refIso = lastSyncOk ?? firstSnapshotAt;
  const f = freshnessOf(refIso, now);
  const styles: Record<Freshness, { dot: string; text: string; border: string }> = {
    live: {
      dot: "bg-emerald-400",
      text: "text-paper/80",
      border: "border-paper/15",
    },
    recent: {
      dot: "bg-emerald-400",
      text: "text-paper/70",
      border: "border-paper/15",
    },
    stale: {
      dot: "bg-amber-400",
      text: "text-amber-200",
      border: "border-amber-400/40",
    },
    "very-stale": {
      dot: "bg-red-400",
      text: "text-red-200",
      border: "border-red-400/50",
    },
  };
  const s = styles[f];
  const label =
    f === "live"
      ? `Live · updated ${fmtRelative(refIso, now)}`
      : f === "recent"
        ? `Updated ${fmtRelative(refIso, now)}`
        : f === "stale"
          ? `Last update ${fmtRelative(refIso, now)} — refresh in progress`
          : `Last reachable ${fmtRelative(refIso, now)} — showing cached data`;
  return (
    <div
      className={`flex shrink-0 items-center gap-2 rounded-full border ${s.border} bg-paper/5 px-4 py-2 text-xs ${s.text} backdrop-blur`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {label}
    </div>
  );
}

// ---------- Per-location block ----------------------------------------------
function LocationFloor({
  entry,
  now,
}: {
  entry: { slug: string; snapshot: Snapshot };
  now: number;
}) {
  const display = LOCATION_DISPLAY[entry.slug] ?? {
    city: entry.snapshot.locationLabel.split(",")[1]?.trim() ?? entry.slug,
    address: entry.snapshot.locationLabel.split(",")[0]?.trim() ?? "",
  };

  const live = useMemo(
    () => entry.snapshot.machines.map((m) => liveify(m, now)),
    [entry.snapshot.machines, now],
  );

  const washers = live.filter((m) => m.kind === "washer");
  const dryers = live.filter((m) => m.kind === "dryer");
  const wAvail = washers.filter((m) => m.liveStatus === "available").length;
  const dAvail = dryers.filter((m) => m.liveStatus === "available").length;

  const nextFinish = [...washers, ...dryers]
    .filter(
      (m) =>
        m.liveStatus === "busy" &&
        m.liveSeconds !== null &&
        m.liveSeconds > 0,
    )
    .sort((a, b) => (a.liveSeconds ?? 0) - (b.liveSeconds ?? 0))[0];

  return (
    <div className="border-b border-paper/10">
      {/* Stat banner */}
      <div className="mx-auto max-w-7xl px-4 pt-10 md:px-6 md:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
              {display.city} · {display.address}
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">
              {wAvail + dAvail} of {washers.length + dryers.length} machines
              open right now
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <BigStat
              label="Washers open"
              value={`${wAvail}/${washers.length}`}
              tone="ok"
            />
            <BigStat
              label="Dryers open"
              value={`${dAvail}/${dryers.length}`}
              tone="ok"
            />
            <BigStat
              label="Next finish"
              value={
                nextFinish && nextFinish.liveSeconds !== null
                  ? `${nextFinish.id} · ${fmtCountdown(nextFinish.liveSeconds)}`
                  : "—"
              }
              tone={nextFinish ? "warn" : "muted"}
              span2={!nextFinish ? false : true}
            />
          </div>
        </div>
      </div>

      {/* FULL-BLEED drum grid wrapper */}
      <div className="px-4 pt-8 pb-14 sm:px-6 md:px-10 lg:px-14 xl:px-20 2xl:px-28">
        <DrumRow
          title="Washers"
          subtitle={`${wAvail} open · ${washers.length - wAvail} in use`}
          machines={washers}
        />
        <div className="mt-12">
          <DrumRow
            title="Dryers"
            subtitle={`${dAvail} open · ${dryers.length - dAvail} in use`}
            machines={dryers}
          />
        </div>
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  tone,
  span2 = false,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "muted";
  span2?: boolean;
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-paper/70";
  return (
    <div
      className={`rounded-2xl border border-paper/10 bg-paper/4 p-4 backdrop-blur ${
        span2 ? "col-span-2 sm:col-span-1" : ""
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-paper/60">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-extrabold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

// ---------- Drum row --------------------------------------------------------
function DrumRow({
  title,
  subtitle,
  machines,
}: {
  title: string;
  subtitle: string;
  machines: Live[];
}) {
  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between">
        <h4 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-brand-200">
          {title}
        </h4>
        <span className="text-xs text-paper/50">{subtitle}</span>
      </div>
      <ul
        className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 sm:gap-x-4 md:grid-cols-8 lg:grid-cols-11 xl:grid-cols-14 2xl:grid-cols-16"
        role="list"
      >
        {machines.map((m) => (
          <li key={m.id}>
            <Drum m={m} />
          </li>
        ))}
        {machines.length === 0 && (
          <li className="col-span-full text-sm text-paper/50">
            No {title.toLowerCase()} reported.
          </li>
        )}
      </ul>
    </div>
  );
}

// ---------- Machine icons ---------------------------------------------------
//
// Each machine renders as a small illustrated appliance (washer or dryer)
// with state-driven animation:
//   available → subtle breathing glow around the door
//   busy      → the drum spins, plus per-kind flair (washer sloshes water
//               with rising bubbles; dryer tumbles clothes with rising steam)
//   offline   → desaturated, no motion, small ⨯ mark
// Keyframes live in globals.css and are gated on prefers-reduced-motion.

type MachineStatusVisual =
  | "available"
  | "busy"
  | "done"
  | "offline"
  | "unknown";

function statusPalette(status: MachineStatusVisual) {
  switch (status) {
    case "available":
      return {
        body: "fill-[#101418] stroke-emerald-400/40",
        door: "stroke-emerald-300/70",
        drum: "fill-emerald-500/10 stroke-emerald-400/50",
        text: "text-emerald-300",
        badge: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]",
      };
    case "busy":
      return {
        body: "fill-[#101418] stroke-amber-400/50",
        door: "stroke-amber-300/70",
        drum: "fill-amber-500/10 stroke-amber-400/60",
        text: "text-amber-200",
        badge: "bg-amber-400",
      };
    case "done":
      // Blue = "cycle finished, waiting for customer to pick up". Distinct
      // enough from busy (amber) and available (emerald) that a scan of the
      // grid tells a customer at a glance which drums have clothes still in
      // them vs which are truly open.
      return {
        body: "fill-[#101418] stroke-sky-400/50",
        door: "stroke-sky-300/70",
        drum: "fill-sky-500/10 stroke-sky-400/60",
        text: "text-sky-200",
        badge: "bg-sky-400",
      };
    case "offline":
      return {
        body: "fill-[#101418] stroke-zinc-600/40",
        door: "stroke-zinc-500/50",
        drum: "fill-zinc-700/15 stroke-zinc-600/40",
        text: "text-zinc-500",
        badge: "bg-zinc-500",
      };
    default:
      // "unknown" — LaundryCat reported a status we don't recognize. Render
      // a completely neutral drum with no state color, no text overlay, no
      // slash. Better a mystery machine than a jarring "UNKNOWN" label.
      return {
        body: "fill-[#101418] stroke-zinc-700/40",
        door: "stroke-zinc-600/40",
        drum: "fill-zinc-800/15 stroke-zinc-700/40",
        text: "text-zinc-400",
        badge: "bg-zinc-500",
      };
  }
}

/**
 * Front-load WASHER — round porthole, water line, bubbles when busy.
 * Uses a per-machine seed so a row of washers doesn't animate in lockstep.
 */
function WasherIcon({ status, seed }: { status: MachineStatusVisual; seed: number }) {
  const p = statusPalette(status);
  const spinDelay = -(seed % 12);
  const busy = status === "busy";
  return (
    <svg
      viewBox="0 0 100 100"
      className="machine-anim absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {/* Body */}
      <rect x="8" y="6" width="84" height="88" rx="12" className={`${p.body}`} strokeWidth={2} />
      {/* Control panel */}
      <rect x="14" y="12" width="72" height="10" rx="3" className="fill-white/[0.03] stroke-white/10" strokeWidth={1} />
      <circle cx="80" cy="17" r="1.6" className="fill-emerald-400/70" />
      <circle cx="74" cy="17" r="1.6" className="fill-white/20" />
      {/* Porthole outer */}
      <circle cx="50" cy="58" r="26" className={`${p.door} fill-black/70`} strokeWidth={2.5} />
      {/* Drum window — spinning + water. transform-box: fill-box +
          transform-origin: center are set INLINE so iOS Safari rotates
          the drum around its own center rather than around the SVG
          viewport's (0,0) corner. */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          willChange: "transform",
          animation: busy ? `machine-spin 6s linear infinite ${spinDelay}s` : undefined,
        }}
      >
        <circle cx="50" cy="58" r="22" className={`${p.drum}`} strokeWidth={1.5} />
        {/* Drum divot pattern so the spin is visible */}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <circle
            key={deg}
            cx={50 + 15 * Math.cos((deg * Math.PI) / 180)}
            cy={58 + 15 * Math.sin((deg * Math.PI) / 180)}
            r="1.4"
            className="fill-white/15"
          />
        ))}
      </g>
      {/* Water — clip to porthole so it only shows inside the drum */}
      <defs>
        <clipPath id={`washer-clip-${seed}`}>
          <circle cx="50" cy="58" r="22" />
        </clipPath>
      </defs>
      {busy && (
        <g clipPath={`url(#washer-clip-${seed})`}>
          <rect
            x="28"
            y="58"
            width="44"
            height="26"
            className="fill-brand-400/45"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: `machine-water 3.4s ease-in-out infinite ${(-seed % 3)}s`,
            }}
          />
          {/* Rising bubbles */}
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={42 + i * 7}
              cy="76"
              r={1.4 + (i % 2) * 0.6}
              className="fill-white/70"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: `machine-bubble ${2.4 + i * 0.6}s ease-in infinite ${-((seed + i) % 4)}s`,
              }}
            />
          ))}
        </g>
      )}
      {/* Door hinge/latch highlight */}
      <circle cx="50" cy="58" r="3" className="fill-white/10 stroke-white/25" strokeWidth={0.6} />
      {/* Available breathing halo */}
      {status === "available" && (
        <circle
          cx="50"
          cy="58"
          r="27"
          className="fill-none stroke-emerald-300/70"
          strokeWidth={0.8}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: `machine-breathe 3.4s ease-in-out infinite ${-(seed % 3)}s`,
          }}
        />
      )}
      {/* Offline slash */}
      {status === "offline" && (
        <line x1="30" y1="30" x2="70" y2="86" className="stroke-zinc-500/60" strokeWidth={1.5} strokeLinecap="round" />
      )}
    </svg>
  );
}

/**
 * DRYER — round port with a slot vent above, tumbling clothes + rising heat.
 */
function DryerIcon({ status, seed }: { status: MachineStatusVisual; seed: number }) {
  const p = statusPalette(status);
  const tumbleDelay = -(seed % 8);
  const busy = status === "busy";
  return (
    <svg
      viewBox="0 0 100 100"
      className="machine-anim absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {/* Steam wisps — sit ABOVE the body when busy */}
      {busy && (
        <g>
          {[0, 1, 2].map((i) => (
            <ellipse
              key={i}
              cx={30 + i * 20}
              cy="4"
              rx={2.4 + i * 0.4}
              ry={3.5 + i * 0.6}
              className="fill-white/25"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: `machine-steam ${3 + i * 0.7}s ease-out infinite ${-((seed + i) % 4)}s`,
              }}
            />
          ))}
        </g>
      )}
      {/* Body */}
      <rect x="8" y="10" width="84" height="84" rx="12" className={`${p.body}`} strokeWidth={2} />
      {/* Vent slots (top) — distinguishes from washer */}
      <rect x="18" y="16" width="16" height="2" rx="1" className="fill-white/15" />
      <rect x="18" y="20" width="12" height="2" rx="1" className="fill-white/10" />
      <rect x="66" y="17" width="18" height="6" rx="2" className="fill-white/[0.04] stroke-white/10" strokeWidth={1} />
      <circle cx="79" cy="20" r="1.6" className={busy ? "fill-amber-400" : "fill-white/25"} />
      {/* Door — slightly larger porthole with rounded rectangle bezel */}
      <rect x="20" y="34" width="60" height="54" rx="26" className={`${p.door} fill-black/70`} strokeWidth={2.5} />
      {/* Tumbling drum — see the washer's spinning drum comment above for
          why transform-box + transform-origin are inline. */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          willChange: "transform",
          animation: busy ? `machine-tumble 7s linear infinite ${tumbleDelay}s` : undefined,
        }}
      >
        <circle cx="50" cy="61" r="22" className={`${p.drum}`} strokeWidth={1.5} />
        {/* Baffles */}
        {[0, 120, 240].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={50 + 6 * Math.cos(rad)}
              y1={61 + 6 * Math.sin(rad)}
              x2={50 + 20 * Math.cos(rad)}
              y2={61 + 20 * Math.sin(rad)}
              className={busy ? "stroke-amber-300/60" : "stroke-white/15"}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          );
        })}
        {/* Tumbling clothes — three little rounded rects that ride the drum */}
        {busy &&
          [0, 130, 250].map((deg, i) => {
            const r = 12;
            const rad = (deg * Math.PI) / 180;
            const cx = 50 + r * Math.cos(rad);
            const cy = 61 + r * Math.sin(rad);
            return (
              <rect
                key={i}
                x={cx - 3}
                y={cy - 2}
                width="6"
                height="4"
                rx="1.5"
                className={
                  ["fill-brand-300/80", "fill-amber-200/70", "fill-emerald-300/70"][i]
                }
              />
            );
          })}
      </g>
      {/* Available breathing halo */}
      {status === "available" && (
        <rect
          x="18"
          y="32"
          width="64"
          height="58"
          rx="28"
          className="fill-none stroke-emerald-300/70"
          strokeWidth={0.8}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: `machine-breathe 3.4s ease-in-out infinite ${-(seed % 3)}s`,
          }}
        />
      )}
      {status === "offline" && (
        <line x1="24" y1="34" x2="76" y2="88" className="stroke-zinc-500/60" strokeWidth={1.5} strokeLinecap="round" />
      )}
    </svg>
  );
}

// ---------- Single drum visual ----------------------------------------------
function Drum({ m }: { m: Live }) {
  const status = m.liveStatus;
  const p = statusPalette(status);
  const showCountdown =
    status === "busy" && m.liveSeconds !== null && m.liveSeconds > 0;
  // "Cycle finished, waiting for pickup" — surface it as an explicit label
  // over the drum so customers can tell at a glance which machines have
  // clothes still sitting in them.
  const showDoneBadge = status === "done";

  // Deterministic seed per machine ID so animations offset consistently
  // across renders (no lockstep row of dryers, no random flicker on rehydrate).
  const seed = m.id
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const Icon = m.kind === "dryer" ? DryerIcon : WasherIcon;

  // Hover tooltip: for the rare "unknown" status don't leak that word to the
  // public — just show the machine ID.
  const hoverLabel =
    status === "unknown" ? m.id : `${m.id} — ${m.rawLabel}`;

  return (
    <div
      className="group relative flex flex-col items-center"
      title={hoverLabel}
    >
      <div className="relative aspect-square w-full transition-transform duration-200 group-hover:-translate-y-0.5">
        <Icon status={status as MachineStatusVisual} seed={seed} />

        {/* Countdown badge floats over the drum for busy machines */}
        {showCountdown && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={`rounded-md bg-ink/85 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums shadow-md md:text-xs ${p.text}`}
            >
              {fmtCountdown(m.liveSeconds!)}
            </span>
          </div>
        )}

        {/* "Done" badge for cycle-finished machines. Same overlay style as
            the busy countdown so the two states read as siblings. */}
        {showDoneBadge && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={`rounded-md bg-ink/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-md md:text-xs ${p.text}`}
            >
              Done
            </span>
          </div>
        )}
      </div>

      <span className={`mt-2 font-mono text-[10px] tracking-tight md:text-xs ${p.text}`}>
        {m.id}
      </span>
    </div>
  );
}

// ---------- Empty + skeleton states -----------------------------------------
function SkeletonFloor() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-paper/10 bg-paper/5"
          />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 xl:grid-cols-14">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse">
            <div className="h-full w-full rounded-full bg-paper/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="rounded-2xl border border-paper/10 bg-paper/4 p-6 text-sm text-paper/70">
        Live status isn't reporting right now. Try again in a few minutes, or
        call{" "}
        <a
          href="tel:+15099518534"
          className="text-brand-200 underline decoration-dotted"
        >
          (509) 951-8534
        </a>
        .
      </div>
    </div>
  );
}
