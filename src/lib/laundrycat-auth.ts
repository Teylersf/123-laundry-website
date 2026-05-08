/**
 * Fully-automated LaundryCat login.
 *
 * Steps:
 *   1. GET https://www.laundrycat.com/  → Set-Cookie: laravel_session=<pre-auth>
 *      and an HTML body containing the CSRF token (`_token`) plus the
 *      reCAPTCHA Enterprise sitekey.
 *   2. Solve the reCAPTCHA via 2Captcha → g-recaptcha-response token.
 *   3. POST /login with form fields:
 *         _token              = CSRF
 *         user-account        = LAUNDRYCAT_CARD_NUMBER
 *         g-recaptcha-response= <token>
 *      keeping the same cookie jar.
 *   4. On success Laravel rotates the session and 302's to /availability.
 *      We capture the post-auth `laravel_session` cookie and store it.
 *
 * This module never touches the browser — it's pure HTTP + cookie management,
 * suitable for Vercel serverless functions.
 */
import * as cheerio from "cheerio";
import { LAUNDRYCAT_BASE } from "./laundrycat";
import { kv, KV_KEYS, type StoredSession } from "./kv";
import { solveRecaptcha } from "./twocaptcha";
import { CookieJar } from "./cookie-jar";

function parseLoginPage(html: string): { csrf: string; siteKey: string } {
  const $ = cheerio.load(html);
  const csrf = $('input[name="_token"]').attr("value") ?? "";
  const siteKey = $(".g-recaptcha").attr("data-sitekey") ?? "";
  if (!csrf) throw new Error("LaundryCat login: missing _token");
  if (!siteKey) throw new Error("LaundryCat login: missing data-sitekey");
  return { csrf, siteKey };
}

export type LoginResult =
  | { ok: true; session: StoredSession }
  | { ok: false; reason: string };

/**
 * Run a fresh login and persist the resulting session cookie to KV.
 */
export async function loginToLaundryCat(): Promise<LoginResult> {
  const card = process.env.LAUNDRYCAT_CARD_NUMBER;
  if (!card) return { ok: false, reason: "LAUNDRYCAT_CARD_NUMBER not set" };
  if (!process.env.TWOCAPTCHA_API_KEY)
    return { ok: false, reason: "TWOCAPTCHA_API_KEY not set" };

  const jar = new CookieJar();

  // 1. Fetch the login page and capture the pre-auth cookies (laravel_session
  //    plus XSRF-TOKEN if Laravel sets one).
  const initial = await fetch(`${LAUNDRYCAT_BASE}/`, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });
  jar.ingest(initial);
  if (!jar.get("laravel_session")) {
    return { ok: false, reason: "no pre-auth session cookie" };
  }
  const html = await initial.text();
  let csrf: string;
  let siteKey: string;
  try {
    ({ csrf, siteKey } = parseLoginPage(html));
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  // 2. Solve the reCAPTCHA — Enterprise v2 style with action=login.
  let recaptchaToken: string;
  try {
    recaptchaToken = await solveRecaptcha({
      websiteURL: `${LAUNDRYCAT_BASE}/`,
      websiteKey: siteKey,
      isEnterprise: true,
      pageAction: "login",
    });
  } catch (err) {
    return {
      ok: false,
      reason: `captcha solve failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  // 3. POST /login with the same pre-auth cookie + CSRF + recaptcha token.
  const form = new URLSearchParams({
    _token: csrf,
    "user-account": card,
    "g-recaptcha-response": recaptchaToken,
  });

  const loginRes = await fetch(`${LAUNDRYCAT_BASE}/login`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jar.header(),
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Origin: LAUNDRYCAT_BASE,
      Referer: `${LAUNDRYCAT_BASE}/`,
    },
    body: form.toString(),
    cache: "no-store",
  });
  jar.ingest(loginRes);

  const loc = loginRes.headers.get("location") ?? "";

  // Diagnostics — visible in `next dev` console; never logs cookie values.
  // eslint-disable-next-line no-console
  console.log("[laundrycat-auth] login POST", {
    status: loginRes.status,
    location: loc,
    cookies: jar.describe(),
  });

  if (loginRes.status >= 300 && loginRes.status < 400 && /login/i.test(loc)) {
    return { ok: false, reason: `login rejected (302 ${loc})` };
  }

  const postCookie = jar.get("laravel_session");
  if (!postCookie) {
    return { ok: false, reason: "no laravel_session after login POST" };
  }

  // Follow the post-login 302 first — Laravel uses this to render the
  // logged-in dashboard or to bounce the user back to /login with a flash
  // error. The body tells us which.
  if (loc && /^https?:/i.test(loc)) {
    const followed = await fetch(loc, {
      method: "GET",
      redirect: "manual",
      headers: {
        Cookie: jar.header(),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        Referer: `${LAUNDRYCAT_BASE}/`,
      },
      cache: "no-store",
    });
    jar.ingest(followed);
    const followedBody = await followed.text();
    const isLoginPage = /g-recaptcha/i.test(followedBody);
    const errorSnippet = (followedBody.match(/(invalid[^<]{0,80}|incorrect[^<]{0,80}|please try again[^<]{0,80}|robot[^<]{0,80}|captcha[^<]{0,80})/i) ?? [])[0];
    // eslint-disable-next-line no-console
    console.log("[laundrycat-auth] follow login 302 ->", {
      url: loc,
      status: followed.status,
      isLoginPage,
      errorSnippet,
      cookies: jar.describe(),
    });
    if (isLoginPage) {
      return {
        ok: false,
        reason: errorSnippet
          ? `server rejected login: ${errorSnippet.trim()}`
          : "server bounced us back to login form (likely CAPTCHA score too low)",
      };
    }
  }

  // Send the (possibly further-rotated) jar back to /availability to confirm.
  const verify = await fetch(`${LAUNDRYCAT_BASE}/availability`, {
    method: "GET",
    redirect: "manual",
    headers: {
      Cookie: jar.header(),
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      Referer: `${LAUNDRYCAT_BASE}/`,
    },
    cache: "no-store",
  });
  jar.ingest(verify);

  // eslint-disable-next-line no-console
  console.log("[laundrycat-auth] verify GET /availability", {
    status: verify.status,
    location: verify.headers.get("location") ?? "",
    cookies: jar.describe(),
  });

  if (verify.status >= 300 && verify.status < 400) {
    const vloc = verify.headers.get("location") ?? "";
    if (/login/i.test(vloc)) {
      return { ok: false, reason: "session not authenticated after POST" };
    }
  }

  // The verify call may have rotated the cookie again — use the latest.
  const finalCookie = jar.get("laravel_session") ?? postCookie;

  const now = new Date();
  const expires = new Date(now.getTime() + 110 * 60 * 1000); // 110 min — refresh before the 120 min cookie TTL
  const session: StoredSession = {
    cookie: finalCookie,
    capturedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  await kv.set(KV_KEYS.session, session, { ex: 110 * 60 });
  return { ok: true, session };
}

/**
 * Returns a usable session cookie. Resolution order:
 *   1. The stored session in KV (refreshed by the userscript or a previous
 *      successful auto-login).
 *   2. A static env-var override `LAUNDRYCAT_SESSION_COOKIE`, useful for
 *      one-shot tests where we paste a cookie locally.
 *   3. An auto-login via Playwright — a real Chromium instance navigates
 *      LaundryCat, fills the card number, drives the reCAPTCHA, captures
 *      the resulting cookie. This is the only fully-automated path that
 *      reliably scores high enough on reCAPTCHA Enterprise.
 *   4. (Disabled by default) An auto-login via raw fetch + 2Captcha. Left
 *      in the codebase as a safety net but doesn't currently pass Google's
 *      score threshold; gated behind LAUNDRYCAT_USE_2CAPTCHA=true.
 */
export async function ensureSessionCookie(): Promise<{
  cookie: string | null;
  refreshed: boolean;
  reason?: string;
}> {
  const stored = await kv.get<StoredSession>(KV_KEYS.session);
  if (stored && new Date(stored.expiresAt).getTime() > Date.now() + 60_000) {
    return { cookie: stored.cookie, refreshed: false };
  }

  const envOverride = process.env.LAUNDRYCAT_SESSION_COOKIE;
  if (envOverride) return { cookie: envOverride, refreshed: false };

  // Preferred path: real Chromium via Playwright.
  try {
    const { loginWithPlaywright } = await import("./laundrycat-playwright");
    const playwrightResult = await loginWithPlaywright();
    if (playwrightResult.ok) {
      return { cookie: playwrightResult.session.cookie, refreshed: true };
    }
    // If playwright failed for a non-environment reason, optionally try
    // 2Captcha as a last-ditch fallback (off by default).
    if (process.env.LAUNDRYCAT_USE_2CAPTCHA === "true") {
      const result = await loginToLaundryCat();
      if (result.ok)
        return { cookie: result.session.cookie, refreshed: true };
      return {
        cookie: null,
        refreshed: false,
        reason: `playwright: ${playwrightResult.reason}; 2captcha fallback: ${result.reason}`,
      };
    }
    return {
      cookie: null,
      refreshed: false,
      reason: `playwright: ${playwrightResult.reason}`,
    };
  } catch (err) {
    return {
      cookie: null,
      refreshed: false,
      reason: `playwright import failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
