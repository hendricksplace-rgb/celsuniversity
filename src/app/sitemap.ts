import type { MetadataRoute } from "next";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/site";

const PAGES = ["", "/celstv", "/celsbsns", "/celsus", "/celsglobal", "/evaluacion", "/ayuda", "/privacidad", "/terminos"];

/** Empty until SITE_INDEXABLE=true (robots.txt blocks everything then anyway). */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_INDEXABLE) return [];
  return PAGES.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
}
