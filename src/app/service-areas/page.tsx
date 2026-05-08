import type { Metadata } from "next";
import Link from "next/link";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Card,
  Breadcrumbs,
} from "@/components/ui";
import { LOCATION_LIST, SERVICE_AREAS } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Service Areas — Laundromat Service in Spokane County",
  description:
    "123 Laundry serves communities across Spokane County and the surrounding area — from Spokane Valley to Deer Park, Liberty Lake to Loon Lake.",
  alternates: { canonical: "/service-areas" },
};

export default function ServiceAreasIndex() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Service Areas" }]} />
        <SectionEyebrow>Service areas</SectionEyebrow>
        <SectionHeading level={1}>Where our customers come from.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          Two physical locations, but customers from all over Spokane County
          and the north corridor up to Loon Lake. If you're nearby, we're
          probably an easy drive away.
        </p>
      </Section>

      <Section>
        <div className="grid gap-8 lg:grid-cols-2">
          {LOCATION_LIST.map((loc) => {
            const areas = SERVICE_AREAS.filter(
              (a) => a.nearestLocation === loc.slug,
            );
            return (
              <div key={loc.slug}>
                <h2 className="font-display text-2xl font-bold">
                  Closest to {loc.name}
                </h2>
                <p className="mt-1 text-sm text-ink/70">
                  {loc.fullAddress}
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {areas.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/service-areas/${a.slug}`}
                        className="block rounded-2xl border border-line bg-paper p-4 hover:border-brand"
                      >
                        <div className="font-display font-semibold">
                          {a.name}
                        </div>
                        <div className="text-xs text-ink/60">{a.driveTime}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <Card className="mt-12 max-w-3xl">
          <h2 className="font-display text-xl font-bold">Don't see your town?</h2>
          <p className="mt-2 text-ink/75">
            We don't claim to "serve" anywhere we don't have a building. If
            you're within an hour of either store, you're a customer in our
            book — give us a ring at (509) 951-8534 if you've got a question
            about visiting.
          </p>
        </Card>
      </Section>
    </>
  );
}
