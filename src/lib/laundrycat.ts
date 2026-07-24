/**
 * LaundryCat scraper.
 *
 * LaundryCat's "Machine Availability" page is a thin shell that fetches
 * machine data from `GET /machines` (returns JSON) once you're authenticated.
 * We use that endpoint directly — much more reliable than HTML scraping.
 *
 * Authentication is handled by `laundrycat-auth.ts`. The owner's relay daemon
 * (scripts/laundrycat-relay.mjs) keeps a fresh laravel_session cookie in our
 * KV; this module just consumes it.
 */

export const LAUNDRYCAT_BASE = "https://www.laundrycat.com";
export const MACHINES_API_PATH = "/machines";

export type MachineKind = "washer" | "dryer" | "other";
export type MachineStatus =
  | "available"
  | "busy"
  | "done"      // cycle finished, waiting for pickup
  | "offline"
  | "unknown";

export type Machine = {
  /** As shown by LaundryCat, e.g. "W26", "D11", "DOOR50". */
  id: string;
  kind: MachineKind;
  status: MachineStatus;
  /** Raw status label from the portal ("Available", "Busy", "Offline", etc.). */
  rawLabel: string;
  /** Seconds remaining if the machine reports a countdown — otherwise null. */
  remainingSeconds: number | null;
  /** Absolute ISO timestamp when this load is expected to finish. */
  endsAt: string | null;
  /** True when LaundryCat reports the reader is online. */
  isOnline: boolean;
};

export type LocationSnapshot = {
  /** What LaundryCat displays as the location name, e.g.
   *  "110 South Pines Road, Spokane Valley, WA". */
  locationLabel: string;
  /** LaundryCat's internal location id, e.g. "0100002". */
  locationId: string;
  fetchedAt: string;
  washersAvailable: number;
  washersTotal: number;
  dryersAvailable: number;
  dryersTotal: number;
  machines: Machine[];
};

export type ScrapeResult =
  | { ok: true; snapshots: LocationSnapshot[] }
  | {
      ok: false;
      reason:
        | "session-missing"
        | "session-expired"
        | "captcha"
        | "network-error"
        | "parse-error";
      detail?: string;
    };

// Raw shape of /machines (only the fields we use).
type RawMachine = {
  Number: string;
  Status: number;
  RemainingTimeMins?: number;
  RemainingTimeSecs?: number;
  display_status?: string;
  colour?: string;
  is_online?: boolean;
  show_timer?: boolean;
  /** Naive "YYYY-MM-DD HH:MM:SS" in LaundryCat's server timezone (Eastern).
   *  For a busy machine, this is when the current cycle started. */
  Status_Timestamp?: string;
};

/**
 * Parse a naive LaundryCat timestamp ("YYYY-MM-DD HH:MM:SS") as US Eastern
 * time (America/New_York). LaundryCat serves timestamps without a timezone
 * suffix, but empirical testing (cycle-end transitions and comparison with
 * the kiosk display) shows their server is on Eastern time. Handles both
 * EST (UTC-5) and EDT (UTC-4) automatically via Intl.
 */
export function parseLaundryCatTimestamp(v: unknown): Date | null {
  if (typeof v !== "string" || v.length === 0) return null;
  const cleaned = v.replace(" ", "T");
  // First parse the string as if it were UTC.
  const naiveUtc = new Date(cleaned + (cleaned.endsWith("Z") ? "" : "Z"));
  if (isNaN(naiveUtc.getTime())) return null;
  // Then subtract the Eastern offset applicable at that instant so we land
  // on the correct absolute UTC moment.
  const offsetMinutes = easternOffsetMinutesAt(naiveUtc);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60_000);
}

// Returns the offset of America/New_York from UTC in minutes at the given
// instant (e.g. -240 during EDT, -300 during EST).
function easternOffsetMinutesAt(instant: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "shortOffset",
    }).formatToParts(instant);
    const tz =
      parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
    const m = tz.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (!m) return -300; // safe fallback: EST
    const sign = m[1] === "-" ? -1 : 1;
    const hours = parseInt(m[2] ?? "0", 10);
    const mins = parseInt(m[3] ?? "0", 10);
    return sign * (hours * 60 + mins);
  } catch {
    return -300;
  }
}

type RawLocation = {
  location_id: string;
  location_address: string;
  is_demo?: boolean;
  availableWashers?: number;
  availableDryers?: number;
  allWashers?: RawMachine[];
  allDryers?: RawMachine[];
};

type RawResponse = {
  display_locations?: RawLocation[];
};

function classifyKind(id: string): MachineKind {
  // Strict prefixes — a letter followed immediately by a digit. This rejects
  // companions like DOOR50 (door reader) and SOAP48/49 (detergent vending),
  // which LaundryCat dumps into the dryer array but aren't dryers.
  if (/^w\d/i.test(id)) return "washer";
  if (/^d\d/i.test(id)) return "dryer";
  return "other";
}

function classifyStatus(rawLabel: string, isOnline: boolean): MachineStatus {
  if (!isOnline) return "offline";
  const l = rawLabel.trim().toLowerCase();
  if (l === "available") return "available";
  if (l === "busy" || l === "in use" || l === "running") return "busy";
  // Cycle finished, waiting for the customer to open the door and remove
  // their load. LaundryCat reports this as "Cycle Done" on Speed Queen
  // gear, but we accept the common variants too.
  if (
    l === "cycle done" ||
    l === "cycle complete" ||
    l === "complete" ||
    l === "done" ||
    l === "finished" ||
    l === "ready"
  )
    return "done";
  if (l === "offline" || l === "out of order") return "offline";
  return "unknown";
}

function machineFromRaw(raw: RawMachine): Machine {
  const id = (raw.Number ?? "").toUpperCase();
  // Always trust the ID prefix — LaundryCat lumps door sensors (DOOR50)
  // and vending machines (SOAP48/49) into the dryer array, but they are
  // not dryers and shouldn't inflate the count or show on the grid.
  const kind = classifyKind(id);
  const isOnline = raw.is_online ?? true;
  const rawLabel = raw.display_status ?? "Unknown";
  const status = classifyStatus(rawLabel, isOnline);

  // The portal ships RemainingTime{Mins,Secs} for every washer/dryer, but
  // that value is the machine's TOTAL programmed cycle duration — it does
  // not decrement across polls. Empirical proof: for a busy machine we've
  // observed identical 23:31 values across consecutive polls 60+ seconds
  // apart. The kiosk shows real remaining time as
  //   Status_Timestamp + RemainingTime - now
  // so that's exactly what we compute here.
  //
  // Historical note: an earlier version stored `endsAt = now + Remaining`,
  // which for a fresh scrape would over-report remaining time by the
  // elapsed cycle time. It looked correct at cycle start (before any time
  // had passed) but drifted worse the longer a cycle ran.
  let remainingSeconds: number | null = null;
  let endsAt: string | null = null;
  const showTimer = raw.show_timer ?? false;
  if (status === "busy" && showTimer) {
    const durationMins = Number(raw.RemainingTimeMins ?? 0);
    const durationSecs = Number(raw.RemainingTimeSecs ?? 0);
    const durationTotal = durationMins * 60 + durationSecs;
    const cycleStart = parseLaundryCatTimestamp(raw.Status_Timestamp);
    if (durationTotal > 0 && cycleStart) {
      const endsAtMs = cycleStart.getTime() + durationTotal * 1000;
      endsAt = new Date(endsAtMs).toISOString();
      remainingSeconds = Math.max(
        0,
        Math.round((endsAtMs - Date.now()) / 1000),
      );
    } else if (durationTotal > 0) {
      // Fallback for machines with no Status_Timestamp (shouldn't happen
      // for real Speed Queen units, but the reader mgmt companions could).
      // Best guess: assume the cycle just started.
      remainingSeconds = durationTotal;
      endsAt = new Date(Date.now() + durationTotal * 1000).toISOString();
    }
  }

  return {
    id,
    kind,
    status,
    rawLabel,
    remainingSeconds,
    endsAt,
    isOnline,
  };
}

export function snapshotFromJson(json: RawResponse): LocationSnapshot[] {
  const fetchedAt = new Date().toISOString();
  const locs = json.display_locations ?? [];
  return locs
    .filter((loc) => !loc.is_demo)
    .map((loc) => {
      // LaundryCat drops both real machines and companions (SOAP, DOOR) into
      // these arrays. We classify by ID prefix and partition before counting
      // so vending stations don't inflate the dryer total.
      const all = [...(loc.allWashers ?? []), ...(loc.allDryers ?? [])].map(
        (m) => machineFromRaw(m),
      );
      const washers = all.filter((m) => m.kind === "washer");
      const dryers = all.filter((m) => m.kind === "dryer");

      return {
        locationLabel: loc.location_address ?? "",
        locationId: loc.location_id ?? "",
        fetchedAt,
        washersAvailable: washers.filter((m) => m.status === "available")
          .length,
        washersTotal: washers.length,
        dryersAvailable: dryers.filter((m) => m.status === "available").length,
        dryersTotal: dryers.length,
        machines: all,
      };
    });
}

async function fetchMachinesJsonWithCookie(
  cookie: string,
): Promise<{ status: number; location: string; bodyText: string }> {
  const res = await fetch(`${LAUNDRYCAT_BASE}${MACHINES_API_PATH}`, {
    method: "GET",
    redirect: "manual",
    headers: {
      Cookie: `laravel_session=${encodeURIComponent(cookie)}`,
      "User-Agent":
        "123Laundry-LiveStatus/1.0 (+https://123-laundry.com; runs on behalf of the laundromat owner with their own LaundryCat credentials)",
      Accept: "application/json, text/plain, */*",
      "X-Requested-With": "XMLHttpRequest",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });
  return {
    status: res.status,
    location: res.headers.get("location") ?? "",
    bodyText: res.status >= 300 && res.status < 400 ? "" : await res.text(),
  };
}

/**
 * Fetch the LaundryCat /machines JSON feed, returning one snapshot per
 * non-demo location. If the cached cookie was rejected we trigger a re-login
 * (the auth module figures out which path to take) and retry once.
 */
export async function fetchLaundryCatSnapshot(): Promise<ScrapeResult> {
  const { ensureSessionCookie } = await import("./laundrycat-auth");

  const session = await ensureSessionCookie();
  if (!session.cookie) {
    return {
      ok: false,
      reason: "session-missing",
      detail: session.reason,
    };
  }

  let attempt: { status: number; location: string; bodyText: string };
  try {
    attempt = await fetchMachinesJsonWithCookie(session.cookie);
  } catch (err) {
    return {
      ok: false,
      reason: "network-error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  // Laravel redirects unauthenticated requests to /login.
  if (attempt.status >= 300 && attempt.status < 400) {
    return {
      ok: false,
      reason: "session-expired",
      detail: `redirect ${attempt.status} -> ${attempt.location}`,
    };
  }
  if (attempt.status === 401 || attempt.status === 419) {
    return {
      ok: false,
      reason: "session-expired",
      detail: `HTTP ${attempt.status}`,
    };
  }
  if (attempt.status >= 400) {
    return {
      ok: false,
      reason: "network-error",
      detail: `HTTP ${attempt.status}`,
    };
  }

  let json: RawResponse;
  try {
    json = JSON.parse(attempt.bodyText) as RawResponse;
  } catch (err) {
    return {
      ok: false,
      reason: "parse-error",
      detail: `JSON parse: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const snapshots = snapshotFromJson(json);
  if (snapshots.length === 0) {
    return {
      ok: false,
      reason: "parse-error",
      detail: "no display_locations in response",
    };
  }

  return { ok: true, snapshots };
}

/**
 * Map a LaundryCat-reported location label to a known 123 Laundry slug.
 * The owner's account currently exposes Spokane Valley; future accounts that
 * include Deer Park will be routed automatically.
 */
export function inferLocationSlug(
  label: string,
): "spokane-valley" | "deer-park" | null {
  if (/pines/i.test(label) || /spokane valley/i.test(label))
    return "spokane-valley";
  if (/vernon/i.test(label) || /deer park/i.test(label)) return "deer-park";
  return null;
}
