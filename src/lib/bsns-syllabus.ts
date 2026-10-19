// CelsBSNS syllabus (celsu-celsbsns-syllabus-brief.md): the lesson "English for Business Success Syllabus" parsed into
// sections. The text itself never changes: this only reads content_blocks.body (EN) and data.text_es (ES).
// parse() is the one from celsbsns-syllabus-mockup.html, typed.
import type { createClient } from "@/lib/supabase/server";
import type { CoursePage, Part } from "@/lib/course-page";

/** The syllabus EN/ES choice, remembered per student in a cookie so the server renders the right language. */
export const SYLLABUS_LANG_COOKIE = "celsu_bsns_syllabus_lang";

type Client = Awaited<ReturnType<typeof createClient>>;

const HEAD = {
  overview: ["Course Overview", "Descripción del Curso"],
  goals: ["Learning Goals", "Objetivos de Aprendizaje"],
  reqs: ["Course Requirements", "Requisitos del Curso"],
  weeks: ["Weekly Breakdown", "Desglose Semanal"],
  cert: ["Certification", "Certificación"],
} as const;
export type SectionKey = keyof typeof HEAD;
export const headingOf = (k: SectionKey, lang: "es" | "en") => HEAD[k][lang === "es" ? 1 : 0];

export type TaskKind = "read" | "write" | "speak" | "res" | "quiz" | "check";
const KINDS: { k: "cap" | TaskKind; re: RegExp }[] = [
  { k: "cap", re: /^(Capstone Part|Proyecto Final Parte)\s*(\d+):\s*/i },
  { k: "read", re: /^(Reading|Lectura):\s*/i },
  { k: "write", re: /^(Writing|Escritura):\s*/i },
  { k: "speak", re: /^(Speaking|Expresión Oral):\s*/i },
  { k: "res", re: /^(Research|Investigación):\s*/i },
  { k: "quiz", re: /^(Video Quiz|Cuestionario en Video):\s*/i },
  { k: "check", re: /^(Final Checklist|Lista de Verificación Final):\s*/i },
];

export type SyllabusWeek = { n: number; title: string; topics: string[]; cap: { part: number; txt: string } | null; tasks: { k: TaskKind; txt: string }[] };
export type Syllabus = {
  title: string;
  sub: string;
  overview: string[];
  goalsLead: string;
  goals: string[];
  reqs: string[];
  weeks: SyllabusWeek[];
  cert: string[];
};

/** null when the text has none of the section headings: the page then shows the plain paragraphs. */
export function parseSyllabus(raw: string): Syllabus | null {
  const paras = raw
    .trim()
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Syllabus = { title: paras[0] ?? "", sub: paras[1] ?? "", overview: [], goalsLead: "", goals: [], reqs: [], weeks: [], cert: [] };
  let sec: SectionKey | null = null;
  let found = 0;
  for (const p of paras.slice(2)) {
    const h = (Object.entries(HEAD) as [SectionKey, readonly string[]][]).find(([, v]) => v.includes(p));
    if (h) {
      sec = h[0];
      found++;
      continue;
    }
    if (sec === "overview") out.overview.push(p);
    else if (sec === "goals") {
      if (/:$/.test(p)) out.goalsLead = p;
      else out.goals.push(p);
    } else if (sec === "reqs") out.reqs.push(p);
    else if (sec === "cert") out.cert.push(p);
    else if (sec === "weeks") {
      const lines = p.split("\n").map((l) => l.trim());
      const m = lines[0].match(/^(Week|Semana)\s*(\d+)\s*[–-]\s*(.*)$/);
      if (!m) continue;
      const w: SyllabusWeek = { n: Number(m[2]), title: m[3], topics: [], cap: null, tasks: [] };
      for (const l of lines.slice(1)) {
        const kd = KINDS.find((x) => x.re.test(l));
        if (!kd) {
          w.topics.push(l);
          continue;
        }
        const txt = l.replace(kd.re, "");
        if (kd.k === "cap") w.cap = { part: Number(l.match(kd.re)![2]), txt };
        else w.tasks.push({ k: kd.k, txt });
      }
      out.weeks.push(w);
    }
  }
  return found ? out : null;
}

/** The syllabus lesson: week 1's reading whose title says "Syllabus". */
export const isSyllabus = (p: Pick<Part, "type" | "title">) => p.type === "reading" && /syllabus/i.test(p.title);

/** The syllabus text in both languages (es falls back to en), or null when the lesson isn't there. */
export async function loadSyllabus(supabase: Client, page: CoursePage) {
  const part = page.episodes.flatMap((e) => e.parts).find(isSyllabus);
  if (!part) return null;
  const { data: blocks } = await supabase
    .from("content_blocks")
    .select("body, data")
    .eq("lesson_id", part.id)
    .eq("block_type", "text")
    .eq("teacher_only", false)
    .order("sort_order");
  const en = (blocks ?? [])
    .map((b) => b.body ?? "")
    .filter(Boolean)
    .join("\n\n");
  const esParts = (blocks ?? []).map((b) => {
    const es = (b.data as Record<string, unknown> | null)?.text_es;
    return typeof es === "string" ? es : "";
  });
  const es = esParts.length && esParts.every(Boolean) ? esParts.join("\n\n") : null;
  return { part, en, es };
}

/** Capstone parts 1–10 from the syllabus, in the student's language. */
export function capstoneParts(text: { en: string; es: string | null } | null, lang: "es" | "en") {
  if (!text) return [];
  const s = parseSyllabus(lang === "es" && text.es ? text.es : text.en) ?? parseSyllabus(text.en);
  return (s?.weeks ?? []).filter((w) => w.cap).map((w) => ({ week: w.n, part: w.cap!.part, text: w.cap!.txt }));
}
