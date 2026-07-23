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
  title: "Contact 123 Laundry",
  description:
    "Phone (509) 951-8534, Facebook, or Instagram — get in touch with 123 Laundry. Two locations: Deer Park (22 S Vernon Ave) and Spokane Valley (110 S Pines Rd).",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
        <SectionEyebrow>Contact</SectionEyebrow>
        <SectionHeading level={1}>Reach out — we're locals, and we answer.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          Phone is fastest. Social DMs work too. Either way, you'll be talking
          to an owner or one of our on-site attendants — never a call center.
        </p>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <h2 className="font-display text-xl font-bold">Phone</h2>
            <p className="mt-2 text-ink/75">Open every day, both locations.</p>
            <div className="mt-5">
              <Button href={`tel:${BUSINESS.phoneRaw}`}>{BUSINESS.phone}</Button>
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-bold">Facebook</h2>
            <p className="mt-2 text-ink/75">Message us, follow updates, see new photos and promotions.</p>
            <div className="mt-5">
              <Button href={BUSINESS.social.facebook} external>Open Facebook</Button>
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-bold">Instagram</h2>
            <p className="mt-2 text-ink/75">@123laundry_ — daily life inside the laundromat.</p>
            <div className="mt-5">
              <Button href={BUSINESS.social.instagram} external>Open Instagram</Button>
            </div>
          </Card>
        </div>
      </Section>

      <Section className="bg-paper-soft">
        <SectionEyebrow>Drop in</SectionEyebrow>
        <SectionHeading>Either location works.</SectionHeading>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {LOCATION_LIST.map((loc) => (
            <Card key={loc.slug}>
              <h3 className="font-display text-xl font-bold">{loc.name}</h3>
              <p className="mt-2 text-ink/75">{loc.fullAddress}</p>
              <p className="text-ink/75">{loc.hoursLabel}</p>
              <div className="mt-5 flex gap-2">
                <Button href={loc.googleMaps} external>Directions</Button>
                <Button href={`/locations/${loc.slug}`} variant="ghost">Details</Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
