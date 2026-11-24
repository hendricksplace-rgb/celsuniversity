"use server";

// C-051 Admin → Clases: create / edit a class, its courses, teachers and students. Only super_admin and
// administrator (checked here and again by RLS: private.is_admin on classes, class_courses, class_members).
// Archive instead of delete: there is no delete here. Every change writes admin_audit_log.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import type { Json } from "@/lib/supabase/database.types";

type Client = Awaited<ReturnType<typeof createClient>>;

async function admin() {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) redirect("/app");
  return { supabase, viewer };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);

/** "2027-01-09T10:00" typed as Mexico City time (UTC-6, no DST since 2022) → ISO; "" → null; bad → undefined. */
function mexicoCity(v: string): string | null | undefined {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}:00-06:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

async function audit(supabase: Client, actor: string, action: string, table: string, rowId: string | null, before: unknown, after: unknown) {
  const { error } = await supabase.from("admin_audit_log").insert({ actor, action, table_name: table, row_id: rowId, before: (before ?? null) as Json, after: (after ?? null) as Json });
  // The change itself already happened; a missing audit row must not be silent.
  if (error) console.error("[admin/clases] audit log insert failed", action, table, error.message);
}

const back = (id: string, params: Record<string, string>) => `/app/admin/clases/${id}?${new URLSearchParams(params).toString()}`;

/** Create (classId null) or edit a class: fields + its courses. */
export async function saveClass(classId: string | null, form: FormData) {
  const { supabase, viewer } = await admin();
  const isNew = !classId;
  if (classId && !UUID.test(classId)) redirect("/app/admin/clases");
  const target = classId ?? "nueva";

  const name = text(form.get("name"), 120);
  const scheduleEs = text(form.get("schedule_label"), 120);
  const scheduleEn = text(form.get("schedule_label_en"), 120);
  const orgRaw = text(form.get("organization_id"), 40);
  const organization_id = UUID.test(orgRaw) ? orgRaw : null;
  const next = mexicoCity(text(form.get("next_session_at"), 20));
  const durationRaw = text(form.get("duration_min"), 4);
  const duration_min = durationRaw ? Number(durationRaw) : 60;
  const meetingRaw = text(form.get("meeting_url"), 500);
  const status = form.get("status") === "archived" ? "archived" : "active";
  const courseIds = [...new Set(form.getAll("course").map(String).filter((x) => UUID.test(x)))];

  if (!name) redirect(back(target, { error: "name" }));
  // Both languages are required for a new class; an older class may still have only one (it falls back).
  if (isNew ? !scheduleEs || !scheduleEn : !scheduleEs && !scheduleEn) redirect(back(target, { error: "schedule" }));
  if (!Number.isInteger(duration_min) || duration_min < 5 || duration_min > 600) redirect(back(target, { error: "duration" }));
  if (meetingRaw && !/^https:\/\/\S+$/.test(meetingRaw)) redirect(back(target, { error: "meeting" }));
  if (next === undefined) redirect(back(target, { error: "date" }));

  const row = {
    name,
    organization_id,
    schedule_label: scheduleEs || null,
    schedule_label_en: scheduleEn || null,
    next_session_at: next ?? null,
    duration_min,
    meeting_url: meetingRaw || null,
    status,
  };

  let id = classId;
  if (isNew) {
    const { data, error } = await supabase.from("classes").insert(row).select("id").single();
    if (error || !data) redirect(back(target, { error: "save" }));
    id = data.id;
    await audit(supabase, viewer.user.id, "insert", "classes", id, null, row);
  } else {
    const { data: before } = await supabase.from("classes").select("name, organization_id, schedule_label, schedule_label_en, next_session_at, duration_min, meeting_url, status").eq("id", classId).maybeSingle();
    if (!before) redirect("/app/admin/clases");
    const { data: updated, error } = await supabase.from("classes").update(row).eq("id", classId).select("id");
    if (error || !updated?.length) redirect(back(target, { error: "save" }));
    await audit(supabase, viewer.user.id, before.status !== status ? (status === "archived" ? "archive" : "unarchive") : "update", "classes", classId, before, row);
  }

  // Courses: add the new ones, remove the unticked ones.
  const { data: had } = await supabase.from("class_courses").select("course_id").eq("class_id", id!);
  const before = (had ?? []).map((x) => x.course_id);
  const add = courseIds.filter((c) => !before.includes(c));
  const drop = before.filter((c) => !courseIds.includes(c));
  if (add.length) {
    const { error } = await supabase.from("class_courses").insert(add.map((course_id) => ({ class_id: id!, course_id })));
    if (error) redirect(back(id!, { error: "save" }));
  }
  if (drop.length) {
    const { error } = await supabase.from("class_courses").delete().eq("class_id", id!).in("course_id", drop);
    if (error) redirect(back(id!, { error: "save" }));
  }
  if (add.length || drop.length) await audit(supabase, viewer.user.id, "update", "class_courses", id, { courses: before }, { courses: courseIds });

  revalidatePath("/app/admin/clases");
  revalidatePath("/app/clases");
  redirect(back(id!, { ok: isNew ? "created" : "saved" }));
}

/** Add a teacher or a student. A student needs no enrollment: the class gives its courses (has_course_access). */
export async function addMember(classId: string, role: "teacher" | "student", userId: string) {
  const { supabase, viewer } = await admin();
  if (!UUID.test(classId) || !UUID.test(userId) || (role !== "teacher" && role !== "student")) redirect("/app/admin/clases");
  const { error } = await supabase.from("class_members").upsert({ class_id: classId, user_id: userId, member_role: role }, { onConflict: "class_id,user_id" });
  if (error) redirect(back(classId, { error: "member" }));
  await audit(supabase, viewer.user.id, "add_member", "class_members", classId, null, { user_id: userId, member_role: role });
  revalidatePath(`/app/admin/clases/${classId}`);
  redirect(back(classId, { ok: "saved" }));
}

/** Take someone out of the class (after the confirm step on the page). Their progress stays. */
export async function removeMember(classId: string, userId: string) {
  const { supabase, viewer } = await admin();
  if (!UUID.test(classId) || !UUID.test(userId)) redirect("/app/admin/clases");
  const { data: before } = await supabase.from("class_members").select("user_id, member_role").eq("class_id", classId).eq("user_id", userId).maybeSingle();
  const { error } = await supabase.from("class_members").delete().eq("class_id", classId).eq("user_id", userId);
  if (error) redirect(back(classId, { error: "member" }));
  if (before) await audit(supabase, viewer.user.id, "remove_member", "class_members", classId, before, null);
  revalidatePath(`/app/admin/clases/${classId}`);
  redirect(back(classId, { ok: "saved" }));
}
