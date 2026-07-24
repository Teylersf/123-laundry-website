/**
 * Snapshot ingest endpoint.
 *
 * The local relay daemon runs a persistent Playwright window pointed at
 * https://www.laundrycat.com/availability. It polls the same `/machines`
 * JSON endpoint LaundryCat's own page uses, then POSTs the raw response
 * here so we can normalize it and cache it for the homepage.
 *
 * This bypasses the entire CAPTCHA/proxy/2Captcha morass — the page itself
 * authenticates via the owner's already-trusted browser session, and the
 * session keeps refreshing as long as the tab stays open.
 *
 * Auth: shared bearer token in `ADMIN_INGEST_TOKEN` (or `x-ingest-token`
 * header for cross-origin scripts).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kv, KV_KEYS } from "@/lib/kv";
import {
  inferLocationSlug,
  snapshotFromJson,
  type LocationSnapshot,
} from "@/lib/laundrycat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_INGEST_TOKEN;
  if (!expected) return false;
  const auth =
    req.headers.get("authorization") ??
    req.headers.get("Authorization") ??
    "";
  if (auth === `Bearer ${expected}`) return true;
  return (req.headers.get("x-ingest-token") ?? "") === expected;
}

const CORS = {
  "Access-Control-Allow-Origin": "https://www.laundrycat.com",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, authorization, x-ingest-token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const SNAPSHOT_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: CORS },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "expected JSON body" },
      { status: 400, headers: CORS },
    );
  }

  // Accept both shapes:
  //  { rawJson: <the /machines response> }
  //  <the /machines response itself>
  const raw =
    body && typeof body === "object" && "rawJson" in body
      ? (body as Record<string, unknown>).rawJson
      : body;

  if (
    !raw ||
    typeof raw !== "object" ||
    !("display_locations" in (raw as Record<string, unknown>))
  ) {
    return NextResponse.json(
      { error: "expected /machines JSON shape with display_locations" },
      { status: 400, headers: CORS },
    );
  }

  const snapshots = snapshotFromJson(raw as Parameters<typeof snapshotFromJson>[0]);
  if (snapshots.length === 0) {
    return NextResponse.json(
      { error: "no display_locations in payload" },
      { status: 400, headers: CORS },
    );
  }

  const now = new Date().toISOString();
  const stored: Array<{
    slug: string;
    label: string;
    washersAvailable: number;
    dryersAvailable: number;
    machineCount: number;
  }> = [];

  try {
    // 1. Archive the entire raw response, then attach every location and
    //    machine observation to that snapshot row. This preserves the raw
    //    payload for reprocessing when we add fields later.
    const rawSnapshot = await db.rawSnapshot.create({
      data: { payload: raw as object },
      select: { id: true, capturedAt: true },
    });

    // 2. Fan out per-location + per-machine rows from the same raw response.
    //    We walk the raw payload again (not the normalized `snapshots`) so
    //    that vending/door companions and any new fields the parser drops
    //    are still captured 1:1.
    const rawLocations =
      (raw as { display_locations?: RawIngestLocation[] }).display_locations ??
      [];

    for (const rawLoc of rawLocations) {
      if (rawLoc.is_demo) continue;
      const slug = inferLocationSlug(rawLoc.location_address ?? "");
      const parsed = snapshots.find(
        (s) => s.locationId === (rawLoc.location_id ?? ""),
      );
      if (!parsed) continue;

      const otherCount = parsed.machines.filter(
        (m) => m.kind === "other",
      ).length;

      await db.locationObservation.create({
        data: {
          snapshotId: rawSnapshot.id,
          capturedAt: rawSnapshot.capturedAt,
          locationId: rawLoc.location_id ?? "",
          locationSlug: slug,
          locationLabel: rawLoc.location_address ?? "",
          washersAvailable: parsed.washersAvailable,
          washersTotal: parsed.washersTotal,
          dryersAvailable: parsed.dryersAvailable,
          dryersTotal: parsed.dryersTotal,
          otherCount,
          websocketSupport:
            typeof rawLoc.websocket_support === "boolean"
              ? rawLoc.websocket_support
              : null,
        },
      });

      const rawMachines: RawIngestMachine[] = [
        ...(rawLoc.allWashers ?? []),
        ...(rawLoc.allDryers ?? []),
      ];
      // Look up each parsed machine by ID so we get the same
      // classification/status logic the UI sees, while still storing the
      // full raw object.
      const parsedByNumber = new Map(
        parsed.machines.map((m) => [m.id, m] as const),
      );

      if (rawMachines.length > 0) {
        await db.machineObservation.createMany({
          data: rawMachines.map((rm) => {
            const number = (rm.Number ?? "").toUpperCase();
            const parsedMachine = parsedByNumber.get(number);
            return {
              snapshotId: rawSnapshot.id,
              capturedAt: rawSnapshot.capturedAt,
              locationId: rawLoc.location_id ?? "",
              locationSlug: slug,
              machineNumber: number,
              kind: parsedMachine?.kind ?? "other",
              status: parsedMachine?.status ?? "unknown",
              rawLabel: parsedMachine?.rawLabel ?? rm.display_status ?? "",
              rawStatusCode:
                typeof rm.Status === "number" ? rm.Status : null,
              rawColour: rm.colour ?? null,
              isOnline: parsedMachine?.isOnline ?? rm.is_online ?? true,
              showTimer: typeof rm.show_timer === "boolean" ? rm.show_timer : null,
              remainingSeconds: parsedMachine?.remainingSeconds ?? null,
              endsAt: parsedMachine?.endsAt
                ? new Date(parsedMachine.endsAt)
                : null,
              machineDbId: bigIntOrNull(rm.id),
              dateAdded: parseTimestamp(rm.DateAdded),
              errorCode1: intOrNull(rm.ErrorCode1),
              errorCode2: intOrNull(rm.ErrorCode2),
              errorCode3: intOrNull(rm.ErrorCode3),
              machineSpecificStatusCode1: intOrNull(rm.MachineSpecificStatusCode1),
              machineSpecificStatusCode2: intOrNull(rm.MachineSpecificStatusCode2),
              firmwareFilename:
                typeof rm.FirmwareFilename === "string"
                  ? rm.FirmwareFilename
                  : null,
              isFirmwareUpdatePending:
                typeof rm.Is_FirmwareUpdatePending === "boolean"
                  ? rm.Is_FirmwareUpdatePending
                  : null,
              lastUpdateSettings: parseTimestamp(rm.Last_Update_Settings),
              locationKey:
                typeof rm.Location_Key === "string"
                  ? rm.Location_Key
                  : typeof rm.Location_Key === "number"
                  ? String(rm.Location_Key)
                  : null,
              priceCategoryId: intOrNull(rm.Price_Category_Id),
              readerTechVersionId: intOrNull(rm.reader_tech_version_id),
              rfidStatus: intOrNull(rm.RFID_Status),
              rssi: intOrNull(rm.RSSI),
              seqNo: intOrNull(rm.SeqNo),
              statusTimestamp: parseTimestamp(rm.Status_Timestamp),
              payload: rm as object,
            };
          }),
        });
      }

      // 3. Backwards-compatible KV cache write for the current UI.
      if (slug) {
        await storeSnapshot(slug, parsed);
        stored.push({
          slug,
          label: parsed.locationLabel,
          washersAvailable: parsed.washersAvailable,
          dryersAvailable: parsed.dryersAvailable,
          machineCount: parsed.machines.length,
        });
      }
    }

    await kv.set(KV_KEYS.lastSyncAt, now);
    await kv.set(KV_KEYS.lastSyncOk, now);
    await kv.del(KV_KEYS.lastSyncError);
  } catch (err) {
    return NextResponse.json(
      {
        error: "storage failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500, headers: CORS },
    );
  }

  return NextResponse.json({ ok: true, fetchedAt: now, locations: stored }, {
    headers: CORS,
  });
}

// Minimal duck-typed shapes for the raw LaundryCat payload. Kept local so we
// don't bleed ingest-layer types into the parsed `Machine`/`LocationSnapshot`
// API that the rest of the app consumes.
type RawIngestMachine = {
  Number?: string;
  Status?: number;
  display_status?: string;
  colour?: string;
  is_online?: boolean;
  show_timer?: boolean;
  RemainingTimeMins?: number;
  RemainingTimeSecs?: number;
  id?: unknown;
  DateAdded?: unknown;
  ErrorCode1?: unknown;
  ErrorCode2?: unknown;
  ErrorCode3?: unknown;
  MachineSpecificStatusCode1?: unknown;
  MachineSpecificStatusCode2?: unknown;
  FirmwareFilename?: unknown;
  Is_FirmwareUpdatePending?: unknown;
  Last_Update_Settings?: unknown;
  Location_Key?: unknown;
  Price_Category_Id?: unknown;
  reader_tech_version_id?: unknown;
  RFID_Status?: unknown;
  RSSI?: unknown;
  SeqNo?: unknown;
  Status_Timestamp?: unknown;
} & Record<string, unknown>;

type RawIngestLocation = {
  location_id?: string;
  location_address?: string;
  is_demo?: boolean;
  availableWashers?: number;
  availableDryers?: number;
  allWashers?: RawIngestMachine[];
  allDryers?: RawIngestMachine[];
  websocket_support?: boolean;
} & Record<string, unknown>;

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return null;
}

function bigIntOrNull(v: unknown): bigint | null {
  if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
  if (typeof v === "bigint") return v;
  if (typeof v === "string" && /^-?\d+$/.test(v.trim())) {
    try {
      return BigInt(v.trim());
    } catch {
      return null;
    }
  }
  return null;
}

function parseTimestamp(v: unknown): Date | null {
  if (typeof v !== "string" || v.length === 0) return null;
  // LaundryCat ships timestamps like "2024-11-14 08:22:31" (naive local) or
  // ISO — Date handles both, but reject the epoch fallback so we don't
  // store bogus 1970 rows for empty strings that slip through.
  const d = new Date(v.includes("T") ? v : v.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) || d.getTime() === 0 ? null : d;
}

async function storeSnapshot(slug: string, snapshot: LocationSnapshot) {
  await kv.set(KV_KEYS.snapshot(slug), snapshot, { ex: SNAPSHOT_TTL_SECONDS });
}
