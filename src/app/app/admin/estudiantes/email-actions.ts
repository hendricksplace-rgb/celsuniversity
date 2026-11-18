"use server";

// «Cambiar correo» (C-046). The admin-change-email Edge Function does the work with the service role
// (auth.admin.updateUserById, Stripe, invites, audit log, emails); here we only check the viewer is an admin and
// pass their session along. The function checks the role again, and that administrators only change students.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { supabaseEnv } from "@/lib/supabase/env";

export type ChangeEmailError = "invalid" | "same" | "taken" | "staff_account" | "self" | "forbidden" | "rate" | "not_found" | "generic";
export type ChangeEmailResult =
  | { ok: true; email: string; invitesExpired: number; stripeFailed: boolean; mailFailed: boolean }
  | { ok: false; error: ChangeEmailError };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FROM_FUNCTION: Record<string, ChangeEmailError> = {
  email: "invalid",
  user: "not_found",
  not_found: "not_found",
  same: "same",
  taken: "taken",
  staff_account: "staff_account",
  self: "self",
  forbidden: "forbidden",
  rate: "rate",
};

type FunctionReply = {
  ok?: boolean;
  error?: string;
  email?: string;
  invites_expired?: number;
  stripe?: string;
  emails?: { new?: string; old?: string };
};

export async function changeStudentEmail(input: { userId: string; newEmail: string; reason: string; notify: boolean }): Promise<ChangeEmailResult> {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !isAdminRole(viewer.role)) return { ok: false, error: "forbidden" };
  if (viewer.user.id === input.userId) return { ok: false, error: "self" };
  const newEmail = input.newEmail.trim().toLowerCase();
  if (!EMAIL.test(newEmail)) return { ok: false, error: "invalid" };
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { ok: false, error: "forbidden" };

  const { url, key } = supabaseEnv();
  let status = 0;
  let reply: FunctionReply | null = null;
  try {
    const res = await fetch(`${url}/functions/v1/admin-change-email`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: input.userId, new_email: newEmail, reason: input.reason.trim().slice(0, 200), notify: input.notify }),
      cache: "no-store",
    });
    status = res.status;
    reply = (await res.json().catch(() => null)) as FunctionReply | null;
  } catch {
    return { ok: false, error: "generic" };
  }
  if (status !== 200 || !reply?.ok) return { ok: false, error: FROM_FUNCTION[reply?.error ?? ""] ?? "generic" };

  revalidatePath("/app/admin/estudiantes");
  revalidatePath(`/app/admin/estudiantes/${input.userId}`);
  const sent = (s?: string) => !s || s === "off" || s === "sent" || s === "stubbed" || s === "duplicate";
  return {
    ok: true,
    email: reply.email ?? newEmail,
    invitesExpired: reply.invites_expired ?? 0,
    stripeFailed: reply.stripe === "failed",
    mailFailed: !sent(reply.emails?.new) || !sent(reply.emails?.old),
  };
}
