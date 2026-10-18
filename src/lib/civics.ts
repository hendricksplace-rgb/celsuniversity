// CelsUS 2025 civics test (USCIS): types and answer checking shared by the exam screens.
// Question data lives in evaluation_questions.data (written by Cowork from the 2025 bank).

export type CivicsQuestion = {
  id: string;
  n: number;
  type: "single" | "multi" | "check_online";
  section: string;
  star: boolean;
  need: number;
  q_en: string;
  q_es: string;
  options_en: string[];
  options_es: string[];
  /** indexes into options_en / options_es */
  correct: number[];
  answers_en: string[];
  answers_es: string[];
  keywords_en: string[];
  hint_es: string;
  explain_es: string;
  note_es: string;
  link: string | null;
  /** storage refs; resolved to signed URLs by the page */
  audio: { q?: string; q_en?: string; q_es?: string; a_en?: string };
  /** word start times (seconds) for each recording, for highlighting the text as it is read */
  wt: { q?: number[]; q_en?: number[]; q_es?: number[] };
};

export type ExamKind = "interview" | "spanish" | "6520";

export type CivicsExam = {
  id: string;
  title: string;
  kind: ExamKind;
  language: "en" | "es";
  /** questions asked in one sitting, and how many must be right (USCIS 2025: 20 / 12; 65/20: 10 / 6) */
  count: number;
  pass: number;
  largeText: boolean;
  questions: CivicsQuestion[];
};

const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const s = (v: unknown) => (typeof v === "string" ? v : "");
const times = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === "number") ? (v as number[]) : undefined);

export function toQuestion(row: { id: string; question_type: string | null; is_asterisked: boolean; data: unknown }): CivicsQuestion {
  const d = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>;
  const audio = (d.audio && typeof d.audio === "object" ? d.audio : {}) as Record<string, unknown>;
  const type = row.question_type === "multi" || row.question_type === "check_online" ? row.question_type : "single";
  return {
    id: row.id,
    n: Number(d.n) || 0,
    type,
    section: s(d.section),
    star: row.is_asterisked || d.star === true,
    need: Math.max(1, Number(d.need) || 1),
    q_en: s(d.q_en),
    q_es: s(d.q_es),
    options_en: strs(d.options_en).length ? strs(d.options_en) : strs(d.options),
    options_es: strs(d.options_es).length ? strs(d.options_es) : strs(d.options),
    correct: Array.isArray(d.correct) ? d.correct.map(Number).filter((n) => Number.isInteger(n)) : [],
    answers_en: strs(d.answers_en),
    answers_es: strs(d.answers_es),
    keywords_en: strs(d.keywords_en),
    hint_es: s(d.hint_es),
    explain_es: s(d.explain_es),
    note_es: s(d.note) || s(d.note_es) || s(d.note_en),
    link: s(d.link).startsWith("https://") ? s(d.link) : null,
    audio: {
      q: s(audio.q) || undefined,
      q_en: s(audio.q_en) || undefined,
      q_es: s(audio.q_es) || undefined,
      a_en: s(audio.a_en) || undefined,
    },
    wt: { q: times(audio.q_wt), q_en: times(audio.q_en_wt), q_es: times(audio.q_es_wt) },
  };
}

/** Index of the word being spoken at `time`, when the timings line up with the text's words. */
export function wordAt(text: string, wt: number[] | undefined, time: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!wt || wt.length !== words.length || time < 0) return -1;
  let i = -1;
  while (i + 1 < wt.length && wt[i + 1] <= time) i++;
  return i;
}

/** English = the mock interview; the 65/20 exam is the starred subset, in large print. */
export const kindOf = (e: { language: string; source_subset_of?: string | null; large_text?: boolean }): ExamKind =>
  e.language === "en" ? "interview" : e.source_subset_of || e.large_text ? "6520" : "spanish";

/** Study-card progress, by question number (shared across the three exams). Kept in progress.flashcard_state. */
export type CardState = { known: number[]; review: number[] };

export function toCardState(v: unknown): CardState {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const nums = (x: unknown) => (Array.isArray(x) ? x.map(Number).filter((n) => Number.isInteger(n)) : []);
  return { known: nums(o.known), review: nums(o.review) };
}

/** Questions the app can grade. `check_online` answers depend on where the student lives. */
export const gradable = (q: CivicsQuestion) => q.type !== "check_online" && q.correct.length > 0;

/** Lowercase, no accents or punctuation, single spaces. Parenthesized parts are optional in USCIS answers. */
export function normalize(text: string, dropParens = false) {
  let t = text.toLowerCase();
  if (dropParens) t = t.replace(/\([^)]*\)/g, " ");
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\bu\.?\s?s\.?\b/g, "us")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const contains = (haystack: string, needle: string) => !!needle && ` ${haystack} `.includes(` ${needle} `);

/**
 * How many distinct accepted answers a spoken reply contains. An answer counts when its full text
 * (with or without the parenthesized part) or one of the question's keywords appears.
 */
export function spokenHits(q: CivicsQuestion, transcript: string) {
  const said = normalize(transcript);
  const hits = new Set<string>();
  for (const a of q.answers_en) {
    if (contains(said, normalize(a)) || contains(said, normalize(a, true))) hits.add(normalize(a, true));
  }
  for (const k of q.keywords_en) {
    const key = normalize(k);
    if (!contains(said, key)) continue;
    // A keyword inside an answer already counted is the same answer.
    if (![...hits].some((h) => contains(h, key))) hits.add(key);
  }
  return hits.size;
}

export const spokenCorrect = (q: CivicsQuestion, transcript: string) => spokenHits(q, transcript) >= q.need;

/** Tapped options: right when exactly `need` options are picked and all of them are correct. */
export const optionsCorrect = (q: CivicsQuestion, picked: number[]) =>
  picked.length === q.need && picked.every((i) => q.correct.includes(i));

/** USCIS stops as soon as the result is decided: `pass` right, or too many wrong to still pass. */
export function finished(exam: Pick<CivicsExam, "count" | "pass">, right: number, wrong: number) {
  if (right >= exam.pass) return "passed" as const;
  if (wrong > exam.count - exam.pass) return "failed" as const;
  return null;
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Options in a random order, keeping track of which original index each one was. */
export const shuffledOptions = (options: string[]) => shuffle(options.map((text, index) => ({ text, index })));
