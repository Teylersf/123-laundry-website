import type { Metadata } from "next";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Card,
  Button,
  Breadcrumbs,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Services — Self-Service Laundry, Big Loads, Soft Water",
  description:
    "123 Laundry is a self-service laundromat. Card-based machines, extra-large washers, soft water in Spokane Valley, free Wi-Fi at both locations.",
  alternates: { canonical: "/services" },
};

const SERVICES = [
  {
    title: "Self-service laundry",
    body: "Walk in, load any amount onto a 123 Laundry card at our touch-screen kiosk, pick a machine, tap to start. No quarters, no app required.",
    href: "/how-it-works",
  },
  {
    title: "Extra-large capacity washers",
    body: "Comforters, sleeping bags, king-sized duvets, big family loads — both locations feature extra-large commercial washers built for one-load wins.",
    href: "/large-capacity-washer-spokane-valley",
  },
  {
    title: "Family-friendly setup",
    body: "Both locations include a kids' literacy corner with books and a clean, bright, well-attended interior. Bring the whole crew.",
    href: "/family-friendly-laundromat",
  },
  {
    title: "Card management & balance check",
    body: "Reload your card in store at the kiosk. Check your balance anytime online through our LaundryCat partner portal.",
    href: "/check-balance",
  },
  {
    title: "On-site attendant assistance",
    body: "An attendant is on duty during most operating hours. They can walk you through the card system, help with machine selection, and keep things spotless.",
    href: "/amenities",
  },
];

export default function ServicesPage() {
  return (
    <>
      <Section className="bg-paper-soft">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Services" }]} />
        <SectionEyebrow>Services</SectionEyebrow>
        <SectionHeading level={1}>Everything we offer.</SectionHeading>
        <p className="mt-6 max-w-3xl text-lg text-ink/75">
          123 Laundry is a self-service laundromat. We don't currently offer
          drop-off wash-dry-fold — what we offer is the cleanest, most modern
          self-service experience in the area.
        </p>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Card key={s.title}>
              <h2 className="font-display text-xl font-bold">{s.title}</h2>
              <p className="mt-3 text-ink/75">{s.body}</p>
              <div className="mt-5">
                <Button href={s.href} variant="ghost">Learn more</Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
