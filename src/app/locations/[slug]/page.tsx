import type { Metadata } from "next";
import Image from "next/image";
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
  LOCATION_LIST,
  SITE_URL,
  type LocationSlug,
} from "@/lib/site-data";

export function generateStaticParams() {
  return LOCATION_LIST.map((loc) => ({ slug: loc.slug }));
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await props.params;
  const loc = LOCATIONS[slug as LocationSlug];
  if (!loc) return {};
  const title = `${loc.name} — Laundromat in ${loc.city}, ${loc.region}`;
  const description = `Visit ${loc.name} at ${loc.fullAddress}. ${loc.hoursLabel}. Card-based, modern, family-friendly laundromat in ${loc.city}, ${loc.region}.`;
  return {
    title,
    description,
    alternates: { canonical: `/locations/${loc.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/locations/${loc.slug}`,
      images: [{ url: "/images/laundromat-interior-hero.jpg", width: 2560, height: 2560 }],
    },
  };
}

export default async function LocationPage(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const loc = LOCATIONS[slug as LocationSlug];
  if (!loc) notFound();

  const other = LOCATION_LIST.find((l) => l.slug !== loc.slug)!;

  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: loc.name,
    image: `${SITE_URL}/images/laundromat-interior-hero.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.street,
      addressLocality: loc.city,
      addressRegion: loc.region,
      postalCode: loc.postalCode,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: loc.geo.lat,
      longitude: loc.geo.lng,
    },
    telephone: BUSINESS.phone,
    url: `${SITE_URL}/locations/${loc.slug}`,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: loc.hoursOpenLocal,
        closes: loc.hoursCloseLocal,
      },
    ],
    priceRange: "$",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />

      <Section className="bg-paper-soft">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "Locations", href: "/locations" },
            { label: loc.city },
          ]}
        />
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-brand">
          {loc.city}, {loc.region} · open since {loc.openedDate}
        </p>
        <SectionHeading level={1} className="mt-2">
          {loc.name}
        </SectionHeading>
        <p className="mt-5 max-w-3xl text-lg text-ink/75">{loc.intro}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button href={loc.googleMaps} external>
            Get directions
          </Button>
          <Button href={`tel:${BUSINESS.phoneRaw}`} variant="ghost">
            Call {BUSINESS.phone}
          </Button>
          <Button href={BUSINESS.cardBalanceUrl} external variant="ghost">
            Check card balance
          </Button>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-line">
              <Image
                src={
                  loc.slug === "deer-park"
                    ? "/images/washer-row.jpg"
                    : "/images/laundromat-interior-hero.jpg"
                }
                alt={`Inside ${loc.name} — modern stainless commercial laundry machines`}
                width={1280}
                height={1280}
                sizes="(max-width: 768px) 100vw, 60vw"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <aside className="md:col-span-5">
            <Card>
              <h2 className="font-display text-xl font-bold">Visit us</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-ink/60">Address</dt>
                  <dd className="font-medium">{loc.fullAddress}</dd>
                </div>
                <div>
                  <dt className="text-ink/60">Hours</dt>
                  <dd className="font-medium">{loc.hoursLabel}</dd>
                  <dd className="text-ink/70">{loc.hoursLastLoad}</dd>
                </div>
                <div>
                  <dt className="text-ink/60">Phone</dt>
                  <dd>
                    <a href={`tel:${BUSINESS.phoneRaw}`} className="font-medium text-brand">
                      {BUSINESS.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-ink/60">Payment</dt>
                  <dd className="font-medium">
                    Cash, EBT, debit/credit, or phone tap pay — all load onto a reloadable 123 Laundry card
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button href={loc.googleMaps} external>
                  Google Maps
                </Button>
                <Button href={loc.appleMaps} external variant="ghost">
                  Apple Maps
                </Button>
              </div>
            </Card>

            <Card className="mt-5">
              <h2 className="font-display text-xl font-bold">What's here</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink/80">
                {loc.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span aria-hidden="true" className="text-brand">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </Section>

      <Section>
        <SectionEyebrow>The other location</SectionEyebrow>
        <SectionHeading>Closer to {other.city}? Visit our other store.</SectionHeading>
        <Card className="mt-8 max-w-2xl">
          <h3 className="font-display text-xl font-bold">{other.name}</h3>
          <p className="mt-2 text-ink/75">{other.fullAddress}</p>
          <p className="text-ink/75">{other.hoursLabel}</p>
          <div className="mt-5">
            <Button href={`/locations/${other.slug}`}>Visit {other.city}</Button>
          </div>
        </Card>
      </Section>
    </>
  );
}
