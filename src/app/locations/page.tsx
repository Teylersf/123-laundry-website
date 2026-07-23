import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Button,
  Card,
  Breadcrumbs,
} from "@/components/ui";
import { BUSINESS, LOCATION_LIST } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Our Locations — Deer Park & Spokane Valley, WA",
  description:
    "123 Laundry has two locations in Eastern Washington — Deer Park (22 S Vernon Ave) and Spokane Valley (110 S Pines Rd). Both are open seven days a week.",
  alternates: { canonical: "/locations" },
};

export default function LocationsIndex() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Locations" }]} />
        <SectionEyebrow>Locations</SectionEyebrow>
        <SectionHeading level={1}>Two stores. One promise.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          Pick the location closer to you. Both run the same modern setup with
          on-site attendants.
        </p>
      </Section>

      <Section>
        <div className="grid gap-8 md:grid-cols-2">
          {LOCATION_LIST.map((loc) => (
            <Card key={loc.slug}>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                {loc.city}, {loc.region} · since {loc.openedDate}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">
                {loc.name}
              </h2>
              <p className="mt-2 text-ink/80">{loc.intro}</p>

              <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ink/60">Address</dt>
                  <dd className="font-medium">{loc.fullAddress}</dd>
                </div>
                <div>
                  <dt className="text-ink/60">Hours</dt>
                  <dd className="font-medium">{loc.hoursLabel}</dd>
                </div>
                <div>
                  <dt className="text-ink/60">Last load</dt>
                  <dd className="font-medium">{loc.hoursLastLoad}</dd>
                </div>
                <div>
                  <dt className="text-ink/60">Phone</dt>
                  <dd>
                    <a href={`tel:${BUSINESS.phoneRaw}`} className="font-medium text-brand">
                      {BUSINESS.phone}
                    </a>
                  </dd>
                </div>
              </dl>

              <ul className="mt-5 grid grid-cols-1 gap-1.5 text-sm text-ink/75 sm:grid-cols-2">
                {loc.highlights.slice(0, 6).map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button href={`/locations/${loc.slug}`}>Location details</Button>
                <Button href={loc.googleMaps} external variant="ghost">
                  Get directions
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
