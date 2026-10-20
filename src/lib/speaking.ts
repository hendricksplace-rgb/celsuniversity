// CelsBSNS Speaking Practice (celsu-celsbsns-speaking-brief.md): one data structure for every week; the page
// (src/components/speaking/InteractiveSpeaking.tsx) is built once from it. Matt's decisions: no AI feedback, no grade,
// and audio is never stored. Only the text of the best try per exercise is saved (speaking_best).

export type Bi = { es: string; en: string };
export type BiList = { es: string[]; en: string[] };

export type SpeakingExercise = {
  /** An icon name from the shell set; unknown names fall back to the mic. */
  icon: string;
  scene: {
    kind: "zoom" | "meeting" | "elevator";
    /** The call or place label ("Zoom · Weekly Sync"), and its right-hand meta ("Empieza en 0:30"). */
    bar: Bi;
    meta: Bi;
    speaker: Bi;
    /** What the other person says (English). */
    line: string;
    /** Zoom: the other person's tile name and initials. */
    tile?: { name: string; initials: string };
  };
  title: Bi;
  situation: Bi;
  points: BiList;
  how: Bi;
  reps: number;
  twists: BiList;
  /** The goal length in seconds. */
  limit_s: [number, number];
  /** Reps done away from the app ("Lo hice sin grabar"). */
  manual_ok?: boolean;
  /** Week 2: lines to start the conversation with. */
  prompts?: string[];
  /** Week 2: the original "❌ don't say / ✅ say" pair. */
  avoid_say?: { dont: string; do: string };
  /** Week 3: a model answer (English; lines may be separated by \n). */
  model?: string;
};

/** The original's closing reflection questions: a plain list (weeks 2, 6, 8, 10) or, in week 3, a short recorded
 *  reflection with an intro and a time goal. */
export type SpeakingReflection = BiList | { intro_en: string; intro_es: string; questions: BiList; limit_s?: [number, number] };

export type SpeakingData = {
  week: number;
  /** The lesson's text before the redesign, kept verbatim (content_blocks body and data.text_es). */
  original: { title: string; title_es: string; time: string; goal: string; goal_es: string; body_en: string; body_es: string };
  hero: { title_a: string; title_b: string; intro_es: string; intro_en: string; chips_es: string[]; chips_en: string[]; priv_b: Bi; priv_p: Bi };
  rules: { icon: "repeat" | "mic" | "people" | "book"; t_es: string; t_en: string; d_es: string; d_en: string }[];
  /** The Reading lesson whose vocab list is the week's vocabulary. */
  vocab_from_lesson_id: string;
  exercises: SpeakingExercise[];
  /** The partner questions; `reflect` (week 5) is one more open question to think about. */
  bonus: { questions: BiList; options: BiList; reflect?: Bi };
  reflection?: SpeakingReflection;
  max_s: number;
};

/** speaking_progress arrays: one rep count per exercise and one partner answer per bonus question (the database
 *  allows 1–6 of each). */
export const repsLength = (d: SpeakingData) => Math.min(6, Math.max(1, d.exercises.length));
export const partnerLength = (d: SpeakingData) => Math.min(6, Math.max(1, d.bonus.questions.en.length));

export type SpeakingBest = { exercise: number; text: string; duration_s: number | null; points: number[] };
export type VocabWord = { word: string; es: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Plain text match (no AI): "follow-through" also matches "follow through"; an optional plural "s". */
const wordRe = (w: string) => esc(w).replace(/\\-|-/g, "[- ]?");
export const vocabRegex = (words: VocabWord[]) => (words.length ? new RegExp(`\\b(${words.map((v) => `${wordRe(v.word)}s?`).join("|")})\\b`, "gi") : null);
export const vocabCount = (text: string, words: VocabWord[]) => words.filter((v) => new RegExp(`\\b${wordRe(v.word)}`, "i").test(text)).length;
export const countWordsSimple = (t: string) => (t.trim().match(/\S+/g) || []).length;
export const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
