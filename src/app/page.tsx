import Image from "next/image";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Button,
  Card,
  Stat,
  Pill,
} from "@/components/ui";
import { Icon } from "@/components/feature-icon";
import {
  AMENITIES,
  BUSINESS,
  FAQ,
  HEADLINE_FEATURES,
  LOCATION_LIST,
  REVIEW_SOURCES,
} from "@/lib/site-data";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="absolute inset-0">
          <Image
            src="/images/laundromat-interior-hero.jpg"
            alt="Inside 123 Laundry — a clean, modern laundromat with stainless commercial washers and honeycomb LED ceiling lighting"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-linear-to-b from-ink/60 via-ink/50 to-ink/85" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-32">
          <Pill>Locally owned · Deer Park &amp; Spokane Valley</Pill>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            The cleanest laundromat
            <span className="block text-brand-200">in town.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-paper/80 md:text-xl">
            123 Laundry is a family-owned, modern, card-based laundromat with
            two locations in Eastern Washington. {BUSINESS.tagline}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/locations">Find a location</Button>
            <Button href="/how-it-works" variant="ghost" className="border-paper/30 text-paper hover:border-brand-200 hover:text-brand-200">
              How the card system works
            </Button>
            <Button href={BUSINESS.cardBalanceUrl} external variant="ghost" className="border-paper/30 text-paper hover:border-brand-200 hover:text-brand-200">
              Check card balance →
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 md:max-w-3xl md:grid-cols-4">
            <Stat value="2" label="Locations" />
            <Stat value="365" label="Days a year, open" />
            <Stat value="0" label="Quarters required" />
            <Stat value="100%" label="Soft water, every machine" />
          </div>
          <p className="mt-6 max-w-2xl text-sm text-paper/70">
            Bonus: opt in at the kiosk and we'll <strong className="text-brand-100">text you when your washer or dryer finishes</strong>. Run errands while your load runs.
          </p>
        </div>
      </section>

      {/* OWNER-PRIORITY FEATURE STRIP — must stay above the fold-ish */}
      <section
        aria-label="Headline amenities"
        className="border-y border-line bg-paper-soft"
      >
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                What you get every visit
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight md:text-3xl">
                Eight reasons people drive past three other laundromats to come here.
              </h2>
            </div>
            <Link
              href="/amenities"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Full amenities list →
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {HEADLINE_FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-line bg-paper p-4 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md md:p-5"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <Icon name={f.icon} className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-base font-bold leading-snug">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink/70">{f.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LOCATIONS */}
      <Section>
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <SectionEyebrow>Two locations</SectionEyebrow>
            <SectionHeading>Pick the one closer to you.</SectionHeading>
            <p className="mt-4 max-w-md text-ink/70">
              Both stores run the same modern, card-based setup with on-site
              attendants, free Wi-Fi, and a kids' literacy corner. Spokane
              Valley adds 100% soft water and extra-large washers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/locations">All locations</Button>
              <Button href="/contact" variant="ghost">Contact us</Button>
            </div>
          </div>
          <div className="grid gap-6 md:col-span-7 md:grid-cols-2">
            {LOCATION_LIST.map((loc) => (
              <Card key={loc.slug} className="flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  {loc.city}, {loc.region}
                </p>
                <h3 className="mt-2 font-display text-xl font-bold">
                  {loc.name}
                </h3>
                <p className="mt-2 text-ink/70">{loc.fullAddress}</p>
                <p className="mt-1 text-ink/70">{loc.hoursLabel}</p>
                <p className="mt-1 text-sm text-ink/60">{loc.hoursLastLoad}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm">
                  <Link
                    href={`/locations/${loc.slug}`}
                    className="rounded-full bg-brand px-3.5 py-1.5 font-semibold text-white hover:bg-brand-600"
                  >
                    Details
                  </Link>
                  <a
                    href={loc.googleMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-line px-3.5 py-1.5 font-semibold text-ink hover:border-brand hover:text-brand"
                  >
                    Directions
                  </a>
                  <a
                    href={`tel:${BUSINESS.phoneRaw}`}
                    className="rounded-full border border-line px-3.5 py-1.5 font-semibold text-ink hover:border-brand hover:text-brand"
                  >
                    Call
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS — 1-2-3 strip, on brand */}
      <Section className="bg-brand text-paper">
        <SectionEyebrow>
          <span className="text-brand-100">{BUSINESS.tagline}</span>
        </SectionEyebrow>
        <SectionHeading className="text-paper">
          As easy as it sounds.
        </SectionHeading>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              n: "1",
              title: "Wash",
              body: "Walk up to a touch-screen kiosk, load any amount onto a 123 Laundry card, then tap the card on a washer to start. No quarters. No app required.",
            },
            {
              n: "2",
              title: "Dry",
              body: "Move your load to a dryer, tap your card, choose your dry time. The big stainless dryers are gentle on fabrics and quick to finish.",
            },
            {
              n: "3",
              title: "Fold",
              body: "Plenty of folding-table space and bright, even lighting. Fold up, head out, and use the leftover balance on your card next visit.",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-paper/15 bg-paper/5 p-6 backdrop-blur-sm"
            >
              <div className="font-display text-5xl font-black text-brand-100">
                {step.n}
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold">
                {step.title}
              </h3>
              <p className="mt-3 text-paper/85">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button
            href={BUSINESS.cardBalanceUrl}
            external
            variant="secondary"
            className="bg-paper text-brand hover:bg-brand-100"
          >
            Check your card balance
          </Button>
          <Button
            href="/how-it-works"
            variant="ghost"
            className="border-paper/40 text-paper hover:border-paper hover:text-paper"
          >
            More about the card system
          </Button>
        </div>
      </Section>

      {/* WHY 123 LAUNDRY */}
      <Section>
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <SectionEyebrow>Why 123 Laundry</SectionEyebrow>
            <SectionHeading>
              A laundromat that doesn't feel like a chore.
            </SectionHeading>
            <p className="mt-4 text-ink/75">
              We rebuilt a 1950s tire shop in downtown Deer Park into the
              cleanest laundromat in town — and we ran the same playbook for
              our second store on Pines Road in Spokane Valley. Stainless
              commercial Huebsch machines, polished concrete, real ventilation,
              honeycomb LED lighting, on-site attendants.
            </p>
            <p className="mt-4 text-ink/75">
              Built for the way people actually use a laundromat: quick,
              friendly, family-tolerant, and clean enough that you'd happily
              wait inside instead of running errands.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/about">Read our story</Button>
              <Button href="/amenities" variant="ghost">All amenities</Button>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-line">
              <Image
                src="/images/washer-row.jpg"
                alt="A long row of stainless commercial front-load washers at 123 Laundry"
                width={1280}
                height={1707}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* DEEPER AMENITY DETAILS — under-the-fold, longer-form */}
      <Section className="bg-paper-soft">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <SectionEyebrow>The full list</SectionEyebrow>
            <SectionHeading>Every amenity, in detail.</SectionHeading>
          </div>
          <Button href="/amenities" variant="ghost">
            Open amenities page
          </Button>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AMENITIES.slice(0, 9).map((a) => (
            <Card key={a.title}>
              <div className="font-display text-lg font-bold">{a.title}</div>
              <p className="mt-2 text-sm text-ink/70">{a.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* REVIEWS — link out, never fabricate */}
      <Section>
        <SectionEyebrow>Reviews</SectionEyebrow>
        <SectionHeading>Read what real customers are saying.</SectionHeading>
        <p className="mt-4 max-w-2xl text-ink/70">
          We don't put fake testimonials on our website. Read real reviews — and
          leave us one too — on Google, Facebook, and Yelp.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REVIEW_SOURCES.map((src) => (
            <li key={src.label}>
              <a
                href={src.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-line bg-paper p-5 hover:border-brand hover:text-brand"
              >
                <span className="font-display text-base font-semibold">
                  {src.label} ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      {/* FAQ teaser */}
      <Section className="bg-paper-soft">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <SectionEyebrow>FAQ</SectionEyebrow>
            <SectionHeading>The short answers.</SectionHeading>
            <p className="mt-4 text-ink/70">
              First time at a card-based laundromat? We've got you. Here are
              the questions we get most often. The full list lives on our{" "}
              <Link href="/faq" className="text-brand underline decoration-dotted underline-offset-4">
                FAQ page
              </Link>
              .
            </p>
          </div>
          <div className="md:col-span-7">
            <div className="space-y-4">
              {FAQ.slice(0, 5).map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-line bg-paper p-5 open:shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-base font-semibold">
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="text-brand transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-ink/75">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="bg-ink text-paper">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <SectionHeading className="text-paper">
              Bring us your laundry.
            </SectionHeading>
            <p className="mt-2 text-paper/80">
              Open every day. {BUSINESS.phone} ·{" "}
              <Link href="/locations" className="underline decoration-dotted underline-offset-4 hover:text-brand-200">
                find a location
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/locations/deer-park">Deer Park</Button>
            <Button href="/locations/spokane-valley">Spokane Valley</Button>
          </div>
        </div>
      </Section>
    </>
  );
}
