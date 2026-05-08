import type { FeatureIcon } from "@/lib/site-data";

const ICON_PATHS: Record<FeatureIcon, React.ReactNode> = {
  wifi: (
    <>
      <path d="M5 12.55a11 11 0 0 1 14 0" strokeLinecap="round" />
      <path d="M8.5 16.05a6 6 0 0 1 7 0" strokeLinecap="round" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  bathroom: (
    <>
      <path d="M5 11h14v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
      <path d="M7 11V6a2 2 0 1 1 4 0" />
      <path d="M9 18v3M15 18v3" strokeLinecap="round" />
    </>
  ),
  kids: (
    <>
      <path d="M4 19V8l8-4 8 4v11" />
      <path d="M9 19v-6h6v6" />
      <circle cx="12" cy="9" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  washers: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="13" r="5" />
      <circle cx="12" cy="13" r="2" />
      <circle cx="7" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="17" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  vending: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16" />
      <path d="M8 13h2M14 13h2M8 17h2M14 17h2" strokeLinecap="round" />
      <path d="M16 5h2" strokeLinecap="round" />
    </>
  ),
  "soft-water": (
    <>
      <path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z" />
      <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" strokeLinecap="round" />
    </>
  ),
  "text-alerts": (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" strokeLinecap="round" />
      <path d="M16 5l3-2M16 8l4-1M16 11h4" strokeLinecap="round" />
    </>
  ),
  "live-status": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19.5" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-6 w-6",
}: {
  name: FeatureIcon;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
