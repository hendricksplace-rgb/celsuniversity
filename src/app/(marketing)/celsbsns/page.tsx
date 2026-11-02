import { sitePrices } from "@/components/site/prices-server";
import { createClient } from "@/lib/supabase/server";
import { weekTitle } from "@/lib/bsns";
import CelsBSNSPage from "@/components/site/celsbsns/CelsBSNSPage";

// Title and description: celsu-website-copy.md §2.
export const metadata = {
  title: "CelsBSNS · Inglés de negocios en 10 semanas",
  description: "Inglés para juntas, entrevistas, correos y presentaciones. 10 semanas de práctica real con un proyecto final. Desde $120 USD.",
  alternates: { canonical: "/celsbsns" },
  openGraph: { title: "CelsBSNS · Inglés de negocios en 10 semanas", description: "Inglés para juntas, entrevistas, correos y presentaciones. 10 semanas de práctica real con un proyecto final. Desde $120 USD.", locale: "es_MX", type: "website" },
};

// Week titles change rarely: rebuild the page at most once an hour.
export const revalidate = 3600;

/** The 10 weekly topics, from the course itself (published modules are public). */
async function weekTopics() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("title, sort_order, course:courses!inner(slug)")
    .eq("course.slug", "english-for-business")
    .eq("kind", "lesson_week")
    .eq("status", "published")
    .order("sort_order");
  return (data ?? []).map((m) => weekTitle(m.title));
}

/** How long each plan gives access ("6 meses"), from public.products.access_label. */
async function accessLabels() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("code, access_label").in("code", ["celsbsns_standard", "celsbsns_premium", "bundle_tv_bsns"]).eq("active", true);
  return Object.fromEntries((data ?? []).filter((r) => r.access_label).map((r) => [r.code, r.access_label as string]));
}

export default async function CelsBSNS() {
  const [weeks, prices, access] = await Promise.all([weekTopics(), sitePrices(), accessLabels()]);
  return <CelsBSNSPage weeks={weeks} prices={prices} access={access} />;
}
