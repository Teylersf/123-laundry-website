import { kv, KV_KEYS } from "./kv";

const STRIPE_API = "https://api.stripe.com/v1";

export type BillingAccount = {
  customerId: string;
  subscriptionId: string;
  checkoutSessionId: string;
  email?: string;
  updatedAt: string;
};

export type StripeSubscription = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
};

type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  customer?: string | { id: string } | null;
  customer_details?: { email?: string | null } | null;
  subscription?: string | StripeSubscription | null;
  payment_status?: string;
  status?: string;
};

type StripePortalSession = {
  url: string;
};

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return key;
}

async function stripeRequest<T>(
  path: string,
  options?: { method?: "GET" | "POST"; body?: URLSearchParams },
): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(options?.body
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: options?.body,
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Stripe request failed.");
  }
  return payload as T;
}

export async function getBillingAccount(): Promise<BillingAccount | null> {
  return kv.get<BillingAccount>(KV_KEYS.billingAccount);
}

export async function createCheckoutSession(
  successUrl: string,
  cancelUrl: string,
): Promise<StripeCheckoutSession> {
  const account = await getBillingAccount();
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("client_reference_id", "123-laundry");
  body.set("payment_method_types[0]", "card");
  body.set("billing_address_collection", "auto");
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", "2600");
  body.set("line_items[0][price_data][recurring][interval]", "month");
  body.set(
    "line_items[0][price_data][product_data][name]",
    "123 Laundry website care & live machine status",
  );
  body.set(
    "line_items[0][price_data][product_data][description]",
    "$20 website hosting, domain, database and ongoing updates + $6 Hetzner VM at cost with no markup.",
  );
  body.set("subscription_data[metadata][site]", "123-laundry.com");
  body.set("subscription_data[metadata][monthly_total]", "$26");
  body.set("metadata[site]", "123-laundry.com");
  if (account?.customerId) {
    body.set("customer", account.customerId);
  }

  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", {
    method: "POST",
    body,
  });
}

export async function captureCheckoutSession(
  sessionId: string,
): Promise<BillingAccount> {
  const session = await stripeRequest<StripeCheckoutSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
  );
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId || !subscriptionId || session.status !== "complete") {
    throw new Error("Stripe Checkout has not completed.");
  }

  const account: BillingAccount = {
    customerId,
    subscriptionId,
    checkoutSessionId: session.id,
    email: session.customer_details?.email ?? undefined,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(KV_KEYS.billingAccount, account);
  return account;
}

export async function getSubscription(
  subscriptionId: string,
): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<StripePortalSession> {
  const body = new URLSearchParams({
    customer: customerId,
    return_url: returnUrl,
  });
  return stripeRequest<StripePortalSession>("/billing_portal/sessions", {
    method: "POST",
    body,
  });
}
