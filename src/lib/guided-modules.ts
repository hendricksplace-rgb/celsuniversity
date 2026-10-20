// Which modules use the guided step template (a guided_course_steps row). Shared by the course page loader,
// courseStats and the lesson page; no server-only import so the shared libs stay importable.
import type { Client } from "@/lib/supabase/types";

/** Modules of these courses that have a guided step (the old lessons of those modules are hidden from students). */
export async function guidedModules(supabase: Client, moduleIds: string[]) {
  if (!moduleIds.length) return new Map<string, { step: number; title: string }>();
  const { data } = await supabase.from("guided_course_steps").select("module_id, step:data->step, title:data->>title").in("module_id", moduleIds);
  return new Map((data ?? []).map((r) => [r.module_id, { step: Number(r.step) || 0, title: String(r.title ?? "") }]));
}

/** Does this course use the guided template? (one row is enough) */
export async function isGuidedCourse(supabase: Client, courseId: string) {
  const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseId);
  const ids = (modules ?? []).map((m) => m.id);
  if (!ids.length) return false;
  const { count } = await supabase.from("guided_course_steps").select("module_id", { count: "exact", head: true }).in("module_id", ids);
  return !!count;
}
