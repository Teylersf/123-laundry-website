import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Breadcrumbs,
} from "@/components/ui";
import { BUSINESS } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for using 123 Laundry's website, laundromat facilities, card system, and text alert service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]} />
        <SectionEyebrow>Terms</SectionEyebrow>
        <SectionHeading level={1}>Terms of Service</SectionHeading>
        <p className="mt-4 text-sm text-ink/60">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </Section>

      <Section>
        <div className="prose mx-auto max-w-3xl text-ink/80">
          <p>
            These Terms of Service ("Terms") govern your use of {BUSINESS.legalName}'s
            websites, laundromat facilities, card system, and any related services
            (collectively, the "Services"). By using the Services you agree to
            these Terms.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Use of facilities</h2>
          <ul className="mt-3 list-disc pl-6">
            <li>Be respectful of other customers and our staff.</li>
            <li>
              Don't leave laundry unattended overnight; we are not responsible
              for items left after closing.
            </li>
            <li>
              Don't wash items that aren't safe for commercial machines (oily
              rags, items soaked in flammable substances, items containing
              foreign objects). Doing so can damage machines and may make you
              liable for repair costs.
            </li>
            <li>
              Pets are not permitted in the laundromat (service animals excepted).
            </li>
            <li>
              Children must be supervised by a responsible adult at all times.
            </li>
          </ul>

          <h2 className="mt-8 font-display text-xl font-bold">Cards &amp; balances</h2>
          <ul className="mt-3 list-disc pl-6">
            <li>
              123 Laundry cards are issued via our LaundryCat partner system.
              Card balances are non-refundable cash-equivalent credit usable
              only at 123 Laundry locations.
            </li>
            <li>
              Lost or stolen cards: report immediately so we can attempt to
              transfer your remaining balance. We can't guarantee balances on
              cards used by another party before you reported the loss.
            </li>
          </ul>

          <h2 className="mt-8 font-display text-xl font-bold">Text alerts</h2>
          <ul className="mt-3 list-disc pl-6">
            <li>Text alerts are an opt-in service.</li>
            <li>
              Standard message and data rates may apply, depending on your
              mobile carrier plan.
            </li>
            <li>Reply STOP to any text to opt out.</li>
            <li>
              Reply HELP for assistance. We never send marketing texts unless
              you opt in separately.
            </li>
          </ul>

          <h2 className="mt-8 font-display text-xl font-bold">Lost or damaged items</h2>
          <p>
            We're a self-service laundromat. You are responsible for selecting
            wash and dry settings, transferring loads between machines, and
            removing items at the end of cycles. We are not responsible for
            shrinkage, color bleeding, or damage caused by user error or by
            items not labeled as machine-washable.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Liability</h2>
          <p>
            To the fullest extent permitted by law, our liability is limited to
            a refund of the price paid for the affected wash or dry cycle. We
            disclaim all other warranties, express or implied.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Governing law</h2>
          <p>
            These Terms are governed by the laws of the State of Washington,
            without regard to conflict of laws principles. Any disputes will be
            resolved in the courts of Spokane County, Washington.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Contact</h2>
          <p>
            {BUSINESS.legalName} · {BUSINESS.phone}
          </p>
        </div>
      </Section>
    </>
  );
}
