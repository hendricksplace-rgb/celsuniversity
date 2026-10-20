"use client";

// Course page of a guided course (cv-resume-mockup.html ?v=home): hero with the little paper resume that fills in,
// the steps as a timeline (nothing is locked), the AI tools, the original books, and the "Tu resume" rail.
import Link from "next/link";
import {
  BANK_PARTS,
  PAPER_KEYS,
  PRODUCT,
  answerVals,
  answersSection,
  bankFilled,
  bankStep,
  contactOf,
  productPath,
  resumePath,
  sectionFilled,
  simPath,
  stepOfKey,
  stepPath,
  str,
  type GuidedStep,
  type GuidedTheme,
  type Lang,
  type ResumeData,
} from "@/lib/guided";
import { budgetTotals, emergencyOf, money } from "@/lib/guided-finance";
import { Ico, TopBar, UI, useLang } from "./ui";

const RESUME_SLUG = "from-cv-to-u-s-resume-a-step-by-step-guide";
const VISA_SLUG = "tu-camino-con-la-visa-tn-empieza-aqui";
const INTERVIEW_SLUG = "crack-the-u-s-interview-code";
import s from "./guided.module.css";

export type CourseCopy = { kick: string; h1a: string; h1b: string; h1c?: string; text: string; result: string; routeH?: string; routeI?: string };

export function GuidedCourseView({
  slug,
  title,
  stage,
  copy,
  steps,
  done,
  resume,
  books,
  tools,
  notice,
  defaultLang,
  theme = "resume",
  stages = {},
}: {
  slug: string;
  title: string;
  stage: string;
  copy: CourseCopy;
  steps: GuidedStep[];
  done: Record<number, boolean>;
  resume: ResumeData;
  books: { slug: string; title: string }[];
  tools: boolean;
  notice?: React.ReactNode;
  defaultLang: Lang;
  theme?: GuidedTheme;
  /** "ETAPA N" of each route course (the related-course cards). */
  stages?: Record<string, string>;
}) {
  const [lang, setLang] = useLang(defaultLang);
  const t = UI[lang];
  const total = steps.length;
  const doneN = steps.filter((x) => done[x.step]).length;
  const cur = steps.find((x) => !done[x.step])?.step ?? steps[steps.length - 1]?.step ?? 1;
  const filled = PAPER_KEYS.filter((k) => sectionFilled(resume, k));
  const minutes = steps.reduce((n, x) => n + (x.minutes || 0), 0);
  const hours = Math.round(minutes / 60);
  const c = contactOf(resume);
  const target = str((resume.target as Record<string, unknown> | undefined)?.target_role);
  const railKeys = [...PAPER_KEYS, "en"] as const;
  const enDone = resume.en_status === "approved";
  const bank = theme === "interview";
  const fi = theme === "finanzas";
  const tn = theme === "visa_tn";
  const listRail = fi || tn;
  const readyPct = total ? Math.round((doneN / total) * 100) : 0;
  const money$ = fi ? budgetTotals(resume, steps) : null;
  const ef = fi ? emergencyOf(resume, steps) : null;
  const prod = PRODUCT[theme];
  const prodHref = productPath(slug, theme);
  const ans = answersSection(steps);
  const ansVals = ans ? answerVals(resume, ans.sec.key, ans.sec.questions.length) : [];
  const readyN = ansVals.filter((a) => a.ready).length;

  return (
    <div className={`${s.page} ${bank ? s.thInterview : ""} ${fi ? s.thFinanzas : ""} ${tn ? s.thTn : ""}`} lang={lang}>
      <TopBar
        kicker={stage}
        title={title}
        backHref="/app/cursos"
        progress={total ? doneN / total : 0}
        lang={lang}
        onLang={setLang}
        resumeHref={prodHref}
        productLabel={prod.label[lang]}
        productIcon={prod.icon}
        t={t}
        row={
          <>
            <span>{tn ? `${t.stepOf(cur, total).charAt(0)}${t.stepOf(cur, total).slice(1).toLowerCase()} · ${lang === "es" ? `${readyPct}% listo para tu TN` : `${readyPct}% ready for your TN`}` : fi ? `${t.stepOf(cur, total).charAt(0)}${t.stepOf(cur, total).slice(1).toLowerCase()} · ${lang === "es" ? `tu plan va en ${doneN} de ${total} partes` : `your plan: ${doneN} of ${total} parts`}` : bank ? `${t.stepOf(cur, total).charAt(0)}${t.stepOf(cur, total).slice(1).toLowerCase()} · ${readyN} ${lang === "es" ? "de" : "of"} ${ansVals.length} ${lang === "es" ? "respuestas" : "answers"}` : t.mobHome(cur, total, filled.length, PAPER_KEYS.length)}</span>
            <Link href={prodHref}>
              <Ico n={prod.icon} />
              {prod.label[lang]}
            </Link>
          </>
        }
      />
      <div className={s.wrap}>
        <div className={s.main}>
          {notice}
          <section className={`${s.hero} ${bank ? s.heroCover : ""} ${fi ? s.heroFi : ""} ${tn ? s.heroTn : ""}`}>
            <div className={s.hgrid}>
              <div>
                <span className={s.kick}>
                  <Ico n="globe" />
                  {copy.kick}
                </span>
                {bank || fi || tn ? (
                  <h1>
                    {copy.h1a} <small>{copy.h1b}</small>
                    {copy.h1c ? ` ${copy.h1c}` : null}
                  </h1>
                ) : (
                  <h1>
                    {copy.h1a} <em>{copy.h1b}</em>
                  </h1>
                )}
                <p>{copy.text}</p>
                <div className={s.chips}>
                  <span>
                    <Ico n="target" />
                    {lang === "es" ? `${total} pasos` : `${total} steps`}
                  </span>
                  <span>
                    <Ico n="clock" />
                    {lang === "es" ? `Unas ${hours} horas, a tu ritmo` : `About ${hours} hours, at your pace`}
                  </span>
                  {copy.result && (
                    <span>
                      <Ico n={bank ? "mic" : fi ? "chart" : tn ? "pass" : "doc"} />
                      {copy.result}
                    </span>
                  )}
                </div>
                <div className={s.hcta}>
                  <Link href={stepPath(slug, cur)} className={`${s.btn} ${s.btnG}`}>
                    <Ico n="play" />
                    {doneN === total ? t.review : t.continueStep(cur)}
                  </Link>
                  {fi || tn ? (
                    <Link href={prodHref} className={`${s.btn} ${s.btnO}`}>
                      <Ico n={prod.icon} />
                      {prod.see[lang]}
                    </Link>
                  ) : bank ? (
                    <Link href={simPath(slug)} className={`${s.btn} ${s.btnO}`}>
                      <Ico n="mic" />
                      {lang === "es" ? "Probar el simulacro" : "Try the mock interview"}
                    </Link>
                  ) : (
                    <Link href={resumePath(slug)} className={`${s.btn} ${s.btnO}`}>
                      <Ico n="eye" />
                      {t.seeResume}
                    </Link>
                  )}
                </div>
              </div>
              {tn ? (
                <div className={s.tcard} data-tcard>
                  <small>{prod.label[lang].toUpperCase()}</small>
                  <div className={s.ring2}>
                    <i style={{ ["--p" as string]: `${readyPct}%` }}>
                      <b>{readyPct}%</b>
                    </i>
                    <span>
                      {lang === "es" ? "Listo para tu TN" : "Ready for your TN"}
                      <br />
                      <em>{lang === "es" ? `${doneN} de ${total} partes` : `${doneN} of ${total} parts`}</em>
                    </span>
                  </div>
                  <ul className={s.tl2}>
                    {steps.map((x) => (
                      <li key={x.step} className={done[x.step] ? s.ok : ""}>
                        <em>{done[x.step] ? "✓" : x.step}</em>
                        {x.builds}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : fi && money$ ? (
                <div className={s.mcard} data-mcard>
                  <small>{lang === "es" ? "MI PLAN FINANCIERO" : "MY FINANCIAL PLAN"}</small>
                  <div className={s.mrow}>
                    <span>{lang === "es" ? "Ingreso neto" : "Net income"}</span>
                    <b>{money$.net ? money(money$.net) : "—"}</b>
                  </div>
                  <div className={s.mrow}>
                    <span>{lang === "es" ? "Gastos" : "Spending"}</span>
                    <b>{money(money$.spent)}</b>
                  </div>
                  <div className={`${s.mrow} ${money$.balance < 0 ? s.neg : s.pos}`}>
                    <span>{money$.balance < 0 ? (lang === "es" ? "Te falta" : "Short by") : lang === "es" ? "Te queda" : "Left over"}</span>
                    <b>{money$.net ? `${money$.balance < 0 ? "" : "+"}${money(money$.balance)}` : "—"}</b>
                  </div>
                  <div className={s.fiBar}>
                    {money$.cats.map((c) => (c.v > 0 ? <i key={c.k} style={{ width: `${(c.v / Math.max(money$.net, money$.spent, 1)) * 100}%`, background: c.color }} /> : null))}
                  </div>
                  <div className={s.fiLeg}>
                    {money$.cats.slice(0, 6).map((c) => (
                      <span key={c.k}>
                        <em style={{ background: c.color, width: 8, height: 8 }} />
                        {c.label.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                  {ef && (
                    <>
                      <div className={s.mrow} style={{ marginTop: 12 }}>
                        <span>{lang === "es" ? "Fondo de emergencia" : "Emergency fund"}</span>
                        <b>
                          {money(ef.saved)}
                          {ef.goal ? ` / ${money(ef.goal)}` : ""}
                        </b>
                      </div>
                      <div className={s.goal}>
                        <i style={{ width: `${ef.goal ? Math.min(100, (ef.saved / ef.goal) * 100) : 0}%` }} />
                      </div>
                    </>
                  )}
                </div>
              ) : bank && ans ? (
                <div className={s.bankc} aria-label={`${readyN}/${ansVals.length}`}>
                  <small>{lang === "es" ? "MI BANCO DE RESPUESTAS" : "MY ANSWER BANK"}</small>
                  <b>{lang === "es" ? `${readyN} de ${ansVals.length} listas` : `${readyN} of ${ansVals.length} ready`}</b>
                  {ans.sec.questions.map((q, i) => (
                    <div key={q.en} className={`${s.bq} ${ansVals[i]?.ready ? s.bqOk : ""}`}>
                      <i>{ansVals[i]?.ready ? "✓" : ""}</i>
                      <span lang="en">{q.en}</span>
                    </div>
                  ))}
                </div>
              ) : (
              <div className={s.hpaper} aria-label={`${filled.length}/${PAPER_KEYS.length} ${t.sections}`}>
                <div className={s.paper}>
                  <div className={s.nm}>{c.name?.trim() || t.yourName}</div>
                  <div className={s.rl}>{[target || t.yourRole, (c.city ?? "").split(",")[0]].filter(Boolean).join(" · ")}</div>
                  {PAPER_KEYS.map((k) => {
                    const f = filled.includes(k);
                    return (
                      <div key={k}>
                        <div className={`${s.ph} ${f ? s.phF : ""}`}>
                          {t.paperH[k]}
                          {f && <em>✓</em>}
                        </div>
                        <div className={`${s.pl} ${f ? s.plF : ""}`} style={{ width: f ? "92%" : "88%" }} />
                        <div className={`${s.pl} ${f ? s.plF : ""}`} style={{ width: f ? "78%" : "70%" }} />
                      </div>
                    );
                  })}
                </div>
                <div className={s.prog} style={{ ["--p" as string]: `${(filled.length / PAPER_KEYS.length) * 100}%` }}>
                  <div>
                    <b>
                      {filled.length}/{PAPER_KEYS.length}
                    </b>
                    <span>{t.sections}</span>
                  </div>
                </div>
              </div>
              )}
            </div>
          </section>

          <section className={s.sec}>
            <div className={s.sh}>
              <div className={s.ti}>
                <Ico n="target" />
              </div>
              <div>
                <small>{t.route}</small>
                <h2>{copy.routeH ?? t.routeH(total)}</h2>
              </div>
            </div>
            <p className={s.intro}>{copy.routeI ?? t.routeI}</p>
            <ol className={s.route}>
              {steps.map((x) => {
                const isDone = !!done[x.step];
                const isCur = !isDone && x.step === cur;
                return (
                  <li key={x.step} className={`${s.st} ${isDone ? s.stDone : isCur ? s.stCur : ""}`} data-step={x.step}>
                    <div className={s.nd} aria-hidden>
                      <b>{isDone ? "✓" : x.step}</b>
                    </div>
                    <div className={s.sc}>
                      <div style={{ minWidth: 0 }}>
                        <small>{t.stepOf(x.step, x.of || total)}</small>
                        <h3>{x.title}</h3>
                        <p>{x.intro}</p>
                        <span className={s.buildChip}>
                          <Ico n={isDone ? "check" : "pen"} />
                          {isDone ? t.ready(x.builds) : t.builds(x.builds)}
                        </span>
                        <span className={s.meta}>{t.min(x.minutes)}</span>
                      </div>
                      <Link href={stepPath(slug, x.step)} className={`${s.btn} ${isCur ? s.btnG : isDone ? s.btnO : s.btnT}`}>
                        {isDone ? t.review : isCur ? t.cont : t.open}
                        <Ico n="right" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {(tools || fi || tn || books.length > 0) && (
            <section className={s.sec}>
              <div className={s.sh}>
                <div className={s.ti}>
                  <Ico n="spark" />
                </div>
                <div>
                  <small>{t.toolsK}</small>
                  <h2>{t.toolsH}</h2>
                </div>
              </div>
              {tools && bank && (
                <div className={s.tools}>
                  <div className={s.tool}>
                    <div className={s.ic}>
                      <Ico n="mic" />
                    </div>
                    <span className={s.chip}>{t.ai}</span>
                    <h3>{lang === "es" ? "Práctica de entrevista" : "Interview Practice"}</h3>
                    <p>{lang === "es" ? "Cuando tengas tus respuestas, practica con preguntas nuevas y recibe comentarios sobre tu claridad y tu inglés." : "When your answers are ready, practice new questions and get feedback on your clarity and your English."}</p>
                    <Link href="/app/herramientas/entrevista" className={`${s.btn} ${s.btnG}`}>
                      {t.ipB}
                      <Ico n="right" />
                    </Link>
                  </div>
                  <div className={s.tool}>
                    <div className={s.ic}>
                      <Ico n="doc" />
                    </div>
                    <span className={s.chip}>{lang === "es" ? "ETAPA 2" : "STAGE 2"}</span>
                    <h3>{lang === "es" ? "Tu resume" : "Your resume"}</h3>
                    <p>{lang === "es" ? "Tus historias STAR salen de tu experiencia. Tenla a la mano en Mi resume." : "Your STAR stories come from your experience. Keep it handy in My resume."}</p>
                    <Link href={resumePath(RESUME_SLUG)} className={`${s.btn} ${s.btnO}`}>
                      {t.seeResume}
                      <Ico n="right" />
                    </Link>
                  </div>
                </div>
              )}
              {fi && (
                <div className={s.tools}>
                  <div className={s.tool}>
                    <div className={s.ic}>
                      <Ico n="doc" />
                    </div>
                    {stages[RESUME_SLUG] && <span className={s.chip}>{stages[RESUME_SLUG]}</span>}
                    <h3>{lang === "es" ? "Tu resume" : "Your resume"}</h3>
                    <p>{lang === "es" ? "Un mejor trabajo es la forma más rápida de mejorar tu presupuesto." : "A better job is the fastest way to improve your budget."}</p>
                    <Link href={resumePath(RESUME_SLUG)} className={`${s.btn} ${s.btnG}`}>
                      {t.seeResume}
                      <Ico n="right" />
                    </Link>
                  </div>
                  <div className={s.tool}>
                    <div className={s.ic}>
                      <Ico n="globe" />
                    </div>
                    {stages[VISA_SLUG] && <span className={s.chip}>{stages[VISA_SLUG]}</span>}
                    <h3>{lang === "es" ? "Tu Camino con la Visa TN" : "Your TN Visa Path"}</h3>
                    <p>{lang === "es" ? "Los trámites, costos y tiempos de tu visa, para que también entren en tu plan." : "Your visa's steps, costs and timing, so they fit in your plan too."}</p>
                    <Link href={`/app/cursos/${VISA_SLUG}`} className={`${s.btn} ${s.btnO} ${s.btnGlass}`}>
                      {t.open}
                      <Ico n="right" />
                    </Link>
                  </div>
                </div>
              )}
              {tn && (
                <div className={s.tools}>
                  <div className={s.tool}>
                    <div className={s.ic}>
                      <Ico n="doc" />
                    </div>
                    {stages[RESUME_SLUG] && <span className={s.chip}>{stages[RESUME_SLUG]}</span>}
                    <h3>{lang === "es" ? "De CV a Resume" : "From CV to U.S. Resume"}</h3>
                    <p>{lang === "es" ? "Tu currículum en formato de EE.UU.: lo primero que te piden en tu perfil y en tu carpeta TN." : "Your résumé in U.S. format: the first thing your profile and your TN folder ask for."}</p>
                    <Link href={`/app/cursos/${RESUME_SLUG}`} className={`${s.btn} ${s.btnG}`}>
                      {t.open}
                      <Ico n="right" />
                    </Link>
                  </div>
                  <div className={s.tool}>
                    <div className={s.ic}>
                      <Ico n="chat" />
                    </div>
                    {stages[INTERVIEW_SLUG] && <span className={s.chip}>{stages[INTERVIEW_SLUG]}</span>}
                    <h3>Crack the U.S. Interview Code</h3>
                    <p>{lang === "es" ? "Tus respuestas y un simulacro en inglés antes de hablar con el empleador." : "Your answers and a mock interview in English before you talk to the employer."}</p>
                    <Link href={`/app/cursos/${INTERVIEW_SLUG}`} className={`${s.btn} ${s.btnO} ${s.btnGlass}`}>
                      {t.open}
                      <Ico n="right" />
                    </Link>
                  </div>
                </div>
              )}
              {tools && !bank && !fi && !tn && (
                <div className={s.tools}>
                  <div className={s.tool}>
                    <div className={s.ic}>
                      <Ico n="doc" />
                    </div>
                    <span className={s.chip}>{t.ai}</span>
                    <h3>{t.rrT}</h3>
                    <p>{t.rrP}</p>
                    <Link href="/app/herramientas/resume" className={`${s.btn} ${s.btnG}`}>
                      {t.rrB}
                      <Ico n="right" />
                    </Link>
                  </div>
                  <div className={s.tool}>
                    <div className={s.ic}>
                      <Ico n="mic" />
                    </div>
                    <span className={s.chip}>{t.ai}</span>
                    <h3>{t.ipT}</h3>
                    <p>{t.ipP}</p>
                    <Link href="/app/herramientas/entrevista" className={`${s.btn} ${s.btnO}`}>
                      {t.ipB}
                      <Ico n="right" />
                    </Link>
                  </div>
                </div>
              )}
              {books.length > 0 && (
                <div className={s.card} style={{ marginTop: 16 }}>
                  <h3>{t.booksH}</h3>
                  <p className={s.sub} style={{ marginBottom: 0 }}>
                    {t.booksP}
                  </p>
                  <div className={s.books}>
                    {books.map((b) => (
                      <Link key={b.slug} href={`/app/libros/${b.slug}`} className={`${s.btn} ${s.btnT} ${s.btnSm}`}>
                        <Ico n="book" />
                        {b.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className={s.rail}>
          {listRail ? (
            <>
              <div className={s.box}>
                <h4>
                  <Ico n={prod.icon} />
                  {prod.rail[lang]}
                </h4>
                <ul className={s.mini}>
                  {steps.map((x) => {
                    const ok = !!done[x.step];
                    const isCur = !ok && x.step === cur;
                    return (
                      <li key={x.step}>
                        <Link href={stepPath(slug, x.step)} className={ok ? s.miniDone : isCur ? s.miniCur : ""}>
                          <i>{ok ? "✓" : x.step}</i>
                          {x.builds}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <Link href={prodHref} className={`${s.btn} ${s.btnG}`}>
                  <Ico n="eye" />
                  {prod.see[lang]}
                </Link>
              </div>
              <div className={s.box}>
                <h4>
                  <Ico n="lock" style={{ color: "var(--ok)" }} />
                  {lang === "es" ? "PRIVADO" : "PRIVATE"}
                </h4>
                <p>{prod.privacy?.[lang]}</p>
              </div>
            </>
          ) : bank ? (
            <>
              <div className={s.box}>
                <h4>
                  <Ico n="chat" />
                  {lang === "es" ? "MI BANCO" : "MY BANK"}
                </h4>
                <ul className={s.mini}>
                  {BANK_PARTS.map((x) => {
                    const n = bankStep(steps, x.key) ?? 1;
                    const ok = bankFilled(resume, x.key, steps);
                    const isCur = !ok && n === cur;
                    return (
                      <li key={x.key}>
                        <Link href={stepPath(slug, n)} className={ok ? s.miniDone : isCur ? s.miniCur : ""}>
                          <i>{ok ? "✓" : n}</i>
                          {x[lang]}
                          <small>{t.stepN(n)}</small>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <Link href={prodHref} className={`${s.btn} ${s.btnG}`}>
                  <Ico n="eye" />
                  {lang === "es" ? "Ver mis respuestas" : "See my answers"}
                </Link>
              </div>
              <div className={s.box}>
                <h4>
                  <Ico n="lock" style={{ color: "var(--ok)" }} />
                  {lang === "es" ? "PRIVADO" : "PRIVATE"}
                </h4>
                <p>{lang === "es" ? "Tus respuestas y tus grabaciones son solo tuyas. Los videos no se suben: se quedan en tu teléfono o computadora." : "Your answers and recordings are yours only. Videos are never uploaded: they stay on your phone or computer."}</p>
              </div>
            </>
          ) : (
            <>
          <div className={s.box}>
            <h4>
              <Ico n="doc" />
              {t.yourResume}
            </h4>
            <ul className={s.mini}>
              {railKeys.map((k) => {
                const n = stepOfKey(steps, k) ?? 1;
                const ok = k === "en" ? enDone : filled.includes(k);
                const isCur = !ok && n === cur;
                return (
                  <li key={k}>
                    <Link href={stepPath(slug, n)} className={ok ? s.miniDone : isCur ? s.miniCur : ""}>
                      <i>{ok ? "✓" : n}</i>
                      {t.secNames[k]}
                      <small>{t.stepN(n)}</small>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href={resumePath(slug)} className={`${s.btn} ${s.btnG}`}>
              <Ico n="eye" />
              {t.seeResume}
            </Link>
          </div>
          <div className={s.box}>
            <h4>
              <Ico n="spark" />
              {t.whenDone}
            </h4>
            <p>{t.whenDoneP}</p>
          </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
