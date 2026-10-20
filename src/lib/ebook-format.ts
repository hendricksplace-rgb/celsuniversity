import type { Json } from "@/lib/supabase/types";

// Interactive e-book format (public.ebooks, format_version 1).
// Written from the content Cowork loaded on 18 Oct 2026. Keep in step with claude/celsu-ebook-reader-format.md.

export type EbookLink = { ebook: string; label: string }; // ebook = another e-book's slug
/** English term/phrase; audio + wt are added by scripts/narration (ElevenLabs). */
export type Spoken = { en: string; es: string; audio?: string | null; wt?: number[] };

export type Block =
  | { type: "para"; text: string }
  | { type: "quote"; text: string; by?: string }
  | { type: "tip"; text: string; title?: string }
  | { type: "list"; items: string[]; title?: string }
  | { type: "keys"; items: { title: string; body: string }[]; title?: string }
  | { type: "steps"; items: { title: string; body?: string }[]; title?: string }
  | { type: "expand"; items: { title: string; body: string; icon?: string }[]; title?: string }
  | { type: "whatif"; items: { q: string; a: string }[]; title?: string }
  | { type: "myth"; items: { q: string; a: string; real: boolean }[]; title?: string }
  | { type: "glossary"; groups: { name: string; items: Spoken[] }[] }
  | { type: "phrases"; items: Spoken[]; title?: string }
  | { type: "say"; items: string[]; title?: string }
  | { type: "activity"; text: string; link?: EbookLink }
  | { type: "compare"; items: { bad: string; good: string }[]; title?: string }
  /** Spanish job title or degree → its U.S. options [title, when to use it] and a context note (guided courses). */
  | { type: "titles"; items: { es: string; options: [string, string][]; note?: string }[]; title?: string; intro?: string }
  // Blocks the student fills in (saved to ebook_answers under "<screen id>:<block index>")
  | { type: "checklist"; items: { text: string; link?: EbookLink }[]; title?: string; done_text?: string }
  | { type: "notes"; title?: string; placeholder?: string; min?: number; max?: number }
  | { type: "reflect"; prompts: string[]; title?: string }
  | { type: "fields"; fields: { label: string }[]; title?: string }
  | { type: "plan"; tabs: { label: string; goals: string[] }[]; title?: string }
  | { type: "practice"; items: string[]; title?: string; hint?: string };

export type Screen = {
  id: string;
  title: string;
  kicker?: string;
  minutes?: number;
  narration?: { script?: string; audio?: string | null; wt?: number[] } | null;
  blocks: Block[];
};

export type QuizItem = { q: string; options: string[]; answer: number; why?: string; screen?: string };

export type Ebook = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  program: "celstv" | "celsbsns" | "celsus" | "celsglobal";
  pdf_path: string | null;
  cover_path: string | null;
  est_minutes: number | null;
  screens: Screen[];
  quiz: QuizItem[];
  resources: { ebook: string; title: string }[];
  review_notes: string | null;
  status: "draft" | "review" | "published";
};

/** Saved per student in ebook_answers.answers. Values depend on the block type. */
export type Answers = { [key: string]: Json | undefined };

export const answerKey = (screenId: string, blockIndex: number) => `${screenId}:${blockIndex}`;
export const quizKey = (n: number) => `quiz:${n}`;

export const INTERACTIVE_BLOCKS = new Set(["checklist", "notes", "reflect", "fields", "plan", "practice", "myth"]);
