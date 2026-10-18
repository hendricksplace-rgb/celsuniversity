import type { NextConfig } from "next";

// Addresses of the old celstv.com (Gamma) that still get traffic: permanent (308) redirects.
const OLD_SITE: [string, string][] = [
  ["/politica-de-privacidad", "/privacidad"],
  ["/programa-pro-tn", "/celsglobal"],
  ["/app-download", "/"],
  ["/guia-de-progreso", "/evaluacion"],
];

// The public address (src/lib/site.ts). Vercel: SITE_URL (an older NEXT_PUBLIC_SITE_URL still works); else the
// project's production domain.
const SITE_URL = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");
const SITE_HOST = new URL(SITE_URL).hostname.replace(/[.]/g, "\\.");
// Search engines only once SITE_INDEXABLE=true, and then only on SITE_URL's host (not the vercel.app previews).
const INDEXABLE = process.env.SITE_INDEXABLE === "true";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_SITE_URL: SITE_URL },
  async redirects() {
    return OLD_SITE.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    return [
      INDEXABLE
        ? { source: "/:path*", missing: [{ type: "host" as const, value: SITE_HOST }], headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }
        : { source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        // Nobody may frame CelsU pages (clickjacking on the admin and account pages).
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  images: {
    // Course media lives in Supabase Storage; YouTube thumbnails for public videos.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
