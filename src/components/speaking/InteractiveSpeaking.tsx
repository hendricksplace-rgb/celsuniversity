"use client";

// CelsBSNS Speaking Practice (celsu-celsbsns-speaking-brief.md, celsbsns-speaking-semana1-mockup.html): 3 or 4 situations,
// practice out loud, see the transcript of what you said, check the 3 points yourself, keep your best try.
// Matt's decisions: no AI feedback, no coach review, no grade. Audio is NEVER stored (not in Storage, IndexedDB or
// localStorage). The browser's Web Speech API gives the live words; only where it's missing, the audio of one try is
// sent in memory to the transcribe-speech Edge Function, which returns {text} and keeps nothing. Tries live in page
// state; only the rep counts (speaking_progress) and the text of the best try (speaking_best) are saved.
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { usePageLeave, useVoiceCapture, type VoiceResult } from "@/lib/voice";
import { navTitle } from "@/lib/reading";
import { countWordsSimple, fmtSecs, maxMerge, repsNeeded, vocabCount, vocabRegex, type SpeakingBest, type SpeakingData, type SpeakingExercise, type VocabWord } from "@/lib/speaking";
import { Icon, Layout, Pager, RailCard, RailSteps, ShellPage, StepHead, StepRowText, TopBar, goTo, iconOr, shell as sh, useLangPref, useScrollSpy, type Lang, type NavLink } from "@/components/bsns/shell";
import s from "./speaking.module.css";

type Props = {
  data: SpeakingData;
  lessonId: string;
  userId: string;
  backHref: string;
  prev: NavLink;
  next: NavLink;
  vocab: VocabWord[];
  best: SpeakingBest[];
  reps: number[];
  partner: number[];
  completedAt: string | null;
  defaultLang: Lang;
  /** false for drafts and teacher-only lessons (staff previews): nothing goes to record_lesson_progress. */
  track?: boolean;
};
type Try = { text: string; dur: number; self: number[]; manual?: boolean; failed?: boolean };

const UI = {
  es: {
    kick: "SPEAKING PRACTICE",
    first: "Antes de empezar",
    last: "Cierre",
    exStep: (n: number, kind: string) => `Ejercicio ${n} · ${kind}`,
    kinds: { zoom: "Zoom", meeting: "Reunión", elevator: "Elevador" } as Record<string, string>,
    s0k: "ANTES DE EMPEZAR",
    s0: "Cómo practicar",
    vocH: (w: number) => `TU VOCABULARIO DE LA SEMANA ${w}`,
    exk: (n: number) => `EJERCICIO ${n}`,
    scK: "LA SITUACIÓN",
    say: "DI ESTO",
    prompts: "PARA EMPEZAR LA CONVERSACIÓN",
    dont: "No digas",
    doSay: "Mejor di",
    model: "FRASE MODELO",
    reps: (a: number, b: number) => `${a} de ${b}`,
    pk: "PRACTICA",
    tapMic: "Toca el micrófono y habla en inglés. Toca otra vez para terminar.",
    listening: "Escuchando…",
    transcribing: "Convirtiendo tu voz en texto…",
    saving: "Guardando…",
    opening: "Abriendo el micrófono…",
    micStart: "Grabar",
    micStop: "Terminar",
    limit: (a: number, b: number) => `Meta: ${a}–${b} s`,
    manualP: "¿Practicaste sin grabar, frente al espejo o con alguien?",
    manualB: "Lo hice sin grabar",
    att: (n: number) => `INTENTO ${n}`,
    heard: "LO QUE DIJISTE",
    noText: "No escuchamos nada. Revisa tu micrófono e inténtalo otra vez.",
    failed: "No pudimos convertir tu voz en texto esta vez. Escribe lo que dijiste o usa “Lo hice sin grabar”.",
    typeIt: "Escribe lo que dijiste",
    useText: "Usar este texto",
    noMic: "No pudimos usar tu micrófono. Revisa el permiso del navegador o escribe lo que dijiste.",
    manualT: "Practicaste sin grabar. ¡Bien!",
    inTime: "En tiempo",
    short: "Muy corto",
    long: "Un poco largo",
    words: (n: number) => `${n} ${n === 1 ? "palabra" : "palabras"}`,
    vocab: (n: number, w: number) => `${n} ${n === 1 ? "palabra" : "palabras"} de la Semana ${w}`,
    selfH: (n: number) => `¿DIJISTE LOS ${n} PUNTOS?`,
    best: "Guardar como mi mejor intento",
    bestOn: "Mi mejor intento",
    saved: "MI MEJOR INTENTO GUARDADO",
    unstar: "Quitar de mi mejor intento",
    bonusK: "RETO EXTRA · OPCIONAL",
    bonus: "Pide la opinión de tu compañero",
    bonusI: "Si practicaste con alguien, pídele que conteste esto después de escucharte.",
    reflK: "REFLEXIÓN · OPCIONAL",
    reflI: "Piénsalo o dilo en voz alta. No se guarda: es solo para ti.",
    reflT: (a: number, b: number) => `Meta: ${a}–${b} s`,
    cmpB: "Guardamos el texto de tu mejor intento de cada ejercicio.",
    cmpP: "En la Semana 10 lo vas a leer junto al nuevo para ver cuánto avanzaste.",
    cmpP10: "Compáralo con lo que dijiste en la Semana 1 para ver cuánto avanzaste.",
    finish: "Terminar la práctica",
    finishing: "Guardando…",
    finN: (n: number, reps: number[]) => (reps.every((r) => r === 1) ? `Graba al menos 1 intento en cada uno de los ${n} ejercicios.` : `Completa los intentos de los ${n} ejercicios (${reps.join(" + ")}).`),
    finOk: "¡Todo listo!",
    doneK: "PRÁCTICA COMPLETA",
    doneH: "¡Gran trabajo hablando!",
    doneP: (n: number, last: boolean) => `Completaste los ${n} ejercicios. Estos son tus mejores intentos${last ? "." : "; los verás otra vez en la Semana 10."}`,
    noBest: "(Sin intento guardado)",
    rail: "TU AVANCE",
    privH: "PRIVACIDAD",
    privY: "Guardamos: el texto de tu mejor intento.",
    privN: "No guardamos: tu voz.",
    done: "Completo",
    err: "No se pudo guardar. Revisa tu conexión.",
    chipsAria: "Detalles de la práctica",
    you: "Tú",
    youI: "TÚ",
  },
  en: {
    kick: "SPEAKING PRACTICE",
    first: "Before you start",
    last: "Wrap-up",
    exStep: (n: number, kind: string) => `Exercise ${n} · ${kind}`,
    kinds: { zoom: "Zoom", meeting: "Meeting", elevator: "Elevator" } as Record<string, string>,
    s0k: "BEFORE YOU START",
    s0: "How to practice",
    vocH: (w: number) => `YOUR WEEK ${w} VOCABULARY`,
    exk: (n: number) => `EXERCISE ${n}`,
    scK: "THE SITUATION",
    say: "SAY THIS",
    prompts: "TO START THE CONVERSATION",
    dont: "Don't say",
    doSay: "Say",
    model: "MODEL ANSWER",
    reps: (a: number, b: number) => `${a} of ${b}`,
    pk: "PRACTICE",
    tapMic: "Tap the mic and speak in English. Tap again to finish.",
    listening: "Listening…",
    transcribing: "Turning your voice into text…",
    saving: "Saving…",
    opening: "Opening the microphone…",
    micStart: "Record",
    micStop: "Finish",
    limit: (a: number, b: number) => `Goal: ${a}–${b} s`,
    manualP: "Did you practice without recording, in the mirror or with someone?",
    manualB: "I did it without recording",
    att: (n: number) => `TRY ${n}`,
    heard: "WHAT YOU SAID",
    noText: "We didn't hear anything. Check your mic and try again.",
    failed: "We couldn't turn your voice into text this time. Type what you said, or use “I did it without recording”.",
    typeIt: "Type what you said",
    useText: "Use this text",
    noMic: "We couldn't use your microphone. Check the browser permission, or type what you said.",
    manualT: "You practiced without recording. Nice!",
    inTime: "On time",
    short: "Too short",
    long: "A bit long",
    words: (n: number) => `${n} ${n === 1 ? "word" : "words"}`,
    vocab: (n: number, w: number) => `${n} Week ${w} ${n === 1 ? "word" : "words"}`,
    selfH: (n: number) => `DID YOU SAY THE ${n} POINTS?`,
    best: "Save as my best try",
    bestOn: "My best try",
    saved: "MY SAVED BEST TRY",
    unstar: "Remove as my best try",
    bonusK: "BONUS CHALLENGE · OPTIONAL",
    bonus: "Ask your partner for feedback",
    bonusI: "If you practiced with someone, ask them to answer this after they listen to you.",
    reflK: "REFLECTION · OPTIONAL",
    reflI: "Think about it or say it out loud. It isn't saved: it's just for you.",
    reflT: (a: number, b: number) => `Goal: ${a}–${b} s`,
    cmpB: "We save the text of your best try for each exercise.",
    cmpP: "In Week 10 you'll read it next to your new one to see how far you've come.",
    cmpP10: "Compare it with what you said in Week 1 to see how far you've come.",
    finish: "Finish the practice",
    finishing: "Saving…",
    finN: (n: number, reps: number[]) => (reps.every((r) => r === 1) ? `Record at least 1 try in each of the ${n} exercises.` : `Complete the tries for all ${n} exercises (${reps.join(" + ")}).`),
    finOk: "All set!",
    doneK: "PRACTICE COMPLETE",
    doneH: "Great speaking work!",
    doneP: (n: number, last: boolean) => `You completed all ${n} exercises. These are your best tries${last ? "." : "; you'll see them again in Week 10."}`,
    noBest: "(No try saved)",
    rail: "YOUR PROGRESS",
    privH: "PRIVACY",
    privY: "We save: the text of your best try.",
    privN: "We don't save: your voice.",
    done: "Complete",
    err: "Couldn't save. Check your connection.",
    chipsAria: "About this practice",
    you: "You",
    youI: "YOU",
  },
};
type UIT = (typeof UI)["es"];
const POINT_COLORS = ["#7A4FD6", "#00A3C4", "#C98A00", "#1F7A4D", "#C2185B", "#2C6BC4"];
const BARS = 28;

export function InteractiveSpeaking(p: Props) {
  const { data } = p;
  const ex = data.exercises;
  const [lang, chooseLang] = useLangPref(p.userId, p.defaultLang);
  const t = UI[lang];
  // "Antes de empezar", one step per exercise (3 or 4), "Cierre".
  const IDS = ["s0", ...ex.map((_, i) => `s${i + 1}`), `s${ex.length + 1}`];
  const steps = [t.first, ...ex.map((e, i) => t.exStep(i + 1, t.kinds[e.scene.kind] ?? e.scene.kind)), t.last];
  const lastWeek = data.week >= 10;
  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const db = useCallback(() => (sb.current ??= createClient()), []);
  const [saveError, setSaveError] = useState(false);
  // Drafts and teacher-only lessons (staff previews) aren't recorded: record_lesson_progress refuses them.
  const track = p.track !== false;

  useEffect(() => {
    if (track) void db().rpc("record_lesson_progress", { p_lesson: p.lessonId, p_finish: false }).then(() => undefined);
  }, [db, p.lessonId, track]);

  // ---------- state: tries live only in this page; counts and best texts are saved ----------
  const [tries, setTries] = useState<Try[][]>(ex.map(() => []));
  const [reps, setReps] = useState<number[]>(ex.map((_, i) => p.reps[i] ?? 0));
  // One answer per partner question (the bonus has 2 or 3, each 0 = none or 1..3 = the option); the reps array has
  // one count per exercise.
  const [partner, setPartner] = useState<number[]>(data.bonus.questions.en.map((_, i) => p.partner[i] ?? 0));
  const [bestIdx, setBestIdx] = useState<(number | null)[]>(ex.map(() => null));
  const [savedBest, setSavedBest] = useState<(SpeakingBest | null)[]>(ex.map((_, i) => p.best.find((b) => b.exercise === i + 1) ?? null));
  const [completedAt, setCompletedAt] = useState(p.completedAt);
  const repsRef = useRef(reps);
  /** Counts only go up: whatever arrives (props, a fresh read, an RPC answer) is merged by max. */
  const bumpReps = useCallback((from: ArrayLike<number | null> | null | undefined) => {
    const next = maxMerge(repsRef.current, from);
    if (next.some((v, i) => v !== repsRef.current[i])) {
      repsRef.current = next;
      setReps(next);
    }
  }, []);

  // A page shown from the client cache (back / forward) carries the counts of its first load: read them again.
  useEffect(() => {
    let live = true;
    void db()
      .from("speaking_progress")
      .select("reps, partner_feedback, completed_at")
      .eq("user_id", p.userId)
      .eq("lesson_id", p.lessonId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!live || !row) return;
        bumpReps(row.reps);
        setPartner((cur) => cur.map((v, i) => (row.partner_feedback?.[i] == null ? v : Number(row.partner_feedback[i]))));
        if (row.completed_at) setCompletedAt((c) => c ?? row.completed_at);
      });
    return () => {
      live = false;
    };
  }, [db, p.userId, p.lessonId, bumpReps]);

  // Each try adds one in the database (add_speaking_rep); the page never writes the whole array.
  const addTry = (i: number, tr: Try) => {
    setTries((cur) => cur.map((list, k) => (k === i ? [...list, tr] : list)));
    bumpReps(repsRef.current.map((n, k) => (k === i ? n + 1 : n)));
    void db()
      .rpc("add_speaking_rep", { p_lesson: p.lessonId, p_exercise: i + 1 })
      .then(({ data: out, error }) => {
        setSaveError(!!error);
        if (!error) bumpReps(out);
      });
  };
  const setPartnerAnswer = (k: number, v: number) => {
    setPartner((cur) => cur.map((x, i) => (i === k ? v : x)));
    void db()
      .rpc("set_speaking_partner", { p_lesson: p.lessonId, p_question: k + 1, p_value: v })
      .then(({ data: out, error }) => {
        setSaveError(!!error);
        if (!error && out) setPartner((cur) => cur.map((x, i) => (out[i] == null ? x : Number(out[i]))));
      });
  };
  const saveBest = useCallback(
    async (i: number, tr: Try) => {
      const row = { exercise: i + 1, text: tr.text.slice(0, 5000), duration_s: Math.round(tr.dur), points: tr.self };
      const { error } = await db()
        .from("speaking_best")
        .upsert({ user_id: p.userId, lesson_id: p.lessonId, ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id,exercise" });
      setSaveError(!!error);
      if (!error) setSavedBest((cur) => cur.map((b, k) => (k === i ? row : b)));
    },
    [db, p.userId, p.lessonId],
  );
  const star = (i: number, k: number) => {
    const tr = tries[i][k];
    if (!tr?.text) return;
    if (bestIdx[i] === k) return void unstar(i);
    setBestIdx((cur) => cur.map((b, x) => (x === i ? k : b)));
    void saveBest(i, tr);
  };
  /** Tapping the starred try again removes it (speaking_best has an owner DELETE policy). */
  const unstar = async (i: number) => {
    setBestIdx((cur) => cur.map((b, x) => (x === i ? null : b)));
    const { error } = await db().from("speaking_best").delete().eq("user_id", p.userId).eq("lesson_id", p.lessonId).eq("exercise", i + 1);
    setSaveError(!!error);
    if (!error) setSavedBest((cur) => cur.map((b, x) => (x === i ? null : b)));
  };
  const toggleSelf = (i: number, k: number, j: number) => {
    const tr = tries[i][k];
    const self = tr.self.includes(j) ? tr.self.filter((x) => x !== j) : [...tr.self, j].sort();
    setTries((cur) => cur.map((list, x) => (x === i ? list.map((y, z) => (z === k ? { ...y, self } : y)) : list)));
    if (bestIdx[i] === k) void saveBest(i, { ...tr, self });
  };
  const setTyped = (i: number, k: number, text: string) => {
    setTries((cur) => cur.map((list, x) => (x === i ? list.map((y, z) => (z === k ? { ...y, text: text.trim(), failed: false } : y)) : list)));
  };

  // ---------- recording (lib/voice: one capture at a time, stop always settles) ----------
  const [recIdx, setRecIdx] = useState<number | null>(null);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [stage, setStage] = useState<"start" | "saving" | "transcribing" | null>(null);
  const [live, setLive] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<number | null>(null);
  const recRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const voice = useVoiceCapture({ supabase: db, onLive: setLive, onTranscribing: () => setStage("transcribing") });

  const reset = useCallback(() => {
    clearInterval(tick.current);
    clearTimeout(watchdog.current);
    recRef.current = null;
    busyRef.current = false;
    setRecIdx(null);
    setBusyIdx(null);
    setStage(null);
    setLive("");
  }, []);

  const stopMic = useCallback(async () => {
    const i = recRef.current;
    if (i === null || busyRef.current) return;
    busyRef.current = true;
    clearInterval(tick.current);
    // Immediate feedback: the button turns into "Guardando…" before anything else happens.
    setRecIdx(null);
    setBusyIdx(i);
    setStage("saving");
    // Belt and braces: whatever happens below, the mic comes back (stop ≤ 1.5 s + transcription ≤ 20 s).
    watchdog.current = setTimeout(() => {
      voice.cancel();
      reset();
    }, 25_000);
    let res: VoiceResult | null = null;
    try {
      res = await voice.stop();
    } catch {
      res = null;
    } finally {
      reset();
    }
    if (res) addTry(i, { text: res.text, dur: res.dur, self: [], failed: res.failed });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addTry only reads refs and setters
  }, [voice, reset]);
  const stopRef = useRef(stopMic);
  stopRef.current = stopMic;

  const startMic = async (i: number) => {
    if (recRef.current !== null || busyRef.current) return;
    busyRef.current = true;
    setMicError(null);
    setLive("");
    setBusyIdx(i);
    setStage("start");
    let ok = false;
    try {
      ok = await voice.start();
    } catch {
      ok = false;
    }
    busyRef.current = false;
    setBusyIdx(null);
    setStage(null);
    if (!ok) return setMicError(i);
    recRef.current = i;
    const t0 = Date.now();
    setElapsed(0);
    setRecIdx(i);
    // The auto-stop at max_s takes the same path as a tap.
    tick.current = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setElapsed(s);
      if (s >= data.max_s) void stopRef.current();
    }, 200);
  };

  // Leaving (phone locked, app switched, tab closed): drop the recording and free the mic.
  usePageLeave(() => {
    if (recRef.current === null) return;
    voice.cancel();
    reset();
  });
  useEffect(() => () => clearTimeout(watchdog.current), []);

  // ---------- completion ----------
  const readyEx = (i: number) => reps[i] >= repsNeeded(ex[i]);
  const all = ex.every((_, i) => readyEx(i));
  const [finishing, setFinishing] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);
  const bestText = (i: number) => {
    const k = bestIdx[i];
    return k !== null && tries[i][k]?.text ? tries[i][k].text : (savedBest[i]?.text ?? null);
  };
  const finish = async () => {
    if (!all || finishing) return;
    setFinishing(true);
    try {
      // No star: the last try with text.
      for (let i = 0; i < ex.length; i++) {
        if (bestIdx[i] !== null || savedBest[i]) continue;
        const last = [...tries[i]].reverse().find((x) => x.text);
        if (last) await saveBest(i, last);
      }
      const now = new Date().toISOString();
      // Only completed_at: the counts stay as the database has them.
      const { data: rows, error } = await db()
        .from("speaking_progress")
        .update({ completed_at: now, updated_at: now })
        .eq("user_id", p.userId)
        .eq("lesson_id", p.lessonId)
        .select("lesson_id");
      setSaveError(!!error || !rows?.length);
      if (!error && rows?.length) {
        if (track) await finishLesson(db(), p.userId, p.lessonId);
        setCompletedAt(now);
        requestAnimationFrame(() => doneRef.current?.focus());
      }
    } finally {
      setFinishing(false);
    }
  };

  // ---------- progress ----------
  const { current } = useScrollSpy(IDS);
  // Moving to another exercise while recording ends that try (saved, like a tap on stop).
  useEffect(() => {
    const i = recRef.current;
    if (i !== null && current >= 1 && current <= ex.length && current - 1 !== i) void stopRef.current();
  }, [current, ex.length]);
  const seen = (i: number) => (i === 0 ? current > 0 : i <= ex.length ? readyEx(i - 1) : !!completedAt);
  const total = ex.reduce((a, e, i) => a + Math.min(reps[i], repsNeeded(e)), 0);
  const need = ex.reduce((a, e) => a + repsNeeded(e), 0);
  const progress = completedAt ? 1 : 0.05 + (total / need) * 0.85;
  const re = vocabRegex(p.vocab);


  const highlight = (text: string) => {
    if (!re) return text;
    const out: React.ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(re)) {
      if (m.index! > last) out.push(text.slice(last, m.index));
      out.push(<mark key={m.index}>{m[0]}</mark>);
      last = m.index! + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  };

  return (
    <ShellPage lang={lang} className={s.root}>
      <TopBar
        week={data.week}
        kind="SPEAKING"
        title={`${data.hero.title_a} ${data.hero.title_b}`}
        backHref={p.backHref}
        lang={lang}
        onLang={chooseLang}
        progress={progress}
        row={
          <>
            <StepRowText lang={lang} n={current + 1} total={IDS.length} name={steps[current]} />
            {completedAt && (
              <span className={s.donePill}>
                <Icon name="check" size={14} />
                {t.done}
              </span>
            )}
          </>
        }
      />
      <Layout
        railLabel={t.rail}
        main={
          <>
            <section className={sh.hero} aria-labelledby="sp-title">
              <p className={sh.pill}>
                <Icon name="mic" size={16} />
                {t.kick}
              </p>
              <h1 id="sp-title" className={sh.heroTitle} lang="en">
                {data.hero.title_a} <em>{data.hero.title_b}</em>
              </h1>
              <p className={sh.heroIntro}>{lang === "es" ? data.hero.intro_es : data.hero.intro_en}</p>
              <ul className={sh.chips} aria-label={t.chipsAria}>
                {(lang === "es" ? data.hero.chips_es : data.hero.chips_en).map((chip, i) => (
                  <li key={chip}>
                    <Icon name={(["clock", "people", "repeat", "lock"] as const)[i] ?? "doc"} size={18} />
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

            {/* ---------- before you start ---------- */}
            <section id="s0" className={sh.step} aria-labelledby="sp-s0">
              <StepHead kicker={t.s0k} icon="bulb" id="sp-s0" title={t.s0} />
              <ul className={s.rules}>
                {data.rules.map((x) => (
                  <li key={x.t_en} className={s.rule}>
                    <span className={s.ri}>
                      <Icon name={x.icon} size={20} />
                    </span>
                    <b>{lang === "es" ? x.t_es : x.t_en}</b>
                    {lang === "es" ? x.d_es : x.d_en}
                  </li>
                ))}
              </ul>
              {p.vocab.length > 0 && (
                <div className={s.vocab}>
                  <h3 className={s.vocabH}>
                    <Icon name="book" size={16} />
                    {t.vocH(data.week)}
                  </h3>
                  <ul className={s.vchips}>
                    {p.vocab.map((v) => (
                      <li key={v.word}>
                        <span lang="en">{v.word}</span>
                        {lang === "es" && <small lang="es">{v.es}</small>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* ---------- the exercises (3 or 4) ---------- */}
            {ex.map((e, i) => (
              <ExerciseCard
                key={i}
                e={e}
                i={i}
                week={data.week}
                t={t}
                lang={lang}
                reps={reps[i]}
                tries={tries[i]}
                bestIdx={bestIdx[i]}
                savedBest={savedBest[i]}
                rec={recIdx === i}
                busy={busyIdx === i ? stage : null}
                disabled={(recIdx !== null && recIdx !== i) || (busyIdx !== null && busyIdx !== i)}
                elapsed={recIdx === i ? elapsed : 0}
                live={recIdx === i ? live : ""}
                micError={micError === i}
                onMic={() => (recIdx === i ? void stopMic() : void startMic(i))}
                onManual={() => addTry(i, { text: "", dur: 0, self: [], manual: true })}
                onStar={(k) => star(i, k)}
                onUnstar={() => void unstar(i)}
                onSelf={(k, j) => toggleSelf(i, k, j)}
                onTyped={(k, text) => setTyped(i, k, text)}
                onAddTyped={(text) => {
                  setMicError(null);
                  addTry(i, { text: text.trim(), dur: 0, self: [] });
                }}
                highlight={highlight}
                vocabN={(text) => vocabCount(text, p.vocab)}
              />
            ))}

            {/* ---------- wrap-up ---------- */}
            <section id={IDS[IDS.length - 1]} className={sh.step} aria-labelledby="sp-s4">
              {data.reflection && <Reflection r={data.reflection} t={t} lang={lang} />}
              <StepHead kicker={t.bonusK} icon="flag" id="sp-s4" title={t.bonus} />
              <div className={sh.card}>
                {completedAt ? (
                  <div className={s.findone} ref={doneRef} tabIndex={-1} role="status">
                    <span className={s.seal} aria-hidden>
                      <svg viewBox="0 0 24 24" width="44" height="44">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <p className={s.doneK}>{t.doneK}</p>
                    <h3 className={s.doneH}>{t.doneH}</h3>
                    <p className={s.doneP}>{t.doneP(ex.length, lastWeek)}</p>
                    <ul className={s.bests}>
                      {ex.map((e, i) => (
                        <li key={i}>
                          <b>
                            <Icon name="star" size={14} /> {e.title[lang].toUpperCase()}
                          </b>
                          <p lang="en">{bestText(i) ?? t.noBest}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                    <p className={sh.intro}>{t.bonusI}</p>
                    <ul className={s.bonus}>
                      {data.bonus.questions[lang].map((q, k) => (
                        <li key={k} className={s.bq}>
                          <p id={`sp-bq-${k}`}>{q}</p>
                          <div className={s.opts} role="group" aria-labelledby={`sp-bq-${k}`}>
                            {data.bonus.options[lang].map((o, j) => (
                              <button
                                key={j}
                                type="button"
                                aria-pressed={partner[k] === j + 1}
                                onClick={() => setPartnerAnswer(k, partner[k] === j + 1 ? 0 : j + 1)}
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {data.bonus.reflect && (
                      <p className={s.reflect}>
                        <Icon name="bulb" size={18} />
                        <span>{data.bonus.reflect[lang]}</span>
                      </p>
                    )}
                    <div className={s.cmp10}>
                      <span className={s.ci}>
                        <Icon name="cal" size={20} />
                      </span>
                      <p>
                        <strong>{t.cmpB}</strong> {lastWeek ? t.cmpP10 : t.cmpP}
                      </p>
                    </div>
                    <div className={s.finish}>
                      <button type="button" className={s.btnP} disabled={!all || finishing} onClick={() => void finish()}>
                        <Icon name="check" size={18} />
                        {finishing ? t.finishing : t.finish}
                      </button>
                      <p aria-live="polite">{all ? t.finOk : t.finN(ex.length, ex.map((e) => repsNeeded(e)))}</p>
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

            <Pager lang={lang} prev={p.prev} next={p.next} label={(x) => navTitle(x, lang)} />
          </>
        }
        rail={
          <>
            <RailCard title={t.rail}>
              <RailSteps
                steps={steps}
                current={current}
                done={seen}
                onGo={(i) => goTo(IDS[i])}
                extra={(i) => (i >= 1 && i <= ex.length ? `${Math.min(reps[i - 1], ex[i - 1].reps)}/${ex[i - 1].reps}` : null)}
              />
            </RailCard>
            <RailCard title={t.privH}>
              <p className={`${s.privRow} ${s.privY}`}>
                <Icon name="check" size={18} />
                <span>{t.privY}</span>
              </p>
              <p className={`${s.privRow} ${s.privN}`}>
                <Icon name="x" size={18} />
                <span>{t.privN}</span>
              </p>
            </RailCard>
          </>
        }
      />
    </ShellPage>
  );
}

function Scene({ e, t, lang }: { e: SpeakingExercise; t: UIT; lang: Lang }) {
  const sc = e.scene;
  return (
    <div className={s.scene} aria-hidden>
      <div className={s.bar}>
        <span className={s.live}>
          <i />
          {sc.bar[lang]}
        </span>
        <span>{sc.meta[lang]}</span>
      </div>
      {sc.kind === "zoom" && (
        <div className={s.tiles} style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className={s.tile}>
            <span className={s.av} style={{ background: "#7A4FD6" }}>
              {sc.tile?.initials ?? "JR"}
            </span>
            <span className={s.nm}>{sc.tile?.name}</span>
          </div>
          <div className={`${s.tile} ${s.you}`}>
            <span className={s.av} style={{ background: "#2C6BC4" }}>
              {t.youI}
            </span>
            <span className={s.nm}>{t.you}</span>
          </div>
        </div>
      )}
      {sc.kind === "meeting" && (
        <div className={s.tiles} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            ["MK", "#9A6A00"],
            ["LS", "#1F7A4D"],
            ["DP", "#C2185B"],
            ["RT", "#007E98"],
            ["JB", "#7A4FD6"],
            [t.youI, "#2C6BC4"],
          ].map(([n, c], k) => (
            <div key={k} className={`${s.tile} ${k === 5 ? s.you : ""}`} style={{ minHeight: 70 }}>
              <span className={s.av} style={{ background: c, width: 40, height: 40, fontSize: 13 }}>
                {n}
              </span>
            </div>
          ))}
        </div>
      )}
      {sc.kind === "elevator" && (
        <div className={s.elev}>
          <span className={s.floor}>▲ 12</span>
        </div>
      )}
      <div className={s.say}>
        <small>{sc.speaker[lang]}</small>
        <span lang="en">“{sc.line}”</span>
      </div>
    </div>
  );
}

function ExerciseCard({
  e,
  i,
  week,
  t,
  lang,
  reps,
  tries,
  bestIdx,
  savedBest,
  rec,
  busy,
  disabled,
  elapsed,
  live,
  micError,
  onMic,
  onManual,
  onStar,
  onUnstar,
  onSelf,
  onTyped,
  onAddTyped,
  highlight,
  vocabN,
}: {
  e: SpeakingExercise;
  i: number;
  week: number;
  t: UIT;
  lang: Lang;
  reps: number;
  tries: Try[];
  bestIdx: number | null;
  savedBest: SpeakingBest | null;
  rec: boolean;
  /** What the mic is doing for this exercise right now (null: idle or recording). */
  busy: "start" | "saving" | "transcribing" | null;
  disabled: boolean;
  elapsed: number;
  live: string;
  micError: boolean;
  onMic: () => void;
  onManual: () => void;
  onStar: (k: number) => void;
  onUnstar: () => void;
  onSelf: (k: number, j: number) => void;
  onTyped: (k: number, text: string) => void;
  onAddTyped: (text: string) => void;
  highlight: (t: string) => React.ReactNode;
  vocabN: (t: string) => number;
}) {
  const done = reps >= e.reps;
  const twists = e.twists[lang];
  const nextTwist = twists[Math.min(reps, e.reps - 1)];
  const [lo, hi] = e.limit_s;
  const tmrK = elapsed >= lo && elapsed <= hi ? "ok" : elapsed > hi ? "over" : undefined;
  const id = `s${i + 1}`;
  return (
    <section id={id} className={sh.step} aria-labelledby={`${id}-h`}>
      <div className={`${sh.card} ${s.ex}`} data-done={done || undefined}>
        <div className={s.exhd}>
          <span className={s.n}>
            <Icon name={done ? "check" : iconOr(e.icon, "people")} size={24} />
          </span>
          <div>
            <p className={sh.stepK}>{t.exk(i + 1)}</p>
            <h2 id={`${id}-h`} className={s.exTitle}>
              {e.title[lang]}
            </h2>
          </div>
          <p className={s.reps}>
            <span className={s.dots} aria-hidden>
              {Array.from({ length: e.reps }, (_, k) => (
                <i key={k} data-on={k < reps || undefined} />
              ))}
            </span>
            {t.reps(Math.min(reps, e.reps), e.reps)}
          </p>
        </div>
        <div className={s.exbody}>
          <Scene e={e} t={t} lang={lang} />
          <div className={s.info}>
            <p className={s.scen}>
              <b>{t.scK}</b>
              {e.situation[lang]}
            </p>
            <div>
              <p className={s.lab}>{t.say}</p>
              <ol className={s.points}>
                {e.points[lang].map((pt, j) => (
                  <li key={j}>
                    <i style={{ "--c": POINT_COLORS[j] } as React.CSSProperties} aria-hidden>
                      {j + 1}
                    </i>
                    {pt}
                  </li>
                ))}
              </ol>
            </div>
            {e.prompts && e.prompts.length > 0 && (
              <div>
                <p className={s.lab}>{t.prompts}</p>
                <ul className={s.prompts} lang="en">
                  {e.prompts.map((x) => (
                    <li key={x}>“{x}”</li>
                  ))}
                </ul>
              </div>
            )}
            {e.avoid_say && (
              <div className={s.avoid}>
                <p data-k="no">
                  <b>❌ {t.dont}:</b> <span lang="en">“{e.avoid_say.dont}”</span>
                </p>
                <p data-k="ok">
                  <b>✅ {t.doSay}:</b> <span lang="en">“{e.avoid_say.do}”</span>
                </p>
              </div>
            )}
            {e.model && (
              <div className={s.model}>
                <p className={s.lab}>{t.model}</p>
                {e.model.split("\n").map((line) => (
                  <p key={line} lang="en">
                    {line}
                  </p>
                ))}
              </div>
            )}
            <p className={s.howto}>
              <Icon name="repeat" size={18} />
              <span>{e.how[lang]}</span>
            </p>
          </div>
        </div>

        <div className={s.practice}>
          <div className={s.ph2}>
            <p className={s.lab}>{t.pk}</p>
            <span className={s.twist}>{done ? `✓ ${t.reps(e.reps, e.reps)}` : nextTwist}</span>
          </div>
          <div className={s.recrow}>
            <button
              type="button"
              className={s.mic}
              data-mic
              data-on={rec || undefined}
              data-busy={busy || undefined}
              onClick={onMic}
              disabled={disabled || !!busy}
              aria-pressed={rec}
              aria-busy={!!busy}
              aria-label={`${busy ? (busy === "start" ? t.opening : t.saving) : rec ? t.micStop : t.micStart} · ${e.title[lang]}`}
            >
              {busy ? <span className={s.spin} aria-hidden /> : <Icon name={rec ? "stop" : "mic"} size={30} />}
            </button>
            {/* A CSS wave: no AudioContext on the microphone (one capture at a time). */}
            <div className={s.wave} data-on={rec || undefined} aria-hidden>
              {Array.from({ length: BARS }, (_, k) => (
                <i key={k} style={{ "--k": k } as React.CSSProperties} />
              ))}
            </div>
            <div className={s.tmr} data-k={tmrK}>
              <b role="timer">{fmtSecs(elapsed)}</b>
              <small>{t.limit(lo, hi)}</small>
            </div>
          </div>
          <p className={s.hint} aria-live="polite">
            {busy === "transcribing"
              ? t.transcribing
              : busy === "saving"
                ? t.saving
                : busy === "start"
                  ? t.opening
                  : rec
                    ? `${t.listening}${live ? ` “${live}”` : ""}`
                    : micError
                      ? t.noMic
                      : t.tapMic}
          </p>
          {e.manual_ok && (
            <div className={s.alt}>
              <p>
                <Icon name="mirror" size={16} /> {t.manualP}
              </p>
              <button type="button" className={s.btnO} onClick={onManual} disabled={rec || !!busy}>
                <Icon name="check" size={17} />
                {t.manualB}
              </button>
            </div>
          )}
          {micError && <TypedTry t={t} onSave={onAddTyped} />}
          {tries.length === 0 && savedBest && (
            <div className={s.att}>
              <p className={s.ahK}>
                <Icon name="star" size={14} /> {t.saved}
              </p>
              <p className={s.tx} lang="en">
                {highlight(savedBest.text)}
              </p>
              <div className={s.acts}>
                <button type="button" className={s.bestb} onClick={onUnstar}>
                  <Icon name="star" size={17} />
                  {t.unstar}
                </button>
              </div>
            </div>
          )}
          {tries
            .map((tr, k) => ({ tr, k }))
            .reverse()
            .map(({ tr, k }) => (
              <TryCard
                key={k}
                tr={tr}
                k={k}
                i={i}
                week={week}
                e={e}
                t={t}
                lang={lang}
                best={bestIdx === k}
                onStar={() => onStar(k)}
                onSelf={(j) => onSelf(k, j)}
                onTyped={(text) => onTyped(k, text)}
                highlight={highlight}
                vocabN={vocabN}
              />
            ))}
        </div>
      </div>
    </section>
  );
}

/** The original's closing reflection questions (not saved). */
function Reflection({ r, t, lang }: { r: NonNullable<SpeakingData["reflection"]>; t: UIT; lang: Lang }) {
  const qs = "questions" in r ? r.questions[lang] : r[lang];
  const intro = "questions" in r ? (lang === "es" ? r.intro_es : r.intro_en) : null;
  const limit = "questions" in r ? r.limit_s : undefined;
  if (!qs?.length) return null;
  return (
    <div className={`${sh.card} ${s.refl}`}>
      <p className={s.lab}>
        <Icon name="mirror" size={15} /> {t.reflK}
      </p>
      <p className={s.reflI}>{intro ?? t.reflI}</p>
      <ol className={s.reflQ}>
        {qs.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      {limit && <p className={s.reflI}>{t.reflT(limit[0], limit[1])}</p>}
    </div>
  );
}

function TypedTry({ t, onSave }: { t: UIT; onSave: (text: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className={s.typed}>
      <label>
        <span className={s.lab}>{t.typeIt}</span>
        <textarea value={v} onChange={(e) => setV(e.target.value)} lang="en" maxLength={5000} rows={3} />
      </label>
      <button type="button" className={s.btnO} onClick={() => v.trim() && onSave(v)} disabled={!v.trim()}>
        <Icon name="check" size={17} />
        {t.useText}
      </button>
    </div>
  );
}

function TryCard({
  tr,
  k,
  i,
  week,
  e,
  t,
  lang,
  best,
  onStar,
  onSelf,
  onTyped,
  highlight,
  vocabN,
}: {
  tr: Try;
  k: number;
  i: number;
  week: number;
  e: SpeakingExercise;
  t: UIT;
  lang: Lang;
  best: boolean;
  onStar: () => void;
  onSelf: (j: number) => void;
  onTyped: (text: string) => void;
  highlight: (t: string) => React.ReactNode;
  vocabN: (t: string) => number;
}) {
  const twist = e.twists[lang][k] ?? "";
  const twistShort = (twist.split(":")[1] ?? "").trim();
  if (tr.manual)
    return (
      <div className={s.att}>
        <div className={s.ah}>
          <b>{t.att(k + 1)}</b>
          <span className={s.chip} data-k="ok">
            <Icon name="check" size={13} />
            {twist}
          </span>
        </div>
        <p className={s.tx}>{t.manualT}</p>
      </div>
    );
  const [lo, hi] = e.limit_s;
  const inT = tr.dur >= lo && tr.dur <= hi + 5;
  const vc = tr.text ? vocabN(tr.text) : 0;
  return (
    <div className={s.att}>
      <div className={s.ah}>
        <b>
          {t.att(k + 1)}
          {twistShort ? ` · ${twistShort}` : ""}
        </b>
        <span className={s.chip} data-k={inT ? "ok" : "warn"}>
          <Icon name="clock" size={13} />
          {fmtSecs(tr.dur)} · {inT ? t.inTime : tr.dur < lo ? t.short : t.long}
        </span>
        {tr.text && <span className={s.chip}>{t.words(countWordsSimple(tr.text))}</span>}
        {vc > 0 && (
          <span className={s.chip} data-k="ok">
            <Icon name="book" size={13} />
            {t.vocab(vc, week)}
          </span>
        )}
      </div>
      <p className={s.lab}>{t.heard}</p>
      {tr.failed ? (
        <>
          <p className={`${s.tx} ${s.empty}`} role="alert">
            {t.failed}
          </p>
          <TypedTry t={t} onSave={onTyped} />
        </>
      ) : (
        <p className={`${s.tx} ${tr.text ? "" : s.empty}`} lang={tr.text ? "en" : undefined}>
          {tr.text ? highlight(tr.text) : t.noText}
        </p>
      )}
      {tr.text && (
        <>
          <p className={s.lab} id={`sp-self-${i}-${k}`} style={{ marginTop: 14 }}>
            {t.selfH(e.points[lang].length)}
          </p>
          <ul className={s.selfp} aria-labelledby={`sp-self-${i}-${k}`}>
            {e.points[lang].map((pt, j) => (
              <li key={j}>
                <button type="button" aria-pressed={tr.self.includes(j)} onClick={() => onSelf(j)}>
                  <i aria-hidden>
                    <Icon name="check" size={14} />
                  </i>
                  {pt}
                </button>
              </li>
            ))}
          </ul>
          <div className={s.acts}>
            <button type="button" className={s.bestb} aria-pressed={best} onClick={onStar}>
              <Icon name="star" size={17} />
              {best ? t.bestOn : t.best}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

