// CelsBSNS Interactive Reading: one data structure for every week (brief "Data"). The page
// (src/components/reading/InteractiveReading.tsx) is built once from it; each week is a reading_content row.
//
// Inline markup inside the English text: [[word]] opens the vocabulary card for vocab[word] (case-insensitive),
// {n} is a citation to sources[id = n].

export type Lang = "es" | "en";

export type ReadingOriginal = {
  /** The lesson's text before the redesign, kept verbatim (content_blocks body and data.text_es). */
  title: string;
  title_es: string;
  type: string;
  time: string;
  summary: string;
  instructions: string;
  /** The old links, replaced by the CelsU article and the TED embed. */
  article_ref: string;
  video_ref: string;
  body_en: string;
  body_es: string;
};

export type Learn = { t_es: string; t_en: string; d_es: string; d_en: string };

export type MarkedText = (string | { t: string; m: number })[];
export type Email = { to: string; subject: string; body: MarkedText; marks: { es: string; en: string }[] };

export type ArticleBlock =
  | { type: "para"; id: string; h?: string; en: string; es: string }
  | { type: "pause"; id: string; q_es: string; q_en: string }
  | { type: "habits"; id: string; h: string; items: { icon: "target" | "mega" | "shield"; h: string; en: string; es: string }[] }
  | { type: "compare"; id: string; h_es: string; h_en: string; intro_es: string; intro_en: string; before: Email; after: Email };

/** `review` (week 8): a week-1 word brought back for review, labeled "Repaso" on its card. */
export type Vocab = { es: string; d: string; ex: string; review?: boolean };
export type Source = { id: number; who: string; what: string; pub: string; url: string };
export type Talk = { provider: "ted"; slug: string; title: string; speaker: string; event: string; minutes: number; source?: number };

export type CaseActivity =
  | {
      kind: "rewrite";
      prompt_es: string;
      prompt_en: string;
      hints_es: string[];
      hints_en: string[];
      label_es: string;
      label_en: string;
      model: string;
    }
  | {
      kind: "spot";
      prompt_es: string;
      prompt_en: string;
      /** The message, split so that joining every `t` gives message.text back; parts with `why` are the targets. */
      parts: { t: string; why?: { es: string; en: string } }[];
    }
  | {
      kind: "choose";
      prompt_es: string;
      prompt_en: string;
      options: { label_es: string; label_en: string; lead: string; text: string; correct: boolean }[];
      why: { es: string; en: string };
    };

export type ReadingCase = {
  id: string;
  title_en: string;
  title_es: string;
  scene: string;
  message?: { from: string; text: string };
  outcome?: string;
  outcome_kind?: "bad" | "good";
  activity: CaseActivity;
  /** The original reflection questions, word for word (English), with the original Spanish. */
  questions: string[];
  questions_es: string[];
};

export type Mcq = { q: { en: string; es: string }; o: { en: string[]; es: string[] }; a: number; why: { en: string; es: string } };

export type ReadingData = {
  week: number;
  original: ReadingOriginal;
  hero: { intro_es: string; intro_en: string; chips_es: string[]; chips_en: string[]; learn: Learn[] };
  warmup: {
    title_es: string;
    title_en: string;
    intro_es: string;
    intro_en: string;
    q_es: string;
    q_en: string;
    poll_es: string[];
    poll_en: string[];
    feedback_es: string[];
    feedback_en: string[];
    note_q_es: string;
    note_q_en: string;
  };
  article: { title: string; dek: string; minutes: number; based_es: string; based_en: string; intro_es: string; intro_en: string; blocks: ArticleBlock[] };
  vocab: Record<string, Vocab>;
  sources: Source[];
  video: Talk & { intro_es: string; intro_en: string; prompts_es: string[]; prompts_en: string[]; extra?: Talk };
  cases_intro: { es: string; en: string };
  cases: ReadingCase[];
  checkpoint: { mcq: Mcq[]; takeaway_q: { en: string; es: string } };
};

/** Per-student state kept in reading_progress.state. */
export type ReadingState = {
  poll?: number;
  spot_found?: number[];
  case3_choice?: number;
  mcq?: (number | null)[];
  reached?: number;
};

export type NavLink = { title: string; href: string } | null;

/** The TED player for a talk, with subtitles in the student's language where TED has them. */
export const tedEmbed = (slug: string, lang: Lang) => `https://embed.ted.com/talks/lang/${lang}/${encodeURIComponent(slug)}?language=${lang}`;

/** Splits English text with [[vocab]] and {n} citations into tokens. */
export type Token = { k: "text"; v: string } | { k: "vocab"; v: string } | { k: "cite"; n: number };
export function tokenize(s: string): Token[] {
  const out: Token[] = [];
  const re = /\[\[([^\]]+)\]\]|\{(\d+)\}/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ k: "text", v: s.slice(last, m.index) });
    out.push(m[1] ? { k: "vocab", v: m[1] } : { k: "cite", n: Number(m[2]) });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ k: "text", v: s.slice(last) });
  return out;
}

/** The same text with the markup removed (what the original said). */
export const plain = (s: string) => s.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\{\d+\}/g, "");

/** "English for Business Success Syllabus" → "Syllabus del curso"; "Writing Task (1–2 hours)" → "Writing Task". */
export function navTitle(title: string, lang: Lang) {
  if (/syllabus/i.test(title)) return lang === "es" ? "Syllabus del curso" : "Course syllabus";
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim() || title;
}
