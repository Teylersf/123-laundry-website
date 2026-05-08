import type { Metadata } from "next";
import Image from "next/image";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Button,
  Card,
  Breadcrumbs,
} from "@/components/ui";
import { BUSINESS, STORY, LOCATION_LIST } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "About 123 Laundry — Our Story",
  description:
    "123 Laundry is owned and operated by Jake and Katie Duenich. Our flagship store sits in the historic Fackenthall building in Deer Park, WA — and our second store opened in Spokane Valley in December 2025.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "About" }]} />
        <SectionEyebrow>About</SectionEyebrow>
        <SectionHeading level={1}>
          Family-owned. Locally rebuilt. Proudly Eastern Washington.
        </SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          {BUSINESS.name} was founded by {BUSINESS.owners} in {BUSINESS.established},
          starting with our flagship in Jake's hometown of Deer Park and expanding
          to Spokane Valley in December 2025.
        </p>
      </Section>

      <Section>
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <SectionEyebrow>The story</SectionEyebrow>
            <SectionHeading>How we got here.</SectionHeading>
            <div className="prose mt-6 max-w-none text-ink/80">
              <p className="text-ink/80">{STORY.origin}</p>
              <p className="mt-4 text-ink/80">{STORY.founders}</p>
              <p className="mt-4 text-ink/80">{STORY.building}</p>
              <p className="mt-4 text-ink/80">{STORY.community}</p>
              <p className="mt-4 text-ink/80">{STORY.goal}</p>
            </div>
          </div>
          <aside className="md:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-line">
              <Image
                src="/images/laundromat-interior-hero.jpg"
                alt="Inside 123 Laundry — stainless commercial washers and honeycomb LED lighting"
                width={1280}
                height={1280}
                className="h-full w-full object-cover"
              />
            </div>
            <Card className="mt-6">
              <h3 className="font-display text-lg font-bold">By the numbers</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink/75">
                <li><strong>Founded:</strong> {BUSINESS.established}</li>
                <li><strong>Owners:</strong> {BUSINESS.owners}</li>
                <li><strong>Locations:</strong> 2 — Deer Park and Spokane Valley</li>
                <li><strong>Hours:</strong> 7 days a week, 365 days a year</li>
                <li><strong>Renovation time (Deer Park):</strong> 2 months, 4 days</li>
                <li><strong>Building age (Deer Park):</strong> Built 1950s — historic Fackenthall building</li>
              </ul>
            </Card>
          </aside>
        </div>
      </Section>

      <Section className="bg-paper-soft">
        <SectionEyebrow>Locations</SectionEyebrow>
        <SectionHeading>Where to find us.</SectionHeading>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {LOCATION_LIST.map((loc) => (
            <Card key={loc.slug}>
              <h3 className="font-display text-xl font-bold">{loc.name}</h3>
              <p className="mt-2 text-ink/75">{loc.fullAddress}</p>
              <p className="text-ink/75">{loc.hoursLabel}</p>
              <p className="mt-3 text-ink/75">{loc.intro}</p>
              <div className="mt-5">
                <Button href={`/locations/${loc.slug}`}>Visit page</Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
