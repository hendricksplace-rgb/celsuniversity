// The student's AI interview practice (/app/herramientas/entrevista), read from interview_answers (RLS: the owner
// reads their own rows). Used by the tool's choose screen, CelsBSNS week 10 Feedback and the Capstone certificate
// checklist.
import type { Client } from "@/lib/supabase/types";
import { INTERVIEW_KEYS, type InterviewKey } from "@/lib/ai-tools";

/** The best STAR score (0–4) per question; a question with no scored answer is missing. */
export type InterviewBest = Partial<Record<InterviewKey, number>>;

export function bestInterviewScores(rows: { question_key: string; score: number | null }[]): InterviewBest {
  const best: InterviewBest = {};
  for (const r of rows) {
    const k = r.question_key as InterviewKey;
    if (!INTERVIEW_KEYS.includes(k) || r.score == null) continue;
    if (best[k] == null || r.score > best[k]!) best[k] = r.score;
  }
  return best;
}

export async function loadInterviewBest(supabase: Client, userId: string): Promise<InterviewBest> {
  const { data } = await supabase.from("interview_answers").select("question_key, score").eq("user_id", userId).not("score", "is", null);
  return bestInterviewScores(data ?? []);
}

/** How many of the 4 questions have a scored answer. */
export const interviewAnswered = (best: InterviewBest) => INTERVIEW_KEYS.filter((k) => best[k] != null).length;

/**
 * CelsBSNS certificate checklist, "Tu práctica de entrevista con IA" (Matt, 2026-10-20). Matt can change this.
 * Current rule: done once the student has a scored answer (score not null, any score 0–4) for all 4 questions
 * (about, why, strengths, challenge), in one session or across several. A minimum score would go here.
 */
export function interviewPracticeDone(best: InterviewBest) {
  return interviewAnswered(best) === INTERVIEW_KEYS.length;
}
