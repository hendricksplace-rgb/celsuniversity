// CelsBSNS Interactive Writing Task: one data structure for every week (celsu-celsbsns-writing-brief.md "Data").
// The page (src/components/writing/InteractiveWriting.tsx) is built once from it; each week is a writing_content row.
import type { Lang } from "@/lib/reading";

export type WritingPart = {
  color: string;
  en: string;
  es: string;
  hint: { es: string; en: string };
  example: string;
  /** Useful phrases; [placeholders] are for the student to replace. */
  phrases: string[];
};

export type WritingData = {
  week: number;
  /** The lesson's text before the redesign, kept verbatim (content_blocks body and data.text_es). */
  original: { title: string; title_es: string; time: string; goal: string; goal_es: string; submission: string; body_en: string; body_es: string };
  /** "Professional Self-Introduction Email": the second part is highlighted. */
  hero: { title_a: string; title_b: string; intro_es: string; intro_en: string; chips_es: string[]; chips_en: string[] };
  scenario: { from: string; initials: string; role_es: string; role_en: string; quote: string; es: string; en: string };
  parts: WritingPart[];
  rules: { icon: "smile" | "star" | "nob"; t_es: string; t_en: string; d_es: string; d_en: string }[];
  /** The original template email, word for word. Each paragraph is [part index or null, text] segments. */
  example: { subject: string; paragraphs: [number | null, string][][] };
  words: { min: number; max: number };
  to_label: string;
  to_initials: string;
  subject_hint: string;
  capstone_part: number;
  capstone_title: { es: string; en: string };
};

export type SubmissionStatus = "draft" | "submitted" | "reviewed";

export type HistoryEntry = {
  version: number;
  subject: string | null;
  body: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  coach_good: string | null;
  coach_improve: string | null;
  coach_message: string | null;
};

export type WritingSubmission = {
  id: string;
  subject: string | null;
  body: string;
  status: SubmissionStatus;
  version: number;
  parts_confirmed: number[];
  history: HistoryEntry[];
  coach_good: string | null;
  coach_improve: string | null;
  coach_message: string | null;
  coach_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
};

/** Words as the mockup counts them (letters, digits, apostrophes and dashes). */
export const countWords = (t: string) => (t.trim().match(/[A-Za-zÀ-ÿ0-9’'\-–]+/g) || []).length;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const BULLET = /^\s*([-*•]|\d+[.)])\s/m;

/** The automatic format checks (no AI): subject, word range, 3+ paragraphs (advice only), no bullets or emojis. */
export function formatChecks(subject: string, body: string, words: { min: number; max: number }) {
  const w = countWords(body);
  const paras = body.split(/\n\s*\n/).filter((p) => p.trim()).length;
  return {
    words: w,
    subject: subject.trim().length > 3,
    range: w >= words.min && w <= words.max,
    over: w > words.max,
    paragraphs: paras >= 3,
    clean: !(BULLET.test(body) || EMOJI.test(body)),
  };
}

export const fullEmail = (subject: string, body: string) => `Subject: ${subject.trim()}\n\n${body.trim()}`;

export type { Lang };
