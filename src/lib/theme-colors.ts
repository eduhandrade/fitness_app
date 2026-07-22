import type { Theme } from "@/components/theme/theme-provider";

/** Literal hex values for chart chrome (grid/axis/tooltip), mirroring the
 * CSS custom properties in globals.css. Recharts/SVG props need real
 * color strings rather than CSS variables, so this stays in sync by hand
 * with the two palettes defined there. */
export const CHART_COLORS: Record<
  Theme,
  {
    grid: string;
    axis: string;
    tooltipBg: string;
    tooltipBorder: string;
    tooltipText: string;
    cursor: string;
    foreground: string;
    primary: string;
  }
> = {
  dark: {
    grid: "#232b25",
    axis: "#8a968c",
    tooltipBg: "#121613",
    tooltipBorder: "#232b25",
    tooltipText: "#e9ede9",
    cursor: "#182019",
    foreground: "#e9ede9",
    primary: "#3ea86b",
  },
  light: {
    grid: "#dde4dc",
    axis: "#5c6a60",
    tooltipBg: "#ffffff",
    tooltipBorder: "#dde4dc",
    tooltipText: "#161d17",
    cursor: "#eef1ec",
    foreground: "#161d17",
    primary: "#2f8f58",
  },
};
