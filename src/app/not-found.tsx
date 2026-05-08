import Link from "next/link";
import {
  Section,
  SectionEyebrow,
  SectionHeading,
  Button,
} from "@/components/ui";
import { LOCATION_LIST } from "@/lib/site-data";

export default function NotFound() {
  return (
    <Section>
      <SectionEyebrow>404</SectionEyebrow>
      <SectionHeading level={1}>Page not found.</SectionHeading>
      <p className="mt-4 max-w-2xl text-ink/75">
        The page you were looking for has spun off into another cycle. Try one of these:
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/">Home</Button>
        <Button href="/locations" variant="ghost">Locations</Button>
        <Button href="/faq" variant="ghost">FAQ</Button>
        <Button href="/contact" variant="ghost">Contact</Button>
      </div>

      <p className="mt-10 text-sm text-ink/60">Or jump straight to one of our stores:</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {LOCATION_LIST.map((loc) => (
          <li key={loc.slug}>
            <Link
              href={`/locations/${loc.slug}`}
              className="block rounded-2xl border border-line bg-paper-soft p-4 hover:border-brand"
            >
              <div className="font-display font-semibold">{loc.name}</div>
              <div className="text-sm text-ink/70">{loc.fullAddress}</div>
              <div className="text-sm text-ink/70">{loc.hoursLabel}</div>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
