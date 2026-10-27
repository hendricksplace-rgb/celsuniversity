// Part 6 of a CelsUS episode, "Quiz del episodio N" (/app/cursos/<slug>/episodio/<n>/quiz): the CelsBook's
// ebooks.quiz in the Repaso design. Done-state: the episode's quiz lesson in progress (status 'completed',
// quiz_score / quiz_max_score), recorded by record_lesson_progress like every part.
import { notFound } from "next/navigation";
import type { UsBack } from "@/components/celsus/BackButtons";
import type { createClient } from "@/lib/supabase/server";
import type { Episode } from "@/lib/course-page";
import { collectStorageRefs, signStorageRefs } from "@/lib/storage";
import { Repaso, type RepasoItem, type Track } from "./Repaso";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function CelsusQuizRoute({
  supabase,
  viewer,
  courseId,
  courseSlug,
  episode,
  back,
}: {
  supabase: Client;
  viewer: { user: { id: string }; isStaff: boolean };
  courseId: string;
  courseSlug: string;
  episode: Episode;
  back?: UsBack;
}) {
  const [{ data: ebook }, { data: me }, { data: prefs }] = await Promise.all([
    // RLS: published books in courses the student can open.
    supabase.from("ebooks").select("slug, quiz, screens").eq("slug", `celsus-celsbook-episode-${episode.n}`).maybeSingle(),
    supabase.from("profiles").select("civics_track").eq("id", viewer.user.id).maybeSingle(),
    supabase.from("user_preferences").select("sound_effects").eq("user_id", viewer.user.id).maybeSingle(),
  ]);
  const items = (Array.isArray(ebook?.quiz) ? ebook.quiz : []) as unknown as RepasoItem[];
  if (!ebook || !items.length) notFound();
  const signed = await signStorageRefs(supabase, collectStorageRefs(items.map((q) => [q.audio_en, q.audio_es])), { courseId, viewer });
  const screens = (Array.isArray(ebook.screens) ? ebook.screens : []) as { id: string; title: string }[];
  const role = (r: string) => episode.parts.find((p) => p.role === r);
  const track = (["A", "B", "C"] as const).find((t) => t === me?.civics_track) ?? null;
  return (
      <Repaso
        signed={Object.fromEntries(signed)}
        items={items}
        episodeN={episode.n}
        track={track as Track}
        screens={screens.map((s) => ({ id: s.id, title: s.title }))}
        bookHref={`/app/libros/${ebook.slug}`}
        episodeHref={`/app/cursos/${courseSlug}/episodio/${episode.n}`}
        courseSlug={courseSlug}
        lessonId={role("quiz")?.id ?? null}
        videoHref={role("video")?.href ?? null}
        // "Practicar mis 20 preguntas": the 65/20 deck of all 20 starred questions.
        starredHref={`/app/cursos/${courseSlug}/mis-20-preguntas?ep=${episode.n}`}
        userId={viewer.user.id}
        sound={prefs?.sound_effects ?? true}
        back={back}
      />
  );
}
