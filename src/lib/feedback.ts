// CelsBSNS Feedback & Progress → "Close your week" (celsu-celsbsns-feedback-brief.md): one data structure for every
// week; the page (src/components/feedback/InteractiveFeedback.tsx) is built once from it. Matt's decision: reflection
// only. Nothing is sent to anyone and nothing is graded; weekly_reflections is readable by its owner only.

export type Bi = { es: string; en: string };
export type BiList = { es: string[]; en: string[] };
export type AutoKey = "writing" | "video" | "speaking" | "research" | null;

export type FeedbackData = {
  week: number;
  /** The lesson's text before the redesign, kept verbatim (content_blocks body and data.text_es). */
  original: { title: string; title_es: string; time: string; goal: string; goal_es: string; body_en: string; body_es: string };
  hero: { title_a: Bi; title_b: Bi; intro_es: string; intro_en: string; chips_es: string[]; chips_en: string[]; priv_b: Bi; priv_p: Bi };
  /** The self-evaluation statements; `auto` says what the app can already confirm. `vocab` shows the vocabulary chip. */
  statements: { es: string; en: string; auto: AutoKey; vocab?: boolean }[];
  questions: Bi[];
  /** `final` (week 10): the course close (live mock interview and certificate) instead of a next week. */
  next: { week: number; title: string; bullets: BiList; capstone: Bi; final?: boolean };
  goal_suggestions: BiList;
  focus_options: BiList;
  ai_practice: { steps: BiList; prompts: string[]; tip: Bi };
  /** A hint under the reflection questions (weeks 2 and 3). */
  answer_hint?: Bi;
  /** The original's action note (weeks 3, 6, 8, 9); its shape differs by week, see actionNote(). */
  action_note?: Record<string, unknown>;
};

export type ActionNote = { title: Bi; prompt: Bi; examples: { en: string; es: string | null }[] };

/** The week's action note in one shape. Week 3 gives two example sentences, week 6 a title, prompt and example,
 *  week 8 a question and example, week 9 only the prompt. */
export function actionNote(d: FeedbackData): ActionNote | null {
  const a = d.action_note as Record<string, unknown> | undefined;
  if (!a || typeof a !== "object") return null;
  const bi = (x: unknown): Bi | null => (x && typeof x === "object" && typeof (x as Bi).en === "string" ? { en: (x as Bi).en, es: (x as Bi).es ?? (x as Bi).en } : null);
  const str = (x: unknown) => (typeof x === "string" && x.trim() ? x : null);
  const title = bi(a.title) ?? { es: "Nota de acción", en: "Action note" };
  const prompt =
    bi(a.prompt) ??
    (str(a.q_en) ? { en: str(a.q_en)!, es: str(a.q_es) ?? str(a.q_en)! } : null) ??
    bi(a) ??
    (a.growth_ex || a.goal_ex
      ? { es: "Escribe una oración sobre algo que mejoraste esta semana y otra con tu meta para la próxima.", en: "Write one sentence about something you improved this week and one with your goal for next week." }
      : null);
  if (!prompt) return null;
  const examples: ActionNote["examples"] = [];
  for (const k of ["growth_ex", "goal_ex"]) {
    const e = bi(a[k]);
    if (e) examples.push({ en: e.en, es: e.es });
  }
  const ex = str(a.example) ?? str(a.example_en);
  if (ex) examples.push({ en: ex, es: str(a.example_es) });
  return { title, prompt, examples };
}

/** One self-evaluation answer: 0 yes, 1 maybe, 2 not yet. */
export type Answer = 0 | 1 | 2;

export type WeekNumbers = {
  reading: { done: boolean; notes: number; href: string | null; title: string };
  writing: { status: "none" | "draft" | "submitted" | "reviewed" | "finished"; words: number; href: string | null; title: string };
  research: { done: boolean; phrases: number; href: string | null; title: string };
  video: { done: boolean; thumbUrl: string | null; duration: number | null; href: string | null; title: string };
  speaking: { done: boolean; tries: number; quote: string | null; href: string | null; situations: number };
  commitment: { name: string | null; signedAt: string | null; href: string | null };
  vocabUsed: number;
  /** Week 10: the week-1 self-check to compare with. Self-evaluations are compared only when both weeks have the
   *  same number of statements; otherwise only the confidence score. */
  week1: { confidence: number | null; yes: number | null; of: number } | null;
};

export type Reflection = { self_eval: (Answer | null)[]; answers: string[]; confidence: number | null; next_goal: string; focus: number[]; completed_at: string | null };
