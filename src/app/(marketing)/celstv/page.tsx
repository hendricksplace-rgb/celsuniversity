import { createClient } from "@/lib/supabase/server";
import CelsTVBoard, { type Episode } from "@/components/site/celstv/CelsTVBoard";

export const metadata = {
  title: "CelsTV: English for Our Generation · Inglés para la vida",
  description: "Aprende inglés para tu día a día con 32 episodios en video: historias, música y cultura, con flashcards, libro, audio, gramática y quiz en cada episodio. Desde $99 USD.",
  alternates: { canonical: "/celstv" },
  openGraph: {
    title: "CelsTV: English for Our Generation",
    description: "Inglés para la vida en 32 episodios cortos. Desde $99 USD.",
    url: "/celstv",
    locale: "es_MX",
    images: [{ url: "/site/celstv-e.webp", alt: "CelsTV" }],
  },
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
  return <CelsTVBoard episodes={await seasonOne()} />;
}
