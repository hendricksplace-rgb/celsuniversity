"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  finished,
  gradable,
  optionsCorrect,
  shuffle,
  shuffledOptions,
  spokenCorrect,
  type CivicsExam,
  type CivicsQuestion,
} from "@/lib/civics";
import type { Clip, useExamAudio } from "./audio";
import { useSpeechAnswer } from "./audio";
import { fill, type CivicsT } from "./shared";
import { Seal } from "./Seal";

type Audio = ReturnType<typeof useExamAudio>;
type Result = { q: CivicsQuestion; ok: boolean; via: "voice" | "options"; heard?: string };

type Props = {
  exam: CivicsExam;
  /** true: mock interview in English, answered out loud. false: multiple choice in Spanish. */
  voice: boolean;
  audio: Audio;
  userId: string;
  t: CivicsT;
  onAgain: () => void;
  onMenu: () => void;
};

/** One sitting: questions drawn at random, stopping as soon as the result is decided (USCIS rule). */
export function ExamRunner({ exam, voice, audio, userId, t, onAgain, onMenu }: Props) {
  // Drawn once, in the browser (no server/client mismatch).
  const [order] = useState(() => shuffle(exam.questions.filter(gradable)).slice(0, exam.count));
  const [results, setResults] = useState<Result[]>([]);
  const right = results.filter((r) => r.ok).length;
  const wrong = results.length - right;
  const outcome = finished(exam, right, wrong) ?? (results.length >= order.length ? "failed" : null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [results.length]);

  if (outcome) return <Finish exam={exam} results={results} passed={outcome === "passed"} userId={userId} t={t} onAgain={onAgain} onMenu={onMenu} />;

  const q = order[results.length];
  return (
    <div ref={top} className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="t-muted font-semibold uppercase tracking-wide">
          {t.question} {results.length + 1}
        </span>
        <span className="flex gap-3">
          <span className="text-green-600">
            ✓ {t.right}: {right}/{exam.pass}
          </span>
          <span className="text-red-600">
            ✗ {t.wrong}: {wrong}
          </span>
        </span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: exam.count }, (_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < results.length ? (results[i].ok ? "#15803d" : "#b91c1c") : "var(--t-border)" }}
          />
        ))}
      </div>
      <Question
        key={q.id}
        q={q}
        voice={voice}
        audio={audio}
        t={t}
        last={!!finished(exam, right + 1, wrong) || !!finished(exam, right, wrong + 1) || results.length + 1 >= order.length}
        onDone={(r) => setResults((prev) => [...prev, r])}
      />
    </div>
  );
}

type Phase = { name: "ask" } | { name: "heard"; heard: string; error?: string } | { name: "options" } | { name: "done"; result: Result };

function Question({
  q,
  voice,
  audio,
  t,
  last,
  onDone,
}: {
  q: CivicsQuestion;
  voice: boolean;
  audio: Audio;
  t: CivicsT;
  last: boolean;
  onDone: (r: Result) => void;
}) {
  const speech = useSpeechAnswer();
  const [phase, setPhase] = useState<Phase>(voice ? { name: "ask" } : { name: "options" });
  const [showText, setShowText] = useState(true);
  const [options] = useState(() => shuffledOptions(voice ? q.options_en : q.options_es));
  const [picked, setPicked] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);

  const questionClip: Clip = voice
    ? { ref: q.audio.q ?? q.audio.q_en, text: q.q_en, lang: "en-US" }
    : { ref: q.audio.q_es ?? q.audio.q, text: q.q_es, lang: "es-US" };
  const englishClips: Clip[] = [
    { ref: q.audio.q_en, text: q.q_en, lang: "en-US" },
    { ref: q.audio.a_en, text: q.answers_en[0] ?? "", lang: "en-US" },
  ];

  // The officer asks as soon as the question appears (the student's tap on "Next" allows audio).
  useEffect(() => {
    if (voice) void audio.play([questionClip]);
    return () => audio.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per question
  }, [q.id]);

  const answerOutLoud = async () => {
    audio.stop();
    const res = await speech.listen();
    setAttempts((a) => a + 1);
    const hit = res.alternatives.find((alt) => spokenCorrect(q, alt));
    if (hit !== undefined) return setPhase({ name: "done", result: { q, ok: true, via: "voice", heard: hit } });
    const error = res.error === "blocked" ? t.micBlocked : res.error ? t.noSpeech : t.notMatched;
    setPhase({ name: "heard", heard: res.alternatives[0] ?? "", error });
  };

  const check = () => setPhase({ name: "done", result: { q, ok: optionsCorrect(q, picked), via: "options" } });
  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : q.need === 1 ? [i] : p.length < q.need ? [...p, i] : p));

  const done = phase.name === "done" ? phase.result : null;

  return (
    <div className="space-y-4">
      {voice ? (
        <div className="t-card space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl" style={{ background: "var(--t-accent)", color: "var(--t-accent-ink)" }} aria-hidden>
              👮
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{t.officer}</p>
              <p className="t-muted text-xs">{audio.playing ? "🔊 …" : " "}</p>
            </div>
            <button type="button" className="t-btn-ghost ml-auto !px-3 !py-1.5 text-sm" onClick={() => void audio.play([questionClip])}>
              ↻ {t.replay}
            </button>
          </div>
          <button type="button" className="t-link text-xs" onClick={() => setShowText((s) => !s)} aria-expanded={showText}>
            {showText ? t.hideText : t.showText}
          </button>
          {(showText || done) && (
            <p className="text-sm opacity-90" lang="en">
              {q.q_en}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="t-heading text-[1.35em] leading-snug">
            {q.q_es} {q.star && <span title={t.starNote}>*</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="t-btn-ghost !px-3 !py-1.5 text-sm" onClick={() => void audio.play([questionClip])}>
              🔊 {t.listenQuestion}
            </button>
            <button type="button" className="t-btn-ghost !px-3 !py-1.5 text-sm" onClick={() => void audio.play(englishClips)}>
              🇺🇸 {t.hearEnglish}
            </button>
          </div>
        </div>
      )}

      {phase.name === "ask" && (
        <div className="space-y-3">
          {speech.supported ? (
            speech.listening ? (
              <div className="space-y-2" aria-live="polite">
                <p className="font-semibold">🎤 {t.listening}</p>
                {speech.interim && <p className="t-muted italic" lang="en">“{speech.interim}”</p>}
                <button type="button" className="t-btn" onClick={speech.stopListening}>
                  {t.stop}
                </button>
              </div>
            ) : (
              <button type="button" className="t-btn w-full !py-3 text-base" onClick={() => void answerOutLoud()}>
                🎤 {t.answerVoice}
              </button>
            )
          ) : (
            <p className="t-muted text-sm">{t.noVoiceSupport}</p>
          )}
          {!speech.listening && (
            <button type="button" className="t-btn-ghost w-full" onClick={() => setPhase({ name: "options" })}>
              {t.useOptions}
            </button>
          )}
        </div>
      )}

      {phase.name === "heard" && (
        <div className="space-y-3" aria-live="polite">
          {phase.heard && (
            <p>
              {t.heard}: <span className="italic" lang="en">“{phase.heard}”</span>
            </p>
          )}
          <p className="t-muted text-sm">{phase.error}</p>
          <div className="flex flex-wrap gap-2">
            {speech.supported && attempts < 3 && (
              <button type="button" className="t-btn" onClick={() => void answerOutLoud()}>
                🎤 {t.tryAgain}
              </button>
            )}
            <button type="button" className="t-btn-ghost" onClick={() => setPhase({ name: "options" })}>
              {t.useOptions}
            </button>
          </div>
        </div>
      )}

      {(phase.name === "options" || (done && done.via === "options")) && (
        <div className="space-y-2">
          {q.need > 1 && <p className="text-sm font-semibold">{fill(t.pickN, { n: q.need })}</p>}
          {options.map((o) => {
            const on = picked.includes(o.index);
            const state = !done ? (on ? "ring-2 ring-[var(--t-accent)]" : "") : q.correct.includes(o.index) ? "t-opt-correct" : on ? "t-opt-wrong" : "t-opt-dim";
            return (
              <button
                key={o.index}
                type="button"
                disabled={!!done}
                aria-pressed={on}
                onClick={() => toggle(o.index)}
                lang={voice ? "en" : "es"}
                className={`w-full rounded-[var(--t-radius)] border border-[var(--t-border)] p-3 text-left transition enabled:hover:bg-[var(--t-border)] ${state}`}
              >
                {o.text}
              </button>
            );
          })}
          {!done && (
            <button type="button" className="t-btn" disabled={picked.length !== q.need} onClick={check}>
              {t.check}
            </button>
          )}
        </div>
      )}

      {done && (
        <div className="space-y-3" aria-live="polite">
          <p className={`text-lg font-bold ${done.ok ? "text-green-600" : "text-red-600"}`}>{done.ok ? `✓ ${t.correct}` : `✗ ${t.incorrect}`}</p>
          {done.heard && (
            <p className="t-muted text-sm">
              {t.heard}: <span className="italic" lang="en">“{done.heard}”</span>
            </p>
          )}
          <Answers q={q} t={t} audio={audio} spanish={!voice} />
          <button type="button" className="t-btn w-full !py-3" onClick={() => onDone(done)}>
            {last ? t.seeResult : t.next} →
          </button>
        </div>
      )}
    </div>
  );
}

/** Accepted answers (English, with the recording; Spanish too when asked) and "Para entenderlo". */
export function Answers({ q, t, audio, spanish }: { q: CivicsQuestion; t: CivicsT; audio?: Audio; spanish?: boolean }) {
  return (
    <div className="t-card space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{t.accepted}</p>
        {audio && (
          <button
            type="button"
            className="t-btn-ghost !px-3 !py-1"
            onClick={(e) => {
              e.stopPropagation();
              void audio.play([{ ref: q.audio.a_en, text: q.answers_en[0] ?? "", lang: "en-US" }]);
            }}
          >
            ▶ {t.playAnswer}
          </button>
        )}
      </div>
      {spanish && q.answers_es.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5" lang="es">
          {q.answers_es.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <div>
        {spanish && <p className="t-muted text-xs font-semibold uppercase tracking-wide">{t.inEnglish}</p>}
        <ul className="list-disc space-y-0.5 pl-5" lang="en">
          {q.answers_en.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
      {(q.explain_es || q.hint_es) && (
        <div className="space-y-1 border-t border-[var(--t-border)] pt-3">
          <p className="font-semibold">{t.understand}</p>
          {q.explain_es && <p>{q.explain_es}</p>}
          {q.hint_es && (
            <p className="t-muted">
              💡 {t.hint}: {q.hint_es}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Finish({
  exam,
  results,
  passed,
  userId,
  t,
  onAgain,
  onMenu,
}: {
  exam: CivicsExam;
  results: Result[];
  passed: boolean;
  userId: string;
  t: CivicsT;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const right = results.filter((r) => r.ok).length;
  const wrong = results.length - right;
  const [saved, setSaved] = useState(false);
  const once = useRef(false);

  // Kept in the student's own history (evaluation_attempts: they read only their own rows).
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    void createClient()
      .from("evaluation_attempts")
      .insert({
        user_id: userId,
        evaluation_id: exam.id,
        score: right,
        total: results.length,
        passed,
        answers: results.map((r) => ({ n: r.q.n, ok: r.ok, via: r.via })),
      })
      .then(({ error }) => setSaved(!error));
  }, [exam.id, passed, results, right, userId]);

  // The seal is the first thing to see.
  useEffect(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  const missed = results.filter((r) => !r.ok);
  return (
    <div className="space-y-6 text-center">
      <Seal passed={passed} label={passed ? t.sealPassed : t.sealFailed} />
      <div className="space-y-2">
        <h2 className="t-heading text-3xl">{passed ? t.passed : t.failed}</h2>
        <p className="t-muted">
          {fill(passed ? t.passedSub : t.failedSub, { right, wrong, asked: results.length, pass: exam.pass })}
        </p>
        {saved && <p className="t-muted text-xs">{t.saved}</p>}
      </div>
      {missed.length > 0 && (
        <div className="space-y-3 text-left">
          <h3 className="t-heading text-lg">{t.review}</h3>
          {missed.map((r) => (
            <div key={r.q.id} className="space-y-2">
              <p className="font-semibold">{r.q.q_es}</p>
              <p className="t-muted text-sm" lang="en">
                {r.q.q_en}
              </p>
              <Answers q={r.q} t={t} spanish />
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="t-btn" onClick={onAgain}>
          ↺ {t.again}
        </button>
        <button type="button" className="t-btn-ghost" onClick={onMenu}>
          {t.toMenu}
        </button>
      </div>
    </div>
  );
}
