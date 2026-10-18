"use client";

import { useMemo, useState } from "react";
import { shuffle, type CardState, type CivicsExam } from "@/lib/civics";
import type { useExamAudio } from "./audio";
import { Answers } from "./ExamRunner";
import type { CivicsT } from "./shared";

type Audio = ReturnType<typeof useExamAudio>;

type Props = {
  exam: CivicsExam;
  audio: Audio;
  state: CardState;
  onMark: (n: number, known: boolean) => void;
  t: CivicsT;
};

/** Spanish study cards: the question, "Escuchar en inglés", then the answer (ES + EN), explanation and hint. */
export function StudyCards({ exam, audio, state, onMark, t }: Props) {
  const hasStars = exam.questions.some((q) => q.star) && !exam.questions.every((q) => q.star);
  const [onlyStar, setOnlyStar] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const deck = useMemo(() => {
    const list = exam.questions.filter((q) => !onlyStar || q.star);
    if (!order) return list;
    const byId = new Map(list.map((q) => [q.id, q]));
    return order.map((id) => byId.get(id)).filter((q) => q !== undefined);
  }, [exam.questions, onlyStar, order]);

  if (!deck.length) return null;
  const q = deck[Math.min(index, deck.length - 1)];
  const go = (i: number) => {
    audio.stop();
    setIndex((i + deck.length) % deck.length);
    setRevealed(false);
  };
  const known = state.known.includes(q.n);
  const toReview = state.review.includes(q.n);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {hasStars && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyStar}
              onChange={(e) => {
                setOnlyStar(e.target.checked);
                setOrder(null);
                setIndex(0);
                setRevealed(false);
              }}
            />
            {t.onlyStar}
          </label>
        )}
        <button
          type="button"
          className="t-btn-ghost ml-auto !px-3 !py-1"
          onClick={() => {
            setOrder(shuffle(exam.questions.filter((x) => !onlyStar || x.star).map((x) => x.id)));
            setIndex(0);
            setRevealed(false);
          }}
        >
          🔀 {t.shuffle}
        </button>
      </div>

      <article className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="cx-chip" title={q.star ? t.starNote : undefined}>
            {q.star && <span className="text-[var(--cx-gold-dark)]">★</span>}
            {t.question} {q.n}
          </span>
          {(known || toReview) && <span className="cx-chip">{known ? `${t.iKnow} ✓` : `↻ ${t.toReview}`}</span>}
        </div>
        <p className="cx-serif text-[1.55em] font-semibold leading-snug text-[var(--cx-navy)]">{q.q_es}</p>
        <button
          type="button"
          className="cx-chip-gold !px-4 !py-1.5 !text-sm"
          onClick={() => void audio.play([{ ref: q.audio.q_en, text: q.q_en, lang: "en-US" }])}
        >
          ▶ {t.hearEnglish}
        </button>

        {q.type === "check_online" ? (
          <LinkCard q={q} t={t} />
        ) : !revealed ? (
          <button type="button" className="cx-dashed" onClick={() => setRevealed(true)}>
            {t.thinkTap}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="t-muted text-sm" lang="en">
              {q.q_en}
            </p>
            <Answers q={q} t={t} audio={audio} spanish />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={toReview}
                className="t-btn-ghost rounded-full bg-white !py-3"
                onClick={() => {
                  onMark(q.n, false);
                  go(index + 1);
                }}
              >
                ↻ {t.toReview}
              </button>
              <button
                type="button"
                aria-pressed={known}
                className="t-btn rounded-full !py-3"
                onClick={() => {
                  onMark(q.n, true);
                  go(index + 1);
                }}
              >
                {t.iKnow} ✓
              </button>
            </div>
          </div>
        )}
      </article>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(index - 1)} className="t-btn-ghost" aria-label={t.prev}>
          ←
        </button>
        <p className="t-muted text-sm" aria-live="polite">
          {Math.min(index, deck.length - 1) + 1} {t.of} {deck.length}
        </p>
        <button type="button" onClick={() => go(index + 1)} className="t-btn" aria-label={t.nextCard}>
          →
        </button>
      </div>
    </div>
  );
}

/** Questions whose answer depends on the student's state or the date: not graded, point to where to look. */
export function LinkCard({ q, t }: { q: CivicsExam["questions"][number]; t: CivicsT }) {
  return (
    <div className="cx-navy space-y-2 rounded-xl p-4 text-sm">
      <p className="font-semibold">🔎 {t.checkOnline}</p>
      <p className="t-muted">{t.checkOnlineSub}</p>
      {q.hint_es && <p>{q.hint_es}</p>}
      {q.link && (
        <a href={q.link} target="_blank" rel="noopener noreferrer" className="cx-chip-gold !px-4 !py-1.5 !text-sm">
          {t.openLink} ↗
        </a>
      )}
      {q.note_es && <p className="t-muted text-xs">{q.note_es}</p>}
    </div>
  );
}
