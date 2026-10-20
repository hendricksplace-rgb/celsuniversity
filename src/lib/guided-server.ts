import "server-only";
// Guided courses (CelsGLOBAL step template): everything a course page, a step page or Mi resume needs, read as
// the signed-in student. guided_course_steps is readable with course access; guided_step_progress and resumes
// return the student's own rows only (RLS).
import type { Client } from "@/lib/supabase/types";
import { PRODUCT, themeOf, type GuidedStep, type GuidedTheme, type ResumeData, type StepState } from "@/lib/guided";

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
        step: r.data as unknown as GuidedStep,
        moduleId: r.module_id,
        lessonIds: (m.lessons ?? []).filter((l) => l.status === "published" && !l.teacher_only).map((l) => l.id),
        completedAt: p?.completed_at ?? null,
        state: (p?.state && typeof p.state === "object" && !Array.isArray(p.state) ? p.state : {}) as StepState,
      };
    })
    .sort((a, b) => a.step.step - b.step.step);
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
