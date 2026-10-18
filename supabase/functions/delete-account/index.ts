// Eliminar mi cuenta (celsu-cuenta-spec.md §6). POST { confirm: "ELIMINAR", reason? } with the student's JWT.
//   1. account_deletion_requests row (kept for ARCO tracking)
//   2. cancel any Stripe subscription (the remaining CelsGLOBAL payments)
//   3. delete the student's private files (recordings, resumes, submissions, avatar)
//   4. delete their rows; payments and orders stay for accounting, with no user and a hashed email
//   5. auth.admin.deleteUser, then completed_at and the "Tu cuenta fue eliminada" email
// Deployed with verify_jwt = false: it checks the JWT itself.
import { createClient } from "npm:@supabase/supabase-js@2";
import { firstName, sendTemplate } from "../_shared/mailer.ts";
import { stripe } from "../_shared/stripe.ts";
import { logFunctionError } from "../_shared/errors.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Rows that belong to the student. Everything else hangs off these or off auth.users (cascade).
const USER_TABLES = [
  "progress",
  "ebook_answers",
  "lesson_answers",
  "evaluation_attempts",
  "eval_sessions",
  "resume_reviews",
  "resume_submissions",
  "interview_answers",
  "interview_sessions",
  "submissions",
  "offline_downloads",
  "class_members",
  "user_preferences",
  "gamification",
  "enrollments",
  "email_outbox",
];
// Private files, one folder (or file) per student.
const FOLDERS = ["interview-audio", "resumes", "submissions", "user-uploads"];

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.trim().toLowerCase()));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Every file under `prefix` in `bucket`, folders included. */
async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error || !data?.length) break;
    for (const f of data) {
      const path = `${prefix}/${f.name}`;
      if (f.id) out.push(path);
      else out.push(...(await listAll(bucket, path)));
    }
    if (data.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = (await req.json().catch(() => ({}))) as { confirm?: string; reason?: string };
  if (body.confirm !== "ELIMINAR") return json({ error: "confirm" }, 400);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth.user;
  if (!user) return json({ error: "forbidden" }, 403);
  const uid = user.id;
  const email = (user.email ?? "").trim().toLowerCase();
  const { data: profile } = await admin.from("profiles").select("display_name, role").eq("id", uid).maybeSingle();
  // Staff accounts are removed by a super admin, not from here.
  if (["super_admin", "director", "administrator", "teacher"].includes(profile?.role ?? "")) return json({ error: "staff" }, 403);

  const { data: request, error: rq } = await admin
    .from("account_deletion_requests")
    .insert({ user_id: uid, email, reason: typeof body.reason === "string" ? body.reason.slice(0, 1000) : null })
    .select("id, requested_at")
    .single();
  if (rq) {
    await logFunctionError("delete-account:request", 500, rq.message);
    return json({ error: "failed" }, 500);
  }

  try {
    // 2. Remaining installments: cancel the subscription (only when Stripe is configured).
    const { data: orders } = await admin.from("orders").select("id, stripe_subscription_id").eq("user_id", uid);
    if (Deno.env.get("STRIPE_SECRET_KEY")) {
      for (const o of orders ?? []) {
        if (!o.stripe_subscription_id) continue;
        try {
          await stripe.subscriptions.cancel(o.stripe_subscription_id);
        } catch (e) {
          // Already cancelled or finished: nothing left to charge.
          console.warn("subscription cancel", o.id, e instanceof Error ? e.message : e);
        }
      }
    }

    // 3. Files.
    for (const bucket of FOLDERS) {
      const files = await listAll(bucket, uid);
      for (let i = 0; i < files.length; i += 100) await admin.storage.from(bucket).remove(files.slice(i, i + 100));
    }
    await admin.storage.from("avatars").remove([`${uid}.jpg`]);

    // 4. Rows. Orders and payments stay for accounting and tax, anonymized.
    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", uid);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    if (email) await admin.from("leads").delete().ilike("email", email);
    const hashed = email ? `sha256:${await sha256(email)}` : null;
    await admin.from("orders").update({ user_id: null, email: hashed, buyer_name: null }).eq("user_id", uid);
    await admin.from("payments").update({ user_id: null }).eq("user_id", uid);

    // 5. The account itself (the profile goes with it).
    const { error: du } = await admin.auth.admin.deleteUser(uid);
    if (du) throw new Error(`deleteUser: ${du.message}`);
    await admin.from("account_deletion_requests").update({ completed_at: new Date().toISOString() }).eq("id", request.id);
  } catch (e) {
    await logFunctionError("delete-account", 500, e);
    return json({ error: "failed" }, 500);
  }

  if (email) {
    await sendTemplate(admin, {
      template: "account-deleted",
      to: email,
      dedupeKey: `account-deleted:${uid}`,
      vars: {
        nombre: firstName(profile?.display_name) || "",
        fecha: new Date(request.requested_at).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "long" }),
      },
    }).catch((e) => logFunctionError("delete-account:email", null, e));
  }
  return json({ ok: true });
});
