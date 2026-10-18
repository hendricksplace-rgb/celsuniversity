"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

/** Teacher assigns a course, or one of its modules, to a class. RLS checks that they teach it. */
export async function assignToClass(classId: string, form: FormData) {
  if (!UUID.test(classId)) return;
  const what = String(form.get("what") ?? "");
  const [courseId, moduleId] = what.split(":");
  if (!UUID.test(courseId) || (moduleId && !UUID.test(moduleId))) return;
  const due = String(form.get("due") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 280);
  const supabase = await createClient();
  const { error } = await supabase.from("class_assignments").insert({
    class_id: classId,
    course_id: courseId,
    module_id: moduleId || null,
    // Due at the end of that day, Mexico City time.
    due_at: /^\d{4}-\d{2}-\d{2}$/.test(due) ? new Date(`${due}T23:59:00-06:00`).toISOString() : null,
    note: note || null,
  });
  revalidatePath(`/app/clases/${classId}`);
  redirect(`/app/clases/${classId}${error ? "?error=1" : ""}`);
}

export async function removeAssignment(classId: string, id: string) {
  if (!UUID.test(classId) || !UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("class_assignments").delete().eq("id", id).eq("class_id", classId);
  revalidatePath(`/app/clases/${classId}`);
}
