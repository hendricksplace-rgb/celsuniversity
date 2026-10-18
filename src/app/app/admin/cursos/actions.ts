"use server";

// Course builder writes. RLS lets only admins write content (admin_all policies); every change is also
// recorded in admin_audit_log (who, before/after) so a lesson's last change can be undone.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import type { Json } from "@/lib/supabase/database.types";

type Client = Awaited<ReturnType<typeof createClient>>;
type Table = "courses" | "modules" | "lessons" | "content_blocks";
type Result = { ok: true; id?: string } | { ok: false; error: string };

const FORBIDDEN: Result = { ok: false, error: "Solo los administradores pueden editar cursos." };

async function admin() {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !(isAdminRole(viewer.role) || viewer.role === "director")) return null;
  return { supabase, viewer };
}

async function log(
  supabase: Client,
  actor: string,
  e: { action: string; table: Table; rowId?: string | null; courseId?: string | null; lessonId?: string | null; before?: unknown; after?: unknown },
) {
  await supabase.from("admin_audit_log").insert({
    actor,
    action: e.action,
    table_name: e.table,
    row_id: e.rowId ?? null,
    course_id: e.courseId ?? null,
    lesson_id: e.lessonId ?? null,
    before: (e.before ?? null) as Json,
    after: (e.after ?? null) as Json,
  });
}

const refresh = (courseId: string, lessonId?: string) => {
  revalidatePath("/app/admin/cursos");
  revalidatePath(`/app/admin/cursos/${courseId}`);
  if (lessonId) revalidatePath(`/app/admin/cursos/${courseId}/leccion/${lessonId}`);
};

async function courseOfLesson(supabase: Client, lessonId: string) {
  const { data } = await supabase.from("lessons").select("module:modules(course_id)").eq("id", lessonId).maybeSingle();
  const m = Array.isArray(data?.module) ? data?.module[0] : data?.module;
  return (m as { course_id: string } | null)?.course_id ?? null;
}

// ---------- Courses ----------

export async function createCourse(title: string): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const clean = title.trim().slice(0, 200);
  if (!clean) return { ok: false, error: "Escribe un título." };
  const { data: last } = await a.supabase.from("courses").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await a.supabase
    .from("courses")
    .insert({ title: clean, status: "draft", sort_order: (last?.sort_order ?? 0) + 1 })
    .select()
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el curso." };
  await log(a.supabase, a.viewer.user.id, { action: "insert", table: "courses", rowId: data.id, courseId: data.id, after: data });
  revalidatePath("/app/admin/cursos");
  return { ok: true, id: data.id };
}

export async function updateCourse(id: string, patch: { title?: string; status?: "draft" | "published" }): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: before } = await a.supabase.from("courses").select().eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Curso no encontrado." };
  const clean: typeof patch = {};
  if (patch.title !== undefined && patch.title.trim()) clean.title = patch.title.trim().slice(0, 200);
  if (patch.status === "draft" || patch.status === "published") clean.status = patch.status;
  const { data, error } = await a.supabase.from("courses").update(clean).eq("id", id).select().single();
  if (error || !data) return { ok: false, error: "No se pudo guardar." };
  await log(a.supabase, a.viewer.user.id, { action: "update", table: "courses", rowId: id, courseId: id, before, after: data });
  refresh(id);
  return { ok: true };
}

/** Only drafts nobody is enrolled in can be deleted (test courses); real courses are unpublished instead. */
export async function deleteCourse(id: string): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: before } = await a.supabase.from("courses").select().eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Curso no encontrado." };
  if (before.status !== "draft") return { ok: false, error: "Pásalo a borrador antes de eliminarlo." };
  const { count } = await a.supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", id);
  if (count) return { ok: false, error: "Tiene estudiantes inscritos: déjalo en borrador en vez de eliminarlo." };
  const { error } = await a.supabase.from("courses").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  await log(a.supabase, a.viewer.user.id, { action: "delete", table: "courses", rowId: id, courseId: id, before });
  revalidatePath("/app/admin/cursos");
  return { ok: true };
}

// ---------- Modules ----------

export async function createModule(courseId: string, title: string): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const clean = title.trim().slice(0, 200) || "Nuevo módulo";
  const { data: last } = await a.supabase.from("modules").select("sort_order").eq("course_id", courseId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await a.supabase
    .from("modules")
    .insert({ course_id: courseId, title: clean, status: "draft", sort_order: (last?.sort_order ?? -1) + 1 })
    .select()
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el módulo." };
  await log(a.supabase, a.viewer.user.id, { action: "insert", table: "modules", rowId: data.id, courseId, after: data });
  refresh(courseId);
  return { ok: true, id: data.id };
}

export async function updateModule(id: string, patch: { title?: string; status?: "draft" | "published" }): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: before } = await a.supabase.from("modules").select().eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Módulo no encontrado." };
  const clean: typeof patch = {};
  if (patch.title !== undefined && patch.title.trim()) clean.title = patch.title.trim().slice(0, 200);
  if (patch.status === "draft" || patch.status === "published") clean.status = patch.status;
  const { data, error } = await a.supabase.from("modules").update(clean).eq("id", id).select().single();
  if (error || !data) return { ok: false, error: "No se pudo guardar." };
  await log(a.supabase, a.viewer.user.id, { action: "update", table: "modules", rowId: id, courseId: before.course_id, before, after: data });
  refresh(before.course_id);
  return { ok: true };
}

/** Deleting removes the module's lessons and blocks; refused when students have progress in it. */
export async function deleteModule(id: string): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: before } = await a.supabase.from("modules").select().eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Módulo no encontrado." };
  const { data: lessons } = await a.supabase.from("lessons").select("id").eq("module_id", id);
  const ids = (lessons ?? []).map((l) => l.id);
  if (ids.length) {
    const { count } = await a.supabase.from("progress").select("id", { count: "exact", head: true }).in("lesson_id", ids);
    if (count) return { ok: false, error: "Hay estudiantes con avance en este módulo: despublícalo en vez de eliminarlo." };
  }
  const { error } = await a.supabase.from("modules").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  await log(a.supabase, a.viewer.user.id, { action: "delete", table: "modules", rowId: id, courseId: before.course_id, before });
  refresh(before.course_id);
  return { ok: true };
}

export async function duplicateModule(id: string): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: m } = await a.supabase.from("modules").select("course_id").eq("id", id).maybeSingle();
  // The function copies the lessons and blocks and writes its own history row.
  const { data, error } = await a.supabase.rpc("admin_duplicate_module", { p_module: id });
  if (error || !data) return { ok: false, error: "No se pudo duplicar." };
  if (m) refresh(m.course_id);
  return { ok: true, id: data };
}

// ---------- Ordering ----------

async function reorder(a: NonNullable<Awaited<ReturnType<typeof admin>>>, table: Table, ids: string[], ctx: { courseId: string; lessonId?: string }) {
  const { data: rows } = await a.supabase.from(table).select("id, sort_order").in("id", ids);
  const before = ids.map((id) => ({ id, sort_order: rows?.find((r) => r.id === id)?.sort_order ?? 0 }));
  const after = ids.map((id, i) => ({ id, sort_order: i }));
  const changed = after.filter((r, i) => r.sort_order !== before[i].sort_order);
  for (const r of changed) {
    const { error } = await a.supabase.from(table).update({ sort_order: r.sort_order }).eq("id", r.id);
    if (error) return { ok: false, error: "No se pudo guardar el orden." } as Result;
  }
  if (changed.length) await log(a.supabase, a.viewer.user.id, { action: "reorder", table, courseId: ctx.courseId, lessonId: ctx.lessonId, before: { order: before }, after: { order: after } });
  refresh(ctx.courseId, ctx.lessonId);
  return { ok: true } as Result;
}

export async function reorderModules(courseId: string, ids: string[]): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  return reorder(a, "modules", ids, { courseId });
}

export async function reorderLessons(courseId: string, ids: string[]): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  return reorder(a, "lessons", ids, { courseId });
}

export async function reorderBlocks(lessonId: string, ids: string[]): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const courseId = await courseOfLesson(a.supabase, lessonId);
  if (!courseId) return { ok: false, error: "Lección no encontrada." };
  return reorder(a, "content_blocks", ids, { courseId, lessonId });
}

// ---------- Lessons ----------

export async function createLesson(moduleId: string, title: string): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: m } = await a.supabase.from("modules").select("course_id").eq("id", moduleId).maybeSingle();
  if (!m) return { ok: false, error: "Módulo no encontrado." };
  const { data: last } = await a.supabase.from("lessons").select("sort_order").eq("module_id", moduleId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await a.supabase
    .from("lessons")
    .insert({ module_id: moduleId, title: title.trim().slice(0, 200) || "Nueva lección", status: "draft", sort_order: (last?.sort_order ?? -1) + 1 })
    .select()
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear la lección." };
  await log(a.supabase, a.viewer.user.id, { action: "insert", table: "lessons", rowId: data.id, courseId: m.course_id, after: data });
  refresh(m.course_id);
  return { ok: true, id: data.id };
}

export async function updateLesson(id: string, patch: { title?: string; status?: "draft" | "published"; teacher_only?: boolean }): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: before } = await a.supabase.from("lessons").select().eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Lección no encontrada." };
  const courseId = await courseOfLesson(a.supabase, id);
  const clean: typeof patch = {};
  if (patch.title !== undefined && patch.title.trim()) clean.title = patch.title.trim().slice(0, 200);
  if (patch.status === "draft" || patch.status === "published") clean.status = patch.status;
  if (typeof patch.teacher_only === "boolean") clean.teacher_only = patch.teacher_only;
  const { data, error } = await a.supabase.from("lessons").update(clean).eq("id", id).select().single();
  if (error || !data) return { ok: false, error: "No se pudo guardar." };
  await log(a.supabase, a.viewer.user.id, { action: "update", table: "lessons", rowId: id, courseId, lessonId: id, before, after: data });
  if (courseId) refresh(courseId, id);
  return { ok: true };
}

export async function deleteLesson(id: string): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: before } = await a.supabase.from("lessons").select().eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Lección no encontrada." };
  const { count } = await a.supabase.from("progress").select("id", { count: "exact", head: true }).eq("lesson_id", id);
  if (count) return { ok: false, error: "Hay estudiantes con avance en esta lección: despublícala en vez de eliminarla." };
  const courseId = await courseOfLesson(a.supabase, id);
  const { error } = await a.supabase.from("lessons").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  await log(a.supabase, a.viewer.user.id, { action: "delete", table: "lessons", rowId: id, courseId, before });
  if (courseId) refresh(courseId);
  return { ok: true };
}

// ---------- Blocks ----------

type BlockInput = { block_type: string; title: string | null; body: string | null; data: Record<string, unknown>; teacher_only: boolean };

function cleanBlock(b: BlockInput) {
  return {
    block_type: String(b.block_type || "text").slice(0, 40),
    title: b.title?.trim() ? b.title.trim().slice(0, 300) : null,
    body: b.body ?? null,
    data: (b.data && typeof b.data === "object" && !Array.isArray(b.data) ? b.data : {}) as Json,
    teacher_only: !!b.teacher_only,
  };
}

export async function createBlock(lessonId: string, block: BlockInput): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const courseId = await courseOfLesson(a.supabase, lessonId);
  if (!courseId) return { ok: false, error: "Lección no encontrada." };
  const { data: last } = await a.supabase.from("content_blocks").select("sort_order").eq("lesson_id", lessonId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await a.supabase
    .from("content_blocks")
    .insert({ ...cleanBlock(block), lesson_id: lessonId, sort_order: (last?.sort_order ?? -1) + 1 })
    .select()
    .single();
  if (error || !data) return { ok: false, error: "No se pudo agregar el bloque." };
  await log(a.supabase, a.viewer.user.id, { action: "insert", table: "content_blocks", rowId: data.id, courseId, lessonId, after: data });
  refresh(courseId, lessonId);
  return { ok: true, id: data.id };
}

export async function updateBlock(id: string, block: BlockInput): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: before } = await a.supabase.from("content_blocks").select().eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Bloque no encontrado." };
  const courseId = await courseOfLesson(a.supabase, before.lesson_id);
  const { data, error } = await a.supabase.from("content_blocks").update(cleanBlock(block)).eq("id", id).select().single();
  if (error || !data) return { ok: false, error: "No se pudo guardar el bloque." };
  await log(a.supabase, a.viewer.user.id, { action: "update", table: "content_blocks", rowId: id, courseId, lessonId: before.lesson_id, before, after: data });
  if (courseId) refresh(courseId, before.lesson_id);
  return { ok: true };
}

export async function deleteBlock(id: string): Promise<Result> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: before } = await a.supabase.from("content_blocks").select().eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Bloque no encontrado." };
  const courseId = await courseOfLesson(a.supabase, before.lesson_id);
  const { error } = await a.supabase.from("content_blocks").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar el bloque." };
  await log(a.supabase, a.viewer.user.id, { action: "delete", table: "content_blocks", rowId: id, courseId, lessonId: before.lesson_id, before });
  if (courseId) refresh(courseId, before.lesson_id);
  return { ok: true };
}

// ---------- Undo ----------

const EDITABLE: Record<"lessons" | "content_blocks", string[]> = {
  lessons: ["title", "status", "teacher_only", "sort_order"],
  content_blocks: ["block_type", "title", "body", "data", "teacher_only", "sort_order"],
};

/** "Deshacer último cambio": reverts the lesson's latest change that hasn't been undone yet. */
export async function undoLast(lessonId: string): Promise<Result & { what?: string }> {
  const a = await admin();
  if (!a) return FORBIDDEN;
  const { data: entry } = await a.supabase
    .from("admin_audit_log")
    .select("id, action, table_name, row_id, course_id, before, after")
    .eq("lesson_id", lessonId)
    .is("undone_at", null)
    .neq("action", "undo")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!entry) return { ok: false, error: "No hay cambios para deshacer." };
  const table = entry.table_name as "lessons" | "content_blocks";
  if (!(table in EDITABLE)) return { ok: false, error: "Ese cambio no se puede deshacer aquí." };
  const before = (entry.before ?? {}) as Record<string, unknown>;
  const pick = (row: Record<string, unknown>) => Object.fromEntries(EDITABLE[table].filter((k) => k in row).map((k) => [k, row[k]]));

  let error: { message: string } | null = null;
  if (entry.action === "update" && entry.row_id) {
    ({ error } = await a.supabase.from(table).update(pick(before) as never).eq("id", entry.row_id));
  } else if (entry.action === "insert" && entry.row_id) {
    ({ error } = await a.supabase.from(table).delete().eq("id", entry.row_id));
  } else if (entry.action === "delete" && table === "content_blocks") {
    const b = before as { id: string; lesson_id: string };
    ({ error } = await a.supabase.from("content_blocks").insert({ ...pick(before), id: b.id, lesson_id: b.lesson_id } as never));
  } else if (entry.action === "reorder") {
    for (const r of ((before as { order?: { id: string; sort_order: number }[] }).order ?? [])) {
      ({ error } = await a.supabase.from(table).update({ sort_order: r.sort_order }).eq("id", r.id));
      if (error) break;
    }
  } else {
    return { ok: false, error: "Ese cambio no se puede deshacer." };
  }
  if (error) return { ok: false, error: "No se pudo deshacer." };
  await a.supabase.from("admin_audit_log").update({ undone_at: new Date().toISOString() }).eq("id", entry.id);
  await log(a.supabase, a.viewer.user.id, { action: "undo", table, rowId: entry.row_id, courseId: entry.course_id, lessonId, before: entry.after, after: entry.before });
  if (entry.course_id) refresh(entry.course_id, lessonId);
  return { ok: true, what: `${entry.action} ${table}` };
}
