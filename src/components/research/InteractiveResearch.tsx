"use client";

// CelsBSNS Interactive Research Task (celsu-celsbsns-research-brief.md, celsbsns-research-semana1-mockup.html): where to
// look (searches built from the student's field), how to analyze (5 lenses and a practice profile), two research cards
// that autosave, "Mis frases" (phrase_bank), and the wrap-up. It completes on its own (no coach review) through
// record_lesson_progress (finishLesson), like every lesson.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { navTitle } from "@/lib/reading";
import { countSentences, draftAnalysis, entryComplete, modelIsReal, searchFor, type Phrase, type ResearchData, type ResearchEntry } from "@/lib/research";
import { Icon, Layout, Pager, RailCard, RailSteps, Sheet, ShellPage, StepHead, StepRowText, TopBar, goTo, shell as sh, useLangPref, useScrollSpy, type Lang, type NavLink } from "@/components/bsns/shell";
import s from "./research.module.css";

type Props = {
  data: ResearchData;
  lessonId: string;
  userId: string;
  backHref: string;
  prev: NavLink;
  next: NavLink;
  writingHref: string | null;
  entries: ResearchEntry[];
  reflection: { field: string; patterns: number[]; change: string; completedAt: string | null };
  phrases: Phrase[];
  defaultLang: Lang;
};

const UI = {
  es: {
    kick: "TAREA DE INVESTIGACIÓN",
    linkB: "Ver mi correo",
    linkBn: "Ver mi Writing",
    steps: ["Dónde buscar", "Cómo analizar", "Ejemplo 1", "Ejemplo 2", "Lo que aprendí"],
    step: "PASO",
    s1: "Dónde buscar",
    s1i: "Escribe tu campo y te armamos las búsquedas. Cada botón abre la búsqueda en otra pestaña; cuando encuentres un buen ejemplo, regresa aquí.",
    field: "Tu campo o puesto",
    fieldPh: "Ej.: logistics coordinator",
    fieldP: "Busca profesionales de tu campo: así te acostumbras al vocabulario y al tono de tu carrera.",
    fieldEx: "Ejemplos:",
    fieldPh2: (x: string) => `Ej.: ${x}`,
    search: "BÚSQUEDA",
    open: "Buscar",
    newTab: "(se abre en otra pestaña)",
    tipK: "CONSEJO",
    s2: "Cómo analizar un ejemplo",
    s2i: "Para cada ejemplo vas a fijarte en estas 5 cosas. Mira cómo se hace con un perfil de práctica.",
    s2in: (n: number) => `Para cada ejemplo vas a fijarte en estas ${n} cosas. Mira cómo se hace con un ejemplo de práctica.`,
    fic: "EJEMPLO FICTICIO",
    real: "EJEMPLO REAL",
    srcL: "Ver la fuente",
    about: "ABOUT",
    modelK: "ANÁLISIS DE PRÁCTICA",
    showM: "Ver el análisis",
    hideM: "Ocultar el análisis",
    exShort: "EJ.",
    ex: (n: number) => `Ejemplo ${n}`,
    stTodo: "Por completar",
    stDone: "✓ Completo",
    type: "¿Dónde lo encontraste?",
    url: "Enlace al ejemplo",
    urlPh: "https://…",
    who: "Nombre y cargo",
    whoN: "Nombre",
    whoPh: "Ej.: Jordan Lee, Supply Chain Manager",
    qPh: ["Ej.: logística, gerente de operaciones", "", "", "Copia una frase corta en inglés", "Escribe en inglés o en español"],
    star: "Guardar en Mis frases",
    starred: "Guardada",
    cK: "TU ANÁLISIS",
    cH: (a: number, b: number) => `Escribe tu análisis en ${a}–${b} oraciones completas, en inglés. Toca “Armar un borrador” y usamos tus respuestas para empezar; después, edítalo con tus palabras.`,
    build: "Armar un borrador",
    sent: (n: number, a: number, b: number) => `${n} ${n === 1 ? "oración" : "oraciones"} · meta ${a}–${b}`,
    s5: "Lo que aprendí",
    s5i: "Compara tus 2 ejemplos. ¿Qué patrones viste en los dos?",
    change: "¿Qué vas a cambiar en tu propia presentación?",
    changeN: "¿Qué vas a aplicar de lo que encontraste?",
    cmpK: "COMPARA TUS 2 EJEMPLOS",
    cmpA: "Tu respuesta",
    opt: "OPCIONAL",
    bank: "MIS FRASES",
    bankE: "Todavía no guardas frases. Toca la estrella en cada ejemplo.",
    from: "De",
    finish: "Terminar mi investigación",
    finishing: "Guardando…",
    finN: (a: number, b: number) => `Completa los 2 ejemplos: tipo, enlace y un análisis de ${a}–${b} oraciones (sin espacios [entre corchetes] por llenar).`,
    finOk: "Todo listo para terminar.",
    doneK: "INVESTIGACIÓN COMPLETA",
    doneH: "¡Excelente trabajo!",
    doneP: (n: number) => `Analizaste 2 presentaciones reales y guardaste ${n} ${n === 1 ? "frase" : "frases"} en Mis frases. Las verás en tu Writing y en tu Capstone.`,
    donePn: (n: number) => `Analizaste tus 2 ejemplos y guardaste ${n} ${n === 1 ? "frase" : "frases"} en Mis frases. Las verás en tu Writing y en tu Capstone.`,
    doneB: "Ver Mis frases",
    rail: "TU AVANCE",
    bankR: "MIS FRASES",
    bankRp: "frases guardadas. Las encuentras en Writing y en tu Capstone.",
    mine: "Mis frases",
    dsub: "Tus frases guardadas. Aparecen en el panel “Frases útiles” de tus tareas de Writing y en tu Capstone.",
    close: "Cerrar",
    saveErr: "No se pudo guardar. Revisa tu conexión.",
    chipsAria: "Detalles de la tarea",
  },
  en: {
    kick: "RESEARCH TASK",
    linkB: "See my email",
    linkBn: "See my Writing",
    steps: ["Where to look", "How to analyze", "Example 1", "Example 2", "What I learned"],
    step: "STEP",
    s1: "Where to look",
    s1i: "Type your field and we'll build the searches for you. Each button opens the search in a new tab; when you find a good example, come back here.",
    field: "Your field or job",
    fieldPh: "E.g. logistics coordinator",
    fieldP: "Look for professionals in your field so you get used to the vocabulary and tone of your career.",
    fieldEx: "Examples:",
    fieldPh2: (x: string) => `E.g. ${x}`,
    search: "SEARCH",
    open: "Search",
    newTab: "(opens in a new tab)",
    tipK: "TIP",
    s2: "How to analyze an example",
    s2i: "For each example, you'll look at these 5 things. See how it's done with a practice profile.",
    s2in: (n: number) => `For each example, you'll look at these ${n} things. See how it's done with a practice example.`,
    fic: "FICTIONAL EXAMPLE",
    real: "REAL EXAMPLE",
    srcL: "See the source",
    about: "ABOUT",
    modelK: "PRACTICE ANALYSIS",
    showM: "See the analysis",
    hideM: "Hide the analysis",
    exShort: "EX.",
    ex: (n: number) => `Example ${n}`,
    stTodo: "To do",
    stDone: "✓ Complete",
    type: "Where did you find it?",
    url: "Link to the example",
    urlPh: "https://…",
    who: "Name and title",
    whoN: "Name",
    whoPh: "E.g. Jordan Lee, Supply Chain Manager",
    qPh: ["E.g. logistics, operations manager", "", "", "Copy a short phrase in English", "Write in English or Spanish"],
    star: "Save to My phrases",
    starred: "Saved",
    cK: "YOUR ANALYSIS",
    cH: (a: number, b: number) => `Write your analysis in ${a}–${b} complete sentences, in English. Tap “Build a draft” and we'll use your answers to get you started; then edit it in your own words.`,
    build: "Build a draft",
    sent: (n: number, a: number, b: number) => `${n} ${n === 1 ? "sentence" : "sentences"} · goal ${a}–${b}`,
    s5: "What I learned",
    s5i: "Compare your 2 examples. Which patterns did you see in both?",
    change: "What will you change in your own introduction?",
    changeN: "What will you apply from what you found?",
    cmpK: "COMPARE YOUR 2 EXAMPLES",
    cmpA: "Your answer",
    opt: "OPTIONAL",
    bank: "MY PHRASES",
    bankE: "You haven't saved any phrases yet. Tap the star in each example.",
    from: "From",
    finish: "Finish my research",
    finishing: "Saving…",
    finN: (a: number, b: number) => `Complete both examples: type, link and a ${a}–${b} sentence analysis (with no [bracket] blanks left).`,
    finOk: "All set to finish.",
    doneK: "RESEARCH COMPLETE",
    doneH: "Excellent work!",
    doneP: (n: number) => `You analyzed 2 real introductions and saved ${n} ${n === 1 ? "phrase" : "phrases"} to My phrases. You'll see them in your Writing and your Capstone.`,
    donePn: (n: number) => `You analyzed your 2 examples and saved ${n} ${n === 1 ? "phrase" : "phrases"} to My phrases. You'll see them in your Writing and your Capstone.`,
    doneB: "See My phrases",
    rail: "YOUR PROGRESS",
    bankR: "MY PHRASES",
    bankRp: "saved phrases. You'll find them in Writing and your Capstone.",
    mine: "My phrases",
    dsub: "Your saved phrases. They appear in the “Useful phrases” panel of your Writing tasks and in your Capstone.",
    close: "Close",
    saveErr: "Couldn't save. Check your connection.",
    chipsAria: "About this task",
  },
};
type UIT = (typeof UI)["es"];
const IDS = ["r0", "r1", "r2", "r3", "r4"];

export function InteractiveResearch(p: Props) {
  const { data } = p;
  const [lang, chooseLang] = useLangPref(p.userId, p.defaultLang);
  const t = UI[lang];
  const w1 = data.week === 1;
  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const db = useCallback(() => (sb.current ??= createClient()), []);
  const [saveError, setSaveError] = useState(false);

  // Opening the task counts as studying today and marks the lesson "in progress".
  useEffect(() => {
    void db().rpc("record_lesson_progress", { p_lesson: p.lessonId, p_finish: false }).then(() => undefined);
  }, [db, p.lessonId]);

  // ---------- the two research cards (autosave about 600 ms after the last change) ----------
  const [entries, setEntries] = useState<ResearchEntry[]>(p.entries);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const saveEntry = useCallback(
    async (slot: number) => {
      timers.current.delete(slot);
      const e = entriesRef.current.find((x) => x.slot === slot);
      if (!e) return;
      const { error } = await db()
        .from("research_entries")
        .upsert(
          {
            user_id: p.userId,
            lesson_id: p.lessonId,
            slot,
            source_type: e.source_type,
            url: e.url.slice(0, 600),
            who: e.who.slice(0, 200),
            field: e.field.slice(0, 200),
            share: e.share,
            tone: e.tone,
            borrow: e.borrow.slice(0, 400),
            liked: e.liked.slice(0, 2000),
            analysis: e.analysis.slice(0, 4000),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lesson_id,slot" },
        );
      setSaveError(!!error);
    },
    [db, p.userId, p.lessonId],
  );
  const patch = useCallback(
    (slot: number, change: Partial<ResearchEntry>) => {
      setEntries((cur) => cur.map((e) => (e.slot === slot ? { ...e, ...change } : e)));
      clearTimeout(timers.current.get(slot));
      timers.current.set(
        slot,
        setTimeout(() => void saveEntry(slot), 600),
      );
    },
    [saveEntry],
  );

  // ---------- reflection: field, patterns, change ----------
  const [field, setField] = useState(p.reflection.field);
  const [patterns, setPatterns] = useState<number[]>(p.reflection.patterns);
  const [change, setChange] = useState(p.reflection.change);
  const [completedAt, setCompletedAt] = useState(p.reflection.completedAt);
  const reflRef = useRef({ field, patterns, change });
  reflRef.current = { field, patterns, change };
  const reflTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRefl = useCallback(
    async (extra: { completed_at?: string } = {}) => {
      clearTimeout(reflTimer.current);
      reflTimer.current = undefined;
      const v = reflRef.current;
      const { error } = await db()
        .from("research_reflections")
        .upsert(
          { user_id: p.userId, lesson_id: p.lessonId, field: v.field.slice(0, 200), patterns: v.patterns, change: v.change.slice(0, 2000), updated_at: new Date().toISOString(), ...extra },
          { onConflict: "user_id,lesson_id" },
        );
      setSaveError(!!error);
      return !error;
    },
    [db, p.userId, p.lessonId],
  );
  const scheduleRefl = useCallback(() => {
    clearTimeout(reflTimer.current);
    reflTimer.current = setTimeout(() => void saveRefl(), 600);
  }, [saveRefl]);
  const flush = useCallback(async () => {
    const slots = [...timers.current.keys()];
    slots.forEach((k) => clearTimeout(timers.current.get(k)));
    await Promise.all([...slots.map((k) => saveEntry(k)), reflTimer.current ? saveRefl() : Promise.resolve(true)]);
  }, [saveEntry, saveRefl]);
  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  // ---------- Mis frases ----------
  const [phrases, setPhrases] = useState<Phrase[]>(p.phrases);
  const [sheet, setSheet] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openSheet = (e: React.MouseEvent<HTMLElement>) => {
    opener.current = e.currentTarget;
    setSheet(true);
  };
  const closeSheet = useCallback(() => {
    setSheet(false);
    opener.current?.focus();
  }, []);
  const starOf = (e: ResearchEntry) => phrases.find((x) => x.lesson_id === p.lessonId && x.text === e.borrow.trim()) ?? null;
  const toggleStar = async (e: ResearchEntry) => {
    const text = e.borrow.trim();
    if (!text) return document.getElementById(`rs-borrow-${e.slot}`)?.focus();
    const row = starOf(e);
    if (row) {
      const { error } = await db().from("phrase_bank").delete().eq("id", row.id);
      if (!error) setPhrases((cur) => cur.filter((x) => x.id !== row.id));
      setSaveError(!!error);
    } else {
      const { data: ins, error } = await db()
        .from("phrase_bank")
        .insert({ user_id: p.userId, text: text.slice(0, 400), source: (e.who.trim() || t.ex(e.slot)).slice(0, 200), lesson_id: p.lessonId })
        .select("id, text, source, lesson_id")
        .single();
      if (ins) setPhrases((cur) => [...cur, ins]);
      setSaveError(!!error);
    }
  };

  // ---------- draft, completion ----------
  const range = data.sentences;
  const complete = entries.map((e) => entryComplete(e, range));
  const both = complete.every(Boolean);
  const [finishing, setFinishing] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);
  const buildDraft = (e: ResearchEntry) => {
    const text = draftAnalysis(e, data);
    patch(e.slot, { analysis: text });
    requestAnimationFrame(() => {
      const a = document.getElementById(`rs-analysis-${e.slot}`) as HTMLTextAreaElement | null;
      if (!a) return;
      a.focus();
      const i = text.indexOf("[");
      if (i > -1) a.setSelectionRange(i, text.indexOf("]", i) + 1);
    });
  };
  const finish = async () => {
    if (!both || finishing) return;
    setFinishing(true);
    await flush();
    const now = new Date().toISOString();
    const ok = await saveRefl({ completed_at: now });
    if (ok) {
      await finishLesson(db(), p.userId, p.lessonId);
      setCompletedAt(now);
      requestAnimationFrame(() => doneRef.current?.focus());
    }
    setFinishing(false);
  };

  // ---------- progress, steps ----------
  const { current } = useScrollSpy(IDS);
  const done = !!completedAt;
  const seen = (i: number) => done || (i === 2 && complete[0]) || (i === 3 && complete[1]) || (i < 2 && current > i);
  const progress = done ? 1 : 0.1 + (complete[0] ? 0.35 : 0) + (complete[1] ? 0.35 : 0);
  const thisLesson = phrases.filter((x) => x.lesson_id === p.lessonId).length;

  const bankList = (
    <div className={s.bank}>
      <h3 className={s.bankH}>
        <Icon name="star" size={16} /> {t.bank}
      </h3>
      {phrases.length ? (
        <ul>
          {phrases.map((x) => (
            <li key={x.id}>
              <Icon name="star" size={17} />
              <div>
                <span lang="en">“{x.text}”</span>
                {x.source && (
                  <small>
                    {t.from}: {x.source}
                  </small>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.bankEmpty}>{t.bankE}</p>
      )}
    </div>
  );

  return (
    <ShellPage lang={lang} className={s.root}>
      <TopBar
        week={data.week}
        kind="RESEARCH"
        title={`${data.hero.title_a} ${data.hero.title_b}`}
        backHref={p.backHref}
        lang={lang}
        onLang={chooseLang}
        progress={progress}
        row={
          <>
            <StepRowText lang={lang} n={current + 1} total={IDS.length} name={t.steps[current]} />
            <button type="button" className={s.mobBank} onClick={openSheet} aria-haspopup="dialog">
              <Icon name="star" size={16} />
              {t.mine} ({phrases.length})
            </button>
          </>
        }
      />
      <Layout
        railLabel={t.rail}
        main={
          <>
            {/* ---------- hero ---------- */}
            <section className={sh.hero} aria-labelledby="rs-title">
              <p className={sh.pill}>
                <Icon name="search" size={16} />
                {t.kick}
              </p>
              <h1 id="rs-title" className={sh.heroTitle} lang="en">
                {data.hero.title_a} <em>{data.hero.title_b}</em>
              </h1>
              <p className={sh.heroIntro}>{lang === "es" ? data.hero.intro_es : data.hero.intro_en}</p>
              <ul className={sh.chips} aria-label={t.chipsAria}>
                {(lang === "es" ? data.hero.chips_es : data.hero.chips_en).map((chip, i) => (
                  <li key={chip}>
                    <Icon name={(["clock", "search", "pen", "star"] as const)[i] ?? "doc"} size={18} />
                    {chip}
                  </li>
                ))}
              </ul>
              <div className={s.linkW}>
                <span className={s.linkI}>
                  <Icon name="mail" size={20} />
                </span>
                <p>
                  <strong>{data.hero.link_b[lang]}</strong> {data.hero.link_p[lang]}
                </p>
                {p.writingHref && (
                  <Link href={p.writingHref} className={s.btnGl}>
                    <Icon name="eye" size={18} />
                    {w1 ? t.linkB : t.linkBn}
                  </Link>
                )}
              </div>
            </section>

            {/* ---------- step 1: where to look ---------- */}
            <section id="r0" className={sh.step} aria-labelledby="rs-s1">
              <StepHead kicker={`${t.step} 1`} icon="search" id="rs-s1" title={t.s1} />
              <p className={sh.intro}>{t.s1i}</p>
              <div className={sh.card}>
                <div className={s.fieldbox}>
                  <div>
                    <label htmlFor="rs-field">{data.field_label ? data.field_label[lang] : t.field}</label>
                    <input
                      id="rs-field"
                      value={field}
                      maxLength={200}
                      placeholder={w1 ? t.fieldPh : t.fieldPh2(data.field_examples?.join(", ") ?? data.default_field)}
                      lang="en"
                      onChange={(e) => {
                        setField(e.target.value);
                        scheduleRefl();
                      }}
                    />
                  </div>
                  {w1 ? (
                    <p>{t.fieldP}</p>
                  ) : data.field_examples?.length ? (
                    <p className={s.fieldEx}>
                      {t.fieldEx}
                      {data.field_examples.map((x) => (
                        <button
                          key={x}
                          type="button"
                          lang="en"
                          aria-pressed={field === x}
                          onClick={() => {
                            setField(x);
                            scheduleRefl();
                          }}
                        >
                          {x}
                        </button>
                      ))}
                    </p>
                  ) : (
                    <p>{data.tip[lang]}</p>
                  )}
                </div>
                <ul className={s.srcs}>
                  {data.sources.map((src) => {
                    const q = searchFor(src, field, data.default_field);
                    const label = lang === "es" ? src.label_es : src.label_en;
                    return (
                      <li key={src.key} className={s.src}>
                        <div className={s.srcTop}>
                          <span className={s.srcLg} style={{ background: src.color }} aria-hidden>
                            {src.mark}
                          </span>
                          <h3>{label}</h3>
                        </div>
                        <p>{lang === "es" ? src.desc_es : src.desc_en}</p>
                        <p className={s.q2}>
                          <span>{t.search}</span>
                          <span lang="en">{q.shown}</span>
                        </p>
                        <a href={q.url} target="_blank" rel="noopener noreferrer" className={s.btnO}>
                          <Icon name="link" size={18} />
                          {t.open}
                          <span className={sh.sr}>
                            {" "}
                            {label} {t.newTab}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
                <div className={s.tip}>
                  <span className={s.tipI}>
                    <Icon name="bulb" size={20} />
                  </span>
                  <p>
                    <strong>{t.tipK}</strong>
                    {data.tip[lang]}
                  </p>
                </div>
              </div>
            </section>

            {/* ---------- step 2: how to analyze ---------- */}
            <ModelSection data={data} lang={lang} t={t} />

            {/* ---------- steps 3–4: the two examples ---------- */}
            {entries.map((e, i) => (
              <ExampleCard
                key={e.slot}
                e={e}
                i={i}
                data={data}
                lang={lang}
                t={t}
                complete={complete[i]}
                starred={!!starOf(e)}
                onPatch={(c) => patch(e.slot, c)}
                onStar={() => void toggleStar(e)}
                onDraft={() => buildDraft(e)}
              />
            ))}

            {/* ---------- step 5: what I learned ---------- */}
            <section id="r4" className={sh.step} aria-labelledby="rs-s5">
              <StepHead kicker={`${t.step} 5`} icon="flag" id="rs-s5" title={t.s5} />
              <div className={sh.card}>
                {done ? (
                  <div className={s.findone} ref={doneRef} tabIndex={-1} role="status">
                    <span className={s.seal} aria-hidden>
                      <svg viewBox="0 0 24 24" width="44" height="44">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <p className={s.doneK}>{t.doneK}</p>
                    <h3 className={s.doneH}>{t.doneH}</h3>
                    <p className={s.doneP}>{w1 ? t.doneP(thisLesson) : t.donePn(thisLesson)}</p>
                    {data.share_next && <p className={s.shareNext}>{data.share_next[lang]}</p>}
                    <button type="button" className={s.btnG} onClick={openSheet} aria-haspopup="dialog">
                      <Icon name="star" size={18} />
                      {t.doneB}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className={sh.intro}>{t.s5i}</p>
                    <ul className={s.pats}>
                      {data.patterns[lang].map((pt, j) => (
                        <li key={j}>
                          <button
                            type="button"
                            aria-pressed={patterns.includes(j)}
                            onClick={() => {
                              setPatterns((cur) => (cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j].sort()));
                              scheduleRefl();
                            }}
                          >
                            <i aria-hidden>
                              <Icon name="check" size={15} />
                            </i>
                            {pt}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {data.compare_q && data.compare_q[lang].length > 0 && (
                      <div className={s.cmpQ}>
                        <p className={s.lb}>{t.cmpK}</p>
                        <ol>
                          {data.compare_q[lang].map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    <div className={s.grp}>
                      <label htmlFor="rs-change" className={s.lb}>
                        {data.compare_q ? t.cmpA : w1 ? t.change : t.changeN} <span className={s.optB}>{t.opt}</span>
                      </label>
                      <textarea
                        id="rs-change"
                        className={s.inp}
                        value={change}
                        maxLength={2000}
                        onChange={(e) => {
                          setChange(e.target.value);
                          scheduleRefl();
                        }}
                      />
                    </div>
                    {data.share_next && <p className={s.shareNext}>{data.share_next[lang]}</p>}
                    {bankList}
                    <div className={s.finish}>
                      <button type="button" className={s.btnP} disabled={!both || finishing} onClick={() => void finish()}>
                        <Icon name="check" size={18} />
                        {finishing ? t.finishing : t.finish}
                      </button>
                      <p aria-live="polite">{both ? t.finOk : t.finN(data.sentences.min, data.sentences.max)}</p>
                    </div>
                  </>
                )}
                {saveError && (
                  <p className={s.err} role="alert">
                    {t.saveErr}
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
              <RailSteps steps={t.steps} current={current} done={seen} onGo={(i) => goTo(IDS[i])} />
            </RailCard>
            <RailCard title={t.bankR}>
              <p className={s.bankRow}>
                <strong>{phrases.length}</strong> {t.bankRp}
              </p>
              <button type="button" className={s.bankBtn} onClick={openSheet} aria-haspopup="dialog">
                <Icon name="star" size={16} />
                {t.doneB}
              </button>
            </RailCard>
          </>
        }
      />
      {sheet && (
        <Sheet title={t.mine} sub={t.dsub} closeLabel={t.close} onClose={closeSheet}>
          {bankList}
        </Sheet>
      )}
    </ShellPage>
  );
}

function ModelSection({ data, lang, t }: { data: ResearchData; lang: Lang; t: UIT }) {
  const [show, setShow] = useState(false);
  return (
    <section id="r1" className={sh.step} aria-labelledby="rs-s2">
      <StepHead kicker={`${t.step} 2`} icon="book" id="rs-s2" title={t.s2} />
      <p className={sh.intro}>{data.week === 1 ? t.s2i : t.s2in(data.lenses.length)}</p>
      <ol className={s.lenses}>
        {data.lenses.map((l, i) => (
          <li key={i} className={s.lens} style={{ "--c": l.color } as React.CSSProperties}>
            <b aria-hidden>{i + 1}</b>
            {l[lang]}
          </li>
        ))}
      </ol>
      <div className={`${sh.card} ${s.model}`}>
        <div className={s.prof}>
          <span className={s.ph} aria-hidden>
            {data.model.initials}
          </span>
          <div className={s.profTxt}>
            <p className={s.nm}>
              {data.model.name}
              <span className={s.fic} data-real={modelIsReal(data) || undefined}>
                {modelIsReal(data) ? t.real : t.fic}
              </span>
            </p>
            <p className={s.rl}>{data.model.role}</p>
            <div className={s.about}>
              <small>{t.about}</small>
              <p lang="en">{data.model.about}</p>
            </div>
            {data.model.source_url && (
              <a className={s.srcLink} href={data.model.source_url} target="_blank" rel="noopener noreferrer">
                <Icon name="link" size={15} />
                {t.srcL}
              </a>
            )}
          </div>
        </div>
        <div className={s.mrow}>
          <p className={s.mrowK}>{t.modelK}</p>
          <button type="button" className={s.btnO} aria-expanded={show} aria-controls="rs-mans" onClick={() => setShow((v) => !v)}>
            <Icon name="eye" size={18} />
            {show ? t.hideM : t.showM}
          </button>
        </div>
        {show && (
          <ol id="rs-mans" className={s.mans}>
            {data.model.answers[lang].map((m, i) => (
              <li key={i} style={{ "--c": data.lenses[i]?.color } as React.CSSProperties}>
                <i aria-hidden>{i + 1}</i>
                <span>
                  <b>{data.lenses[i]?.[lang].toUpperCase()}</b>
                  {m}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function ExampleCard({
  e,
  i,
  data,
  lang,
  t,
  complete,
  starred,
  onPatch,
  onStar,
  onDraft,
}: {
  e: ResearchEntry;
  i: number;
  data: ResearchData;
  lang: Lang;
  t: UIT;
  complete: boolean;
  starred: boolean;
  onPatch: (c: Partial<ResearchEntry>) => void;
  onStar: () => void;
  onDraft: () => void;
}) {
  const n = countSentences(e.analysis);
  const q = data.questions[lang];
  const id = (k: string) => `rs-${k}-${e.slot}`;
  const toggle = (key: "share" | "tone", j: number) => onPatch({ [key]: e[key].includes(j) ? e[key].filter((x) => x !== j) : [...e[key], j].sort() });
  const lens = (k: number) => ({ "--c": data.lenses[k]?.color }) as React.CSSProperties;
  return (
    <section id={`r${i + 2}`} className={sh.step} aria-labelledby={id("h")}>
      <div className={`${sh.card} ${s.exk}`} data-done={complete || undefined}>
        <div className={s.exhead}>
          <span className={s.exN} aria-hidden>
            <small>{t.exShort}</small>
            {i + 1}
          </span>
          <div>
            <p className={sh.stepK}>
              {t.step} {i + 3}
            </p>
            <h2 id={id("h")} className={s.exTitle}>
              {t.ex(i + 1)}
            </h2>
          </div>
          <span className={s.stt} aria-live="polite">
            {complete ? t.stDone : t.stTodo}
          </span>
        </div>

        <div className={s.grp} role="group" aria-labelledby={id("type")}>
          <p id={id("type")} className={s.lb}>
            {t.type}
          </p>
          <div className={s.tchips}>
            {data.types.map((ty) => (
              <button key={ty.key} type="button" aria-pressed={e.source_type === ty.key} onClick={() => onPatch({ source_type: ty.key })}>
                {ty[lang]}
              </button>
            ))}
          </div>
        </div>
        <div className={s.two}>
          <div className={s.grp}>
            <label htmlFor={id("url")} className={s.lb}>
              <Icon name="link" size={18} className={s.lbIcon} />
              {t.url}
            </label>
            <input id={id("url")} className={s.inp} type="url" inputMode="url" value={e.url} placeholder={t.urlPh} maxLength={600} onChange={(x) => onPatch({ url: x.target.value })} />
          </div>
          <div className={s.grp}>
            <label htmlFor={id("who")} className={s.lb}>
              {data.week === 1 ? t.who : t.whoN}
            </label>
            <input id={id("who")} className={s.inp} value={e.who} placeholder={data.week === 1 ? t.whoPh : ""} maxLength={200} onChange={(x) => onPatch({ who: x.target.value })} />
          </div>
        </div>
        <div className={s.grp} style={lens(0)}>
          <label htmlFor={id("field")} className={s.lb}>
            <i aria-hidden>1</i>
            {q[0]}
          </label>
          <input id={id("field")} className={s.inp} value={e.field} placeholder={data.week === 1 ? t.qPh[0] : ""} maxLength={200} onChange={(x) => onPatch({ field: x.target.value })} />
        </div>
        <div className={s.grp} style={lens(1)} role="group" aria-labelledby={id("share")}>
          <p id={id("share")} className={s.lb}>
            <i aria-hidden>2</i>
            {q[1]}
          </p>
          <div className={s.tchips}>
            {data.share_options[lang].map((o, j) => (
              <button key={j} type="button" aria-pressed={e.share.includes(j)} onClick={() => toggle("share", j)}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className={s.grp} style={lens(2)} role="group" aria-labelledby={id("tone")}>
          <p id={id("tone")} className={s.lb}>
            <i aria-hidden>3</i>
            {q[2]}
          </p>
          <div className={s.tchips}>
            {data.tone_options[lang].map((o, j) => (
              <button key={j} type="button" aria-pressed={e.tone.includes(j)} onClick={() => toggle("tone", j)}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className={s.grp} style={lens(3)}>
          <label htmlFor={id("borrow")} className={s.lb}>
            <i aria-hidden>4</i>
            {q[3]}
          </label>
          <div className={s.borrow}>
            <input id={id("borrow")} className={s.inp} value={e.borrow} placeholder={t.qPh[3]} lang="en" maxLength={400} onChange={(x) => onPatch({ borrow: x.target.value })} />
            <button type="button" className={s.starb} aria-pressed={starred} onClick={onStar}>
              <Icon name="star" size={18} />
              {starred ? t.starred : t.star}
            </button>
          </div>
        </div>
        <div className={s.grp} style={lens(4)}>
          <label htmlFor={id("liked")} className={s.lb}>
            <i aria-hidden>5</i>
            {q[4]}
          </label>
          <textarea id={id("liked")} className={s.inp} value={e.liked} placeholder={t.qPh[4]} maxLength={2000} onChange={(x) => onPatch({ liked: x.target.value })} />
        </div>
        <div className={s.compose}>
          <p className={s.tk}>
            <Icon name="pen" size={16} /> {t.cK}
          </p>
          <p className={s.h} id={id("ah")}>
            {t.cH(data.sentences.min, data.sentences.max)}
          </p>
          <textarea
            id={id("analysis")}
            className={s.inp}
            value={e.analysis}
            lang="en"
            maxLength={4000}
            aria-labelledby={id("ah")}
            onChange={(x) => onPatch({ analysis: x.target.value })}
          />
          <div className={s.sc}>
            <button type="button" className={s.btnS} onClick={onDraft}>
              <Icon name="spark" size={18} />
              {t.build}
            </button>
            <span className={s.cnt} data-k={n >= data.sentences.min && n <= data.sentences.max ? "ok" : n > data.sentences.max ? "over" : undefined}>
              {t.sent(n, data.sentences.min, data.sentences.max)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
