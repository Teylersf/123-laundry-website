import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Button,
  Card,
  Breadcrumbs,
} from "@/components/ui";
import { BUSINESS, PAYMENT_METHODS } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "How It Works — Card-Based Laundromat, No Quarters",
  description:
    "Step-by-step: how the 123 Laundry card system works. Touch-screen kiosks, reloadable cards, tap-to-start washers and dryers. Manage your card via LaundryCat.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  {
    n: "1",
    title: "Walk up to a kiosk",
    body: "Each store has a touch-screen kiosk near the entrance. It's roughly as easy to use as an ATM. The first time, our on-site attendant can walk you through it.",
  },
  {
    n: "2",
    title: "Load any amount onto a card",
    body: "Load whatever amount you'd like onto a 123 Laundry card. The kiosk will issue you a card on the spot — keep it for next time.",
  },
  {
    n: "3",
    title: "Pick a washer, load, then tap your card",
    body: "Choose your washer (regular or extra-large), load your clothes, add detergent, and close the door. Then tap your 123 Laundry card on the reader — the machine starts.",
  },
  {
    n: "4",
    title: "Move to a dryer, then tap your card",
    body: "When the wash cycle is done, transfer your load to a dryer and close the door. Then tap your 123 Laundry card on the reader and choose your dry time. Easy.",
  },
  {
    n: "5",
    title: "Fold and head out",
    body: "Plenty of folding-table space. Bring your basket, fold up, and head out. Whatever balance is left on your card stays there for next time.",
  },
  {
    n: "★",
    title: "Get a text when it's done",
    body: "Opt in at the kiosk and we'll text you when your washer finishes — and again when your dryer is done. Run errands or grab a coffee; we'll let you know when it's time to come back.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "How It Works" }]} />
        <SectionEyebrow>{BUSINESS.tagline}</SectionEyebrow>
        <SectionHeading level={1}>How the card system works.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          123 Laundry is 100% card-based. There are no coin slots in the
          building. Here's exactly what to expect on your first visit.
        </p>
      </Section>

      <Section>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="list-none">
              <Card>
                <div className="font-display text-5xl font-black text-brand">{s.n}</div>
                <h2 className="mt-2 font-display text-xl font-bold">{s.title}</h2>
                <p className="mt-3 text-ink/75">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <SectionEyebrow>Payment</SectionEyebrow>
        <SectionHeading>Cash, EBT, card, or just tap your phone.</SectionHeading>
        <p className="mt-4 max-w-3xl text-ink/75">
          The kiosk doesn't care how you pay — whatever you have on you, we'll
          take it and put it on your laundry card.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PAYMENT_METHODS.map((p) => (
            <li
              key={p.name}
              className="rounded-2xl border border-line bg-paper-soft p-5"
            >
              <div className="font-display text-base font-bold text-brand-700">
                {p.name}
              </div>
              <p className="mt-1 text-sm text-ink/75">{p.blurb}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionEyebrow>Quick tips</SectionEyebrow>
        <SectionHeading>Five things first-timers love to know.</SectionHeading>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {[
            ["You don't have to commit to a big balance.", "The kiosk lets you load whatever amount makes sense for the loads you're doing today."],
            ["Lost cards.", "If you register your Laundry card and lose it, no worries. Enter your phone number to receive a replacement card and keep your remaining balance."],
            ["The card never expires.", "Keep it in your laundry basket for next time. Whatever balance you didn't use is still there."],
            ["Bring detergent or buy on site.", "Use what you love at home, or grab detergent and dryer sheets from our vending area."],
            ["Last load goes in at 8 PM.", "Doors close at 9 PM. Plan your start time around that — no one likes being rushed."],
          ].map(([title, body]) => (
            <Card key={title}>
              <h3 className="font-display text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm text-ink/75">{body}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
