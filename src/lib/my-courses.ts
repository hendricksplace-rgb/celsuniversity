// Data for Mis cursos (/app/cursos): the stat chips, "Donde te quedaste" (the Inicio resume rule), the
// standalone programs, the CelsGLOBAL group (route + "también incluido en tu paquete") and the bookshelf.
// Each course shows once: a course the student owns on its own goes to "Tus programas", never also to the
// CelsGLOBAL package panel.
import type { Client } from "@/lib/supabase/types";
import { accessibleCourses, courseStats, nextLesson, resumeCourse, type CourseStats } from "@/lib/learning";
import { PART_NAME, partKeyOf } from "@/lib/course-page";
import { ROUTE_PROGRAM } from "@/lib/route";
import { BSNS_SLUG, bsnsHomeHref } from "@/lib/bsns";
import { lessonHrefs, lessonPagePath } from "@/lib/lesson-href";
import { SCREEN_PROBE, coverUrl, progressOf, screenCount, screenIds } from "@/lib/celsbook-progress";

const pick = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** The CelsGLOBAL route on this page: four cards, MES 1 to MES 4. */
export const ROUTE_CARDS = [
  "tu-camino-con-la-visa-tn-empieza-aqui",
  "from-cv-to-u-s-resume-a-step-by-step-guide",
  "crack-the-u-s-interview-code",
  "finanzas-personales-en-estados-unidos",
] as const;
/** Package courses shown in the "También incluido" panel (when not owned on their own). */
const INCLUDED = ["english-for-business", "celstv-english-for-our-generation"];

export type CardState = "new" | "progress" | "done";
export const stateOf = (c: CourseStats): CardState => (c.completed ? "done" : c.started ? "progress" : "new");
export const pctOf = (c: CourseStats) => (c.lessons ? Math.round((c.done / c.lessons) * 100) : 0);
/** Where the card's button goes: the next lesson, or the course page once finished. */
export function hrefOf(c: CourseStats) {
  // CelsBSNS has no course page any more: its week page is home (celsu-celsbsns-semana-brief).
  if (c.slug === BSNS_SLUG) return bsnsHomeHref(c);
  const n = nextLesson(c);
  return c.completed || !n ? `/app/cursos/${c.slug}` : (c.nextHref ?? lessonPagePath(n.id));
}

/** "CelsCards" for a CelsTV part, else the lesson's own title. */
const partName = (title: string) => {
  const k = partKeyOf({ title, lesson_type: null });
  return k ? PART_NAME[k] : title.replace(/^Cels\w*\s+(Episode|Episodio)\s*\d+\s*:\s*/i, "");
};
/** Part chips on the "Donde te quedaste" card: up to six, always including the current one. */
const MAX_PARTS = 6;


export type Glyph = "globe" | "doc" | "chat" | "money" | "people" | "check";
export type BookTone = "us" | "us2" | "gl" | "gold" | "teal" | "rose" | "violet";
export type ShelfBook = {
  id: string;
  slug: string;
  program: string;
  kind: "celsbook" | "ebook" | "guide";
  /** Title on the cover. */
  face: string;
  /** Caption under the book. */
  caption: string;
  number: string | null;
  glyph: Glyph | null;
  tone: BookTone;
  minutes: number | null;
  screens: number;
  state: CardState;
  /** CelsUS CelsBooks (C-030): the real cover, the topic and how far the student is (0–100). */
  cover?: string | null;
  topic?: string;
  pct?: number;
};

const GLYPH_BY_COURSE: Record<string, Glyph> = {
  "tu-camino-con-la-visa-tn-empieza-aqui": "globe",
  "from-cv-to-u-s-resume-a-step-by-step-guide": "doc",
  "crack-the-u-s-interview-code": "chat",
  "finanzas-personales-en-estados-unidos": "money",
};
const TONE: Record<Glyph, BookTone> = { globe: "gold", doc: "gl", chat: "violet", money: "teal", people: "rose", check: "gl" };
function glyphOf(slug: string, courseSlug: string | null): Glyph {
  if (/familia/.test(slug)) return "people";
  if (/plan-de-accion/.test(slug)) return "check";
  return GLYPH_BY_COURSE[courseSlug ?? ""] ?? "doc";
}

export async function loadMyCourses(supabase: Client, userId: string) {
  const [access, { data: enrollments }, { data: books }, { data: probes }, { data: answers }, { data: tools }] = await Promise.all([
    accessibleCourses(supabase, userId),
    supabase
      .from("enrollments")
      .select("course_id, starts_at, created_at, expires_at, program:programs(slug, program_courses(course_id))")
      .eq("user_id", userId)
      .eq("status", "active"),
    // RLS: published books in courses the student can open.
    supabase.from("ebooks").select("id, slug, title, subtitle, program, est_minutes, cover_path, created_at, course:courses(slug, sort_order)").eq("status", "published"),
    // Typed as just the id: the screen-slot columns are read untyped in screenCount().
    supabase.from("ebooks").select(`id, ${SCREEN_PROBE}` as "id").eq("status", "published"),
    supabase.from("ebook_answers").select("ebook_id, last_screen, completed_at").eq("user_id", userId),
    supabase.rpc("can_use_ai_tools"),
  ]);
  const stats = await courseStats(supabase, userId, access.ids);
  const all = [...stats.values()].sort((a, b) => a.sort - b.sort);
  // "Continuar" goes to each next lesson's current page (C-021).
  const hrefs = await lessonHrefs(supabase, { userId, isStaff: false }, all.map((c) => nextLesson(c)?.id));
  for (const c of all) {
    const n = nextLesson(c);
    if (n) c.nextHref = hrefs.get(n.id);
  }
  const bySlug = new Map(all.map((c) => [c.slug, c]));

  const live = (enrollments ?? []).filter((e) => !e.expires_at || new Date(e.expires_at) > new Date());
  const direct = new Set(live.map((e) => e.course_id).filter((id): id is string => !!id));
  const ipd = live.filter((e) => pick(e.program)?.slug === ROUTE_PROGRAM);
  const packageIds = new Set(ipd.flatMap((e) => (pick(e.program)?.program_courses ?? []).map((pc) => pc.course_id)));
  /** Owned on its own: a direct enrollment, or access that doesn't come from the CelsGLOBAL package (a class). */
  const standaloneOwned = (c: CourseStats) => direct.has(c.id) || !packageIds.has(c.id);

  let global: {
    month: number;
    route: { course: CourseStats; month: number }[];
    tools: boolean;
    resumeCover: string | null;
    interviewCover: string | null;
    included: CourseStats[];
  } | null = null;
  const shown = new Set<string>();
  if (ipd.length) {
    const start = Math.min(...ipd.map((e) => new Date(e.starts_at ?? e.created_at).getTime()));
    const month = Math.min(6, Math.max(1, Math.floor((Date.now() - start) / (30.44 * 864e5)) + 1));
    const route = ROUTE_CARDS.flatMap((slug, i) => {
      const c = bySlug.get(slug);
      return c ? [{ course: c, month: i + 1 }] : [];
    });
    const included = INCLUDED.flatMap((slug) => {
      const c = bySlug.get(slug);
      return c && packageIds.has(c.id) && !standaloneOwned(c) ? [c] : [];
    });
    for (const x of [...route.map((r) => r.course), ...included]) shown.add(x.id);
    global = {
      month,
      route,
      tools: !!tools,
      resumeCover: bySlug.get("from-cv-to-u-s-resume-a-step-by-step-guide")?.cover ?? null,
      interviewCover: bySlug.get("crack-the-u-s-interview-code")?.cover ?? null,
      included,
    };
  }
  const standalone = all.filter((c) => !shown.has(c.id));

  // Donde te quedaste: the Inicio rule, with the parts of the episode/week the next lesson is in.
  const r = resumeCourse(all);
  let resume = null;
  if (r) {
    const moduleId = r.course.order.find((o) => o.id === r.next.id)?.moduleId;
    const moduleIndex = r.course.modules.findIndex((m) => m.id === moduleId);
    const parts = r.course.order
      .filter((o) => o.moduleId === moduleId)
      .map((o) => ({ id: o.id, name: partName(o.title), state: (o.id === r.next.id ? "now" : o.done ? "done" : "todo") as "now" | "done" | "todo" }));
    const now = parts.findIndex((p) => p.state === "now");
    const from = Math.max(0, Math.min(now - 2, parts.length - MAX_PARTS));
    const shown = parts.length > MAX_PARTS ? parts.slice(from, from + MAX_PARTS) : parts;
    resume = {
      course: r.course,
      next: { id: r.next.id, href: r.course.nextHref && nextLesson(r.course)?.id === r.next.id ? r.course.nextHref : lessonPagePath(r.next.id), part: partName(r.next.title) },
      unit: moduleIndex + 1,
      parts: shown,
      moreParts: parts.length - shown.length,
      // The episode's picture when it has one (C-016), else the course cover.
      art: r.course.modules[moduleIndex]?.artwork ?? r.course.cover,
    };
  }

  // Bookshelf: one shelf per program, in course order; each course's main e-book first, then guides.
  const screensOf = new Map((probes ?? []).map((p) => [p.id, screenCount(p)]));
  const idsOf = new Map((probes ?? []).map((p) => [p.id, screenIds(p)]));
  const read = new Map((answers ?? []).map((a) => [a.ebook_id, a]));
  const list = (books ?? []).map((b) => {
    const course = pick(b.course);
    const routeAt = ROUTE_CARDS.indexOf((course?.slug ?? "") as (typeof ROUTE_CARDS)[number]);
    return { ...b, courseSlug: course?.slug ?? null, courseSort: routeAt >= 0 ? routeAt : 100 + (course?.sort_order ?? 0) };
  });
  const firstOfCourse = new Set<string>();
  const seen = new Set<string | null>();
  for (const b of [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!seen.has(b.courseSlug)) firstOfCourse.add(b.id);
    seen.add(b.courseSlug);
  }
  const shelfBooks: ShelfBook[] = list
    .map((b) => {
      const a = read.get(b.id);
      const state: CardState = a?.completed_at ? "done" : a?.last_screen ? "progress" : "new";
      const screens = screensOf.get(b.id) ?? 0;
      const ep = /episodio\s*(\d+)/i.exec(b.title);
      if (b.program === "celsus" || ep) {
        // "CelsUS · Episodio 3" with subtitle "<series> · Deberes, historia y derechos": the topic goes on the cover.
        const topic = (b.subtitle ?? "").split(" · ").pop() || b.title;
        return {
          id: b.id,
          slug: b.slug,
          program: b.program,
          kind: "celsbook" as const,
          face: topic,
          caption: b.title,
          number: ep ? ep[1].padStart(2, "0") : null,
          glyph: null,
          tone: (ep && Number(ep[1]) % 2 === 0 ? "us2" : "us") as BookTone,
          minutes: b.est_minutes,
          screens,
          state,
          cover: coverUrl(b.cover_path),
          topic,
          pct: progressOf(idsOf.get(b.id) ?? [], a).pct,
        };
      }
      const glyph = glyphOf(b.slug, b.courseSlug);
      return { id: b.id, slug: b.slug, program: b.program, kind: (b.slug.startsWith("guia-") ? "guide" : "ebook") as ShelfBook["kind"], face: b.title, caption: b.title, number: null, glyph, tone: TONE[glyph], minutes: b.est_minutes, screens, state };
    })
    .map((book, i) => ({ book, src: list[i] }))
    .sort(
      (x, y) =>
        x.src.program.localeCompare(y.src.program) ||
        (x.book.number && y.book.number ? x.book.number.localeCompare(y.book.number) : 0) ||
        Number(firstOfCourse.has(y.src.id)) - Number(firstOfCourse.has(x.src.id)) ||
        Number(y.book.kind === "guide") - Number(x.book.kind === "guide") ||
        x.src.courseSort - y.src.courseSort ||
        x.src.created_at.localeCompare(y.src.created_at) ||
        x.src.slug.localeCompare(y.src.slug),
    )
    .map((x) => x.book);

  const inProgress = all.filter((c) => stateOf(c) === "progress").length;
  return {
    counts: {
      courses: all.length,
      inProgress,
      books: shelfBooks.length,
      progressItems: inProgress + shelfBooks.filter((b) => b.state === "progress").length,
      doneItems: all.filter((c) => c.completed).length + shelfBooks.filter((b) => b.state === "done").length,
    },
    resume,
    standalone,
    global,
    books: shelfBooks,
  };
}

export type MyCoursesData = Awaited<ReturnType<typeof loadMyCourses>>;
