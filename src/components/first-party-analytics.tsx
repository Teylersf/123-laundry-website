"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const VISITOR_KEY = "123laundry.analytics.visitor";
const SESSION_KEY = "123laundry.analytics.session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type StoredSession = {
  id: string;
  lastActivity: number;
  landingSent: boolean;
};

let memoryVisitorId: string | null = null;
let memorySession: StoredSession | null = null;
let lastTrackedKey = "";

function randomId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function visitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = randomId();
    localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    memoryVisitorId ??= randomId();
    return memoryVisitorId;
  }
}

function currentSession(now: number): StoredSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredSession>) : null;
    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.lastActivity === "number" &&
      now - parsed.lastActivity < SESSION_TIMEOUT_MS
    ) {
      return {
        id: parsed.id,
        lastActivity: now,
        landingSent: parsed.landingSent === true,
      };
    }
  } catch {
    if (
      memorySession &&
      now - memorySession.lastActivity < SESSION_TIMEOUT_MS
    ) {
      return { ...memorySession, lastActivity: now };
    }
  }
  return { id: randomId(), lastActivity: now, landingSent: false };
}

function saveSession(session: StoredSession) {
  memorySession = session;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The in-memory fallback still keeps navigation within this tab coherent.
  }
}

function trackPageView(pathname: string) {
  if (!pathname || pathname.startsWith("/admin")) return;

  const trackingKey = `${pathname}${window.location.search}`;
  if (lastTrackedKey === trackingKey) return;
  lastTrackedKey = trackingKey;

  const now = Date.now();
  const session = currentSession(now);
  const isLandingView = !session.landingSent;
  const query = new URLSearchParams(window.location.search);
  const payload = JSON.stringify({
    eventId: randomId(),
    visitorId: visitorId(),
    sessionId: session.id,
    isLanding: isLandingView,
    path: pathname,
    title: document.title,
    referrer: isLandingView ? document.referrer : "",
    utmSource: isLandingView ? query.get("utm_source") : "",
    utmMedium: isLandingView ? query.get("utm_medium") : "",
    utmCampaign: isLandingView ? query.get("utm_campaign") : "",
    screenWidth: window.screen.width,
  });

  saveSession({ ...session, lastActivity: now, landingSent: true });

  const body = new Blob([payload], { type: "application/json" });
  if (navigator.sendBeacon?.("/api/analytics", body)) return;

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}

export function FirstPartyAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const timer = window.setTimeout(() => trackPageView(pathname), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
