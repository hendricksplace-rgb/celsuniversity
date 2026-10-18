// The site's public address and whether search engines may index it. Both come from Vercel env vars, so
// moving from nuevo.celstv.com to celstv.com is an env change plus a redeploy (docs/stripe-live.md has the
// switch-day list):
//   SITE_URL        e.g. https://nuevo.celstv.com, later https://celstv.com. next.config.ts copies it into
//                   NEXT_PUBLIC_SITE_URL at build time so client components get the same value.
//   SITE_INDEXABLE  "true" only once celstv.com serves this app: removes noindex, serves the real
//                   robots.txt and sitemap.xml. Anything else keeps the whole site out of search engines.
// Canonical links, Open Graph images, auth email links and the share text all use SITE_URL. The Edge
// Functions (Stripe success/cancel URLs, email buttons) read their own SITE_URL secret in Supabase.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Server only: the flag is not exposed to the browser. */
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";
