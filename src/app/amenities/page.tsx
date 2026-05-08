import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Card,
  Breadcrumbs,
} from "@/components/ui";
import { AMENITIES } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Amenities — What You Get on Every Visit",
  description:
    "Free Wi-Fi, on-site attendants, kids' literacy corner, soft water (Spokane Valley), card-based payment, extra-large washers, and more — at both 123 Laundry locations.",
  alternates: { canonical: "/amenities" },
};

export default function AmenitiesPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Amenities" }]} />
        <SectionEyebrow>Amenities</SectionEyebrow>
        <SectionHeading level={1}>What you get on every visit.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          The little things make laundry day better. Here's what we built into
          both 123 Laundry stores.
        </p>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {AMENITIES.map((a) => (
            <Card key={a.title}>
              <h2 className="font-display text-xl font-bold">{a.title}</h2>
              <p className="mt-3 text-ink/75">{a.body}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
