import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "practice.",
    short_name: "practice.",
    description: "Track your daily music practice sessions",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#DDD3B0",
    theme_color: "#9B2D20",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.png",       sizes: "any",    type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
