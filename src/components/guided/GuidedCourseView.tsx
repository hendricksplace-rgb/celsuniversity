"use client";

// Course page of a guided course (cv-resume-mockup.html ?v=home): hero with the little paper resume that fills in,
// the steps as a timeline (nothing is locked), the AI tools, the original books, and the "Tu resume" rail.
import Link from "next/link";
import { PAPER_KEYS, contactOf, resumePath, sectionFilled, stepOfKey, stepPath, str, type GuidedStep, type Lang, type ResumeData } from "@/lib/guided";
import { Ico, TopBar, UI, useLang } from "./ui";
import s from "./guided.module.css";

export type CourseCopy = { kick: string; h1a: string; h1b: string; text: string; result: string };

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

  return (
    <div className={s.page} lang={lang}>
      <TopBar
        kicker={stage}
        title={title}
        backHref="/app/cursos"
        progress={total ? doneN / total : 0}
        lang={lang}
        onLang={setLang}
        resumeHref={resumePath(slug)}
        t={t}
        row={
          <>
            <span>{t.mobHome(cur, total, filled.length, PAPER_KEYS.length)}</span>
            <Link href={resumePath(slug)}>
              <Ico n="doc" />
              {t.myResume}
            </Link>
          </>
        }
      />
      <div className={s.wrap}>
        <div className={s.main}>
          {notice}
          <section className={s.hero}>
            <div className={s.hgrid}>
              <div>
                <span className={s.kick}>
                  <Ico n="globe" />
                  {copy.kick}
                </span>
                <h1>
                  {copy.h1a} <em>{copy.h1b}</em>
                </h1>
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
                  <span>
                    <Ico n="doc" />
                    {copy.result}
                  </span>
                </div>
                <div className={s.hcta}>
                  <Link href={stepPath(slug, cur)} className={`${s.btn} ${s.btnG}`}>
                    <Ico n="play" />
                    {doneN === total ? t.review : t.continueStep(cur)}
                  </Link>
                  <Link href={resumePath(slug)} className={`${s.btn} ${s.btnO}`}>
                    <Ico n="eye" />
                    {t.seeResume}
                  </Link>
                </div>
              </div>
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
            </div>
          </section>

          <section className={s.sec}>
            <div className={s.sh}>
              <div className={s.ti}>
                <Ico n="target" />
              </div>
              <div>
                <small>{t.route}</small>
                <h2>{t.routeH(total)}</h2>
              </div>
            </div>
            <p className={s.intro}>{t.routeI}</p>
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

          {(tools || books.length > 0) && (
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
              {tools && (
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
        </aside>
      </div>
    </div>
  );
}
