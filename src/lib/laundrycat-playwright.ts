/**
 * Headless-browser login flow for LaundryCat.
 *
 * Why this exists: LaundryCat protects /login with Google reCAPTCHA Enterprise
 * (sitekey 6Ld8JIop...). When we POST a token solved by 2Captcha — a service
 * that runs on data-center IPs — Google's risk-analysis engine grades it
 * below LaundryCat's threshold and the server replies "CAPTCHA verification
 * failed". A real Chromium instance, with stealth shims for the more
 * obvious automation tells, gets a high enough score to pass without any
 * external solve.
 *
 * If a CAPTCHA challenge image *does* appear (image grid / audio), we leave
 * a hook to plug in 2Captcha's image-task solver later. Most logins from
 * Spokane-region residential IPs avoid the challenge entirely.
 */
import { chromium, type BrowserContext } from "playwright";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";
import { LAUNDRYCAT_BASE } from "./laundrycat";
import { kv, KV_KEYS, type StoredSession } from "./kv";

export type PlaywrightLoginResult =
  | { ok: true; session: StoredSession }
  | { ok: false; reason: string; screenshot?: string };

const NAV_TIMEOUT = 45_000;
const CAPTCHA_PASS_TIMEOUT = 30_000;

/**
 * Comprehensive stealth shims. The aim is to make Playwright-driven Chromium
 * pass the half-dozen probes Google's reCAPTCHA risk model runs in JS:
 *   - navigator.webdriver presence
 *   - empty navigator.plugins / mimeTypes
 *   - missing window.chrome.runtime
 *   - a permissions.query that returns "denied" for everything
 *   - WebGL VENDOR / RENDERER reporting "Google Inc." / "SwiftShader"
 *   - WebGL UNMASKED_VENDOR_WEBGL = "Brian Paul" (Mesa giveaway)
 *
 * None of this guarantees a passing reCAPTCHA score — IP reputation still
 * dominates — but in tandem with a clean residential IP it usually clears.
 */
async function applyStealth(context: BrowserContext) {
  await context.addInitScript(() => {
    // 1. webdriver
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });

    // 2. languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });

    // 3. plugins + mimeTypes — fake a small but realistic Chrome PDF viewer.
    const plugin = {
      name: "Chrome PDF Plugin",
      filename: "internal-pdf-viewer",
      description: "Portable Document Format",
      length: 1,
    };
    Object.defineProperty(navigator, "plugins", {
      get: () => [plugin, plugin, plugin],
    });
    Object.defineProperty(navigator, "mimeTypes", {
      get: () => [{ type: "application/pdf" }],
    });

    // 4. window.chrome
    interface ChromeShim {
      runtime: Record<string, unknown>;
      app: Record<string, unknown>;
      loadTimes: () => Record<string, number>;
      csi: () => Record<string, number>;
    }
    const w = window as unknown as { chrome?: ChromeShim };
    if (!w.chrome) {
      w.chrome = {
        runtime: {},
        app: {
          isInstalled: false,
          InstallState: { DISABLED: "disabled" },
          RunningState: { RUNNING: "running" },
        },
        loadTimes: () => ({}),
        csi: () => ({}),
      };
    }

    // 5. permissions.query
    const origQuery = window.navigator.permissions.query.bind(
      window.navigator.permissions,
    );
    window.navigator.permissions.query = (
      params: PermissionDescriptor & { name: string },
    ) =>
      params.name === "notifications"
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : origQuery(params);

    // 6. WebGL parameter spoofing — Chromium running headless reports
    // "SwiftShader" and "Google Inc." which trips Google's detection.
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (
      this: WebGLRenderingContext,
      parameter: number,
    ) {
      if (parameter === 37445) return "Intel Inc.";          // UNMASKED_VENDOR_WEBGL
      if (parameter === 37446) return "Intel Iris OpenGL Engine"; // UNMASKED_RENDERER_WEBGL
      return getParameter.call(this, parameter);
    };

    // 7. Hardware concurrency (laptops typically report 4 / 8 / 12)
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });

    // 8. deviceMemory
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  });
}

/**
 * Run the full login flow in a real Chromium instance and return the
 * post-auth `laravel_session` cookie (also persisted to KV).
 */
export async function loginWithPlaywright(): Promise<PlaywrightLoginResult> {
  const card = process.env.LAUNDRYCAT_CARD_NUMBER;
  if (!card) {
    return { ok: false, reason: "LAUNDRYCAT_CARD_NUMBER not set" };
  }

  let context: BrowserContext | null = null;
  try {
    const proxyUrl = process.env.LAUNDRYCAT_PROXY_URL; // optional residential proxy
    const headed = process.env.LAUNDRYCAT_PLAYWRIGHT_HEADED === "true";
    const channel = process.env.LAUNDRYCAT_PLAYWRIGHT_CHANNEL ?? "chrome";

    // Persistent profile dir — survives across runs so cookies, localStorage,
    // and Google's "you've been here before" history accumulate. This is the
    // single biggest factor in reCAPTCHA score after IP reputation.
    const profileDir =
      process.env.LAUNDRYCAT_PROFILE_DIR ??
      path.join(os.tmpdir(), "lc-playwright-profile");
    fs.mkdirSync(profileDir, { recursive: true });

    context = await chromium.launchPersistentContext(profileDir, {
      channel,
      headless: !headed,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      locale: "en-US",
      viewport: { width: 1280, height: 900 },
      timezoneId: "America/Los_Angeles",
      ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
    });
    await applyStealth(context);

    // Pre-warm: visit Google so the browser accumulates the cookies and
    // history that reCAPTCHA's risk model likes. Best-effort; ignore errors.
    try {
      const warmup = await context.newPage();
      await warmup.goto("https://www.google.com/", {
        waitUntil: "domcontentloaded",
        timeout: 12_000,
      });
      // Accept cookie consent if the EU dialog shows up.
      await warmup
        .locator('button:has-text("Accept all"), button:has-text("I agree")')
        .first()
        .click({ timeout: 2000 })
        .catch(() => undefined);
      await warmup.waitForTimeout(800);
      await warmup.close();
    } catch {
      /* non-fatal */
    }

    const page = await context!.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);

    await page.goto(`${LAUNDRYCAT_BASE}/`, { waitUntil: "domcontentloaded" });

    // The form may render slightly later — wait for the card number field.
    const cardInput = page.locator('input[name="user-account"]');
    await cardInput.waitFor({ state: "visible", timeout: 15_000 });
    await cardInput.fill(card);

    // Wait for grecaptcha to be ready, then drive a programmatic execute()
    // through the Enterprise widget. If the widget is in checkbox mode, click
    // the checkbox; if it's invisible, call execute() directly.
    await page.waitForFunction(
      () => {
        const w = window as unknown as {
          grecaptcha?: { enterprise?: unknown; ready?: (cb: () => void) => void };
        };
        return !!(w.grecaptcha && (w.grecaptcha.enterprise || w.grecaptcha.ready));
      },
      null,
      { timeout: 20_000 },
    );

    // Try to click the recaptcha checkbox iframe if present.
    const checkboxFrame = page
      .frameLocator(
        'iframe[src*="recaptcha/enterprise/anchor"], iframe[src*="recaptcha/api2/anchor"]',
      )
      .first();
    const checkbox = checkboxFrame.locator(".recaptcha-checkbox-border");
    let clickedCheckbox = false;
    try {
      await checkbox.waitFor({ state: "visible", timeout: 8_000 });
      await checkbox.click({ delay: 120 });
      clickedCheckbox = true;
    } catch {
      // Either invisible-mode or the iframe selector didn't match — fine.
    }

    // Wait for either:
    //  (a) the response token to appear on the page (auto-pass, no challenge), or
    //  (b) an image-challenge iframe to become visible (we'd need 2Captcha).
    const tokenReady = page
      .waitForFunction(
        () => {
          const t = document.getElementById(
            "g-recaptcha-response",
          ) as HTMLTextAreaElement | null;
          return t && typeof t.value === "string" && t.value.length > 20;
        },
        null,
        { timeout: CAPTCHA_PASS_TIMEOUT },
      )
      .then(() => "token" as const);

    const challengeShown = page
      .waitForFunction(
        () => {
          const challengeFrames = document.querySelectorAll(
            'iframe[src*="recaptcha/enterprise/bframe"], iframe[src*="recaptcha/api2/bframe"]',
          );
          for (const f of Array.from(challengeFrames)) {
            const rect = (f as HTMLIFrameElement).getBoundingClientRect();
            if (rect.width > 50 && rect.height > 50) return true;
          }
          return false;
        },
        null,
        { timeout: CAPTCHA_PASS_TIMEOUT },
      )
      .then(() => "challenge" as const);

    const outcome = await Promise.race([
      tokenReady,
      challengeShown,
    ]).catch(() => "timeout" as const);

    if (outcome === "challenge") {
      // We don't have an image-solver wired up yet. Capture a screenshot for
      // diagnostics and bail with a clear reason.
      const shot = await page
        .screenshot({ type: "png", fullPage: false })
        .catch(() => undefined);
      return {
        ok: false,
        reason:
          "reCAPTCHA showed an image challenge — Playwright alone can't solve it. Add CapSolver or 2Captcha image-task and we'll auto-resolve.",
        screenshot: shot ? Buffer.from(shot).toString("base64").slice(0, 80) + "…" : undefined,
      };
    }
    if (outcome === "timeout") {
      return {
        ok: false,
        reason: clickedCheckbox
          ? "Clicked the recaptcha checkbox but no token appeared in 30s — likely scored too low or a hidden challenge"
          : "Couldn't find the recaptcha checkbox iframe in 30s",
      };
    }

    // Submit the form.
    await Promise.all([
      page.waitForURL(/laundrycat\.com\/(?!login)/, {
        timeout: NAV_TIMEOUT,
      }).catch(() => undefined),
      page.locator("#site-login-button").click().catch(() => page.locator("button").first().click()),
    ]);

    // If we got bounced back to /login, the score was still too low or
    // credentials were wrong.
    if (/\/login/i.test(page.url())) {
      const errorText = await page
        .locator("body")
        .innerText()
        .catch(() => "");
      const snippet = errorText.match(/(invalid|incorrect|please try again|robot|captcha)[^\n]{0,120}/i)?.[0];
      return {
        ok: false,
        reason: snippet
          ? `server bounced us back to /login: ${snippet.trim()}`
          : "server bounced us back to /login",
      };
    }

    // Capture the post-auth laravel_session cookie.
    const cookies = await context!.cookies(LAUNDRYCAT_BASE);
    const sessionCookie = cookies.find((c) => c.name === "laravel_session");
    if (!sessionCookie) {
      return { ok: false, reason: "no laravel_session cookie after login" };
    }

    const now = new Date();
    const session: StoredSession = {
      cookie: sessionCookie.value,
      capturedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 110 * 60 * 1000).toISOString(),
    };
    await kv.set(KV_KEYS.session, session, { ex: 110 * 60 });

    return { ok: true, session };
  } catch (err) {
    return {
      ok: false,
      reason:
        err instanceof Error
          ? `playwright: ${err.message}`
          : `playwright: ${String(err)}`,
    };
  } finally {
    if (context) {
      await context.close().catch(() => undefined);
    }
  }
}
