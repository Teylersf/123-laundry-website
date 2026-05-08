import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Button,
  Card,
  Breadcrumbs,
} from "@/components/ui";
import {
  BUSINESS,
  LOCATIONS,
  SERVICE_AREAS,
  SITE_URL,
} from "@/lib/site-data";

export function generateStaticParams() {
  return SERVICE_AREAS.map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await props.params;
  const area = SERVICE_AREAS.find((a) => a.slug === slug);
  if (!area) return {};
  const loc = LOCATIONS[area.nearestLocation];
  const title = `Laundromat near ${area.name}, WA — 123 Laundry`;
  const description = `${area.name} residents are just ${area.driveTime} from 123 Laundry at ${loc.fullAddress}. Modern, card-based, soft water, text-when-done alerts.`;
  return {
    title,
    description,
    alternates: { canonical: `/service-areas/${area.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/service-areas/${area.slug}`,
      images: [{ url: "/images/laundromat-interior-hero.jpg" }],
    },
  };
}

export default async function ServiceAreaPage(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const area = SERVICE_AREAS.find((a) => a.slug === slug);
  if (!area) notFound();
  const loc = LOCATIONS[area.nearestLocation];

  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "Service Areas", href: "/service-areas" },
            { label: area.name },
          ]}
        />
        <SectionEyebrow>Serving {area.name}</SectionEyebrow>
        <SectionHeading level={1}>
          Laundromat near {area.name}, WA
        </SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">{area.blurb}</p>
        <p className="mt-4 max-w-3xl text-base text-ink/70">
          {area.name} → {loc.name}: <strong>{area.driveTime}</strong>.
        </p>
      </Section>

      <Section>
        <Card className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Closest 123 Laundry
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold">{loc.name}</h2>
          <p className="mt-2 text-ink/75">{loc.fullAddress}</p>
          <p className="text-ink/75">{loc.hoursLabel}</p>
          <p className="mt-1 text-sm text-ink/60">{loc.hoursLastLoad}</p>
          <ul className="mt-4 grid grid-cols-1 gap-1.5 text-sm text-ink/75 sm:grid-cols-2">
            {loc.highlights.slice(0, 6).map((h) => (
              <li key={h}>· {h}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href={`/locations/${loc.slug}`}>Location details</Button>
            <Button href={loc.googleMaps} external variant="ghost">
              Get directions
            </Button>
            <Button
              href={`tel:${BUSINESS.phoneRaw}`}
              variant="ghost"
            >
              Call {BUSINESS.phone}
            </Button>
          </div>
        </Card>
      </Section>
    </>
  );
}
