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
import { LiveMachineStatus } from "@/components/live-machine-status";
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
        <address className="mt-4 not-italic">
          <a
            href={loc.googleMaps}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Get directions to ${loc.name} at ${loc.fullAddress}`}
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-base font-semibold text-brand-800 shadow-sm transition hover:border-brand hover:bg-brand-100 sm:text-lg"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5 shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>{loc.fullAddress}</span>
          </a>
        </address>
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
          <Button href="#live-status" variant="ghost">
            Live machine status ↓
          </Button>
        </div>
      </Section>

      {/* LIVE MACHINE STATUS — scoped to this location only */}
      <div id="live-status" className="scroll-mt-20">
        <LiveMachineStatus
          slug={loc.slug}
          heading={`What's open at ${loc.city} right now.`}
          subheading={`Live status of every washer and dryer at ${loc.name}. Updates every minute.`}
        />
      </div>

      <Section>
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-line">
              <img
                src={
                  loc.slug === "deer-park"
                    ? "/images/washer-row.jpg"
                    : "/images/laundromat-interior-hero.jpg"
                }
                alt={`Inside ${loc.name} — modern stainless commercial laundry machines`}
                width={1280}
                height={1280}
                loading="lazy"
                decoding="async"
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
              <h2 className="font-display text-xl font-bold">What&apos;s here</h2>
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
