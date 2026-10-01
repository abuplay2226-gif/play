import { ImageResponse } from "next/og";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 105,
          background: "linear-gradient(to bottom right, #fbbf24, #f97316)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#020817",
          fontWeight: 900,
          borderRadius: "44px",
          border: "4px solid rgba(255,255,255,0.2)",
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}