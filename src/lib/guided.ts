// CelsGLOBAL guided courses (celsu-global-cv-resume-brief.md): one page per module ("step"), built from
// guided_course_steps.data. The step template, the practice kinds and the build sections are generic; only the
// data is course-specific. The resume helpers below serve "Mi resume" (resumes.data, owner only).
import type { Block } from "@/lib/ebook-format";

export type Lang = "es" | "en";

// ---------- step content (guided_course_steps.data) ----------

export type SortPractice = { kind: "sort"; title: string; intro?: string; labels: { a: string; b: string }; items: { text: string; answer: "a" | "b"; why?: string }[] };
export type OrderPractice = { kind: "order"; title: string; intro?: string; items: string[]; distractors?: { text: string; why: string }[]; note?: string };
export type PickPractice = { kind: "pick"; title: string; intro?: string; items: { weak: string; options: string[]; answer: number; why: string }[] };
export type SpotPractice = { kind: "spot"; title: string; intro?: string; doc: { text: string; err: string | null }[] };
export type HighlightPractice = { kind: "highlight"; title: string; intro?: string; ad_title?: string; ad: string; label?: string; keywords: string[]; min_found?: number };
export type LabelPractice = { kind: "label"; title: string; intro?: string; labels: string[]; items: { text: string; answer: string }[]; done?: string };
export type MythPractice = { kind: "myth"; title: string; intro?: string; labels?: { true: string; false: string }; items?: { q: string; real: boolean; a: string }[]; from_ebook?: string };
export type WhatIfPractice = { kind: "whatif"; title: string; intro?: string; items?: { q: string; a: string }[]; from_ebook?: string };
export type GuessPractice = { kind: "guess"; title: string; intro?: string; min: number; max: number; step: number; answer: number; tolerance: number; reveal: { rows: string[]; total: string } };
export type EstimatePractice = { kind: "estimate"; title: string; intro?: string; items: { text: string; options: string[]; answer: number }[] };
export type SumPractice = { kind: "sum"; title: string; intro?: string; rows: [string, number][]; answer: number; options: number[]; why?: string };
export type MultiplyPractice = { kind: "multiply"; title: string; intro?: string; items: [string, number, number][] };
export type ListenPickPractice = { kind: "listen_pick"; title: string; intro?: string; items: { situation: string; options: string[]; answer: number; why?: string }[] };
export type Practice =
  | SortPractice
  | OrderPractice
  | PickPractice
  | SpotPractice
  | HighlightPractice
  | LabelPractice
  | MythPractice
  | ListenPickPractice
  | WhatIfPractice
  | GuessPractice
  | EstimatePractice
  | SumPractice
  | MultiplyPractice;

type Base = { key: string; title?: string; hint?: string; optional?: boolean };
export type FieldDef = { k: string; label: string; placeholder?: string; check?: "email" | "phone_cc"; optional?: boolean; input?: "text" | "datetime" | "select" | "day" | "date"; options?: string[]; money?: boolean };
export type ChecklistItem = string | { text: string; link?: { label: string; step?: number; tool?: string; course?: string } };
export type AutoItem = { text: string; auto?: AutoRule };
export type Section =
  | (Base & { type: "fields"; fields: FieldDef[] })
  | (Base & { type: "textarea" })
  | (Base & { type: "checklist"; items?: ChecklistItem[]; from?: string; result?: { high: string; mid: string; low: string } })
  | (Base & { type: "notes2"; lists: { k: string; label: string }[] })
  | (Base & { type: "reflect"; prompts: string[] })
  | (Base & { type: "template"; template: string; slots?: string[]; example?: string; min_chars?: number; max_chars?: number; lang?: string })
  | (Base & { type: "jobs"; bullets?: { min?: number; max?: number; checks?: string[] } })
  | (Base & { type: "education"; suggest_equivalent?: boolean })
  | (Base & { type: "chips"; min?: number; max?: number })
  | (Base & { type: "pick_many"; from?: string; count?: number; audio?: boolean; options?: string[]; why_each?: boolean; with_start_date?: boolean; allow_custom?: boolean })
  | (Base & { type: "list"; min?: number; max?: number; placeholder?: string })
  | (Base & { type: "postings"; count?: number; fields?: string[]; reflect?: string[] })
  | (Base & { type: "autocheck"; groups: { title: string; items: AutoItem[] }[]; done_text?: string; fix_link?: string })
  | (Base & { type: "versions"; count?: number; help?: Record<string, string>; file_name?: string })
  | (Base & { type: "ai_translate"; button?: string; review_questions?: string[]; rule?: string })
  | (Base & { type: "ai_suggest" })
  | (Base & { type: "export"; file_name?: string; formats?: string[]; send_to?: string })
  | (Base & { type: "card"; text: string; link?: { label: string; url: string }; needs_matt_confirm?: boolean })
  | (Base & { type: "normal_vs_better"; questions: string[]; lang?: string })
  | (Base & { type: "answers"; questions: AnswerQ[]; speaking_wpm?: number; max_s?: number; lang?: string })
  | (Base & { type: "self_video"; question: string; min_s?: number; max_s?: number; setup?: string[]; watch?: string[]; upload?: boolean })
  | (Base & { type: "rubric"; scale: string[]; groups: { title: string; items: string[] }[]; comments_per_group?: boolean })
  | (Base & { type: "toggle"; text: string })
  | (Base & { type: "tip"; text: string })
  | (Base & {
      type: "budget";
      currency?: "USD" | "MXN";
      income_label?: string;
      income?: { annual_to_net?: { divide: number; tax_pct: number; note?: string } };
      categories: [string, string, (string | null)?][];
      rules?: { k: string; pct?: number; text: string; fail?: string }[];
      show_balance?: boolean;
      chart?: string;
      is_master?: boolean;
    })
  | (Base & { type: "budget_6m"; currency?: string; note?: string; from_ebook?: string })
  | (Base & { type: "calc"; formula: string; label: string; editable?: boolean; from?: string })
  | (Base & { type: "compare_options"; options: string[]; fields: FieldDef[]; check?: string })
  | (Base & { type: "choice"; writes_to?: string })
  | (Base & { type: "checklist_amounts"; items: string[]; writes_to?: string[] })
  | (Base & { type: "savings_plan"; fields: FieldDef[]; writes_to?: string; result?: string })
  | (Base & { type: "spend_log"; days: number; mark_reducible?: boolean; totals?: string[] })
  | (Base & { type: "plan"; tabs: { label: string; suggest: string[] }[]; per_tab: number })
  | (Base & { type: "simulator"; modes?: string[]; interviewer?: { name: string; role_from?: string; company_from?: string }; questions: SimQ[]; audio_base?: string; max_s?: number; eval: { k: string; label: string; o: string[] }[]; comments?: boolean; before?: string[] });

export type AnswerForm = "star" | "present_past_future" | "strength_weakness" | "five_years" | "free";
export type AnswerQ = { en: string; es: string; form: AnswerForm; prefill_from?: string };
export type SimQ = { en: string | null; audio?: string; surprise?: boolean; note?: string };
export type MoreVideo = { provider: string; id: string; title: string; channel?: string; lang?: string; about?: string };

export type GuidedStep = {
  version: number;
  step: number;
  of: number;
  module_id: string;
  video: { media_url: string } | null;
  more_video?: MoreVideo | null;
  more_videos?: MoreVideo[];
  kicker: string;
  title: string;
  minutes: number;
  intro: string;
  builds: string;
  keys: { t: string; d: string }[];
  essentials?: Block[];
  /** Finanzas: "Lo esencial" is the e-book's own screens (without its activity blocks). */
  essentials_from?: { ebook: string; screens: string[]; skip?: { types?: string[]; title_prefix?: string } };
  /** Filled by the loader from essentials_from: the e-book's screens, without the skipped blocks. */
  ebookScreens?: { id: string; title: string; audio?: string | null; blocks: Block[] }[];
  disclaimer?: string;
  example?: { title: string; net: number; items: Record<string, number>; balance?: number; button?: string };
  practice: Practice | null;
  build: { title: string; intro?: string; sections: Section[]; commitment?: string };
  check?: { q: string; o: string[]; a: number; why: string }[];
  finish?: { title: string; text: string; cta?: { label: string; course?: string; view?: "plan" } };
};

/** A section is shown unless it waits for Matt (needs_matt_confirm: hidden until he confirms). */
export const visibleSections = (s: GuidedStep) => s.build.sections.filter((x) => !(x.type === "card" && x.needs_matt_confirm));

// ---------- theme and product (courses.theme): the colors, the hero and what the course builds ----------

export type GuidedTheme = "resume" | "interview" | "finanzas";
export const themeOf = (v: string | null | undefined): GuidedTheme => (v === "interview" || v === "finanzas" ? v : "resume");
/** Each course builds one "product", stored in its own owner-only table. */
type Bi = { es: string; en: string };
export const PRODUCT: Record<GuidedTheme, { table: "resumes" | "answer_banks" | "financial_plans"; path: string; label: Bi; icon: string; build: Bi; rail: Bi; railP: Bi; see: Bi; privacy?: Bi }> = {
  resume: {
    table: "resumes",
    path: "mi-resume",
    label: { es: "Mi resume", en: "My resume" },
    icon: "doc",
    build: { es: "Construye tu resume", en: "Build your resume" },
    rail: { es: "LO QUE CONSTRUYES", en: "WHAT YOU BUILD" },
    railP: { es: "Todo se guarda solo en Mi resume.", en: "Everything saves to My resume automatically." },
    see: { es: "Ver mi resume", en: "See my resume" },
  },
  interview: {
    table: "answer_banks",
    path: "mi-banco",
    label: { es: "Mis respuestas", en: "My answers" },
    icon: "chat",
    build: { es: "Construye tus respuestas", en: "Build your answers" },
    rail: { es: "MI BANCO", en: "MY BANK" },
    railP: { es: "Todo se guarda solo en tu banco de respuestas.", en: "Everything saves to your answer bank automatically." },
    see: { es: "Ver mis respuestas", en: "See my answers" },
    privacy: { es: "Tus respuestas y grabaciones son solo tuyas.", en: "Your answers and recordings are yours only." },
  },
  finanzas: {
    table: "financial_plans",
    path: "mi-plan",
    label: { es: "Mi plan", en: "My plan" },
    icon: "chart",
    build: { es: "Construye tu plan", en: "Build your plan" },
    rail: { es: "MI PLAN", en: "MY PLAN" },
    railP: { es: "Todo se guarda solo en Mi plan financiero.", en: "Everything saves to My financial plan automatically." },
    see: { es: "Ver mi plan", en: "See my plan" },
    privacy: { es: "Tus números son solo tuyos. Nadie más ve tu presupuesto.", en: "Your numbers are yours only. Nobody else sees your budget." },
  },
};

// ---------- per-step progress (guided_step_progress.state) ----------

export type StepState = {
  /** A step without questions: the student tapped "Terminar el curso". */
  ended?: boolean;
  practice?: Record<string, unknown>;
  check?: Record<string, number>;
  ess?: Record<string, unknown>;
};

// ---------- the student's resume (resumes.data) ----------

export type Contact = { name?: string; city?: string; email?: string; phone?: string; linkedin?: string };
export type Job = { id: string; title: string; company: string; city: string; from: string; to: string; bullets: string[] };
export type Edu = { id: string; degree: string; institution: string; city: string; year: string };
export type Posting = { role: string; company: string; url: string; asks: string };
export type Version = {
  id: string;
  company: string;
  role: string;
  ad_text: string;
  keywords: string[];
  changes: string;
  applied_on: string;
  summary_override: string;
  skills_order: string[];
  bullet_rewrites: Record<string, string>;
};
export const EN_SECTIONS = ["contact", "summary", "skills", "jobs", "education", "certs"] as const;
export type EnSection = (typeof EN_SECTIONS)[number];
export type EnDraft = {
  contact: { city: string };
  summary: string;
  skills: string[];
  jobs: Job[];
  education: Edu[];
  certs: string[];
  approved: Partial<Record<EnSection, boolean>>;
  at: string;
};
export type ResumeData = {
  [key: string]: unknown;
  contact?: Contact;
  summary?: string;
  jobs?: Job[];
  education?: Edu[];
  certs?: string[];
  skills?: string[];
  versions?: Version[];
  en?: EnDraft;
  en_status?: "draft" | "approved";
};

export const uid = () => Math.random().toString(36).slice(2, 10);
export const str = (v: unknown) => (typeof v === "string" ? v : "");
export const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
export const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export const jobsOf = (d: ResumeData): Job[] =>
  (Array.isArray(d.jobs) ? d.jobs : []).map((j) => {
    const o = obj(j);
    return { id: str(o.id) || uid(), title: str(o.title), company: str(o.company), city: str(o.city), from: str(o.from), to: str(o.to), bullets: strs(o.bullets) };
  });
export const eduOf = (d: ResumeData): Edu[] =>
  (Array.isArray(d.education) ? d.education : []).map((e) => {
    const o = obj(e);
    return { id: str(o.id) || uid(), degree: str(o.degree), institution: str(o.institution), city: str(o.city), year: str(o.year) };
  });
export const contactOf = (d: ResumeData): Contact => obj(d.contact) as Contact;

// ---------- live checks ----------

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Spanish first-person past ("Implementé", "Atendí", "Reduje") or present ("Coordino"), or English past ("Led", "Improved"). */
const IRREGULAR = new Set(
  ["reduje", "produje", "conduje", "introduje", "traduje", "hice", "tuve", "obtuve", "mantuve", "puse", "dirigi", "supervise", "logre", "gane", "lidero", "coordino", "superviso", "dirijo", "gestiono", "administro", "desarrollo", "implemento", "atiendo", "capacito", "negocio", "analizo", "reduzco", "aumento", "mejoro", "manejo", "diseno", "elaboro", "creo", "organizo", "preparo", "vendo", "opero", "planeo", "programo", "led", "built", "ran", "won", "grew", "made", "taught", "drove", "wrote", "oversaw", "sold", "cut", "set", "met", "kept", "brought", "managed"].map(norm),
);
const NOT_VERB = new Set(["fui", "era", "estuve", "fue", "mi", "mis", "el", "la", "los", "las", "un", "una", "responsable", "encargado", "encargada"].map(norm));
export function startsWithVerb(text: string, extra: string[] = []) {
  const w = text.trim().split(/[\s,.;:]+/)[0] ?? "";
  if (!w) return false;
  const n = norm(w);
  if (NOT_VERB.has(n)) return false;
  if (IRREGULAR.has(n) || extra.some((x) => norm(x) === n)) return true;
  // Accented past forms: Implementé, Atendí, Negocié, Analicé.
  if (/[éí]$/i.test(w) && w.length >= 4) return true;
  // English simple past.
  if (/^[A-Za-z]{3,}ed$/.test(w)) return true;
  return false;
}
export const hasNumber = (text: string) => /\d/.test(text);
export const BULLET_MAX = 170;
export const bulletChecks = (text: string, extra: string[] = []) => ({
  verb: startsWithVerb(text, extra),
  number: hasNumber(text),
  short: text.trim().length > 0 && text.trim().length <= BULLET_MAX,
});
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const phoneCcOk = (v: string) => /^\+\d{1,3}[\s\d().-]{6,}$/.test(v.trim());

// ---------- U.S. equivalents ("En EE.UU.: …") from the course's `titles` blocks ----------

export type TitleItem = { es: string; options: [string, string][]; note?: string };
const stem = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["del", "las", "los", "para", "con"].includes(w))
    .map((w) => w.replace(/(as|os|es|a|o|e)$/, ""));

export function titlesOf(steps: GuidedStep[]): TitleItem[] {
  return steps.flatMap((s) => (s.essentials ?? []).flatMap((b) => (b.type === "titles" ? (b.items as TitleItem[]) : [])));
}
/** The U.S. options for a Spanish job title or degree: a `titles` entry it matches, else a degree rule. */
export function equivalents(text: string, titles: TitleItem[], kind: "job" | "degree"): string[] {
  const t = stem(text);
  if (t.length === 0) return [];
  let best: { score: number; item: TitleItem } | null = null;
  for (const item of titles) {
    const e = stem(item.es);
    const hit = e.filter((w) => t.includes(w)).length;
    const score = hit / Math.max(e.length, t.length);
    if (hit >= Math.min(2, e.length) && score >= 0.6 && (!best || score > best.score)) best = { score, item };
  }
  if (best) return best.item.options.map((o) => o[0]);
  if (kind === "degree") {
    const n = norm(text);
    if (n.startsWith("licenciatura") || n.startsWith("ingenieria") || n.startsWith("ingeniero")) return ["Bachelor's Degree in …"];
    if (n.startsWith("maestria")) return ["Master's Degree in …"];
    if (n.startsWith("doctorado")) return ["Ph.D. in …"];
    if (n.startsWith("tecnico") || n.startsWith("tsu")) return ["Associate Degree in …"];
  }
  return [];
}

// ---------- automatic review (autocheck rules) ----------

export type AutoRule = "no_personal_data" | "bullets_have_numbers" | "jobs_within_15y" | "fits_one_page" | "dates_consistent" | "bullets_start_with_verb" | "always_true_template";
export type RuleResult = { ok: boolean | null; detail?: string };

const PERSONAL = [
  /\bcurp\b/i,
  /\brfc\b/i,
  /\bnss\b/i,
  /\b\d{2}\s*(años|anos|years old)\b/i,
  /\bedad\b/i,
  /estado civil|marital status/i,
  /\b(casad[oa]|solter[oa]|divorciad[oa]|viud[oa]|married)\b/i,
  /\bhij[oa]s?\b/i,
  /\bfotograf[ií]a\b|\bfoto\b|\bphoto\b/i,
  /fecha de nacimiento|date of birth|\bnacionalidad\b/i,
];
/** Every text in the document sections (not the private notes or the pasted CV). */
export function docTexts(d: ResumeData) {
  const c = contactOf(d);
  return [
    c.name, c.city, c.email, c.phone, c.linkedin,
    str(d.summary),
    ...strs(d.skills),
    ...strs(d.certs),
    ...jobsOf(d).flatMap((j) => [j.title, j.company, j.city, j.from, j.to, ...j.bullets]),
    ...eduOf(d).flatMap((e) => [e.degree, e.institution, e.city, e.year]),
  ].filter((x): x is string => !!x && !!x.trim());
}
export const personalHits = (d: ResumeData) => docTexts(d).filter((t) => PERSONAL.some((re) => re.test(t)));

const MONTHS = "ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic|jan|apr|aug|dec|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|june|july|august|september|october|november|december";
export function dateKind(s: string): "present" | "month_year" | "num" | "year" | "other" | "empty" {
  const v = norm(s.trim()).replace(/\.$/, "");
  if (!v) return "empty";
  if (/^(presente|present|actual|actualidad|hoy|la fecha)$/.test(v)) return "present";
  if (new RegExp(`^(${MONTHS})\\.?\\s+(de\\s+)?\\d{4}$`).test(v)) return "month_year";
  if (/^\d{1,2}[/-]\d{4}$/.test(v)) return "num";
  if (/^\d{4}$/.test(v)) return "year";
  return "other";
}
const yearOf = (s: string) => {
  const m = /(\d{4})/.exec(s);
  return m ? Number(m[1]) : null;
};
const bulletsOf = (d: ResumeData) => jobsOf(d).flatMap((j) => j.bullets.filter((b) => b.trim()));

export function runRules(d: ResumeData, fitsOnePage: boolean | null, verbs: string[] = [], now = new Date()): Record<AutoRule, RuleResult> {
  const bullets = bulletsOf(d);
  const jobs = jobsOf(d).filter((j) => j.title.trim() || j.company.trim());
  const hits = personalHits(d);
  const withNum = bullets.filter(hasNumber).length;
  const withVerb = bullets.filter((b) => startsWithVerb(b, verbs)).length;
  const limit = now.getFullYear() - 15;
  const old = jobs.filter((j) => {
    if (dateKind(j.to) === "present") return false;
    const y = yearOf(j.to) ?? yearOf(j.from);
    return y !== null && y < limit;
  });
  const kinds = new Set(jobs.flatMap((j) => [j.from, j.to]).map(dateKind).filter((k) => k !== "present" && k !== "empty"));
  return {
    no_personal_data: { ok: hits.length === 0, detail: hits[0] },
    bullets_have_numbers: { ok: bullets.length ? withNum / bullets.length >= 0.7 : null, detail: `${withNum}/${bullets.length}` },
    jobs_within_15y: { ok: jobs.length ? old.length === 0 : null, detail: old[0]?.title },
    fits_one_page: { ok: fitsOnePage },
    dates_consistent: { ok: kinds.size === 0 ? null : kinds.size === 1 && !kinds.has("other") },
    bullets_start_with_verb: { ok: bullets.length ? withVerb === bullets.length : null, detail: `${withVerb}/${bullets.length}` },
    always_true_template: { ok: true },
  };
}

// ---------- the document (Spanish from the fields, English from the approved draft) ----------

export type DocModel = {
  name: string;
  contact: string[];
  summary: string;
  skills: string[];
  jobs: Job[];
  education: Edu[];
  certs: string[];
};
export const HEADINGS: Record<Lang, { summary: string; skills: string; jobs: string; education: string; certs: string }> = {
  es: { summary: "Perfil profesional", skills: "Habilidades clave", jobs: "Experiencia profesional", education: "Educación", certs: "Certificaciones" },
  en: { summary: "Professional Summary", skills: "Key Skills", jobs: "Professional Experience", education: "Education", certs: "Certifications" },
};

/** A version (step 5) changes the summary, the skills order and some achievements. */
export function applyVersion(d: ResumeData, v: Version | null): ResumeData {
  if (!v) return d;
  const skills = strs(d.skills);
  const order = v.skills_order.filter((s) => skills.includes(s));
  return {
    ...d,
    summary: v.summary_override.trim() || str(d.summary),
    skills: [...order, ...skills.filter((s) => !order.includes(s))],
    jobs: jobsOf(d).map((j) => ({ ...j, bullets: j.bullets.map((b, i) => v.bullet_rewrites[`${j.id}:${i}`]?.trim() || b) })),
  };
}

export function docModel(d: ResumeData, lang: Lang): DocModel {
  const c = contactOf(d);
  const contact = (city: string) => [city, c.phone ?? "", c.email ?? "", c.linkedin ?? ""].map((x) => x.trim()).filter(Boolean);
  if (lang === "es")
    return {
      name: (c.name ?? "").trim(),
      contact: contact(c.city ?? ""),
      summary: str(d.summary).trim(),
      skills: strs(d.skills).filter((s) => s.trim()),
      jobs: jobsOf(d).filter((j) => j.title.trim() || j.company.trim() || j.bullets.some((b) => b.trim())),
      education: eduOf(d).filter((e) => e.degree.trim() || e.institution.trim()),
      certs: strs(d.certs).filter((s) => s.trim()),
    };
  const en = d.en;
  const ok = (k: EnSection) => !!en?.approved?.[k];
  return {
    name: (c.name ?? "").trim(),
    contact: ok("contact") ? contact(en?.contact.city ?? "") : [],
    summary: ok("summary") ? (en?.summary ?? "") : "",
    skills: ok("skills") ? (en?.skills ?? []) : [],
    jobs: ok("jobs") ? (en?.jobs ?? []) : [],
    education: ok("education") ? (en?.education ?? []) : [],
    certs: ok("certs") ? (en?.certs ?? []) : [],
  };
}

export const eduLine = (e: Edu) => [e.degree, e.institution, e.city, e.year].map((x) => x.trim()).filter(Boolean).join(" · ");
export const jobPlace = (j: Job) => [j.company, j.city].map((x) => x.trim()).filter(Boolean).join(", ");
export const jobDates = (j: Job) => [j.from, j.to].map((x) => x.trim()).filter(Boolean).join(" – ");

/** Plain text of the document (for "Enviar a revisión con IA"). */
export function docText(m: DocModel, lang: Lang) {
  const h = HEADINGS[lang];
  const out: string[] = [];
  if (m.name) out.push(m.name);
  if (m.contact.length) out.push(m.contact.join(" · "));
  if (m.summary) out.push("", h.summary.toUpperCase(), m.summary);
  if (m.skills.length) out.push("", h.skills.toUpperCase(), m.skills.join(" · "));
  if (m.jobs.length) {
    out.push("", h.jobs.toUpperCase());
    for (const j of m.jobs) {
      out.push([j.title, jobPlace(j), jobDates(j)].filter(Boolean).join(" · "));
      for (const b of j.bullets.filter((x) => x.trim())) out.push(`• ${b}`);
    }
  }
  if (m.education.length) out.push("", h.education.toUpperCase(), ...m.education.map(eduLine));
  if (m.certs.length) out.push("", h.certs.toUpperCase(), ...m.certs);
  return out.join("\n").trim();
}

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "");
/** "{Nombre}{Apellido}_Resume.pdf" from the first two words of the name. */
export function fileBase(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  const base = w.slice(0, 2).map((x) => plain(x)).join("");
  return `${base || "Mi"}_Resume`;
}
export const versionFile = (company: string) => `Resume_${plain(company) || "Empresa"}.pdf`;

/** Keywords of a version found anywhere in the resume text (accents and case ignored). */
export function keywordHits(d: ResumeData, keywords: string[]) {
  const hay = norm(docTexts(d).join(" \n "));
  return keywords.map((k) => ({ k, found: !!k.trim() && hay.includes(norm(k.trim())) }));
}

/** The five document sections the course page's paper and ring count. */
export const PAPER_KEYS = ["contact", "summary", "jobs", "education", "skills"] as const;
export function sectionFilled(d: ResumeData, key: (typeof PAPER_KEYS)[number]) {
  const c = contactOf(d);
  if (key === "contact") return !!(c.name?.trim() && (c.email?.trim() || c.phone?.trim()));
  if (key === "summary") return str(d.summary).trim().length >= 40;
  if (key === "jobs") return jobsOf(d).some((j) => j.title.trim() && j.bullets.some((b) => b.trim()));
  if (key === "education") return eduOf(d).some((e) => e.degree.trim());
  return strs(d.skills).length > 0;
}

/** Which step builds a resume section (data-driven: the step whose build has that key). */
export function stepOfKey(steps: GuidedStep[], key: string) {
  return steps.find((s) => s.build.sections.some((x) => x.key === key || (key === "en" && x.type === "ai_translate")))?.step ?? null;
}

/** "Tu experiencia en lenguaje de EE.UU." → ["Tu experiencia en", "lenguaje de EE.UU."]: the gold italic words. */
export function splitTitle(t: string): [string, string] {
  const w = t.trim().split(/\s+/);
  const n = w.length >= 6 ? 3 : w.length >= 3 ? 2 : 0;
  return n ? [w.slice(0, -n).join(" "), w.slice(-n).join(" ")] : [t, ""];
}

export const stepPath = (slug: string, n: number) => `/app/cursos/${slug}/paso/${n}`;
export const resumePath = (slug: string) => `/app/cursos/${slug}/mi-resume`;
export const productPath = (slug: string, theme: GuidedTheme) => `/app/cursos/${slug}/${PRODUCT[theme].path}`;
export const simPath = (slug: string) => `/app/cursos/${slug}/simulacro`;

// ---------- answer bank (Interview) ----------

export type AnswerVal = { text?: string; star?: Partial<Record<"S" | "T" | "A" | "R", string>>; parts?: Record<string, string>; ready?: boolean };
export const FORM_FIELDS: Record<AnswerForm, { k: string; es: string; color?: string }[]> = {
  star: [
    { k: "S", es: "Situación · ¿Dónde estabas y qué pasaba?", color: "#2E6F86" },
    { k: "T", es: "Tarea · ¿Qué te tocaba resolver?", color: "#7A4FD6" },
    { k: "A", es: "Acción · ¿Qué hiciste tú y cómo?", color: "#D99A1F" },
    { k: "R", es: "Resultado · ¿Qué lograste? Termina en positivo.", color: "#2F7D57" },
  ],
  present_past_future: [
    { k: "present", es: "Presente · Quién eres y qué haces hoy" },
    { k: "past", es: "Pasado · Tu experiencia y un logro" },
    { k: "future", es: "Futuro · Por qué este puesto es tu siguiente paso" },
  ],
  strength_weakness: [
    { k: "strength", es: "Tu fortaleza" },
    { k: "example", es: "Un ejemplo real de esa fortaleza" },
    { k: "weakness", es: "Debilidad real pero no crítica" },
    { k: "impact", es: "Cómo te afectó" },
    { k: "improve", es: "Qué haces para mejorarla" },
  ],
  five_years: [
    { k: "present", es: "Presente · Lo que haces hoy" },
    { k: "near", es: "Futuro cercano · Lo que quieres aprender en este puesto" },
    { k: "goal", es: "Meta a 5 años · Alineada con la empresa" },
  ],
  free: [{ k: "text", es: "Tu respuesta" }],
};
/** The fields of one answer, in order, as [key, value]. */
export function answerFields(form: AnswerForm, v: AnswerVal): [string, string][] {
  return FORM_FIELDS[form].map((f) => [f.k, form === "star" ? (v.star?.[f.k as "S"] ?? "") : form === "free" ? (v.text ?? "") : (v.parts?.[f.k] ?? "")]);
}
export const answerText = (form: AnswerForm, v: AnswerVal) =>
  answerFields(form, v)
    .map(([, x]) => x.trim())
    .filter(Boolean)
    .join(" ");
export const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
/** Speaking time at `wpm` words per minute, in seconds. */
export const speakSeconds = (t: string, wpm = 130) => Math.round((wordCount(t) / wpm) * 60);
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
/** "company.why" → data.company.why */
export function pathValue(d: ResumeData, path: string) {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), d);
}
export type SimItem = { q: string; transcript: string; seconds: number; eval: Record<string, number>; comments: string };
export type SimRun = { id: string; at: string; mode: "solo" | "friend"; items: SimItem[]; done?: boolean };
/** sessionStorage key for "Enviar a revisión con IA" (the text never goes in the URL). */
export const HANDOFF_KEY = "celsu:resume-review-handoff";

/** The answers section of a course (Interview step 4): its questions and stored values. */
export function answersSection(steps: GuidedStep[]) {
  for (const st of steps) for (const x of st.build.sections) if (x.type === "answers") return { step: st.step, sec: x };
  return null;
}
export function answerVals(d: ResumeData, key: string, n: number): AnswerVal[] {
  const raw = Array.isArray(d[key]) ? (d[key] as unknown[]) : [];
  return Array.from({ length: n }, (_, i) => {
    const o = obj(raw[i]);
    return { text: str(o.text) || undefined, star: obj(o.star) as AnswerVal["star"], parts: obj(o.parts) as Record<string, string>, ready: o.ready === true };
  });
}
export const simRuns = (d: ResumeData) => (Array.isArray(d.sim_runs) ? (d.sim_runs as SimRun[]) : []).filter((r) => r && Array.isArray(r.items) && r.items.length);

/** "Mi banco" parts, in course order: the key that holds each one and when it counts as done. */
export const BANK_PARTS = [
  { key: "value", es: "Mi frase de valor", en: "My value statement" },
  { key: "company", es: "Ficha de la empresa", en: "Company card" },
  { key: "rubric", es: "Autoevaluación en video", en: "Video self-review" },
  { key: "answers", es: "8 respuestas", en: "8 answers" },
  { key: "myq", es: "Mis 3 preguntas", en: "My 3 questions" },
  { key: "sim", es: "Simulacro", en: "Mock interview" },
] as const;
export function bankFilled(d: ResumeData, key: (typeof BANK_PARTS)[number]["key"], steps: GuidedStep[]) {
  if (key === "value") return str(d.value).trim().length >= 20;
  if (key === "company") {
    const c = obj(d.company);
    return !!(str(c.company).trim() && str(c.role).trim());
  }
  if (key === "rubric") return Object.keys(obj(obj(d.rubric).answers)).length >= 10;
  if (key === "answers") {
    const a = answersSection(steps);
    return !!a && answerVals(d, a.sec.key, a.sec.questions.length).every((x) => x.ready);
  }
  if (key === "myq") return strs(d.myq).length >= 2 && str(d.ownq).trim().length > 5;
  return simRuns(d).some((r) => r.done);
}
export const bankStep = (steps: GuidedStep[], key: string) =>
  steps.find((s) => s.build.sections.some((x) => x.key === key || (key === "sim" && x.type === "simulator")))?.step ?? null;
