"use client";

// Mi resume (cv-resume-mockup.html ?v=resume): the live document in Spanish or in English (only the sections the
// student approved in step 6), the automatic review, downloads (PDF by print, .docx) and "Enviar a revisión con IA".
import Link from "next/link";
import { useMemo, useState } from "react";
import { applyVersion, docModel, jobsOf, runRules, sectionFilled, stepOfKey, stepPath, str, type AutoRule, type GuidedStep, type Lang, type ResumeData, type Version } from "@/lib/guided";
import { ExportButtons, enReady } from "./Build";
import { ResumeSheet, useFitsOnePage } from "./ResumeDoc";
import { Ico, TopBar, UI, useLang } from "./ui";
import s from "./guided.module.css";

const R = {
  es: {
    kicker: (c: string) => `CELSGLOBAL · ${c.toUpperCase()}`,
    title: "Mi resume",
    seg: "Idioma del resume",
    es: "Español",
    en: "English · para enviar",
    ai: "Traducción hecha con IA en el paso 6. Léela completa antes de enviarla: tú decides la versión final.",
    noEn: "Todavía no hay versión en inglés: se hace en el paso 6.",
    partial: "Solo se muestran las secciones que ya aprobaste.",
    version: "Versión",
    general: "General",
    empty: (n: number) => `Se completa en el paso ${n}`,
    auto: "REVISIÓN AUTOMÁTICA",
    dl: "DESCARGA Y ENVÍA",
    fname: "Nombre de archivo profesional:",
    enLocked: "Para descargar en inglés, aprueba todas las secciones en el paso 6.",
    secs: "SECCIONES",
    edit: (n: number) => `Editar · Paso ${n}`,
    back: "REGRESAR",
    toCourse: "Al curso",
    rules: {
      fits_one_page: (ok: boolean | null) => (ok === null ? "Midiendo la página…" : ok ? "Cabe en 1 página" : "Ocupa más de 1 página"),
      no_personal_data: (ok: boolean | null) => (ok ? "Sin foto, edad ni estado civil" : "Tiene datos personales"),
      bullets_start_with_verb: (_: boolean | null, d?: string) => `${(d ?? "0/0").replace("/", " de ")} logros empiezan con verbo`,
      bullets_have_numbers: (_: boolean | null, d?: string) => `${(d ?? "0/0").replace("/", " de ")} logros tienen un número`,
      dates_consistent: (ok: boolean | null) => (ok === null ? "Fechas: aún no hay" : ok ? "Fechas con el mismo formato" : "Fechas con formatos distintos"),
      jobs_within_15y: (ok: boolean | null) => (ok === null ? "Experiencia: aún no hay" : ok ? "Experiencia de los últimos 15 años" : "Hay experiencia de hace más de 15 años"),
    } as Partial<Record<AutoRule, (ok: boolean | null, d?: string) => string>>,
    personal: (d: string) => `Revisa: «${d.slice(0, 50)}»`,
  },
  en: {
    kicker: (c: string) => `CELSGLOBAL · ${c.toUpperCase()}`,
    title: "My resume",
    seg: "Resume language",
    es: "Español",
    en: "English · to send",
    ai: "AI translation from step 6. Read all of it before you send it: you decide the final version.",
    noEn: "There's no English version yet: you make it in step 6.",
    partial: "Only the sections you already approved are shown.",
    version: "Version",
    general: "General",
    empty: (n: number) => `Completed in step ${n}`,
    auto: "AUTOMATIC REVIEW",
    dl: "DOWNLOAD AND SEND",
    fname: "Professional file name:",
    enLocked: "To download in English, approve every section in step 6.",
    secs: "SECTIONS",
    edit: (n: number) => `Edit · Step ${n}`,
    back: "BACK",
    toCourse: "To the course",
    rules: {
      fits_one_page: (ok: boolean | null) => (ok === null ? "Measuring the page…" : ok ? "Fits on 1 page" : "Longer than 1 page"),
      no_personal_data: (ok: boolean | null) => (ok ? "No photo, age or marital status" : "Has personal data"),
      bullets_start_with_verb: (_: boolean | null, d?: string) => `${(d ?? "0/0").replace("/", " of ")} achievements start with a verb`,
      bullets_have_numbers: (_: boolean | null, d?: string) => `${(d ?? "0/0").replace("/", " of ")} achievements have a number`,
      dates_consistent: (ok: boolean | null) => (ok === null ? "Dates: none yet" : ok ? "Dates in one format" : "Dates in different formats"),
      jobs_within_15y: (ok: boolean | null) => (ok === null ? "Experience: none yet" : ok ? "Experience from the last 15 years" : "Some experience is over 15 years old"),
    } as Partial<Record<AutoRule, (ok: boolean | null, d?: string) => string>>,
    personal: (d: string) => `Check: “${d.slice(0, 50)}”`,
  },
};
const SIDE_RULES: AutoRule[] = ["fits_one_page", "no_personal_data", "bullets_start_with_verb", "bullets_have_numbers", "dates_consistent", "jobs_within_15y"];
const SECS = ["contact", "summary", "jobs", "education", "skills", "en"] as const;

export function MiResumeView({
  slug,
  courseTitle,
  steps,
  resume,
  progress,
  initialLang,
  initialVersion,
  defaultLang,
}: {
  slug: string;
  courseTitle: string;
  steps: GuidedStep[];
  resume: ResumeData;
  progress: number;
  initialLang: Lang;
  initialVersion: string | null;
  defaultLang: Lang;
}) {
  const [ui, setUi] = useLang(defaultLang);
  const t = UI[ui];
  const r = R[ui];
  const [docLang, setDocLang] = useState<Lang>(initialLang);
  const versions = (Array.isArray(resume.versions) ? (resume.versions as Version[]) : []).filter((v) => str(v?.company).trim());
  const [vid, setVid] = useState<string>(initialVersion && versions.some((v) => v.id === initialVersion) ? initialVersion : "");
  const version = versions.find((v) => v.id === vid) ?? null;
  const src = docLang === "es" ? applyVersion(resume, version) : resume;
  const m = docModel(src, docLang);
  const [fits, measure] = useFitsOnePage(docModel(applyVersion(resume, version), "es"), "es");
  const verbs = useMemo(() => steps.flatMap((x) => x.essentials.flatMap((b) => (b.type === "phrases" ? b.items.flatMap((i) => [i.es, i.en]) : []))), [steps]);
  const rules = runRules(applyVersion(resume, version), fits, verbs);
  const ready = enReady(resume);
  const stepOf = (k: string) => stepOfKey(steps, k) ?? 1;
  const enStep = stepOf("en");
  const empty =
    docLang === "es"
      ? { contact: r.empty(stepOf("contact")), summary: r.empty(stepOf("summary")), skills: r.empty(stepOf("skills")), jobs: r.empty(stepOf("jobs")), education: r.empty(stepOf("education")) }
      : { contact: r.empty(enStep), summary: r.empty(enStep), skills: r.empty(enStep), jobs: r.empty(enStep), education: r.empty(enStep) };
  const bulletsN = jobsOf(resume).flatMap((j) => j.bullets.filter((b) => b.trim())).length;

  return (
    <div className={s.page} lang={ui}>
      <TopBar kicker={r.kicker(courseTitle)} title={r.title} backHref={`/app/cursos/${slug}`} progress={progress} lang={ui} onLang={setUi} t={t} />
      <div className={s.wrap} style={{ display: "block" }}>
        <div className={s.rgrid}>
          <div style={{ minWidth: 0 }}>
            <h1 className={s.sr}>{r.title}</h1>
            <div className={s.docTools}>
              <div className={s.seg} role="group" aria-label={r.seg}>
                <button type="button" aria-pressed={docLang === "es"} onClick={() => setDocLang("es")}>
                  {r.es}
                </button>
                <button type="button" aria-pressed={docLang === "en"} onClick={() => setDocLang("en")} data-lang="en">
                  {r.en}
                </button>
              </div>
              {docLang === "es" && versions.length > 0 && (
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 800, fontSize: 14, minWidth: 0 }}>
                  {r.version}
                  <select value={vid} onChange={(e) => setVid(e.target.value)}>
                    <option value="">{r.general}</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.company}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {docLang === "en" && (
              <div className={s.aiwarn} role="note">
                <Ico n="spark" />
                <div>
                  {resume.en ? r.ai : r.noEn}
                  {resume.en && !ready && <> {r.partial}</>}
                </div>
              </div>
            )}
            <ResumeSheet m={m} lang={docLang} empty={empty} />
          </div>

          <div className={s.rside}>
            <div className={s.box}>
              <h4>{r.auto}</h4>
              <ul className={s.ck}>
                {SIDE_RULES.map((k) => {
                  const res = rules[k];
                  if ((k === "bullets_start_with_verb" || k === "bullets_have_numbers") && !bulletsN) return null;
                  const cls = res.ok === true ? s.ckOk : res.ok === false ? s.ckBad : s.ckWa;
                  return (
                    <li key={k} className={cls} data-rule={k} data-ok={res.ok === null ? "wait" : res.ok ? "1" : "0"}>
                      <i>
                        <Ico n={res.ok === true ? "check" : res.ok === false ? "x" : "alert"} />
                      </i>
                      <div>
                        {r.rules[k]?.(res.ok, res.detail)}
                        {k === "no_personal_data" && res.ok === false && res.detail && <small>{r.personal(res.detail)}</small>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className={s.box}>
              <h4>{r.dl}</h4>
              <p>{r.fname}</p>
              {docLang === "en" && !ready ? (
                <p className={s.count} style={{ marginTop: 10 }}>
                  {r.enLocked}{" "}
                  <Link href={stepPath(slug, enStep)} style={{ textDecoration: "underline", color: "var(--teal)" }}>
                    {t.stepN(enStep)}
                  </Link>
                </p>
              ) : (
                <ExportButtons data={resume} lang={docLang} version={docLang === "es" ? version : null} />
              )}
            </div>
            <div className={s.box}>
              <h4>{r.secs}</h4>
              <ul className={`${s.mini} ${s.secl}`}>
                {SECS.map((k) => {
                  const ok = k === "en" ? ready : sectionFilled(resume, k);
                  const n = stepOf(k);
                  return (
                    <li key={k}>
                      <Link href={stepPath(slug, n)} className={ok ? s.miniDone : ""}>
                        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <i>{ok ? "✓" : n}</i>
                          {t.secNames[k]}
                        </span>
                        <small>{r.edit(n)}</small>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
        <nav className={s.nav}>
          <Link href={`/app/cursos/${slug}`} className={`${s.btn} ${s.btnO}`}>
            <Ico n="left" />
            <div>
              <small>{r.back}</small>
              <span>{r.toCourse}</span>
            </div>
          </Link>
        </nav>
      </div>
      {measure}
    </div>
  );
}

