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
  rules: { icon: "smile" | "star" | "nob" | "chat" | "clock"; t_es: string; t_en: string; d_es: string; d_en: string }[];
  /** The original template email, word for word. Each paragraph is [part index or null, text] segments. */
  example: { subject: string; paragraphs: [number | null, string][][] };
  words: { min: number; max: number };
  to_label: string;
  to_initials: string;
  subject_hint: string;
  capstone_part: number;
  capstone_title: { es: string; en: string };
  /** Week 2: why the task matters, under the scenario. */
  why_note?: { es: string; en: string };
  /** Week 3: what to do once the emails are written (read them aloud). */
  after?: { es: string; en: string };
  /** Week 3: two emails in one task; `parts` are indexes into `parts`, `words_each` the range for each one. */
  emails?: { key: string; en: string; es: string; parts: number[]; focus_en: string; focus_es: string }[];
  words_each?: { min: number; max: number };
};

/** "finished": saved as done by the student (no coach step, Matt 2026-10-19). "submitted" and "reviewed" are older
 *  rows from the coach flow; they still display, and staff can still review "submitted" ones. */
export type SubmissionStatus = "draft" | "submitted" | "reviewed" | "finished";

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

/** The week asks for an email in paragraphs (its format rule, the "nob" one, is week 1's "Email format" or says
 *  "paragraph" / "no bullet"): only then do the paragraph and no-bullets checks apply. Week 4 (a resume, bullets expected) and weeks whose rules don't mention the format skip them. */
export const emailFormatOf = (data: Pick<WritingData, "rules">) =>
  data.rules.some((r) => r.icon === "nob" && /email format|paragraph|no bullet/i.test(`${r.t_en} ${r.d_en}`));

/** The automatic format checks (no AI): subject, word range, and, for email-format weeks, 3+ paragraphs (advice
 *  only) and no bullets. Emojis are never allowed. */
export function formatChecks(subject: string, body: string, words: { min: number; max: number }, emailFormat = true) {
  const w = countWords(body);
  const paras = body.split(/\n\s*\n/).filter((p) => p.trim()).length;
  return {
    words: w,
    subject: subject.trim().length > 3,
    range: w >= words.min && w <= words.max,
    over: w > words.max,
    paragraphs: !emailFormat || paras >= 3,
    clean: !((emailFormat && BULLET.test(body)) || EMOJI.test(body)),
  };
}

/** Done for the week: saved as finished, or (older rows) sent to or reviewed by a coach. */
export const writingDone = (status: string | null | undefined) => status === "finished" || status === "submitted" || status === "reviewed";

export const fullEmail = (subject: string, body: string) => `Subject: ${subject.trim()}\n\n${body.trim()}`;

export type { Lang };
