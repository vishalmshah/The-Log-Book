import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "#9B2D20",
        width: 180,
        height: 180,
        borderRadius: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F8F2E3",
        fontSize: 112,
        fontFamily: "serif",
      }}
    >
      ♩
    </div>
  );
}
