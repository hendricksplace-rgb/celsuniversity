// CelsUS episode status for the end screens: which of the 6 parts are done, the next one, and where the
// completion screen lives. Every part's finish flow can ask it whether the episode is now complete
// (see afterPartFinished in app/app/cursos/[slug]/episodio/[n]/terminado/actions.ts).
import type { createClient } from "@/lib/supabase/server";
import { episodePath, loadCoursePage, type Part, type UsRole } from "@/lib/course-page";
import { themeForCourse } from "@/lib/themes";

type Client = Awaited<ReturnType<typeof createClient>>;

export const ROLE_LABEL: Record<UsRole, { icon: string; name: string; long: (n: number) => string }> = {
  video: { icon: "🎬", name: "Video", long: () => "Video del episodio" },
  cards: { icon: "🃏", name: "Tarjetas", long: () => "Tarjetas" },
  book: { icon: "📖", name: "CelsBook", long: () => "CelsBook" },
  audio: { icon: "🎧", name: "CelsAudio", long: () => "CelsAudio" },
  live: { icon: "👨‍⚖️", name: "Clase", long: () => "Clase del Abogado Miguel" },
  quiz: { icon: "✅", name: "Quiz", long: (n) => `Quiz del episodio ${n}` },
};

/** Part 6 of a CelsUS episode: the episode quiz built from the CelsBook's ebooks.quiz. */
export const celsusQuizPath = (courseSlug: string, n: number) => `${episodePath(courseSlug, n)}/quiz`;
/** The completion screen (state A: book done; state B: all parts done). */
export const completionPath = (courseSlug: string, n: number) => `${episodePath(courseSlug, n)}/terminado`;

export type EpisodeStatus = {
  courseSlug: string;
  n: number;
  /** The 6 core parts in order, with the links the student should use (Part 6 → the quiz route). */
  parts: (Pick<Part, "id" | "done" | "xpEarned"> & { role: UsRole; href: string })[];
  done: number;
  total: number;
  complete: boolean;
  /** The first part not done yet. */
  next: { role: UsRole; href: string; index: number } | null;
  episodeHref: string;
  completionHref: string;
  nextEpisode: { n: number; href: string } | null;
  /** After the last episode: the Evaluación module. */
  finalExamHref: string | null;
};

/** Done parts, the next part and the completion route for episode n of a CelsUS course (the viewer's own progress). */
export async function episodeStatus(supabase: Client, userId: string, courseSlug: string, n: number, isStaff = false): Promise<EpisodeStatus | null> {
  const page = await loadCoursePage(supabase, userId, courseSlug, themeForCourse({ slug: courseSlug }), isStaff);
  const ep = page?.episodes.find((e) => e.n === n);
  if (!page || page.layout !== "citizenship" || !ep) return null;
  const slug = page.course.slug;
  const parts = ep.parts
    .filter((p): p is Part & { role: UsRole } => !!p.role)
    .map((p) => ({ id: p.id, done: p.done, xpEarned: p.xpEarned, role: p.role, href: p.role === "quiz" ? celsusQuizPath(slug, n) : p.href }));
  const nextIdx = parts.findIndex((p) => !p.done);
  const later = page.episodes.find((e) => e.n > n);
  const exam = page.extras.find((x) => x.kind === "evaluation");
  return {
    courseSlug: slug,
    n,
    parts,
    done: parts.filter((p) => p.done).length,
    total: parts.length,
    complete: parts.length > 0 && nextIdx < 0,
    next: nextIdx >= 0 ? { role: parts[nextIdx].role, href: parts[nextIdx].href, index: nextIdx } : null,
    episodeHref: episodePath(slug, n),
    completionHref: completionPath(slug, n),
    nextEpisode: later ? { n: later.n, href: later.href } : null,
    finalExamHref: later ? null : (exam?.href ?? null),
  };
}
