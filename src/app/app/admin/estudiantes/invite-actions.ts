"use server";

// «Enviar invitación»: the student-invite Edge Function makes the link and sends invite-celsglobal; here we
// only check the viewer is an admin and pass their session along (the function checks it again).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { sendInvites, type InviteOutcome } from "@/lib/invites";

export type InviteResult = { ok: true; results: InviteOutcome[] } | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  rate: "Demasiados envíos seguidos. Espera unos minutos.",
  forbidden: "Solo los administradores pueden enviar invitaciones.",
  error: "No se pudo enviar la invitación. Inténtalo de nuevo.",
};

async function session() {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? { supabase, token: data.session.access_token } : null;
}

/** One student: "Enviar invitación", or "Reenviar" (resend) when one went out already. */
export async function inviteStudent(userId: string, resend: boolean): Promise<InviteResult> {
  const s = await session();
  if (!s) return { ok: false, error: ERRORS.forbidden };
  const r = await sendInvites([userId], s.token, resend);
  revalidatePath("/app/admin/estudiantes");
  revalidatePath(`/app/admin/estudiantes/${userId}`);
  if (!r.ok) return { ok: false, error: ERRORS[r.error] };
  return { ok: true, results: r.results };
}

/**
 * "Enviar invitación a todos los pendientes": everyone public.admin_invite_pending() lists right now
 * (access, never signed in, never invited), narrowed by the list's search when there is one. `expected` is
 * the count the confirm dialog showed: if the list changed since, nothing is sent and the page refreshes.
 */
export async function invitePending(search: string, expected: number): Promise<InviteResult> {
  const s = await session();
  if (!s) return { ok: false, error: ERRORS.forbidden };
  const { data: pending, error } = await s.supabase.rpc("admin_invite_pending");
  if (error) return { ok: false, error: ERRORS.error };
  const q = search.trim().toLowerCase();
  const ids = (pending ?? []).filter((p) => !q || p.email?.toLowerCase().includes(q) || p.display_name?.toLowerCase().includes(q)).map((p) => p.user_id);
  if (ids.length !== expected) {
    revalidatePath("/app/admin/estudiantes");
    return { ok: false, error: `La lista cambió (${ids.length} pendientes ahora). Revisa y vuelve a confirmar.` };
  }
  if (!ids.length) return { ok: true, results: [] };
  const r = await sendInvites(ids, s.token, false);
  revalidatePath("/app/admin/estudiantes");
  if (!r.ok) return { ok: false, error: `${ERRORS[r.error]} (${r.results.length} enviadas antes del error)` };
  return { ok: true, results: r.results };
}
