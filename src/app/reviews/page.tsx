import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Card,
  Button,
  Breadcrumbs,
} from "@/components/ui";
import { REVIEW_SOURCES } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Reviews — Read Real Customer Feedback",
  description:
    "We don't put fake testimonials on our website. Read real 123 Laundry reviews — and leave your own — on Google, Facebook, and Yelp.",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Reviews" }]} />
        <SectionEyebrow>Reviews</SectionEyebrow>
        <SectionHeading level={1}>Read real reviews. Leave your own.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          We don't fabricate testimonials. The honest answer to "what do
          customers say?" is on Google, Facebook, and Yelp — and we'd love it
          if you added your two cents.
        </p>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {REVIEW_SOURCES.map((src) => (
            <Card key={src.label}>
              <h2 className="font-display text-lg font-bold">{src.label}</h2>
              <p className="mt-3 text-sm text-ink/75">
                Read what people are saying — or post your own review.
              </p>
              <div className="mt-5">
                <Button href={src.href} external variant="ghost">Open ↗</Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-paper-soft">
        <SectionEyebrow>Owner's note</SectionEyebrow>
        <SectionHeading>Honest feedback makes us better.</SectionHeading>
        <p className="mt-4 max-w-3xl text-ink/75">
          If something wasn't right at either store, please tell us — call
          (509) 951-8534 or message us on Facebook before you leave a review.
          We'd rather fix the problem than have you walk out unhappy.
        </p>
      </Section>
    </>
  );
}
