#!/usr/bin/env node
/**
 * 123 Laundry · LaundryCat session relay (local daemon)
 *
 * Runs a real Chromium instance with a persistent profile, navigates to
 * https://www.laundrycat.com/availability, captures the laravel_session
 * cookie, and POSTs it to our /api/laundrycat/session webhook so the
 * homepage can show live machine status.
 *
 * Usage:
 *   npm run laundrycat:relay
 *
 * The first run opens a visible Chromium window. The owner signs in
 * manually (passes the human check once). After that the profile has the
 * trust signals and subsequent runs sail through invisibly.
 *
 * Loops on LAUNDRYCAT_RELAY_INTERVAL_MIN (default 30) until stopped.
 *
 * Env (read from .env.local in the project root):
 *   LAUNDRYCAT_RELAY_WEBHOOK    where to POST the cookie
 *                               default: http://localhost:3000/api/laundrycat/session
 *   ADMIN_INGEST_TOKEN          must match the server's ADMIN_INGEST_TOKEN
 *   LAUNDRYCAT_RELAY_INTERVAL_MIN  default: 30
 *   LAUNDRYCAT_RELAY_HEADLESS   "true" to run headless after the first login
 *   LAUNDRYCAT_RELAY_CHANNEL    "chrome" (default) or "chromium"
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// ----- env loader (tiny, dependency-free) ------------------------------------
function loadEnv() {
  const candidates = [
    path.join(ROOT, ".env.local"),
    path.join(ROOT, ".env"),
  ];
  const out = {};
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // .env loader precedence: .env.local first wins.
      if (out[key] === undefined) out[key] = value;
    }
  }
  return out;
}
const env = { ...loadEnv(), ...process.env };

const WEBHOOK =
  env.LAUNDRYCAT_RELAY_WEBHOOK ?? "http://localhost:3000/api/laundrycat/session";
const TOKEN = env.ADMIN_INGEST_TOKEN;
const INTERVAL_MIN = Number(env.LAUNDRYCAT_RELAY_INTERVAL_MIN) || 30;
const INTERVAL_MS = INTERVAL_MIN * 60_000;
const CHANNEL = env.LAUNDRYCAT_RELAY_CHANNEL ?? "chrome";
// On the first launch the profile is empty, so we need a window for the
// human check. Once that's done, you can flip LAUNDRYCAT_RELAY_HEADLESS=true.
const HEADLESS = env.LAUNDRYCAT_RELAY_HEADLESS === "true";

const PROFILE_DIR =
  env.LAUNDRYCAT_RELAY_PROFILE_DIR ??
  path.join(ROOT, ".laundrycat-relay-profile");
mkdirSync(PROFILE_DIR, { recursive: true });

// ----- pretty logging --------------------------------------------------------
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};
function ts() {
  return `${C.dim}${new Date().toISOString().replace("T", " ").slice(0, 19)}${C.reset}`;
}
function log(...args) { console.log(ts(), ...args); }
function ok(...args)  { console.log(ts(), C.green + "✓" + C.reset, ...args); }
function warn(...args){ console.log(ts(), C.yellow + "!" + C.reset, ...args); }
function err(...args) { console.log(ts(), C.red + "×" + C.reset, ...args); }

// ----- one refresh cycle -----------------------------------------------------
async function refreshOnce() {
  if (!TOKEN) {
    err(
      "ADMIN_INGEST_TOKEN is not set in .env.local — copy it from your Vercel/local env and rerun.",
    );
    return false;
  }

  log(`launching ${HEADLESS ? "headless" : "headed"} ${CHANNEL}…`);
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: CHANNEL,
      headless: HEADLESS,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
      ],
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      timezoneId: "America/Los_Angeles",
    });
  } catch (e) {
    err("could not launch browser:", e?.message ?? e);
    if (CHANNEL === "chrome") {
      warn("retrying with the bundled chromium binary…");
      try {
        context = await chromium.launchPersistentContext(PROFILE_DIR, {
          headless: HEADLESS,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
          ],
          viewport: { width: 1280, height: 900 },
          locale: "en-US",
          timezoneId: "America/Los_Angeles",
        });
      } catch (e2) {
        err("bundled chromium also failed:", e2?.message ?? e2);
        return false;
      }
    } else {
      return false;
    }
  }

  try {
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(45_000);
    await page.goto("https://www.laundrycat.com/availability", {
      waitUntil: "domcontentloaded",
    });

    // If we land on /login, ask the human to sign in this once.
    if (/\/login|\/$/i.test(new URL(page.url()).pathname)) {
      const loginPath = new URL(page.url()).pathname;
      if (loginPath === "/login" || loginPath === "/") {
        warn(
          `not signed in — please sign in manually in the open window. Card: ${C.cyan}695395634${C.reset}`,
        );
        warn(
          "after you click Login successfully, this script will continue automatically.",
        );
        await page.waitForURL(/laundrycat\.com\/(availability|trends|purchases|subscriptions)/, {
          timeout: 10 * 60_000,
        });
        ok("sign-in detected.");
      }
    }

    const cookies = await context.cookies("https://www.laundrycat.com");
    const session = cookies.find((c) => c.name === "laravel_session");
    if (!session) {
      err("no laravel_session cookie present — try signing in manually next run.");
      return false;
    }

    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-token": TOKEN,
      },
      body: JSON.stringify({ cookie: session.value, ttlSeconds: 110 * 60 }),
    });
    const text = await res.text();
    if (res.ok) {
      ok(
        `cookie relayed → ${WEBHOOK} (HTTP ${res.status}). Snapshot will refresh on next cron tick.`,
      );
      return true;
    }
    err(`webhook rejected: HTTP ${res.status}: ${text.slice(0, 200)}`);
    return false;
  } catch (e) {
    err("refresh error:", e?.message ?? e);
    return false;
  } finally {
    await context.close().catch(() => undefined);
  }
}

// ----- main loop -------------------------------------------------------------
async function main() {
  console.log("");
  console.log(`${C.bold}${C.cyan}123 Laundry · LaundryCat relay${C.reset}`);
  console.log(`  webhook:   ${WEBHOOK}`);
  console.log(`  interval:  every ${INTERVAL_MIN} min`);
  console.log(`  channel:   ${CHANNEL}${HEADLESS ? " (headless)" : " (headed)"}`);
  console.log(`  profile:   ${PROFILE_DIR}`);
  console.log("");
  console.log(
    `${C.dim}Press Ctrl+C to stop. After your first successful login, you can set LAUNDRYCAT_RELAY_HEADLESS=true in .env.local and minimize the terminal.${C.reset}`,
  );
  console.log("");

  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) process.exit(1);
    stopping = true;
    log(C.yellow + "stopping…" + C.reset);
  });
  process.on("SIGTERM", () => process.exit(0));

  while (!stopping) {
    await refreshOnce();
    if (stopping) break;
    log(`sleeping ${INTERVAL_MIN} min until next refresh…`);
    // Sleep in 1s ticks so SIGINT doesn't take 30 min to land.
    const wakeAt = Date.now() + INTERVAL_MS;
    while (!stopping && Date.now() < wakeAt) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  process.exit(0);
}

main().catch((e) => {
  err("fatal:", e);
  process.exit(1);
});
