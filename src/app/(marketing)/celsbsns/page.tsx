import { sitePrices } from "@/components/site/prices-server";
import { createClient } from "@/lib/supabase/server";
import { weekTitle } from "@/lib/bsns";
import CelsBSNSBoard from "@/components/site/celsbsns/CelsBSNSBoard";

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

export default async function CelsBSNSPage() {
  return <CelsBSNSBoard weeks={await weekTopics()} prices={await sitePrices()} />;
}
