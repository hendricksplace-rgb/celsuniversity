"use client";

import { useEffect, useState } from "react";
import { usePartDone } from "../progress";
import { arr, AudioButton, Feedback, obj, Option, str, useResolve, useScrollIntoView, useT } from "./shared";

/** One shape for both the plain `quiz` blocks and the CelsTV episode quizzes. */
export type Question = {
  instruction?: string;
  prompt?: string;
  audio?: unknown;
  options: { text?: string; image?: unknown; alt?: string; audio?: unknown }[];
  correct: number;
  explanation?: string;
};

/** `quiz`: [{question, options, correct, explanation}] */
export function fromQuiz(settings: unknown): Question[] {
  return arr(settings).map((raw) => {
    const q = obj(raw);
    return {
      prompt: str(q.question),
      options: arr(q.options).map((o) => ({ text: str(o) })),
      correct: Number(q.correct),
      explanation: str(q.explanation),
    };
  });
}

/** `celstv_quiz`: {questions: [{type: select-text | listen-and-select | select-image | select-audio, ...}]} */
export function fromCelstv(settings: unknown): Question[] {
  return arr(obj(settings).questions).map((raw) => {
    const q = obj(raw);
    const base = { instruction: str(q.instruction), prompt: str(q.question), correct: Number(q.correctAnswer) };
    switch (q.type) {
      case "select-image":
        return { ...base, options: arr(q.images).map((i) => ({ image: obj(i).url, alt: str(obj(i).alt) })) };
      case "select-audio":
        return { ...base, options: arr(q.audioOptions).map((o) => ({ audio: obj(o).url, text: str(obj(o).label) })) };
      case "listen-and-select":
        return { ...base, audio: q.audioUrl, options: arr(q.options).map((o) => ({ text: str(o) })) };
      default:
        return { ...base, options: arr(q.options).map((o) => ({ text: str(o) })) };
    }
  });
}

export function ChoiceQuiz({ questions, heading }: { questions: Question[]; heading?: string }) {
  const t = useT();
  const resolve = useResolve();
  const valid = questions.filter((q) => q.options.length && q.correct >= 0 && q.correct < q.options.length);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => valid.map(() => null));
  const top = useScrollIntoView<HTMLDivElement>(index);

  const done = index >= valid.length;
  const partDone = usePartDone();
  useEffect(() => {
    if (done && valid.length) partDone();
  }, [done, valid.length, partDone]);

  if (!valid.length) return null;
  const score = answers.filter((a, i) => a === valid[i]?.correct).length;

  if (done) {
    return (
      <div ref={top} className="space-y-4 text-center">
        <p className="t-muted text-sm">{t.score}</p>
        <p className="t-heading text-4xl">
          {score} / {valid.length}
        </p>
        <p>{score === valid.length ? t.perfect : score >= valid.length * 0.7 ? t.good : t.keepPracticing}</p>
        <button
          type="button"
          className="t-btn"
          onClick={() => {
            setAnswers(valid.map(() => null));
            setIndex(0);
          }}
        >
          ↺ {t.restart}
        </button>
      </div>
    );
  }

  const q = valid[index];
  const picked = answers[index];
  const answered = picked !== null;
  const images = q.options.some((o) => o.image);
  const choose = (i: number) => setAnswers((a) => a.map((v, j) => (j === index ? i : v)));

  return (
    <div ref={top} className="scroll-mt-24 space-y-4">
      {heading && index === 0 && <p className="t-muted text-sm">{heading}</p>}
      <div className="flex gap-1" aria-hidden>
        {valid.map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                answers[i] === null ? "var(--t-border)" : answers[i] === valid[i].correct ? "#15803d" : "#b91c1c",
              outline: i === index ? "2px solid var(--t-accent)" : undefined,
            }}
          />
        ))}
      </div>
      <p className="t-muted text-xs font-semibold uppercase tracking-wide">
        {t.question} {index + 1} {t.of} {valid.length}
        {q.instruction && ` · ${q.instruction}`}
      </p>
      {q.prompt && <p className="text-lg font-semibold">{q.prompt}</p>}
      {q.audio !== undefined && (resolve(q.audio) ? <AudioButton src={resolve(q.audio)} className="t-btn" /> : null)}

      <div className={images ? "grid grid-cols-2 gap-3" : "space-y-2"}>
        {q.options.map((o, i) => {
          const state = !answered ? "idle" : i === q.correct ? "correct" : i === picked ? "wrong" : "dim";
          const img = resolve(o.image);
          const audio = resolve(o.audio);
          return (
            <div key={i} className="flex items-stretch gap-2">
              {o.audio !== undefined && <AudioButton src={audio} label="" />}
              <Option state={state} disabled={answered} onClick={() => choose(i)}>
                {o.image !== undefined ? (
                  <span className="block space-y-2">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                      <img src={img} alt={o.alt ?? ""} className="aspect-[4/3] w-full rounded object-cover" />
                    ) : (
                      <span className="t-muted block text-xs">{t.unavailable}</span>
                    )}
                    {o.alt && <span className="block text-sm">{o.alt}</span>}
                  </span>
                ) : (
                  o.text || `${t.option} ${i + 1}`
                )}
              </Option>
            </div>
          );
        })}
      </div>

      {answered && <Feedback ok={picked === q.correct} extra={q.explanation || undefined} />}

      <div className="flex justify-between gap-2">
        <button type="button" className="t-btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ← {t.prev}
        </button>
        <button type="button" className="t-btn" disabled={!answered} onClick={() => setIndex(index + 1)}>
          {index === valid.length - 1 ? t.seeScore : t.next} →
        </button>
      </div>
    </div>
  );
}
