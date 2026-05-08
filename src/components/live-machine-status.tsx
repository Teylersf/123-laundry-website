"use client";

import { useEffect, useMemo, useState } from "react";

// ---------- Types -----------------------------------------------------------
type Machine = {
  id: string;
  kind: "washer" | "dryer" | "other";
  status: "available" | "busy" | "offline" | "unknown";
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
    return {
      ...m,
      liveSeconds: sec,
      liveStatus: sec === 0 ? "available" : "busy",
    };
  }
  return { ...m, liveSeconds: m.remainingSeconds, liveStatus: m.status };
}

// ---------- Component -------------------------------------------------------
export function LiveMachineStatus() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function pull() {
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
    pull();
    const id = setInterval(pull, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const hasData = !!data && data.locations.length > 0;

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
              See what's open right now.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-paper/70 md:text-base">
              Pulled in real time from our card-system portal. Save a wasted
              drive — peek before you pack the basket.
            </p>
          </div>
          <FreshnessPill
            lastSyncOk={data?.lastSyncOk ?? null}
            firstSnapshotAt={
              data?.locations[0]?.snapshot.fetchedAt ?? null
            }
            isSimulated={
              !!(
                data &&
                data.locations[0] &&
                (data.locations[0].snapshot as Snapshot & { simulated?: boolean })
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
        data!.locations.map((entry) => (
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

// ---------- Single drum visual ----------------------------------------------
function Drum({ m }: { m: Live }) {
  const status = m.liveStatus;
  const palettes = {
    available: {
      ringOuter: "ring-emerald-400/30",
      bgOuter: "bg-emerald-400/[0.06]",
      drumGrad: "from-emerald-300/15 to-emerald-700/30",
      drumRing: "ring-emerald-400/40",
      label: "text-emerald-300",
      pip: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]",
    },
    busy: {
      ringOuter: "ring-amber-400/40",
      bgOuter: "bg-amber-400/[0.07]",
      drumGrad: "from-amber-300/20 to-amber-700/30",
      drumRing: "ring-amber-400/60",
      label: "text-amber-200",
      pip: "bg-amber-400",
    },
    offline: {
      ringOuter: "ring-zinc-500/30",
      bgOuter: "bg-zinc-700/20",
      drumGrad: "from-zinc-700/30 to-zinc-900/40",
      drumRing: "ring-zinc-600/40",
      label: "text-zinc-500",
      pip: "bg-zinc-500",
    },
    unknown: {
      ringOuter: "ring-zinc-500/30",
      bgOuter: "bg-zinc-700/20",
      drumGrad: "from-zinc-700/30 to-zinc-900/40",
      drumRing: "ring-zinc-600/40",
      label: "text-zinc-500",
      pip: "bg-zinc-500",
    },
  } as const;
  const p = palettes[status];
  const showCountdown =
    status === "busy" && m.liveSeconds !== null && m.liveSeconds > 0;

  return (
    <div
      className="group relative flex flex-col items-center"
      title={`${m.id} — ${m.rawLabel}`}
    >
      {/* Outer machine body */}
      <div
        className={`relative aspect-square w-full rounded-full ring-1 ${p.ringOuter} ${p.bgOuter} shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover:-translate-y-0.5`}
      >
        {/* Inner chrome ring */}
        <div className="absolute inset-[10%] rounded-full ring-1 ring-paper/15">
          {/* Drum (rotates when busy) */}
          <div
            className={`absolute inset-[8%] rounded-full bg-linear-to-br ${p.drumGrad} ring-1 ${p.drumRing} ${
              status === "busy"
                ? "animate-[spin_18s_linear_infinite]"
                : status === "available"
                  ? ""
                  : ""
            }`}
            style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 1.6px, transparent 1.8px), radial-gradient(circle at 30% 30%, rgba(255,255,255,0.07) 1px, transparent 1.2px), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.07) 1px, transparent 1.2px), radial-gradient(circle at 30% 70%, rgba(255,255,255,0.07) 1px, transparent 1.2px), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.07) 1px, transparent 1.2px)`,
              backgroundSize: "100% 100%",
            }}
            aria-hidden="true"
          />

          {/* Center text/pip */}
          <div className="absolute inset-0 flex items-center justify-center">
            {showCountdown ? (
              <span
                className={`rounded-md bg-ink/75 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums shadow-md md:text-xs ${p.label}`}
              >
                {fmtCountdown(m.liveSeconds!)}
              </span>
            ) : status === "available" ? (
              <span
                className={`size-1.5 rounded-full ${p.pip} ${status === "available" ? "animate-pulse" : ""}`}
              />
            ) : status === "offline" ? (
              <span className="text-[10px] text-zinc-500">×</span>
            ) : null}
          </div>
        </div>

        {/* Subtle glow on hover */}
        <div
          aria-hidden="true"
          className="absolute -inset-1 rounded-full bg-brand/0 transition group-hover:bg-brand/10"
        />
      </div>

      <span
        className={`mt-2 font-mono text-[10px] tracking-tight md:text-xs ${p.label}`}
      >
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
