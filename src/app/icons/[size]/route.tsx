import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getLogoMarkLayout } from "@/lib/brand";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const size = sizeParam === "512" ? 512 : 192;
  const l = getLogoMarkLayout(size);

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
    { width: size, height: size }
  );
}
