import { sitePrices } from "@/components/site/prices-server";
import { createClient } from "@/lib/supabase/server";
import CelsTVBoard, { type Episode } from "@/components/site/celstv/CelsTVBoard";

// Title and description: celsu-website-copy.md §2.
export const metadata = {
  title: "CelsTV · Aprende inglés con una serie de TV",
  description: "32 episodios con historias reales, tarjetas, libro interactivo, audio y quiz. Aprende inglés para la vida diaria a tu ritmo, desde $99 USD con 1 año de acceso.",
  alternates: { canonical: "/celstv" },
  openGraph: { title: "CelsTV · Aprende inglés con una serie de TV", description: "32 episodios con historias reales, tarjetas, libro interactivo, audio y quiz. Aprende inglés para la vida diaria a tu ritmo, desde $99 USD con 1 año de acceso.", locale: "es_MX", type: "website", images: [{ url: "/og/celstv.png", width: 1200, height: 630 }] },
};

// Episode titles and artwork change rarely: rebuild the page at most once an hour.
export const revalidate = 3600;

/** The 32 episodes of Season 1 (published modules are readable without signing in). */
async function seasonOne(): Promise<Episode[]> {
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id").eq("slug", "celstv-english-for-our-generation").maybeSingle();
  if (!course) return [];
  const { data } = await supabase
    .from("modules")
    .select("title, artwork_url")
    .eq("course_id", course.id)
    .eq("kind", "lesson_week")
    .eq("status", "published")
    .order("sort_order")
    .limit(32);
  return (data ?? []).map((m) => ({
    // "Episode 6: Let's eat" → "Let's eat"
    title: m.title.replace(/^Episode\s*\d+\s*[:–-]\s*/i, "").trim() || m.title,
    // Only public images go on the public site.
    art: m.artwork_url && /^https:\/\/.*\/storage\/v1\/object\/public\//.test(m.artwork_url) ? m.artwork_url : null,
  }));
}

export default async function CelsTVPage() {
  return <CelsTVBoard episodes={await seasonOne()} prices={await sitePrices()} />;
}
