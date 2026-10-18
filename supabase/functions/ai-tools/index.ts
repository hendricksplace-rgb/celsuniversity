// CelsGLOBAL AI tools (celsu-ai-tools-spec.md). POST JSON:
//   Student actions (Authorization: the student's JWT; CelsGLOBAL access or staff, public.can_use_ai_tools()):
//     { action: "resume_submit", file_path?, file_name?, text? }  evaluate now, reveal after 48 h
//     { action: "interview_answer", session_id?, mode, question_key, audio_path, duration_s }
//     { action: "interview_finish", session_id }                  summary + email
//   Job (header x-job-token = job_tokens 'ai-tools', from private.kick_resume_ready via pg_cron):
//     { action: "notify_resumes" }  "Tu revisión de resume está lista" for every review past its hold
//
// Deployed with verify_jwt = false: it checks the student's JWT itself, and pg_net sends the anon key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { esc, firstName, sendTemplate, siteUrl } from "../_shared/mailer.ts";
import { evaluateResume, extractResumeText } from "./resume.ts";
import { QUESTIONS, evaluateAnswer, summarize, transcribe, type Feedback } from "./interview.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const HOLD_MS = 48 * 3600 * 1000;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

async function student(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data } = await admin.auth.getUser(jwt);
  if (!data.user) return null;
  const asUser = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: ok } = await asUser.rpc("can_use_ai_tools");
  return ok ? data.user : null;
}

async function profileOf(userId: string) {
  const { data } = await admin.from("profiles").select("email, display_name").eq("id", userId).maybeSingle();
  return { email: (data?.email ?? "").trim().toLowerCase(), name: firstName(data?.display_name ?? "") || "estudiante" };
}

// ---------- Resume Review ----------

async function resumeSubmit(userId: string, body: Record<string, unknown>) {
  // One active review at a time: one still inside its 48-hour hold.
  const { data: active } = await admin
    .from("resume_reviews")
    .select("id, unlock_at")
    .eq("user_id", userId)
    .eq("status", "ready")
    .gt("unlock_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (active) return json({ id: active.id, alreadyActive: true });

  let text = typeof body.text === "string" ? body.text.trim() : "";
  const path = typeof body.file_path === "string" ? body.file_path : null;
  const fileName = typeof body.file_name === "string" ? body.file_name.slice(0, 200) : (path?.split("/").pop() ?? null);
  if (!text && path) {
    if (!path.startsWith(`${userId}/`)) return json({ error: "file" }, 403);
    const { data: file, error } = await admin.storage.from("resumes").download(path);
    if (error || !file) return json({ error: "file" }, 404);
    if (file.size > MAX_RESUME_BYTES) return json({ error: "too_big" }, 413);
    try {
      text = await extractResumeText(new Uint8Array(await file.arrayBuffer()), fileName ?? path);
    } catch (e) {
      console.error("resume text", e instanceof Error ? e.message : e);
      return json({ error: "unsupported" }, 400);
    }
  }
  if (!text) return json({ error: path ? "no_text" : "empty" }, 400);

  const result = await evaluateResume(text);
  const invalid = result.valid === false;
  const now = Date.now();
  const { data: row, error } = await admin
    .from("resume_reviews")
    .insert({
      user_id: userId,
      file_path: path,
      file_name: fileName ?? (body.text ? "Texto pegado" : null),
      original_text: text,
      result,
      status: invalid ? "invalid" : "ready",
      // Not a resume: say so right away, no wait.
      unlock_at: new Date(invalid ? now : now + HOLD_MS).toISOString(),
      notified_at: invalid ? new Date(now).toISOString() : null,
    })
    .select("id, status, unlock_at")
    .single();
  if (error) throw error;
  return json(row);
}

async function notifyResumes() {
  const { data: due } = await admin
    .from("resume_reviews")
    .select("id, user_id, file_name, created_at")
    .eq("status", "ready")
    .is("notified_at", null)
    .lte("unlock_at", new Date().toISOString())
    .limit(50);
  let sent = 0;
  for (const r of due ?? []) {
    const p = await profileOf(r.user_id);
    if (p.email) {
      try {
        const status = await sendTemplate(admin, {
          template: "resume-ready",
          to: p.email,
          userId: r.user_id,
          dedupeKey: `resume-ready:${r.id}`,
          vars: {
            nombre: p.name,
            archivo: r.file_name ?? "tu resume",
            fecha: new Date(r.created_at).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "long", timeStyle: "short" }),
            boton_url: `${siteUrl()}/app/herramientas/resume?id=${r.id}`,
          },
        });
        if (status === "sent" || status === "stubbed") sent++;
      } catch (e) {
        console.error("resume-ready", r.id, e instanceof Error ? e.message : e);
        continue; // temporary: the next run tries again
      }
    }
    await admin.from("resume_reviews").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
  }
  return json({ due: due?.length ?? 0, sent });
}

// ---------- Interview Practice ----------

async function interviewAnswer(userId: string, body: Record<string, unknown>) {
  const key = String(body.question_key ?? "");
  const q = QUESTIONS[key];
  const audioPath = typeof body.audio_path === "string" ? body.audio_path : "";
  const duration = Math.max(0, Math.min(600, Number(body.duration_s) || 0));
  if (!q || !audioPath.startsWith(`${userId}/`)) return json({ error: "body" }, 400);

  let sessionId = typeof body.session_id === "string" ? body.session_id : null;
  if (sessionId) {
    const { data: s } = await admin.from("interview_sessions").select("id").eq("id", sessionId).eq("user_id", userId).maybeSingle();
    if (!s) sessionId = null;
  }
  if (!sessionId) {
    const mode = ["full", "single", "random"].includes(String(body.mode)) ? String(body.mode) : "single";
    const { data: s, error } = await admin.from("interview_sessions").insert({ user_id: userId, mode }).select("id").single();
    if (error) throw error;
    sessionId = s.id;
  }

  const { data: audio, error: dl } = await admin.storage.from("interview-audio").download(audioPath);
  if (dl || !audio) return json({ error: "audio" }, 404);
  const transcript = audio.size > 0 ? await transcribe(audio, audioPath.split("/").pop() ?? "answer.webm") : "";
  const feedback = await evaluateAnswer(q.en, duration, transcript);
  const { data: row, error } = await admin
    .from("interview_answers")
    .insert({ session_id: sessionId, user_id: userId, question_key: key, audio_path: audioPath, transcript, duration_s: duration, feedback, score: feedback.score })
    .select("id")
    .single();
  if (error) throw error;
  return json({ session_id: sessionId, answer_id: row.id, transcript, feedback });
}

async function interviewFinish(userId: string, body: Record<string, unknown>) {
  const sessionId = String(body.session_id ?? "");
  const { data: s } = await admin.from("interview_sessions").select("id, summary").eq("id", sessionId).eq("user_id", userId).maybeSingle();
  if (!s) return json({ error: "session" }, 404);
  const { data: answers } = await admin.from("interview_answers").select("question_key, score, feedback").eq("session_id", sessionId).order("created_at");
  if (!answers?.length) return json({ error: "empty" }, 400);
  const summary = summarize(answers as { question_key: string; score: number | null; feedback: Feedback | null }[]);
  await admin.from("interview_sessions").update({ summary, finished_at: new Date().toISOString() }).eq("id", sessionId);

  const p = await profileOf(userId);
  if (p.email) {
    const rows = summary.questions
      .map(
        (x) =>
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;"><tr><td bgcolor="#FFFFFF" style="padding:14px 16px;border:1px solid #E3DDD0;border-radius:14px;background:#FFFFFF;font-family:'Plus Jakarta Sans', Arial, Helvetica, sans-serif;font-size:14px;line-height:1.5;color:#3A4258;"><strong style="font-family:'Source Serif 4', Georgia, serif;font-size:16px;color:#14182B;">${esc(QUESTIONS[x.key]?.en ?? x.key)}</strong> <span style="float:right;font-weight:800;color:#2E6F86;">${x.score}/4</span>${
            x.suggested_line ? `<br><span style="color:#5B6273;">Así lo podrías cerrar:</span> <em>“${esc(x.suggested_line)}”</em>` : ""
          }</td></tr></table>`,
      )
      .join("");
    await sendTemplate(admin, {
      template: "interview-summary",
      to: p.email,
      userId,
      dedupeKey: `interview-summary:${sessionId}`,
      vars: {
        nombre: p.name,
        puntos: String(summary.points),
        maximo: String(summary.max),
        fortaleza: summary.strength_es || "Respondiste con calma y en inglés.",
        practicar: summary.improve_es || "Practica el método STAR con una historia real.",
        preguntas_html: rows,
        boton_url: `${siteUrl()}/app/herramientas/entrevista`,
      },
    }).catch((e) => console.error("interview-summary", e instanceof Error ? e.message : e));
  }
  return json({ summary });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    if (body.action === "notify_resumes") {
      const { data: tok } = await admin.from("job_tokens").select("token").eq("name", "ai-tools").maybeSingle();
      if (!tok || req.headers.get("x-job-token") !== tok.token) return json({ error: "forbidden" }, 403);
      return await notifyResumes();
    }
    const user = await student(req);
    if (!user) return json({ error: "forbidden" }, 403);
    if (body.action === "resume_submit") return await resumeSubmit(user.id, body);
    if (body.action === "interview_answer") return await interviewAnswer(user.id, body);
    if (body.action === "interview_finish") return await interviewFinish(user.id, body);
    return json({ error: "action" }, 400);
  } catch (e) {
    console.error("ai-tools", body.action, e instanceof Error ? e.message : e);
    return json({ error: "failed" }, 500);
  }
});
