"use client";

// One step of a guided course (cv-resume-mockup.html ?v=mod): hero, then up to five numbered parts (video, the
// essentials with the e-book reader's blocks, practice, "Construye tu resume", the 3 check questions) and
// Previous / Next. The step is complete when the 3 questions are answered (a step without questions: on open).
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { EssBlock, MoreVideos } from "./Essentials";
import { PRODUCT, docModel, productPath, stepPath, titlesOf, visibleSections, type GuidedStep, type GuidedTheme, type Lang, type MoreVideo, type ResumeData, type StepState } from "@/lib/guided";
import { PracticeView, pickScore, practiceDone, sortScore } from "./Practice";
import { BuildSection, type BuildCtx } from "./Build";
import { BudgetExample } from "./BuildFinance";
import { budgetTotals, money } from "@/lib/guided-finance";
import { useFitsOnePage } from "./ResumeDoc";
import { Ico, TopBar, UI, useLang, useResume, useStepState, useToast } from "./ui";
import s from "./guided.module.css";

export type StepPageProps = {
  userId: string;
  slug: string;
  courseTitle: string;
  stage: string;
  steps: GuidedStep[];
  index: number;
  moduleId: string;
  lessonIds: string[];
  completedAt: string | null;
  state: StepState;
  resume: ResumeData;
  readerT: Dictionary["reader"];
  defaultLang: Lang;
  theme: GuidedTheme;
};

/** Wistia delivery links and direct .mp4 files play as a file (the same rule as the lesson player). */
const directMedia = (url: string | undefined) => (url && (/^https:\/\/embed-ssl\.wistia\.com\/deliveries\//.test(url) || /^https:\/\/[^\s?#]+\.mp4(?:[?#]|$)/i.test(url)) ? url : null);

export function GuidedStepView(p: StepPageProps) {
  const [lang, setLang] = useLang(p.defaultLang);
  const t = UI[lang];
  const step = p.steps[p.index]!;
  const n = step.step;
  const [toast, showToast] = useToast();
  const { data, set, update, state: save } = useResume(p.userId, p.resume, PRODUCT[p.theme].table);
  const prodHref = productPath(p.slug, p.theme);
  const prodLabel = PRODUCT[p.theme].label[lang];
  const prodIcon = PRODUCT[p.theme].icon;
  const cover = p.theme === "interview";
  const fi = p.theme === "finanzas";
  const tn = p.theme === "visa_tn";
  const totals = useMemo(() => (fi ? budgetTotals(data, p.steps) : null), [fi, data, p.steps]);
  const screens = step.ebookScreens ?? [];
  const [st, setSt] = useStepState(p.userId, p.moduleId, p.state);
  const [doneAt, setDoneAt] = useState(p.completedAt);
  const stRef = useRef(st);
  stRef.current = st;

  const parts = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    out.push({ id: "vid", label: step.video?.media_url ? t.parts.vid : t.parts.nutshell });
    out.push({ id: "ess", label: t.parts.ess });
    if (step.practice) out.push({ id: "prac", label: t.parts.prac });
    out.push({ id: "build", label: PRODUCT[p.theme].build[lang] });
    out.push({ id: "chk", label: step.check?.length ? t.parts.chk : t.partH.fin });
    return out;
  }, [step, t, lang, p.theme]);
  const [cur, pct] = useScrollSpy(parts.map((x) => x.id));

  const complete = useCallback(async () => {
    if (doneAt) return;
    const now = new Date().toISOString();
    setDoneAt(now);
    const sb = createClient();
    await sb.from("guided_step_progress").upsert({ user_id: p.userId, module_id: p.moduleId, state: stRef.current as unknown as Json, completed_at: now, updated_at: now });
    // XP and streak the way other lessons count: the step's old lessons are finished with it.
    for (const id of p.lessonIds) await sb.rpc("record_lesson_progress", { p_lesson: id, p_finish: true });
    showToast(t.toastDone(n));
  }, [doneAt, p.userId, p.moduleId, p.lessonIds, showToast, t, n]);

  // Opening the step counts as studying today; a step with no questions is complete when opened.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (!step.check?.length) void complete();
    else if (p.lessonIds[0]) void createClient().rpc("record_lesson_progress", { p_lesson: p.lessonIds[0] });
  }, [complete, p.lessonIds, step.check]);

  const checks = step.check ?? [];
  const ended = !!st.ended;
  const answers = st.check ?? {};
  const allAnswered = checks.length > 0 && checks.every((_, i) => answers[i] !== undefined);
  useEffect(() => {
    if (allAnswered && !doneAt) void complete();
  }, [allAnswered, doneAt, complete]);

  const titles = useMemo(() => titlesOf(p.steps), [p.steps]);
  const verbs = useMemo(
    () => p.steps.flatMap((x) => (x.essentials ?? []).flatMap((b) => (b.type === "phrases" ? b.items.map((i) => ({ es: i.es, en: i.en })) : []))).filter((v, i, a) => a.findIndex((y) => y.es === v.es) === i),
    [p.steps],
  );
  const hasAuto = step.build.sections.some((x) => x.type === "autocheck");
  const [fits, measure] = useFitsOnePage(docModel(data, "es"), "es");
  const ctx: BuildCtx = { step, theme: p.theme, data, set, update, save, steps: p.steps, titles, verbs, slug: p.slug, t, lang, fits };
  const moreVideos: MoreVideo[] = [...(step.more_video ? [step.more_video] : []), ...(step.more_videos ?? [])];

  const prev = p.steps[p.index - 1];
  const next = p.steps[p.index + 1];
  const kickWord = step.kicker.split("·").slice(1).join("·").trim() || step.title;
  const prac = step.practice;
  const pv = (st.practice ?? {}) as Record<string, unknown>;
  const sc = prac?.kind === "pick" ? pickScore(prac, pv) : prac?.kind === "sort" ? sortScore(prac, pv) : null;
  const curPart = parts[cur] ?? parts[0]!;
  const progress = doneAt ? 1 : Math.max(pct, (parts.findIndex((x) => x.id === curPart.id) + (practiceDone(prac, pv) ? 0.5 : 0)) / (parts.length + 0.5));

  const rail = (
    <aside className={s.rail} aria-label={t.inStep}>
      <div className={s.box}>
        <h4>{t.inStep}</h4>
        <ul className={s.mini}>
          {parts.map((x, i) => {
            const state = doneAt || i < cur ? "done" : i === cur ? "cur" : "";
            return (
              <li key={x.id}>
                <a href={`#${x.id}`} className={state === "done" ? s.miniDone : state === "cur" ? s.miniCur : ""} aria-current={state === "cur" ? "step" : undefined}>
                  <i>{state === "done" ? "✓" : i + 1}</i>
                  {x.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={s.box}>
        {totals && totals.net > 0 ? (
          <>
            <h4>
              <Ico n="chart" />
              {totals.balance < 0 ? (lang === "es" ? "TE FALTA" : "SHORT BY") : lang === "es" ? "TE QUEDA" : "LEFT OVER"}
            </h4>
            <p>
              <b className={`${s.railBal} ${totals.balance < 0 ? s.neg : ""}`} data-rail-balance>
                {totals.balance < 0 ? "" : "+"}
                {money(totals.balance)}
              </b>
              <br />
              {lang === "es" ? "al mes, con tus números." : "a month, with your numbers."}
            </p>
          </>
        ) : (
          <>
            <h4>
              <Ico n={prodIcon} />
              {PRODUCT[p.theme].rail[lang]}
            </h4>
            <p>
              {step.builds}. {PRODUCT[p.theme].railP[lang]}
            </p>
          </>
        )}
        <Link href={prodHref} className={`${s.btn} ${s.btnG}`}>
          <Ico n="eye" />
          {PRODUCT[p.theme].see[lang]}
        </Link>
      </div>
      {PRODUCT[p.theme].privacy && (
        <div className={s.box}>
          <h4>
            <Ico n="lock" style={{ color: "var(--ok)" }} />
            {lang === "es" ? "PRIVADO" : "PRIVATE"}
          </h4>
          <p>{PRODUCT[p.theme].privacy![lang]}</p>
        </div>
      )}
    </aside>
  );

  return (
    <div className={`${s.page} ${cover ? s.thInterview : ""} ${fi ? s.thFinanzas : ""} ${tn ? s.thTn : ""}`} lang={lang}>
      <TopBar
        kicker={`${t.stepOf(n, step.of)} · ${kickWord.toUpperCase()}`}
        title={step.title}
        backHref={`/app/cursos/${p.slug}`}
        progress={progress}
        lang={lang}
        onLang={setLang}
        resumeHref={prodHref}
        productLabel={prodLabel}
        productIcon={prodIcon}
        t={t}
        row={
          <>
            <span aria-live="polite">{t.mobStep(cur + 1, parts.length, curPart.label)}</span>
            <Link href={prodHref}>
              <Ico n={prodIcon} />
              {prodLabel}
            </Link>
          </>
        }
      />
      <div className={s.wrap}>
        <div className={s.main}>
          <section className={`${s.hero} ${s.heroStep} ${cover ? s.heroCover : ""} ${fi ? s.heroFi : ""} ${tn ? s.heroTn : ""}`}>
            <span className={s.kick}>
              <Ico n={cover ? "chat" : fi ? "money" : tn ? "pass" : "brief"} />
              {t.stepOf(n, step.of)}
            </span>
            <h1>{step.title}</h1>
            <p>{step.intro}</p>
            <div className={s.chips}>
              <span>
                <Ico n="clock" />
                {t.min(step.minutes)}
              </span>
              <span>
                <Ico n="pen" />
                {t.builds(step.builds)}
              </span>
            </div>
          </section>

          <section className={s.sec} id="vid">
            <Head n={partNo(parts, "vid")} small={step.video?.media_url ? t.parts.vid : t.parts.nutshell} h={step.video?.media_url ? step.title : t.partH.nutshell} />
            {step.video?.media_url && <StepVideo url={step.video.media_url} title={step.title} n={n} minutes={step.minutes} />}
            {step.video_note && (
              <div className={s.gdisc} data-video-note>
                <Ico n="alert" />
                <div>{step.video_note}</div>
              </div>
            )}
            <Keys keys={step.keys} first={!step.video?.media_url} />
          </section>

          <section className={s.sec} id="ess">
            <Head n={partNo(parts, "ess")} small={t.parts.ess} h={screens[0]?.title ?? t.partH.ess} />
            {screens.length > 0 && (
              <p className={`${s.intro} ${s.introIco}`}>
                <Ico n="book" style={{ width: 16, height: 16 }} /> {step.ebookTitle
                  ? lang === "es"
                    ? `Del e-book «${step.ebookTitle}». Es el mismo texto que en Mis libros.`
                    : `From the e-book “${step.ebookTitle}”: the same text as in My books.`
                  : lang === "es"
                    ? "Del e-book de este curso. Es el mismo texto que en Mis libros."
                    : "From this course's e-book: the same text as in My books."}
              </p>
            )}
            {step.audio?.url && (
              <div className={`${s.gtip} ${s.gtipAct}`} data-step-audio>
                <span className={s.gi}>
                  <Ico n="vol" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{step.audio.title}</b>
                  <audio controls preload="none" src={step.audio.url} style={{ width: "100%", marginTop: 8 }} />
                </div>
              </div>
            )}
            {screens.map((sc, si) => (
              <div key={sc.id} className={s.essScr} data-screen={sc.id}>
                {(screens.length > 1 || sc.audio) && (
                  <h3 className={s.essScrH}>
                    {screens.length > 1 && (
                      <>
                        <span>{lang === "es" ? `PARTE ${si + 1}` : `PART ${si + 1}`}</span>
                        {sc.title}
                      </>
                    )}
                    {sc.audio && <Listen src={sc.audio} label={lang === "es" ? "Escuchar" : "Listen"} stop={lang === "es" ? "Pausa" : "Pause"} />}
                  </h3>
                )}
                {sc.blocks.map((b, i) => (
                  <div key={i} data-block={b.type}>
                    <EssBlock block={b} value={st.ess?.[`${si}.${i}`]} onChange={(v) => setSt((x) => ({ ...x, ess: { ...(x.ess ?? {}), [`${si}.${i}`]: v } }))} stepHref={(k) => stepPath(p.slug, k)} />
                  </div>
                ))}
              </div>
            ))}
            {step.example && totals && <BudgetExample ex={step.example} ctx={ctx} />}
            {(step.essentials ?? []).map((b, i) => (
              <div key={i} data-block={b.type}>
                <EssBlock block={b} value={st.ess?.[i]} onChange={(v) => setSt((x) => ({ ...x, ess: { ...(x.ess ?? {}), [i]: v } }))} stepHref={(k) => stepPath(p.slug, k)} />
              </div>
            ))}
            <MoreVideos list={moreVideos} />
          </section>

          {prac && (
            <section className={s.sec} id="prac">
              <Head n={partNo(parts, "prac")} small={t.parts.prac} h={prac.title} />
              {(prac.intro || sc) && (
                <p className={s.intro}>
                  {prac.intro} {sc && sc.n > 0 && <span className={s.score}>{t.of(sc.right, prac.kind === "pick" || prac.kind === "sort" ? prac.items.length : 0)}</span>}
                </p>
              )}
              <div data-practice={prac.kind}>
                <PracticeView p={prac} v={pv} set={(v) => setSt((x) => ({ ...x, practice: v }))} t={t} lang={lang} readerT={p.readerT} />
              </div>
            </section>
          )}

          <section className={s.sec} id="build">
            <Head n={partNo(parts, "build")} small={PRODUCT[p.theme].build[lang]} h={step.build.title} />
            {step.build.intro && <p className={s.intro}>{step.build.intro}</p>}
            {visibleSections(step).map((x) => (
              <BuildSection key={x.key} sec={x} ctx={ctx} />
            ))}
            {hasAuto && measure}
            {step.build.commitment && (
              <div className={s.card} data-commitment>
                <h3>{lang === "es" ? "Tu compromiso" : "Your commitment"}</h3>
                <div className={s.gquote} style={{ marginTop: 10 }}>
                  {step.build.commitment}
                </div>
              </div>
            )}
            {step.disclaimer && (
              <div className={s.gdisc}>
                <Ico n="shield" />
                <div>{step.disclaimer}</div>
              </div>
            )}
          </section>

          <section className={s.sec} id="chk">
            <Head n={partNo(parts, "chk")} small={step.check?.length ? t.parts.chk : t.partH.fin} h={step.check?.length ? t.partH.chk : (step.finish?.title ?? t.partH.fin)} />
            {checks.length > 0 && (
              <div className={s.drill}>
                {checks.map((m, i) => {
                  const ans = answers[i];
                  return (
                    <div className={s.dq} key={i} data-check={i}>
                      <div className={s.weak}>
                        <b style={{ margin: 0 }}>{m.q}</b>
                      </div>
                      <div className={s.dopts}>
                        {m.o.map((o, j) => {
                          const c = ans === undefined ? "" : j === m.a ? s.right : j === ans ? s.wrong : "";
                          return (
                            <button key={j} type="button" className={c} disabled={ans !== undefined} onClick={() => setSt((x) => ({ ...x, check: { ...(x.check ?? {}), [i]: j } }))}>
                              <i>{c === s.right ? "✓" : c === s.wrong ? "✗" : "ABC"[j]}</i>
                              {o}
                            </button>
                          );
                        })}
                      </div>
                      {ans !== undefined && (
                        <div className={s.dfb}>
                          {ans === m.a ? <b>{t.right} </b> : <b className={s.no}>{t.almost} </b>}
                          {m.why}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {(doneAt || allAnswered) && step.check?.length ? (
              <div className={s.done} data-done>
                <div className={s.seal}>
                  <Ico n="check" />
                </div>
                <div>
                  <h3>{t.stepDone(n)}</h3>
                  <p>{t.stepSaved(step.builds, prodLabel)}</p>
                </div>
                {next ? (
                  <Link href={stepPath(p.slug, next.step)} className={`${s.btn} ${s.btnG}`}>
                    {t.stepN(next.step)}
                    <Ico n="right" />
                  </Link>
                ) : (
                  <Link href={prodHref} className={`${s.btn} ${s.btnG}`}>
                    <Ico n="eye" />
                    {PRODUCT[p.theme].see[lang]}
                  </Link>
                )}
              </div>
            ) : null}
            {!step.check?.length &&
              (ended ? (
                step.finish && (
                  <div className={s.fin} data-done>
                    <div className={s.seal}>
                      <Ico n="check" />
                    </div>
                    <div>
                      <h3>{step.finish.title}</h3>
                      <p>{step.finish.text}</p>
                    </div>
                    {step.finish.cta?.view && (
                      <Link href={prodHref} className={`${s.btn} ${s.btnG}`}>
                        {step.finish.cta.label}
                        <Ico n="right" />
                      </Link>
                    )}
                    {step.finish.cta?.course && (
                      <Link href={`/app/cursos/${step.finish.cta.course}`} className={`${s.btn} ${s.btnG}`}>
                        {step.finish.cta.label}
                        <Ico n="right" />
                      </Link>
                    )}
                  </div>
                )
              ) : (
                <div className={s.card}>
                  <h3>{t.readyQ}</h3>
                  <p className={s.sub}>{t.readyP}</p>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnG}`}
                    data-action="end"
                    onClick={() => {
                      setSt((x) => ({ ...x, ended: true }));
                      showToast(t.courseDone);
                    }}
                  >
                    <Ico n="check" />
                    {t.endCourse}
                  </button>
                </div>
              ))}
          </section>

          <nav className={s.nav} aria-label={`${t.prev} / ${t.next}`}>
            <Link href={prev ? stepPath(p.slug, prev.step) : `/app/cursos/${p.slug}`} className={`${s.btn} ${s.btnO}`}>
              <Ico n="left" />
              <div>
                <small>{prev ? t.prev : t.back.toUpperCase()}</small>
                <span>{prev ? `${t.stepN(prev.step)} · ${prev.kicker.split("·").slice(1).join("·").trim() || prev.title}` : t.toCourse}</span>
              </div>
            </Link>
            <Link href={next ? stepPath(p.slug, next.step) : `/app/cursos/${p.slug}`} className={`${s.btn} ${s.btnN} ${s.navNext}`}>
              <div>
                <small>{next ? t.next : t.finished}</small>
                <span>{next ? `${t.stepN(next.step)} · ${next.title}` : t.backToCourse}</span>
              </div>
              <Ico n="right" />
            </Link>
          </nav>
        </div>
        {rail}
      </div>
      {toast}
    </div>
  );
}

const partNo = (parts: { id: string }[], id: string) => parts.findIndex((x) => x.id === id) + 1;

function Head({ n, small, h }: { n: number; small: string; h: string }) {
  return (
    <div className={s.sh}>
      <div className={s.ti}>{n}</div>
      <div style={{ minWidth: 0 }}>
        <small>{small.toUpperCase()}</small>
        <h2>{h}</h2>
      </div>
    </div>
  );
}

/** The step's video (Wistia delivery file or a direct .mp4), inline after a tap on the poster. */
function StepVideo({ url, title, n, minutes }: { url: string; title: string; n: number; minutes: number }) {
  const [play, setPlay] = useState(false);
  const file = directMedia(url);
  return (
    <div className={s.vid}>
      {play ? (
        file ? (
          <video controls autoPlay playsInline src={file} aria-label={title} />
        ) : (
          <iframe src={url} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        )
      ) : (
        <button type="button" className={s.vidBtn} onClick={() => setPlay(true)} aria-label="Reproducir el video" data-action="play">
          <span className={s.pl2}>
            <Ico n="play" />
          </span>
          <span className={s.vcap}>
            <b>Video del paso {n} · CelsGLOBAL</b>
            <span>{minutes} min en total</span>
          </span>
        </button>
      )}
    </div>
  );
}

function Keys({ keys, first }: { keys: { t: string; d: string }[]; first?: boolean }) {
  return (
    <div className={s.keys} style={first ? { marginTop: 0 } : undefined}>
      {keys.map((k, i) => (
        <div key={i}>
          <span className={s.keyN}>{i + 1}</span>
          <b>{k.t}</b>
          <p>{k.d}</p>
        </div>
      ))}
    </div>
  );
}

/** Scroll progress (0–1) and the current part: the last section whose top passed 35 % of the viewport. */
function useScrollSpy(ids: string[]) {
  const [cur, setCur] = useState(0);
  const [pct, setPct] = useState(0);
  const key = ids.join(",");
  useEffect(() => {
    const list = key.split(",");
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPct(max > 0 ? window.scrollY / max : 0);
      let c = 0;
      list.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) c = i;
      });
      if (max > 0 && window.scrollY >= max - 4) c = list.length - 1;
      setCur(c);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [key]);
  return [cur, pct] as const;
}


/** "▶ Escuchar": the e-book's narration of a screen (a signed URL), played in place. */
function Listen({ src, label, stop }: { src: string; label: string; stop: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => () => ref.current?.pause(), []);
  return (
    <button
      type="button"
      className={s.listen}
      aria-pressed={on}
      data-action="listen"
      onClick={() => {
        if (!ref.current) {
          ref.current = new Audio(src);
          ref.current.onended = () => setOn(false);
        }
        if (on) ref.current.pause();
        else void ref.current.play().catch(() => setOn(false));
        setOn(!on);
      }}
    >
      <Ico n={on ? "stop" : "vol"} />
      {on ? stop : label}
    </button>
  );
}
