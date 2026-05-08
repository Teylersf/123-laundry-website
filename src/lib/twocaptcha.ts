/**
 * Tiny 2Captcha client.
 *
 * Why this and not a third-party SDK: 2Captcha's REST surface is two
 * endpoints. A full SDK would pull in needless deps and obscure the polling
 * loop. We keep it simple and explicit.
 *
 * Pricing reference: ~$2 per 1000 solves for reCAPTCHA Enterprise. At one
 * solve every two hours (when our session expires), that's 12 solves/day,
 * 360/month, ~$0.72/month. Well below the $5 minimum top-up.
 *
 * Env vars:
 *   TWOCAPTCHA_API_KEY   — required
 */

const API_BASE = "https://api.2captcha.com";
const POLL_INTERVAL_MS = 5_000;
const MAX_WAIT_MS = 180_000; // 3 min upper bound

type CreateTaskBody = {
  clientKey: string;
  task: Record<string, unknown>;
  softId?: number;
};

type CreateTaskResponse = {
  errorId: number;
  taskId?: number;
  errorCode?: string;
  errorDescription?: string;
};

type GetTaskResultResponse = {
  errorId: number;
  status?: "processing" | "ready";
  solution?: { gRecaptchaResponse?: string; token?: string };
  cost?: string;
  errorCode?: string;
  errorDescription?: string;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`2Captcha ${path} HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export type RecaptchaTaskInput = {
  /** Page where reCAPTCHA is rendered (e.g. https://www.laundrycat.com/) */
  websiteURL: string;
  /** data-sitekey from the .g-recaptcha element. */
  websiteKey: string;
  /** True for reCAPTCHA Enterprise. */
  isEnterprise?: boolean;
  /** v3-style action, if the site provides one (Enterprise often does). */
  pageAction?: string;
  /** v3 score threshold; default 0.7. */
  minScore?: number;
};

export async function solveRecaptcha(
  input: RecaptchaTaskInput,
): Promise<string> {
  const apiKey = process.env.TWOCAPTCHA_API_KEY;
  if (!apiKey) throw new Error("TWOCAPTCHA_API_KEY is not set");

  const taskType = input.isEnterprise
    ? "RecaptchaV2EnterpriseTaskProxyless"
    : "RecaptchaV2TaskProxyless";

  const task: Record<string, unknown> = {
    type: taskType,
    websiteURL: input.websiteURL,
    websiteKey: input.websiteKey,
  };
  if (input.pageAction) task.enterprisePayload = { action: input.pageAction };
  if (input.isEnterprise && input.minScore) task.minScore = input.minScore;

  const create = await postJson<CreateTaskResponse>("/createTask", {
    clientKey: apiKey,
    task,
    softId: 0,
  } satisfies CreateTaskBody);

  if (create.errorId !== 0 || !create.taskId) {
    throw new Error(
      `2Captcha createTask failed: ${
        create.errorDescription ?? create.errorCode ?? "unknown"
      }`,
    );
  }

  const taskId = create.taskId;
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const result = await postJson<GetTaskResultResponse>("/getTaskResult", {
      clientKey: apiKey,
      taskId,
    });
    if (result.errorId !== 0) {
      throw new Error(
        `2Captcha getTaskResult failed: ${
          result.errorDescription ?? result.errorCode ?? "unknown"
        }`,
      );
    }
    if (result.status === "ready" && result.solution) {
      const tok =
        result.solution.gRecaptchaResponse ?? result.solution.token;
      if (tok) return tok;
      throw new Error("2Captcha returned ready with no solution token");
    }
    // status === "processing" — keep polling
  }
  throw new Error("2Captcha solve timed out after 3 minutes");
}
