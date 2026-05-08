import Link from "next/link";
import Image from "next/image";
import { BUSINESS, LOCATION_LIST } from "@/lib/site-data";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-line bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 md:grid-cols-12 md:px-6">
        <div className="md:col-span-4">
          <Link href="/" aria-label="123 Laundry — home" className="inline-block">
            <Image
              src="/images/logo.png"
              alt="123 Laundry logo"
              width={180}
              height={108}
              className="h-14 w-auto"
            />
          </Link>
          <p className="mt-4 max-w-sm text-sm text-paper/80">
            Family-owned, Eastern Washington laundromat with two locations: Deer
            Park and Spokane Valley. Modern, card-based, and built for people
            who actually like clean laundromats.
          </p>
          <p className="mt-4 text-sm text-paper/70">
            <a
              href={`tel:${BUSINESS.phoneRaw}`}
              className="font-semibold text-paper hover:text-brand-200"
            >
              {BUSINESS.phone}
            </a>
          </p>
          <div className="mt-4 flex items-center gap-3">
            <a
              href={BUSINESS.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="123 Laundry on Facebook"
              className="rounded-full border border-paper/20 p-2 text-paper hover:border-brand-200 hover:text-brand-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07 1.86 17.1 5.55 21.27 10.36 22v-7.04H7.83v-2.89h2.53V9.85c0-2.5 1.49-3.88 3.77-3.88 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.89h-2.34V22C18.31 21.27 22 17.1 22 12.07z"/>
              </svg>
            </a>
            <a
              href={BUSINESS.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="123 Laundry on Instagram"
              className="rounded-full border border-paper/20 p-2 text-paper hover:border-brand-200 hover:text-brand-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.32 4.14.6c-.79.31-1.46.72-2.13 1.39A5.86 5.86 0 0 0 .6 4.13c-.28.76-.47 1.64-.53 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.25 2.15.53 2.91.31.79.72 1.46 1.39 2.13.67.67 1.34 1.08 2.13 1.39.76.28 1.64.47 2.91.53C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.25 2.91-.53.79-.31 1.46-.72 2.13-1.39.67-.67 1.08-1.34 1.39-2.13.28-.76.47-1.64.53-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.25-2.15-.53-2.91A5.86 5.86 0 0 0 21.86 2c-.67-.67-1.34-1.08-2.13-1.39-.76-.28-1.64-.47-2.91-.53C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.4-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z"/>
              </svg>
            </a>
          </div>
        </div>

        <div className="md:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-paper/70">
            Locations
          </h2>
          <ul className="mt-3 space-y-3 text-sm">
            {LOCATION_LIST.map((loc) => (
              <li key={loc.slug}>
                <Link
                  href={`/locations/${loc.slug}`}
                  className="block hover:text-brand-200"
                >
                  <span className="font-semibold text-paper">{loc.name}</span>
                  <span className="block text-paper/70">{loc.fullAddress}</span>
                  <span className="block text-paper/70">{loc.hoursLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-paper/70">
            Visit
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/" className="hover:text-brand-200">Home</Link></li>
            <li><Link href="/about" className="hover:text-brand-200">About</Link></li>
            <li><Link href="/locations" className="hover:text-brand-200">Locations</Link></li>
            <li><Link href="/services" className="hover:text-brand-200">Services</Link></li>
            <li><Link href="/how-it-works" className="hover:text-brand-200">How It Works</Link></li>
            <li><Link href="/amenities" className="hover:text-brand-200">Amenities</Link></li>
            <li><Link href="/check-balance" className="hover:text-brand-200">Check Balance</Link></li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-paper/70">
            Help
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/faq" className="hover:text-brand-200">FAQ</Link></li>
            <li><Link href="/pricing" className="hover:text-brand-200">Pricing</Link></li>
            <li><Link href="/reviews" className="hover:text-brand-200">Reviews</Link></li>
            <li><Link href="/contact" className="hover:text-brand-200">Contact</Link></li>
            <li><Link href="/service-areas" className="hover:text-brand-200">Service Areas</Link></li>
            <li><Link href="/privacy" className="hover:text-brand-200">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-brand-200">Terms of Service</Link></li>
            <li><Link href="/accessibility" className="hover:text-brand-200">Accessibility</Link></li>
            <li><Link href="/sitemap.xml" className="hover:text-brand-200">Sitemap</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-paper/60 md:flex-row md:items-center md:px-6">
          <p>
            © {year} {BUSINESS.legalName}. All rights reserved. Owned and
            operated by {BUSINESS.owners}, Deer Park, Washington.
          </p>
          <p>
            Card management powered by{" "}
            <a
              href={BUSINESS.cardBalanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-4 hover:text-brand-200"
            >
              LaundryCat
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
