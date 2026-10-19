// CelsBSNS "Mi Capstone" (celsu-celsbsns-capstone-brief.md, celsbsns-capstone-mockup.html): the 10 parts, one per
// week. Each part is data: {part, week, title, why, preview bullets, fields}. Part 1's fields are defined; parts 2–10
// get theirs with the weeks 2–10 prompt (same component, new data). No coach: the app only checks the minimums.

export type Lang = "es" | "en";
export type Bi = { es: string; en: string };

import PARTS_2_10 from "../../content/celsbsns/capstone-parts-2-10.json";

/** Where "Usar lo de mi semana" copies from, in that part's week: the Writing email (submissions.body), the best
 *  Speaking try (speaking_best.text), the Video script (video_proofs.script) or the Research analysis
 *  (research_entries.analysis, else research_reflections.change). */
export type FillFrom = "writing" | "speaking" | "video" | "research";

export type CapField = {
  k: string;
  label: Bi;
  hint?: Bi;
  /** "file": the Part 10 resume (a PDF in the private resumes bucket; the field holds its storage path). */
  type: "input" | "textarea" | "file";
  /** Characters (trimmed) required before the part can be marked complete. */
  min: number;
  placeholder?: string;
  fill_from?: FillFrom;
};

export type CapPart = {
  part: number;
  week: number;
  title: Bi;
  why?: Bi;
  /** "En esta parte vas a incluir:" while the part is locked (or has no fields yet). */
  preview: { es: string[]; en: string[] };
  fields: CapField[];
  /** How the part shows in the profile document ("Ver mi perfil"): one section per field key. */
  doc?: { k: string; h: Bi; quote?: boolean }[];
};

type JsonField = { k: string; label_es: string; label_en: string; hint_es?: string; hint_en?: string; type: string; min: number; fill_from: string | null };
type JsonPart = { part: number; week: number; title_es: string; title_en: string; preview_es: string[]; preview_en: string[]; fields: JsonField[] };
/** Parts 2–10 come from content/celsbsns/capstone-parts-2-10.json (Matt's brief, section 5). */
function fromJson(list: JsonPart[]): CapPart[] {
  return list.map((p) => ({
    part: p.part,
    week: p.week,
    title: { es: p.title_es, en: p.title_en },
    preview: { es: p.preview_es, en: p.preview_en },
    fields: p.fields.map((f) => ({
      k: f.k,
      label: { es: f.label_es, en: f.label_en },
      hint: f.hint_es || f.hint_en ? { es: f.hint_es ?? f.hint_en ?? "", en: f.hint_en ?? f.hint_es ?? "" } : undefined,
      type: f.type === "file" ? "file" : f.type === "input" ? "input" : "textarea",
      min: f.min,
      fill_from: (["writing", "speaking", "video", "research"] as const).find((x) => x === f.fill_from),
    })),
  }));
}

export const CAPSTONE_PARTS: CapPart[] = [
  {
    part: 1,
    week: 1,
    title: { es: "Tu experiencia y objetivos", en: "Your background and goals" },
    why: {
      es: "La base de tu perfil: quién eres, qué has hecho y a dónde quieres llegar en EE. UU.",
      en: "The base of your profile: who you are, what you've done and where you want to go in the U.S.",
    },
    preview: {
      es: ["Tu nombre y el puesto que quieres", "Tu experiencia profesional", "Tus metas y tu presentación de 30 segundos"],
      en: ["Your name and the role you want", "Your professional background", "Your goals and your 30-second introduction"],
    },
    fields: [
      { k: "name", label: { es: "Tu nombre y el puesto que quieres", en: "Your name and the role you want" }, type: "input", min: 5, placeholder: "Ana Pérez · Logistics Coordinator" },
      {
        k: "bg",
        label: { es: "Tu experiencia profesional", en: "Your professional background" },
        hint: { es: "2–4 oraciones en inglés. Puedes tomarlo de tu correo de Writing.", en: "2–4 sentences in English. You can take it from your Writing email." },
        type: "textarea",
        min: 120,
        fill_from: "writing",
      },
      {
        k: "goals",
        label: { es: "Tus metas profesionales en EE. UU.", en: "Your career goals in the U.S." },
        hint: { es: "¿Qué quieres lograr en los próximos 1 a 3 años?", en: "What do you want to achieve in the next 1–3 years?" },
        type: "textarea",
        min: 80,
      },
      {
        k: "pitch",
        label: { es: "Tu presentación de 30 segundos", en: "Your 30-second introduction" },
        hint: { es: "Tu mejor intento de Speaking ya está aquí. Mejóralo si quieres.", en: "Your best Speaking try is already here. Improve it if you want." },
        type: "textarea",
        min: 80,
        fill_from: "speaking",
      },
    ],
    doc: [
      { k: "bg", h: { es: "RESUMEN PROFESIONAL", en: "PROFESSIONAL SUMMARY" } },
      { k: "goals", h: { es: "MIS METAS", en: "MY GOALS" } },
      { k: "pitch", h: { es: "MI PRESENTACIÓN", en: "MY INTRODUCTION" }, quote: true },
    ],
  },
  ...fromJson(PARTS_2_10 as JsonPart[]),
];

export type CapFields = Record<string, string>;

/** Every required field reaches its minimum (a part with no fields defined yet can't be completed). */
export const partReady = (def: CapPart, v: CapFields) =>
  def.fields.length > 0 && def.fields.every((f) => (f.type === "file" ? !!(v[f.k] ?? "").trim() : (v[f.k] ?? "").trim().length >= f.min));
export const fieldOk = (f: CapField, val: string) => (f.type === "file" ? !!val.trim() : val.trim().length >= f.min);
/** The Part 10 resume: one file per student and course in the private resumes bucket (owner folder). */
export const resumePath = (userId: string, courseId: string) => `${userId}/capstone-${courseId}.pdf`;
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

/** capstone_parts.body, kept in sync with the fields as plain text (staff views and older readers use it). */
export const partBody = (def: CapPart, v: CapFields) =>
  def.fields
    .filter((f) => f.type !== "file")
    .map((f) => [f.label.en, (v[f.k] ?? "").trim()] as const)
    .filter(([, x]) => x)
    .map(([h, x]) => `${h}\n${x}`)
    .join("\n\n")
    .slice(0, 20000);

/** "Ana Pérez · Logistics Coordinator" → ["Ana Pérez", "Logistics Coordinator"]. */
export function splitName(s: string): [string, string] {
  const at = s.search(/\s[·|–—-]\s|·/);
  if (at < 0) return [s.trim(), ""];
  const m = s.slice(at).match(/^\s*[·|–—-]\s*/);
  return [s.slice(0, at).trim(), s.slice(at + (m?.[0].length ?? 1)).trim()];
}

/** The Speaking exercise whose best try feeds "Tu presentación de 30 segundos": exercise 1 (One-on-One Team
 *  Introduction), else the elevator pitch (3), else the group meeting (2). */
export const PITCH_EXERCISE_ORDER = [1, 3, 2];
/** "Usar lo de mi semana" into a one-line input keeps the first 200 characters (the input's limit). */
export const INPUT_MAX = 200;

/** The Writing email as "Tu experiencia profesional": the body without its greeting line ("Hello team,") and its
 *  closing ("Best regards, / Ana"), so the profile reads as a summary, not a letter. */
export function emailToBackground(body: string) {
  const paras = body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const greeting = /^(hello|hi|hey|dear|good (morning|afternoon|evening)|greetings)\b[^\n]{0,60}[,!:]?$/i;
  if (paras.length > 1 && greeting.test(paras[0]!.split("\n")[0]!) && paras[0]!.split("\n").length === 1) paras.shift();
  else if (paras.length && greeting.test(paras[0]!.split("\n")[0]!)) paras[0] = paras[0]!.split("\n").slice(1).join("\n").trim();
  const closing = /^(best|kind|warm)?\s*(regards|wishes)|^(sincerely|thanks|thank you|cheers|respectfully|all the best|best)\b[^\n]{0,30}[,!.]?\s*(\n|$)/i;
  const at = paras.findIndex((p, i) => i > 0 && closing.test(p));
  const kept = at > 0 ? paras.slice(0, at) : paras;
  return kept.join("\n\n").trim() || body.trim();
}
