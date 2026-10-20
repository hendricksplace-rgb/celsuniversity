"use client";

// One step of a guided course (cv-resume-mockup.html ?v=mod): hero, then up to five numbered parts (video, the
// essentials with the e-book reader's blocks, practice, "Construye tu resume", the 3 check questions) and
// Previous / Next. The step is complete when the 3 questions are answered (a step without questions: on open).
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ReaderBlock } from "@/components/reader/ReaderBlocks";
import { docModel, resumePath, splitTitle, stepPath, titlesOf, visibleSections, type GuidedStep, type Lang, type ResumeData, type StepState } from "@/lib/guided";
import { PracticeView, pickScore, practiceDone } from "./Practice";
import { BuildSection, type BuildCtx } from "./Build";
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
};

/** Wistia delivery links and direct .mp4 files play as a file (the same rule as the lesson player). */
const directMedia = (url: string | undefined) => (url && (/^https:\/\/embed-ssl\.wistia\.com\/deliveries\//.test(url) || /^https:\/\/[^\s?#]+\.mp4(?:[?#]|$)/i.test(url)) ? url : null);
const youtube = (id: string) => (/^[A-Za-z0-9_-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null);

export function GuidedStepView(p: StepPageProps) {
  const [lang, setLang] = useLang(p.defaultLang);
  const t = UI[lang];
  const step = p.steps[p.index]!;
  const n = step.step;
  const [toast, showToast] = useToast();
  const { data, set, update, state: save } = useResume(p.userId, p.resume);
  const [st, setSt] = useStepState(p.userId, p.moduleId, p.state);
  const [doneAt, setDoneAt] = useState(p.completedAt);
  const stRef = useRef(st);
  stRef.current = st;

  const parts = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    if (step.video?.media_url) out.push({ id: "vid", label: t.parts.vid });
    out.push({ id: "ess", label: t.parts.ess });
    if (step.practice) out.push({ id: "prac", label: t.parts.prac });
    out.push({ id: "build", label: t.parts.build });
    out.push({ id: "chk", label: step.check?.length ? t.parts.chk : t.partH.fin });
    return out;
  }, [step, t]);
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
  const answers = st.check ?? {};
  const allAnswered = checks.length > 0 && checks.every((_, i) => answers[i] !== undefined);
  useEffect(() => {
    if (allAnswered && !doneAt) void complete();
  }, [allAnswered, doneAt, complete]);

  const titles = useMemo(() => titlesOf(p.steps), [p.steps]);
  const verbs = useMemo(
    () => p.steps.flatMap((x) => x.essentials.flatMap((b) => (b.type === "phrases" ? b.items.map((i) => ({ es: i.es, en: i.en })) : []))).filter((v, i, a) => a.findIndex((y) => y.es === v.es) === i),
    [p.steps],
  );
  const hasAuto = step.build.sections.some((x) => x.type === "autocheck");
  const [fits, measure] = useFitsOnePage(docModel(data, "es"), "es");
  const ctx: BuildCtx = { data, set, update, save, steps: p.steps, titles, verbs, slug: p.slug, t, lang, fits };

  const prev = p.steps[p.index - 1];
  const next = p.steps[p.index + 1];
  const [h1a, h1b] = splitTitle(step.title);
  const kickWord = step.kicker.split("·").slice(1).join("·").trim() || step.title;
  const prac = step.practice;
  const pv = (st.practice ?? {}) as Record<string, unknown>;
  const sc = prac?.kind === "pick" ? pickScore(prac, pv) : null;
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
        <h4>
          <Ico n="doc" />
          {t.youBuild}
        </h4>
        <p>{t.youBuildP(step.builds)}</p>
        <Link href={resumePath(p.slug)} className={`${s.btn} ${s.btnG}`}>
          <Ico n="eye" />
          {t.seeResume}
        </Link>
      </div>
    </aside>
  );

  return (
    <div className={s.page} lang={lang}>
      <TopBar
        kicker={`${t.stepOf(n, step.of)} · ${kickWord.toUpperCase()}`}
        title={step.title}
        backHref={`/app/cursos/${p.slug}`}
        progress={progress}
        lang={lang}
        onLang={setLang}
        resumeHref={resumePath(p.slug)}
        t={t}
        row={
          <>
            <span aria-live="polite">{t.mobStep(cur + 1, parts.length, curPart.label)}</span>
            <Link href={resumePath(p.slug)}>
              <Ico n="doc" />
              {t.myResume}
            </Link>
          </>
        }
      />
      <div className={s.wrap}>
        <div className={s.main}>
          <section className={`${s.hero} ${s.heroStep}`}>
            <span className={s.kick}>
              <Ico n="brief" />
              {t.stepOf(n, step.of)}
            </span>
            <h1>
              {h1a} {h1b && <em>{h1b}</em>}
            </h1>
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

          {step.video?.media_url && (
            <section className={s.sec} id="vid">
              <Head n={partNo(parts, "vid")} small={t.parts.vid} h={t.partH.vid} />
              <div className={s.vid}>
                {directMedia(step.video.media_url) ? (
                  <video controls playsInline preload="metadata" src={directMedia(step.video.media_url)!} aria-label={step.title} />
                ) : (
                  <iframe src={step.video.media_url} title={step.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
                )}
              </div>
              <Keys keys={step.keys} />
            </section>
          )}

          <section className={s.sec} id="ess">
            <Head n={partNo(parts, "ess")} small={t.parts.ess} h={t.partH.ess} />
            {!step.video?.media_url && step.keys.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Keys keys={step.keys} first />
              </div>
            )}
            {step.essentials.map((b, i) => (
              <div className={`${s.card} ${s.ess}`} key={i} data-block={b.type}>
                <ReaderBlock block={b} value={st.ess?.[i]} onChange={(v) => setSt((x) => ({ ...x, ess: { ...(x.ess ?? {}), [i]: v } }))} t={p.readerT} />
              </div>
            ))}
            {step.more_video && youtube(step.more_video.id) && (
              <div className={`${s.card} ${s.more}`} data-block="more_video">
                <div className={s.moreHead}>
                  <div style={{ minWidth: 0 }}>
                    <p className={s.groupT} style={{ margin: 0 }}>
                      {t.moreVideo}
                    </p>
                    <h3 style={{ margin: "2px 0 0" }}>{step.more_video.title}</h3>
                    {step.more_video.channel && <p className={s.count}>{step.more_video.channel}</p>}
                  </div>
                  {step.more_video.lang && <span className={s.langChip}>{t.lang[step.more_video.lang] ?? step.more_video.lang.toUpperCase()}</span>}
                </div>
                <div className={s.vid}>
                  <iframe
                    src={youtube(step.more_video.id)!}
                    title={step.more_video.title}
                    allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </section>

          {prac && (
            <section className={s.sec} id="prac">
              <Head n={partNo(parts, "prac")} small={t.parts.prac} h={prac.title} />
              {(prac.intro || sc) && (
                <p className={s.intro}>
                  {prac.intro} {sc && sc.n > 0 && <span className={s.score}>{t.of(sc.right, prac.kind === "pick" ? prac.items.length : 0)}</span>}
                </p>
              )}
              <div data-practice={prac.kind}>
                <PracticeView p={prac} v={pv} set={(v) => setSt((x) => ({ ...x, practice: v }))} t={t} lang={lang} />
              </div>
            </section>
          )}

          <section className={s.sec} id="build">
            <Head n={partNo(parts, "build")} small={t.parts.build} h={step.build.title} />
            {step.build.intro && <p className={s.intro}>{step.build.intro}</p>}
            {visibleSections(step).map((x) => (
              <BuildSection key={x.key} sec={x} ctx={ctx} />
            ))}
            {hasAuto && measure}
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
                  <p>{t.stepDoneP}</p>
                </div>
                <Link href={resumePath(p.slug)} className={`${s.btn} ${s.btnG}`}>
                  <Ico n="eye" />
                  {t.seeResume}
                </Link>
              </div>
            ) : null}
            {!step.check?.length && step.finish && (
              <div className={s.done} data-done>
                <div className={s.seal}>
                  <Ico n="check" />
                </div>
                <div>
                  <h3>{step.finish.title}</h3>
                  <p>{step.finish.text}</p>
                </div>
                {step.finish.cta?.course && (
                  <Link href={`/app/cursos/${step.finish.cta.course}`} className={`${s.btn} ${s.btnG}`}>
                    {step.finish.cta.label}
                    <Ico n="right" />
                  </Link>
                )}
              </div>
            )}
          </section>

          <nav className={s.nav} aria-label={`${t.prev} / ${t.next}`}>
            <Link href={prev ? stepPath(p.slug, prev.step) : `/app/cursos/${p.slug}`} className={`${s.btn} ${s.btnO}`}>
              <Ico n="left" />
              <div>
                <small>{prev ? t.prev : t.back.toUpperCase()}</small>
                <span>{prev ? `${t.stepN(prev.step)} · ${prev.kicker.split("·").slice(1).join("·").trim() || prev.title}` : t.toCourse}</span>
              </div>
            </Link>
            <Link href={next ? stepPath(p.slug, next.step) : resumePath(p.slug)} className={`${s.btn} ${s.btnN} ${s.navNext}`}>
              <div>
                <small>{t.next}</small>
                <span>{next ? `${t.stepN(next.step)} · ${next.title}` : t.myResume}</span>
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

