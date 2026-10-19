// CelsBSNS Interactive Research Task: one data structure for every week (celsu-celsbsns-research-brief.md "Data").
// The page (src/components/research/InteractiveResearch.tsx) is built once from it; each week is a research_content row.

export type ResearchSource = {
  key: string;
  label_es: string;
  label_en: string;
  desc_es: string;
  desc_en: string;
  /** Search URL; {q} is replaced by the URL-encoded query. */
  search_template: string;
  /** The query shown and searched; {field} is the student's field or job. */
  query_template: string;
  color: string;
  mark: string;
};

export type Bi = { es: string; en: string };

export type ResearchData = {
  week: number;
  /** The lesson's text before the redesign, kept verbatim (content_blocks body and data.text_es). */
  original: { title: string; title_es: string; time: string; goal: string; goal_es: string; body_en: string; body_es: string };
  hero: { title_a: string; title_b: string; intro_es: string; intro_en: string; chips_es: string[]; chips_en: string[]; link_b: Bi; link_p: Bi };
  min_examples: number;
  sentences: { min: number; max: number };
  sources: ResearchSource[];
  /** Used when the field is empty. */
  default_field: string;
  tip: Bi;
  lenses: { color: string; es: string; en: string }[];
  /** "Where did you find it?" (research_entries.source_type: a short key, different per week). */
  types: { key: string; es: string; en: string }[];
  share_options: { es: string[]; en: string[] };
  tone_options: { es: string[]; en: string[] };
  questions: { es: string[]; en: string[] };
  /** The practice example: made up ("EJEMPLO FICTICIO") unless `model_is_real` or it cites `source_url` ("EJEMPLO REAL"). */
  model: { name: string; initials: string; role: string; about: string; answers: { es: string[]; en: string[] }; source_url?: string };
  model_is_real?: boolean;
  patterns: { es: string[]; en: string[] };
  /** The original's "compare your two examples" questions, shown in "Lo que aprendí". */
  compare_q?: { es: string[]; en: string[] };
  /** A label for the search field when it isn't "your field or job" (e.g. "Company name"), with examples. */
  field_label?: Bi;
  field_examples?: string[];
  /** Week 2: "share one takeaway in your Video and Speaking". */
  share_next?: Bi;
};

export const modelIsReal = (d: ResearchData) => !!d.model_is_real || !!d.model.source_url;

export type ResearchEntry = {
  slot: number;
  source_type: string | null;
  url: string;
  who: string;
  field: string;
  share: number[];
  tone: number[];
  borrow: string;
  liked: string;
  analysis: string;
};
export type Phrase = { id: string; text: string; source: string | null; lesson_id: string | null };

export const emptyEntry = (slot: number): ResearchEntry => ({ slot, source_type: null, url: "", who: "", field: "", share: [], tone: [], borrow: "", liked: "", analysis: "" });

/** Sentences as the mockup counts them: each run ending in . ! or ?, plus an unfinished last one. */
export function countSentences(t: string) {
  const s = t.trim();
  return (s.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length + (s && !/[.!?]\s*$/.test(s) ? 1 : 0);
}

/** A card is complete with a type, a link, and a 5–7 sentence analysis with no [blanks] left. */
export function entryComplete(e: ResearchEntry, range: { min: number; max: number }) {
  const n = countSentences(e.analysis);
  return !!e.source_type && e.url.trim().length > 8 && !/\[[^\]]*\]/.test(e.analysis) && n >= range.min && n <= range.max;
}

/** "Armar un borrador": the mockup's draft() template (no AI). Leaves [blanks] for the student. Week 1 analyzes
 *  people's introductions; later weeks analyze companies, postings or tools, so their template is neutral. */
export function draftAnalysis(e: ResearchEntry, data: ResearchData) {
  const sh = e.share.map((j) => data.share_options.en[j]?.toLowerCase()).filter(Boolean);
  const to = e.tone.map((j) => data.tone_options.en[j]?.toLowerCase()).filter(Boolean);
  if (data.week !== 1)
    return [
      `${e.who.trim() || "[Name]"}: ${e.field.trim() || "[what it is]"}.`,
      `It highlights ${sh.length ? sh.join(", ") : "[what it highlights]"}.`,
      `It comes across as ${to.length ? to.join(" and ") : "[how it comes across]"}.`,
      `One phrase I could use is “${e.borrow.trim() || "[phrase]"}”.`,
      `What stood out to me was [what stood out].`,
      `I could apply this by [your idea].`,
    ]
      .slice(0, Math.max(data.sentences.min, Math.min(6, data.sentences.max)))
      .join(" ");
  const who = e.who.trim() || "This professional";
  return [
    `${who} works in ${e.field.trim() || "[field]"}.`,
    `In this introduction, they share ${sh.length ? sh.join(", ") : "[what they share]"}.`,
    `Their tone is ${to.length ? to.join(" and ") : "[tone]"}.`,
    `I could borrow the phrase “${e.borrow.trim() || "[phrase]"}”.`,
    `What I liked most was [what you liked].`,
    `I would improve it by [your idea].`,
  ].join(" ");
}

export function searchFor(src: ResearchSource, field: string, fallback: string) {
  const f = field.trim();
  const query = src.query_template.replace("{field}", f || fallback);
  return { url: src.search_template.replace("{q}", encodeURIComponent(query)), shown: src.query_template.replace("{field}", f || "…") };
}
