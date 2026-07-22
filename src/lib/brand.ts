/** Geometry for the Trivo "T" badge mark, shared between the in-app
 * <LogoMark> component and the satori-rendered favicon/PWA icon routes so
 * both stay pixel-consistent at any size. The badge itself is a fixed
 * dark chip (brand-invariant, doesn't follow the light/dark toggle) with
 * a bold T glyph plus a small accent dot. */
export function getLogoMarkLayout(size: number) {
  const barThickness = Math.round(size * 0.16);
  return {
    badgeBg: "#0a0c0b",
    barColor: "#4fd689",
    accentColor: "#8ff0b7",
    containerRadius: Math.round(size * 0.28),
    barThickness,
    barRadius: Math.round(barThickness * 0.4),
    topBarWidth: Math.round(size * 0.58),
    topBarLeft: Math.round(size * 0.21),
    vBarHeight: Math.round(size * 0.56),
    vBarLeft: Math.round(size * 0.42),
    barTop: Math.round(size * 0.22),
    dotSize: Math.round(size * 0.11),
    dotTop: Math.round(size * 0.14),
    dotRight: Math.round(size * 0.12),
  };
}
