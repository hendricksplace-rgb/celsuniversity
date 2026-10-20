import "server-only";
// «Enviar invitación» (Admin → Estudiantes) and /activar. The work happens in the student-invite Edge Function
// (it needs the admin auth APIs); the app only calls it with its publishable key, plus the admin's session
// when sending. The token in /activar?t= is never stored here: the function keeps its sha256.
import { supabaseEnv } from "@/lib/supabase/env";

export type InviteRow = { user_id: string; seq: number; sent_at: string; status: string; redeemed_at: string | null; activated_at: string | null; expires_at: string };
export type InviteOutcome = { user_id: string; status: "sent" | "stubbed" | "failed" | "duplicate" | "already" | "not_found"; sent_at?: string };
export type Redeemed = { ok: true; token_hash: string; type: "recovery"; email: string } | { ok: false; reason: "unknown" | "expired" | "used" | "rate" | "error"; email?: string };

/** Largest batch the function accepts per call. */
export const INVITE_BATCH = 50;

async function call<T>(body: Record<string, unknown>, accessToken?: string): Promise<{ status: number; data: T | null }> {
  const { url, key } = supabaseEnv();
  try {
    const res = await fetch(`${url}/functions/v1/student-invite`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${accessToken ?? key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return { status: res.status, data: (await res.json().catch(() => null)) as T | null };
  } catch {
    return { status: 0, data: null };
  }
}

export async function sendInvites(userIds: string[], accessToken: string, resend = false) {
  const results: InviteOutcome[] = [];
  for (let i = 0; i < userIds.length; i += INVITE_BATCH) {
    const { status, data } = await call<{ results?: InviteOutcome[]; error?: string }>({ action: "send", user_ids: userIds.slice(i, i + INVITE_BATCH), resend }, accessToken);
    if (status !== 200 || !data?.results) return { ok: false as const, error: status === 429 ? "rate" : status === 403 ? "forbidden" : "error", results };
    results.push(...data.results);
  }
  return { ok: true as const, results };
}

export async function redeemInvite(token: string): Promise<Redeemed> {
  const { status, data } = await call<Redeemed>({ action: "redeem", token });
  if (status === 429) return { ok: false, reason: "rate" };
  return data && typeof data.ok === "boolean" ? data : { ok: false, reason: "error" };
}

/** Pendiente / Enviada / Abrió / Activó / Falló, from the latest invitation row. */
export function inviteLabel(inv: Pick<InviteRow, "status" | "redeemed_at" | "activated_at"> | null | undefined) {
  if (!inv) return { text: "Pendiente", tone: "bg-[#FFF4D6] text-[#7A5A00]" };
  if (inv.activated_at) return { text: "Activó", tone: "bg-[#E3F6E8] text-[#15803D]" };
  if (inv.redeemed_at) return { text: "Abrió el enlace", tone: "bg-[#E3F6E8] text-[#15803D]" };
  if (inv.status === "failed") return { text: "Falló", tone: "bg-[#FDECEA] text-[#B42318]" };
  if (inv.status === "sending") return { text: "Enviando", tone: "bg-[#F4F1F7] text-[#5E5A73]" };
  return { text: inv.status === "stubbed" ? "Enviada (prueba)" : "Enviada", tone: "bg-[#E8F0FE] text-[#1D4ED8]" };
}

export const fmtDay = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric" }) : "";
