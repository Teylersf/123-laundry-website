"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const VISITOR_KEY = "123laundry.analytics.visitor";
const SESSION_KEY = "123laundry.analytics.session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ENGAGEMENT_HEARTBEAT_MS = 10_000;

type StoredSession = {
  id: string;
  lastActivity: number;
  landingSent: boolean;
};

type ActivePage = {
  eventId: string;
  visitorId: string;
  sessionId: string;
  engagedMs: number;
  activeSince: number | null;
  lastSentSeconds: number;
};

let memoryVisitorId: string | null = null;
let memorySession: StoredSession | null = null;
let lastTrackedKey = "";
let activePage: ActivePage | null = null;

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

function send(payload: Record<string, unknown>) {
  const json = JSON.stringify(payload);
  const body = new Blob([json], { type: "application/json" });
  if (navigator.sendBeacon?.("/api/analytics", body)) return;

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}

function touchSession(sessionId: string) {
  const now = Date.now();
  if (memorySession?.id === sessionId) {
    memorySession = { ...memorySession, lastActivity: now };
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<StoredSession>) : null;
    if (stored?.id === sessionId) {
      saveSession({
        id: sessionId,
        lastActivity: now,
        landingSent: stored.landingSent === true,
      });
    }
  } catch {
    // The in-memory session is already updated when storage is unavailable.
  }
}

function accumulateActiveTime() {
  if (!activePage || activePage.activeSince === null) return;
  const now = performance.now();
  activePage.engagedMs += Math.max(0, now - activePage.activeSince);
  activePage.activeSince = document.visibilityState === "visible" ? now : null;
}

function flushEngagement() {
  if (!activePage) return;
  accumulateActiveTime();
  const engagedSeconds = Math.min(
    7_200,
    Math.floor(activePage.engagedMs / 1000),
  );
  if (engagedSeconds < 1 || engagedSeconds <= activePage.lastSentSeconds) return;

  activePage.lastSentSeconds = engagedSeconds;
  touchSession(activePage.sessionId);
  send({
    kind: "engagement",
    eventId: activePage.eventId,
    visitorId: activePage.visitorId,
    sessionId: activePage.sessionId,
    engagedSeconds,
  });
}

function trackPageView(pathname: string) {
  flushEngagement();
  activePage = null;
  if (!pathname || pathname.startsWith("/admin")) return;

  const trackingKey = `${pathname}${window.location.search}`;
  if (lastTrackedKey === trackingKey) return;
  lastTrackedKey = trackingKey;

  const now = Date.now();
  const session = currentSession(now);
  const isLandingView = !session.landingSent;
  const query = new URLSearchParams(window.location.search);
  const eventId = randomId();
  const visitor = visitorId();
  const payload = {
    kind: "pageview",
    eventId,
    visitorId: visitor,
    sessionId: session.id,
    isLanding: isLandingView,
    path: pathname,
    title: document.title,
    referrer: isLandingView ? document.referrer : "",
    utmSource: isLandingView ? query.get("utm_source") : "",
    utmMedium: isLandingView ? query.get("utm_medium") : "",
    utmCampaign: isLandingView ? query.get("utm_campaign") : "",
    screenWidth: window.screen.width,
  };

  saveSession({ ...session, lastActivity: now, landingSent: true });
  send(payload);
  activePage = {
    eventId,
    visitorId: visitor,
    sessionId: session.id,
    engagedMs: 0,
    activeSince:
      document.visibilityState === "visible" ? performance.now() : null,
    lastSentSeconds: 0,
  };
}

export function FirstPartyAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const heartbeat = window.setInterval(
      flushEngagement,
      ENGAGEMENT_HEARTBEAT_MS,
    );
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushEngagement();
      } else if (activePage && activePage.activeSince === null) {
        activePage.activeSince = performance.now();
      }
    };
    const onPageHide = () => flushEngagement();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      flushEngagement();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => trackPageView(pathname), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
