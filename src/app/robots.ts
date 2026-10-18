import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/** celstv.com is indexed (minus the student area); any other host (nuevo.celstv.com, previews) is not. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  if (!/^(www\.)?celstv\.com$/.test(host)) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/auth", "/comprar", "/bienvenida", "/pago-fallido"] },
    sitemap: "https://celstv.com/sitemap.xml",
  };
}
