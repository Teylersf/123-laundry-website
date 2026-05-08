import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Breadcrumbs,
} from "@/components/ui";
import { BUSINESS, LOCATION_LIST } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Accessibility statement for 123 Laundry — what we've built into the website and our physical stores, and how to tell us if something needs to be better.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Accessibility" }]} />
        <SectionEyebrow>Accessibility</SectionEyebrow>
        <SectionHeading level={1}>Accessibility statement</SectionHeading>
      </Section>

      <Section>
        <div className="prose mx-auto max-w-3xl text-ink/80">
          <p>
            123 Laundry is committed to making both our website and our
            physical stores accessible to as many people as possible.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Website</h2>
          <p>
            This site aims to conform to the Web Content Accessibility
            Guidelines (WCAG) 2.1 Level AA. We've focused on:
          </p>
          <ul className="mt-3 list-disc pl-6">
            <li>Sufficient color contrast between text and background.</li>
            <li>Keyboard-navigable menus, buttons, and links with visible focus rings.</li>
            <li>Descriptive alt text on imagery and meaningful link labels.</li>
            <li>Semantic HTML — landmarks, headings, lists — so screen readers can move through pages.</li>
            <li>
              "Skip to main content" link so screen-reader and keyboard users
              don't have to tab through the navigation on every page.
            </li>
            <li>Mobile-friendly layouts that work down to small screens.</li>
          </ul>

          <h2 className="mt-8 font-display text-xl font-bold">In-store</h2>
          <ul className="mt-3 list-disc pl-6">
            <li>
              Both locations have step-free entry from the parking area and
              wide aisles between machines for wheelchair and walker access.
            </li>
            <li>
              On-site attendants during most operating hours can help with
              the kiosk, machine selection, and reading the on-machine
              displays.
            </li>
            <li>
              Bright, even lighting throughout — designed for visibility, not
              ambiance.
            </li>
            <li>
              If a specific accommodation would help (a folding table at a
              different height, help loading a machine, etc.), please call
              ahead at{" "}
              <a href={`tel:${BUSINESS.phoneRaw}`} className="text-brand">
                {BUSINESS.phone}
              </a>{" "}
              and we'll set things up.
            </li>
          </ul>

          <h2 className="mt-8 font-display text-xl font-bold">
            Tell us if something's not working
          </h2>
          <p>
            If you run into a problem on this website, or in either of our
            stores, please let us know. We'll fix it. The fastest way to reach
            us is by phone at{" "}
            <a href={`tel:${BUSINESS.phoneRaw}`} className="text-brand">
              {BUSINESS.phone}
            </a>
            .
          </p>

          <h2 className="mt-8 font-display text-xl font-bold">Visit us</h2>
          <ul className="mt-3 list-disc pl-6">
            {LOCATION_LIST.map((loc) => (
              <li key={loc.slug}>
                <strong>{loc.name}</strong> — {loc.fullAddress} ·{" "}
                {loc.hoursLabel}
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
