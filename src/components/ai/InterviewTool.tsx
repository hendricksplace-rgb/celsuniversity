"use client";

// Interview Practice (board "App — IA CelsGLOBAL", phones 5–8): choose → question (record up to 2:00) →
// STAR feedback → session summary (also emailed). Transcription and feedback run in the ai-tools function.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { INTERVIEW_KEYS, QUESTIONS, type InterviewFeedback, type InterviewKey, type InterviewSummary } from "@/lib/ai-tools";
import { fill } from "@/components/course/kit";
import { AiHeader, aiShell } from "./ResumeTool";
import { useRecorder } from "./useRecorder";

type T = Dictionary["ai"];
const GOLD = "linear-gradient(180deg, #EBD08C 0%, #C7A24E 100%)";
const STAR = ["situation", "task", "action", "result"] as const;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function speakEn(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  speechSynthesis.speak(u);
}

type Answer = { key: InterviewKey; feedback: InterviewFeedback; transcript: string; duration: number };
type Screen = { s: "choose" } | { s: "question"; i: number } | { s: "feedback"; i: number; answer: Answer } | { s: "summary"; summary: InterviewSummary };

// ---------- Screens ----------

function QuestionScreen({
  t,
  keyName,
  i,
  total,
  audio,
  onAnswer,
  onClose,
  busy,
  error,
}: {
  t: T;
  keyName: InterviewKey;
  i: number;
  total: number;
  audio: string | null;
  onAnswer: (blob: Blob, s: number) => void;
  onClose: () => void;
  busy: boolean;
  error: string | null;
}) {
  const q = QUESTIONS[keyName];
  const [es, setEs] = useState(true);
  const { state, seconds, levels, start, stop } = useRecorder(onAnswer);
  const player = useRef<HTMLAudioElement | null>(null);
  const listen = () => {
    if (audio) {
      player.current?.pause();
      player.current = new Audio(audio);
      player.current.play().catch(() => speakEn(q.en));
    } else speakEn(q.en);
  };
  const recording = state === "recording";
  // The interviewer asks the question as the screen opens (the tap that opened it allows playback),
  // and goes quiet once the student records or leaves.
  useEffect(() => {
    listen();
    return () => player.current?.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (recording) player.current?.pause();
  }, [recording]);
  return (
    <div className="-mx-4 -mt-6 flex min-h-[calc(100dvh-7.5rem)] flex-col bg-[#14182B] px-5 pb-8 pt-5 text-white sm:mx-auto sm:mt-0 sm:max-w-[560px] sm:rounded-[28px] md:-mt-2">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} aria-label="✕" className="kit-focus-light grid size-9 place-items-center rounded-full bg-white/10">
          ✕
        </button>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#EBD08C]">{fill(t.questionOf, { n: i + 1, total })}</p>
        <button type="button" onClick={() => setEs((v) => !v)} aria-pressed={es} className="kit-focus-light rounded px-2 py-1 text-xs font-bold text-white/80">
          ES
        </button>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full font-serif text-lg font-semibold text-[#14182B]" style={{ background: GOLD }} aria-hidden>
          S
        </span>
        <div>
          <p className="font-bold">{t.interviewer}</p>
          <p className="text-xs text-white/70">{t.interviewerRole}</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-[#F4F1EA] p-5 text-[#14182B]">
        <h2 className="font-serif text-[26px] font-semibold leading-tight">{q.en}</h2>
        {es && <p className="mt-1.5 text-sm text-[#5B6273]">{q.es}</p>}
        <button type="button" onClick={listen} className="kit-focus mt-3 rounded text-sm font-bold text-[#2E6F86]">
          🔊 {t.listen}
        </button>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-white/80">{t.think}</p>

      <div className="mt-auto flex flex-col items-center gap-3 pt-8">
        {busy ? (
          <p className="py-10 text-center font-semibold text-white/90" role="status">
            {t.evaluating}
          </p>
        ) : (
          <>
            <div className="flex h-12 items-center gap-1" aria-hidden>
              {levels.map((l, k) => (
                <span key={k} className="w-1.5 rounded-full bg-[#EBD08C]" style={{ height: `${recording ? Math.round(8 + l * 40) : 10}px`, opacity: recording ? 1 : 0.4 }} />
              ))}
            </div>
            <p className="font-serif text-3xl font-semibold" aria-live="off">
              {clock(seconds)} <span className="text-base font-normal text-white/60">/ 2:00</span>
            </p>
            <button
              type="button"
              onClick={() => (recording ? stop() : void start())}
              aria-label={recording ? t.stopRec : t.record}
              className={`kit-focus-light grid size-24 place-items-center rounded-full shadow-[0_0_0_10px_rgba(199,162,78,.18)] ${recording ? "kit-pulse" : ""}`}
              style={{ background: GOLD }}
            >
              {recording ? (
                <span className="size-8 rounded-md bg-[#14182B]" />
              ) : (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#14182B" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="#14182B" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              )}
            </button>
            <p className="text-xs text-white/70">{recording ? t.recording : t.record}</p>
          </>
        )}
        {(state === "denied" || state === "unsupported" || error) && (
          <p className="text-center text-sm font-semibold text-[#FFB3C0]" role="alert">
            {state === "denied" ? t.micDenied : state === "unsupported" ? t.noRecorder : error}
          </p>
        )}
      </div>
    </div>
  );
}

function FeedbackScreen({ t, i, answer, last, onRetry, onNext }: { t: T; i: number; answer: Answer; last: boolean; onRetry: () => void; onNext: () => void }) {
  const f = answer.feedback;
  const chip = (ok: boolean, label: string) => (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${ok ? "bg-[#E1EEF2] text-[#1F5568]" : "bg-[#F6ECD3] text-[#7A5810]"}`}>
      {label} {ok ? "✓" : `· ${t.missing}`}
    </span>
  );
  return (
    <div className={aiShell}>
      <AiHeader t={t} icon="interview" kicker={fill(t.feedbackKicker, { n: i + 1, q: QUESTIONS[answer.key].short.toUpperCase() })} title={t.feedbackTitle} backHref="/app/herramientas/entrevista" />
      <div className="mt-5 flex items-start gap-3">
        <p className="font-serif text-4xl font-semibold text-[#2E6F86]">{f.score}/4</p>
        <p className="pt-1 text-sm font-semibold leading-snug">{f.verdict_es}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chip(f.under_two_minutes, (f.under_two_minutes ? t.chipTime : t.chipTimeOver).replace("{t}", clock(answer.duration)).replace(/ · .*$/, ""))}
        {chip(f.clear_english, t.chipEnglish)}
        {chip(f.positive_ending, t.chipEnding)}
      </div>
      <ul className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-[0_0_0_1px_#E3DDD0]">
        {STAR.map((k) => {
          const p = f.star[k];
          return (
            <li key={k} className="flex gap-3">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-lg font-serif text-sm font-bold ${p.found ? "bg-[#14182B] text-white" : "text-[#C7A24E] shadow-[inset_0_0_0_1.5px_#C7A24E]"}`}
                aria-hidden
              >
                {t.star[k][0]}
              </span>
              <span className="text-sm">
                <strong>
                  {t.star[k]} {p.found ? "✓" : `· ${t.improve}`}
                </strong>
                <span className="block text-[#5B6273]">{p.note}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {f.suggested_line && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_0_0_1px_#E3DDD0]">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2E6F86]">{t.closeTitle}</p>
          <p className="mt-2 font-serif text-[15px] leading-relaxed">“{f.suggested_line}”</p>
          <button type="button" onClick={() => speakEn(f.suggested_line)} className="kit-focus mt-2 rounded text-sm font-bold text-[#2E6F86]">
            🔊 {t.listenLine}
          </button>
        </div>
      )}
      <details className="mt-3 text-sm text-[#5B6273]">
        <summary className="kit-focus cursor-pointer rounded py-1">{t.transcript}</summary>
        <p className="mt-1 rounded-xl bg-white/70 p-3 italic">{answer.transcript || "—"}</p>
      </details>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onRetry} className="kit-focus rounded-xl bg-white py-3.5 font-extrabold shadow-[0_0_0_1px_#E3DDD0]">
          {t.retry}
        </button>
        <button type="button" onClick={onNext} className="kit-focus rounded-xl py-3.5 font-extrabold" style={{ background: GOLD }}>
          {last ? t.finish : t.next}
        </button>
      </div>
    </div>
  );
}

function SummaryScreen({ t, summary, backHref, onPractice }: { t: T; summary: InterviewSummary; backHref: string; onPractice: (k: InterviewKey) => void }) {
  const weakest = [...summary.questions].sort((a, b) => a.score - b.score)[0];
  const weakestIndex = weakest ? INTERVIEW_KEYS.indexOf(weakest.key as InterviewKey) : -1;
  return (
    <div className="-mx-4 -mt-6 min-h-[calc(100dvh-7.5rem)] bg-[#F4F1EA] pb-10 sm:mx-auto sm:mt-0 sm:max-w-[560px] sm:overflow-hidden sm:rounded-[28px] md:-mt-2">
      <div className="px-5 pb-6 pt-8 text-center text-white" style={{ background: "linear-gradient(180deg, #14182B 0%, #22305A 70%, #2E6F86 100%)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ai/icon-interview-practice.svg" alt="" width={56} height={56} className="mx-auto" />
        <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#EBD08C]">{t.summaryKicker}</p>
        <h1 className="mt-1 font-serif text-[28px] font-semibold" role="status">
          {fill(t.summaryTitle, { n: summary.points, max: summary.max })}
        </h1>
        {summary.strength_es && <p className="mt-2 text-sm text-white/85">{fill(t.summaryStrength, { s: summary.strength_es })}</p>}
        {summary.improve_es && <p className="mt-1 text-sm text-white/85">{fill(t.summaryPractice, { s: summary.improve_es })}</p>}
      </div>
      <div className="space-y-3 px-5 pt-5">
        <ul className="space-y-2">
          {summary.questions.map((q) => (
            <li key={q.key} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-[0_0_0_1px_#E3DDD0]">
              <span className="font-serif text-[15px]">{QUESTIONS[q.key as InterviewKey]?.short ?? q.key}</span>
              <strong className="font-serif text-lg text-[#2E6F86]">{q.score}/4</strong>
            </li>
          ))}
        </ul>
        <p className="rounded-xl bg-white/70 p-3 text-sm text-[#5B6273]">📧 {t.summaryEmail}</p>
        {weakest && weakest.score < 4 && (
          <button type="button" onClick={() => onPractice(weakest.key as InterviewKey)} className="kit-focus block w-full rounded-xl py-3.5 font-extrabold" style={{ background: GOLD }}>
            {fill(t.practiceAgain, { n: weakestIndex + 1 })}
          </button>
        )}
        <Link href={backHref} className="kit-focus block w-full rounded-xl bg-white py-3.5 text-center font-extrabold shadow-[0_0_0_1px_#E3DDD0]">
          {backHref.startsWith("/app/cursos/") ? t.backWeek : t.backRoute}
        </Link>
      </div>
    </div>
  );
}

export function InterviewTool({
  t,
  userId,
  audio,
  best,
  backHref = "/app/programas/celsglobal",
}: {
  t: T;
  userId: string;
  audio: Partial<Record<InterviewKey, string>>;
  best: Partial<Record<InterviewKey, number>>;
  /** Where "back" goes: CelsGLOBAL by default, or the CelsBSNS week the tool was opened from. */
  backHref?: string;
}) {
  const [screen, setScreen] = useState<Screen>({ s: "choose" });
  const [plan, setPlan] = useState<{ keys: InterviewKey[]; mode: "full" | "single" | "random" }>({ keys: [], mode: "single" });
  const [session, setSession] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = (keys: InterviewKey[], mode: "full" | "single" | "random") => {
    setPlan({ keys, mode });
    setSession(null);
    setError(null);
    setScreen({ s: "question", i: 0 });
  };
  const answer = async (i: number, blob: Blob, seconds: number) => {
    const key = plan.keys[i];
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${userId}/${Date.now()}-${key}.${ext}`;
      const { error: up } = await supabase.storage.from("interview-audio").upload(path, blob, { contentType: blob.type });
      if (up) throw up;
      const { data, error: fe } = await supabase.functions.invoke("ai-tools", {
        body: { action: "interview_answer", session_id: session, mode: plan.mode, question_key: key, audio_path: path, duration_s: Math.round(seconds) },
      });
      if (fe) throw fe;
      const r = data as { session_id: string; transcript: string; feedback: InterviewFeedback };
      setSession(r.session_id);
      setScreen({ s: "feedback", i, answer: { key, feedback: r.feedback, transcript: r.transcript, duration: seconds } });
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    setBusy(true);
    const { data, error: fe } = await createClient().functions.invoke("ai-tools", { body: { action: "interview_finish", session_id: session } });
    setBusy(false);
    if (fe || !data) return setError(t.failed);
    setScreen({ s: "summary", summary: (data as { summary: InterviewSummary }).summary });
  };

  if (screen.s === "question")
    return (
      <QuestionScreen
        key={`${screen.i}:${plan.keys[screen.i]}`}
        t={t}
        keyName={plan.keys[screen.i]}
        i={screen.i}
        total={plan.keys.length}
        audio={audio[plan.keys[screen.i]] ?? null}
        busy={busy}
        error={error}
        onClose={() => setScreen({ s: "choose" })}
        onAnswer={(b, s) => void answer(screen.i, b, s)}
      />
    );
  if (screen.s === "feedback") {
    const last = screen.i >= plan.keys.length - 1;
    return (
      <FeedbackScreen
        t={t}
        i={screen.i}
        answer={screen.answer}
        last={last}
        onRetry={() => setScreen({ s: "question", i: screen.i })}
        onNext={() => (last ? void finish() : setScreen({ s: "question", i: screen.i + 1 }))}
      />
    );
  }
  if (screen.s === "summary") return <SummaryScreen t={t} summary={screen.summary} backHref={backHref} onPractice={(k) => begin([k], "single")} />;

  return (
    <div className={aiShell}>
      <AiHeader t={t} icon="interview" title={t.interviewTitle} backHref={backHref} />
      <p className="mt-5 text-sm leading-relaxed text-[#3A4258]">{t.interviewIntro}</p>
      <div className="mt-4 flex gap-3 rounded-2xl bg-[#14182B] p-4 text-white">
        <strong className="font-serif text-lg text-[#EBD08C]">{t.starTitle}</strong>
        <p className="text-sm text-white/85">{t.starText}</p>
      </div>
      <h2 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#5B6273]">{t.classics}</h2>
      <ul className="mt-2 space-y-2">
        {INTERVIEW_KEYS.map((k) => (
          <li key={k}>
            <button type="button" onClick={() => begin([k], "single")} className="kit-focus flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-[0_0_0_1px_#E3DDD0]">
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-[16px] font-semibold">{QUESTIONS[k].en}</span>
                <span className="text-sm text-[#5B6273]">{QUESTIONS[k].es}</span>
              </span>
              {best[k] != null ? <span className="shrink-0 rounded-full bg-[#E1EEF2] px-2.5 py-1 text-[11px] font-extrabold text-[#1F5568]">✓ {fill(t.best, { n: best[k]! })}</span> : <span aria-hidden className="text-[#8A8F9C]">›</span>}
            </button>
          </li>
        ))}
      </ul>
      {busy && (
        <p className="mt-4 text-center text-sm" role="status">
          {t.evaluating}
        </p>
      )}
      {error && (
        <p className="mt-4 text-center text-sm font-semibold text-[#A3123F]" role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 space-y-3">
        <button type="button" onClick={() => begin([...INTERVIEW_KEYS], "full")} className="kit-focus block w-full rounded-xl py-3.5 font-extrabold" style={{ background: GOLD }}>
          {t.full}
        </button>
        <button
          type="button"
          onClick={() => begin([INTERVIEW_KEYS[Math.floor(Math.random() * INTERVIEW_KEYS.length)]], "random")}
          className="kit-focus block w-full rounded-xl bg-white py-3.5 font-extrabold shadow-[0_0_0_1px_#E3DDD0]"
        >
          {t.random}
        </button>
      </div>
    </div>
  );
}
