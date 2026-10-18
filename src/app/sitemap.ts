import type { MetadataRoute } from "next";

const PAGES = ["", "/celstv", "/celsbsns", "/celsus", "/celsglobal", "/evaluacion", "/ayuda", "/privacidad", "/terminos"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: `https://celstv.com${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
}
