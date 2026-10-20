import "server-only";
// Guided courses (CelsGLOBAL step template): everything a course page, a step page or Mi resume needs, read as
// the signed-in student. guided_course_steps is readable with course access; guided_step_progress and resumes
// return the student's own rows only (RLS).
import type { Client } from "@/lib/supabase/types";
import { PRODUCT, themeOf, type GuidedStep, type GuidedTheme, type ResumeData, type StepState } from "@/lib/guided";
import type { Block, Screen } from "@/lib/ebook-format";

export type StepRow = {
  step: GuidedStep;
  moduleId: string;
  /** The module's old lessons (published, not teacher-only), in order: finishing the step finishes them (XP). */
  lessonIds: string[];
  completedAt: string | null;
  state: StepState;
};
export type GuidedLoad = {
  course: { id: string; slug: string; title: string; description: string | null };
  /** courses.theme: the colors, the hero and the product (resumes or answer_banks). */
  theme: GuidedTheme;
  steps: StepRow[];
  resume: ResumeData;
  resumeAt: string | null;
  done: number;
};

export async function loadGuided(supabase: Client, slug: string, userId: string): Promise<GuidedLoad | null> {
  const { data: course } = await supabase.from("courses").select("id, slug, title, description, theme").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const { data: modules } = await supabase
    .from("modules")
    .select("id, sort_order, lessons(id, status, teacher_only, sort_order)")
    .eq("course_id", course.id)
    .order("sort_order")
    .order("sort_order", { referencedTable: "lessons" });
  const ids = (modules ?? []).map((m) => m.id);
  if (!ids.length) return null;
  const theme = themeOf(course.theme);
  const [{ data: rows }, { data: prog }, { data: resume }] = await Promise.all([
    supabase.from("guided_course_steps").select("module_id, data").in("module_id", ids),
    supabase.from("guided_step_progress").select("module_id, state, completed_at").eq("user_id", userId).in("module_id", ids),
    supabase.from(PRODUCT[theme].table).select("data, updated_at").eq("user_id", userId).maybeSingle(),
  ]);
  if (!rows?.length) return null;
  const progress = new Map((prog ?? []).map((p) => [p.module_id, p]));
  const steps: StepRow[] = rows
    .map((r) => {
      const m = modules!.find((x) => x.id === r.module_id)!;
      const p = progress.get(r.module_id);
      return {
        step: normalizeStep(r.data),
        moduleId: r.module_id,
        lessonIds: (m.lessons ?? []).filter((l) => l.status === "published" && !l.teacher_only).map((l) => l.id),
        completedAt: p?.completed_at ?? null,
        state: (p?.state && typeof p.state === "object" && !Array.isArray(p.state) ? p.state : {}) as StepState,
      };
    })
    .sort((a, b) => a.step.step - b.step.step);
  await withEbookEssentials(supabase, steps.map((x) => x.step));
  const data = resume?.data && typeof resume.data === "object" && !Array.isArray(resume.data) ? (resume.data as ResumeData) : {};
  return {
    course: { id: course.id, slug: course.slug ?? slug, title: course.title, description: course.description },
    theme,
    steps,
    resume: data,
    resumeAt: resume?.updated_at ?? null,
    done: steps.filter((s) => s.completedAt).length,
  };
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Every array a renderer maps or flatMaps is an array, whatever shape the row has (a step saved before its renderer
 * shipped threw "Cannot read properties of undefined (reading 'flatMap')" on Finanzas step 3, 2026-10-20 00:21–01:09).
 * Optional fields stay absent when missing; lists inside blocks and sections become [].
 */
const fixItems = <T extends Record<string, unknown>>(o: T): T => {
  for (const k of ["items", "options", "prompts", "fields", "tabs", "questions", "groups", "rows"]) if (k in o && !Array.isArray(o[k])) (o as Record<string, unknown>)[k] = [];
  return o;
};

function normalizeStep(data: unknown): GuidedStep {
  const step = (isObj(data) ? data : {}) as Record<string, unknown>;
  const build = isObj(step.build) ? step.build : {};
  build.sections = arr<unknown>(build.sections).filter(isObj).map(fixItems);
  step.build = build;
  if ("essentials" in step) step.essentials = arr<unknown>(step.essentials).filter(isObj).map(fixItems);
  if ("more_videos" in step) step.more_videos = arr<unknown>(step.more_videos).filter(isObj);
  if ("check" in step) step.check = arr<Record<string, unknown>>(step.check).filter((c) => isObj(c) && Array.isArray(c.o));
  step.keys = arr<unknown>(step.keys).filter(isObj);
  if (isObj(step.practice)) fixItems(step.practice);
  else step.practice = null;
  if (isObj(step.essentials_from)) step.essentials_from.screens = arr<string>(step.essentials_from.screens);
  else delete step.essentials_from;
  return step as unknown as GuidedStep;
}

/**
 * "Lo esencial" from the e-book (essentials_from): the listed screens' blocks, without the skipped types / title
 * prefix and without any block a practice or build section takes with `from_ebook` ("m5 myth", "m5 checklist 1" =
 * the 2nd checklist of m5). Those sections get their items from the same block, so the book and the course always
 * say the same thing. Links to courses by id become links by slug. Read with the student's access.
 */
async function withEbookEssentials(supabase: Client, steps: GuidedStep[]) {
  const slugs = [...new Set(steps.flatMap((s) => (s.essentials_from?.ebook ? [s.essentials_from.ebook] : [])))];
  if (!slugs.length) return;
  const { data: books } = await supabase.from("ebooks").select("slug, title, screens").in("slug", slugs);
  const bySlug = new Map((books ?? []).map((b) => [b.slug, { title: b.title, screens: arr<unknown>(b.screens).filter(isObj) as unknown as Screen[] }]));
  type Any = Record<string, unknown>;
  const blockOf = (screens: Screen[], ref: string | undefined) => {
    const [sid, type, nth] = (ref ?? "").split(" ");
    const list = arr<Block>(screens.find((x) => x.id === sid)?.blocks).filter((b) => b?.type === type);
    return (list[Number(nth || 0)] as (Block & Any) | undefined) ?? null;
  };
  const courseIds = new Set<string>();
  for (const step of steps) {
    const f = step.essentials_from;
    const book = f ? bySlug.get(f.ebook) : undefined;
    if (!f || !book) continue;
    const { screens } = book;
    step.ebookTitle = book.title;
    const used = new Set<unknown>();
    const p = step.practice as (Any & { kind: string; items?: unknown[]; from_ebook?: string }) | null;
    if (p?.from_ebook) {
      const b = blockOf(screens, p.from_ebook);
      if (b) used.add(b);
      if (b && Array.isArray(b.items) && !p.items?.length) p.items = b.items as unknown[];
    }
    for (const sec of step.build.sections as (Any & { type: string; from_ebook?: string })[]) {
      if (!sec.from_ebook) continue;
      const b = blockOf(screens, sec.from_ebook);
      if (!b) continue;
      used.add(b);
      if (sec.type === "checklist" && !(sec.items as unknown[] | undefined)?.length) {
        sec.items = b.items;
        if (!sec.title && b.title) sec.title = b.title;
        if (!sec.done_text && b.done_text) sec.done_text = b.done_text;
      }
      if (sec.type === "reflect" && !(sec.prompts as unknown[] | undefined)?.length) sec.prompts = b.prompts ?? [];
      if (sec.type === "plan" && !(sec.tabs as unknown[] | undefined)?.length)
        sec.tabs = ((b.tabs as Any[] | undefined) ?? []).map((t) => ({ label: t.label, suggest: t.suggest ?? t.goals ?? [] }));
    }
    const skipTypes = f.skip?.types ?? [];
    const prefix = f.skip?.title_prefix;
    step.ebookScreens = f.screens.flatMap((sid) => {
      const sc = screens.find((x) => x.id === sid);
      if (!sc) return [];
      const blocks = arr<Block>(sc.blocks).filter((b) => {
        if (!isObj(b)) return false;
        fixItems(b as unknown as Record<string, unknown>);
        const title = (b as { title?: string }).title ?? "";
        return !skipTypes.includes(b.type) && !(prefix && title.startsWith(prefix)) && !used.has(b);
      });
      return [{ id: sc.id, title: sc.title, audio: sc.narration?.audio ?? null, blocks }];
    });
  }
  // Course links by id (the e-book's) → by slug, wherever they are in the step.
  const walk = (v: unknown, fn: (o: Any) => void) => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, fn));
    else if (v && typeof v === "object") {
      fn(v as Any);
      Object.values(v).forEach((x) => walk(x, fn));
    }
  };
  const isId = (x: unknown) => typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
  for (const step of steps) walk([step.ebookScreens, step.build], (o) => isId(o.course) && courseIds.add(o.course as string));
  if (courseIds.size) {
    const { data: cs } = await supabase.from("courses").select("id, slug").in("id", [...courseIds]);
    const slugOf = new Map((cs ?? []).map((c) => [c.id, c.slug]));
    for (const step of steps)
      walk([step.ebookScreens, step.build], (o) => {
        if (isId(o.course)) o.course = slugOf.get(o.course as string) ?? o.course;
      });
  }
}
