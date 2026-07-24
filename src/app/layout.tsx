import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LocalBusinessJsonLd } from "@/components/local-business-jsonld";
import { ChromeGate } from "@/components/chrome-gate";
import { BUSINESS, SITE_URL } from "@/lib/site-data";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BUSINESS.name} — Laundromat in Deer Park & Spokane Valley, WA`,
    template: `%s | ${BUSINESS.name}`,
  },
  description: BUSINESS.shortDescription,
  applicationName: BUSINESS.name,
  authors: [{ name: BUSINESS.legalName }],
  creator: BUSINESS.legalName,
  publisher: BUSINESS.legalName,
  keywords: [
    "laundromat",
    "laundromat near me",
    "Spokane Valley laundromat",
    "Deer Park laundromat",
    "card laundromat",
    "soft water laundromat",
    "extra large washer Spokane",
    "self-service laundry",
    "laundry Pines Road",
    "laundry Vernon Avenue",
    "123 Laundry",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BUSINESS.name,
    locale: "en_US",
    url: SITE_URL,
    title: `${BUSINESS.name} — Laundromat in Deer Park & Spokane Valley, WA`,
    description: BUSINESS.shortDescription,
    images: [
      {
        url: "/images/laundromat-interior-hero.jpg",
        width: 2560,
        height: 2560,
        alt: "123 Laundry — modern, clean laundromat interior with stainless commercial washers and honeycomb LED ceiling lighting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS.name} — Laundromat in Deer Park & Spokane Valley, WA`,
    description: BUSINESS.shortDescription,
    images: ["/images/laundromat-interior-hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: [{ url: "/images/logo.png" }],
  },
  formatDetection: { telephone: true, address: true },
};

export const viewport: Viewport = {
  themeColor: "#118fab",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-[var(--color-brand)] focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <ChromeGate>
          <SiteHeader />
        </ChromeGate>
        <main id="main" className="flex-1">
          {children}
        </main>
        <ChromeGate>
          <SiteFooter />
          <LocalBusinessJsonLd />
        </ChromeGate>
        <Analytics />
      </body>
    </html>
  );
}
