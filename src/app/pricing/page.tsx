import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Card,
  Button,
  Breadcrumbs,
} from "@/components/ui";
import { BUSINESS, LOCATION_LIST } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Pricing — How Payment Works at 123 Laundry",
  description:
    "Pricing posted on every machine. Card-based, load any amount, no quarters. Reload your card online via LaundryCat or in person at the kiosk.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Pricing" }]} />
        <SectionEyebrow>Pricing</SectionEyebrow>
        <SectionHeading level={1}>How payment works.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          Pricing is posted clearly on every washer and dryer in both stores.
          Because we run a card-based system instead of coin-op, you only pay
          for the cycle you start — no rounding up to the nearest quarter.
        </p>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="font-display text-xl font-bold">Loading your card</h2>
            <p className="mt-3 text-ink/75">
              Walk up to the touch-screen kiosk near the entrance, insert a
              debit or credit card, and load any amount onto a 123 Laundry
              card. The kiosk issues you a card on the spot.
            </p>
            <p className="mt-3 text-ink/75">
              Cards never expire. Whatever you don't use stays on the card for
              your next visit.
            </p>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-bold">Per-machine pricing</h2>
            <p className="mt-3 text-ink/75">
              Wash and dry pricing is posted on each machine. Larger washers
              cost more than smaller ones (because they hold more), and dryer
              pricing is by time. The kiosk and the machine displays both
              show what a cycle will cost before you start.
            </p>
            <p className="mt-3 text-ink/75">
              For current pricing, drop into either location or call us — our
              attendants are happy to give you a rundown over the phone.
            </p>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-bold">Reloading</h2>
            <p className="mt-3 text-ink/75">
              Reload at any kiosk in either store, or online any time through
              our LaundryCat partner portal — it's the same card you check
              your balance with.
            </p>
            <div className="mt-4">
              <Button href={BUSINESS.cardBalanceUrl} external>Open LaundryCat</Button>
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-bold">No hidden fees</h2>
            <p className="mt-3 text-ink/75">
              The price posted on the machine is what you pay. No add-ons, no
              surcharges, no quarters needed, no apps required.
            </p>
          </Card>
        </div>

        <div className="mt-12 rounded-2xl border border-line bg-paper-soft p-6">
          <h3 className="font-display text-lg font-bold">Want exact prices today?</h3>
          <p className="mt-2 text-ink/75">
            Pricing can change with operating costs and the size class of the
            machine. The fastest way to get today's number is to give us a
            ring or pop in.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href={`tel:${BUSINESS.phoneRaw}`}>Call {BUSINESS.phone}</Button>
            {LOCATION_LIST.map((loc) => (
              <Button key={loc.slug} href={`/locations/${loc.slug}`} variant="ghost">
                {loc.city}
              </Button>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
