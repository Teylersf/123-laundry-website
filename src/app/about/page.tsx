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
import { ABOUT_COPY, LOCATION_LIST } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "About 123 Laundry — Our Story",
  description:
    "Established in 2024, 123 Laundry is a clean, safe, modern laundromat with two locations in Eastern Washington — Deer Park and Spokane Valley.",
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
      </Section>

      <Section>
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-7">
            <SectionEyebrow>The story</SectionEyebrow>
            <SectionHeading>How we got here.</SectionHeading>
            <div className="mt-6 space-y-4 text-ink/80">
              {ABOUT_COPY.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
          </div>
          <aside className="md:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-line">
              <Image
                src="/images/laundromat-interior-hero.jpg"
                alt="Inside 123 Laundry — stainless commercial washers and honeycomb LED lighting"
                width={1280}
                height={1280}
                sizes="(max-width: 768px) 100vw, 40vw"
                className="h-full w-full object-cover"
              />
            </div>
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
