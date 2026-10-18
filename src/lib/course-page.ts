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

/**
 * What a student sees of a module's lessons: only lessons with content. A CelsVideo whose video isn't up
 * yet stays when the episode has other parts, so the 6-part path holds; a module with nothing shows nothing.
 */
export function studentLessons<L extends { title: string; has_content: boolean }>(lessons: L[]): L[] {
  if (!lessons.some((l) => l.has_content)) return [];
  return lessons.filter((l) => l.has_content || l.title.toLowerCase().includes("celsvideo"));
}

export type Layout = "episodes" | "weeks" | "citizenship";
export const layoutOf = (theme: ThemeKey, courseLayout: string | null): Layout =>
  courseLayout === "citizenship_modules" ? "citizenship" : theme === "celstv" && courseLayout === "standard" ? "episodes" : "weeks";

export type Part = {
  id: string;
  key: PartKey | null;
  name: string;
  /** The lesson's own title and type. */
  title: string;
  type: string | null;
  /** CelsUS: which of the 6 core parts this is. */
  role?: UsRole;
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
  /** CelsUS: the lessons beyond the 6 core parts ("Material extra"); they don't count toward x/6. */
  extra: Part[];
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

export type UsRole = "video" | "cards" | "book" | "audio" | "live" | "quiz";
export const US_ROLES: UsRole[] = ["video", "cards", "book", "audio", "live", "quiz"];

/** CelsUS: the 6 core parts in order (first lesson of each kind), everything else is extra. */
export function splitCelsus(parts: Part[]) {
  const pick = (role: UsRole, test: (p: Part) => boolean) => {
    const p = parts.find((x) => !x.role && test(x));
    if (p) p.role = role;
  };
  pick("video", (p) => p.type === "video");
  pick("cards", (p) => p.type === "flashcard");
  pick("book", (p) => /celsbook/i.test(p.title));
  pick("audio", (p) => p.type === "audio");
  pick("live", (p) => p.type === "grammar" || /abogado|live/i.test(p.title));
  pick("quiz", (p) => p.type === "quiz");
  const core = US_ROLES.map((r) => parts.find((p) => p.role === r)).filter((p): p is Part => !!p);
  return { core, extra: parts.filter((p) => !p.role) };
}

export const episodePath = (slug: string, n: number) => `/app/cursos/${slug}/episodio/${n}`;

// CelsBSNS: a week's tasks open the task screen; its videos stay on the lesson page.
const bsnsWeek = (slug: string, n: number) => `/app/cursos/${slug}/semana/${n}`;

function partHref(slug: string, n: number, layout: Layout, l: { id: string; lesson_type: string | null }, key: PartKey | null, bsns: boolean) {
  if (bsns && n > 0 && l.lesson_type !== "video") return `${bsnsWeek(slug, n)}/tarea/${l.id}`;
  return layout === "episodes" && key ? `${episodePath(slug, n)}/${key}` : `/app/lecciones/${l.id}`;
}

export async function loadCoursePage(supabase: Client, userId: string, slug: string, theme: ThemeKey, isStaff: boolean): Promise<CoursePage | null> {
  const { data: course } = await supabase.from("courses").select("id, slug, title, description, layout").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const layout = layoutOf(theme, course.layout);
  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, description, artwork_url, kind, sort_order, lessons(id, title, lesson_type, teacher_only, status, sort_order, xp_reward, has_content)")
    .eq("course_id", course.id)
    .order("sort_order")
    .order("sort_order", { referencedTable: "lessons" });

  // Never the Teachersbook (or any teacher-only lesson) on these screens; drafts and empty lessons only for staff.
  const visible = (m: NonNullable<typeof modules>[number]) => {
    const ls = (m.lessons ?? []).filter((l) => !l.teacher_only && (l.status === "published" || isStaff));
    return isStaff ? ls : studentLessons(ls);
  };
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
        title: l.title,
        type: l.lesson_type,
        done: p?.status === "completed",
        started: !!p,
        xpReward: l.xp_reward ?? 0,
        xpEarned: p?.xp_earned ?? 0,
        lastActivity: p?.last_activity ?? null,
        href: partHref(course.slug ?? slug, n, layout, l, key, theme === "celsbsns"),
      };
    });

  const weeks = (modules ?? []).filter((m) => m.kind === "lesson_week");
  const episodes = weeks.map((m, i): Episode => {
    const n = i + 1;
    const all = toParts(m, n);
    const { core: parts, extra } = layout === "citizenship" ? splitCelsus(all) : { core: all, extra: [] as Part[] };
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
      extra,
      done,
      state,
      next: parts.find((p) => !p.done) ?? parts[0] ?? null,
      href: theme === "celsbsns" ? bsnsWeek(course.slug ?? slug, n) : layout === "weeks" && parts.length === 0 ? "#" : episodePath(course.slug ?? slug, n),
    };
  });
  // Episodes keep their number; students don't see the ones with nothing in them yet.
  if (!isStaff) episodes.splice(0, episodes.length, ...episodes.filter((e) => e.parts.length > 0 || e.extra.length > 0));
  const extras = (modules ?? [])
    .filter((m) => m.kind === "resources" || m.kind === "evaluation")
    .map((m): Extra => {
      const parts = toParts(m, 0);
      return { id: m.id, kind: m.kind as Extra["kind"], title: m.title, parts, href: parts[0]?.href ?? "#" };
    })
    .filter((x) => isStaff || x.parts.length > 0);

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
        const nextEp = episodes.find((x) => x.n > e.n && x.state !== "done") ?? episodes.find((x) => x.state !== "done");
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
