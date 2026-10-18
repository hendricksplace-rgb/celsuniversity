// Course page and episode screen data (celsu-course-episode-spec.md). An episode is a `lesson_week`
// module; its parts are the module's lessons, minus teacher-only ones (the Teachersbook never shows to
// students). A part is done when its progress row is `completed`; nothing is ever locked.
import type { createClient } from "@/lib/supabase/server";
import type { ThemeKey } from "@/lib/themes";

type Client = Awaited<ReturnType<typeof createClient>>;

export type PartKey = "celsvideo" | "celscards" | "celsbook" | "celsaudio" | "grammar" | "quiz";
export const PART_KEYS: PartKey[] = ["celsvideo", "celscards", "celsbook", "celsaudio", "grammar", "quiz"];
export const PART_NAME: Record<PartKey, string> = {
  celsvideo: "CelsVideo",
  celscards: "CelsCards",
  celsbook: "CelsBook",
  celsaudio: "CelsAudio",
  grammar: "Grammar",
  quiz: "Quiz",
};
export const partIcon = (key: PartKey) => `/parts/${key}.svg`;

/** Which of the 6 CelsTV parts a lesson is, from its title or type. Null for anything else. */
export function partKeyOf(l: { title: string; lesson_type: string | null }): PartKey | null {
  const t = l.title.toLowerCase();
  if (t.includes("celsvideo")) return "celsvideo";
  if (t.includes("celscards") || t.includes("flashcard")) return "celscards";
  if (t.includes("celsbook")) return "celsbook";
  if (t.includes("celsaudio")) return "celsaudio";
  if (t.includes("grammar")) return "grammar";
  if (t.includes("quiz")) return "quiz";
  return ({ video: "celsvideo", flashcard: "celscards", audio: "celsaudio", grammar: "grammar", quiz: "quiz" } as Record<string, PartKey>)[l.lesson_type ?? ""] ?? null;
}

export type Layout = "episodes" | "weeks" | "citizenship";
export const layoutOf = (theme: ThemeKey, courseLayout: string | null): Layout =>
  courseLayout === "citizenship_modules" ? "citizenship" : theme === "celstv" && courseLayout === "standard" ? "episodes" : "weeks";

export type Part = {
  id: string;
  key: PartKey | null;
  name: string;
  done: boolean;
  started: boolean;
  xpReward: number;
  xpEarned: number;
  lastActivity: string | null;
  href: string;
};
export type EpisodeState = "done" | "now" | "new";
export type Episode = {
  id: string;
  n: number;
  title: string;
  description: string | null;
  artwork: string | null;
  isReview: boolean;
  parts: Part[];
  done: number;
  state: EpisodeState;
  /** The part to open from "Continuar": the first part not done (the first part when all are done). */
  next: Part | null;
  href: string;
};
export type Extra = { id: string; kind: "resources" | "evaluation"; title: string; parts: Part[]; href: string };

export type CoursePage = {
  course: { id: string; slug: string; title: string; description: string | null; layout: string | null };
  layout: Layout;
  episodes: Episode[];
  extras: Extra[];
  /** "Continúa donde te quedaste": the latest activity in this course, or episode 1 when there's none. */
  resume: { episode: Episode; part: Part; fresh: boolean } | null;
  doneCount: number;
};

export const UNIT_SIZE = 8;
export const unitOf = (n: number) => Math.ceil(n / UNIT_SIZE);

/** "Episode 6: Let's eat" → "Let's eat"; "Week 2 – Business Etiquette" → "Business Etiquette"; "Episode 34" → "". */
export function cleanTitle(title: string) {
  return title.replace(/^(CelsUS\s+)?(Episode|Episodio|Module|Módulo|Modulo|Week|Semana)\s*\d+\s*[:–—-]?\s*/i, "").trim();
}

export const episodePath = (slug: string, n: number) => `/app/cursos/${slug}/episodio/${n}`;

function partHref(slug: string, n: number, layout: Layout, l: { id: string }, key: PartKey | null) {
  return layout === "episodes" && key ? `${episodePath(slug, n)}/${key}` : `/app/lecciones/${l.id}`;
}

export async function loadCoursePage(supabase: Client, userId: string, slug: string, theme: ThemeKey, isStaff: boolean): Promise<CoursePage | null> {
  const { data: course } = await supabase.from("courses").select("id, slug, title, description, layout").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const layout = layoutOf(theme, course.layout);
  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, description, artwork_url, kind, sort_order, lessons(id, title, lesson_type, teacher_only, status, sort_order, xp_reward)")
    .eq("course_id", course.id)
    .order("sort_order")
    .order("sort_order", { referencedTable: "lessons" });

  // Never the Teachersbook (or any teacher-only lesson) on these screens; drafts only for staff.
  const visible = (m: NonNullable<typeof modules>[number]) => (m.lessons ?? []).filter((l) => !l.teacher_only && (l.status === "published" || isStaff));
  const lessonIds = (modules ?? []).flatMap((m) => visible(m).map((l) => l.id));
  const { data: rows } = lessonIds.length
    ? await supabase.from("progress").select("lesson_id, status, xp_earned, last_activity").eq("user_id", userId).in("lesson_id", lessonIds)
    : { data: [] };
  const progress = new Map((rows ?? []).map((r) => [r.lesson_id, r]));

  const toParts = (m: NonNullable<typeof modules>[number], n: number) =>
    visible(m).map((l): Part => {
      const p = progress.get(l.id);
      const key = layout === "episodes" ? partKeyOf(l) : null;
      return {
        id: l.id,
        key,
        name: key ? PART_NAME[key] : l.title,
        done: p?.status === "completed",
        started: !!p,
        xpReward: l.xp_reward ?? 0,
        xpEarned: p?.xp_earned ?? 0,
        lastActivity: p?.last_activity ?? null,
        href: partHref(course.slug ?? slug, n, layout, l, key),
      };
    });

  const weeks = (modules ?? []).filter((m) => m.kind === "lesson_week");
  const episodes = weeks.map((m, i): Episode => {
    const n = i + 1;
    const parts = toParts(m, n);
    const done = parts.filter((p) => p.done).length;
    const state: EpisodeState = parts.length > 0 && done === parts.length ? "done" : done > 0 ? "now" : "new";
    return {
      id: m.id,
      n,
      title: cleanTitle(m.title),
      description: m.description,
      artwork: m.artwork_url,
      isReview: /^review/i.test(cleanTitle(m.title)),
      parts,
      done,
      state,
      next: parts.find((p) => !p.done) ?? parts[0] ?? null,
      href: layout === "weeks" && parts.length === 0 ? "#" : episodePath(course.slug ?? slug, n),
    };
  });
  const extras = (modules ?? [])
    .filter((m) => m.kind === "resources" || m.kind === "evaluation")
    .map((m): Extra => {
      const parts = toParts(m, 0);
      return { id: m.id, kind: m.kind as Extra["kind"], title: m.title, parts, href: parts[0]?.href ?? "#" };
    });

  // Resume: the most recently touched part; if it's done, the next part not done in that episode,
  // then the next episode with something left.
  let resume: CoursePage["resume"] = null;
  const all = episodes.flatMap((e) => e.parts.map((p) => ({ e, p })));
  const latest = all.filter((x) => x.p.lastActivity).sort((a, b) => b.p.lastActivity!.localeCompare(a.p.lastActivity!))[0];
  if (latest) {
    const { e, p } = latest;
    if (!p.done) resume = { episode: e, part: p, fresh: false };
    else {
      const after = e.parts.slice(e.parts.indexOf(p) + 1).find((q) => !q.done) ?? e.parts.find((q) => !q.done);
      if (after) resume = { episode: e, part: after, fresh: false };
      else {
        const nextEp = episodes.slice(e.n).find((x) => x.state !== "done") ?? episodes.find((x) => x.state !== "done");
        if (nextEp?.next) resume = { episode: nextEp, part: nextEp.next, fresh: false };
      }
    }
  }
  if (!resume && episodes[0]?.next) resume = { episode: episodes[0], part: episodes[0].next, fresh: true };

  return {
    course: { id: course.id, slug: course.slug ?? slug, title: course.title, description: course.description, layout: course.layout },
    layout,
    episodes,
    extras,
    resume,
    doneCount: episodes.filter((e) => e.state === "done").length,
  };
}
