// «Cambiar correo» (Admin → Estudiantes → student, C-046). POST JSON with an admin's JWT:
//   { user_id: uuid, new_email: string, reason?: string, notify?: boolean (default true) }
//
// Who may do what:
//   - The caller's profiles.role must be super_admin or administrator (not director: the app's ADMIN_ROLES).
//   - administrator: student accounts only (student, individual_student).
//   - super_admin: any account. Nobody changes their own email here (they use their own profile).
//
// What it does, in order:
//   1. Refuses an email that already belongs to another account (never merges accounts).
//   2. auth.admin.updateUserById(email, email_confirm: true): applies now, no confirmation link (staff
//      verified it with the student). Sessions are kept. on_auth_user_email_changed syncs profiles.email;
//      we re-read it and fix it from the service role if the trigger didn't (logged as a warning).
//   3. Stripe: every stripe_customer_id on the user's orders gets the new email (receipts, CelsGLOBAL
//      installment notices). Past orders.email is the purchase record and is never rewritten.
//   4. Pending invitations (student_invites not activated and not expired) are expired now: the link sits in
//      the old inbox and would still set a password on this account.
//   5. One admin_audit_log row: action change_email, table_name profiles, row_id = user, before/after.
//   6. If notify: "Tu correo de CelsU cambió" to the new address and a security notice (masked new address,
//      no button) to the old one, in the student's preferred_language.
// A Stripe or email failure doesn't undo the change; the response says what happened to each.
//
// Deployed with verify_jwt = true (the app sends the admin's session).
import { createClient } from "npm:@supabase/supabase-js@2";
import { firstName, sendTemplate, siteUrl } from "../_shared/mailer.ts";
import { stripe } from "../_shared/stripe.ts";
import { logFunctionError } from "../_shared/errors.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Same shape the app checks before sending: one @, a dot in the domain, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CALLER_ROLES = ["super_admin", "administrator"];
const STUDENT_ROLES = ["student", "individual_student"];

/** "matt@gmail.com" → "ma***@gmail.com" (security notice to the old inbox). */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, Math.min(2, Math.max(1, user.length - 1)))}***@${domain}`;
}

/** Fixed-window limiter shared with the evaluation and student-invite (public.eval_rate_hit). */
async function allowed(key: string, max: number, window: string) {
  const { data, error } = await admin.rpc("eval_rate_hit", { p_ip_hash: key, p_max: max, p_window: window });
  return !error && data === true;
}

async function caller(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await admin.auth.getUser(jwt);
  if (!data.user) return null;
  const { data: p } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return p && CALLER_ROLES.includes(p.role) ? { id: data.user.id, role: p.role as string } : null;
}

/** Another account already uses this address? profiles.email mirrors auth.users.email (both triggers). */
async function emailTaken(email: string, userId: string) {
  const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await admin.from("profiles").select("id").ilike("email", pattern).neq("id", userId).limit(1);
  return (data?.length ?? 0) > 0;
}

type StripeOutcome = "updated" | "none" | "skipped" | "failed";

async function updateStripe(userId: string, email: string): Promise<StripeOutcome> {
  const { data: orders } = await admin
    .from("orders")
    .select("stripe_customer_id, created_at")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false });
  const ids = [...new Set((orders ?? []).map((o) => o.stripe_customer_id as string))];
  if (!ids.length) return "none";
  if (!Deno.env.get("STRIPE_SECRET_KEY")) return "skipped";
  try {
    for (const id of ids) await stripe.customers.update(id, { email });
    return "updated";
  } catch (e) {
    await logFunctionError("admin-change-email", null, `stripe customer update: ${e instanceof Error ? e.message : String(e)}`);
    return "failed";
  }
}

type MailOutcome = Awaited<ReturnType<typeof sendTemplate>> | "error" | "off";

async function mail(template: string, to: string, vars: Record<string, string>, dedupeKey: string, userId: string): Promise<MailOutcome> {
  try {
    return await sendTemplate(admin, { template, to, vars, dedupeKey, userId });
  } catch (e) {
    await logFunctionError("admin-change-email", 500, e);
    return "error";
  }
}

async function change(req: Request) {
  const who = await caller(req);
  if (!who) return json({ error: "forbidden" }, 403);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = typeof body.user_id === "string" ? body.user_id : "";
  const newEmail = typeof body.new_email === "string" ? body.new_email.trim().toLowerCase() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";
  const notify = body.notify !== false;
  if (!UUID.test(userId)) return json({ error: "user" }, 400);
  if (!EMAIL.test(newEmail) || newEmail.length > 254) return json({ error: "email" }, 400);
  if (userId === who.id) return json({ error: "self" }, 403);
  if (!(await allowed(`email-change:${who.id}`, 20, "10 minutes"))) return json({ error: "rate" }, 429);

  const { data: target } = await admin.from("profiles").select("id, role, display_name, preferred_language").eq("id", userId).maybeSingle();
  const { data: au } = await admin.auth.admin.getUserById(userId);
  const oldEmail = (au?.user?.email ?? "").trim().toLowerCase();
  if (!target || !au?.user) return json({ error: "not_found" }, 404);
  if (who.role !== "super_admin" && !STUDENT_ROLES.includes(target.role)) return json({ error: "staff_account" }, 403);
  if (newEmail === oldEmail) return json({ error: "same" }, 400);
  if (await emailTaken(newEmail, userId)) return json({ error: "taken" }, 409);

  const { error: authError } = await admin.auth.admin.updateUserById(userId, { email: newEmail, email_confirm: true });
  if (authError) {
    const code = (authError as { code?: string }).code ?? "";
    if (code === "email_exists" || /already (been )?registered|already exists/i.test(authError.message)) return json({ error: "taken" }, 409);
    throw new Error(`updateUserById: ${authError.message}`);
  }

  // The trigger should have copied it already; if not, fix it (no auth.uid() here, so guard_profile_update allows it).
  let profileSynced = true;
  const { data: after } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  if ((after?.email ?? "").toLowerCase() !== newEmail) {
    profileSynced = false;
    await admin.from("profiles").update({ email: newEmail }).eq("id", userId);
    await logFunctionError("admin-change-email", null, `warning: profiles.email of ${userId} was not synced by on_auth_user_email_changed; fixed from the service role`);
  }

  const stripeOutcome = await updateStripe(userId, newEmail);

  const { data: expired } = await admin
    .from("student_invites")
    .update({ expires_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("activated_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id");
  const invitesExpired = expired?.length ?? 0;

  const { data: audit, error: auditError } = await admin
    .from("admin_audit_log")
    .insert({
      actor: who.id,
      action: "change_email",
      table_name: "profiles",
      row_id: userId,
      before: { email: oldEmail },
      after: { email: newEmail, reason: reason || null, notify, stripe: stripeOutcome, invites_expired: invitesExpired, profile_synced_by_trigger: profileSynced },
    })
    .select("id, at")
    .single();
  if (auditError) await logFunctionError("admin-change-email", 500, `audit log: ${auditError.message}`);

  const emails: { new: MailOutcome; old: MailOutcome } = { new: "off", old: "off" };
  if (notify) {
    const en = target.preferred_language === "en";
    const nombre = firstName(target.display_name) || (en ? "there" : "estudiante");
    const key = `email-change:${userId}:${audit?.id ?? Date.now()}`;
    emails.new = await mail(en ? "email-changed-en" : "email-changed", newEmail, { nombre, correo_nuevo: newEmail, boton_url: `${siteUrl()}/entrar` }, `${key}:new`, userId);
    if (oldEmail) emails.old = await mail(en ? "email-changed-old-en" : "email-changed-old", oldEmail, { nombre, correo_mascara: maskEmail(newEmail) }, `${key}:old`, userId);
  }

  return json({ ok: true, email: newEmail, changed_at: audit?.at ?? new Date().toISOString(), invites_expired: invitesExpired, stripe: stripeOutcome, emails, profile_synced: profileSynced });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    return await change(req);
  } catch (e) {
    await logFunctionError("admin-change-email", 500, e);
    return json({ error: "server" }, 500);
  }
});
