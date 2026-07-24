import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Breadcrumbs,
} from "@/components/ui";
import { BUSINESS } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How 123 Laundry collects, uses, and protects information when you use our website, our LaundryCat-powered card system, and our text alert service.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
        <SectionEyebrow>Privacy</SectionEyebrow>
        <SectionHeading level={1}>Privacy Policy</SectionHeading>
        <p className="mt-4 text-sm text-ink/60">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </Section>

      <Section>
        <div className="prose mx-auto max-w-3xl text-ink/80">
          <p>
            {BUSINESS.legalName} ("we", "us", "our") respects your privacy.
            This Privacy Policy explains what information we collect when you
            visit our website, use our laundromat services, and use our card
            and text-alert systems.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">
            What we collect
          </h2>
          <ul className="mt-3 list-disc pl-6">
            <li>
              <strong>Information you give us at the kiosk.</strong> Email,
              optional name, optional mobile phone number for text alerts, and
              card-balance information. Card account management is handled by
              our partner LaundryCat.
            </li>
            <li>
              <strong>Usage data on this website.</strong> Standard server
              logs (IP address, browser, page URL) used for security, error
              tracking, and traffic analysis.
            </li>
            <li>
              <strong>Text alert data.</strong> If you opt in, your phone
              number is used solely to send laundromat status messages
              (washer done, dryer done, balance reminders). Reply STOP to
              opt out at any time.
            </li>
          </ul>

          <h2 className="mt-8 font-display text-xl font-bold">
            How we use it
          </h2>
          <ul className="mt-3 list-disc pl-6">
            <li>To run your card, accept payments, and send your text alerts.</li>
            <li>To answer questions and follow up on customer service issues.</li>
            <li>To improve the site and our service.</li>
          </ul>

          <h2 className="mt-8 font-display text-xl font-bold">
            What we don't do
          </h2>
          <ul className="mt-3 list-disc pl-6">
            <li>We do not sell your data.</li>
            <li>We do not send marketing texts unless you specifically opt in.</li>
            <li>We do not share your phone number with third parties for marketing.</li>
          </ul>

          <h2 className="mt-8 font-display text-xl font-bold">Cookies</h2>
          <p>
            Our website may use cookies for basic functionality (e.g., remembering
            navigation state) and aggregate analytics. You can disable cookies in
            your browser; the site will still work.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Children</h2>
          <p>
            We don't knowingly collect personal information from children under 13.
            If you believe a child has provided us information, contact us and
            we'll delete it.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Your choices</h2>
          <p>
            You can ask us what information we have on file, request a correction,
            or ask us to delete your account by calling{" "}
            <a href={`tel:${BUSINESS.phoneRaw}`} className="text-brand">
              {BUSINESS.phone}
            </a>
            .
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Changes</h2>
          <p>
            If we change this policy, we'll update the "last updated" date at
            the top of this page.
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
