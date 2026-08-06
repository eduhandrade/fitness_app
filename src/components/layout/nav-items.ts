export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "chart" | "calendar" | "dumbbell" | "scale" | "bike" | "activity" | "settings" | "user";
};

/** Always visible, thumb-reachable — kept short on purpose (see MENU_ITEMS
 * for the rest, tucked behind the "more" menu). */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/body", label: "Body", icon: "scale" },
  { href: "/training-plan", label: "Training", icon: "calendar" },
  { href: "/gym", label: "Gym", icon: "dumbbell" },
];

/** Reached via the "more" menu trigger (top-right, both mobile and
 * desktop) instead of taking a primary nav slot. */
export const MENU_ITEMS: NavItem[] = [
  { href: "/progress", label: "Progress", icon: "chart" },
  { href: "/bike-trainer", label: "Trainer", icon: "bike" },
  { href: "/activities", label: "Activities", icon: "activity" },
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/settings", label: "Settings", icon: "settings" },
];
