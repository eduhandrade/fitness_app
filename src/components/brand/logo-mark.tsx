import { getLogoMarkLayout } from "@/lib/brand";

export function LogoMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const l = getLogoMarkLayout(size);

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: l.containerRadius,
        background: l.badgeBg,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: l.barTop,
          left: l.topBarLeft,
          width: l.topBarWidth,
          height: l.barThickness,
          borderRadius: l.barRadius,
          background: l.barColor,
        }}
      />
      <span
        style={{
          position: "absolute",
          top: l.barTop,
          left: l.vBarLeft,
          width: l.barThickness,
          height: l.vBarHeight,
          borderRadius: l.barRadius,
          background: l.barColor,
        }}
      />
      <span
        style={{
          position: "absolute",
          top: l.dotTop,
          right: l.dotRight,
          width: l.dotSize,
          height: l.dotSize,
          borderRadius: 999,
          background: l.accentColor,
        }}
      />
    </span>
  );
}
