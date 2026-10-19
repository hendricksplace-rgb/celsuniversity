// CelsUS CelsBook (celsus-celsbook-episode-N): the redesigned reader's section look and the helpers that turn
// the ebooks.screens blocks into its interactions. The data stays as Cowork wrote it (lib/ebook-format.ts).
import type { Block, Screen } from "@/lib/ebook-format";

export type SectionKey = "intro" | "wtw" | "vtv" | "ptf" | "fun" | "fof" | "rep";

export type Section = {
  key: SectionKey;
  /** Name in the contents and the intro map */
  name: string;
  /** Short name for the contents when the section has several pages */
  short: string;
  /** Section color (on navy) */
  c: string;
  /** Darker version of the color for text on white (contrast ≥ 4.5:1) */
  ink: string;
  /** Faded word behind the band */
  wm: string;
  /** Band lead line when the screen has no `para` */
  lead: string;
  /** "KICKER" label next to the minutes */
  meta: string;
};

export const SECTIONS: Record<SectionKey, Section> = {
  intro: { key: "intro", name: "Bienvenida", short: "Bienvenida", c: "#F2C230", ink: "#8A5A00", wm: "welcome", lead: "Tu camino a la ciudadanía empieza aquí.", meta: "Introducción" },
  wtw: { key: "wtw", name: "Words that Work", short: "Words", c: "#29B6E8", ink: "#0A6E9C", wm: "words", lead: "Palabras que vas a encontrar.", meta: "Página de vocabulario" },
  vtv: { key: "vtv", name: "Verbs that Vibe", short: "Verbs", c: "#F5B400", ink: "#8A5A00", wm: "verbs", lead: "Esas palabras puestas en acción.", meta: "Verbos" },
  ptf: { key: "ptf", name: "Phrases that Fit", short: "Phrases", c: "#FF2B95", ink: "#C4006B", wm: "phrases", lead: "Frases para tu entrevista.", meta: "Tu entrevista" },
  fun: { key: "fun", name: "Funics", short: "Funics", c: "#F48DB8", ink: "#B0245F", wm: "funics", lead: "Familias de palabras para pronunciar.", meta: "Pronunciación" },
  fof: { key: "fof", name: "Focus on your Future", short: "Focus", c: "#FF2B95", ink: "#C4006B", wm: "focus", lead: "Preguntas y respuestas del examen cívico 2025.", meta: "Examen cívico" },
  rep: { key: "rep", name: "Repaso final", short: "Repaso", c: "#F2C230", ink: "#8A5A00", wm: "review", lead: "Practica en voz alta antes de pasar al siguiente episodio.", meta: "Repaso" },
};

/** Screen kicker → section. Kickers can carry a prefix ("Episodio 4 · Introducción"). */
export function sectionOf(kicker: string | undefined): SectionKey {
  const k = (kicker ?? "").toLowerCase();
  if (k.includes("introduc")) return "intro";
  if (k.includes("words")) return "wtw";
  if (k.includes("verbs")) return "vtv";
  if (k.includes("phrases")) return "ptf";
  if (k.includes("funics")) return "fun";
  if (k.includes("focus")) return "fof";
  if (k.includes("repaso") || k.includes("review")) return "rep";
  return "intro";
}

/** "Words that Work: palabras que vas a encontrar" or an expand item → a tile of the intro map. */
export function mapTile(name: string, desc: string) {
  const key = sectionOf(name);
  const d = desc.trim();
  return { key, desc: d ? d.charAt(0).toUpperCase() + d.slice(1) : SECTIONS[key].lead };
}

export const isEpisodeMap = (b: Block) =>
  (b.type === "list" && /en este episodio/i.test(b.title ?? "")) ||
  (b.type === "expand" && b.items.length > 1 && b.items.every((it) => ["wtw", "vtv", "ptf", "fun", "fof"].includes(sectionOf(it.title))));

/** "Word Families · Family Name: -eet" → "eet". */
export function familyEnding(title: string | undefined) {
  return title?.match(/-\s*([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
}

/** A `keys` body: "Respuestas aceptadas: A · B · C" → ["A", "B", "C"]. Model answers ("A: …") keep their text. */
export function acceptedAnswers(body: string) {
  return body
    .replace(/^\s*respuestas?\s+aceptadas?\s*:\s*/i, "")
    .split(/\s+·\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A `myth` explanation without the "Realidad." / "Mito." the feedback already says. */
export const mythExplanation = (a: string) => a.replace(/^\s*(realidad|mito)\s*[.:]\s*/i, "");

/** Lowercase, no accents, punctuation or articles; "U.S." → "us". For matching question texts. */
export function normQ(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\bu\.\s?s\.?/g, "us")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * FALLBACK for the "★ 65/20" tag, used only when a question carries no `starred` / `uscis_2025_no` of its own.
 * These are the 20 starred questions of the USCIS 2025 civics test (number → English text), the same set as
 * evaluation_questions (exam "Civics Test 2025 — English", is_asterisked). Matched by normalized English text.
 */
const STARRED_2025: [number, string][] = [
  [2, "What is the supreme law of the land?"],
  [7, "How many amendments does the U.S. Constitution have?"],
  [12, "What is the economic system of the United States?"],
  [20, "Name one power of the U.S. Congress."],
  [30, "What is the name of the Speaker of the House of Representatives now?"],
  [36, "The President of the United States is elected for how many years?"],
  [38, "What is the name of the President of the United States now?"],
  [39, "What is the name of the Vice President of the United States now?"],
  [44, "Who vetoes bills?"],
  [52, "What is the highest court in the United States?"],
  [61, "Who is the governor of your state now?"],
  [66, "What do we show loyalty to when we say the Pledge of Allegiance?"],
  [74, "Who lived in America before the Europeans arrived?"],
  [78, "Who wrote the Declaration of Independence?"],
  [86, "George Washington is famous for many things. Name one."],
  [94, "Abraham Lincoln is famous for many things. Name one."],
  [113, "Martin Luther King, Jr. is famous for many things. Name one."],
  [115, "What major event happened on September 11, 2001 in the United States?"],
  [121, "Why does the flag have 13 stripes?"],
  [126, "Name three national U.S. holidays."],
];
const STARRED_BY_TEXT = new Map(STARRED_2025.map(([n, q]) => [normQ(q), n]));

/** Whether a Focus question gets the ★ 65/20 tag: its own data first, else the fallback list above. */
export function isStarred(item: { title: string; starred?: unknown; uscis_2025_no?: unknown }) {
  if (typeof item.starred === "boolean") return item.starred;
  if (typeof item.uscis_2025_no === "number") return STARRED_2025.some(([n]) => n === item.uscis_2025_no);
  return STARRED_BY_TEXT.has(normQ(item.title));
}

/** Questions whose answer is the student's own senator / representative ("Mis respuestas locales"). */
export function localAnswerFor(question: string): "senator" | "representative" | null {
  const q = normQ(question);
  if (/\bsenators? now\b/.test(q) || /your states us senators/.test(q)) return "senator";
  if (/name your us representative/.test(q) || /your us representative/.test(q)) return "representative";
  return null;
}

/** A `fields` label that is the student's senator or representative (saved on the profile). */
export function profileField(label: string): "civics_senator" | "civics_representative" | null {
  const l = label.toLowerCase();
  if (/senator|senador/.test(l)) return "civics_senator";
  if (/representative|representante/.test(l)) return "civics_representative";
  return null;
}

/**
 * Who says each line of a Phrases that Fit list. The rule is even = officer, odd = student; a list that is only
 * one side (Ep. 4 "Frases que puedes escuchar", Ep. 5 "Repite después de Amy") is told by its title.
 */
export function chatSide(title: string | undefined, i: number): "off" | "you" {
  const t = (title ?? "").toLowerCase();
  if (/puedes escuchar/.test(t)) return "off";
  if (/repite/.test(t)) return "you";
  return i % 2 === 0 ? "off" : "you";
}

/** Three "¿Qué significa …?" questions from a word list, the same for every student (no randomness). */
export function quickQuiz(items: { en: string; es: string }[], count = 3) {
  const pool = items.filter((it, i, all) => it.en && it.es && all.findIndex((x) => x.es === it.es) === i);
  if (pool.length < 3) return [];
  return Array.from({ length: Math.min(count, pool.length) }, (_, qn) => {
    const i = (qn * 5 + 2) % pool.length;
    const picks = [i];
    for (const step of [3, 7, 1, 2, 4, 5, 6]) {
      const j = (i + step) % pool.length;
      if (!picks.includes(j)) picks.push(j);
      if (picks.length === 3) break;
    }
    const options = picks.map((j) => pool[j].es).sort((a, b) => a.localeCompare(b, "es"));
    return { en: pool[i].en, es: pool[i].es, options };
  });
}

/** The first `para` of a screen becomes the band's lead line, and is not repeated in the page. */
export function leadOf(screen: Screen) {
  const i = screen.blocks.findIndex((b) => b.type === "para");
  return i >= 0 ? { text: (screen.blocks[i] as { text: string }).text, index: i } : null;
}

export const two = (n: number) => String(n).padStart(2, "0");
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
