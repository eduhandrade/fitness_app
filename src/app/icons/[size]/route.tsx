import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const size = sizeParam === "512" ? 512 : 192;
  const ring = Math.round(size * 0.5);
  const border = Math.round(size * 0.09);
  const dot = Math.round(size * 0.16);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0c0b",
        }}
      >
        <div
          style={{
            width: ring,
            height: ring,
            borderRadius: 999,
            border: `${border}px solid #3ea86b`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: dot,
              height: dot,
              borderRadius: 999,
              background: "#4fd689",
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
