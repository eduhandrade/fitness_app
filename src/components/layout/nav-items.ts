export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "chart" | "calendar" | "dumbbell" | "scale" | "bike";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/body", label: "Body", icon: "scale" },
  { href: "/training-plan", label: "Training", icon: "calendar" },
  { href: "/gym", label: "Gym", icon: "dumbbell" },
  { href: "/bike-trainer", label: "Trainer", icon: "bike" },
  { href: "/progress", label: "Progress", icon: "chart" },
];
