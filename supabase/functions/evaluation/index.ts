// Public English evaluation API (/evaluacion). Replaces the Base44 functions startEvaluation,
// evaluateWriting, evaluateSpeaking, saveStudentEvaluation and manageLeads (create / unsubscribe).
//
// POST JSON { action: "start" | "writing" | "finish" | "unsubscribe", ... }
// POST multipart { action: "speaking", token, prompt_id, audio }
// POST JSON { action: "followups" } + header x-job-token: the daily follow-up run (pg_cron)
//
// Deployed with verify_jwt = false: it is public. A signed-in student's JWT, when sent, is
// verified here and links the attempt to their profile.
import { createClient } from "npm:@supabase/supabase-js@2";
import { FR, SPEAKING, buildResult, replay, type AnswerLog, type Goal } from "../_shared/eval-engine.ts";
import { sendResults } from "../_shared/eval-emails.ts";
import { runFollowUps } from "./followups.ts";
import { gradeSpeaking, gradeWriting } from "./grade.ts";
import { speechToText } from "./transcribe.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const STAFF = ["super_admin", "director", "administrator", "teacher"];
const RETAKE_DAYS = 30;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.com", "yopmail.com", "getnada.com",
  "trashmail.com", "fakeinbox.com", "sharklasers.com", "mintemail.com", "maildrop.cc", "dispostable.com", "throwawaymail.com",
  "mailnesia.com", "tempinbox.com", "spam4.me", "mohmal.com", "tempr.email", "discard.email",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const daysSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : Infinity);
const retakeOn = (iso: string) => new Date(new Date(iso).getTime() + RETAKE_DAYS * 864e5).toISOString();

async function ipHash(req: Request) {
  // Set by Cloudflare in front of Supabase; a client can't supply it (Cloudflare rejects that).
  const ip = req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const salt = Deno.env.get("EVAL_IP_SALT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The signed-in non-staff student behind the request, if any (staff take the public flow). */
async function studentFrom(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || jwt.startsWith("sb_")) return null; // publishable key, not a user session
  const { data } = await admin.auth.getUser(jwt);
  if (!data.user) return null;
  const { data: p } = await admin
    .from("profiles")
    .select("id, role, email, display_name, evaluation_level, evaluation_skills, evaluation_date, starting_level")
    .eq("id", data.user.id)
    .maybeSingle();
  return p && !STAFF.includes(p.role) ? p : null;
}

async function liveSession(token: unknown) {
  if (typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await admin.from("eval_sessions").select("*").eq("token", token).maybeSingle();
  return data && !data.finished_at && new Date(data.expires_at) > new Date() ? data : null;
}

async function start(req: Request) {
  const student = await studentFrom(req);
  if (student && daysSince(student.evaluation_date) < RETAKE_DAYS) {
    return json({ locked: { cefr_level: student.evaluation_level, skill_levels: student.evaluation_skills, retake_on: retakeOn(student.evaluation_date!) } });
  }
  const hash = await ipHash(req);
  const { data: allowed, error } = await admin.rpc("eval_rate_hit", { p_ip_hash: hash });
  if (error) throw error;
  if (!allowed) return json({ rate_limited: true });
  const { data, error: e2 } = await admin.from("eval_sessions").insert({ ip_hash: hash, user_id: student?.id ?? null }).select("token").single();
  if (e2) throw e2;
  return json({ token: data.token, student: !!student });
}

async function writing(body: Record<string, unknown>) {
  const session = await liveSession(body.token);
  if (!session) return json({ error: "session" }, 403);
  const level = Number(body.level);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!FR[level]) return json({ error: "level" }, 400);
  if (text.length < 10 || text.length > 2000) return json({ error: "length" }, 400);
  const { data: ok } = await admin.rpc("eval_take_ai_call", { p_token: session.token });
  if (!ok) return json({ error: "limit" }, 429);
  const result = await gradeWriting(FR[level].prompt, text);
  await admin.from("eval_sessions").update({ writing: result, writing_text: text }).eq("token", session.token);
  return json(result);
}

async function speaking(form: FormData) {
  const session = await liveSession(form.get("token"));
  if (!session) return json({ error: "session" }, 403);
  const prompt = Object.values(SPEAKING).find((p) => p.id === form.get("prompt_id"));
  const audio = form.get("audio");
  if (!prompt) return json({ error: "prompt" }, 400);
  if (!(audio instanceof Blob) || audio.size < 1000 || audio.size > MAX_AUDIO_BYTES) return json({ error: "audio" }, 400);
  const { data: ok } = await admin.rpc("eval_take_ai_call", { p_token: session.token });
  if (!ok) return json({ error: "limit" }, 429);
  const transcript = await speechToText.transcribe(audio, { language: "en" });
  const task = prompt.audio ? `${prompt.audio} (${prompt.prompt})` : prompt.prompt;
  const result = transcript.text ? await gradeSpeaking(task, prompt.rubric, transcript.text) : { band: "A1", feedback: "No pudimos escuchar tu respuesta. ¡Inténtalo de nuevo en tu próxima evaluación!" };
  await admin.from("eval_sessions").update({ speaking: { ...result, transcript: transcript.text } }).eq("token", session.token);
  return json({ ...result, transcript: transcript.text });
}

async function finish(req: Request, body: Record<string, unknown>) {
  const session = await liveSession(body.token);
  if (!session) return json({ error: "session" }, 403);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const goal: Goal = body.goal === "work" ? "work" : "general";
  if (!name) return json({ error: "name" }, 400);

  // The level comes from replaying the answers against the bank, never from the browser.
  const played = replay(Array.isArray(body.answers) ? (body.answers as AnswerLog) : []);
  if (!played) return json({ error: "answers" }, 400);
  const r = buildResult(played.results, session.writing, session.speaking, goal);
  const result = { ...r, writing: session.writing, writingText: session.writing_text };

  if (session.user_id) {
    const student = await studentFrom(req);
    if (!student || student.id !== session.user_id) return json({ error: "auth" }, 403);
    if (daysSince(student.evaluation_date) < RETAKE_DAYS) {
      return json({ locked: { cefr_level: student.evaluation_level, skill_levels: student.evaluation_skills, retake_on: retakeOn(student.evaluation_date!) } });
    }
    // Server-side write: students can't change these columns themselves (guard_profile_update).
    const now = new Date().toISOString();
    const { error } = await admin
      .from("profiles")
      .update({ evaluation_level: r.band, evaluation_skills: r.skillLevels, evaluation_date: now, ...(student.starting_level ? {} : { starting_level: r.band }) })
      .eq("id", student.id);
    if (error) throw error;
    if (student.email) {
      await sendResults(admin, { email: student.email, name: student.display_name ?? name, goal, level: r.band, skills: r.skillLevels, evaluatedAt: now, userId: student.id }).catch((e) => console.error("results email", e.message));
    }
  } else {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json({ error: "email" }, 400);
    if (DISPOSABLE.has(email.split("@")[1])) return json({ error: "disposable" }, 400);
    const { data: prev } = await admin.from("leads").select("id, evaluated_at").eq("email", email).maybeSingle(); // emails are stored lowercased
    if (prev && daysSince(prev.evaluated_at) < RETAKE_DAYS) {
      // Only the date: the earlier result went to that inbox, and is not shown to whoever typed the address.
      await admin.from("eval_sessions").update({ finished_at: new Date().toISOString() }).eq("token", session.token);
      return json({ locked: { retake_on: retakeOn(prev.evaluated_at!) } });
    }
    const row = {
      name,
      email,
      goal,
      cefr_level: r.band,
      skill_levels: r.skillLevels,
      writing_sample: session.writing_text,
      writing_feedback: session.writing ? JSON.stringify(session.writing) : null,
      recommended_product: r.recommendation.product,
      evaluated_at: new Date().toISOString(),
      converted_to_student: false,
      student_id: null,
      unsubscribed: false,
      followup_stage: 0,
    };
    const q = prev ? admin.from("leads").update(row).eq("id", prev.id) : admin.from("leads").insert(row);
    const { data: lead, error } = await q.select("id").single();
    if (error) throw error;
    await sendResults(admin, { email, name, goal, level: r.band, skills: r.skillLevels, evaluatedAt: row.evaluated_at, leadId: lead.id }).catch((e) => console.error("results email", e.message));
  }

  await admin.from("eval_sessions").update({ finished_at: new Date().toISOString(), result }).eq("token", session.token);
  return json({ result });
}

async function unsubscribe(body: Record<string, unknown>) {
  const t = typeof body.t === "string" && /^[0-9a-f-]{36}$/i.test(body.t) ? body.t : null;
  if (t) await admin.from("leads").update({ unsubscribed: true }).eq("unsubscribe_token", t);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData();
      return form.get("action") === "speaking" ? await speaking(form) : json({ error: "action" }, 400);
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    switch (body.action) {
      case "start":
        return await start(req);
      case "writing":
        return await writing(body);
      case "finish":
        return await finish(req, body);
      case "unsubscribe":
        return await unsubscribe(body);
      case "followups": {
        const r = await runFollowUps(admin, req.headers.get("x-job-token"));
        return json(r.body, r.status);
      }
      default:
        return json({ error: "action" }, 400);
    }
  } catch (e) {
    console.error("evaluation", e instanceof Error ? e.message : e);
    return json({ error: "server" }, 500);
  }
});
