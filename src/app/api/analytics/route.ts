import { Prisma } from "@prisma/client";
import { isBot } from "isbot";
import UAParser from "ua-parser-js";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageViewPayload = {
  eventId?: unknown;
  visitorId?: unknown;
  sessionId?: unknown;
  isLanding?: unknown;
  path?: unknown;
  title?: unknown;
  referrer?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  screenWidth?: unknown;
};

const ID_PATTERN = /^[A-Za-z0-9_-]{10,80}$/;
const PRODUCTION_HOSTS = new Set(["123-laundry.com", "www.123-laundry.com"]);

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, max);
  return cleaned || null;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function requestIsFromPublicSite(request: Request): boolean {
  const host = (request.headers.get("host") ?? "")
    .toLowerCase()
    .split(":")[0];
  const isLocal =
    process.env.NODE_ENV !== "production" &&
    (host === "localhost" || host === "127.0.0.1");
  if (!PRODUCTION_HOSTS.has(host) && !isLocal) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).hostname.toLowerCase() === host;
  } catch {
    return false;
  }
}

function externalReferrer(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return hostname === "123-laundry.com" ? null : hostname.slice(0, 160);
  } catch {
    return null;
  }
}

function noContent() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!requestIsFromPublicSite(request)) return noContent();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) return noContent();

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || isBot(userAgent)) return noContent();

  let payload: PageViewPayload;
  try {
    payload = (await request.json()) as PageViewPayload;
  } catch {
    return noContent();
  }

  if (
    !validId(payload.eventId) ||
    !validId(payload.visitorId) ||
    !validId(payload.sessionId)
  ) {
    return noContent();
  }

  const path = cleanText(payload.path, 500);
  if (!path || !path.startsWith("/") || path.startsWith("/admin")) {
    return noContent();
  }

  const parsed = new UAParser(userAgent).getResult();
  const countryHeader = request.headers.get("x-vercel-ip-country");
  const country = /^[A-Za-z]{2}$/.test(countryHeader ?? "")
    ? countryHeader!.toUpperCase()
    : null;
  const width = Number(payload.screenWidth);
  const screenWidth =
    Number.isInteger(width) && width > 0 && width <= 20_000 ? width : null;

  try {
    await db.webAnalyticsEvent.create({
      data: {
        eventId: payload.eventId,
        visitorId: payload.visitorId,
        sessionId: payload.sessionId,
        isLanding: payload.isLanding === true,
        path,
        title: cleanText(payload.title, 240),
        referrerHost: externalReferrer(payload.referrer),
        utmSource: cleanText(payload.utmSource, 120),
        utmMedium: cleanText(payload.utmMedium, 120),
        utmCampaign: cleanText(payload.utmCampaign, 160),
        country,
        deviceCategory: parsed.device.type ?? "desktop",
        browser: parsed.browser.name ?? "Unknown",
        operatingSystem: parsed.os.name ?? "Unknown",
        screenWidth,
      },
    });
  } catch (error) {
    // sendBeacon can retry during unload. The event ID makes that harmless.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return noContent();
    }
    console.error(
      "[first-party-analytics] event write failed",
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : error instanceof Error
          ? error.name
          : "unknown",
    );
    return noContent();
  }

  return noContent();
}
