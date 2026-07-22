import { ImageResponse } from "next/og";
import { getLogoMarkLayout } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const l = getLogoMarkLayout(180);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          background: l.badgeBg,
        }}
      >
        <div
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
        <div
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
        <div
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
      </div>
    ),
    { ...size }
  );
}
