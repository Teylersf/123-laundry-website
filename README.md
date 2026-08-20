# 123 Laundry — Official Website

Open-source source code for **[123 Laundry](https://123-laundry.com/)**, a family-owned laundromat with two locations in Eastern Washington.

- 🌐 **Live site:** [https://123-laundry.com/](https://123-laundry.com/)
- 📍 **Deer Park:** [22 S Vernon Ave, Deer Park, WA 99006](https://www.google.com/maps/search/?api=1&query=22+S+Vernon+Ave%2C+Deer+Park%2C+WA+99006) · open daily 6 AM – 9 PM
- 📍 **Spokane Valley:** [110 S Pines Rd, Spokane Valley, WA 99206](https://www.google.com/maps/search/?api=1&query=110+S+Pines+Rd%2C+Spokane+Valley%2C+WA+99206) · open daily 7 AM – 9 PM
- ☎️ **Phone:** [(509) 951-8534](tel:+15099518534)
- 📘 **Facebook:** [@123LaundryDeerParkWA](https://www.facebook.com/123LaundryDeerParkWA)
- 📸 **Instagram:** [@123laundry_](https://www.instagram.com/123laundry_)
- 💳 **Card balance:** [LaundryCat](https://www.laundrycat.com/)

123 Laundry is owned and operated by Jake and Katie Duenich. The flagship Deer Park location occupies the historic 1950s Fackenthall building — across the street from the Post Office. The Spokane Valley store opened December 2025 on Pines Road.

> **The name?** It came from the owners' four-year-old: **1 — Wash. 2 — Dry. 3 — Fold.** It stuck.

## What's at each location

Both stores run the same modern, card-based setup:

| Feature | Deer Park | Spokane Valley |
| --- | :---: | :---: |
| Card-based payment, no quarters | ✓ | ✓ |
| Free customer Wi-Fi | ✓ | ✓ |
| On-site customer bathrooms | ✓ | ✓ |
| Kids' literacy corner | ✓ | ✓ |
| On-site vending (detergent, drinks) | ✓ | ✓ |
| Small, standard, and extra-large washers | ✓ | ✓ |
| Complete soft water system | ✓ | ✓ |
| Text alerts when your laundry is done | ✓ | ✓ |
| Live machine-status from your phone | ✓ | ✓ |
| On-site attendant during most operating hours | ✓ | ✓ |
| Open every day of the year | ✓ | ✓ |

## Tech stack

This site is a static-rendered marketing site built for SEO and mobile.

- **[Next.js 16](https://nextjs.org/)** with the App Router (full SSG: 48 prerendered pages)
- **[React 19](https://react.dev/)** + **TypeScript**
- **[Tailwind CSS v4](https://tailwindcss.com/)**
- **[Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3)** (body) + **[Montserrat](https://fonts.google.com/specimen/Montserrat)** (display) via `next/font/google`
- **[Prisma 5.22](https://www.prisma.io/)** + **[Resend](https://resend.com/)** ready for future contact-form / waitlist features
- **Private first-party analytics** stored in PostgreSQL, with bot filtering via
  `isbot` and aggregate browser/device classification via `ua-parser-js`
- JSON-LD `LocalBusiness` schema for both locations, FAQ structured data, programmatic OG image, full XML sitemap, and `robots.txt`

## Website analytics

The customer-facing report lives at `/admin/website-analytics` and uses the
same signed admin session as the machine dashboard. Public page views are sent
to `/api/analytics`; `/admin` traffic and known bots are excluded. The collector
stores random visitor/session IDs and aggregate request metadata, but never raw
IP addresses, raw user-agent strings, names, emails, phone numbers, or LaundryCat
identifiers. No third-party analytics account or reporting credential is needed.

## Admin dashboard loading

`/admin` streams an authenticated shell immediately, then fills independent
live-data cards through short-lived, request-coalescing database reads. The
production Prisma pool intentionally has one connection, so dashboard reads are
serialized inside each warm server instance instead of competing until they
time out. Historical rhythm, usage/risk, and error reports are opt-in and do not
query PostgreSQL until the owner selects the corresponding report button.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (fully static)
npm start        # serve the production build
```

## Project layout

```
src/
├── app/
│   ├── [seoSlug]/                  Dynamic root-level SEO landing pages
│   ├── about/
│   ├── accessibility/
│   ├── amenities/
│   ├── check-balance/              LaundryCat balance lookup
│   ├── contact/
│   ├── faq/
│   ├── how-it-works/
│   ├── locations/
│   │   ├── [slug]/                 Per-location detail pages (SSG)
│   │   └── page.tsx
│   ├── opengraph-image.tsx         Programmatic 1200×630 OG image
│   ├── pricing/
│   ├── privacy/
│   ├── reviews/
│   ├── robots.ts
│   ├── service-areas/
│   │   ├── [slug]/                 Surrounding-town landing pages
│   │   └── page.tsx
│   ├── services/
│   ├── sitemap.ts
│   ├── terms/
│   ├── layout.tsx                  Header, footer, JSON-LD, OG metadata
│   └── page.tsx                    Homepage (hero + 8-feature strip + locations)
├── components/
│   ├── feature-icon.tsx            Inline SVG icons for headline features
│   ├── local-business-jsonld.tsx   Schema.org LocalBusiness JSON-LD
│   ├── site-footer.tsx
│   ├── site-header.tsx             Sticky header with mobile menu
│   └── ui.tsx                      Section, Button, Card, Stat, Pill, Breadcrumbs
└── lib/
    └── site-data.ts                Single source of truth — all facts
```

## Pages

48 statically prerendered pages, including:

- Homepage, About, Locations index, Deer Park location, Spokane Valley location
- Services, How It Works, Amenities, Pricing, FAQ, Reviews, Contact, Check Balance
- 9 SEO landing pages: Spokane Valley laundromat, Deer Park laundromat, near-me, self-service, large-capacity, soft-water, family-friendly, card-no-quarters, text alerts
- Service Areas index + 16 individual community pages (Spokane, Liberty Lake, Mead, Loon Lake, etc.)
- Privacy, Terms of Service, Accessibility statement
- `sitemap.xml`, `robots.txt`, programmatic OpenGraph image

## A note on facts

Every claim on this site is sourced from public reporting on 123 Laundry, the business's own social pages, or directly from owners Jake and Katie Duenich. Nothing is fabricated, including reviews — for those, we link out to Google, Yelp, and Facebook.

## License

Source code is published under the [MIT License](./LICENSE). Brand marks, logos, photography of the stores, and the "123 Laundry" name remain the property of 123 Laundry / its owners.

---

© 123 Laundry · Deer Park & Spokane Valley · Washington
