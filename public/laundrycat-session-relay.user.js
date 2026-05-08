// ==UserScript==
// @name         123 Laundry · LaundryCat session relay
// @namespace    https://123-laundry.com/
// @version      1.0.1
// @description  Captures the laravel_session cookie from www.laundrycat.com and POSTs it to the 123 Laundry website so the homepage can show live machine status.
// @match        https://www.laundrycat.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      localhost
// @connect      123-laundry.com
// @connect      123-laundry.vercel.app
// ==/UserScript==

/* eslint-disable */
(function () {
  "use strict";

  // ---- CONFIG ---------------------------------------------------------------
  // Edit these two lines, then save the script in Tampermonkey:
  //
  //   WEBHOOK_URL: where to POST the session cookie. Use the http://localhost:3000
  //                route while developing locally, or the deployed URL in prod.
  //   INGEST_TOKEN: must match the ADMIN_INGEST_TOKEN env var on the server.
  //
  const WEBHOOK_URL =
    GM_getValue("webhook_url", "http://localhost:3000/api/laundrycat/session");
  const INGEST_TOKEN =
    GM_getValue("ingest_token", "local-dev-admin-token-7c8f9a");

  // Refresh cadence — how often we forward the cookie (LaundryCat itself
  // refreshes the cookie on every interactive request, so as long as you
  // have a tab open we'll keep capturing fresh values).
  const RELAY_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
  // ---------------------------------------------------------------------------

  function readSessionCookie() {
    const m = document.cookie.match(/(?:^|;\s*)laravel_session=([^;]+)/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  }

  function nowHHMM() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }

  function makeBadge() {
    if (document.getElementById("lc-relay-badge")) return;
    const el = document.createElement("div");
    el.id = "lc-relay-badge";
    el.style.cssText = [
      "position:fixed",
      "right:14px",
      "bottom:14px",
      "z-index:2147483647",
      "padding:8px 12px",
      "background:#111",
      "color:#b9e3ec",
      "font:600 12px/1.2 system-ui,-apple-system,sans-serif",
      "border:1px solid #118fab",
      "border-radius:999px",
      "box-shadow:0 6px 18px rgba(0,0,0,.35)",
      "display:flex",
      "gap:8px",
      "align-items:center",
      "cursor:default",
      "user-select:none",
    ].join(";");
    el.textContent = "123 Laundry relay · idle";
    document.body.appendChild(el);
  }

  function setBadge(text, color = "#b9e3ec") {
    const el = document.getElementById("lc-relay-badge");
    if (!el) return;
    el.textContent = "123 Laundry relay · " + text;
    el.style.color = color;
  }

  function relay() {
    const cookie = readSessionCookie();
    if (!cookie) {
      setBadge("not signed in", "#fca5a5");
      return;
    }
    setBadge("sending…", "#fde68a");
    GM_xmlhttpRequest({
      method: "POST",
      url: WEBHOOK_URL,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        "x-ingest-token": INGEST_TOKEN,
      },
      data: JSON.stringify({ cookie, ttlSeconds: 110 * 60 }),
      onload(res) {
        if (res.status >= 200 && res.status < 300) {
          setBadge("synced " + nowHHMM(), "#86efac");
        } else {
          setBadge("server " + res.status + " @ " + nowHHMM(), "#fca5a5");
          // Diagnostic: log the body once to the page console
          try { console.warn("[lc-relay]", res.status, res.responseText); } catch (e) {}
        }
      },
      onerror(err) {
        setBadge("network error @ " + nowHHMM(), "#fca5a5");
        try { console.warn("[lc-relay] network", err); } catch (e) {}
      },
      ontimeout() {
        setBadge("timeout @ " + nowHHMM(), "#fca5a5");
      },
    });
  }

  function start() {
    makeBadge();
    relay();
    setInterval(relay, RELAY_INTERVAL_MS);
  }

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
})();
