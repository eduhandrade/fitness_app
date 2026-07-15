import type { NavItem } from "./nav-items";

const PATHS: Record<NavItem["icon"], React.ReactNode> = {
  home: (
    <path d="M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
  ),
  scale: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4l2.6 2.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M8 13.5h2M8 17h2M14 13.5h2M14 17h2" />
    </>
  ),
  dumbbell: (
    <path d="M6.5 9v6M4 10.5v3M17.5 9v6M20 10.5v3M9 12h6M6.5 12h-1M18.5 12h-1" />
  ),
  chart: (
    <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />
  ),
};

export function NavIcon({
  icon,
  className,
}: {
  icon: NavItem["icon"];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[icon]}
    </svg>
  );
}
