#!/usr/bin/env node
/**
 * 123 Laundry · LaundryCat live-data relay (persistent window)
 *
 * Opens a real Chromium window once, navigates to the LaundryCat
 * "Machine Availability" page, waits for the owner to sign in (one human
 * check, ever), then **never closes the window**. Inside the page context
 * we re-call the portal's own `/machines` JSON endpoint every 60 seconds —
 * which both keeps the Laravel session alive forever AND captures the
 * freshest data — and POST that JSON straight to our snapshot ingest
 * endpoint.
 *
 * Run once with `npm run laundrycat:relay`, click the human-check, then
 * minimize the window. As long as that window is alive, the homepage
 * shows live data.
 *
 * Env (.env.local):
 *   ADMIN_INGEST_TOKEN              required — must match server
 *   LAUNDRYCAT_RELAY_WEBHOOK        snapshot endpoint
 *                                   (default: http://localhost:3000/api/laundrycat/snapshot)
 *   LAUNDRYCAT_RELAY_INTERVAL_SEC   default: 60
 *   LAUNDRYCAT_RELAY_CHANNEL        "chrome" (default) or "chromium"
 *   LAUNDRYCAT_RELAY_HEADLESS       "true" to run headless after first login
 *   LAUNDRYCAT_RELAY_PROFILE_DIR    where to keep the Chromium profile
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// ----- env loader (dependency-free) -----------------------------------------
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
      if (out[key] === undefined) out[key] = value;
    }
  }
  return out;
}
const env = { ...loadEnv(), ...process.env };

const WEBHOOK =
  env.LAUNDRYCAT_RELAY_WEBHOOK ?? "http://localhost:3000/api/laundrycat/snapshot";
const TOKEN = env.ADMIN_INGEST_TOKEN;
const INTERVAL_SEC = Number(env.LAUNDRYCAT_RELAY_INTERVAL_SEC) || 60;
const CHANNEL = env.LAUNDRYCAT_RELAY_CHANNEL ?? "chrome";
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
const stamp = () =>
  `${C.dim}${new Date().toISOString().replace("T", " ").slice(0, 19)}${C.reset}`;
const log = (...a) => console.log(stamp(), ...a);
const ok = (...a) => console.log(stamp(), C.green + "✓" + C.reset, ...a);
const warn = (...a) => console.log(stamp(), C.yellow + "!" + C.reset, ...a);
const err = (...a) => console.log(stamp(), C.red + "×" + C.reset, ...a);

// ----- main ------------------------------------------------------------------
async function main() {
  console.log("");
  console.log(`${C.bold}${C.cyan}123 Laundry · live-data relay${C.reset}`);
  console.log(`  webhook:        ${WEBHOOK}`);
  console.log(`  poll interval:  every ${INTERVAL_SEC}s`);
  console.log(`  browser:        ${CHANNEL}${HEADLESS ? " (headless)" : " (headed)"}`);
  console.log(`  profile dir:    ${PROFILE_DIR}`);
  console.log("");
  console.log(
    `${C.dim}Sign in once when the window opens — after that the script keeps the page alive forever and ships fresh machine data to your site every ${INTERVAL_SEC}s. Don't close the window.${C.reset}`,
  );
  console.log(`${C.dim}Press Ctrl+C to stop.${C.reset}`);
  console.log("");

  if (!TOKEN) {
    err("ADMIN_INGEST_TOKEN missing in .env.local — aborting.");
    process.exit(1);
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
      warn("retrying with bundled chromium…");
      context = await chromium
        .launchPersistentContext(PROFILE_DIR, {
          headless: HEADLESS,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
          viewport: { width: 1280, height: 900 },
        })
        .catch((e2) => {
          err("bundled chromium failed:", e2?.message ?? e2);
          process.exit(1);
        });
    } else {
      process.exit(1);
    }
  }

  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) process.exit(1);
    stopping = true;
    log(C.yellow + "stopping… (closing browser)" + C.reset);
    context.close().finally(() => process.exit(0));
  });

  // Reuse an existing tab if Chrome restored one; otherwise open a new one.
  const page =
    context.pages().find((p) => /laundrycat\.com/i.test(p.url())) ??
    (await context.newPage());
  page.setDefaultNavigationTimeout(45_000);

  // Navigate to the live page. If we land on /login, wait for the human to
  // sign in. After that, never reload — the in-page JS keeps the session
  // warm by polling /machines, and we piggyback off that.
  await page.goto("https://www.laundrycat.com/availability", {
    waitUntil: "domcontentloaded",
  });

  while (
    !stopping &&
    /\/(login|$)/i.test(new URL(page.url()).pathname.replace(/\/$/, "/"))
  ) {
    if (
      new URL(page.url()).pathname === "/login" ||
      new URL(page.url()).pathname === "/"
    ) {
      warn(
        `not signed in — please sign in manually in the open window. Card: ${C.cyan}695395634${C.reset}`,
      );
      warn(`The script will detect the redirect automatically.`);
      try {
        await page.waitForURL(
          /laundrycat\.com\/(availability|trends|purchases|subscriptions)/,
          { timeout: 10 * 60_000 },
        );
        ok("sign-in detected.");
        break;
      } catch (e) {
        err("waited 10 minutes without a sign-in, retrying…");
        await page.goto("https://www.laundrycat.com/availability", {
          waitUntil: "domcontentloaded",
        });
      }
    }
  }

  // Steady-state loop: poll /machines from inside the page, post snapshot.
  let consecutiveFailures = 0;
  while (!stopping) {
    try {
      const json = await page.evaluate(async () => {
        const r = await fetch("/machines", {
          headers: {
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!r.ok) {
          throw new Error("HTTP " + r.status);
        }
        return await r.json();
      });

      if (!json || !json.display_locations) {
        warn("response missing display_locations — page may have logged out");
      } else {
        const post = await fetch(WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ingest-token": TOKEN,
          },
          body: JSON.stringify({ rawJson: json }),
        });
        if (post.ok) {
          const data = await post.json().catch(() => ({}));
          const stored = (data.locations ?? [])
            .map(
              (l) => `${l.slug}: ${l.washersAvailable}w / ${l.dryersAvailable}d open`,
            )
            .join(", ");
          ok(`snapshot relayed → ${stored || "no locations"}`);
          consecutiveFailures = 0;
        } else {
          const text = await post.text().catch(() => "");
          err(`webhook ${post.status}: ${text.slice(0, 200)}`);
          consecutiveFailures++;
        }
      }
    } catch (e) {
      err("poll error:", e?.message ?? e);
      consecutiveFailures++;
      // If we've failed several times in a row, the page may have logged
      // out somehow. Try a soft reload — Laravel will redirect to /login
      // if the session really is gone, and we'll surface that clearly.
      if (consecutiveFailures >= 3) {
        warn("3 consecutive poll failures — soft-reloading the page");
        try {
          await page.reload({ waitUntil: "domcontentloaded" });
          if (/\/login/.test(new URL(page.url()).pathname)) {
            warn("session was lost — please sign in again in the window");
            await page.waitForURL(
              /laundrycat\.com\/(availability|trends|purchases|subscriptions)/,
              { timeout: 10 * 60_000 },
            );
            ok("re-signed in.");
            consecutiveFailures = 0;
          }
        } catch {
          /* ignore — next loop iteration will try again */
        }
      }
    }

    if (stopping) break;
    // Sleep in 1s ticks so SIGINT lands quickly.
    const wakeAt = Date.now() + INTERVAL_SEC * 1000;
    while (!stopping && Date.now() < wakeAt) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

main().catch((e) => {
  err("fatal:", e);
  process.exit(1);
});
