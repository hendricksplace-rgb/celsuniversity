"use server";

// "Dar acceso" (batch 4 §3): current students sign up on the new site themselves, then staff give them their
// program by hand. Enrollments get source = 'manual'; every grant and revoke is written to admin_audit_log.
// RLS lets only admins write enrollments; progress is never touched (revoking keeps it).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { accessTargets } from "@/lib/grants";
import type { Json } from "@/lib/supabase/database.types";

export type Result = { ok: true } | { ok: false; error: string };

async function admin() {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) return null;
  return { supabase, viewer };
}

const day = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  // Noon Mexico City, so the date shown back is the date picked.
  const d = new Date(`${s}T12:00:00-06:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function grantAccess(userId: string, _prev: Result | null, form: FormData): Promise<Result> {
  const a = await admin();
  if (!a) return { ok: false, error: "Solo los administradores pueden dar acceso." };
  const [kind, id] = String(form.get("target") ?? "").split(":");
  const target = (await accessTargets(a.supabase)).find((t) => t.kind === kind && t.id === id);
  if (!target) return { ok: false, error: "Elige un programa o curso." };
  const starts = day(form.get("starts_at"));
  const expires = day(form.get("expires_at"));
  if (!starts || !expires) return { ok: false, error: "Revisa las fechas." };
  if (expires <= starts) return { ok: false, error: "La fecha de fin debe ser después del inicio." };

  const row = {
    user_id: userId,
    course_id: kind === "course" ? id : null,
    program_id: kind === "program" ? id : null,
    enrollment_type: "individual",
    status: "active",
    source: "manual",
    starts_at: starts.toISOString(),
    expires_at: expires.toISOString(),
  };
  const { data, error } = await a.supabase.from("enrollments").insert(row).select("id").single();
  if (error) return { ok: false, error: "No se pudo dar el acceso." };
  await a.supabase.from("admin_audit_log").insert({
    actor: a.viewer.user.id,
    action: "insert",
    table_name: "enrollments",
    row_id: data.id,
    course_id: kind === "course" ? id : null,
    after: { ...row, target: target.title } as Json,
  });
  revalidatePath(`/app/admin/estudiantes/${userId}`);
  return { ok: true };
}

/** Closes the access now (status cancelled, ends today). The student's progress stays. */
export async function revokeAccess(userId: string, enrollmentId: string): Promise<Result> {
  const a = await admin();
  if (!a) return { ok: false, error: "Solo los administradores pueden quitar acceso." };
  const { data: before } = await a.supabase.from("enrollments").select("*").eq("id", enrollmentId).eq("user_id", userId).maybeSingle();
  if (!before) return { ok: false, error: "No encontramos ese acceso." };
  const now = new Date().toISOString();
  const { data: after, error } = await a.supabase
    .from("enrollments")
    .update({ status: "cancelled", expires_at: now })
    .eq("id", enrollmentId)
    .select("*")
    .single();
  if (error) return { ok: false, error: "No se pudo quitar el acceso." };
  await a.supabase.from("admin_audit_log").insert({
    actor: a.viewer.user.id,
    action: "update",
    table_name: "enrollments",
    row_id: enrollmentId,
    course_id: before.course_id,
    before: before as unknown as Json,
    after: after as unknown as Json,
  });
  revalidatePath(`/app/admin/estudiantes/${userId}`);
  return { ok: true };
}
