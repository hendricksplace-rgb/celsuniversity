// Daily follow-ups for evaluation leads (replaces Base44 sendFollowUps + the FollowUpEmails workflow).
// D1, D3 and D7 after the evaluation only while the lead hasn't bought; the D30 retake reminder goes
// to everyone. Never to anyone who unsubscribed. Run once a day by pg_cron (private.kick_followups),
// which sends the 'followups' job token.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendFollowUp, type LeadForEmail } from "../_shared/eval-emails.ts";

// stage → days after the evaluation it is due
const DUE: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 30 };

/** Lowercased emails among `emails` that belong to a buyer: a paid order or an active enrollment. */
async function buyers(admin: SupabaseClient, emails: string[]) {
  const out = new Set<string>();
  if (!emails.length) return out;
  const { data: orders } = await admin.from("orders").select("email").eq("status", "paid").in("email", emails);
  for (const o of orders ?? []) if (o.email) out.add(o.email.toLowerCase());
  const { data: profiles } = await admin.from("profiles").select("email, enrollments!inner(status)").in("email", emails).eq("enrollments.status", "active");
  for (const p of profiles ?? []) if (p.email) out.add(p.email.toLowerCase());
  return out;
}

export async function runFollowUps(admin: SupabaseClient, jobToken: string | null) {
  const { data: tok } = await admin.from("job_tokens").select("token").eq("name", "followups").maybeSingle();
  if (!tok || !jobToken || jobToken !== tok.token) return { status: 403, body: { error: "forbidden" } };

  const { data: leads, error } = await admin
    .from("leads")
    .select("id, name, email, goal, cefr_level, skill_levels, unsubscribe_token, evaluated_at, followup_stage, converted_to_student")
    .eq("unsubscribed", false)
    .lt("followup_stage", 4)
    .not("evaluated_at", "is", null)
    .lte("evaluated_at", new Date(Date.now() - 864e5).toISOString());
  if (error) throw error;

  const bought = await buyers(admin, (leads ?? []).map((l) => l.email));
  let sent = 0;
  for (const lead of leads ?? []) {
    const days = (Date.now() - new Date(lead.evaluated_at).getTime()) / 864e5;
    let stage = lead.followup_stage ?? 0;
    // Buyers skip the sales follow-ups and wait for D30.
    if (stage < 3 && (lead.converted_to_student || bought.has(lead.email.toLowerCase()))) stage = 3;
    // A missed day doesn't send two emails at once: only the latest one that's due.
    let next = stage;
    for (let s = stage + 1; s <= 4; s++) if (days >= DUE[s]) next = s;
    if (next === stage) {
      if (stage !== lead.followup_stage) await admin.from("leads").update({ followup_stage: stage }).eq("id", lead.id);
      continue;
    }
    try {
      const status = await sendFollowUp(admin, next as 1 | 2 | 3 | 4, lead as LeadForEmail);
      await admin.from("leads").update({ followup_stage: next }).eq("id", lead.id);
      if (status === "sent" || status === "stubbed") sent++;
    } catch (e) {
      // Temporary failure: the stage stays, so tomorrow's run tries again.
      console.error("follow-up failed", lead.id, e instanceof Error ? e.message : e);
    }
  }
  return { status: 200, body: { ok: true, sent } };
}
