"use client";

// CelsBSNS Interactive Reading (celsu-celsbsns-reading-brief.md): hero, 5 steps (warm-up poll, the CelsU article,
// the TED talk, three cases, the checkpoint), private autosaved notes, and completion through
// record_lesson_progress (finishLesson), the same path as every other lesson. Built once from ReadingData.
import { createPortal } from "react-dom";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { mergeReadingState, navTitle, plain, tedEmbed, tokenize, type ArticleBlock, type Email, type Lang, type ReadingCase, type ReadingData, type ReadingState, type Talk } from "@/lib/reading";
import { montserrat } from "@/components/bsns/fonts";
import { Icon, Layout, Sheet, Pager, RailCard, RailSteps, ShellPage, StepHead as ShellStepHead, StepRowText, TopBar, goTo, shell as sh, useLangPref, useScrollSpy } from "@/components/bsns/shell";
import s from "./reading.module.css";

type Nav = { title: string; href: string } | null;
type Props = {
  data: ReadingData;
  lessonId: string;
  userId: string;
  backHref: string;
  prev: Nav;
  next: Nav;
  initialNotes: Record<string, string>;
  initialState: ReadingState;
  completedAt: string | null;
  defaultLang: Lang;
  /** false for drafts and teacher-only lessons (staff previews): nothing goes to record_lesson_progress. */
  track?: boolean;
};
type SaveStatus = "saving" | "saved" | "error";

// The interface text (the lesson's own text is in ReadingData).
const UI = {
  es: {
    week: "SEMANA",
    back: "Volver a la semana",
    kick: "LECTURA INTERACTIVA",
    step: "PASO",
    steps: ["Antes de leer", "El artículo", "El video", "Caso 1", "Caso 2", "Caso 3", "Cierre"],
    stepOf: (n: number) => `Paso ${n} de 7`,
    article: "El artículo",
    original: "CELSU ORIGINAL",
    tr: "Ver en español",
    trh: "Ocultar español",
    pause: "PAUSA Y PIENSA",
    myNote: "Mi nota",
    before: "Antes",
    after: "Después",
    to: "Para",
    subject: "Asunto",
    sources: "FUENTES",
    source: "Ver fuente",
    disc: "Este artículo fue escrito por CelsU con base en las fuentes citadas. Las cifras provienen de esas publicaciones. Las charlas se reproducen con el reproductor oficial de TED.",
    video: "El video",
    play: "Ver la charla",
    playSub: "Se reproduce aquí mismo · subtítulos en inglés y español",
    whileWatch: "MIENTRAS VES",
    extra: "Para profundizar (opcional)",
    extraBtn: "Ver charla",
    extraHide: "Ocultar charla",
    cases: "Tres casos reales",
    caseLab: "CASO",
    rq: "PREGUNTAS DE REFLEXIÓN",
    t1: "TU TURNO: REESCRIBE EL CORREO",
    t2: "TU TURNO: ENCUENTRA LO QUE FUNCIONA",
    t3: "TU TURNO: ¿QUIÉN SUENA MÁS PROFESIONAL?",
    model: "Ver un ejemplo",
    modelh: "Ocultar ejemplo",
    modelk: "UN EJEMPLO POSIBLE",
    found: (n: number, t: number) => `${n} de ${t} encontradas`,
    yourChoice: "Tu elección",
    s6: "Cierre: revisa lo que aprendiste",
    s6i: "Para terminar la lectura responde estas 3 preguntas y escribe tu conclusión.",
    right: "Correcto.",
    wrong: (l: string, o: string) => `No exactamente. La respuesta es ${l}: ${o}.`,
    req: "OBLIGATORIO",
    opt: "OPCIONAL",
    finish: "Terminar la lectura",
    finishing: "Guardando…",
    finishNote: "Responde las 3 preguntas y tu conclusión para terminar.",
    finishReady: "Todo listo. Tus respuestas incorrectas no te bloquean.",
    doneK: "LECTURA COMPLETADA",
    doneH: "¡Muy bien!",
    doneP: "Tus notas quedan guardadas y las vas a usar en tu Writing Task y en tu práctica de Speaking.",
    score: (n: number) => `${n} de 3 respuestas correctas`,
    xp: (n: number) => `+${n} XP`,
    notes: "Mis notas",
    notesB: "Ver mis notas",
    notesCount: "notas guardadas en esta lectura",
    priv: "Solo tú ves tus notas.",
    saving: "Guardando…",
    saved: "Guardado",
    saveErr: "No se pudo guardar. Revisa tu conexión.",
    rail: "TU AVANCE",
    nonote: "Todavía no has escrito notas.",
    close: "Cerrar",
    prev: "ANTERIOR",
    next: "SIGUIENTE",
    take: "MI CONCLUSIÓN",
    rewriteNote: "MI VERSIÓN DEL CORREO",
    vocabClose: "Cerrar definición",
    review: "Repaso",
    lang: "Idioma de las instrucciones",
    chipsAria: "Detalles de la lectura",
    learnAria: "Lo que vas a aprender",
  },
  en: {
    week: "WEEK",
    back: "Back to the week",
    kick: "INTERACTIVE READING",
    step: "STEP",
    steps: ["Before you read", "The article", "The video", "Case 1", "Case 2", "Case 3", "Wrap-up"],
    stepOf: (n: number) => `Step ${n} of 7`,
    article: "The article",
    original: "CELSU ORIGINAL",
    tr: "Ver en español",
    trh: "Hide Spanish",
    pause: "PAUSE AND THINK",
    myNote: "My note",
    before: "Before",
    after: "After",
    to: "To",
    subject: "Subject",
    sources: "SOURCES",
    source: "See source",
    disc: "This article was written by CelsU based on the sources cited. Figures come from those publications. Talks play through TED's official player.",
    video: "The video",
    play: "Watch the talk",
    playSub: "Plays right here · English and Spanish subtitles",
    whileWatch: "WHILE YOU WATCH",
    extra: "Go deeper (optional)",
    extraBtn: "Watch talk",
    extraHide: "Hide talk",
    cases: "Three real cases",
    caseLab: "CASE",
    rq: "REFLECTION QUESTIONS",
    t1: "YOUR TURN: REWRITE THE EMAIL",
    t2: "YOUR TURN: SPOT WHAT WORKS",
    t3: "YOUR TURN: WHO SOUNDS MORE PROFESSIONAL?",
    model: "See an example",
    modelh: "Hide example",
    modelk: "ONE POSSIBLE VERSION",
    found: (n: number, t: number) => `${n} of ${t} found`,
    yourChoice: "Your choice",
    s6: "Wrap-up: check what you learned",
    s6i: "To finish the reading, answer these 3 questions and write your takeaway.",
    right: "Correct.",
    wrong: (l: string, o: string) => `Not quite. The answer is ${l}: ${o}.`,
    req: "REQUIRED",
    opt: "OPTIONAL",
    finish: "Finish the reading",
    finishing: "Saving…",
    finishNote: "Answer the 3 questions and your takeaway to finish.",
    finishReady: "All set. Wrong answers don't block you.",
    doneK: "READING COMPLETE",
    doneH: "Well done!",
    doneP: "Your notes are saved, and you'll use them in your Writing Task and your Speaking practice.",
    score: (n: number) => `${n} of 3 correct answers`,
    xp: (n: number) => `+${n} XP`,
    notes: "My notes",
    notesB: "See my notes",
    notesCount: "notes saved in this reading",
    priv: "Only you can see your notes.",
    saving: "Saving…",
    saved: "Saved",
    saveErr: "Couldn't save. Check your connection.",
    rail: "YOUR PROGRESS",
    nonote: "You haven't written any notes yet.",
    close: "Close",
    prev: "PREVIOUS",
    next: "NEXT",
    take: "MY TAKEAWAY",
    rewriteNote: "MY VERSION OF THE EMAIL",
    vocabClose: "Close definition",
    review: "Review",
    lang: "Language for the instructions",
    chipsAria: "About this reading",
    learnAria: "What you'll learn",
  },
};
type UIT = (typeof UI)["es"];

const LETTERS = ["A", "B", "C", "D"];
const MIN_TAKEAWAY = 10;
const STEP_IDS = ["rd-step-1", "rd-step-2", "rd-step-3", "rd-case-1", "rd-case-2", "rd-case-3", "rd-step-5"];

// ---------- the page ----------
export function InteractiveReading(p: Props) {
  const { data } = p;
  const [lang, chooseLang] = useLangPref(p.userId, p.defaultLang);
  const t = UI[lang];
  // The `<key>_es` / `<key>_en` field for the current language.
  const L = (o: object, k: string) => (o as Record<string, string>)[`${k}_${lang}`] ?? "";

  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const db = useCallback(() => (sb.current ??= createClient()), []);

  // Opening the reading counts as studying today and marks the lesson "in progress" (same RPC as every lesson).
  useEffect(() => {
    // Query builders only run when awaited or then()-ed.
    // Drafts and teacher-only lessons (staff previews) aren't recorded: record_lesson_progress refuses them.
    if (p.track !== false) void db().rpc("record_lesson_progress", { p_lesson: p.lessonId, p_finish: false }).then(() => undefined);
  }, [db, p.lessonId, p.track]);

  // ---------- notes: autosave 600 ms after typing stops ----------
  const [notes, setNotes] = useState<Record<string, string>>(p.initialNotes);
  const [status, setStatus] = useState<Record<string, SaveStatus>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef(notes);
  latest.current = notes;

  const saveNote = useCallback(
    async (id: string) => {
      timers.current.delete(id);
      const body = (latest.current[id] ?? "").slice(0, 5000);
      setStatus((x) => ({ ...x, [id]: "saving" }));
      const { error } = await db()
        .from("reading_notes")
        .upsert({ user_id: p.userId, lesson_id: p.lessonId, block_id: id, body, updated_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id,block_id" });
      setStatus((x) => ({ ...x, [id]: error ? "error" : "saved" }));
    },
    [db, p.userId, p.lessonId],
  );
  const onNote = useCallback(
    (id: string, v: string) => {
      setNotes((n) => ({ ...n, [id]: v }));
      clearTimeout(timers.current.get(id));
      timers.current.set(id, setTimeout(() => void saveNote(id), 600));
    },
    [saveNote],
  );
  const flushNotes = useCallback(async () => {
    const ids = [...timers.current.keys()];
    ids.forEach((id) => clearTimeout(timers.current.get(id)));
    await Promise.all(ids.map((id) => saveNote(id)));
  }, [saveNote]);
  useEffect(() => {
    const onHide = () => void flushNotes();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flushNotes();
    };
  }, [flushNotes]);

  // ---------- reading state (poll, spot, case 3, MCQ, furthest step) ----------
  const [st, setSt] = useState<ReadingState>(p.initialState ?? {});
  const [completedAt, setCompletedAt] = useState(p.completedAt);
  const stRef = useRef(st);
  const stTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touched = useRef<Partial<ReadingState>>({});
  // A page from the client cache (back / forward) starts from the state of its first load: read the saved state
  // again and merge it (answers kept, the furthest step by max, found spots as a union) before anything is written.
  useEffect(() => {
    let live = true;
    void db()
      .from("reading_progress")
      .select("state, completed_at")
      .eq("user_id", p.userId)
      .eq("lesson_id", p.lessonId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!live || !row) return;
        const merged = { ...mergeReadingState(stRef.current, (row.state ?? {}) as ReadingState), ...touched.current };
        stRef.current = merged;
        setSt(merged);
        if (row.completed_at) setCompletedAt((c) => c ?? row.completed_at);
      });
    return () => {
      live = false;
    };
  }, [db, p.userId, p.lessonId]);
  const update = useCallback(
    (patch: Partial<ReadingState>) => {
      touched.current = { ...touched.current, ...patch };
      const nextSt = { ...stRef.current, ...patch };
      stRef.current = nextSt;
      setSt(nextSt);
      clearTimeout(stTimer.current);
      stTimer.current = setTimeout(() => {
        void db()
          .from("reading_progress")
          .upsert({ user_id: p.userId, lesson_id: p.lessonId, state: nextSt, updated_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" })
          .then(() => undefined);
      }, 300);
    },
    [db, p.userId, p.lessonId],
  );

  // ---------- note list (for "Mis notas") ----------
  const noteDefs = useMemo(() => {
    const d: { id: string; label: string }[] = [{ id: "n0", label: L(data.warmup, "note_q") }];
    if (data.article.blocks.some((b) => b.type === "pause")) d.push({ id: "pause", label: t.pause });
    (lang === "es" ? data.video.prompts_es : data.video.prompts_en).forEach((q, i) => d.push({ id: `v${i + 1}`, label: q }));
    data.cases.forEach((c, ci) => {
      if (c.activity.kind === "rewrite") d.push({ id: `${c.id}rw`, label: `${t.caseLab} ${ci + 1} · ${t.rewriteNote}` });
      c.questions.forEach((q, qi) => d.push({ id: `${c.id}q${qi + 1}`, label: `${t.caseLab} ${ci + 1} · ${q}` }));
    });
    d.push({ id: "take", label: t.take });
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- L only reads `lang`
  }, [data, lang, t]);
  const written = noteDefs.filter((n) => (notes[n.id] ?? "").trim());

  // ---------- notes panel ----------
  const [panel, setPanel] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openPanel = (e: React.MouseEvent<HTMLElement>) => {
    opener.current = e.currentTarget;
    setPanel(true);
  };
  const closePanel = useCallback(() => {
    setPanel(false);
    opener.current?.focus();
  }, []);
  const goToNote = (id: string) => {
    setPanel(false);
    const el = document.getElementById(`rd-note-${id}`) as HTMLTextAreaElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el?.focus({ preventScroll: true }), 350);
  };

  // ---------- vocabulary card ----------
  const [pop, setPop] = useState<{ word: string; el: HTMLElement } | null>(null);
  const openVocab = (word: string, el: HTMLElement) => setPop((cur) => (cur?.el === el ? null : { word, el }));
  const closeVocab = useCallback((focus = true) => {
    setPop((cur) => {
      if (focus) cur?.el.focus();
      return null;
    });
  }, []);

  // ---------- scroll: progress bar and scroll-spy ----------
  const reachedRef = useRef(st.reached ?? 0);
  const onReach = useCallback(
    (c: number) => {
      if (c > reachedRef.current) {
        reachedRef.current = c;
        update({ reached: c });
      }
    },
    [update],
  );
  const { pct: scrollPct, current } = useScrollSpy(STEP_IDS, onReach);
  const reached = Math.max(st.reached ?? 0, current);

  // ---------- completion ----------
  const mcq = data.checkpoint.mcq;
  const answers = mcq.map((_, i) => st.mcq?.[i] ?? null);
  const allAnswered = answers.every((a) => a !== null);
  const takeOk = (notes.take ?? "").trim().length >= MIN_TAKEAWAY;
  const correct = answers.filter((a, i) => a === mcq[i].a).length;
  const [finishing, setFinishing] = useState(false);
  const [xp, setXp] = useState(0);
  const doneRef = useRef<HTMLDivElement>(null);
  const finish = async () => {
    if (!allAnswered || !takeOk || finishing) return;
    setFinishing(true);
    await flushNotes();
    const now = new Date().toISOString();
    clearTimeout(stTimer.current);
    await db().from("reading_progress").upsert({ user_id: p.userId, lesson_id: p.lessonId, state: stRef.current, completed_at: now, updated_at: now }, { onConflict: "user_id,lesson_id" });
    const r = p.track !== false ? await finishLesson(db(), p.userId, p.lessonId) : { xp: 0, queued: false };
    setXp(r.xp);
    setCompletedAt(now);
    setFinishing(false);
    requestAnimationFrame(() => doneRef.current?.focus());
  };

  const rich = (text: string) =>
    tokenize(text).map((tok, i) =>
      tok.k === "text" ? (
        <Fragment key={i}>{tok.v}</Fragment>
      ) : tok.k === "vocab" ? (
        <VocabWord key={i} word={tok.v} known={!!findVocab(data, tok.v)} open={pop?.word === tok.v} onOpen={openVocab} />
      ) : (
        <sup key={i} className={s.cite}>
          <a href={`#rd-src-${tok.n}`} aria-label={`${lang === "es" ? "Fuente" : "Source"} ${tok.n}`}>
            [{tok.n}]
          </a>
        </sup>
      ),
    );

  const noteField = (id: string, label: React.ReactNode, required = false, rows = 3) => (
    <NoteField id={id} label={label} required={required} rows={rows} value={notes[id] ?? ""} onChange={onNote} status={status[id]} t={t} />
  );

  const [titleA, titleB] = splitTitle(data.original.title);

  return (
    <ShellPage lang={lang} className={s.root}>
      <TopBar
        week={data.week}
        kind="READING"
        title={titleA.replace(/:$/, "")}
        backHref={p.backHref}
        lang={lang}
        onLang={chooseLang}
        progress={scrollPct}
        row={
          <>
            <StepRowText lang={lang} n={current + 1} total={STEP_IDS.length} name={t.steps[current]} />
            <button type="button" className={s.notesBtn} onClick={openPanel} aria-haspopup="dialog">
              <Icon name="doc" size={16} />
              {t.notes} ({written.length})
            </button>
          </>
        }
      />

      <Layout
        railLabel={t.rail}
        main={
          <>
          {/* ---------- hero ---------- */}
          <section className={sh.hero} aria-labelledby="rd-title">
            <p className={sh.pill}>
              <Icon name="book" size={14} />
              {t.kick}
            </p>
            <h1 id="rd-title" className={sh.heroTitle}>
              {titleA} <span>{titleB}</span>
            </h1>
            <p className={sh.heroIntro}>{L(data.hero, "intro")}</p>
            <ul className={sh.chips} aria-label={t.chipsAria}>
              {(lang === "es" ? data.hero.chips_es : data.hero.chips_en).map((c, i) => (
                <li key={c}>
                  <Icon name={(["clock", "doc", "chat", "lock"] as const)[i] ?? "doc"} size={14} />
                  {c}
                </li>
              ))}
            </ul>
            <ul className={sh.learn} aria-label={t.learnAria}>
              {data.hero.learn.map((l) => (
                <li key={l.t_en}>
                  <strong>{L(l, "t")}</strong>
                  <span>{L(l, "d")}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- step 1 ---------- */}
          <section id={STEP_IDS[0]} className={sh.step} aria-labelledby="rd-s1">
            <ShellStepHead kicker={`${t.step} 1`} icon="spark" id="rd-s1" title={L(data.warmup, "title")} />
            <div className={sh.card}>
              <p className={s.muted}>{L(data.warmup, "intro")}</p>
              <fieldset className={s.poll}>
                <legend>{L(data.warmup, "q")}</legend>
                {(lang === "es" ? data.warmup.poll_es : data.warmup.poll_en).map((o, i) => (
                  <label key={i} className={s.pollOpt} data-on={st.poll === i || undefined}>
                    <input type="radio" name="rd-poll" checked={st.poll === i} onChange={() => update({ poll: i })} />
                    <span>{o}</span>
                  </label>
                ))}
              </fieldset>
              {st.poll !== undefined && (
                <p className={s.pollFb} role="status">
                  {(lang === "es" ? data.warmup.feedback_es : data.warmup.feedback_en)[st.poll]}
                </p>
              )}
              {noteField("n0", L(data.warmup, "note_q"))}
            </div>
          </section>

          {/* ---------- step 2: the article ---------- */}
          <section id={STEP_IDS[1]} className={sh.step} aria-labelledby="rd-s2">
            <ShellStepHead kicker={`${t.step} 2`} icon="doc" id="rd-s2" title={t.article} />
            <p className={sh.intro}>{L(data.article, "intro")}</p>
            <article className={s.article} lang="en">
              <p className={s.artMeta}>
                <span className={s.artTag}>{t.original}</span>
                <span className={s.artMin}>
                  <Icon name="clock" size={13} /> {data.article.minutes} min
                </span>
                <span lang={lang}>· {L(data.article, "based")}</span>
              </p>
              <h2 className={s.artTitle}>{data.article.title}</h2>
              <p className={s.dek}>{data.article.dek}</p>
              {data.article.blocks.map((b) => (
                <ArticleBlockView key={b.id} b={b} lang={lang} t={t} rich={rich} noteField={noteField} />
              ))}
              <footer className={s.sources} lang={lang}>
                <p className={s.kicker}>
                  <Icon name="link" size={13} /> {t.sources}
                </p>
                <ol>
                  {data.sources.map((src) => (
                    <li key={src.id} id={`rd-src-${src.id}`} lang="en">
                      <strong>{src.who}</strong>. {src.what}. {src.pub}.{" "}
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className={s.srcLink} lang={lang}>
                        <Icon name="link" size={12} /> {t.source}
                        <span className={sh.sr}> ({src.who}, {lang === "es" ? "se abre en otra pestaña" : "opens in a new tab"})</span>
                      </a>
                    </li>
                  ))}
                </ol>
                <p className={s.disc}>{t.disc}</p>
              </footer>
            </article>
          </section>

          {/* ---------- step 3: the video ---------- */}
          <section id={STEP_IDS[2]} className={sh.step} aria-labelledby="rd-s3">
            <ShellStepHead kicker={`${t.step} 3`} icon="video" id="rd-s3" title={t.video} />
            <div className={sh.card}>
              <p className={s.muted}>{L(data.video, "intro")}</p>
              <TedPlayer talk={data.video} lang={lang} t={t} big />
              <p className={s.vidCap}>
                <span>
                  <strong>{data.video.title}</strong> · {data.video.speaker}
                </span>
                <span>
                  {data.video.event} · {data.video.minutes} min{" "}
                  {data.video.source && (
                    <sup className={s.cite}>
                      <a href={`#rd-src-${data.video.source}`}>[{data.video.source}]</a>
                    </sup>
                  )}
                </span>
              </p>
              <p className={s.kicker}>{t.whileWatch}</p>
              {(lang === "es" ? data.video.prompts_es : data.video.prompts_en).map((q, i) => (
                <Fragment key={i}>{noteField(`v${i + 1}`, q)}</Fragment>
              ))}
              {data.video.extra && <ExtraTalk talk={data.video.extra} lang={lang} t={t} />}
            </div>
          </section>

          {/* ---------- step 4: the cases ---------- */}
          <section className={sh.step} aria-labelledby="rd-s4">
            <ShellStepHead kicker={`${t.step} 4`} icon="search" id="rd-s4" title={t.cases} />
            <p className={sh.intro}>{data.cases_intro[lang]}</p>
            {data.cases.map((c, ci) => (
              <CaseCard key={c.id} c={c} n={ci + 1} id={STEP_IDS[3 + ci]} lang={lang} t={t} st={st} update={update} rich={rich} noteField={noteField} />
            ))}
          </section>

          {/* ---------- step 5: wrap-up ---------- */}
          <section id={STEP_IDS[6]} className={sh.step} aria-labelledby="rd-s5">
            <ShellStepHead kicker={`${t.step} 5`} icon="flag" id="rd-s5" title={t.s6} />
            <div className={`${sh.card} ${s.wrap}`}>
              {completedAt ? (
                <div className={s.done} ref={doneRef} tabIndex={-1} role="status">
                  <span className={s.seal} aria-hidden>
                    <svg viewBox="0 0 52 52" width="64" height="64">
                      <path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className={s.doneK}>{t.doneK}</p>
                  <h3 className={s.doneH}>{t.doneH}</h3>
                  <p className={s.doneP}>{t.doneP}</p>
                  <p className={s.doneChips}>
                    <span className={s.scoreChip}>
                      <Icon name="check" size={14} /> {t.score(correct)}
                    </span>
                    {xp > 0 && <span className={s.xpChip}>{t.xp(xp)}</span>}
                  </p>
                </div>
              ) : (
                <>
                  <p className={s.muted}>{t.s6i}</p>
                  <ol className={s.mcqList}>
                    {mcq.map((m, qi) => {
                      const a = answers[qi];
                      const opts = lang === "es" ? m.o.es : m.o.en;
                      return (
                        <li key={qi} className={s.mcq}>
                          <fieldset>
                            <legend>
                              <span className={s.qn}>{qi + 1}.</span> {m.q[lang]}
                            </legend>
                            {opts.map((o, oi) => {
                              const locked = a !== null;
                              const state = !locked ? undefined : oi === m.a ? "right" : oi === a ? "wrong" : "off";
                              return (
                                <button
                                  key={oi}
                                  type="button"
                                  className={s.opt}
                                  data-state={state}
                                  aria-pressed={a === oi}
                                  aria-disabled={locked || undefined}
                                  onClick={() => {
                                    if (locked) return;
                                    const nextA = [...answers];
                                    nextA[qi] = oi;
                                    update({ mcq: nextA });
                                  }}
                                >
                                  <span className={s.letter}>{LETTERS[oi]}</span>
                                  {o}
                                </button>
                              );
                            })}
                            {a !== null && (
                              <p className={s.why} data-ok={a === m.a || undefined} role="status">
                                <Icon name={a === m.a ? "check" : "x"} size={14} />
                                {a === m.a ? m.why[lang] : t.wrong(LETTERS[m.a], opts[m.a])}
                              </p>
                            )}
                          </fieldset>
                        </li>
                      );
                    })}
                  </ol>
                  <div className={s.takeWrap}>{noteField("take", data.checkpoint.takeaway_q[lang], true, 3)}</div>
                  <div className={s.finishRow}>
                    <button type="button" className={s.finishBtn} disabled={!allAnswered || !takeOk || finishing} onClick={() => void finish()}>
                      <Icon name="check" size={16} />
                      {finishing ? t.finishing : t.finish}
                    </button>
                    <p className={s.finishNote}>{allAnswered && takeOk ? t.finishReady : t.finishNote}</p>
                  </div>
                </>
              )}
            </div>
          </section>

            <Pager lang={lang} prev={p.prev} next={p.next} label={(x) => navTitle(x, lang)} />
          </>
        }
        rail={
          <>
            <RailCard title={t.rail}>
              <RailSteps steps={t.steps} current={current} done={(i) => i <= reached} onGo={(i) => goTo(STEP_IDS[i])} />
            </RailCard>
            <RailCard title={t.notes.toUpperCase()}>
              <p className={s.railCount}>
                <strong>{written.length}</strong> {t.notesCount}
              </p>
              <button type="button" className={s.railNotesBtn} onClick={openPanel} aria-haspopup="dialog">
                <Icon name="doc" size={15} /> {t.notesB}
              </button>
              <p className={s.privLine}>
                <Icon name="lock" size={13} /> {t.priv}
              </p>
            </RailCard>
          </>
        }
      />

      {panel && <NotesPanel t={t} items={written.map((n) => ({ ...n, body: notes[n.id] }))} onClose={closePanel} onGo={goToNote} />}
      {pop && <VocabCard word={pop.word} el={pop.el} data={data} onClose={closeVocab} t={t} fontClass={montserrat.variable} />}
    </ShellPage>
  );
}

// ---------- pieces ----------

function splitTitle(title: string): [string, string] {
  const i = title.indexOf(":");
  return i < 0 ? [title, ""] : [title.slice(0, i + 1), title.slice(i + 1).trim()];
}

function findVocab(data: ReadingData, word: string) {
  const k = Object.keys(data.vocab).find((w) => w.toLowerCase() === word.toLowerCase());
  return k ? { word: k, ...data.vocab[k] } : null;
}

function NoteField({
  id,
  label,
  required,
  rows,
  value,
  onChange,
  status,
  t,
}: {
  id: string;
  label: React.ReactNode;
  required: boolean;
  rows: number;
  value: string;
  onChange: (id: string, v: string) => void;
  status?: SaveStatus;
  t: UIT;
}) {
  return (
    <div className={s.note}>
      <label htmlFor={`rd-note-${id}`} className={s.noteLabel}>
        <Icon name="pencil" size={13} />
        <span>
          {label} <span className={required ? s.badgeReq : s.badge}>{required ? t.req : t.opt}</span>
        </span>
      </label>
      <textarea
        id={`rd-note-${id}`}
        rows={rows}
        maxLength={5000}
        value={value}
        required={required}
        onChange={(e) => onChange(id, e.target.value)}
        className={s.textarea}
      />
      <p className={s.noteFoot}>
        <span>
          <Icon name="lock" size={11} /> {t.priv}
        </span>
        <span aria-live="polite" className={status === "error" ? s.saveErr : s.saveOk}>
          {status === "saving" ? t.saving : status === "saved" ? `✓ ${t.saved}` : status === "error" ? t.saveErr : ""}
        </span>
      </p>
    </div>
  );
}

function VocabWord({ word, known, open, onOpen }: { word: string; known: boolean; open: boolean; onOpen: (w: string, el: HTMLElement) => void }) {
  if (!known) return <>{word}</>;
  return (
    <button type="button" className={s.vocab} aria-expanded={open} aria-haspopup="dialog" onClick={(e) => onOpen(word, e.currentTarget)}>
      {word}
    </button>
  );
}

function VocabCard({ word, el, data, onClose, t, fontClass }: { word: string; el: HTMLElement; data: ReadingData; onClose: (focus?: boolean) => void; t: UIT; fontClass: string }) {
  const v = findVocab(data, word);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const place = () => {
      const r = el.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 28);
      const left = Math.max(14, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - width - 14));
      setPos({ top: r.bottom + window.scrollY + 10, left, width });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [el]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(true);
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !el.contains(e.target as Node)) onClose(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [el, onClose]);
  useEffect(() => {
    if (pos) ref.current?.focus();
  }, [pos]);

  if (!v || !pos) return null;
  return createPortal(
    <div ref={ref} role="dialog" aria-label={v.word} tabIndex={-1} className={`${s.pop} ${fontClass}`} style={{ top: pos.top, left: pos.left, width: pos.width }} lang="en">
      <button type="button" className={s.popClose} onClick={() => onClose(true)} aria-label={t.vocabClose}>
        <Icon name="x" size={14} />
      </button>
      <p className={s.popWord}>
        {v.word}
        {v.review && (
          <span className={s.popReview} lang={t === UI.es ? "es" : "en"}>
            {t.review}
          </span>
        )}
      </p>
      <p className={s.popEs} lang="es">
        {v.es}
      </p>
      <p className={s.popDef}>{v.d}</p>
      <p className={s.popEx}>“{v.ex}”</p>
    </div>,
    document.body,
  );
}

function Translate({ id, es, t }: { id: string; es: string; t: UIT }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={s.trBtn} aria-expanded={open} aria-controls={`rd-tr-${id}`} onClick={() => setOpen((o) => !o)} lang="es">
        <Icon name="globe" size={13} /> {open ? t.trh : t.tr}
      </button>
      {open && (
        <p id={`rd-tr-${id}`} className={s.trText} lang="es">
          {es}
        </p>
      )}
    </>
  );
}

function ArticleBlockView({
  b,
  lang,
  t,
  rich,
  noteField,
}: {
  b: ArticleBlock;
  lang: Lang;
  t: UIT;
  rich: (s: string) => React.ReactNode;
  noteField: (id: string, label: React.ReactNode, required?: boolean, rows?: number) => React.ReactNode;
}) {
  if (b.type === "para")
    return (
      <div className={s.para}>
        {b.h && <h3 className={s.artH}>{b.h}</h3>}
        <p>{rich(b.en)}</p>
        <Translate id={b.id} es={b.es} t={t} />
      </div>
    );
  if (b.type === "pause")
    return (
      <aside className={s.pause} lang={lang} aria-label={t.pause}>
        <span className={s.pauseIcon}>
          <Icon name="bulb" size={16} />
        </span>
        <div>
          <p className={s.pauseK}>{t.pause}</p>
          <p className={s.pauseQ}>{lang === "es" ? b.q_es : b.q_en}</p>
          {noteField("pause", t.myNote)}
        </div>
      </aside>
    );
  if (b.type === "habits")
    return (
      <div className={s.para}>
        <h3 className={s.artH}>{b.h}</h3>
        <ul className={s.habits}>
          {b.items.map((h, i) => (
            <li key={i} className={s.habit}>
              <span className={s.habitIcon}>
                <Icon name={h.icon} size={16} />
              </span>
              <div>
                <h4>{h.h}</h4>
                <p>{rich(h.en)}</p>
                <Translate id={`${b.id}-${i}`} es={h.es} t={t} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  return <Compare b={b} lang={lang} t={t} />;
}

function Compare({ b, lang, t }: { b: Extract<ArticleBlock, { type: "compare" }>; lang: Lang; t: UIT }) {
  const [tab, setTab] = useState<"before" | "after">("before");
  const email: Email = b[tab];
  const keyNav = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const n = tab === "before" ? "after" : "before";
      setTab(n);
      document.getElementById(`rd-tab-${n}`)?.focus();
    }
  };
  return (
    <div className={s.para} lang={lang}>
      <h3 className={s.artH}>{lang === "es" ? b.h_es : b.h_en}</h3>
      <p className={s.compareIntro}>{lang === "es" ? b.intro_es : b.intro_en}</p>
      <div className={s.compare}>
        <div role="tablist" className={s.tabs} aria-label={lang === "es" ? b.h_es : b.h_en}>
          {(["before", "after"] as const).map((k) => (
            <button
              key={k}
              id={`rd-tab-${k}`}
              role="tab"
              type="button"
              aria-selected={tab === k}
              aria-controls="rd-tabpanel"
              tabIndex={tab === k ? 0 : -1}
              onClick={() => setTab(k)}
              onKeyDown={keyNav}
              className={s.tab}
              data-k={k}
            >
              <span className={s.tabDot} />
              {k === "before" ? t.before : t.after}
            </button>
          ))}
        </div>
        <div id="rd-tabpanel" role="tabpanel" aria-labelledby={`rd-tab-${tab}`} className={s.email} data-k={tab}>
          <p className={s.emailHead} lang="en">
            <strong>To:</strong> {email.to} · <strong>Subject:</strong> {email.subject}
          </p>
          <p className={s.emailBody} lang="en">
            {email.body.map((seg, i) =>
              typeof seg === "string" ? (
                <Fragment key={i}>{seg}</Fragment>
              ) : (
                <mark key={i} className={s.mark}>
                  {seg.t}
                  <sup className={s.markN} aria-label={`(${seg.m})`}>
                    {seg.m}
                  </sup>
                </mark>
              ),
            )}
          </p>
          <ol className={s.marks}>
            {email.marks.map((m, i) => (
              <li key={i}>
                <span className={s.markN}>{i + 1}</span>
                {m[lang]}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function TedPlayer({ talk, lang, t, big }: { talk: Talk; lang: Lang; t: UIT; big?: boolean }) {
  const [on, setOn] = useState(false);
  if (on)
    return (
      <div className={s.player}>
        <iframe
          src={tedEmbed(talk.slug, lang)}
          title={`${talk.title} · ${talk.speaker} (TED)`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  return (
    <button type="button" className={`${s.player} ${s.poster}`} onClick={() => setOn(true)} data-big={big || undefined}>
      <span className={s.playCircle}>
        <Icon name="play" size={18} />
      </span>
      <span className={s.playT}>{t.play}</span>
      <span className={s.playSub}>{t.playSub}</span>
      <span className={sh.sr}>
        {" "}
        — {talk.title}, {talk.speaker}
      </span>
    </button>
  );
}

function ExtraTalk({ talk, lang, t }: { talk: Talk; lang: Lang; t: UIT }) {
  const [on, setOn] = useState(false);
  return (
    <div className={s.extra}>
      <div className={s.extraRow}>
        <span className={s.extraIcon}>
          <Icon name="play" size={13} />
        </span>
        <div className={s.extraTxt}>
          <strong>{t.extra}</strong>
          <span>
            {talk.speaker} · “{talk.title}” · {talk.event} · {talk.minutes} min{" "}
            {talk.source && (
              <sup className={s.cite}>
                <a href={`#rd-src-${talk.source}`}>[{talk.source}]</a>
              </sup>
            )}
          </span>
        </div>
        <button type="button" className={s.ghostBtn} aria-expanded={on} onClick={() => setOn((o) => !o)}>
          {on ? t.extraHide : t.extraBtn}
        </button>
      </div>
      {on && (
        <div className={s.player}>
          <iframe src={tedEmbed(talk.slug, lang)} title={`${talk.title} · ${talk.speaker} (TED)`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      )}
    </div>
  );
}

function CaseCard({
  c,
  n,
  id,
  lang,
  t,
  st,
  update,
  rich,
  noteField,
}: {
  c: ReadingCase;
  n: number;
  id: string;
  lang: Lang;
  t: UIT;
  st: ReadingState;
  update: (p: Partial<ReadingState>) => void;
  rich: (s: string) => React.ReactNode;
  noteField: (id: string, label: React.ReactNode, required?: boolean, rows?: number) => React.ReactNode;
}) {
  const [model, setModel] = useState(false);
  const a = c.activity;
  const found = st.spot_found ?? [];
  const targets = a.kind === "spot" ? a.parts.map((pp, i) => (pp.why ? i : -1)).filter((i) => i >= 0) : [];
  const title = lang === "es" ? c.title_es : c.title_en;

  const bubble = c.message && (
    <div className={s.msg}>
      <span className={s.avatar} aria-hidden>
        {c.message.from.charAt(0)}
      </span>
      <div className={s.bubble} lang="en">
        <p className={s.from}>{c.message.from}</p>
        {a.kind === "spot" ? (
          <p className={s.bubbleText}>
            “
            {a.parts.map((pp, i) =>
              pp.why ? (
                <button
                  key={i}
                  type="button"
                  className={s.phrase}
                  data-found={found.includes(i) || undefined}
                  aria-pressed={found.includes(i)}
                  onClick={() => !found.includes(i) && update({ spot_found: [...found, i] })}
                >
                  {pp.t}
                </button>
              ) : (
                <Fragment key={i}>{pp.t}</Fragment>
              ),
            )}
            ”
          </p>
        ) : (
          <p className={s.bubbleText}>“{c.message.text}”</p>
        )}
      </div>
    </div>
  );

  return (
    <article id={id} className={`${sh.card} ${s.caseCard}`} aria-labelledby={`${id}-h`}>
      <header className={s.caseHead}>
        <span className={s.caseBadge} aria-hidden>
          <small>{t.caseLab}</small>
          {n}
        </span>
        <h3 id={`${id}-h`} className={s.caseTitle}>
          <span className={sh.sr}>
            {t.caseLab} {n}:{" "}
          </span>
          {title}
        </h3>
      </header>
      <p className={s.scene} lang="en">
        {c.scene}
      </p>
      {bubble}
      {c.outcome && (
        <p className={s.outcome} data-kind={c.outcome_kind} lang="en">
          <Icon name={c.outcome_kind === "good" ? "check" : "alert"} size={15} />
          {c.outcome}
        </p>
      )}

      <div className={s.activity}>
        {a.kind === "rewrite" && (
          <>
            <p className={s.actK}>
              <Icon name="pencil" size={13} /> {t.t1}
            </p>
            <p className={s.actQ}>{lang === "es" ? a.prompt_es : a.prompt_en}</p>
            <ul className={s.hints}>
              {(lang === "es" ? a.hints_es : a.hints_en).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            {noteField(`${c.id}rw`, lang === "es" ? a.label_es : a.label_en, false, 4)}
            <button type="button" className={s.ghostBtn} aria-expanded={model} aria-controls={`${c.id}-model`} onClick={() => setModel((m) => !m)}>
              <Icon name="bulb" size={15} /> {model ? t.modelh : t.model}
            </button>
            {model && (
              <div id={`${c.id}-model`} className={s.model}>
                <p className={s.modelK}>{t.modelk}</p>
                <p lang="en">{a.model}</p>
              </div>
            )}
          </>
        )}
        {a.kind === "spot" && (
          <>
            <p className={s.actK}>
              <Icon name="search" size={13} /> {t.t2}
            </p>
            <p className={s.actQ}>{lang === "es" ? a.prompt_es : a.prompt_en}</p>
            {found.length > 0 && (
              <ul className={s.foundList}>
                {targets
                  .filter((i) => found.includes(i))
                  .map((i) => (
                    <li key={i}>
                      <Icon name="check" size={14} />
                      <span>
                        <strong lang="en">“{a.parts[i].t}”</strong> {a.parts[i].why![lang]}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            <p className={s.counter} aria-live="polite">
              {t.found(found.filter((i) => targets.includes(i)).length, targets.length)}
            </p>
          </>
        )}
        {a.kind === "choose" && (
          <>
            <p className={s.actK}>
              <Icon name="target" size={13} /> {t.t3}
            </p>
            <p className={s.actQ}>{lang === "es" ? a.prompt_es : a.prompt_en}</p>
            <div className={s.choices}>
              {a.options.map((o, i) => {
                const chosen = st.case3_choice;
                const locked = chosen !== undefined;
                const state = !locked ? undefined : o.correct ? "right" : "off";
                return (
                  <button
                    key={i}
                    type="button"
                    className={s.choice}
                    data-state={state}
                    aria-pressed={chosen === i}
                    aria-disabled={locked || undefined}
                    onClick={() => !locked && update({ case3_choice: i })}
                  >
                    <span className={s.choiceK}>
                      {lang === "es" ? o.label_es : o.label_en}
                      {chosen === i && <em> · {t.yourChoice}</em>}
                    </span>
                    <span className={s.choiceLead} lang="en">
                      {o.lead}
                    </span>
                    <span className={s.choiceText} lang="en">
                      “{rich(o.text)}”
                    </span>
                  </button>
                );
              })}
            </div>
            {st.case3_choice !== undefined && (
              <p className={s.choiceWhy} role="status">
                <Icon name={a.options[st.case3_choice]?.correct ? "check" : "alert"} size={14} /> {a.why[lang]}
              </p>
            )}
          </>
        )}
      </div>

      <p className={s.kicker}>
        <Icon name="msg" size={13} /> {t.rq}
      </p>
      {c.questions.map((q, qi) => (
        <Fragment key={qi}>{noteField(`${c.id}q${qi + 1}`, <span lang="en">{q}</span>)}</Fragment>
      ))}
    </article>
  );
}

function NotesPanel({ t, items, onClose, onGo }: { t: UIT; items: { id: string; label: string; body: string }[]; onClose: () => void; onGo: (id: string) => void }) {
  return (
    <Sheet
      title={t.notes}
      closeLabel={t.close}
      onClose={onClose}
      sub={
        <>
          <Icon name="lock" size={14} /> {t.priv}
        </>
      }
    >
      {items.length === 0 ? (
        <p className={s.sheetEmpty}>{t.nonote}</p>
      ) : (
        <ul className={s.sheetList}>
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => onGo(n.id)}>
                <span className={s.sheetK}>{plain(n.label)}</span>
                <span className={s.sheetBody}>{n.body}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
