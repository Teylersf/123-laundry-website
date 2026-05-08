import type { MetadataRoute } from "next";
import {
  LOCATION_LIST,
  SEO_LANDINGS,
  SERVICE_AREAS,
  SITE_URL,
} from "@/lib/site-data";

const STATIC_PATHS: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, freq: "weekly" },
  { path: "/locations", priority: 0.95, freq: "monthly" },
  { path: "/services", priority: 0.85, freq: "monthly" },
  { path: "/how-it-works", priority: 0.85, freq: "monthly" },
  { path: "/amenities", priority: 0.85, freq: "monthly" },
  { path: "/pricing", priority: 0.7, freq: "monthly" },
  { path: "/about", priority: 0.7, freq: "monthly" },
  { path: "/faq", priority: 0.75, freq: "monthly" },
  { path: "/reviews", priority: 0.7, freq: "monthly" },
  { path: "/contact", priority: 0.85, freq: "monthly" },
  { path: "/check-balance", priority: 0.7, freq: "monthly" },
  { path: "/service-areas", priority: 0.7, freq: "monthly" },
  { path: "/privacy", priority: 0.3, freq: "yearly" },
  { path: "/terms", priority: 0.3, freq: "yearly" },
  { path: "/accessibility", priority: 0.3, freq: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(
    ({ path, priority, freq }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: freq,
      priority,
      images:
        path === "/"
          ? [`${SITE_URL}/images/laundromat-interior-hero.jpg`]
          : undefined,
    }),
  );

  const locationEntries: MetadataRoute.Sitemap = LOCATION_LIST.map((loc) => ({
    url: `${SITE_URL}/locations/${loc.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.95,
    images: [`${SITE_URL}/images/laundromat-interior-hero.jpg`],
  }));

  const seoEntries: MetadataRoute.Sitemap = SEO_LANDINGS.map((p) => ({
    url: `${SITE_URL}/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
    images: [`${SITE_URL}/images/laundromat-interior-hero.jpg`],
  }));

  const areaEntries: MetadataRoute.Sitemap = SERVICE_AREAS.map((a) => ({
    url: `${SITE_URL}/service-areas/${a.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  return [
    ...staticEntries,
    ...locationEntries,
    ...seoEntries,
    ...areaEntries,
  ];
}
