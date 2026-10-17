import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Course media lives in Supabase Storage; YouTube thumbnails for public videos.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
