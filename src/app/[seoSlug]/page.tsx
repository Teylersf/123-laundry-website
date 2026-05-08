import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
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
  SEO_LANDINGS,
  SITE_URL,
} from "@/lib/site-data";

export function generateStaticParams() {
  return SEO_LANDINGS.map((p) => ({ seoSlug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata(
  props: { params: Promise<{ seoSlug: string }> },
): Promise<Metadata> {
  const { seoSlug } = await props.params;
  const page = SEO_LANDINGS.find((p) => p.slug === seoSlug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${SITE_URL}/${page.slug}`,
      images: [{ url: "/images/laundromat-interior-hero.jpg" }],
    },
  };
}

export default async function SeoLanding(
  props: { params: Promise<{ seoSlug: string }> },
) {
  const { seoSlug } = await props.params;
  const page = SEO_LANDINGS.find((p) => p.slug === seoSlug);
  if (!page) notFound();

  const featured =
    page.primaryLocation === "both"
      ? null
      : LOCATIONS[page.primaryLocation];

  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: page.h1 }]} />
        <SectionEyebrow>123 Laundry</SectionEyebrow>
        <SectionHeading level={1}>{page.h1}</SectionHeading>
      </Section>

      <Section>
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="prose max-w-none">
              {page.body.map((para, idx) => (
                <p key={idx} className="text-lg text-ink/80 first:mt-0 mt-5">
                  {para}
                </p>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {featured ? (
                <>
                  <Button href={`/locations/${featured.slug}`}>
                    Visit {featured.city}
                  </Button>
                  <Button href={featured.googleMaps} external variant="ghost">
                    Get directions
                  </Button>
                </>
              ) : (
                LOCATION_LIST.map((loc) => (
                  <Button key={loc.slug} href={`/locations/${loc.slug}`}>
                    {loc.city}
                  </Button>
                ))
              )}
              <Button
                href={`tel:${BUSINESS.phoneRaw}`}
                variant="ghost"
              >
                Call {BUSINESS.phone}
              </Button>
            </div>
          </div>

          <aside className="md:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-line">
              <Image
                src="/images/laundromat-interior-hero.jpg"
                alt={`${page.h1} — clean modern interior at 123 Laundry`}
                width={1280}
                height={1280}
                sizes="(max-width: 768px) 100vw, 40vw"
                className="h-full w-full object-cover"
              />
            </div>

            {featured && (
              <Card className="mt-6">
                <h2 className="font-display text-lg font-bold">{featured.name}</h2>
                <p className="mt-2 text-ink/75">{featured.fullAddress}</p>
                <p className="text-ink/75">{featured.hoursLabel}</p>
                <p className="mt-1 text-sm text-ink/60">{featured.hoursLastLoad}</p>
                <div className="mt-5">
                  <Button href={`/locations/${featured.slug}`}>Location details</Button>
                </div>
              </Card>
            )}
          </aside>
        </div>
      </Section>

      <Section className="bg-paper-soft">
        <SectionEyebrow>Both 123 Laundry locations</SectionEyebrow>
        <SectionHeading>One simple promise. Two stores.</SectionHeading>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {LOCATION_LIST.map((loc) => (
            <Card key={loc.slug}>
              <h3 className="font-display text-xl font-bold">{loc.name}</h3>
              <p className="mt-2 text-ink/75">{loc.fullAddress}</p>
              <p className="text-ink/75">{loc.hoursLabel}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href={`/locations/${loc.slug}`}>Details</Button>
                <Button href={loc.googleMaps} external variant="ghost">Directions</Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
