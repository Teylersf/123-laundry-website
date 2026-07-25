import Link from "next/link";
import { requireAdminSessionOrRedirect } from "@/lib/admin-auth";
import { captureCheckoutSession } from "@/lib/stripe-billing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BillingSuccessPage(props: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  await requireAdminSessionOrRedirect();
  const { session_id: sessionId } = await props.searchParams;
  let complete = false;

  if (sessionId?.startsWith("cs_")) {
    try {
      await captureCheckoutSession(sessionId);
      complete = true;
    } catch {
      complete = false;
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-ink-soft p-6 text-center shadow-xl md:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-2xl text-emerald-200">
        {complete ? "✓" : "!"}
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold">
        {complete ? "Automatic billing is active" : "We could not confirm checkout"}
      </h1>
      <p className="mt-3 text-white/65">
        {complete
          ? "The card is saved securely with Stripe and will be charged $26 each month."
          : "No billing details were saved. Return to Billing and try again."}
      </p>
      <Link
        href="/admin/billing"
        className="mt-7 inline-flex rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-600"
      >
        Return to Billing
      </Link>
    </div>
  );
}
