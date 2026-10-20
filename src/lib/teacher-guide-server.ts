import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/access";
import { episodePath } from "@/lib/course-page";

type Client = Awaited<ReturnType<typeof createClient>>;

/** CelsUS courses (the only ones with the designed guide page; CelsTV guides stay on their lesson page). */
export const GUIDE_LAYOUT = "citizenship_modules";
export type GuidePlace = number | "evaluacion";
export const guidePath = (slug: string, place: GuidePlace) =>
  place === "evaluacion" ? `/app/cursos/${slug}/evaluacion/guia` : `${episodePath(slug, place)}/guia`;

/**
 * Each module's Teacher's Guide: its teacher-only lesson with a teacher_guide block (RLS: staff only).
 * Other teacher-only lessons (the 133-question evaluation) are not guides.
 */
export async function moduleGuides(supabase: Client, moduleIds: string[]) {
  const out = new Map<string, { lessonId: string; body: string }>();
  if (!moduleIds.length) return out;
  const { data } = await supabase
    .from("content_blocks")
    .select("lesson_id, body, sort_order, lesson:lessons!inner(module_id, teacher_only, sort_order)")
    .eq("block_type", "teacher_guide")
    .eq("lesson.teacher_only", true)
    .in("lesson.module_id", moduleIds)
    .order("sort_order");
  for (const row of data ?? []) {
    const lesson = one(row.lesson);
    if (lesson && !out.has(lesson.module_id)) out.set(lesson.module_id, { lessonId: row.lesson_id, body: row.body ?? "" });
  }
  return out;
}

/** The course's episodes (lesson_week modules, numbered like the course page) and its evaluation module. */
export async function guideCourse(supabase: Client, slug: string) {
  const { data: course } = await supabase.from("courses").select("id, slug, title, layout").eq("slug", slug).maybeSingle();
  if (!course || course.layout !== GUIDE_LAYOUT) return null;
  const { data: modules } = await supabase.from("modules").select("id, kind").eq("course_id", course.id).order("sort_order");
  const weeks = (modules ?? []).filter((m) => m.kind === "lesson_week").map((m) => m.id);
  const evaluation = (modules ?? []).find((m) => m.kind === "evaluation")?.id ?? null;
  return { course: { ...course, slug: course.slug ?? slug }, weeks, evaluation };
}

/** Where a guide lesson opens: its episode's guide page, or the evaluation's. Null when the lesson isn't a CelsUS guide. */
export async function guidePlaceOfLesson(supabase: Client, lessonId: string, moduleId: string, courseSlug: string) {
  const info = await guideCourse(supabase, courseSlug);
  if (!info) return null;
  const guide = (await moduleGuides(supabase, [moduleId])).get(moduleId);
  if (guide?.lessonId !== lessonId) return null;
  if (moduleId === info.evaluation) return guidePath(info.course.slug, "evaluacion");
  const n = info.weeks.indexOf(moduleId) + 1;
  return n > 0 ? guidePath(info.course.slug, n) : null;
}
