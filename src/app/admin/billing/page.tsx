import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import {
  getBillingAccount,
  getSubscription,
  type StripeSubscription,
} from "@/lib/stripe-billing";

export const metadata: Metadata = {
  title: "Billing — 123 Laundry Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusLabel(subscription: StripeSubscription | null) {
  if (!subscription) return "Not set up";
  if (subscription.status === "active") return "Active";
  if (subscription.status === "trialing") return "Trial";
  if (subscription.status === "past_due") return "Payment needs attention";
  if (subscription.status === "canceled") return "Canceled";
  return subscription.status.replaceAll("_", " ");
}

export default async function BillingPage(props: {
  searchParams: Promise<{
    checkout?: string;
    error?: string;
  }>;
}) {
  await requireAdminSessionOrRedirect();
  const params = await props.searchParams;
  const account = await getBillingAccount();
  let subscription: StripeSubscription | null = null;
  if (account?.subscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      subscription = await getSubscription(account.subscriptionId);
    } catch {
      subscription = null;
    }
  }
  const active =
    subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-200">
            123 Laundry service plan
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            Simple, transparent monthly billing
          </h1>
          <p className="mt-2 max-w-2xl text-white/65">
            One automatic Stripe payment covers the website, live machine
            status infrastructure, and ongoing updates.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-200/30 bg-brand-900/50 px-5 py-4 text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-100">
            Monthly total
          </div>
          <div className="font-display text-4xl font-black text-white">
            $26
          </div>
          <div className="text-xs text-white/55">automatically each month</div>
        </div>
      </div>

      {(params.checkout === "cancelled" || params.error) && (
        <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          Checkout was not completed. No charge was made.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-ink-soft p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-200">
                Website care
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">
                Hosting, systems &amp; updates
              </h2>
            </div>
            <div className="font-display text-3xl font-black">$20</div>
          </div>
          <ul className="mt-5 space-y-3 text-sm text-white/70">
            <li>✓ Vercel website hosting and domain management</li>
            <li>✓ Database powering the live machine-status system</li>
            <li>✓ Monitoring and upkeep for the customer-facing website</li>
            <li>
              ✓ Unlimited content updates—text Taylor what needs changing and
              the update is included
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-ink-soft p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-200">
                Infrastructure at cost
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">
                Hetzner virtual machine
              </h2>
            </div>
            <div className="font-display text-3xl font-black">$6</div>
          </div>
          <p className="mt-5 text-sm leading-6 text-white/70">
            This dedicated VM keeps the browser sessions open so the site can
            continually pull current washer and dryer availability.
          </p>
          <div className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
            Passed through at cost. No markup is added to the $6 VM charge.
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold">Subscription</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                active
                  ? "bg-emerald-400/15 text-emerald-200"
                  : "bg-white/10 text-white/60"
              }`}
            >
              {statusLabel(subscription)}
            </span>
          </div>
          <p className="mt-2 text-sm text-white/60">
            Card information is entered and stored securely by Stripe. This
            website never sees or stores the card number.
          </p>
          {subscription?.cancel_at_period_end && (
            <p className="mt-2 text-sm text-amber-200">
              Cancellation is scheduled for the end of the current billing
              period.
            </p>
          )}
        </div>
        <div className="mt-5 flex shrink-0 flex-wrap gap-3 md:mt-0">
          {account?.customerId ? (
            <form action="/admin/billing/portal" method="post">
              <button
                type="submit"
                className="rounded-full border border-brand-200/40 px-5 py-3 font-semibold text-brand-100 hover:border-brand-200 hover:text-white"
              >
                Manage card &amp; subscription
              </button>
            </form>
          ) : (
            <form action="/admin/billing/start-subscription" method="post">
              <button
                type="submit"
                className="rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-600"
              >
                Add card &amp; start $26/month
              </button>
            </form>
          )}
        </div>
      </section>

      <Link
        href="/admin"
        className="inline-flex text-sm font-semibold text-brand-200 hover:text-white"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
