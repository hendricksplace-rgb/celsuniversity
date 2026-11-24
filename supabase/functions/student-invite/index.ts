// «Enviar invitación» (Admin → Estudiantes). POST JSON:
//   { action: "send", user_ids: uuid[] (≤ 50), resend?: boolean, template?: "invite-general" | "invite-celsglobal" }
//       Authorization: an admin's JWT (public.can_send_invites(), called as the caller = private.is_admin()).
//       For each user: a random token (only its sha256 is stored in public.student_invites), then the
//       invitation email. C-071: `template`, or else chooseInviteTemplate (invite-celsglobal for old-platform
//       CelsGLOBAL-only students, invite-general for everyone else).
//         invite-celsglobal  boton_url = ${SITE_URL}/activar?t=<token> (set a password).
//         invite-general     boton_url = ${SITE_URL}/entrar?email=<email>&next=/app/cursos (sign in with an email
//                            code, C-039); the token is stored but never mailed, and the row counts as activated on
//                            the first sign-in (trigger private.on_auth_sign_in_invite). cursos_html and
//                            programas_resumen come from the student's active access.
//       Without resend, people who
//       already got one are skipped ("already"). dedupe_key invite:<user_id>:<n>, n = 1, 2, … per send.
//   { action: "preview", user_ids: uuid[] (≤ 200) }
//       Admin only: { templates: { <user_id>: "invite-general" | "invite-celsglobal" } }, nothing sent (C-071:
//       Admin → Estudiantes shows which email will go out).
//   { action: "redeem", token }
//       Public (the token is the credential). Called by the app's /activar page. While the invitation is
//       valid (30 days, password not set yet; re-clicks are fine) it returns a fresh recovery token_hash
//       from auth.admin.generateLink, which /auth/confirm verifies server-side. action_link is never exposed.
//
// Deployed with verify_jwt = true: the app sends its key (anonymous) or the admin's session.
import { createClient } from "npm:@supabase/supabase-js@2";
import { firstName, sendTemplate, siteUrl } from "../_shared/mailer.ts";
import { logFunctionError } from "../_shared/errors.ts";
import { chooseInviteTemplate, inviteCoursesHtml, inviteProgramsSummary, INVITE_TEMPLATES, type InviteTemplate } from "../_shared/invite-template.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const MAX_BATCH = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 32 random bytes, base64url (43 chars). */
function newToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Fixed-window limiter shared with the evaluation (public.eval_rate_hit; the key is just text). */
async function allowed(key: string, max: number, window: string) {
  const { data, error } = await admin.rpc("eval_rate_hit", { p_ip_hash: key, p_max: max, p_window: window });
  return !error && data === true;
}

async function caller(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await admin.auth.getUser(jwt);
  if (!data.user) return null;
  const asUser = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: ok } = await asUser.rpc("can_send_invites");
  return ok === true ? data.user : null;
}

type Outcome = { user_id: string; status: "sent" | "stubbed" | "failed" | "duplicate" | "already" | "not_found"; sent_at?: string; error?: string; template?: InviteTemplate };

type C = { slug: string; title: string; sort_order: number };
const one = <T,>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x) ?? null;

/**
 * What the student has now (active, not expired): course enrollments, program enrollments, and every course
 * those add up to (a program's courses included), deduplicated, in the catalogue's order.
 */
async function access(userId: string) {
  const { data } = await admin
    .from("enrollments")
    .select("expires_at, course:courses(slug, title, sort_order), program:programs(slug, program_courses(course:courses(slug, title, sort_order)))")
    .eq("user_id", userId)
    .eq("status", "active");
  const now = Date.now();
  const courses: { slug: string }[] = [];
  const programs: { slug: string }[] = [];
  const all = new Map<string, C>();
  for (const e of data ?? []) {
    if (e.expires_at && new Date(e.expires_at).getTime() <= now) continue;
    const c = one(e.course as C | C[] | null);
    if (c) {
      courses.push(c);
      all.set(c.slug, c);
    }
    const p = one(e.program as { slug: string; program_courses: { course: C | C[] | null }[] } | null);
    if (p) {
      programs.push(p);
      for (const pc of p.program_courses ?? []) {
        const pcC = one(pc.course);
        if (pcC) all.set(pcC.slug, pcC);
      }
    }
  }
  return { courses, programs, list: [...all.values()].sort((x, y) => x.sort_order - y.sort_order) };
}

/** From the old platform: an imported profile (legacy_id) or the 2026-10-20 CelsGLOBAL import's auth mark. */
const fromOldPlatform = (legacyId: string | null | undefined, meta: Record<string, unknown> | undefined) => !!legacyId || !!meta?.imported;

async function templateFor(userId: string) {
  const [{ data: profile }, { data: au }, acc] = await Promise.all([
    admin.from("profiles").select("legacy_id").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
    access(userId),
  ]);
  return chooseInviteTemplate({ legacy: fromOldPlatform(profile?.legacy_id, au.user?.user_metadata), courses: acc.courses, programs: acc.programs });
}

async function sendOne(userId: string, by: string, resend: boolean, forced: InviteTemplate | null): Promise<Outcome> {
  const { data: profile } = await admin.from("profiles").select("id, display_name, legacy_id").eq("id", userId).maybeSingle();
  const { data: au } = await admin.auth.admin.getUserById(userId);
  const email = (au.user?.email ?? "").trim().toLowerCase();
  if (!profile || !email) return { user_id: userId, status: "not_found" };

  const { data: prev } = await admin.from("student_invites").select("seq").eq("user_id", userId).order("seq", { ascending: false }).limit(1);
  const last = prev?.[0]?.seq ?? 0;
  if (last > 0 && !resend) return { user_id: userId, status: "already" };
  const seq = last + 1;
  const acc = await access(userId);
  const template = forced ?? chooseInviteTemplate({ legacy: fromOldPlatform(profile.legacy_id, au.user?.user_metadata), courses: acc.courses, programs: acc.programs });

  const token = newToken();
  const { data: row, error } = await admin
    .from("student_invites")
    .insert({ user_id: userId, token_hash: await sha256(token), seq, sent_by: by })
    .select("id, sent_at")
    .single();
  if (error) {
    // Two sends at once for the same person: the other one won.
    if (error.code === "23505") return { user_id: userId, status: "duplicate" };
    throw new Error(error.message);
  }

  const dedupeKey = `invite:${userId}:${seq}`;
  let status: Awaited<ReturnType<typeof sendTemplate>>;
  try {
    status = await sendTemplate(admin, {
      template,
      to: email,
      vars: {
        nombre: firstName(profile.display_name) || "estudiante",
        boton_url:
          template === "invite-general"
            ? `${siteUrl()}/entrar?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/app/cursos")}`
            : `${siteUrl()}/activar?t=${token}`,
        app_url: `${siteUrl()}/app?instalar=1`,
        email,
        cursos_html: inviteCoursesHtml(acc.list),
        programas_resumen: inviteProgramsSummary(acc.list),
      },
      dedupeKey,
      userId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin.from("student_invites").update({ status: "failed", error: message.slice(0, 500) }).eq("id", row.id);
    await logFunctionError("student-invite", 500, e);
    return { user_id: userId, status: "failed", sent_at: row.sent_at, error: "send", template };
  }
  const { data: outbox } = await admin.from("email_outbox").select("id, error").eq("dedupe_key", dedupeKey).maybeSingle();
  const rowStatus = status === "sent" || status === "stubbed" ? status : status === "duplicate" ? "sent" : "failed";
  await admin
    .from("student_invites")
    .update({ status: rowStatus, email_outbox_id: outbox?.id ?? null, error: rowStatus === "failed" ? (outbox?.error ?? status) : null })
    .eq("id", row.id);
  return { user_id: userId, status: status === "optout" ? "failed" : status, sent_at: row.sent_at, template };
}

async function send(req: Request, body: Record<string, unknown>) {
  const user = await caller(req);
  if (!user) return json({ error: "forbidden" }, 403);
  const ids = Array.isArray(body.user_ids) ? [...new Set(body.user_ids.filter((x): x is string => typeof x === "string" && UUID.test(x)))] : [];
  if (!ids.length) return json({ error: "user_ids" }, 400);
  if (ids.length > MAX_BATCH) return json({ error: `max ${MAX_BATCH} per call` }, 400);
  const forced = typeof body.template === "string" ? body.template : null;
  if (forced !== null && !INVITE_TEMPLATES.includes(forced as InviteTemplate)) return json({ error: "template" }, 400);
  if (!(await allowed(`invite-send:${user.id}`, 30, "10 minutes"))) return json({ error: "rate" }, 429);
  const results: Outcome[] = [];
  for (const id of ids) results.push(await sendOne(id, user.id, body.resend === true, forced as InviteTemplate | null));
  return json({ ok: true, results });
}

/** Admin → Estudiantes: which invitation each of these students would get now (nothing is sent). */
async function preview(req: Request, body: Record<string, unknown>) {
  const user = await caller(req);
  if (!user) return json({ error: "forbidden" }, 403);
  const ids = Array.isArray(body.user_ids) ? [...new Set(body.user_ids.filter((x): x is string => typeof x === "string" && UUID.test(x)))] : [];
  if (ids.length > 200) return json({ error: "max 200 per call" }, 400);
  const templates: Record<string, InviteTemplate> = {};
  for (let i = 0; i < ids.length; i += 10) {
    const part = ids.slice(i, i + 10);
    const got = await Promise.all(part.map(templateFor));
    part.forEach((id, j) => (templates[id] = got[j]));
  }
  return json({ ok: true, templates });
}

async function redeem(body: Record<string, unknown>) {
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return json({ ok: false, reason: "unknown" });
  const hash = await sha256(token);
  if (!(await allowed(`invite-redeem:${hash.slice(0, 32)}`, 15, "1 hour"))) return json({ ok: false, reason: "rate" }, 429);
  const { data: inv } = await admin.from("student_invites").select("id, user_id, expires_at, redeemed_at, redeem_count, activated_at").eq("token_hash", hash).maybeSingle();
  if (!inv) return json({ ok: false, reason: "unknown" });
  const { data: au } = await admin.auth.admin.getUserById(inv.user_id);
  const email = au.user?.email ?? null;
  if (!email) return json({ ok: false, reason: "unknown" });
  if (inv.activated_at) return json({ ok: false, reason: "used", email });
  if (new Date(inv.expires_at).getTime() < Date.now()) return json({ ok: false, reason: "expired", email });

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl()}/nueva-contrasena?next=/app/cursos` },
  });
  const hashed = link?.properties?.hashed_token;
  if (error || !hashed) throw new Error(`generateLink: ${error?.message ?? "no token"}`);
  await admin
    .from("student_invites")
    .update({ redeemed_at: inv.redeemed_at ?? new Date().toISOString(), redeem_count: (inv.redeem_count ?? 0) + 1 })
    .eq("id", inv.id);
  return json({ ok: true, token_hash: hashed, type: "recovery", email });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.action === "send") return await send(req, body);
    if (body.action === "redeem") return await redeem(body);
    if (body.action === "preview") return await preview(req, body);
    return json({ error: "action" }, 400);
  } catch (e) {
    await logFunctionError("student-invite", 500, e);
    return json({ error: "server" }, 500);
  }
});
