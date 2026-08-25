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
  bike: (
    <>
      <circle cx="5.5" cy="17.5" r="3.3" />
      <circle cx="18.2" cy="17.5" r="3.3" />
      <path d="M5.5 17.5 10 8h4M18.2 17.5 13 9.5M8.7 13h6" />
    </>
  ),
  activity: (
    <path d="M3 12h4l2.5 7L14 5l2.5 7H21" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.97 7.97 0 0 0 0-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3.5h-4l-.3 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.97 7.97 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 2.6h4l.3-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-3.8 4.3-6 7.5-6s6.3 2.2 7.5 6" />
    </>
  ),
  apple: (
    <>
      <path d="M12 8c-1.6-1.3-3.7-1.7-5.3-.5-2.4 1.8-2.8 5.7-1 8.8 1.4 2.4 3.2 4.2 4.8 4.2.9 0 1.3-.3 1.5-.3.2 0 .6.3 1.5.3 1.6 0 3.4-1.8 4.8-4.2 1.8-3.1 1.4-7-1-8.8-1.6-1.2-3.7-.8-5.3.5Z" />
      <path d="M12 8c0-1.8.9-3.2 2.3-4" />
    </>
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
