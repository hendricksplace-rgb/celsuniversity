// CelsTV Grammar v2 (celstv-grammar-todas-mockup.html): one data shape for every episode, stored on the episode's
// grammar block as data.v2. Every text a student reads has Amy's audio (storage:// refs) and, for paragraphs,
// the start time of each word (wt, seconds from the clip's start) so the words light up while she speaks.

export type Clip = { audio: string; wt?: number[] };

export type G2Block =
  | ({ t: "para"; en: string; es: string } & Clip)
  | { t: "examples"; label_en: string; label_es: string; items: ({ en: string } & Clip)[] }
  | { t: "pairs"; items: ({ a: string; b: string } & Clip)[] }
  | { t: "table"; head: string[]; rows: { cells: string[]; audio: string }[] }
  | ({ t: "reading"; en: string; es: string; sentences: { before: string; hl: string; after: string }[]; audio_desc?: string; text?: string } & Clip)
  | { t: "phonics"; en: string; es: string; audio_desc?: string; families: { en: string; es: string; audio?: string; words: { w: string; ipa: string; audio: string }[] }[] };

export type G2Task =
  | { type: "choose"; q_en: string; q_es: string; options: { text: string; correct: boolean }[]; why_en: string; why_es: string; q_audio?: string; why_audio?: string }
  | ({ type: "build"; sentence: string; en: string; es: string; audio_inst?: string } & Clip)
  | { type: "fill"; items: ({ before: string; after: string; options: string[]; correct: string } & Clip)[] }
  | ({ type: "hear_pick"; sentence: string; word: string; files: string[]; correct: number; en: string; es: string; audio_inst?: string } & Clip);

export type G2Section = { key: string; name_es: string; name_en?: string; blocks: G2Block[]; task: G2Task | null };

export type GrammarV2 = {
  version: 2;
  ep: number;
  topic_en: string;
  topic_es: string;
  /** Words shown in pink (the grammar point), as a regular expression source. */
  hl?: string;
  sections: G2Section[];
};

export function isGrammarV2(v: unknown): v is GrammarV2 {
  const g = v as GrammarV2 | null;
  return !!g && g.version === 2 && Array.isArray(g.sections) && g.sections.length > 0 && g.sections.every((s) => typeof s?.name_es === "string" && Array.isArray(s.blocks));
}

/** How many answers a section's task asks for (0: nothing to answer, e.g. Lectura or Phonics). */
export const taskItems = (t: G2Task | null) => (!t ? 0 : t.type === "fill" ? t.items.length : 1);
