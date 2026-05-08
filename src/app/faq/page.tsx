import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Breadcrumbs,
} from "@/components/ui";
import { FAQ, SITE_URL } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "FAQ — Common Questions About 123 Laundry",
  description:
    "Hours, payment, kids, soft water, attendants, card balance — answers to the questions we hear most often at 123 Laundry's Deer Park and Spokane Valley locations.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
    url: `${SITE_URL}/faq`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
        <SectionEyebrow>FAQ</SectionEyebrow>
        <SectionHeading level={1}>Common questions.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          The short answers to the things we get asked most. Don't see your
          question? Call us at (509) 951-8534 or message us on Facebook.
        </p>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-line bg-paper p-5 open:shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-base font-semibold">
                <span>{item.q}</span>
                <span aria-hidden="true" className="text-brand transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-ink/80">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
