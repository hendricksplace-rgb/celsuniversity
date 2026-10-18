import type { NextConfig } from "next";

// Addresses of the old celstv.com (Gamma) that still get traffic: permanent (308) redirects.
const OLD_SITE: [string, string][] = [
  ["/politica-de-privacidad", "/privacidad"],
  ["/programa-pro-tn", "/celsglobal"],
  ["/app-download", "/"],
  ["/guia-de-progreso", "/evaluacion"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return OLD_SITE.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    return [
      {
        // Only celstv.com is indexed; nuevo.celstv.com and the vercel.app previews are not.
        source: "/:path*",
        missing: [{ type: "host", value: "(www\\.)?celstv\\.com" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
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
