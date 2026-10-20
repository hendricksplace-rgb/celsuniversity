"use client";

// "Construye tu resume": every build section type of the guided template. Everything autosaves into
// resumes.data[section.key] (owner only). The AI sections call the resume-translate edge function.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EN_SECTIONS,
  HANDOFF_KEY,
  PAPER_KEYS,
  PRODUCT,
  applyVersion,
  bulletChecks,
  contactOf,
  docModel,
  docText,
  eduOf,
  emailOk,
  equivalents,
  fileBase,
  jobsOf,
  keywordHits,
  obj,
  phoneCcOk,
  resumePath,
  runRules,
  sectionFilled,
  stepOfKey,
  stepPath,
  str,
  strs,
  uid,
  versionFile,
  type AutoRule,
  type ChecklistItem,
  type Edu,
  type EnDraft,
  type EnSection,
  type GuidedStep,
  type GuidedTheme,
  type Job,
  type Lang,
  type ResumeData,
  type Section,
  type TitleItem,
  type Version,
} from "@/lib/guided";
import { Ico, SavedBadge, say, type SaveState, type T } from "./ui";
import { PrintCopy, downloadDocx, printPdf } from "./ResumeDoc";
import { InterviewSection } from "./BuildInterview";
import { FinanceSection, MoneyInput, isFinanceSection } from "./BuildFinance";
import s from "./guided.module.css";

export type BuildCtx = {
  /** The step being built (sections that read its own blocks: checklist `from`, pick_many `from: phrases`). */
  step: GuidedStep;
  theme: GuidedTheme;
  data: ResumeData;
  set: (key: string, value: unknown, now?: boolean) => void;
  update: (fn: (d: ResumeData) => ResumeData, now?: boolean) => void;
  save: SaveState;
  steps: GuidedStep[];
  titles: TitleItem[];
  verbs: { es: string; en: string }[];
  slug: string;
  t: T;
  lang: Lang;
  fits: boolean | null;
};

// The build sections speak to the student in Spanish, the course language (the ES/EN toggle changes the frame).
const B = {
    optional: "(opcional)",
    email: "Revisa el formato: nombre@dominio.com",
    phone: "Empieza con + y la clave de país, por ejemplo +52 …",
    addLine: "Agregar línea",
    dayN: (n: number) => `Día ${n} de cada mes`,
    ownOption: "Escribe tu propia opción y presiona Enter",
    whyThis: "¿Por qué esta opción?",
    startOn: "¿Cuándo empiezas?",
    usEq: "En EE.UU.:",
    listen: (w: string) => `Escuchar ${w}`,
    job: "Puesto",
    jobPh: "Ej. Supervisora de Calidad",
    company: "Empresa",
    companyPh: "Nombre de la empresa",
    city: "Ciudad y país",
    from: "Desde",
    fromPh: "Mes año",
    to: "Hasta",
    toPh: "Presente",
    bullets: "Logros",
    bulletPh: "Empieza con un verbo: Implementé…, Lideré…",
    verb: "Verbo",
    pickVerb: "Elegir un verbo",
    chkVerb: "Verbo de acción",
    chkNum: "Tiene un número",
    chkShort: "Máx. 2 líneas",
    addBullet: "Agregar logro",
    rmBullet: "Quitar este logro",
    addJob: "Agregar otro puesto",
    rmJob: "Quitar este puesto",
    degree: "Título",
    degreePh: "Ej. Licenciatura en Ingeniería Industrial",
    inst: "Institución",
    year: "Año de graduación",
    addEdu: "Agregar otro título",
    rmEdu: "Quitar",
    chipsPh: "Agregar habilidad",
    chipsHint: "Escribe y presiona Enter.",
    chipsCount: (n: number, a?: number, b?: number) => `${n} habilidades${a ? ` · ${a} a ${b}` : ""}`,
    rmChip: (x: string) => `Quitar ${x}`,
    pickCount: (n: number, of: number) => `${n} de ${of} elegidos`,
    role: "Puesto",
    url: "Enlace (URL)",
    asks: "Lo que piden",
    asksPh: "Requisitos que se repiten",
    posting: (n: number) => `Vacante ${n}`,
    useTpl: "Usar la plantilla",
    seeEx: "Ver ejemplo",
    hideEx: "Ocultar ejemplo",
    chars: (n: number, a?: number, b?: number) => `${n} caracteres${a ? ` · ${a}–${b}` : ""}`,
    lines: (n: number) => `≈ ${n} ${n === 1 ? "línea" : "líneas"}`,
    autoTag: "AUTOMÁTICO",
    fix: "Corregir",
    waiting: "Se revisa cuando llenes esa parte.",
    autoDetail: {
      no_personal_data: (d?: string) => (d ? `Revisa: «${d.slice(0, 60)}»` : "Sin datos personales."),
      bullets_have_numbers: (d?: string) => `${d ?? "0/0"} logros con número (mínimo 70%).`,
      jobs_within_15y: (d?: string) => (d ? `«${d}» tiene más de 15 años.` : "Todo en los últimos 15 años."),
      fits_one_page: () => "Medido en la plantilla de exportación.",
      dates_consistent: () => "Mismo formato en todas las fechas (por ejemplo «Mar 2021»).",
      bullets_start_with_verb: (d?: string) => `${d ?? "0/0"} logros empiezan con verbo.`,
      always_true_template: () => "La plantilla de CelsU ya lo cumple.",
    } as Record<AutoRule, (d?: string) => string>,
    version: (n: number) => `Versión ${n}`,
    adText: "El anuncio (pégalo aquí)",
    keywords: "Palabras clave del anuncio",
    keywordsPh: "Agregar palabra clave",
    inResume: "Ya está en tu resume",
    missing: "Falta en tu resume",
    sumOverride: "Tu perfil para esta vacante",
    copySummary: "Copiar mi perfil",
    skillsOrder: "Orden de tus habilidades (toca para subir)",
    moveUp: (x: string) => `Subir ${x}`,
    rewrites: "Logros reescritos para esta vacante (opcional)",
    changes: "Cambios que hiciste",
    applied: "Fecha de aplicación (opcional)",
    fileName: "Nombre de archivo sugerido",
    seeVersion: "Ver esta versión",
    translate: "Traducir mi resume al inglés",
    translating: "Traduciendo… (tarda unos segundos)",
    retranslate: "Traducir otra vez",
    retranslateQ: "Se reemplaza tu borrador en inglés y tendrás que aprobar cada sección de nuevo. ¿Continuar?",
    needEs: "Primero completa tu resume en español:",
    reviewQs: "Al revisar cada sección, pregúntate:",
    approve: "Aprobar",
    approved: "Aprobada",
    edit: "Editar",
    done: "Listo",
    es: "ESPAÑOL",
    en: "INGLÉS",
    secName: { contact: "Contacto (ciudad)", summary: "Perfil profesional", skills: "Habilidades clave", jobs: "Experiencia", education: "Educación", certs: "Certificaciones" } as Record<EnSection, string>,
    allApproved: "¡Aprobaste todas las secciones! Ya puedes exportar en inglés.",
    approvedN: (a: number, b: number) => `${a} de ${b} secciones aprobadas`,
    aiErr: {
      rate_limited: "Hiciste muchas solicitudes seguidas. Espera unos minutos y vuelve a intentarlo.",
      too_big: "Tu resume es demasiado largo para traducirlo de una vez. Acórtalo un poco.",
      empty: "Tu resume en español está vacío.",
      forbidden: "Tu plan no incluye esta herramienta.",
      failed: "No se pudo completar. Inténtalo otra vez en un momento.",
    } as Record<string, string>,
    suggest: "Pedir sugerencias",
    suggesting: "Buscando mejoras…",
    accept: "Aplicar",
    reject: "Descartar",
    noSug: "No encontramos cambios importantes. ¡Bien hecho!",
    sugTarget: (en: boolean) => (en ? "Sobre tu versión en inglés." : "Sobre tu versión en español."),
    sugSummary: "Perfil profesional",
    sugBullet: "Logro",
    exportLang: "Idioma del archivo",
    enLocked: "Aprueba todas las secciones en inglés (arriba) para descargarlo en inglés.",
    pdf: "Descargar PDF",
    docx: "Descargar Word (.docx)",
    send: "Enviar a revisión con IA",
    sendNote: "Abre la Revisión de tu resume con el texto ya cargado. Solo se envía cuando tú lo confirmas allá.",
    openLink: "Abrir",
};
const useB = () => B;

export function BuildSection({ sec, ctx }: { sec: Section; ctx: BuildCtx }) {
  const b = useB();
  const hideSave = sec.type === "export" || sec.type === "card" || sec.type === "tip" || sec.type === "self_video" || sec.type === "simulator" || (sec.type === "calc" && !sec.editable);
  if (sec.type === "tip")
    return (
      <div className={s.gtip} data-section={sec.key}>
        <span className={s.gi}>
          <Ico n="spark" />
        </span>
        <div>
          {sec.title && <b>{sec.title}</b>}
          <p>{sec.text}</p>
        </div>
      </div>
    );
  if (sec.type === "simulator") return <InterviewSection sec={sec} ctx={ctx} />;
  return (
    <div className={s.card} data-section={sec.key}>
      <div className={s.bhead}>
        <h3>
          {sec.title}
          {sec.optional && sec.type !== "card" && !/opcional/i.test(sec.title ?? "") ? ` ${b.optional}` : ""}
        </h3>
        {!hideSave && <SavedBadge state={ctx.save} t={ctx.t} where={PRODUCT[ctx.theme].label[ctx.lang]} />}
      </div>
      {sec.hint && <p className={s.sub}>{sec.hint}</p>}
      <SectionBody sec={sec} ctx={ctx} />
    </div>
  );
}

function SectionBody({ sec, ctx }: { sec: Section; ctx: BuildCtx }) {
  switch (sec.type) {
    case "fields":
      return <Fields sec={sec} ctx={ctx} />;
    case "textarea":
      return (
        <div className={s.fld}>
          <textarea aria-label={sec.title} rows={7} value={str(ctx.data[sec.key])} onChange={(e) => ctx.set(sec.key, e.target.value)} />
        </div>
      );
    case "checklist":
      return <Checklist sec={sec} ctx={ctx} />;
    case "notes2":
      return <Notes2 sec={sec} ctx={ctx} />;
    case "reflect":
      return <Reflect sec={sec} ctx={ctx} />;
    case "template":
      return <Template sec={sec} ctx={ctx} />;
    case "jobs":
      return <Jobs sec={sec} ctx={ctx} />;
    case "education":
      return <Education sec={sec} ctx={ctx} />;
    case "chips":
      return <Chips k={sec.key} min={sec.min} max={sec.max} ctx={ctx} label={sec.title ?? ""} />;
    case "pick_many":
      return <PickMany sec={sec} ctx={ctx} />;
    case "list":
      return <Lines k={sec.key} min={sec.min ?? 1} max={sec.max ?? 10} ctx={ctx} label={sec.title ?? ""} ph={sec.placeholder} />;
    case "postings":
      return <Postings sec={sec} ctx={ctx} />;
    case "autocheck":
      return <AutoCheck sec={sec} ctx={ctx} />;
    case "versions":
      return <Versions sec={sec} ctx={ctx} />;
    case "ai_translate":
      return <Translate sec={sec} ctx={ctx} />;
    case "ai_suggest":
      return <Suggest ctx={ctx} />;
    case "export":
      return <Export sec={sec} ctx={ctx} />;
    case "normal_vs_better":
    case "answers":
    case "self_video":
    case "rubric":
    case "toggle":
    case "simulator":
      return <InterviewSection sec={sec} ctx={ctx} />;
    case "card":
      return (
        <div className={s.allc}>
          <p>{sec.text}</p>
          {sec.link && (
            <a href={sec.link.url} target="_blank" rel="noopener noreferrer" className={`${s.btn} ${s.btnG}`} style={{ marginTop: 14 }}>
              {sec.link.label}
              <Ico n="right" />
            </a>
          )}
        </div>
      );
    default:
      return isFinanceSection(sec) ? <FinanceSection sec={sec} ctx={ctx} /> : null;
  }
}

// ---------- simple sections ----------

function Fields({ sec, ctx }: { sec: Extract<Section, { type: "fields" }>; ctx: BuildCtx }) {
  const b = useB();
  const v = obj(ctx.data[sec.key]);
  return (
    <div className={s.grid2}>
      {sec.fields.map((f) => {
        const val = str(v[f.k]);
        const bad = !!val.trim() && ((f.check === "email" && !emailOk(val)) || (f.check === "phone_cc" && !phoneCcOk(val)));
        const id = `f-${sec.key}-${f.k}`;
        return (
          <div key={f.k} className={`${s.fld} ${bad ? s.fldBad : ""}`}>
            <label htmlFor={id}>
              {f.label}
              {f.optional ? ` ${b.optional}` : ""}
            </label>
            {f.money ? (
              <MoneyInput id={id} label={f.label} value={val} onChange={(x) => ctx.set(sec.key, { ...v, [f.k]: x })} />
            ) : f.input === "day" ? (
              <select id={id} value={val} onChange={(e) => ctx.set(sec.key, { ...v, [f.k]: e.target.value })}>
                <option value="">—</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i} value={String(i + 1)}>
                    {b.dayN(i + 1)}
                  </option>
                ))}
              </select>
            ) : f.input === "select" ? (
              <select id={id} value={val} onChange={(e) => ctx.set(sec.key, { ...v, [f.k]: e.target.value })}>
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
            <input
              id={id}
              value={val}
              placeholder={f.placeholder}
              type={f.input === "datetime" ? "datetime-local" : f.input === "date" ? "date" : f.check === "email" ? "email" : f.check === "phone_cc" ? "tel" : "text"}
              inputMode={f.check === "phone_cc" ? "tel" : undefined}
              aria-invalid={bad || undefined}
              aria-describedby={bad ? `${id}-m` : undefined}
              onChange={(e) => ctx.set(sec.key, { ...v, [f.k]: e.target.value })}
            />
            )}
            {bad && (
              <p className={s.fldMsg} id={`${id}-m`}>
                {f.check === "email" ? b.email : b.phone}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function linkHref(l: NonNullable<Exclude<ChecklistItem, string>["link"]>, slug: string) {
  if (l.step) return stepPath(slug, l.step);
  if (l.tool === "resume_review") return "/app/herramientas/resume";
  if (l.tool === "interview_practice") return "/app/herramientas/entrevista";
  if (l.course) return `/app/cursos/${l.course}`;
  return null;
}

/** A checklist's items, or those of the step block it points to (`from: "essentials[0]"`). */
function checklistItems(sec: Extract<Section, { type: "checklist" }>, step: GuidedStep): ChecklistItem[] {
  if (sec.items?.length) return sec.items;
  const m = /^essentials\[(\d+)\]$/.exec(sec.from ?? "");
  const b = m ? (step.essentials ?? [])[Number(m[1])] : null;
  return b && b.type === "checklist" ? b.items : [];
}

function Checklist({ sec: raw0, ctx }: { sec: Extract<Section, { type: "checklist" }>; ctx: BuildCtx }) {
  const sec = { ...raw0, items: checklistItems(raw0, ctx.step) };
  const raw = Array.isArray(ctx.data[sec.key]) ? (ctx.data[sec.key] as unknown[]) : [];
  const vals = sec.items.map((_, i) => raw[i] === true);
  const n = vals.filter(Boolean).length;
  const pct = n / Math.max(sec.items.length, 1);
  const level = pct >= 0.8 ? "high" : pct >= 0.5 ? "mid" : "low";
  return (
    <>
      <ul className={s.ckList}>
        {sec.items.map((it, i) => {
          const text = typeof it === "string" ? it : it.text;
          const link = typeof it === "string" ? null : it.link;
          const href = link ? linkHref(link, ctx.slug) : null;
          const id = `c-${sec.key}-${i}`;
          return (
            <li key={i} className={s.ckRow}>
              <input id={id} type="checkbox" checked={vals[i]} onChange={(e) => ctx.set(sec.key, vals.map((x, j) => (j === i ? e.target.checked : x)))} />
              <label htmlFor={id}>{text}</label>
              {link && href && (
                <Link href={href} className={s.ckLink}>
                  {link.label} →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {sec.result && n > 0 && (
        <p className={`${s.result} ${level === "high" ? s.resultHigh : ""}`} aria-live="polite">
          {n}/{sec.items.length} · {sec.result[level]}
        </p>
      )}
    </>
  );
}

function Lines({ k, min, max, ctx, label, get, put, ph }: { k: string; min: number; max: number; ctx: BuildCtx; label: string; get?: () => string[]; put?: (v: string[]) => void; ph?: string }) {
  const b = useB();
  const cur = get ? get() : strs(ctx.data[k]);
  const lines = cur.length >= Math.max(min, 1) ? cur : [...cur, ...Array(Math.max(min, 1) - cur.length).fill("")];
  const write = (v: string[]) => (put ? put(v) : ctx.set(k, v));
  return (
    <div className={s.stack}>
      {lines.map((x, i) => (
        <div key={i} className={s.fld} style={{ display: "flex", gap: 8 }}>
          <input aria-label={`${label} ${i + 1}`} value={x} placeholder={i === 0 ? ph : undefined} onChange={(e) => write(lines.map((y, j) => (j === i ? e.target.value : y)))} />
          {lines.length > Math.max(min, 1) && (
            <button type="button" className={s.rm} aria-label={b.rmEdu} onClick={() => write(lines.filter((_, j) => j !== i))}>
              <Ico n="x" />
            </button>
          )}
        </div>
      ))}
      {lines.length < max && (
        <button type="button" className={s.add} onClick={() => write([...lines, ""])}>
          <Ico n="plus" />
          {b.addLine}
        </button>
      )}
    </div>
  );
}

function Notes2({ sec, ctx }: { sec: Extract<Section, { type: "notes2" }>; ctx: BuildCtx }) {
  const v = obj(ctx.data[sec.key]);
  return (
    <div className={s.grid2}>
      {sec.lists.map((l) => (
        <div key={l.k} className={s.fld}>
          <span className={s.lab}>{l.label}</span>
          <Lines k={sec.key} min={3} max={8} ctx={ctx} label={l.label} get={() => strs(v[l.k])} put={(x) => ctx.set(sec.key, { ...v, [l.k]: x })} />
        </div>
      ))}
    </div>
  );
}

function Reflect({ sec, ctx }: { sec: Extract<Section, { type: "reflect" }>; ctx: BuildCtx }) {
  const vals = sec.prompts.map((_, i) => strs(ctx.data[sec.key])[i] ?? "");
  return (
    <div className={s.stack}>
      {sec.prompts.map((p, i) => (
        <div key={i} className={s.fld}>
          <label htmlFor={`r-${sec.key}-${i}`}>{p}</label>
          <textarea id={`r-${sec.key}-${i}`} rows={3} value={vals[i]} onChange={(e) => ctx.set(sec.key, vals.map((x, j) => (j === i ? e.target.value : x)))} />
        </div>
      ))}
      <p className={s.sub} style={{ margin: 0, fontSize: 13 }}>
        🔒 {ctx.t.privateNote}
      </p>
    </div>
  );
}

function Template({ sec, ctx }: { sec: Extract<Section, { type: "template" }>; ctx: BuildCtx }) {
  const b = useB();
  const [ex, setEx] = useState(false);
  const val = str(ctx.data[sec.key]);
  const n = val.trim().length;
  const ok = (!sec.min_chars || n >= sec.min_chars) && (!sec.max_chars || n <= sec.max_chars);
  const parts = sec.template.split(/(\[[^\]]+\])/g);
  return (
    <>
      <p className={s.tpl}>{parts.map((p, i) => (/^\[.+\]$/.test(p) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}</p>
      <div className={s.fld}>
        <textarea aria-label={sec.title} rows={5} value={val} onChange={(e) => ctx.set(sec.key, e.target.value)} />
      </div>
      <div className={s.count}>
        <span className={n === 0 ? "" : ok ? s.countOk : s.countBad}>
          {b.chars(n, sec.min_chars, sec.max_chars)} · {b.lines(Math.max(1, Math.ceil(n / 120)))}
        </span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!val.trim() && (
            <button type="button" className={`${s.btn} ${s.btnT} ${s.btnSm}`} onClick={() => ctx.set(sec.key, sec.template)}>
              {b.useTpl}
            </button>
          )}
          {sec.example && (
            <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} aria-expanded={ex} onClick={() => setEx(!ex)}>
              {ex ? b.hideEx : b.seeEx}
            </button>
          )}
        </span>
      </div>
      {ex && sec.example && <p className={s.example}>{sec.example}</p>}
    </>
  );
}

function Eq({ options }: { options: string[]; ctx?: BuildCtx }) {
  const b = useB();
  if (!options.length) return null;
  return (
    <div className={s.eq}>
      <Ico n="globe" />
      {b.usEq}
      {options.map((o) => (
        <button key={o} type="button" lang="en" aria-label={b.listen(o)} onClick={() => say(o.replace("…", ""))}>
          {o}
        </button>
      ))}
    </div>
  );
}

// ---------- jobs ----------

function Jobs({ sec, ctx }: { sec: Extract<Section, { type: "jobs" }>; ctx: BuildCtx }) {
  const b = useB();
  const min = sec.bullets?.min ?? 2;
  const max = sec.bullets?.max ?? 4;
  const stored = jobsOf(ctx.data);
  const jobs = stored.length ? stored : [blankJob(min)];
  const write = (js: Job[]) => ctx.set(sec.key, js);
  const patch = (i: number, p: Partial<Job>) => write(jobs.map((j, k) => (k === i ? { ...j, ...p } : j)));
  const verbWords = ctx.verbs.flatMap((v) => [v.es, v.en]);
  return (
    <>
      {jobs.map((j, ji) => {
        const bullets = j.bullets.length >= min ? j.bullets : [...j.bullets, ...Array(min - j.bullets.length).fill("")];
        return (
          <div className={s.job} key={j.id}>
            <div className={s.grid2}>
              <div className={s.fld}>
                <label htmlFor={`j-${j.id}-t`}>{b.job}</label>
                <input id={`j-${j.id}-t`} value={j.title} placeholder={b.jobPh} onChange={(e) => patch(ji, { title: e.target.value })} />
                <Eq options={equivalents(j.title, ctx.titles, "job")} ctx={ctx} />
              </div>
              <div className={s.fld}>
                <label htmlFor={`j-${j.id}-c`}>{b.company}</label>
                <input id={`j-${j.id}-c`} value={j.company} placeholder={b.companyPh} onChange={(e) => patch(ji, { company: e.target.value })} />
              </div>
            </div>
            <div className={s.grid3} style={{ marginTop: 12 }}>
              <div className={s.fld}>
                <label htmlFor={`j-${j.id}-l`}>{b.city}</label>
                <input id={`j-${j.id}-l`} value={j.city} onChange={(e) => patch(ji, { city: e.target.value })} />
              </div>
              <div className={s.fld}>
                <label htmlFor={`j-${j.id}-f`}>{b.from}</label>
                <input id={`j-${j.id}-f`} value={j.from} placeholder={b.fromPh} onChange={(e) => patch(ji, { from: e.target.value })} />
              </div>
              <div className={s.fld}>
                <label htmlFor={`j-${j.id}-to`}>{b.to}</label>
                <input id={`j-${j.id}-to`} value={j.to} placeholder={b.toPh} onChange={(e) => patch(ji, { to: e.target.value })} />
              </div>
            </div>
            <div className={s.bul}>
              <h5>{b.bullets}</h5>
              {bullets.map((x, bi) => {
                const c = bulletChecks(x, verbWords);
                const setB = (v: string) => patch(ji, { bullets: bullets.map((y, k) => (k === bi ? v : y)) });
                return (
                  <div className={s.bl} key={bi}>
                    <VerbPicker text={x} ctx={ctx} onPick={(v) => setB(replaceVerb(x, v, verbWords))} />
                    <div className={s.fld}>
                      <textarea aria-label={`${b.bullets} ${bi + 1}`} rows={2} value={x} placeholder={b.bulletPh} onChange={(e) => setB(e.target.value)} data-bullet={`${ji}-${bi}`} />
                      <div className={s.chk} aria-live="polite">
                        {(
                          [
                            [c.verb, b.chkVerb],
                            [c.number, b.chkNum],
                            [c.short, b.chkShort],
                          ] as const
                        ).map(([ok, l]) => (
                          <span key={l} className={ok ? s.ok : ""} data-ok={ok ? "1" : "0"}>
                            <Ico n={ok ? "check" : "x"} />
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                    {bullets.length > min ? (
                      <button type="button" className={s.rm} aria-label={b.rmBullet} onClick={() => patch(ji, { bullets: bullets.filter((_, k) => k !== bi) })}>
                        <Ico n="x" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
              {bullets.length < max && (
                <button type="button" className={s.add} onClick={() => patch(ji, { bullets: [...bullets, ""] })}>
                  <Ico n="plus" />
                  {b.addBullet}
                </button>
              )}
            </div>
            {jobs.length > 1 && (
              <div className={s.rowEnd}>
                <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} onClick={() => write(jobs.filter((_, k) => k !== ji))}>
                  <Ico n="trash" />
                  {b.rmJob}
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className={s.add} onClick={() => write([...jobs, blankJob(min)])}>
        <Ico n="plus" />
        {b.addJob}
      </button>
    </>
  );
}
const blankJob = (n: number): Job => ({ id: uid(), title: "", company: "", city: "", from: "", to: "", bullets: Array(n).fill("") });

/** Puts the verb first: replaces the bullet's first word when it already is a verb. */
function replaceVerb(text: string, verb: string, verbs: string[]) {
  const t = text.trimStart();
  const first = t.split(/\s+/)[0] ?? "";
  const isVerb = first && (verbs.some((v) => v.toLowerCase() === first.toLowerCase()) || bulletChecks(first).verb);
  return `${verb} ${isVerb ? t.slice(first.length).trimStart() : t.charAt(0).toLowerCase() + t.slice(1)}`.trimEnd() + (t ? "" : " ");
}

function VerbPicker({ text, ctx, onPick }: { text: string; ctx: BuildCtx; onPick: (v: string) => void }) {
  const b = useB();
  const [open, setOpen] = useState(false);
  const first = text.trim().split(/\s+/)[0] ?? "";
  const known = ctx.verbs.find((v) => v.es.toLowerCase() === first.toLowerCase());
  const chosen = strs(ctx.data.verbs5);
  const list = [...ctx.verbs].sort((a, c) => Number(chosen.includes(c.es)) - Number(chosen.includes(a.es)));
  return (
    <div className={s.vpWrap}>
      <button type="button" className={s.vp} aria-haspopup="listbox" aria-expanded={open} aria-label={b.pickVerb} onClick={() => setOpen(!open)}>
        <Ico n="plus" />
        {known?.es ?? b.verb}
      </button>
      {open && (
        <div className={s.vmenu} role="listbox">
          {list.map((v) => (
            <button
              key={v.es}
              type="button"
              role="option"
              aria-selected={known?.es === v.es}
              onClick={() => {
                onPick(v.es);
                setOpen(false);
              }}
            >
              {v.es}
              <span lang="en">{v.en}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- education ----------

function Education({ sec, ctx }: { sec: Extract<Section, { type: "education" }>; ctx: BuildCtx }) {
  const b = useB();
  const stored = eduOf(ctx.data);
  const list = stored.length ? stored : [blankEdu()];
  const write = (es: Edu[]) => ctx.set(sec.key, es);
  const patch = (i: number, p: Partial<Edu>) => write(list.map((e, k) => (k === i ? { ...e, ...p } : e)));
  return (
    <>
      {list.map((e, i) => (
        <div className={s.job} key={e.id}>
          <div className={s.grid2}>
            <div className={s.fld}>
              <label htmlFor={`e-${e.id}-d`}>{b.degree}</label>
              <input id={`e-${e.id}-d`} value={e.degree} placeholder={b.degreePh} onChange={(x) => patch(i, { degree: x.target.value })} />
            </div>
            <div className={s.fld}>
              <label htmlFor={`e-${e.id}-i`}>{b.inst}</label>
              <input id={`e-${e.id}-i`} value={e.institution} onChange={(x) => patch(i, { institution: x.target.value })} />
            </div>
          </div>
          {sec.suggest_equivalent !== false && <Eq options={equivalents(e.degree, ctx.titles, "degree")} ctx={ctx} />}
          <div className={s.grid2} style={{ marginTop: 12 }}>
            <div className={s.fld}>
              <label htmlFor={`e-${e.id}-c`}>{b.city}</label>
              <input id={`e-${e.id}-c`} value={e.city} onChange={(x) => patch(i, { city: x.target.value })} />
            </div>
            <div className={s.fld}>
              <label htmlFor={`e-${e.id}-y`}>{b.year}</label>
              <input id={`e-${e.id}-y`} value={e.year} inputMode="numeric" onChange={(x) => patch(i, { year: x.target.value })} />
            </div>
          </div>
          {list.length > 1 && (
            <div className={s.rowEnd}>
              <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} onClick={() => write(list.filter((_, k) => k !== i))}>
                <Ico n="trash" />
                {b.rmEdu}
              </button>
            </div>
          )}
        </div>
      ))}
      <button type="button" className={s.add} onClick={() => write([...list, blankEdu()])}>
        <Ico n="plus" />
        {b.addEdu}
      </button>
    </>
  );
}
const blankEdu = (): Edu => ({ id: uid(), degree: "", institution: "", city: "", year: "" });

// ---------- chips, pick_many, postings ----------

function Chips({ k, min, max, ctx, label, get, put, ph }: { k: string; min?: number; max?: number; ctx: BuildCtx; label: string; get?: () => string[]; put?: (v: string[]) => void; ph?: string }) {
  const b = useB();
  const [draft, setDraft] = useState("");
  const list = get ? get() : strs(ctx.data[k]);
  const write = (v: string[]) => (put ? put(v) : ctx.set(k, v));
  const add = () => {
    const v = draft.trim().replace(/,$/, "");
    if (!v || list.includes(v) || (max && list.length >= max)) return setDraft("");
    write([...list, v]);
    setDraft("");
  };
  return (
    <>
      <div className={s.skills}>
        {list.map((x, i) => (
          <span key={x}>
            {x}
            <button type="button" aria-label={b.rmChip(x)} onClick={() => write(list.filter((_, j) => j !== i))}>
              <Ico n="x" style={{ width: 14, height: 14 }} />
            </button>
          </span>
        ))}
        <input
          aria-label={label}
          value={draft}
          placeholder={ph ?? b.chipsPh}
          enterKeyHint="enter"
          onChange={(e) => (e.target.value.endsWith(",") ? (setDraft(e.target.value), setTimeout(add)) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </div>
      {!get && (
        <p className={s.count}>
          <span className={min && list.length >= min ? s.countOk : ""}>
            {b.chipsHint} {b.chipsCount(list.length, min, max)}
          </span>
        </p>
      )}
    </>
  );
}

function PickMany({ sec, ctx }: { sec: Extract<Section, { type: "pick_many" }>; ctx: BuildCtx }) {
  if (sec.options?.length) return <PickOptions sec={sec} ctx={ctx} />;
  return <PickPhrases sec={sec} ctx={ctx} />;
}

/** pick_many from the section's own options: each chosen one can carry a "why" and a start date; the student can add
 *  their own (allow_custom). Stored as { chosen, why, start }. */
function PickOptions({ sec, ctx }: { sec: Extract<Section, { type: "pick_many" }>; ctx: BuildCtx }) {
  const b = useB();
  const [draft, setDraft] = useState("");
  const count = sec.count ?? 3;
  const v = obj(ctx.data[sec.key]) as { chosen?: string[]; why?: Record<string, string>; start?: Record<string, string> };
  const chosen = strs(v.chosen);
  const custom = chosen.filter((x) => !sec.options!.includes(x));
  const write = (patch: Partial<typeof v>) => ctx.set(sec.key, { ...v, chosen, ...patch });
  const toggle = (x: string) => write({ chosen: chosen.includes(x) ? chosen.filter((y) => y !== x) : [...chosen, x] });
  const addOwn = () => {
    const x = draft.trim();
    setDraft("");
    if (x && !chosen.includes(x) && chosen.length < count) write({ chosen: [...chosen, x] });
  };
  return (
    <>
      <div className={s.pm}>
        {[...sec.options!, ...custom].map((x) => {
          const on = chosen.includes(x);
          return (
            <button key={x} type="button" aria-pressed={on} className={on ? s.on : ""} disabled={!on && chosen.length >= count} onClick={() => toggle(x)}>
              <i>
                <Ico n="check" />
              </i>
              <div>{x}</div>
            </button>
          );
        })}
      </div>
      {sec.allow_custom && chosen.length < count && (
        <div className={s.fld} style={{ marginTop: 10 }}>
          <input
            aria-label={b.ownOption}
            value={draft}
            placeholder={b.ownOption}
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOwn();
              }
            }}
            onBlur={addOwn}
          />
        </div>
      )}
      <p className={s.count}>
        <span className={chosen.length === count ? s.countOk : ""}>{b.pickCount(chosen.length, count)}</span>
      </p>
      {(sec.why_each || sec.with_start_date) && chosen.length > 0 && (
        <div className={s.pmsel}>
          {chosen.map((x) => (
            <div key={x} className={s.fld}>
              <b style={{ display: "block", marginBottom: 6 }}>{x}</b>
              {sec.why_each && (
                <>
                  <label htmlFor={`pw-${sec.key}-${x}`}>{b.whyThis}</label>
                  <textarea id={`pw-${sec.key}-${x}`} rows={2} value={str(v.why?.[x])} onChange={(e) => write({ why: { ...(v.why ?? {}), [x]: e.target.value } })} />
                </>
              )}
              {sec.with_start_date && (
                <>
                  <label htmlFor={`pd-${sec.key}-${x}`} style={{ marginTop: sec.why_each ? 8 : 0 }}>
                    {b.startOn}
                  </label>
                  <input id={`pd-${sec.key}-${x}`} type="date" value={str(v.start?.[x])} onChange={(e) => write({ start: { ...(v.start ?? {}), [x]: e.target.value } })} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PickPhrases({ sec, ctx }: { sec: Extract<Section, { type: "pick_many" }>; ctx: BuildCtx }) {
  const b = useB();
  const count = sec.count ?? 5;
  const chosen = strs(ctx.data[sec.key]);
  // The phrases of this step (the verbs in step 3, the good questions in step 5), else every step's.
  const own = (ctx.step.essentials ?? []).flatMap((x) => (x.type === "phrases" ? x.items.map((i) => ({ es: i.es, en: i.en })) : []));
  const list = own.length ? own : ctx.verbs;
  // English answers (questions to ask) are kept in English; Spanish verbs as the student picks them.
  const keyOf = (v: { es: string; en: string }) => (sec.audio ? v.en : v.es);
  return (
    <>
      <div className={`${s.pick} ${sec.audio ? s.pickLong : ""}`}>
        {list.map((v) => {
          const k = keyOf(v);
          const on = chosen.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              disabled={!on && chosen.length >= count}
              onClick={() => {
                if (sec.audio) say(v.en);
                ctx.set(sec.key, on ? chosen.filter((x) => x !== k) : [...chosen, k]);
              }}
            >
              {sec.audio && <Ico n="vol" />}
              <b lang="en">{v.en}</b>
              {v.es}
            </button>
          );
        })}
      </div>
      <p className={s.count}>
        <span className={chosen.length === count ? s.countOk : ""}>{b.pickCount(chosen.length, count)}</span>
      </p>
    </>
  );
}

function Postings({ sec, ctx }: { sec: Extract<Section, { type: "postings" }>; ctx: BuildCtx }) {
  const b = useB();
  const v = obj(ctx.data[sec.key]);
  const n = sec.count ?? 2;
  const items = Array.from({ length: n }, (_, i) => obj((Array.isArray(v.items) ? v.items : [])[i]));
  const refl = (sec.reflect ?? []).map((_, i) => strs(v.reflect)[i] ?? "");
  const put = (p: Record<string, unknown>) => ctx.set(sec.key, { ...v, ...p });
  const field = (i: number, f: string, label: string, ph?: string) => (
    <div className={s.fld}>
      <label htmlFor={`p-${i}-${f}`}>{label}</label>
      <input
        id={`p-${i}-${f}`}
        value={str(items[i]![f])}
        placeholder={ph}
        type={f === "url" ? "url" : "text"}
        onChange={(e) => put({ items: items.map((x, k) => (k === i ? { ...x, [f]: e.target.value } : x)) })}
      />
    </div>
  );
  return (
    <div className={s.stack}>
      {items.map((_, i) => (
        <div key={i} className={s.job}>
          <p className={s.groupT} style={{ marginTop: 0 }}>
            {b.posting(i + 1)}
          </p>
          <div className={s.vrow}>
            {field(i, "role", b.role)}
            {field(i, "company", b.company)}
            {field(i, "asks", b.asks, b.asksPh)}
          </div>
          <div style={{ marginTop: 10 }}>{field(i, "url", b.url, "https://")}</div>
        </div>
      ))}
      {(sec.reflect ?? []).map((q, i) => (
        <div key={q} className={s.fld}>
          <label htmlFor={`pr-${i}`}>{q}</label>
          <textarea id={`pr-${i}`} rows={3} value={refl[i]} onChange={(e) => put({ reflect: refl.map((x, k) => (k === i ? e.target.value : x)) })} />
        </div>
      ))}
    </div>
  );
}

// ---------- autocheck (step 4) ----------

const RULE_KEY: Record<AutoRule, string> = {
  no_personal_data: "contact",
  bullets_have_numbers: "jobs",
  jobs_within_15y: "jobs",
  fits_one_page: "jobs",
  dates_consistent: "jobs",
  bullets_start_with_verb: "jobs",
  always_true_template: "contact",
};

function AutoCheck({ sec, ctx }: { sec: Extract<Section, { type: "autocheck" }>; ctx: BuildCtx }) {
  const b = useB();
  const rules = useMemo(() => runRules(ctx.data, ctx.fits, ctx.verbs.flatMap((v) => [v.es, v.en])), [ctx.data, ctx.fits, ctx.verbs]);
  const v = obj(ctx.data[sec.key]);
  const manual = obj(v.manual);
  let total = 0;
  let ok = 0;
  return (
    <>
      {sec.groups.map((g, gi) => (
        <div key={g.title}>
          <p className={s.groupT}>{g.title}</p>
          {g.items.map((it, ii) => {
            const id = `${gi}-${ii}`;
            total++;
            if (it.auto) {
              const r = rules[it.auto];
              if (r.ok) ok++;
              const href = stepPath(ctx.slug, stepOfKey(ctx.steps, RULE_KEY[it.auto]) ?? 1);
              return (
                <div className={s.autoRow} key={id} data-rule={it.auto} data-ok={r.ok === null ? "wait" : r.ok ? "1" : "0"}>
                  <span className={`${s.autoIc} ${r.ok ? s.autoOk : r.ok === null ? s.autoWait : s.autoBad}`}>
                    <Ico n={r.ok ? "check" : r.ok === null ? "clock" : "x"} />
                  </span>
                  <div className={s.autoTxt}>
                    {it.text}
                    <span className={s.tag}>{b.autoTag}</span>
                    <small>{r.ok === null ? b.waiting : b.autoDetail[it.auto](r.detail)}</small>
                  </div>
                  {r.ok === false && (
                    <Link href={href} className={`${s.btn} ${s.btnO} ${s.btnSm} ${s.fix}`}>
                      {b.fix}
                    </Link>
                  )}
                </div>
              );
            }
            const checked = manual[id] === true;
            if (checked) ok++;
            return (
              <div className={s.autoRow} key={id}>
                <input
                  id={`ac-${id}`}
                  type="checkbox"
                  checked={checked}
                  style={{ width: 22, height: 22, marginTop: 2, accentColor: "var(--teal)", flex: "none" }}
                  onChange={(e) => ctx.set(sec.key, { ...v, manual: { ...manual, [id]: e.target.checked } })}
                />
                <label htmlFor={`ac-${id}`} className={s.autoTxt}>
                  {it.text}
                </label>
                {!checked && (
                  <Link href={resumePath(ctx.slug)} className={`${s.btn} ${s.btnO} ${s.btnSm} ${s.fix}`}>
                    {b.fix}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <p className={`${s.result} ${ok === total ? s.resultHigh : ""}`} aria-live="polite">
        {ok}/{total}
        {ok === total && sec.done_text ? ` · ${sec.done_text}` : sec.fix_link ? ` · ${sec.fix_link}` : ""}
      </p>
    </>
  );
}

// ---------- versions (step 5) ----------

const blankVersion = (): Version => ({ id: uid(), company: "", role: "", ad_text: "", keywords: [], changes: "", applied_on: "", summary_override: "", skills_order: [], bullet_rewrites: {} });
function versionsOf(d: ResumeData, key: string, n: number): Version[] {
  const raw = Array.isArray(d[key]) ? (d[key] as unknown[]) : [];
  return Array.from({ length: n }, (_, i) => {
    const o = obj(raw[i]);
    return {
      ...blankVersion(),
      ...o,
      id: str(o.id) || `v${i + 1}`,
      keywords: strs(o.keywords),
      skills_order: strs(o.skills_order),
      bullet_rewrites: obj(o.bullet_rewrites) as Record<string, string>,
    } as Version;
  });
}

function Versions({ sec, ctx }: { sec: Extract<Section, { type: "versions" }>; ctx: BuildCtx }) {
  const b = useB();
  const n = sec.count ?? 3;
  const list = versionsOf(ctx.data, sec.key, n);
  const postings = (Array.isArray(obj(ctx.data.postings).items) ? (obj(ctx.data.postings).items as unknown[]) : []).map(obj);
  const write = (i: number, p: Partial<Version>) => ctx.set(sec.key, list.map((v, k) => (k === i ? { ...v, ...p } : v)));
  const skills = strs(ctx.data.skills);
  const jobs = jobsOf(ctx.data);
  return (
    <>
      {list.map((v, i) => {
        // The two job postings from step 3 prefill versions 1 and 2.
        const company = v.company || str(postings[i]?.company);
        const role = v.role || str(postings[i]?.role);
        const hits = keywordHits(ctx.data, v.keywords);
        const order = [...v.skills_order.filter((x) => skills.includes(x)), ...skills.filter((x) => !v.skills_order.includes(x))];
        return (
          <div className={s.ver} key={v.id}>
            <div className={s.verHead}>
              <b>
                {b.version(i + 1)}
                {company ? ` · ${company}` : ""}
              </b>
              {company && (
                <Link href={`${resumePath(ctx.slug)}?version=${v.id}`} className={`${s.btn} ${s.btnT} ${s.btnSm}`}>
                  <Ico n="eye" />
                  {b.seeVersion}
                </Link>
              )}
            </div>
            <div className={s.grid2}>
              <div className={s.fld}>
                <label htmlFor={`v-${i}-c`}>{b.company}</label>
                <input id={`v-${i}-c`} value={company} onChange={(e) => write(i, { company: e.target.value, role })} />
              </div>
              <div className={s.fld}>
                <label htmlFor={`v-${i}-r`}>{b.role}</label>
                <input id={`v-${i}-r`} value={role} onChange={(e) => write(i, { role: e.target.value, company })} />
              </div>
            </div>
            <div className={s.fld} style={{ marginTop: 12 }}>
              <label htmlFor={`v-${i}-a`}>{b.adText}</label>
              <textarea id={`v-${i}-a`} rows={4} value={v.ad_text} onChange={(e) => write(i, { ad_text: e.target.value })} />
            </div>
            <div className={s.fld} style={{ marginTop: 12 }}>
              <span className={s.lab}>{b.keywords}</span>
              <Chips k={sec.key} ctx={ctx} label={b.keywords} ph={b.keywordsPh} get={() => v.keywords} put={(x) => write(i, { keywords: x })} />
              {sec.help?.keywords && <p className={s.count}>{sec.help.keywords}</p>}
              {hits.length > 0 && (
                <div className={s.kw} aria-live="polite">
                  {hits.map((h) => (
                    <span key={h.k} className={h.found ? s.ok : ""} title={h.found ? b.inResume : b.missing}>
                      <Ico n={h.found ? "check" : "x"} />
                      {h.k}
                      <span className={s.sr}>{h.found ? b.inResume : b.missing}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className={s.fld} style={{ marginTop: 12 }}>
              <label htmlFor={`v-${i}-s`}>{b.sumOverride}</label>
              <textarea id={`v-${i}-s`} rows={4} value={v.summary_override} onChange={(e) => write(i, { summary_override: e.target.value })} />
              {!v.summary_override && str(ctx.data.summary) && (
                <button type="button" className={`${s.btn} ${s.btnT} ${s.btnSm}`} style={{ marginTop: 8 }} onClick={() => write(i, { summary_override: str(ctx.data.summary) })}>
                  {b.copySummary}
                </button>
              )}
            </div>
            {order.length > 0 && (
              <div className={s.fld} style={{ marginTop: 12 }}>
                <span className={s.lab}>{b.skillsOrder}</span>
                <div className={s.pick}>
                  {order.map((x, k) => (
                    <button key={x} type="button" aria-label={b.moveUp(x)} disabled={k === 0} onClick={() => write(i, { skills_order: [x, ...order.filter((y) => y !== x)] })}>
                      <b>{k + 1}</b>
                      {x}
                      {k > 0 && <Ico n="up" style={{ width: 14, height: 14 }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {jobs.some((j) => j.bullets.some((x) => x.trim())) && (
              <details className={s.details} style={{ marginTop: 12 }}>
                <summary>{b.rewrites}</summary>
                <div className={s.stack}>
                  {jobs.flatMap((j) =>
                    j.bullets
                      .map((x, k) => ({ x, k }))
                      .filter(({ x }) => x.trim())
                      .map(({ x, k }) => (
                        <div className={s.fld} key={`${j.id}:${k}`}>
                          <label htmlFor={`v-${i}-${j.id}-${k}`}>{x}</label>
                          <textarea
                            id={`v-${i}-${j.id}-${k}`}
                            rows={2}
                            value={v.bullet_rewrites[`${j.id}:${k}`] ?? ""}
                            onChange={(e) => write(i, { bullet_rewrites: { ...v.bullet_rewrites, [`${j.id}:${k}`]: e.target.value } })}
                          />
                        </div>
                      )),
                  )}
                </div>
              </details>
            )}
            <div className={s.grid2} style={{ marginTop: 12 }}>
              <div className={s.fld}>
                <label htmlFor={`v-${i}-ch`}>{b.changes}</label>
                <input id={`v-${i}-ch`} value={v.changes} placeholder={sec.help?.changes} onChange={(e) => write(i, { changes: e.target.value })} />
              </div>
              <div className={s.fld}>
                <label htmlFor={`v-${i}-d`}>{sec.help?.applied_on ?? b.applied}</label>
                <input id={`v-${i}-d`} type="date" value={v.applied_on} onChange={(e) => write(i, { applied_on: e.target.value })} />
              </div>
            </div>
            <p className={s.fname}>
              {b.fileName}: {versionFile(company)}
            </p>
          </div>
        );
      })}
    </>
  );
}

// ---------- AI: translate (step 6) and suggestions ----------

async function callAi(body: Record<string, unknown>) {
  const { data, error } = await createClient().functions.invoke("resume-translate", { body });
  if (error) {
    const code = (await (error as { context?: Response }).context?.json?.().catch(() => null))?.error;
    throw new Error(code ?? "failed");
  }
  return data as Record<string, unknown>;
}
/** The Spanish sections the function receives (nothing else from the resume leaves the browser). */
function esSections(d: ResumeData) {
  const m = docModel(d, "es");
  return { contact: { city: contactOf(d).city ?? "" }, summary: m.summary, skills: m.skills, jobs: m.jobs.map((j) => ({ ...j, bullets: j.bullets.filter((x) => x.trim()) })), education: m.education, certs: m.certs };
}
const enSectionsOf = (d: ResumeData): EnSection[] => EN_SECTIONS.filter((k) => k !== "certs" || docModel(d, "es").certs.length > 0);

function Translate({ sec, ctx }: { sec: Extract<Section, { type: "ai_translate" }>; ctx: BuildCtx }) {
  const b = useB();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EnSection | null>(null);
  const en = ctx.data.en;
  const missing = PAPER_KEYS.filter((k) => !sectionFilled(ctx.data, k));
  const secs = enSectionsOf(ctx.data);
  const approvedN = en ? secs.filter((k) => en.approved?.[k]).length : 0;
  const run = async () => {
    if (en && !window.confirm(b.retranslateQ)) return;
    setBusy(true);
    setErr(null);
    try {
      const out = await callAi({ action: "translate", sections: esSections(ctx.data) });
      const x = obj(out.sections);
      const draft: EnDraft = {
        contact: { city: str(obj(x.contact).city) },
        summary: str(x.summary),
        skills: strs(x.skills),
        jobs: (Array.isArray(x.jobs) ? x.jobs : []).map((j) => {
          const o = obj(j);
          return { id: str(o.id), title: str(o.title), company: str(o.company), city: str(o.city), from: str(o.from), to: str(o.to), bullets: strs(o.bullets) };
        }),
        education: (Array.isArray(x.education) ? x.education : []).map((e) => {
          const o = obj(e);
          return { id: str(o.id), degree: str(o.degree), institution: str(o.institution), city: str(o.city), year: str(o.year) };
        }),
        certs: strs(x.certs),
        approved: {},
        at: new Date().toISOString(),
      };
      ctx.update((d) => ({ ...d, en: draft, en_status: "draft" }), true);
    } catch (e) {
      const code = e instanceof Error ? e.message : "failed";
      setErr(b.aiErr[code] ?? b.aiErr.failed);
    }
    setBusy(false);
  };
  const setEn = (fn: (e: EnDraft) => EnDraft) =>
    ctx.update((d) => {
      if (!d.en) return d;
      const next = fn(d.en);
      const all = enSectionsOf(d).every((k) => next.approved?.[k]);
      return { ...d, en: next, en_status: all ? "approved" : "draft" };
    });
  const es = docModel(ctx.data, "es");
  return (
    <>
      {sec.rule && <p className={s.sub}>{sec.rule}</p>}
      {missing.length > 0 && !en && (
        <div className={s.aiwarn}>
          <Ico n="alert" />
          <div>
            {b.needEs}{" "}
            {missing.map((k, i) => (
              <span key={k}>
                {i > 0 && " · "}
                <Link href={stepPath(ctx.slug, stepOfKey(ctx.steps, k) ?? 1)} style={{ textDecoration: "underline" }}>
                  {ctx.t.secNames[k]}
                </Link>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className={s.btnRow}>
        <button type="button" className={`${s.btn} ${en ? s.btnO : s.btnG}`} disabled={busy || (!en && missing.length > 0)} onClick={() => void run()} data-action="translate">
          <Ico n="globe" />
          {busy ? b.translating : en ? b.retranslate : (sec.button ?? b.translate)}
        </button>
      </div>
      {err && (
        <p className={s.err} role="alert">
          {err}
        </p>
      )}
      {en && (
        <>
          {sec.review_questions?.length ? (
            <div className={s.aiwarn}>
              <Ico n="spark" />
              <div>
                {b.reviewQs}
                <ul style={{ listStyle: "disc", paddingLeft: 18, marginTop: 4 }}>
                  {sec.review_questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          <p className={`${s.result} ${approvedN === secs.length ? s.resultHigh : ""}`} aria-live="polite">
            {approvedN === secs.length ? b.allApproved : b.approvedN(approvedN, secs.length)}
          </p>
          <div style={{ marginTop: 12 }}>
            {secs.map((k) => (
              <ReviewSection key={k} k={k} es={es} en={en} editing={editing === k} b={b} onEdit={() => setEditing(editing === k ? null : k)} setEn={setEn} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function esText(k: EnSection, m: ReturnType<typeof docModel>) {
  if (k === "contact") return m.contact[0] ?? "";
  if (k === "summary") return m.summary;
  if (k === "skills") return m.skills.join(" · ");
  if (k === "certs") return m.certs.join("\n");
  if (k === "education") return m.education.map((e) => [e.degree, e.institution, e.city, e.year].filter(Boolean).join(" · ")).join("\n");
  return m.jobs.map((j) => [`${j.title} · ${j.company} · ${j.from} – ${j.to}`, ...j.bullets.filter((x) => x.trim()).map((x) => `• ${x}`)].join("\n")).join("\n\n");
}
function enText(k: EnSection, e: EnDraft) {
  if (k === "contact") return e.contact.city;
  if (k === "summary") return e.summary;
  if (k === "skills") return e.skills.join(" · ");
  if (k === "certs") return e.certs.join("\n");
  if (k === "education") return e.education.map((x) => [x.degree, x.institution, x.city, x.year].filter(Boolean).join(" · ")).join("\n");
  return e.jobs.map((j) => [`${j.title} · ${j.company} · ${j.from} – ${j.to}`, ...j.bullets.map((x) => `• ${x}`)].join("\n")).join("\n\n");
}

function ReviewSection({ k, es, en, editing, b, onEdit, setEn }: { k: EnSection; es: ReturnType<typeof docModel>; en: EnDraft; editing: boolean; b: typeof B; onEdit: () => void; setEn: (fn: (e: EnDraft) => EnDraft) => void }) {
  const ok = !!en.approved?.[k];
  const edit = (fn: (e: EnDraft) => EnDraft) => setEn((e) => ({ ...fn(e), approved: { ...e.approved, [k]: false } }));
  return (
    <div className={`${s.rev} ${ok ? s.revOk : ""}`} data-review={k}>
      <div className={s.revHead}>
        <b>{b.secName[k]}</b>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} onClick={onEdit} aria-expanded={editing}>
            <Ico n="pen" />
            {editing ? b.done : b.edit}
          </button>
          <button type="button" className={`${s.btn} ${ok ? s.btnT : s.btnN} ${s.btnSm}`} aria-pressed={ok} onClick={() => setEn((e) => ({ ...e, approved: { ...e.approved, [k]: !ok } }))} data-approve={k}>
            <Ico n="check" />
            {ok ? b.approved : b.approve}
          </button>
        </span>
      </div>
      <div className={s.cols}>
        <div>
          <small>{b.es}</small>
          {esText(k, es)}
        </div>
        <div lang="en">
          <small>{b.en}</small>
          {editing ? <EnEditor k={k} en={en} edit={edit} /> : enText(k, en)}
        </div>
      </div>
    </div>
  );
}

function EnEditor({ k, en, edit }: { k: EnSection; en: EnDraft; edit: (fn: (e: EnDraft) => EnDraft) => void }) {
  const ta = (value: string, on: (v: string) => void, rows = 3, label = k) => (
    <div className={s.fld} style={{ marginTop: 6 }}>
      <textarea aria-label={label} rows={rows} value={value} onChange={(e) => on(e.target.value)} />
    </div>
  );
  if (k === "contact") return ta(en.contact.city, (v) => edit((e) => ({ ...e, contact: { city: v } })), 1);
  if (k === "summary") return ta(en.summary, (v) => edit((e) => ({ ...e, summary: v })), 5);
  if (k === "skills") return ta(en.skills.join("\n"), (v) => edit((e) => ({ ...e, skills: v.split("\n") })), 6);
  if (k === "certs") return ta(en.certs.join("\n"), (v) => edit((e) => ({ ...e, certs: v.split("\n") })), 3);
  if (k === "education")
    return (
      <>
        {en.education.map((x, i) => (
          <div key={x.id}>
            {ta(x.degree, (v) => edit((e) => ({ ...e, education: e.education.map((y, j) => (j === i ? { ...y, degree: v } : y)) })), 2)}
            {ta(x.institution, (v) => edit((e) => ({ ...e, education: e.education.map((y, j) => (j === i ? { ...y, institution: v } : y)) })), 2)}
          </div>
        ))}
      </>
    );
  return (
    <>
      {en.jobs.map((j, i) => (
        <div key={j.id} style={{ marginTop: 8 }}>
          {ta(j.title, (v) => edit((e) => ({ ...e, jobs: e.jobs.map((y, q) => (q === i ? { ...y, title: v } : y)) })), 1)}
          {ta(`${j.from} – ${j.to}`, (v) => {
            const [from, to] = v.split(/\s*[–-]\s*/);
            edit((e) => ({ ...e, jobs: e.jobs.map((y, q) => (q === i ? { ...y, from: from ?? "", to: to ?? "" } : y)) }));
          }, 1)}
          {j.bullets.map((x, bi) => (
            <div key={bi}>{ta(x, (v) => edit((e) => ({ ...e, jobs: e.jobs.map((y, q) => (q === i ? { ...y, bullets: y.bullets.map((z, w) => (w === bi ? v : z)) } : y)) })), 2)}</div>
          ))}
        </div>
      ))}
    </>
  );
}

type Sug = { target: "summary" | "bullet"; job_id: string; index: number; original: string; suggestion: string; why_es: string };
function Suggest({ ctx }: { ctx: BuildCtx }) {
  const b = useB();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [list, setList] = useState<Sug[] | null>(null);
  const useEn = !!ctx.data.en;
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const en = ctx.data.en;
      const sections = useEn && en ? { contact: en.contact, summary: en.summary, skills: en.skills, jobs: en.jobs, education: en.education, certs: en.certs } : esSections(ctx.data);
      const out = await callAi({ action: "suggest", sections });
      setList((Array.isArray(out.suggestions) ? out.suggestions : []) as Sug[]);
    } catch (e) {
      const code = e instanceof Error ? e.message : "failed";
      setErr(b.aiErr[code] ?? b.aiErr.failed);
    }
    setBusy(false);
  };
  const accept = (x: Sug) => {
    ctx.update((d) => {
      if (useEn && d.en) {
        const en = d.en;
        if (x.target === "summary") return { ...d, en: { ...en, summary: x.suggestion, approved: { ...en.approved, summary: false } }, en_status: "draft" };
        return { ...d, en: { ...en, jobs: en.jobs.map((j) => (j.id === x.job_id ? { ...j, bullets: j.bullets.map((y, i) => (i === x.index ? x.suggestion : y)) } : j)), approved: { ...en.approved, jobs: false } }, en_status: "draft" };
      }
      if (x.target === "summary") return { ...d, summary: x.suggestion };
      return { ...d, jobs: jobsOf(d).map((j) => (j.id === x.job_id ? { ...j, bullets: j.bullets.map((y, i) => (i === x.index ? x.suggestion : y)) } : j)) };
    });
    setList((l) => (l ?? []).filter((y) => y !== x));
  };
  return (
    <>
      <p className={s.count} style={{ marginTop: 0 }}>
        {b.sugTarget(useEn)}
      </p>
      <div className={s.btnRow}>
        <button type="button" className={`${s.btn} ${s.btnT}`} disabled={busy} onClick={() => void run()}>
          <Ico n="spark" />
          {busy ? b.suggesting : b.suggest}
        </button>
      </div>
      {err && (
        <p className={s.err} role="alert">
          {err}
        </p>
      )}
      {list && list.length === 0 && <p className={`${s.result} ${s.resultHigh}`}>{b.noSug}</p>}
      {list && list.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {list.map((x, i) => (
            <div className={s.sug} key={i}>
              <p className={s.groupT} style={{ margin: "0 0 6px" }}>
                {x.target === "summary" ? b.sugSummary : b.sugBullet}
              </p>
              <del>{x.original}</del>
              <ins>{x.suggestion}</ins>
              <p className={s.count}>{x.why_es}</p>
              <div className={s.btnRow}>
                <button type="button" className={`${s.btn} ${s.btnN} ${s.btnSm}`} onClick={() => accept(x)}>
                  <Ico n="check" />
                  {b.accept}
                </button>
                <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} onClick={() => setList((l) => (l ?? []).filter((y) => y !== x))}>
                  <Ico n="x" />
                  {b.reject}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------- export (step 6 and Mi resume) ----------

export const enReady = (d: ResumeData) => !!d.en && enSectionsOf(d).every((k) => d.en?.approved?.[k]);

export function ExportButtons({ data, lang, version, withPrintCopy = true }: { data: ResumeData; lang: Lang; version?: Version | null; withPrintCopy?: boolean }) {
  const b = useB();
  const router = useRouter();
  const src = lang === "es" ? applyVersion(data, version ?? null) : data;
  const m = docModel(src, lang);
  const base = version?.company ? versionFile(version.company).replace(/\.pdf$/, "") : `${fileBase(contactOf(data).name ?? "")}${lang === "es" ? "_ES" : ""}`;
  return (
    <>
      <p className={s.fname} data-filename>
        {base}.pdf
      </p>
      <button type="button" className={`${s.btn} ${s.btnG}`} style={{ width: "100%", marginTop: 12 }} onClick={() => printPdf(`${base}.pdf`)} data-action="pdf">
        <Ico n="down" />
        {b.pdf}
      </button>
      <button type="button" className={`${s.btn} ${s.btnO}`} style={{ width: "100%", marginTop: 10 }} onClick={() => void downloadDocx(m, lang, `${base}.docx`)} data-action="docx">
        <Ico n="down" />
        {b.docx}
      </button>
      <button
        type="button"
        className={`${s.btn} ${s.btnN}`}
        style={{ width: "100%", marginTop: 10 }}
        data-action="send"
        onClick={() => {
          try {
            sessionStorage.setItem(HANDOFF_KEY, docText(m, lang));
          } catch {
            /* storage blocked: the tool opens empty */
          }
          router.push("/app/herramientas/resume?nuevo=1&desde=curso");
        }}
      >
        <Ico n="send" />
        {b.send}
      </button>
      {withPrintCopy && <PrintCopy m={m} lang={lang} />}
    </>
  );
}

function Export({ ctx }: { sec: Extract<Section, { type: "export" }>; ctx: BuildCtx }) {
  const b = useB();
  const ready = enReady(ctx.data);
  const [lang, setLang] = useState<Lang>(ready ? "en" : "es");
  const cur = lang === "en" && !ready ? "es" : lang;
  return (
    <>
      <div className={s.seg} role="group" aria-label={b.exportLang}>
        <button type="button" aria-pressed={cur === "es"} onClick={() => setLang("es")}>
          Español
        </button>
        <button type="button" aria-pressed={cur === "en"} disabled={!ready} onClick={() => setLang("en")} data-lang="en">
          English
        </button>
      </div>
      {!ready && <p className={s.count}>{b.enLocked}</p>}
      <div style={{ maxWidth: 420 }}>
        <ExportButtons data={ctx.data} lang={cur} />
      </div>
      <p className={s.count}>{b.sendNote}</p>
    </>
  );
}
