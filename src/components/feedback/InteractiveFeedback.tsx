"use client";

// CelsBSNS Feedback & Progress → "Close your week" (celsu-celsbsns-feedback-brief.md, celsbsns-feedback-semana1-mockup):
// the week in numbers (read from what the other pages saved), the original self-evaluation and reflection questions,
// a confidence scale, the next week's preview, a goal and focus areas, the optional AI-practice card, and closing the
// week. Matt's decision: reflection only; nothing is sent to anyone and nothing is graded. weekly_reflections is
// owner-only. Closing marks the lesson complete through record_lesson_progress (finishLesson).
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { navTitle } from "@/lib/reading";
import { fmtTime } from "@/lib/video-task";
import { actionNote, type Answer, type FeedbackData, type Reflection, type WeekNumbers } from "@/lib/feedback";
import { writingDone } from "@/lib/writing";
import { dancing } from "@/components/bsns/fonts";
import { Icon, Layout, Pager, RailCard, RailSteps, ShellPage, StepHead, StepRowText, TopBar, goTo, shell as sh, useLangPref, useScrollSpy, type IconName, type Lang, type NavLink } from "@/components/bsns/shell";
import s from "./feedback.module.css";

type Props = {
  data: FeedbackData;
  lessonId: string;
  courseId: string;
  userId: string;
  backHref: string;
  prev: NavLink;
  nextWeekHref: string | null;
  capstoneHref: string;
  /** Week 10: where "Next" goes once the course is over (the Capstone page, where the course closes). */
  courseCloseHref?: string | null;
  numbers: WeekNumbers;
  reflection: Reflection;
  defaultLang: Lang;
};

const UI = {
  es: {
    kick: "FEEDBACK & PROGRESS",
    steps: ["Tu semana en números", "Autoevaluación", "Reflexión", "Lo que sigue"],
    step: "PASO",
    s1: "Tu semana en números",
    s1i: "Esto es lo que hiciste. La app lo registró por ti.",
    tiles: { read: "Lectura", write: "Writing", writeS: "Tu correo de presentación", res: "Research", resS: "2 presentaciones reales", vid: "Video", spk: "Speaking", spkS: (n: number) => `${n} situaciones`, com: "Tu compromiso" },
    signed: (d: string) => `Firmado el ${d}`,
    notes: "notas",
    phrases: "frases guardadas",
    tries: "intentos",
    words: "palabras",
    fin: "Terminado",
    rev: "Revisado",
    done: "Completado",
    pending: "Pendiente",
    goTask: "Ir a la tarea",
    capPart: "Capstone · Parte 1",
    s2: "Autoevaluación",
    s2i: "Lee cada frase y márcate con honestidad. Lo que la app ya registró aparece con una etiqueta verde.",
    auto: "La app lo registró",
    vocabChip: (n: number) => `${n} ${n === 1 ? "palabra" : "palabras"} de la semana`,
    yn: ["Sí", "Tal vez", "Aún no"],
    s3: "Reflexión",
    s3i: "Escribe en inglés o en español. Lo importante es que lo pienses.",
    noteOpt: "OPCIONAL",
    w1K: "SEMANA 1 VS. HOY",
    w1Conf: (a: number | null, b: number | null) => `Seguridad al hablar: ${a ?? "–"}/10 en la Semana 1 · ${b ?? "–"}/10 hoy`,
    w1Yes: (a: number, b: number, n: number) => `Respondiste “Sí” a ${a} de ${n} frases en la Semana 1 y a ${b} de ${n} hoy.`,
    w1None: "Cuando elijas tu número, lo verás junto al de tu Semana 1.",
    confQ: "¿Qué tan seguro te sientes hablando inglés en el trabajo, hoy?",
    confL: ["Nada seguro", "Muy seguro"],
    conf10: "Te lo volveremos a preguntar en la Semana 10 para que veas tu avance.",
    s4: "Lo que sigue",
    weekK: (n: number) => `SEMANA ${n}`,
    finalK: "CIERRE DEL CURSO",
    goalL: (n: number) => `MI META PARA LA SEMANA ${n}`,
    goalFinal: "MI META DESPUÉS DEL CURSO",
    goalPh: "Ej.: practicar 10 minutos de speaking cada día",
    focusL: "LO QUE MÁS QUIERO MEJORAR",
    exT: "Práctica extra con un asistente de voz (opcional)",
    exS: "Practica tu presentación con ChatGPT en modo de voz",
    copied: "Copiado",
    copyAria: (p: string) => `Copiar: ${p}`,
    finish: (n: number) => `Cerrar mi semana ${n}`,
    finishing: "Guardando…",
    finN: (k: number, n: number | null) => `Responde la autoevaluación (${k}) y escribe tu meta ${n === null ? "después del curso" : `para la semana ${n}`}.`,
    finOk: "¡Listo para cerrar tu semana!",
    doneK: (n: number) => `SEMANA ${n} COMPLETA`,
    doneH: "¡Terminaste tu primera semana!",
    doneHn: (n: number) => `¡Terminaste tu semana ${n}!`,
    doneHf: "¡Terminaste las 10 semanas!",
    doneP: (n: number) => `Diste el primer paso de tu Capstone y practicaste las 4 habilidades. Tu meta para la semana ${n}:`,
    donePn: (n: number) => `Avanzaste en tu Capstone y practicaste las 4 habilidades. Tu meta para la semana ${n}:`,
    donePf: "Practicaste las 4 habilidades durante 10 semanas. Lo que sigue: tu entrevista en vivo y tu certificado. Tu meta:",
    closeCta: "Ir a mi Capstone",
    goNext: (n: number) => `Ir a la Semana ${n}`,
    seeCap: "Ver mi Capstone",
    wk: "SEM",
    routeAria: "Tu ruta de 10 semanas",
    rail: "TU AVANCE",
    privH: "SOLO PARA TI",
    privP: "Tus respuestas son privadas. Te las mostraremos otra vez en la Semana 10 para que compares.",
    week: (n: number) => `Semana ${n}`,
    close: "Cierre del curso",
    err: "No se pudo guardar. Revisa tu conexión.",
    chipsAria: "Detalles",
  },
  en: {
    kick: "FEEDBACK & PROGRESS",
    steps: ["Your week in numbers", "Self-evaluation", "Reflection", "What's next"],
    step: "STEP",
    s1: "Your week in numbers",
    s1i: "This is what you did. The app tracked it for you.",
    tiles: { read: "Reading", write: "Writing", writeS: "Your introduction email", res: "Research", resS: "2 real introductions", vid: "Video", spk: "Speaking", spkS: (n: number) => `${n} situations`, com: "Your commitment" },
    signed: (d: string) => `Signed on ${d}`,
    notes: "notes",
    phrases: "saved phrases",
    tries: "tries",
    words: "words",
    fin: "Finished",
    rev: "Reviewed",
    done: "Complete",
    pending: "Pending",
    goTask: "Go to the task",
    capPart: "Capstone · Part 1",
    s2: "Self-evaluation",
    s2i: "Read each statement and mark yourself honestly. Anything the app already tracked shows a green tag.",
    auto: "Tracked by the app",
    vocabChip: (n: number) => `${n} Week 1 ${n === 1 ? "word" : "words"}`,
    yn: ["Yes", "Maybe", "Not yet"],
    s3: "Reflection",
    s3i: "Write in English or Spanish. What matters is that you think about it.",
    noteOpt: "OPTIONAL",
    w1K: "WEEK 1 VS. TODAY",
    w1Conf: (a: number | null, b: number | null) => `Confidence speaking: ${a ?? "–"}/10 in Week 1 · ${b ?? "–"}/10 today`,
    w1Yes: (a: number, b: number, n: number) => `You answered “Yes” to ${a} of ${n} statements in Week 1 and to ${b} of ${n} today.`,
    w1None: "Once you pick your number, you'll see it next to your Week 1 one.",
    confQ: "How confident do you feel speaking English at work, today?",
    confL: ["Not confident", "Very confident"],
    conf10: "We'll ask again in Week 10 so you can see your progress.",
    s4: "What's next",
    weekK: (n: number) => `WEEK ${n}`,
    finalK: "COURSE CLOSE",
    goalL: (n: number) => `MY GOAL FOR WEEK ${n}`,
    goalFinal: "MY GOAL AFTER THE COURSE",
    goalPh: "E.g. practice speaking 10 minutes every day",
    focusL: "WHAT I MOST WANT TO IMPROVE",
    exT: "Extra practice with a voice assistant (optional)",
    exS: "Practice your introduction with ChatGPT in voice mode",
    copied: "Copied",
    copyAria: (p: string) => `Copy: ${p}`,
    finish: (n: number) => `Close my Week ${n}`,
    finishing: "Saving…",
    finN: (k: number, n: number | null) => `Answer the self-evaluation (${k}) and write your goal ${n === null ? "for after the course" : `for Week ${n}`}.`,
    finOk: "Ready to close your week!",
    doneK: (n: number) => `WEEK ${n} COMPLETE`,
    doneH: "You finished your first week!",
    doneHn: (n: number) => `You finished Week ${n}!`,
    doneHf: "You finished all 10 weeks!",
    doneP: (n: number) => `You took the first step of your Capstone and practiced all 4 skills. Your goal for Week ${n}:`,
    donePn: (n: number) => `You moved your Capstone forward and practiced all 4 skills. Your goal for Week ${n}:`,
    donePf: "You practiced all 4 skills for 10 weeks. What's next: your live interview and your certificate. Your goal:",
    closeCta: "Go to my Capstone",
    goNext: (n: number) => `Go to Week ${n}`,
    seeCap: "See my Capstone",
    wk: "WK",
    routeAria: "Your 10-week route",
    rail: "YOUR PROGRESS",
    privH: "JUST FOR YOU",
    privP: "Your answers are private. We'll show them to you again in Week 10 so you can compare.",
    week: (n: number) => `Week ${n}`,
    close: "Course close",
    err: "Couldn't save. Check your connection.",
    chipsAria: "About this page",
  },
};
type UIT = (typeof UI)["es"];
const IDS = ["f0", "f1", "f2", "f3"];
const Q_COLORS = ["#2C6BC4", "#1F7A4D", "#C98A00", "#7A4FD6", "#C2185B", "#007E98"];

export function InteractiveFeedback(p: Props) {
  const { data, numbers: N } = p;
  const [lang, chooseLang] = useLangPref(p.userId, p.defaultLang);
  const t = UI[lang];
  const final = !!data.next.final;
  const note = actionNote(data);
  const nq = data.questions.length;
  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const db = useCallback(() => (sb.current ??= createClient()), []);
  const [saveError, setSaveError] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    void db().rpc("record_lesson_progress", { p_lesson: p.lessonId, p_finish: false }).then(() => undefined);
  }, [db, p.lessonId]);

  // ---------- the reflection (owner only), saved as a draft while the student goes ----------
  const [ev, setEv] = useState<(Answer | null)[]>(p.reflection.self_eval);
  const [answers, setAnswers] = useState<string[]>(p.reflection.answers);
  const [conf, setConf] = useState<number | null>(p.reflection.confidence);
  const [goal, setGoal] = useState(p.reflection.next_goal);
  const [focus, setFocus] = useState<number[]>(p.reflection.focus);
  const [completedAt, setCompletedAt] = useState(p.reflection.completed_at);
  const latest = useRef({ ev, answers, conf, goal, focus });
  latest.current = { ev, answers, conf, goal, focus };
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useCallback(
    async (extra: { completed_at?: string } = {}) => {
      clearTimeout(timer.current);
      timer.current = undefined;
      const v = latest.current;
      const allEv = v.ev.every((x) => x !== null);
      const { error } = await db()
        .from("weekly_reflections")
        .upsert(
          {
            user_id: p.userId,
            course_id: p.courseId,
            week: data.week,
            // The column only takes complete answers (0/1/2), so it's saved once all statements are answered.
            self_eval: allEv ? (v.ev as number[]) : [],
            answers: v.answers.map((a) => a.slice(0, 2000)),
            confidence: v.conf,
            next_goal: v.goal.slice(0, 300),
            focus: v.focus.map((i) => data.focus_options.en[i]).filter(Boolean),
            updated_at: new Date().toISOString(),
            ...extra,
          },
          { onConflict: "user_id,course_id,week" },
        );
      setSaveError(!!error);
      return !error;
    },
    [db, p.userId, p.courseId, data.week, data.focus_options.en],
  );
  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 700);
  }, [save]);
  useEffect(() => {
    const flush = () => {
      if (timer.current) void save();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [save]);

  const [extraOpen, setExtraOpen] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const copy = async (j: number) => {
    try {
      await navigator.clipboard.writeText(data.ai_practice.prompts[j]);
    } catch {
      /* clipboard blocked: the text is on screen */
    }
    setCopied(j);
  };

  const evDone = ev.every((x) => x !== null);
  const canClose = evDone && goal.trim().length > 2;
  const [closing, setClosing] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);
  const close = async () => {
    if (!canClose || closing) return;
    setClosing(true);
    const now = new Date().toISOString();
    if (await save({ completed_at: now })) {
      await finishLesson(db(), p.userId, p.lessonId);
      setCompletedAt(now);
      requestAnimationFrame(() => doneRef.current?.focus());
    }
    setClosing(false);
  };

  const { current } = useScrollSpy(IDS);
  const seen = [current > 0 || !!completedAt, evDone, answers.some((a) => a.trim()) || conf !== null, !!completedAt];
  const progress = completedAt ? 1 : Math.min(0.95, 0.15 + ev.filter((x) => x !== null).length * 0.07 + (goal.trim() ? 0.2 : 0));
  const autoOk = (k: FeedbackData["statements"][number]["auto"]) =>
    k === "writing" ? writingDone(N.writing.status) : k === "video" ? N.video.done : k === "speaking" ? N.speaking.done : k === "research" ? N.research.done : false;
  const nextN = data.next.week;
  const w1 = data.week === 1;
  const fmtDate = (iso: string | null) => (iso && mounted ? new Date(iso).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short" }) : "");
  // Next: week N+1, or, after week 10, the course close.
  const nextLink: NavLink = final ? (p.courseCloseHref ? { title: t.close, href: p.courseCloseHref } : null) : p.nextWeekHref ? { title: t.week(nextN), href: p.nextWeekHref } : null;
  const writingOk = writingDone(N.writing.status);

  return (
    <ShellPage lang={lang} className={`${s.root} ${dancing.variable}`}>
      <TopBar
        week={data.week}
        kind="FEEDBACK & PROGRESS"
        title={`${data.hero.title_a[lang]} ${data.hero.title_b[lang]}`}
        backHref={p.backHref}
        lang={lang}
        onLang={chooseLang}
        progress={progress}
        row={<StepRowText lang={lang} n={current + 1} total={IDS.length} name={t.steps[current]} />}
      />
      <Layout
        railLabel={t.rail}
        main={
          <>
            <section className={sh.hero} aria-labelledby="fb-title">
              <p className={sh.pill}>
                <Icon name="chart" size={16} />
                {t.kick}
              </p>
              <h1 id="fb-title" className={sh.heroTitle}>
                {data.hero.title_a[lang]} <em>{data.hero.title_b[lang]}</em>
              </h1>
              <p className={sh.heroIntro}>{lang === "es" ? data.hero.intro_es : data.hero.intro_en}</p>
              <ul className={sh.chips} aria-label={t.chipsAria}>
                {(lang === "es" ? data.hero.chips_es : data.hero.chips_en).map((chip, i) => (
                  <li key={chip}>
                    <Icon name={(["clock", "compass", "lock"] as const)[i] ?? "doc"} size={18} />
                    {chip}
                  </li>
                ))}
              </ul>
              <div className={s.priv}>
                <span className={s.privI}>
                  <Icon name="lock" size={20} />
                </span>
                <p>
                  <strong>{data.hero.priv_b[lang]}</strong> {data.hero.priv_p[lang]}
                </p>
              </div>
            </section>

            {/* ---------- step 1: the week in numbers ---------- */}
            <section id="f0" className={sh.step} aria-labelledby="fb-s1">
              <StepHead kicker={`${t.step} 1`} icon="chart" id="fb-s1" title={t.s1} />
              <p className={sh.intro}>{t.s1i}</p>
              <ul className={s.wk}>
                <Tile icon="book" title={t.tiles.read} sub={N.reading.title.replace(/\s*\(.*\)$/, "")} ok={N.reading.done} t={t} href={N.reading.href}>
                  <p className={s.big}>
                    {N.reading.notes}
                    <span>{t.notes}</span>
                  </p>
                  {N.reading.done && <span className={`${s.pill2} ${s.pOk}`}>✓ {t.done}</span>}
                </Tile>
                <Tile icon="mail" title={t.tiles.write} sub={w1 || !N.writing.title ? t.tiles.writeS : N.writing.title} ok={writingOk} t={t} href={N.writing.href}>
                  {N.writing.status !== "none" && (
                    <p className={s.big}>
                      {N.writing.words}
                      <span>{t.words}</span>
                    </p>
                  )}
                  {writingOk && <span className={`${s.pill2} ${s.pOk}`}>✓ {N.writing.status === "reviewed" ? t.rev : t.fin}</span>}
                </Tile>
                <Tile icon="search" title={t.tiles.res} sub={w1 || !N.research.title ? t.tiles.resS : N.research.title} ok={N.research.done} t={t} href={N.research.href}>
                  <p className={s.big}>
                    {N.research.phrases}
                    <span>{t.phrases}</span>
                  </p>
                  {N.research.done && <span className={`${s.pill2} ${s.pOk}`}>✓ {t.done}</span>}
                </Tile>
                <Tile icon="video" title={t.tiles.vid} sub={N.video.title.replace(/\s*\(.*\)$/, "")} ok={N.video.done} t={t} href={N.video.href}>
                  {N.video.done && (
                    <div className={s.thumb}>
                      {N.video.thumbUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL
                        <img src={N.video.thumbUrl} alt="" />
                      )}
                      {N.video.duration != null && <b>{fmtTime(N.video.duration)}</b>}
                    </div>
                  )}
                </Tile>
                <Tile icon="mic" title={t.tiles.spk} sub={t.tiles.spkS(N.speaking.situations)} ok={N.speaking.done} t={t} href={N.speaking.href}>
                  <p className={s.big}>
                    {N.speaking.tries}
                    <span>{t.tries}</span>
                  </p>
                  {N.speaking.quote && (
                    <p className={s.quote} lang="en">
                      “{N.speaking.quote}”
                    </p>
                  )}
                </Tile>
                <Tile
                  icon="sign"
                  gold
                  title={t.tiles.com}
                  sub={N.commitment.signedAt ? t.signed(fmtDate(N.commitment.signedAt)) : ""}
                  ok={!!N.commitment.name}
                  t={t}
                  href={N.commitment.href}
                >
                  {N.commitment.name && (
                    <>
                      <p className={s.sig}>{N.commitment.name}</p>
                      <span className={`${s.pill2} ${s.pGold}`}>
                        <Icon name="trophy" size={13} /> {t.capPart}
                      </span>
                    </>
                  )}
                </Tile>
              </ul>
            </section>

            {/* ---------- step 2: self-evaluation ---------- */}
            <section id="f1" className={sh.step} aria-labelledby="fb-s2">
              <StepHead kicker={`${t.step} 2`} icon="list" id="fb-s2" title={t.s2} />
              <p className={sh.intro}>{t.s2i}</p>
              <div className={sh.card}>
                <ul className={s.ev}>
                  {data.statements.map((st, i) => (
                    <li key={i} className={s.evr}>
                      <p id={`fb-ev-${i}`}>
                        {st[lang]}
                        {st.auto && autoOk(st.auto) && (
                          <small className={s.autoTag}>
                            <Icon name="check" size={12} />
                            {t.auto}
                          </small>
                        )}
                        {st.vocab && (
                          <small className={s.vocabTag}>
                            <Icon name="book" size={12} />
                            {t.vocabChip(N.vocabUsed)}
                          </small>
                        )}
                      </p>
                      <div className={s.seg} role="radiogroup" aria-labelledby={`fb-ev-${i}`}>
                        {t.yn.map((y, v) => (
                          <button
                            key={v}
                            type="button"
                            role="radio"
                            aria-checked={ev[i] === v}
                            data-v={v}
                            onClick={() => {
                              setEv((cur) => cur.map((x, k) => (k === i ? (v as Answer) : x)));
                              schedule();
                            }}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* ---------- step 3: reflection ---------- */}
            <section id="f2" className={sh.step} aria-labelledby="fb-s3">
              <StepHead kicker={`${t.step} 3`} icon="pen" id="fb-s3" title={t.s3} />
              <p className={sh.intro}>{t.s3i}</p>
              {data.answer_hint && <p className={`${sh.intro} ${s.hint}`}>{data.answer_hint[lang]}</p>}
              <div className={sh.card}>
                {data.questions.map((q, i) => (
                  <div key={i} className={s.grp}>
                    <label htmlFor={`fb-q-${i}`}>
                      <i style={{ "--c": Q_COLORS[i] } as React.CSSProperties} aria-hidden>
                        {i + 1}
                      </i>
                      {q[lang]}
                    </label>
                    <textarea
                      id={`fb-q-${i}`}
                      className={s.inp}
                      value={answers[i]}
                      maxLength={2000}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAnswers((cur) => cur.map((x, k) => (k === i ? v : x)));
                        schedule();
                      }}
                    />
                  </div>
                ))}
                {note && (
                  <div className={`${s.grp} ${s.note}`}>
                    <label htmlFor="fb-note">
                      <i style={{ "--c": "#C98A00" } as React.CSSProperties} aria-hidden>
                        <Icon name="pen" size={14} />
                      </i>
                      <span>
                        <b>{note.title[lang]}</b> <span className={s.optB}>{t.noteOpt}</span>
                        <br />
                        {note.prompt[lang]}
                      </span>
                    </label>
                    {note.examples.length > 0 && (
                      <ul className={s.noteEx}>
                        {note.examples.map((x) => (
                          <li key={x.en}>
                            <span lang="en">“{x.en}”</span>
                            {lang === "es" && x.es && x.es !== x.en && <small>{x.es}</small>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <textarea
                      id="fb-note"
                      className={s.inp}
                      value={answers[nq] ?? ""}
                      maxLength={2000}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAnswers((cur) => cur.map((x, k) => (k === nq ? v : x)));
                        schedule();
                      }}
                    />
                  </div>
                )}
                <div className={s.conf} role="group" aria-labelledby="fb-conf">
                  <p id="fb-conf">{t.confQ}</p>
                  <div className={s.scale}>
                    {Array.from({ length: 10 }, (_, k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={conf === k + 1}
                        data-fill={conf !== null && k + 1 < conf ? "" : undefined}
                        onClick={() => {
                          setConf(k + 1);
                          schedule();
                        }}
                      >
                        {k + 1}
                      </button>
                    ))}
                  </div>
                  <p className={s.ends} aria-hidden>
                    <span>{t.confL[0]}</span>
                    <span>{t.confL[1]}</span>
                  </p>
                  {N.week1 ? (
                    <div className={s.w1cmp}>
                      <p className={s.w1K}>{t.w1K}</p>
                      <p>{conf === null && N.week1.confidence === null ? t.w1None : t.w1Conf(N.week1.confidence, conf)}</p>
                      {N.week1.yes !== null && evDone && <p>{t.w1Yes(N.week1.yes, ev.filter((x) => x === 0).length, N.week1.of)}</p>}
                    </div>
                  ) : (
                    data.week < 10 && (
                      <p className={s.w10}>
                        <Icon name="flag" size={14} /> {t.conf10}
                      </p>
                    )
                  )}
                </div>
              </div>
            </section>

            {/* ---------- step 4: what's next ---------- */}
            <section id="f3" className={sh.step} aria-labelledby="fb-s4">
              <StepHead kicker={`${t.step} 4`} icon="compass" id="fb-s4" title={t.s4} />
              <div className={sh.card}>
                {completedAt ? (
                  <div className={s.findone} ref={doneRef} tabIndex={-1} role="status">
                    <span className={s.seal} aria-hidden>
                      <svg viewBox="0 0 24 24" width="46" height="46">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <p className={s.doneK}>{t.doneK(data.week)}</p>
                    <h3 className={s.doneH}>{final ? t.doneHf : data.week === 1 ? t.doneH : t.doneHn(data.week)}</h3>
                    <p className={s.doneP}>
                      {final ? t.donePf : w1 ? t.doneP(nextN) : t.donePn(nextN)} <strong>“{goal}”</strong>
                    </p>
                    <ol className={s.route} aria-label={t.routeAria} style={{ "--done": `${((data.week - 0.5) / 10) * 90}%` } as React.CSSProperties}>
                      {Array.from({ length: 10 }, (_, k) => {
                        const kind = k + 1 <= data.week ? "d" : k + 1 === nextN && !final ? "n" : k === 9 ? "c" : undefined;
                        return (
                          <li key={k} data-k={kind} aria-current={k + 1 === nextN && !final ? "step" : undefined}>
                            <i aria-hidden>{kind === "d" ? "✓" : k === 9 ? "★" : k + 1}</i>
                            <span>
                              {t.wk} {k + 1}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    {final && <NextCard data={data} lang={lang} t={t} final />}
                    <div className={s.acts}>
                      {!final && p.nextWeekHref && (
                        <Link href={p.nextWeekHref} className={s.btnP}>
                          {t.goNext(nextN)}
                          <Icon name="next" size={18} />
                        </Link>
                      )}
                      <Link href={p.capstoneHref} className={s.btnO}>
                        <Icon name="trophy" size={18} />
                        {t.seeCap}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={s.next2}>
                      <NextCard data={data} lang={lang} t={t} final={final} />
                      <div>
                        <label htmlFor="fb-goal" className={s.lab}>
                          {final ? t.goalFinal : t.goalL(nextN)}
                        </label>
                        <input
                          id="fb-goal"
                          className={s.inp}
                          value={goal}
                          maxLength={300}
                          placeholder={t.goalPh}
                          required
                          onChange={(e) => {
                            setGoal(e.target.value);
                            schedule();
                          }}
                        />
                        <div className={s.gchips}>
                          {data.goal_suggestions[lang].map((g) => (
                            <button
                              key={g}
                              type="button"
                              aria-pressed={goal === g}
                              onClick={() => {
                                setGoal(g);
                                schedule();
                              }}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        <p className={s.lab} id="fb-focus">
                          {t.focusL}
                        </p>
                        <div className={s.gchips} role="group" aria-labelledby="fb-focus">
                          {data.focus_options[lang].map((f, k) => (
                            <button
                              key={k}
                              type="button"
                              aria-pressed={focus.includes(k)}
                              onClick={() => {
                                setFocus((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k].sort()));
                                schedule();
                              }}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className={s.extra} data-open={extraOpen || undefined}>
                      <button type="button" aria-expanded={extraOpen} aria-controls="fb-extra" onClick={() => setExtraOpen((v) => !v)}>
                        <span className={s.ei}>
                          <Icon name="spark" size={20} />
                        </span>
                        <span>
                          <b>{t.exT}</b>
                          <span className={s.exS}>{t.exS}</span>
                        </span>
                        <Icon name="chev" size={20} className={s.chev} />
                      </button>
                      {extraOpen && (
                        <ol id="fb-extra" className={s.eb}>
                          {data.ai_practice.steps[lang].map((st, k) => (
                            <li key={k} className={s.estep}>
                              <i aria-hidden>{k + 1}</i>
                              <div>
                                {st}
                                {k === data.ai_practice.steps[lang].length - 1 && (
                                  <div className={s.prompts}>
                                    {data.ai_practice.prompts.map((pr, j) => (
                                      <button key={j} type="button" data-ok={copied === j || undefined} onClick={() => void copy(j)} aria-label={t.copyAria(pr)} lang="en">
                                        <Icon name={copied === j ? "check" : "copy"} size={16} />
                                        <span>“{pr}”</span>
                                        {copied === j && <span className={sh.sr}> {t.copied}</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                          <li className={s.etip}>{data.ai_practice.tip[lang]}</li>
                        </ol>
                      )}
                    </div>
                    <div className={s.finish}>
                      <button type="button" className={s.btnP} disabled={!canClose || closing} onClick={() => void close()}>
                        <Icon name="flag" size={18} />
                        {closing ? t.finishing : t.finish(data.week)}
                      </button>
                      <p aria-live="polite">{canClose ? t.finOk : t.finN(data.statements.length, final ? null : nextN)}</p>
                    </div>
                  </>
                )}
                {saveError && (
                  <p className={s.err} role="alert">
                    {t.err}
                  </p>
                )}
              </div>
            </section>

            <Pager lang={lang} prev={p.prev} next={nextLink} label={(x) => navTitle(x, lang)} />
          </>
        }
        rail={
          <>
            <RailCard title={t.rail}>
              <RailSteps steps={t.steps} current={current} done={(i) => seen[i]} onGo={(i) => goTo(IDS[i])} />
            </RailCard>
            <RailCard title={t.privH}>
              <p className={s.privP}>{t.privP}</p>
            </RailCard>
          </>
        }
      />
    </ShellPage>
  );
}

/** The next week's preview, or (week 10, `next.final`) the course close: the live mock interview and the certificate. */
function NextCard({ data, lang, t, final }: { data: FeedbackData; lang: Lang; t: UIT; final: boolean }) {
  return (
    <div className={s.w2} data-final={final || undefined}>
      <p className={s.w2k}>
        {final && <Icon name="trophy" size={14} />} {final ? t.finalK : t.weekK(data.next.week)}
      </p>
      <h3 lang="en">{data.next.title}</h3>
      <ul>
        {data.next.bullets[lang].map((b) => (
          <li key={b}>
            <Icon name="check" size={17} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className={s.cap}>
        <Icon name="trophy" size={17} />
        {data.next.capstone[lang]}
      </p>
    </div>
  );
}

function Tile({
  icon,
  title,
  sub,
  ok,
  wait,
  gold,
  t,
  href,
  children,
}: {
  icon: IconName;
  title: string;
  sub: string;
  ok: boolean;
  wait?: boolean;
  gold?: boolean;
  t: UIT;
  href: string | null;
  children: React.ReactNode;
}) {
  const pending = !ok && !wait;
  return (
    <li className={s.tile}>
      <div className={s.top2}>
        <span className={s.ic} data-gold={gold || undefined}>
          <Icon name={icon} size={20} />
        </span>
        <h3>
          {title}
          {sub && <small>{sub}</small>}
        </h3>
      </div>
      <span className={s.st} data-k={ok ? "ok" : "wait"} aria-label={ok ? t.done : t.pending} role="img">
        <Icon name={ok ? "check" : "clock"} size={15} />
      </span>
      {children}
      {pending && (
        <>
          <span className={`${s.pill2} ${s.pWait}`}>{t.pending}</span>
          {href && (
            <Link href={href} className={s.goTask}>
              {t.goTask}
              <Icon name="next" size={14} />
              <span className={sh.sr}> · {title}</span>
            </Link>
          )}
        </>
      )}
    </li>
  );
}
