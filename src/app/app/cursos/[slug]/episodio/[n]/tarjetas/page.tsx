import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLangChoice } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { episodePath, loadCoursePage } from "@/lib/course-page";
import { signStorageRefs } from "@/lib/storage";
import { deckAudioRefs, loadEpisodeDecks, starredCount, tracksFromDecks } from "@/lib/celsus-cards";
import { Tarjetas, type Track } from "@/components/celsus/Tarjetas";
import { refreshCardsAudio } from "./actions";

type Props = { params: Promise<{ slug: string; n: string }>; searchParams: Promise<{ examen?: string }> };

const TRACKS = ["A", "B", "C"] as const;

/** CelsUS Part 2, "Tarjetas del examen": the episode's deck for the student's exam track. */
export default async function TarjetasPage({ params, searchParams }: Props) {
  const { slug, n: raw } = await params;
  const { examen } = await searchParams;
  const n = Number(raw);
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=${episodePath(slug, n)}/tarjetas`);

  const page = await loadCoursePage(supabase, viewer.user.id, slug, themeForCourse({ slug }), viewer.isStaff);
  const episode = page?.episodes.find((e) => e.n === n);
  const part = episode?.parts.find((p) => p.role === "cards");
  if (!page || page.layout !== "citizenship" || !episode || !part) notFound();
  if (!(await canAccessCourse(supabase, viewer, page.course.id))) redirect(`/app/cursos/${page.course.slug}`);

  const [{ en, es }, { data: me }, { data: progress }] = await Promise.all([
    loadEpisodeDecks(supabase, part.id),
    supabase.from("profiles").select("civics_track").eq("id", viewer.user.id).maybeSingle(),
    supabase.from("progress").select("flashcard_state").eq("user_id", viewer.user.id).eq("lesson_id", part.id).maybeSingle(),
  ]);
  const decks = tracksFromDecks(en, es);
  const signed = await signStorageRefs(supabase, deckAudioRefs(decks), { courseId: page.course.id, viewer, access: true });
  const track = TRACKS.find((x) => x === me?.civics_track) ?? null;

  // Saved results: { A: { "2": true, … }, B: …, C: … }.
  const state = (progress?.flashcard_state ?? {}) as Record<string, unknown>;
  const saved: Partial<Record<Track, Record<string, boolean>>> = {};
  for (const tr of TRACKS) {
    const v = state[tr];
    if (v && typeof v === "object") saved[tr] = Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === "boolean")) as Record<string, boolean>;
  }

  // "Seguir con …": the next part still to do after this one (track C doesn't need the quiz).
  const parts = episode.parts;
  const at = parts.indexOf(part);
  const after = [...parts.slice(at + 1), ...parts.slice(0, at)].find((p) => !p.done && !(track === "C" && p.role === "quiz"));
  const episodeHref = episodePath(page.course.slug, n);

  return (
    <Tarjetas
      texts={{ es: dictionaries.es.usCards, en: dictionaries.en.usCards }}
      langChoice={await getLangChoice()}
      userId={viewer.user.id}
      track={examen === "1" ? null : track}
      backHref={episodeHref}
      backEpisode={n}
      signed={Object.fromEntries(signed)}
      refreshAudio={refreshCardsAudio.bind(null, page.course.slug, n)}
      mode={{
        kind: "episode",
        episodeN: n,
        partIndex: at + 1,
        partTotal: parts.length,
        courseSlug: page.course.slug,
        lessonId: part.id,
        decks,
        saved,
        starredCount: starredCount(en, es),
        twentyHref: `/app/cursos/${page.course.slug}/mis-20-preguntas?ep=${n}`,
        next: after?.role ? { role: after.role, href: after.href } : null,
      }}
    />
  );
}

export async function generateMetadata() {
  const { t } = await getDictionary();
  return { title: `${t.usCards.title} · CelsU` };
}
