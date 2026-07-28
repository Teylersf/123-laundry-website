import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Card,
  Button,
  Breadcrumbs,
} from "@/components/ui";
import { BUSINESS } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Check Card Balance — 123 Laundry on LaundryCat",
  description:
    "Check your 123 Laundry card balance through our LaundryCat partner portal. Card reloads are available in store only.",
  alternates: { canonical: "/check-balance" },
};

export default function CheckBalancePage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Check Card Balance" }]} />
        <SectionEyebrow>Card balance</SectionEyebrow>
        <SectionHeading level={1}>Check your 123 Laundry card balance.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          Open the LaundryCat portal and sign in with the number on the back of
          your laundry card to see your current balance. Card reloads are
          available in store only.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={BUSINESS.cardBalanceUrl} external>
            Open LaundryCat balance portal →
          </Button>
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <div className="font-display text-3xl font-black text-brand">1</div>
            <h2 className="mt-2 font-display text-lg font-bold">Open LaundryCat</h2>
            <p className="mt-2 text-sm text-ink/75">
              Click the link above. LaundryCat is the platform that powers our
              card system and balance lookups.
            </p>
          </Card>
          <Card>
            <div className="font-display text-3xl font-black text-brand">2</div>
            <h2 className="mt-2 font-display text-lg font-bold">Sign in</h2>
            <p className="mt-2 text-sm text-ink/75">
              Use the number on the back of your 123 Laundry card. If you need
              help finding it, ask one of our attendants.
            </p>
          </Card>
          <Card>
            <div className="font-display text-3xl font-black text-brand">3</div>
            <h2 className="mt-2 font-display text-lg font-bold">Check your balance</h2>
            <p className="mt-2 text-sm text-ink/75">
              See your current balance. Card reloads are available in store
              only; online reloads aren't available.
            </p>
          </Card>
        </div>
      </Section>

      <Section className="bg-paper-soft">
        <SectionEyebrow>Trouble signing in?</SectionEyebrow>
        <SectionHeading>We can help.</SectionHeading>
        <p className="mt-4 max-w-3xl text-ink/75">
          If you can't get into LaundryCat, give us a call at{" "}
          <a href={`tel:${BUSINESS.phoneRaw}`} className="text-brand">
            {BUSINESS.phone}
          </a>{" "}
          or stop by either store. Our attendants can confirm your account and
          walk you through it.
        </p>
      </Section>
    </>
  );
}
