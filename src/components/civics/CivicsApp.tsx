"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CardState, CivicsExam } from "@/lib/civics";
import { useExamAudio } from "./audio";
import { ExamRunner } from "./ExamRunner";
import { StudyCards } from "./StudyCards";
import { fill, Rules } from "./shared";

export type { CivicsT } from "./shared";
import type { CivicsT } from "./shared";

type Props = {
  exam: CivicsExam;
  urls: Record<string, string>;
  userId: string;
  /** lessons holding the 2025 exams: card progress is written to each (see examLessons) */
  lessonIds: string[];
  cards: CardState;
  t: CivicsT;
};

/** One exam: its rules, then the exam (or mock interview) or the study cards. */
export function CivicsApp({ exam, urls, userId, lessonIds, cards, t }: Props) {
  const [mode, setMode] = useState<"menu" | "run" | "cards">("menu");
  const [round, setRound] = useState(0);
  const [state, setState] = useState(cards);
  const audio = useExamAudio(exam.id, urls);
  const saveCards = useCardSaver(userId, lessonIds);
  const big = exam.largeText ? "text-[1.15rem] sm:text-xl" : "";
  const interview = exam.kind === "interview";

  const mark = (n: number, known: boolean) =>
    setState((s) => {
      const next = {
        known: known ? [...new Set([...s.known, n])] : s.known.filter((x) => x !== n),
        review: known ? s.review.filter((x) => x !== n) : [...new Set([...s.review, n])],
      };
      saveCards(next);
      return next;
    });

  const toMenu = () => {
    audio.stop();
    setMode("menu");
  };

  if (mode === "run")
    return (
      <div className={big}>
        <ExamRunner key={round} exam={exam} voice={interview} audio={audio} userId={userId} t={t} onAgain={() => setRound((r) => r + 1)} onMenu={toMenu} />
      </div>
    );

  if (mode === "cards")
    return (
      <div className={`space-y-4 ${big}`}>
        <button type="button" className="t-btn-ghost rounded-full bg-white" onClick={toMenu}>
          ← {t.toMenu}
        </button>
        <StudyCards exam={exam} audio={audio} state={state} onMark={mark} t={t} />
      </div>
    );

  const graded = exam.questions.filter((q) => q.type !== "check_online");
  const known = graded.filter((q) => state.known.includes(q.n)).length;
  return (
    <div className={`space-y-5 ${big}`}>
      <Rules exam={exam} t={t} />
      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => setMode("run")} className="cx-navy space-y-3 rounded-2xl p-6 text-left shadow-md transition hover:-translate-y-0.5">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--cx-gold)] text-2xl text-[var(--cx-navy)]" aria-hidden>
            {interview ? "🎤" : "📝"}
          </span>
          <span className="cx-serif block text-2xl font-semibold">{interview ? t.modeInterview : t.modeExam}</span>
          <span className="cx-chip-gold">{fill(t.ruleChip, { count: exam.count, pass: exam.pass })}</span>
        </button>
        <button type="button" onClick={() => setMode("cards")} className="space-y-3 rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--cx-ivory)] text-2xl" aria-hidden>
            🗂️
          </span>
          <span className="cx-serif block text-2xl font-semibold text-[var(--cx-navy)]">{t.modeCards}</span>
          <span className="cx-chip">{fill(t.knownCount, { known, total: graded.length })}</span>
        </button>
      </div>
    </div>
  );
}

/** Debounced write of the card state to the student's own progress rows (RLS: own rows only). */
function useCardSaver(userId: string, lessonIds: string[]) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<CardState | null>(null);

  const flush = useCallback(async () => {
    const state = latest.current;
    if (!state || !lessonIds.length) return;
    latest.current = null;
    const now = new Date().toISOString();
    await createClient()
      .from("progress")
      .upsert(
        lessonIds.map((lesson_id) => ({
          user_id: userId,
          lesson_id,
          flashcard_state: state,
          last_activity: now,
          client_updated_at: now,
        })),
        { onConflict: "user_id,lesson_id" },
      );
  }, [lessonIds, userId]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush],
  );

  return useCallback(
    (state: CardState) => {
      latest.current = state;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 600);
    },
    [flush],
  );
}
