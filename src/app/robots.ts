import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/site";

/** The real robots.txt only when SITE_INDEXABLE=true and on SITE_URL's host; everything else is blocked. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  if (!SITE_INDEXABLE || host !== new URL(SITE_URL).host) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/auth", "/comprar", "/bienvenida", "/pago-fallido"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
