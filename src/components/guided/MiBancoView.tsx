"use client";

// Mi banco de respuestas (interview-mockup.html ?v=bank): the Interview course's product. The value statement, the 8
// answers, the company card and my questions, the improved answers, the video self-review and the mock interviews.
// Owner only (answer_banks); "Descargar mi banco (PDF)" prints it.
import Link from "next/link";
import { useState } from "react";
import {
  BANK_PARTS,
  answerFields,
  answerText,
  answerVals,
  answersSection,
  bankFilled,
  bankStep,
  mmss,
  obj,
  simPath,
  simRuns,
  speakSeconds,
  stepPath,
  str,
  strs,
  type GuidedStep,
  type Lang,
  type ResumeData,
  type Section,
} from "@/lib/guided";
import { PrintPortal, printPdf } from "./ResumeDoc";
import { Ico, TopBar, UI, say, useLang } from "./ui";
import s from "./guided.module.css";

export function MiBancoView({ slug, courseTitle, steps, bank, progress, name, defaultLang }: { slug: string; courseTitle: string; steps: GuidedStep[]; bank: ResumeData; progress: number; name: string; defaultLang: Lang }) {
  const [lang, setLang] = useLang(defaultLang);
  const t = UI[lang];
  const [open, setOpen] = useState<number | null>(null);
  const ans = answersSection(steps);
  const vals = ans ? answerVals(bank, ans.sec.key, ans.sec.questions.length) : [];
  const ready = vals.filter((a) => a.ready).length;
  const company = obj(bank.company);
  const myq = [...strs(bank.myq), ...(str(bank.ownq).trim() ? [str(bank.ownq).trim()] : [])];
  const improved = (Array.isArray(bank.improve5) ? (bank.improve5 as unknown[]) : []).map(obj);
  const nb = steps.flatMap((x) => x.build.sections).find((x): x is Extract<Section, { type: "normal_vs_better" }> => x.type === "normal_vs_better");
  const self = obj(bank.final3);
  const runs = simRuns(bank);
  const sim = steps.flatMap((x) => x.build.sections).find((x): x is Extract<Section, { type: "simulator" }> => x.type === "simulator");
  const evalLabel = (k: string, i: number) => sim?.eval.find((e) => e.k === k)?.o[i] ?? "";
  const ansStep = ans?.step ?? 4;
  const title = lang === "es" ? "Mi banco de respuestas" : "My answer bank";
  const fileName = `${(name || "Mi").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "") || "Mi"}_Banco_de_respuestas.pdf`;
  const st = (k: string) => bankStep(steps, k) ?? 1;

  const bankRail = (
      <>
        <div className={s.box}>
          <h4>{lang === "es" ? "LISTO PARA LA ENTREVISTA" : "READY FOR THE INTERVIEW"}</h4>
          <ul className={s.ck}>
            {BANK_PARTS.map((x) => {
              const ok = bankFilled(bank, x.key, steps);
              const isAns = x.key === "answers";
              return (
                <li key={x.key} className={ok ? s.ckOk : s.ckWa} data-bank-part={x.key} data-ok={ok ? "1" : "0"}>
                  <i>
                    <Ico n={ok ? "check" : "alert"} />
                  </i>
                  <div>
                    {isAns ? (lang === "es" ? `${ready} de ${vals.length} respuestas` : `${ready} of ${vals.length} answers`) : x[lang]}
                    {!ok && <small>{lang === "es" ? `Se completa en el paso ${st(x.key)}.` : `Completed in step ${st(x.key)}.`}</small>}
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" className={`${s.btn} ${s.btnG}`} onClick={() => printPdf(fileName)} data-action="pdf">
            <Ico n="down" />
            {lang === "es" ? "Descargar mi banco (PDF)" : "Download my bank (PDF)"}
          </button>
        </div>
        <div className={s.box}>
          <h4>
            <Ico n="lock" style={{ color: "var(--ok)" }} />
            {lang === "es" ? "PRIVADO" : "PRIVATE"}
          </h4>
          <p>{lang === "es" ? "Solo tú ves tus respuestas." : "Only you can see your answers."}</p>
        </div>
      </>
    );

  return (
    <div className={`${s.page} ${s.thInterview}`} lang={lang}>
      <TopBar
        kicker={`CELSGLOBAL · ${courseTitle.toUpperCase()}`}
        title={title}
        backHref={`/app/cursos/${slug}`}
        progress={progress}
        lang={lang}
        onLang={setLang}
        t={t}
        row={
          <>
            <span>{lang === "es" ? `${ready} de ${vals.length} respuestas listas` : `${ready} of ${vals.length} answers ready`}</span>
            <Link href={simPath(slug)}>
              <Ico n="mic" />
              {lang === "es" ? "Simulacro" : "Mock interview"}
            </Link>
          </>
        }
      />
      <div className={s.wrap}>
        <div className={s.main}>
          <h1 className={s.sr}>{title}</h1>
          <div className={s.vpCard}>
            <small>{lang === "es" ? `MI FRASE DE VALOR · PASO ${st("value")}` : `MY VALUE STATEMENT · STEP ${st("value")}`}</small>
            {str(bank.value).trim() ? (
              <p lang="en">“{str(bank.value).trim()}”</p>
            ) : (
              <p className={s.count}>
                <Link href={stepPath(slug, st("value"))}>{lang === "es" ? `Se completa en el paso ${st("value")} →` : `Completed in step ${st("value")} →`}</Link>
              </p>
            )}
          </div>

          {ans && (
            <section className={s.sec} style={{ marginTop: 28 }}>
              <div className={s.sh}>
                <div className={s.ti}>
                  <Ico n="chat" />
                </div>
                <div>
                  <small>{t.stepN(ansStep).toUpperCase()}</small>
                  <h2>{lang === "es" ? `Mis ${vals.length} respuestas` : `My ${vals.length} answers`}</h2>
                </div>
              </div>
              {ans.sec.questions.map((q, i) => {
                const a = vals[i]!;
                const txt = answerText(q.form, a);
                const isOpen = open === i;
                return (
                  <div className={`${s.qa} ${a.ready ? s.qaOk : ""}`} key={q.en} data-bank-answer={i}>
                    <button type="button" className={s.qh} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                      <i>{a.ready ? "✓" : i + 1}</i>
                      <b lang="en">
                        {q.en}
                        <small lang="es">{txt ? `≈ ${mmss(speakSeconds(txt, ans.sec.speaking_wpm))} min · ${a.ready ? "lista" : "en borrador"}` : `Pendiente · se escribe en el paso ${ansStep}`}</small>
                      </b>
                      <span className={s.st2}>{a.ready ? "Lista" : "Pendiente"}</span>
                    </button>
                    {isOpen && (
                      <div className={s.ansText} lang="en">
                        {txt ? (
                          <>
                            {txt}
                            <div className={s.btnRow}>
                              <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} onClick={() => say(txt)}>
                                <Ico n="vol" />
                                {lang === "es" ? "Escuchar" : "Listen"}
                              </button>
                              <Link href={stepPath(slug, ansStep)} className={`${s.btn} ${s.btnT} ${s.btnSm}`}>
                                <Ico n="pen" />
                                {lang === "es" ? `Editar · Paso ${ansStep}` : `Edit · Step ${ansStep}`}
                              </Link>
                            </div>
                          </>
                        ) : (
                          <Link href={stepPath(slug, ansStep)} className={`${s.btn} ${s.btnT} ${s.btnSm}`}>
                            {lang === "es" ? `Escribirla en el paso ${ansStep}` : `Write it in step ${ansStep}`}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          <section className={s.sec}>
            <div className={s.sh}>
              <div className={s.ti}>
                <Ico n="target" />
              </div>
              <div>
                <small>{lang === "es" ? `PASOS ${st("company")} Y ${st("myq")}` : `STEPS ${st("company")} AND ${st("myq")}`}</small>
                <h2>{lang === "es" ? "La empresa y mis preguntas" : "The company and my questions"}</h2>
              </div>
            </div>
            <div className={s.card}>
              {str(company.company) ? (
                <>
                  <h3>{[str(company.company), str(company.role)].filter(Boolean).join(" · ")}</h3>
                  <p className={s.sub}>
                    {[
                      str(company.what) && `${lang === "es" ? "Lo que hacen" : "What they do"}: ${str(company.what)}`,
                      str(company.asks) && `${lang === "es" ? "Lo que piden" : "What they ask"}: ${str(company.asks)}`,
                      str(company.when) && `${lang === "es" ? "Entrevista" : "Interview"}: ${new Date(str(company.when)).toLocaleString(lang === "es" ? "es-MX" : "en-US", { dateStyle: "medium", timeStyle: "short" })}${str(company.format) ? ` (${str(company.format)})` : ""}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {str(company.why) && (
                    <p className={s.sub}>
                      <b>{lang === "es" ? "Por qué ahí:" : "Why there:"}</b> {str(company.why)}
                    </p>
                  )}
                </>
              ) : (
                <p className={s.sub}>
                  <Link href={stepPath(slug, st("company"))}>{lang === "es" ? `Tu ficha de la empresa se llena en el paso ${st("company")} →` : `Fill in your company card in step ${st("company")} →`}</Link>
                </p>
              )}
              <div className={s.qlist}>
                {myq.length ? (
                  myq.map((q) => (
                    <div key={q}>
                      <Ico n="chat" />
                      <span lang="en">{q}</span>
                      <button type="button" className={s.sayBtn} aria-label={`${lang === "es" ? "Escuchar" : "Listen"}: ${q}`} onClick={() => say(q)}>
                        <Ico n="vol" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={s.count}>
                    <Link href={stepPath(slug, st("myq"))}>{lang === "es" ? `Tus 3 preguntas se eligen en el paso ${st("myq")} →` : `Pick your 3 questions in step ${st("myq")} →`}</Link>
                  </p>
                )}
              </div>
            </div>
          </section>

          {nb && improved.some((x) => str(x.better).trim()) && (
            <section className={s.sec}>
              <div className={s.sh}>
                <div className={s.ti}>
                  <Ico n="spark" />
                </div>
                <div>
                  <small>{t.stepN(st("value")).toUpperCase()}</small>
                  <h2>{lang === "es" ? "Mis respuestas mejoradas" : "My improved answers"}</h2>
                </div>
              </div>
              <div className={s.card}>
                <div className={s.qlist}>
                  {nb.questions.map((q, i) =>
                    str(improved[i]?.better).trim() ? (
                      <div key={q} style={{ display: "block" }}>
                        <b lang="en">{q}</b>
                        <p lang="en" style={{ fontWeight: 600, marginTop: 4 }}>
                          {str(improved[i]?.better)}
                        </p>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            </section>
          )}

          {(strs(self.strengths).some(Boolean) || strs(self.improve).some(Boolean)) && (
            <section className={s.sec}>
              <div className={s.sh}>
                <div className={s.ti}>
                  <Ico n="eye" />
                </div>
                <div>
                  <small>{t.stepN(st("rubric")).toUpperCase()}</small>
                  <h2>{lang === "es" ? "Mi autoevaluación en video" : "My video self-review"}</h2>
                </div>
              </div>
              <div className={`${s.card}`}>
                <div className={s.grid2}>
                  <div>
                    <p className={s.groupT} style={{ marginTop: 0 }}>
                      {lang === "es" ? "Fortalezas" : "Strengths"}
                    </p>
                    <ul className={s.ck}>
                      {strs(self.strengths)
                        .filter(Boolean)
                        .map((x) => (
                          <li key={x} className={s.ckOk}>
                            <i>
                              <Ico n="check" />
                            </i>
                            <div>{x}</div>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <p className={s.groupT} style={{ marginTop: 0 }}>
                      {lang === "es" ? "Áreas de mejora" : "To improve"}
                    </p>
                    <ul className={s.ck}>
                      {strs(self.improve)
                        .filter(Boolean)
                        .map((x) => (
                          <li key={x} className={s.ckWa}>
                            <i>
                              <Ico n="alert" />
                            </i>
                            <div>{x}</div>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {runs.length > 0 && (
            <section className={s.sec}>
              <div className={s.sh}>
                <div className={s.ti}>
                  <Ico n="mic" />
                </div>
                <div>
                  <small>{t.stepN(st("sim")).toUpperCase()}</small>
                  <h2>{lang === "es" ? "Mis simulacros" : "My mock interviews"}</h2>
                </div>
              </div>
              {[...runs].reverse().map((r) => (
                <div className={s.card} key={r.id} data-run={r.id}>
                  <h3>
                    {new Date(r.at).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
                    {r.mode === "friend" ? (lang === "es" ? "con un amigo o familiar" : "with a friend") : lang === "es" ? "solo" : "solo"}
                  </h3>
                  <p className={s.sub}>{lang === "es" ? `${r.items.length} preguntas` : `${r.items.length} questions`}</p>
                  <div className={s.qlist}>
                    {r.items.map((it, i) => (
                      <div key={i} style={{ display: "block" }}>
                        <b lang="en">{it.q}</b>
                        <p lang="en" style={{ fontWeight: 600, marginTop: 4, color: "var(--mut)" }}>
                          {it.transcript || (lang === "es" ? "(sin transcripción)" : "(no transcript)")}
                        </p>
                        <p className={s.count}>
                          {Object.entries(it.eval ?? {})
                            .map(([k, v]) => evalLabel(k, v))
                            .filter(Boolean)
                            .join(" · ")}
                          {it.comments ? ` · ${it.comments}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          <nav className={s.nav}>
            <Link href={`/app/cursos/${slug}`} className={`${s.btn} ${s.btnO}`}>
              <Ico n="left" />
              <div>
                <small>{lang === "es" ? "REGRESAR" : "BACK"}</small>
                <span>{t.toCourse}</span>
              </div>
            </Link>
            <Link href={simPath(slug)} className={`${s.btn} ${s.btnG} ${s.navNext}`}>
              <Ico n="mic" />
              <div>
                <small>{t.stepN(st("sim")).toUpperCase()}</small>
                <span>{lang === "es" ? "Empezar el simulacro" : "Start the mock interview"}</span>
              </div>
            </Link>
          </nav>
        </div>

        <aside className={s.rail} style={{ display: undefined }}>
          {bankRail}
        </aside>
      </div>
      <div className={s.bankMob}>
        {bankRail}
      </div>
      <PrintPortal>
        <div className={s.bankDoc}>
          <h2>{name || title}</h2>
          <p>{title}</p>
          {str(bank.value).trim() && (
            <>
              <h6>{lang === "es" ? "Mi frase de valor" : "My value statement"}</h6>
              <p>{str(bank.value)}</p>
            </>
          )}
          {ans && (
            <>
              <h6>{lang === "es" ? "Mis respuestas" : "My answers"}</h6>
              {ans.sec.questions.map((q, i) => {
                const fields = answerFields(q.form, vals[i]!).filter(([, x]) => x.trim());
                return (
                  <div key={q.en}>
                    <p>
                      <b>{q.en}</b>
                    </p>
                    {fields.length ? fields.map(([k, x]) => <p key={k}>{q.form === "star" ? `${k}: ${x}` : x}</p>) : <p>—</p>}
                  </div>
                );
              })}
            </>
          )}
          {str(company.company) && (
            <>
              <h6>{lang === "es" ? "La empresa" : "The company"}</h6>
              <p>
                <b>{[str(company.company), str(company.role)].filter(Boolean).join(" · ")}</b>
              </p>
              {str(company.what) && <p>{str(company.what)}</p>}
              {str(company.asks) && <p>{str(company.asks)}</p>}
              {str(company.why) && <p>{str(company.why)}</p>}
            </>
          )}
          {myq.length > 0 && (
            <>
              <h6>{lang === "es" ? "Mis preguntas" : "My questions"}</h6>
              <ul style={{ paddingLeft: 18, listStyle: "disc" }}>
                {myq.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </PrintPortal>
    </div>
  );
}
