/**
 * Minimal cookie jar — just enough for the LaundryCat login dance.
 *
 * Browsers and proper jars (tough-cookie etc.) implement RFC 6265 fully.
 * We don't need that. We need to:
 *   - parse every Set-Cookie response into name/value pairs
 *   - keep the latest value for each name
 *   - emit a single Cookie header with name=value pairs
 *
 * undici (Node's fetch) returns Set-Cookie headers via `getSetCookie()`. If
 * that's not available we fall back to splitting the joined string at the
 * RFC-safe comma boundary (a comma followed by exactly one whitespace and
 * a token char that isn't part of `Expires=Day,`).
 */

export type Cookie = { name: string; value: string };

function splitJoinedSetCookie(joined: string): string[] {
  // Boundaries: `, ` followed by `name=` (token) — never the comma inside
  // `Expires=Wed, 09-Jan-2030 ...`.
  const out: string[] = [];
  let i = 0;
  let start = 0;
  while (i < joined.length) {
    if (
      joined[i] === "," &&
      joined[i + 1] === " " &&
      /[A-Za-z0-9!#$%&'*+\-.^_`|~]/.test(joined[i + 2] ?? "") &&
      joined.slice(i + 2, joined.indexOf("=", i + 2)).match(
        /^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/,
      )
    ) {
      out.push(joined.slice(start, i));
      start = i + 2;
      i = start;
      continue;
    }
    i++;
  }
  out.push(joined.slice(start));
  return out;
}

function parseOne(setCookie: string): Cookie | null {
  // First "name=value" wins; everything after the first ; is attributes.
  const semi = setCookie.indexOf(";");
  const head = semi >= 0 ? setCookie.slice(0, semi) : setCookie;
  const eq = head.indexOf("=");
  if (eq <= 0) return null;
  const name = head.slice(0, eq).trim();
  const rawValue = head.slice(eq + 1).trim();
  if (!name) return null;
  return { name, value: rawValue };
}

export class CookieJar {
  private store = new Map<string, string>();

  /** Ingest every Set-Cookie from a fetch response. */
  ingest(res: Response): void {
    type WithGetSetCookie = { getSetCookie?: () => string[] };
    const headers = res.headers as Headers & WithGetSetCookie;
    let raws: string[] = [];
    if (typeof headers.getSetCookie === "function") {
      raws = headers.getSetCookie();
    } else {
      const joined = headers.get("set-cookie");
      if (joined) raws = splitJoinedSetCookie(joined);
    }
    for (const raw of raws) {
      const parsed = parseOne(raw);
      if (!parsed) continue;
      // A Set-Cookie with empty value + Max-Age=0 / past Expires means delete.
      const isDeletion =
        parsed.value === "" ||
        /Max-Age=0/i.test(raw) ||
        /Expires=.*(1970|Thu, 01 Jan 1970)/i.test(raw);
      if (isDeletion) {
        this.store.delete(parsed.name);
      } else {
        this.store.set(parsed.name, parsed.value);
      }
    }
  }

  get(name: string): string | undefined {
    return this.store.get(name);
  }

  /** Render as a Cookie request header. */
  header(): string {
    return [...this.store.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  /** For diagnostics. Never logs the values themselves. */
  describe(): { count: number; names: string[] } {
    return { count: this.store.size, names: [...this.store.keys()] };
  }
}
