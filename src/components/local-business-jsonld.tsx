import { BUSINESS, LOCATION_LIST, SITE_URL } from "@/lib/site-data";

export function LocalBusinessJsonLd() {
  const branches = LOCATION_LIST.map((loc) => ({
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/locations/${loc.slug}#business`,
    name: loc.name,
    image: `${SITE_URL}/images/laundromat-interior-hero.jpg`,
    url: `${SITE_URL}/locations/${loc.slug}`,
    telephone: BUSINESS.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.street,
      addressLocality: loc.city,
      addressRegion: loc.region,
      postalCode: loc.postalCode,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: loc.geo.lat,
      longitude: loc.geo.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: loc.hoursOpenLocal,
        closes: loc.hoursCloseLocal,
      },
    ],
    priceRange: "$",
    paymentAccepted: "Cash, EBT, debit card, credit card, Apple Pay, Google Pay, Samsung Pay (loaded onto a reloadable 123 Laundry card)",
    currenciesAccepted: "USD",
    sameAs: [BUSINESS.social.facebook, BUSINESS.social.instagram],
    additionalProperty: [
      { "@type": "PropertyValue", name: "Wi-Fi", value: "Free customer Wi-Fi" },
      { "@type": "PropertyValue", name: "Attendant", value: "On site during most hours" },
      ...(loc.slug === "spokane-valley"
        ? [
            { "@type": "PropertyValue", name: "Soft water", value: "100% building-wide soft water" },
            { "@type": "PropertyValue", name: "Capacity", value: "Extra-large washers" },
          ]
        : []),
    ],
  }));

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: BUSINESS.name,
        url: SITE_URL,
        logo: `${SITE_URL}/images/logo.png`,
        foundingDate: BUSINESS.established,
        sameAs: [BUSINESS.social.facebook, BUSINESS.social.instagram],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: BUSINESS.phone,
            contactType: "customer service",
            areaServed: "US-WA",
            availableLanguage: ["English"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: BUSINESS.name,
        publisher: { "@id": `${SITE_URL}#organization` },
        inLanguage: "en-US",
      },
      ...branches,
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
