import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#9B2D20",
        width: 512,
        height: 512,
        borderRadius: 96,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F8F2E3",
        fontSize: 320,
        fontFamily: "serif",
      }}
    >
      ♩
    </div>
  );
}
