import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest: makes CelsU installable as a web app (Android, desktop; iOS uses the
// apple-touch-icon and the meta tags in the root layout).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CelsU",
    short_name: "CelsU",
    lang: "es",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#F7F5FA",
    theme_color: "#F5178C",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
