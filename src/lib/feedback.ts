// CelsBSNS Feedback & Progress → "Close your week" (celsu-celsbsns-feedback-brief.md): one data structure for every
// week; the page (src/components/feedback/InteractiveFeedback.tsx) is built once from it. Matt's decision: reflection
// only. Nothing is sent to anyone and nothing is graded; weekly_reflections is readable by its owner only.

export type Bi = { es: string; en: string };
export type BiList = { es: string[]; en: string[] };
export type AutoKey = "writing" | "video" | "speaking" | null;

export type FeedbackData = {
  week: number;
  /** The lesson's text before the redesign, kept verbatim (content_blocks body and data.text_es). */
  original: { title: string; title_es: string; time: string; goal: string; goal_es: string; body_en: string; body_es: string };
  hero: { title_a: Bi; title_b: Bi; intro_es: string; intro_en: string; chips_es: string[]; chips_en: string[]; priv_b: Bi; priv_p: Bi };
  /** The self-evaluation statements; `auto` says what the app can already confirm. `vocab` shows the vocabulary chip. */
  statements: { es: string; en: string; auto: AutoKey; vocab?: boolean }[];
  questions: Bi[];
  next: { week: number; title: string; bullets: BiList; capstone: Bi };
  goal_suggestions: BiList;
  focus_options: BiList;
  ai_practice: { steps: BiList; prompts: string[]; tip: Bi };
};

/** One self-evaluation answer: 0 yes, 1 maybe, 2 not yet. */
export type Answer = 0 | 1 | 2;

export type WeekNumbers = {
  reading: { done: boolean; notes: number; href: string | null; title: string };
  writing: { status: "none" | "draft" | "submitted" | "reviewed"; words: number; href: string | null };
  research: { done: boolean; phrases: number; href: string | null };
  video: { done: boolean; thumbUrl: string | null; duration: number | null; href: string | null; title: string };
  speaking: { done: boolean; tries: number; quote: string | null; href: string | null };
  commitment: { name: string | null; signedAt: string | null; href: string | null };
  vocabUsed: number;
};

export type Reflection = { self_eval: (Answer | null)[]; answers: string[]; confidence: number | null; next_goal: string; focus: number[]; completed_at: string | null };
