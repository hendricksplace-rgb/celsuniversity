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
  wordAt,
  type CivicsExam,
  type CivicsQuestion,
} from "@/lib/civics";
import type { Clip, useExamAudio } from "./audio";
import { useSpeechAnswer } from "./audio";
import { fill, type CivicsT } from "./shared";
import { OfficerAvatar, Seal } from "./Seal";

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
  const maxWrong = exam.count - exam.pass + 1;
  const outcome = finished(exam, right, wrong) ?? (results.length >= order.length ? "failed" : null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [results.length]);

  if (outcome)
    return <Finish exam={exam} voice={voice} results={results} passed={outcome === "passed"} userId={userId} t={t} onAgain={onAgain} onMenu={onMenu} />;

  const q = order[results.length];
  return (
    <div ref={top} className="scroll-mt-24">
      <Question
        key={q.id}
        q={q}
        index={results.length}
        score={{ right, wrong, pass: exam.pass, maxWrong }}
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
type Score = { right: number; wrong: number; pass: number; maxWrong: number };

function Question({
  q,
  index,
  score,
  voice,
  audio,
  t,
  last,
  onDone,
}: {
  q: CivicsQuestion;
  index: number;
  score: Score;
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

  // The question as read aloud, and the timings that go with that recording.
  const ref = voice ? (q.audio.q ?? q.audio.q_en) : (q.audio.q_es ?? q.audio.q);
  const wt = voice ? (q.audio.q ? q.wt.q : q.wt.q_en) : q.audio.q_es ? q.wt.q_es : q.wt.q;
  const text = voice ? q.q_en : q.q_es;
  const questionClip: Clip = { ref, text, lang: voice ? "en-US" : "es-US" };
  const englishClips: Clip[] = [
    { ref: q.audio.q_en, text: q.q_en, lang: "en-US" },
    { ref: q.audio.a_en, text: q.answers_en[0] ?? "", lang: "en-US" },
  ];
  const speaking = audio.playing && audio.position.ref === ref;
  const current = speaking ? wordAt(text, wt, audio.position.time) : -1;

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
    <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
      {/* Top half: the officer and the question */}
      <div className="cx-navy space-y-5 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {t.question} {index + 1}
            {q.star && <span className="ml-2 text-[var(--cx-gold)]">★</span>}
          </span>
          <span className="flex gap-2 text-sm font-bold" aria-label={`${t.right} ${score.right}/${score.pass}, ${t.wrong} ${score.wrong}/${score.maxWrong}`}>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[#9be3b0]">
              ✓ {score.right}/{score.pass}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[#ffb4b4]">
              ✗ {score.wrong}/{score.maxWrong}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {voice && <OfficerAvatar />}
          <div className="min-w-0">
            <p className="font-semibold">{voice ? t.officer : t.interviewing}</p>
            <p className="text-xs text-white/70">{speaking ? t.speaking : "USCIS"}</p>
          </div>
          <span className="cx-wave ml-1 flex h-7 items-center gap-1" data-on={speaking} aria-hidden>
            {[0, 0.15, 0.3, 0.1, 0.25].map((d, i) => (
              <span key={i} style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
          <button
            type="button"
            className="ml-auto rounded-full border border-white/25 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10"
            onClick={() => void audio.play([questionClip])}
          >
            ↻ {voice ? t.replay : t.listenQuestion}
          </button>
        </div>

        {showText || done || !voice ? (
          <p className="cx-serif text-[1.45em] leading-snug sm:text-[1.7em]" lang={voice ? "en" : "es"}>
            <Words text={text} current={current} />
          </p>
        ) : (
          <p className="text-sm text-white/60">• • •</p>
        )}

        <div className="flex flex-wrap gap-2">
          {voice && (
            <button type="button" className="text-xs font-semibold text-white/80 underline underline-offset-2" onClick={() => setShowText((s) => !s)} aria-expanded={showText}>
              {showText ? t.hideText : t.showText}
            </button>
          )}
          {!voice && (
            <button type="button" className="cx-chip-gold" onClick={() => void audio.play(englishClips)}>
              ▶ {t.hearEnglish}
            </button>
          )}
        </div>
      </div>

      {/* Bottom half: the student's answer */}
      <div className="space-y-4 bg-[var(--cx-ivory)] p-5 sm:p-8">
        {phase.name === "ask" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            {speech.supported ? (
              <>
                <button
                  type="button"
                  className="cx-mic"
                  data-live={speech.listening}
                  aria-label={speech.listening ? t.stop : t.answerVoice}
                  onClick={() => (speech.listening ? speech.stopListening() : void answerOutLoud())}
                >
                  {speech.listening ? "■" : "🎤"}
                </button>
                <p className="font-semibold" aria-live="polite">
                  {speech.listening ? t.listening : t.tapToAnswer}
                </p>
                {speech.interim && (
                  <p className="t-muted italic" lang="en">
                    “{speech.interim}”
                  </p>
                )}
              </>
            ) : (
              <p className="t-muted text-sm">{t.noVoiceSupport}</p>
            )}
            {!speech.listening && (
              <button type="button" className="t-btn-ghost rounded-full bg-white" onClick={() => setPhase({ name: "options" })}>
                {t.notSure}
              </button>
            )}
          </div>
        )}

        {phase.name === "heard" && (
          <div className="space-y-3 text-center" aria-live="polite">
            {phase.heard && (
              <p>
                {t.heard}:{" "}
                <span className="italic" lang="en">
                  “{phase.heard}”
                </span>
              </p>
            )}
            <p className="t-muted text-sm">{phase.error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {speech.supported && attempts < 3 && (
                <button type="button" className="cx-btn-gold" onClick={() => void answerOutLoud()}>
                  🎤 {t.tryAgain}
                </button>
              )}
              <button type="button" className="t-btn-ghost rounded-full bg-white" onClick={() => setPhase({ name: "options" })}>
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
              const state = !done ? (on ? "ring-2 ring-[var(--cx-navy)]" : "") : q.correct.includes(o.index) ? "t-opt-correct" : on ? "t-opt-wrong" : "t-opt-dim";
              return (
                <button
                  key={o.index}
                  type="button"
                  disabled={!!done}
                  aria-pressed={on}
                  onClick={() => toggle(o.index)}
                  lang={voice ? "en" : "es"}
                  className={`w-full rounded-xl border border-[var(--t-border)] bg-white p-3.5 text-left transition enabled:hover:border-[var(--cx-navy-2)] ${state}`}
                >
                  {o.text}
                </button>
              );
            })}
            {!done && (
              <button type="button" className="t-btn w-full rounded-full !py-3" disabled={picked.length !== q.need} onClick={check}>
                {t.check}
              </button>
            )}
          </div>
        )}

        {done && (
          <div className="space-y-3" aria-live="polite">
            <p className={`text-lg font-bold ${done.ok ? "text-green-700" : "text-red-700"}`}>{done.ok ? `✓ ${t.correct}` : `✗ ${t.incorrect}`}</p>
            {done.heard && (
              <p className="t-muted text-sm">
                {t.heard}:{" "}
                <span className="italic" lang="en">
                  “{done.heard}”
                </span>
              </p>
            )}
            <Answers q={q} t={t} audio={audio} spanish={!voice} />
            <button type="button" className="t-btn w-full rounded-full !py-3" onClick={() => onDone(done)}>
              {last ? t.seeResult : t.next} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** The question, word by word, with the one being spoken highlighted. */
function Words({ text, current }: { text: string; current: number }) {
  if (current < 0) return <>{text}</>;
  return (
    <>
      {text
        .split(/\s+/)
        .filter(Boolean)
        .map((w, i) => (
          <span key={i}>
            <span className={i === current ? "cx-word-on" : undefined}>{w}</span>{" "}
          </span>
        ))}
    </>
  );
}

/** Feedback card: accepted answers (English, with ▶ the recording; Spanish too when asked) and "Para entenderlo". */
export function Answers({ q, t, audio, spanish }: { q: CivicsQuestion; t: CivicsT; audio?: Audio; spanish?: boolean }) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--t-border)] bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{t.accepted}</p>
        {audio && (
          <button
            type="button"
            className="cx-chip-gold"
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
        <div className="space-y-1 rounded-lg bg-[var(--cx-ivory)] p-3">
          <p className="cx-serif font-semibold">{t.understand}</p>
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
  voice,
  results,
  passed,
  userId,
  t,
  onAgain,
  onMenu,
}: {
  exam: CivicsExam;
  voice: boolean;
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
    <div className="space-y-6">
      <div className="cx-navy space-y-4 rounded-2xl p-6 text-center sm:p-10">
        <Seal
          passed={passed}
          ring={voice ? t.stampInterview : t.stampExam}
          score={`${right}/${results.length}`}
          label={passed ? t.sealPassed : t.sealFailed}
        />
        <h2 className="cx-serif text-3xl font-semibold">{passed ? t.passed : t.failed}</h2>
        <p className="text-white/80">{fill(passed ? t.passedSub : t.failedSub, { right, wrong, asked: results.length, pass: exam.pass })}</p>
        {saved && <p className="text-xs text-white/60">{t.saved}</p>}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button type="button" className="cx-btn-gold" onClick={onAgain}>
            ↺ {t.again}
          </button>
          <button type="button" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold hover:bg-white/10" onClick={onMenu}>
            {t.toMenu}
          </button>
        </div>
      </div>
      {missed.length > 0 && (
        <div className="space-y-3">
          <h3 className="t-heading text-xl">{t.review}</h3>
          {missed.map((r) => (
            <div key={r.q.id} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <p className="cx-serif text-lg font-semibold">{r.q.q_es}</p>
              <p className="t-muted text-sm" lang="en">
                {r.q.q_en}
              </p>
              <Answers q={r.q} t={t} spanish />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
