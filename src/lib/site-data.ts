// All facts in this file are sourced from public reporting on 123 Laundry,
// the business's own website (123-laundry.com), Facebook page, Yelp listing,
// the Deer Park Gazette article (July 2024), and the Inland Northwest Business
// Watch report on the Spokane Valley opening (December 2025). Nothing here is
// invented; if a detail wasn't published, it isn't on the new site either.

export const SITE_URL = "https://123-laundry.com";

export const BUSINESS = {
  name: "123 Laundry",
  legalName: "123 Laundry",
  tagline: "1 — Wash. 2 — Dry. 3 — Fold.",
  shortDescription:
    "A clean, safe, modern laundromat with two locations in Eastern Washington — Deer Park and Spokane Valley. Card-based, family-owned, and built for people who actually like clean laundromats.",
  established: "2024",
  owners: "Jake and Katie Duenich",
  phone: "(509) 951-8534",
  phoneRaw: "+15099518534",
  email: "hello@123-laundry.com",
  social: {
    facebook: "https://www.facebook.com/123LaundryDeerParkWA",
    instagram: "https://www.instagram.com/123laundry_",
  },
  cardBalanceUrl: "https://www.laundrycat.com/",
} as const;

export type LocationSlug = "deer-park" | "spokane-valley";

export type Location = {
  slug: LocationSlug;
  name: string;
  city: string;
  region: string;
  postalCode: string;
  street: string;
  fullAddress: string;
  hoursLabel: string;
  hoursOpenLocal: string;
  hoursCloseLocal: string;
  hoursLastLoad: string;
  openedDate: string;
  openingDateMachine: string; // ISO
  geo: { lat: number; lng: number };
  googleMaps: string;
  appleMaps: string;
  intro: string;
  highlights: string[];
};

export const LOCATIONS: Record<LocationSlug, Location> = {
  "deer-park": {
    slug: "deer-park",
    name: "123 Laundry — Deer Park",
    city: "Deer Park",
    region: "WA",
    postalCode: "99006",
    street: "22 S Vernon Ave",
    fullAddress: "22 S Vernon Ave, Deer Park, WA 99006",
    hoursLabel: "Open daily, 6:00 AM – 9:00 PM",
    hoursOpenLocal: "06:00",
    hoursCloseLocal: "21:00",
    hoursLastLoad: "Last load accepted at 8:00 PM",
    openedDate: "July 2024",
    openingDateMachine: "2024-07-02",
    geo: { lat: 47.9542, lng: -117.4769 },
    googleMaps:
      "https://www.google.com/maps/search/?api=1&query=22+S+Vernon+Ave%2C+Deer+Park%2C+WA+99006",
    appleMaps:
      "https://maps.apple.com/?address=22+S+Vernon+Ave,Deer+Park,WA+99006&q=123+Laundry",
    intro:
      "Our flagship store sits in the historic Fackenthall building in downtown Deer Park — a 1950s tire shop that owner Jake Duenich and his wife Katie reclaimed and rebuilt into the cleanest laundromat in town. Across the street from the Deer Park Post Office.",
    highlights: [
      "Open 6 AM to 9 PM, every single day",
      "Last load goes in at 8 PM, doors close at 9 PM",
      "Small, standard, and extra-large washers",
      "Complete building-wide soft water system",
      "Optional text alerts when your washer or dryer finishes",
      "Live machine status — see which washers and dryers are open",
      "Card-based machines — no quarters, ever",
      "Free Wi-Fi for customers",
      "Clean, on-site customer bathrooms",
      "Kids' literacy corner",
      "Vending: detergent, dryer sheets, snacks, drinks",
      "On-site attendant during most operating hours",
      "Across the street from the Post Office",
    ],
  },
  "spokane-valley": {
    slug: "spokane-valley",
    name: "123 Laundry — Spokane Valley",
    city: "Spokane Valley",
    region: "WA",
    postalCode: "99206",
    street: "110 S Pines Rd",
    fullAddress: "110 S Pines Rd, Spokane Valley, WA 99206",
    hoursLabel: "Open daily, 7:00 AM – 9:00 PM",
    hoursOpenLocal: "07:00",
    hoursCloseLocal: "21:00",
    hoursLastLoad: "Last load accepted at 8:00 PM",
    openedDate: "December 2025",
    openingDateMachine: "2025-12-01",
    geo: { lat: 47.6584, lng: -117.2377 },
    googleMaps:
      "https://www.google.com/maps/search/?api=1&query=110+S+Pines+Rd%2C+Spokane+Valley%2C+WA+99206",
    appleMaps:
      "https://maps.apple.com/?address=110+S+Pines+Rd,Spokane+Valley,WA+99206&q=123+Laundry",
    intro:
      "Our second location opened December 2025 on Pines Road — extra-large washers, 100% soft water throughout the building, and the same modern, family-friendly setup our Deer Park customers have loved since day one.",
    highlights: [
      "Open 7 AM to 9 PM, every single day",
      "Last load goes in at 8 PM, doors close at 9 PM",
      "Small, standard, and extra-large washers",
      "Complete soft water system — every machine in the building",
      "Optional text alerts when your washer or dryer finishes",
      "Live machine status — see which washers and dryers are open",
      "Card-based payment — no quarters, ever",
      "Free Wi-Fi for customers",
      "Clean, on-site customer bathrooms",
      "Kids' literacy corner",
      "Vending: detergent, dryer sheets, snacks, drinks",
      "Easy on/off Pines Road access",
    ],
  },
};

export const LOCATION_LIST: Location[] = [
  LOCATIONS["deer-park"],
  LOCATIONS["spokane-valley"],
];

// Payment methods accepted at the kiosks. The 123 Laundry card is reloadable
// from any of these — cash, EBT, debit/credit, and contactless phone tap pay.
export const PAYMENT_METHODS = [
  {
    name: "Cash",
    blurb: "Bills go straight into the kiosk — no minimum, no card needed at all.",
  },
  {
    name: "EBT",
    blurb: "We accept EBT at the kiosk to load value onto your laundry card.",
  },
  {
    name: "Debit & credit",
    blurb: "Tap, swipe, or insert any major debit or credit card.",
  },
  {
    name: "Phone tap (Apple Pay / Google Pay)",
    blurb: "Hold your phone or smart watch to the kiosk reader and you're done.",
  },
];

// Eight headline features the owner wants front-and-center on the homepage.
// Each is real and verifiable in-store. Keep this list short — it powers the
// hero strip and is the single place to update if a feature changes.
export type Feature = {
  title: string;
  blurb: string;
  icon: FeatureIcon;
};

export type FeatureIcon =
  | "wifi"
  | "bathroom"
  | "kids"
  | "washers"
  | "vending"
  | "soft-water"
  | "text-alerts"
  | "live-status";

export const HEADLINE_FEATURES: Feature[] = [
  {
    title: "Free Wi-Fi",
    blurb: "Fast customer Wi-Fi at both locations.",
    icon: "wifi",
  },
  {
    title: "Clean bathrooms",
    blurb: "On-site, regularly attended, available during open hours.",
    icon: "bathroom",
  },
  {
    title: "Kids' area",
    blurb: "A dedicated literacy corner with books for the little ones.",
    icon: "kids",
  },
  {
    title: "Big & small washers",
    blurb: "From standard daily loads up to extra-large comforter capacity.",
    icon: "washers",
  },
  {
    title: "Vending on-site",
    blurb: "Single-load detergent, dryer sheets, snacks, drinks — all in-store.",
    icon: "vending",
  },
  {
    title: "Complete soft water",
    blurb: "Every washer in both buildings runs through a full soft water system.",
    icon: "soft-water",
  },
  {
    title: "Text when it's done",
    blurb: "Opt in and we'll text you when your washer or dryer finishes.",
    icon: "text-alerts",
  },
  {
    title: "Live machine status",
    blurb: "Check which washers and dryers are open right now from the kiosk or your phone.",
    icon: "live-status",
  },
];

// Longer amenity list for the dedicated /amenities page — keeps the in-depth
// detail (story-style, multi-sentence) separate from the headline grid.
export const AMENITIES = [
  {
    title: "Card-based payment",
    body: "Touch-screen kiosks let you load any amount onto a 123 Laundry card. No quarters required. Reload anytime, in person or online.",
  },
  {
    title: "Free Wi-Fi",
    body: "Customer Wi-Fi at both locations so you can work, scroll, or stream while you wait for the spin cycle.",
  },
  {
    title: "Clean, on-site bathrooms",
    body: "Both locations have customer restrooms, attended throughout the day. Bring the family without worrying.",
  },
  {
    title: "Kids' literacy corner",
    body: "A dedicated space with books for the little ones — laundry day shouldn't feel like punishment for the family.",
  },
  {
    title: "Small and large washers",
    body: "Standard washers for daily loads, plus extra-large capacity machines for comforters, sleeping bags, and king-size duvets. One trip, right-sized for whatever you're doing.",
  },
  {
    title: "Vending on-site",
    body: "Single-load detergent pods, dryer sheets, fabric softener, plus snacks and drinks — everything you forgot at home.",
  },
  {
    title: "Complete soft water system",
    body: "Both 123 Laundry locations run a full soft water system. Every washer in the building is fed treated, softened water — softer fabrics, brighter colors, and noticeably less detergent.",
  },
  {
    title: "Text alerts when your laundry's done",
    body: "Sign up at the kiosk and we'll text you when your washer finishes — and again when your dryer is done. Run errands while your load runs; we'll let you know.",
  },
  {
    title: "Live machine status",
    body: "See which washers and dryers are open or in use, right now, from the in-store kiosk or your phone. No more circling the room with a basket.",
  },
  {
    title: "On-site attendant",
    body: "An attendant is on duty during most operating hours — to help with the card system, answer questions, and keep the place spotless.",
  },
  {
    title: "Bright, modern interior",
    body: "Honeycomb LED lighting, polished concrete, stainless commercial machines, real ventilation. It feels less like a chore and more like a clean café that happens to do laundry.",
  },
  {
    title: "Open every day",
    body: "Both locations are open seven days a week, 365 days a year — including holidays.",
  },
];

export const STORY = {
  origin:
    'The name "123 Laundry" came from the owners\' four-year-old child: 1 — wash, 2 — dry, 3 — fold. It stuck.',
  founders:
    "Jake Duenich is a Deer Park native who spent years on the road as a lineman before coming home to start a business with his wife Katie. They considered opening a laundromat in Branson, Missouri, then circled back to Jake's hometown instead.",
  building:
    "The Deer Park location occupies the old Fackenthall building — a tire store dating back to the 1950s. Jake's general contracting company (JK PNW Investments) rebuilt the space in two months and four days, working alongside Diamondback Electric, Strum, and Gaiser Plumbing. They pulled up multiple layers of flooring, including at least one slab of concrete, and discovered a handwritten receipt stapled to a beam — now framed and on the wall.",
  community:
    "The other half of the Deer Park building hosts a Head Start center, opened in collaboration with Eastern Washington University.",
  goal: 'Jake says the goal is simple: "have the cleanest laundromat in town."',
};

// Reviews/testimonials: do NOT fabricate. We point to the real review sources
// instead and surface a single line that *was* reported in coverage.
export const REVIEW_SOURCES = [
  {
    label: "Google Maps — Deer Park",
    href: "https://www.google.com/maps/search/?api=1&query=123+Laundry+22+S+Vernon+Ave+Deer+Park+WA",
  },
  {
    label: "Google Maps — Spokane Valley",
    href: "https://www.google.com/maps/search/?api=1&query=123+Laundry+110+S+Pines+Rd+Spokane+Valley+WA",
  },
  {
    label: "Yelp — Spokane Valley",
    href: "https://www.yelp.com/biz/123-laundry-spokane-valley",
  },
  {
    label: "Facebook — 123 Laundry",
    href: "https://www.facebook.com/123LaundryDeerParkWA",
  },
];

// Service areas — neighborhoods and nearby towns within driving distance of
// each location. Each entry is a real place; we never claim 123 Laundry has a
// physical presence anywhere except Deer Park and Spokane Valley.
export type ServiceArea = {
  slug: string;
  name: string;
  nearestLocation: LocationSlug;
  driveTime: string;
  blurb: string;
};

export const SERVICE_AREAS: ServiceArea[] = [
  // Spokane Valley side
  {
    slug: "spokane",
    name: "Spokane",
    nearestLocation: "spokane-valley",
    driveTime: "10–15 minutes from downtown Spokane",
    blurb:
      "Spokane residents looking for a modern, card-based laundromat with extra-large machines and free Wi-Fi will find our Pines Road location an easy hop east on I-90.",
  },
  {
    slug: "liberty-lake",
    name: "Liberty Lake",
    nearestLocation: "spokane-valley",
    driveTime: "About 15 minutes west on I-90",
    blurb:
      "Liberty Lake apartments and short-term rental owners use our Spokane Valley location for blanket and comforter loads that won't fit in a standard home washer.",
  },
  {
    slug: "millwood",
    name: "Millwood",
    nearestLocation: "spokane-valley",
    driveTime: "Roughly 5 minutes north",
    blurb:
      "Millwood neighbors are some of our most regular customers — short drive south to Pines, big machines, soft water, in and out.",
  },
  {
    slug: "veradale",
    name: "Veradale",
    nearestLocation: "spokane-valley",
    driveTime: "Under 10 minutes",
    blurb:
      "Veradale is a quick run west on Sprague to our Spokane Valley laundromat. Open 7 AM to 9 PM, every day.",
  },
  {
    slug: "greenacres",
    name: "Greenacres",
    nearestLocation: "spokane-valley",
    driveTime: "10 minutes via Sprague",
    blurb:
      "Greenacres is squarely in our Spokane Valley service area — extra-large washers and 100% soft water on Pines Road.",
  },
  {
    slug: "opportunity",
    name: "Opportunity",
    nearestLocation: "spokane-valley",
    driveTime: "Under 5 minutes",
    blurb:
      "Opportunity residents have the shortest drive of anyone — we're right on Pines Road in the heart of Spokane Valley.",
  },
  {
    slug: "dishman",
    name: "Dishman",
    nearestLocation: "spokane-valley",
    driveTime: "Under 5 minutes east on Sprague",
    blurb:
      "Dishman customers love being a short drive from a clean, well-lit, modern card-based laundromat with on-site attendants.",
  },
  {
    slug: "otis-orchards",
    name: "Otis Orchards",
    nearestLocation: "spokane-valley",
    driveTime: "About 12 minutes via Trent",
    blurb:
      "Otis Orchards regulars come to our Spokane Valley location for the soft water and the extra-large washers.",
  },
  // Deer Park side
  {
    slug: "north-spokane",
    name: "North Spokane",
    nearestLocation: "deer-park",
    driveTime: "About 25 minutes north up US-395",
    blurb:
      "North Spokane neighbors heading toward Mead, Colbert, or Loon Lake regularly stop in at our Deer Park flagship for a bigger, cleaner space than the in-town options.",
  },
  {
    slug: "mead",
    name: "Mead",
    nearestLocation: "deer-park",
    driveTime: "About 15 minutes north on US-395",
    blurb:
      "Mead is a quick drive north to our Deer Park location — open 6 AM to 9 PM, seven days a week.",
  },
  {
    slug: "colbert",
    name: "Colbert",
    nearestLocation: "deer-park",
    driveTime: "10–12 minutes north on US-2",
    blurb:
      "Colbert customers get the same modern setup — card-based machines, attendants, free Wi-Fi — without driving into town.",
  },
  {
    slug: "chattaroy",
    name: "Chattaroy",
    nearestLocation: "deer-park",
    driveTime: "About 8 minutes south",
    blurb:
      "Chattaroy is a short hop down US-2 to the Deer Park flagship.",
  },
  {
    slug: "elk",
    name: "Elk",
    nearestLocation: "deer-park",
    driveTime: "About 15 minutes east via Highway 211",
    blurb:
      "Elk and Camden residents come west to Deer Park for the cleanest laundromat north of Spokane.",
  },
  {
    slug: "loon-lake",
    name: "Loon Lake",
    nearestLocation: "deer-park",
    driveTime: "About 15 minutes west on Highway 292",
    blurb:
      "Loon Lake cabin owners and year-round residents use our Deer Park location for blanket loads, sleeping bags, and full-house weekend laundry runs.",
  },
  {
    slug: "clayton",
    name: "Clayton",
    nearestLocation: "deer-park",
    driveTime: "About 10 minutes north on US-395",
    blurb:
      "Clayton residents are practically next door to our Deer Park flagship.",
  },
  {
    slug: "valley-springdale",
    name: "Valley & Springdale",
    nearestLocation: "deer-park",
    driveTime: "Roughly 25–30 minutes north",
    blurb:
      "Valley and Springdale residents combine a town trip to Deer Park with laundry day at our 22 S Vernon location.",
  },
];

// Things people search for — we make a real, factual page for each.
export type SeoLanding = {
  slug: string;
  h1: string;
  title: string;
  description: string;
  body: string[]; // paragraph strings
  primaryLocation: LocationSlug | "both";
};

export const SEO_LANDINGS: SeoLanding[] = [
  {
    slug: "laundromat-spokane-valley",
    h1: "Laundromat in Spokane Valley, WA",
    title: "Laundromat in Spokane Valley, WA — 123 Laundry on Pines Road",
    description:
      "123 Laundry on Pines Road is a clean, modern, card-based laundromat in Spokane Valley with extra-large washers and 100% soft water. Open 7 AM – 9 PM daily.",
    primaryLocation: "spokane-valley",
    body: [
      "If you're looking for a laundromat in Spokane Valley, our Pines Road location is built for people who actually want a pleasant laundry experience. Bright LED lighting, stainless commercial Huebsch washers and dryers, on-site attendants during most operating hours, and free Wi-Fi.",
      "Every machine in the building runs through a complete soft water system — that means less detergent, softer fabrics, and brighter colors out of the wash. We have extra-large washers that handle comforters, sleeping bags, and king-size duvets in a single load.",
      "Opt in at the kiosk and we'll text you when your washer finishes — and again when your dryer is done. Drop the load, grab a coffee, run an errand. We'll let you know when it's time to come back.",
      "Payment is simple: load any amount onto a 123 Laundry card at our touch-screen kiosk, then tap to start. No quarters, no scrambling for change. Reload your card anytime online or in person.",
      "Open seven days a week, 7 AM to 9 PM. Last load goes in at 8 PM. We're at 110 S Pines Rd, easy on/off from I-90 and Sprague.",
    ],
  },
  {
    slug: "laundromat-deer-park-wa",
    h1: "Laundromat in Deer Park, WA",
    title: "Laundromat in Deer Park, WA — 123 Laundry on S Vernon Ave",
    description:
      "Family-owned 123 Laundry is a modern, card-based laundromat in downtown Deer Park, WA. Open 6 AM – 9 PM every day. 22 S Vernon Ave, across from the Post Office.",
    primaryLocation: "deer-park",
    body: [
      "Our Deer Park flagship is the original 123 Laundry — owner-operated by Jake and Katie Duenich since July 2024, in the historic Fackenthall building at 22 S Vernon Ave.",
      "We rebuilt this 1950s tire shop into the cleanest laundromat in town. Polished surfaces, real ventilation, modern stainless machines, a complete soft water system feeding every washer, and an on-site attendant during most operating hours so you're never on your own.",
      "The card-based system is the easiest part: load any amount onto a 123 Laundry card at our touch-screen kiosk, then tap to start the washer or dryer. No quarters. Free Wi-Fi while you wait, plus a kids' literacy corner if you bring the family.",
      "Opt in at the kiosk and we'll text you when your washer is done — and again when your dryer finishes. Run errands across the street or down Main; come back to a perfectly-timed load.",
      "Open seven days a week, 6 AM to 9 PM. Last load at 8 PM, doors close at 9 PM. Across the street from the Deer Park Post Office.",
    ],
  },
  {
    slug: "laundromat-near-me",
    h1: "Laundromat near me — Eastern Washington",
    title: "Laundromat near me in Spokane County — 123 Laundry",
    description:
      "Two clean, modern, card-based laundromat locations in Spokane County: 123 Laundry Deer Park (6 AM – 9 PM) and Spokane Valley (7 AM – 9 PM). No quarters required.",
    primaryLocation: "both",
    body: [
      "If you're searching for a laundromat near you in Spokane County, you've got two 123 Laundry options: our flagship in downtown Deer Park (22 S Vernon Ave) and our newer Spokane Valley store on Pines Road (110 S Pines Rd).",
      "Both locations run the same playbook — modern stainless commercial machines, a complete soft water system feeding every washer, card-based payment via touch-screen kiosk (no quarters), optional text alerts when your washer or dryer finishes, free customer Wi-Fi, a kids' literacy corner, and an on-site attendant during most operating hours.",
      "Spokane Valley adds extra-large capacity washers built for comforters, blankets, and sleeping bags. Deer Park adds an unbeatable downtown location across from the Post Office and the longer 6 AM opening.",
      "Open every day of the year, including holidays. Pick whichever location is closer and bring your laundry bag.",
    ],
  },
  {
    slug: "self-service-laundromat-spokane",
    h1: "Self-service laundromat in the Spokane area",
    title: "Self-service laundromat in Spokane — 123 Laundry",
    description:
      "Modern, card-based self-service laundromat with two locations near Spokane — 123 Laundry Deer Park and Spokane Valley. Big machines, soft water, free Wi-Fi.",
    primaryLocation: "both",
    body: [
      "123 Laundry is a self-service laundromat. You walk in, load any amount onto a 123 Laundry card at our kiosk, pick a washer, tap, and go. Same with the dryers.",
      "We don't do drop-off wash-dry-fold (yet). What we do is run the cleanest, brightest, most modern self-service space in the area, with attendants on hand to help if you've never used a card system before.",
      "Two locations. Pick the one nearest you: Deer Park (22 S Vernon Ave) or Spokane Valley (110 S Pines Rd).",
    ],
  },
  {
    slug: "large-capacity-washer-spokane-valley",
    h1: "Large-capacity washers in Spokane Valley",
    title: "Large-capacity washer in Spokane Valley — 123 Laundry",
    description:
      "123 Laundry's Spokane Valley location features extra-large commercial washers — perfect for comforters, sleeping bags, blankets, and big family loads.",
    primaryLocation: "spokane-valley",
    body: [
      "Trying to wash a king comforter, a sleeping bag, or a stack of beach towels in a home washer is a fight. Our Spokane Valley laundromat has extra-large commercial washers built for exactly that kind of load.",
      "Every machine in the building runs on 100% soft water — softer fabrics, brighter colors, less detergent.",
      "Open 7 AM to 9 PM every day at 110 S Pines Rd. Last load at 8 PM.",
    ],
  },
  {
    slug: "soft-water-laundromat-spokane-valley",
    h1: "Soft-water laundromat in the Spokane area",
    title: "Soft-water laundromat — 123 Laundry, Deer Park & Spokane Valley",
    description:
      "Every washer at both 123 Laundry locations runs through a complete soft water system — softer fabrics, brighter colors, less detergent. Two stores: Deer Park and Spokane Valley.",
    primaryLocation: "both",
    body: [
      "Hard water is the silent killer of laundry. Mineral deposits dull colors, leave residue on dark clothes, and force you to use more detergent than you should.",
      "We installed a complete soft water system at both 123 Laundry locations — Deer Park and Spokane Valley — because we believe a laundromat should produce a noticeably better wash than your home machine. Every washer in each building is fed treated, softened water.",
      "Pair that with our optional text-when-done alerts and you've got the cleanest, easiest laundry routine in the area: drop the load, leave, get a text when it's done.",
      "Open 6 AM – 9 PM in Deer Park (22 S Vernon Ave) and 7 AM – 9 PM in Spokane Valley (110 S Pines Rd), every single day.",
    ],
  },
  {
    slug: "text-alerts-laundromat-spokane",
    h1: "Get a text when your laundry is done",
    title: "Text alerts for finished loads — 123 Laundry, Spokane area",
    description:
      "Opt in at the kiosk and 123 Laundry will text you when your washer or dryer is done. Two locations: Deer Park and Spokane Valley. Run errands while your load runs.",
    primaryLocation: "both",
    body: [
      "Sitting in a laundromat watching a washer spin is nobody's idea of a great time. We solved that.",
      "Opt in at the kiosk and 123 Laundry will send you a text when your washer finishes — and again when your dryer is done. Drop off your load, walk out the door, and get on with your life. We'll let you know when it's time to come back.",
      "It works at both locations: Deer Park (22 S Vernon Ave, 6 AM – 9 PM) and Spokane Valley (110 S Pines Rd, 7 AM – 9 PM). Free, opt-in, and you can unsubscribe at any time.",
    ],
  },
  {
    slug: "family-friendly-laundromat",
    h1: "Family-friendly laundromat in Spokane County",
    title: "Family-friendly laundromat — 123 Laundry Deer Park & Spokane Valley",
    description:
      "Bring the kids — both 123 Laundry locations have a dedicated kids' literacy corner, free Wi-Fi, and a clean, safe, well-lit interior.",
    primaryLocation: "both",
    body: [
      "Laundry day with kids doesn't have to feel like a punishment. Both 123 Laundry locations include a kids' literacy corner — books, a place to sit — so the little ones have something to do while loads run.",
      "The interior is clean, bright, and well-attended. There's an on-site attendant during most operating hours, and free Wi-Fi for everyone (parents and older kids alike).",
      "Pick whichever location is closer: Deer Park (22 S Vernon Ave) or Spokane Valley (110 S Pines Rd).",
    ],
  },
  {
    slug: "card-laundromat-no-quarters",
    h1: "Card-based laundromat — no quarters required",
    title: "Card-based laundromat (no quarters) — 123 Laundry, Spokane area",
    description:
      "Skip the change machine. 123 Laundry uses touch-screen kiosks and reloadable cards — load any amount, tap to start. Two locations: Deer Park and Spokane Valley.",
    primaryLocation: "both",
    body: [
      "We've never asked a customer for a quarter, and we never will. 123 Laundry runs entirely on a card system: walk in, load any amount onto a 123 Laundry card at our touch-screen kiosk, then tap the card on a washer or dryer to start it.",
      "No fishing for change. No broken coin slots. No hauling around a roll of quarters. The kiosk is roughly as easy to use as an ATM, and our attendants will walk you through it the first time.",
      "Manage and reload your card anytime through our partner LaundryCat — or just come in and top up at the kiosk.",
    ],
  },
];

export const FAQ = [
  {
    q: "Do I need quarters?",
    a: "No. Both 123 Laundry locations are 100% card-based. You'll load any amount onto a reloadable 123 Laundry card at our touch-screen kiosk, then tap your card on a washer or dryer to start it. There are no coin slots in the building.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Our kiosks accept cash, EBT, debit and credit cards, and contactless phone tap pay (Apple Pay and Google Pay). Whatever you have on you, we'll take it — and load it onto your reloadable 123 Laundry card.",
  },
  {
    q: "When are you open?",
    a: "Both locations are open seven days a week, 365 days a year. Deer Park: 6:00 AM – 9:00 PM. Spokane Valley: 7:00 AM – 9:00 PM. Last load at both locations is 8:00 PM; doors close at 9:00 PM.",
  },
  {
    q: "Where are you located?",
    a: "Two locations — Deer Park at 22 S Vernon Ave, WA 99006, and Spokane Valley at 110 S Pines Rd, WA 99206.",
  },
  {
    q: "Is there an attendant on site?",
    a: "Yes — an attendant is on duty during most operating hours at both locations. They can help with the card system, answer questions, and keep the place spotless.",
  },
  {
    q: "Do you offer wash-dry-fold drop-off?",
    a: "Not currently. 123 Laundry is a self-service laundromat. The setup is simple, fast, and built so anyone can get a load done quickly.",
  },
  {
    q: "Do you have free Wi-Fi?",
    a: "Yes. Free customer Wi-Fi at both locations.",
  },
  {
    q: "Can I bring my kids?",
    a: "Please do. Both locations have a small kids' literacy corner with books, plus a clean, bright, well-attended interior so you don't have to worry.",
  },
  {
    q: "Are the machines big enough for a comforter?",
    a: "Yes — especially at Spokane Valley, which features extra-large capacity washers built for comforters, blankets, and sleeping bags.",
  },
  {
    q: "Do you have soft water?",
    a: "Yes — we run a complete soft water system at both locations. Every washer in the building is fed treated, softened water. That means softer fabrics, brighter colors, and noticeably less detergent waste.",
  },
  {
    q: "Will you text me when my laundry is done?",
    a: "Yes — opt in at the kiosk and we'll send you a text when your washer finishes, and another when your dryer finishes. Run errands or grab coffee; we'll let you know when it's time to come back.",
  },
  {
    q: "Can I check which washers are open before I drive over?",
    a: "Yes — we show live machine status on the in-store kiosk and on your phone. You can see which washers and dryers are running, which are open, and how much time is left on the active loads.",
  },
  {
    q: "Are there bathrooms?",
    a: "Yes — both locations have customer restrooms, attended throughout the day. Bring the family.",
  },
  {
    q: "Do you sell detergent in case I forgot mine?",
    a: "Yes — single-load detergent pods, dryer sheets, and fabric softener are stocked in our on-site vending area. We also have snacks and drinks in case you're going to be a while.",
  },
  {
    q: "Are your machines big enough for a comforter or a sleeping bag?",
    a: "Yes. Both locations have a mix of small, standard, and extra-large washers — the extra-large units are sized for comforters, blankets, and sleeping bags. Spokane Valley specifically features high-capacity machines built for those big loads.",
  },
  {
    q: "How do I reload my card?",
    a: "You can reload at our touch-screen kiosks in either store, or online through our card partner LaundryCat (linked from our website).",
  },
  {
    q: "Who owns 123 Laundry?",
    a: "Jake and Katie Duenich. Jake grew up in Deer Park, spent years on the road as a lineman, and came home to start the business with Katie. The name was their four-year-old's idea: 1 — wash, 2 — dry, 3 — fold.",
  },
  {
    q: "How can I get in touch?",
    a: "Phone (509) 951-8534, Facebook (123 Laundry Deer Park WA), or Instagram (@123laundry_).",
  },
];
