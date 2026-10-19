"use client";

// CelsBSNS Interactive Writing Task (celsu-celsbsns-writing-brief.md, celsbsns-writing-semana1-mockup.html): the 6
// colored parts, the original template email with "Ver las partes", an email composer that autosaves as a draft
// submission, the self-check and automatic format checks (no AI), "Enviar a mi coach", the coach's feedback, and
// "Agregar a mi Capstone". Sending marks the lesson complete through record_lesson_progress (finishLesson).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { navTitle } from "@/lib/reading";
import { CAPSTONE_PARTS, emailToBackground, partBody } from "@/lib/capstone";
import { countWords, formatChecks, fullEmail, type HistoryEntry, type Lang, type SubmissionStatus, type WritingData, type WritingSubmission } from "@/lib/writing";
import { Icon, Layout, Pager, RailCard, RailSteps, ShellPage, StepHead, StepRowText, TopBar, goTo, shell as sh, useLangPref, useScrollSpy, type NavLink } from "@/components/bsns/shell";
import s from "./writing.module.css";

type Props = {
  data: WritingData;
  lessonId: string;
  courseId: string;
  userId: string;
  backHref: string;
  prev: NavLink;
  next: NavLink;
  sub: WritingSubmission | null;
  capstoneSaved: boolean;
  coachName: string | null;
  reviewerName: string | null;
  myPhrases: string[];
  defaultLang: Lang;
};

const UI = {
  es: {
    kick: "TAREA DE ESCRITURA",
    scK: "EL ESCENARIO",
    steps: ["La tarea", "El ejemplo", "Escribe tu correo", "Revisa y entrega"],
    step: "PASO",
    s1: "Lo que debe incluir tu correo",
    s1i: "Tu correo debe tener estas 6 partes. Cada una tiene su color: lo verás en el ejemplo y en tu revisión.",
    forEx: "POR EJEMPLO",
    ex: "Mira un ejemplo",
    exi: "Activa “Ver las partes” para ver dónde está cada una de las 6 partes.",
    exL: "EJEMPLO · PLANTILLA DE GUÍA",
    showP: "Ver las partes",
    w: "Escribe tu correo",
    wi: "Escribe aquí mismo. Se guarda solo. Usa las frases útiles si te ayudan: tócalas y se agregan donde está tu cursor.",
    to: "Para",
    subj: "Asunto",
    subjPh: "Introduction – Tu nombre",
    bodyPh: "Dear Team,\n\nMy name is…",
    body: "Tu correo",
    wc: "Palabras",
    range: (a: number, b: number) => `Meta: ${a}–${b}`,
    phr: "FRASES ÚTILES",
    phrP: "Elige una parte y toca una frase.",
    phrAdd: (p: string) => `Agregar: ${p}`,
    mine: "Mis frases",
    r: "Revisa y entrega",
    ri: "Antes de enviarlo, confirma que tu correo tiene todo.",
    selfH: "MI CORREO INCLUYE…",
    autoH: "FORMATO",
    au: [
      ["Asunto escrito", "Ej.: "],
      ["Entre {a} y {b} palabras", ""],
      ["Párrafos separados", "Al menos 3 párrafos"],
      ["Sin viñetas ni emojis", ""],
    ],
    sendB: "Enviar a mi coach",
    sending: "Enviando…",
    missing: "Para enviar falta:",
    miss: { subject: "el asunto", range: (a: number, b: number) => `${a}–${b} palabras`, clean: "quitar viñetas o emojis", parts: (n: number) => `confirmar ${n} ${n === 1 ? "parte" : "partes"}` },
    sendOk: "Todo listo. Tu coach lo revisa en menos de 48 h.",
    sentH: "¡Enviado a tu coach!",
    sentP: (n: string) => `${n} lo revisará en menos de 48 h. Te avisamos cuando tenga comentarios.`,
    yourCoach: "Tu coach",
    yourCoachL: "tu coach",
    st: ["Enviado", "En revisión", "Comentarios"],
    within: "Menos de 48 h",
    yourMail: "TU CORREO ENVIADO",
    version: (n: number) => `VERSIÓN ${n}`,
    fbK: "COMENTARIOS",
    revH: "Tu coach revisó tu correo",
    revP: "Lee sus comentarios y agrega tu correo a tu Capstone.",
    revWhen: (w: string) => `Tu coach · revisó ${w}`,
    good: "LO QUE HICISTE BIEN",
    grow: "PARA MEJORAR",
    capB: (n: number) => `Agregar a mi Capstone · Parte ${n}`,
    capDone: (n: number, t: string) => `Guardado en tu Capstone · Parte ${n}: ${t}`,
    toast: (n: number) => `Guardado en tu Capstone · Parte ${n}`,
    redo: "Mejorar y volver a enviar",
    rail: "TU AVANCE",
    stat: "ESTADO",
    stD: "Borrador",
    stS: "Con tu coach",
    stR: "Revisada",
    stDp: "Se guarda solo mientras escribes.",
    stSp: "Tu coach responde en menos de 48 h.",
    stRp: "Ya tienes comentarios de tu coach.",
    saving: "Guardando…",
    saved: "Guardado",
    saveErr: "No se pudo guardar",
    err: "No se pudo completar. Revisa tu conexión e inténtalo de nuevo.",
    today: "hoy",
    yesterday: "ayer",
    chipsAria: "Detalles de la tarea",
  },
  en: {
    kick: "WRITING TASK",
    scK: "THE SCENARIO",
    steps: ["The task", "The example", "Write your email", "Review and submit"],
    step: "STEP",
    s1: "What your email must include",
    s1i: "Your email needs these 6 parts. Each one has its own color: you'll see it in the example and in your review.",
    forEx: "FOR EXAMPLE",
    ex: "See an example",
    exi: "Turn on “Show the parts” to see where each of the 6 parts is.",
    exL: "EXAMPLE · TEMPLATE FOR GUIDANCE",
    showP: "Show the parts",
    w: "Write your email",
    wi: "Write right here. It saves automatically. Use the useful phrases if they help: tap one and it's added where your cursor is.",
    to: "To",
    subj: "Subject",
    subjPh: "Introduction – Your name",
    bodyPh: "Dear Team,\n\nMy name is…",
    body: "Your email",
    wc: "Words",
    range: (a: number, b: number) => `Goal: ${a}–${b}`,
    phr: "USEFUL PHRASES",
    phrP: "Pick a part and tap a phrase.",
    phrAdd: (p: string) => `Add: ${p}`,
    mine: "My phrases",
    r: "Review and submit",
    ri: "Before you send it, confirm your email has everything.",
    selfH: "MY EMAIL INCLUDES…",
    autoH: "FORMAT",
    au: [
      ["Subject line", "E.g. "],
      ["Between {a} and {b} words", ""],
      ["Separate paragraphs", "At least 3 paragraphs"],
      ["No bullet points or emojis", ""],
    ],
    sendB: "Send to my coach",
    sending: "Sending…",
    missing: "Still needed:",
    miss: { subject: "a subject", range: (a: number, b: number) => `${a}–${b} words`, clean: "remove bullets or emojis", parts: (n: number) => `confirm ${n} ${n === 1 ? "part" : "parts"}` },
    sendOk: "All set. Your coach reviews it within 48 h.",
    sentH: "Sent to your coach!",
    sentP: (n: string) => `${n} will review it within 48 h. We'll let you know when there's feedback.`,
    yourCoach: "Your coach",
    yourCoachL: "your coach",
    st: ["Sent", "In review", "Feedback"],
    within: "Within 48 h",
    yourMail: "YOUR SENT EMAIL",
    version: (n: number) => `VERSION ${n}`,
    fbK: "FEEDBACK",
    revH: "Your coach reviewed your email",
    revP: "Read the feedback and add your email to your Capstone.",
    revWhen: (w: string) => `Your coach · reviewed ${w}`,
    good: "WHAT YOU DID WELL",
    grow: "TO IMPROVE",
    capB: (n: number) => `Add to my Capstone · Part ${n}`,
    capDone: (n: number, t: string) => `Saved to your Capstone · Part ${n}: ${t}`,
    toast: (n: number) => `Saved to your Capstone · Part ${n}`,
    redo: "Improve and resend",
    rail: "YOUR PROGRESS",
    stat: "STATUS",
    stD: "Draft",
    stS: "With your coach",
    stR: "Reviewed",
    stDp: "Saves automatically as you write.",
    stSp: "Your coach replies within 48 h.",
    stRp: "Your coach's feedback is ready.",
    saving: "Saving…",
    saved: "Saved",
    saveErr: "Couldn't save",
    err: "That didn't work. Check your connection and try again.",
    today: "today",
    yesterday: "yesterday",
    chipsAria: "About this task",
  },
};
type UIT = (typeof UI)["es"];
const IDS = ["w0", "w1", "w2", "w3"];
/** The "★ Mis frases" tab, after the part tabs. */
const MINE = 99;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "C";

export function InteractiveWriting(p: Props) {
  const { data } = p;
  const [lang, chooseLang] = useLangPref(p.userId, p.defaultLang);
  const t = UI[lang];
  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const db = useCallback(() => (sb.current ??= createClient()), []);

  // Opening the task counts as studying today and marks the lesson "in progress".
  useEffect(() => {
    // Query builders only run when awaited or then()-ed.
    void db().rpc("record_lesson_progress", { p_lesson: p.lessonId, p_finish: false }).then(() => undefined);
  }, [db, p.lessonId]);

  // Dates are formatted after mount (the student's own time zone; no server/client mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [subId, setSubId] = useState(p.sub?.id ?? null);
  const [status, setStatus] = useState<SubmissionStatus>(p.sub?.status ?? "draft");
  const [subject, setSubject] = useState(p.sub?.subject ?? "");
  const [body, setBody] = useState(p.sub?.body ?? "");
  const [self, setSelf] = useState<number[]>(p.sub?.parts_confirmed ?? []);
  const [version, setVersion] = useState(p.sub?.version ?? 1);
  const [history, setHistory] = useState<HistoryEntry[]>(p.sub?.history ?? []);
  const [submittedAt, setSubmittedAt] = useState(p.sub?.submitted_at ?? null);
  const [capSaved, setCapSaved] = useState(p.capstoneSaved);
  const [save, setSave] = useState<"saving" | "saved" | "error" | null>(p.sub ? "saved" : null);
  const [busy, setBusy] = useState<"send" | "cap" | "redo" | null>(null);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState(false);
  const [showParts, setShowParts] = useState(false);
  const [tab, setTab] = useState(0);
  const sentState = status !== "draft";

  // ---------- autosave (about 600 ms after typing stops), as a draft submission ----------
  const latest = useRef({ subject, body, self });
  latest.current = { subject, body, self };
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveNow = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setSave("saving");
    const v = latest.current;
    const { data: row, error: e } = await db()
      .from("submissions")
      .upsert(
        { user_id: p.userId, lesson_id: p.lessonId, subject: v.subject.slice(0, 200), body: v.body, parts_confirmed: v.self, status: "draft" },
        { onConflict: "user_id,lesson_id" },
      )
      .select("id")
      .single();
    if (row) setSubId(row.id);
    setSave(e ? "error" : "saved");
    return !e;
  }, [db, p.userId, p.lessonId]);
  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), 600);
  }, [saveNow]);
  useEffect(() => {
    const flush = () => {
      if (timer.current) void saveNow();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [saveNow]);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const insertPhrase = (phrase: string) => {
    const el = bodyRef.current;
    const v = el?.value ?? body;
    const start = el?.selectionStart ?? v.length;
    const end = el?.selectionEnd ?? start;
    const pre = v.slice(0, start);
    const rest = v.slice(end);
    const add = (pre && !/\s$/.test(pre) ? " " : "") + phrase + (rest && !/^\s/.test(rest) ? " " : "");
    const next = pre + add + rest;
    setBody(next);
    schedule();
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = start + add.length;
    });
  };
  const toggleSelf = (i: number) => {
    setSelf((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()));
    schedule();
  };

  // ---------- checks ----------
  const c = formatChecks(subject, body, data.words);
  const allParts = data.parts.every((_, i) => self.includes(i));
  const canSend = c.subject && c.range && c.clean && allParts;
  const missing = [
    !c.subject && t.miss.subject,
    !c.range && t.miss.range(data.words.min, data.words.max),
    !c.clean && t.miss.clean,
    !allParts && t.miss.parts(data.parts.length - self.length),
  ].filter(Boolean) as string[];

  // ---------- send / improve / Capstone ----------
  const send = async () => {
    if (!canSend || busy) return;
    setBusy("send");
    setError(false);
    const ok = await saveNow();
    const nextVersion = history.length + 1;
    const { data: row, error: e } = ok
      ? await db().from("submissions").update({ status: "submitted", version: nextVersion }).eq("user_id", p.userId).eq("lesson_id", p.lessonId).select("id, submitted_at").single()
      : { data: null, error: true };
    if (e || !row) {
      setBusy(null);
      return setError(true);
    }
    await finishLesson(db(), p.userId, p.lessonId);
    setSubId(row.id);
    setVersion(nextVersion);
    setSubmittedAt(row.submitted_at);
    setStatus("submitted");
    setBusy(null);
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };
  const improve = async () => {
    if (busy || !p.sub) return;
    setBusy("redo");
    setError(false);
    const entry: HistoryEntry = {
      version,
      subject,
      body,
      submitted_at: submittedAt,
      reviewed_at: p.sub.reviewed_at,
      reviewed_by: p.sub.reviewed_by,
      coach_good: p.sub.coach_good,
      coach_improve: p.sub.coach_improve,
      coach_message: p.sub.coach_message ?? p.sub.coach_feedback,
    };
    // reviewed → draft: guard_submission appends the reviewed version to history and clears the coach fields
    // server side (students can't write them); the returned history replaces the local guess.
    const { data: row, error: e } = await db()
      .from("submissions")
      .update({ status: "draft" })
      .eq("user_id", p.userId)
      .eq("lesson_id", p.lessonId)
      .select("history")
      .maybeSingle();
    setBusy(null);
    if (e || !row) return setError(true);
    setHistory(Array.isArray(row.history) ? (row.history as unknown as HistoryEntry[]) : [...history, entry]);
    setStatus("draft");
    setCapSaved(false);
    requestAnimationFrame(() => goTo("w2"));
  };
  const addToCapstone = async () => {
    if (busy || !subId) return;
    setBusy("cap");
    setError(false);
    // The email body goes into the part's "Tu experiencia profesional" field (fields.bg), keeping what the student
    // already wrote in the other fields on the Capstone page; body mirrors the fields as plain text.
    const { data: cur } = await db()
      .from("capstone_parts")
      .select("fields, sources")
      .eq("user_id", p.userId)
      .eq("course_id", p.courseId)
      .eq("part", data.capstone_part)
      .maybeSingle();
    const obj = (x: unknown) => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, string>) : {});
    const fields = { ...obj(cur?.fields), bg: emailToBackground(body) };
    const def = CAPSTONE_PARTS.find((c) => c.part === data.capstone_part);
    const { error: e } = await db()
      .from("capstone_parts")
      .upsert(
        {
          user_id: p.userId,
          course_id: p.courseId,
          part: data.capstone_part,
          source_submission_id: subId,
          title: data.capstone_title.es,
          fields,
          sources: { ...obj(cur?.sources), submission: subId },
          body: def ? partBody(def, fields) : fullEmail(subject, body),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,course_id,part" },
      );
    setBusy(null);
    if (e) return setError(true);
    setCapSaved(true);
    setToast(true);
    setTimeout(() => setToast(false), 2600);
  };

  // ---------- progress, step row ----------
  const visibleIds = sentState ? ["w3"] : IDS;
  const { current: spyIdx } = useScrollSpy(visibleIds);
  const current = sentState ? 3 : spyIdx;
  const progress = status === "reviewed" ? 1 : status === "submitted" ? 0.85 : Math.min(0.8, (c.words / data.words.min) * 0.5 + self.length * 0.05);
  const stLabel = status === "draft" ? t.stD : status === "submitted" ? t.stS : t.stR;
  const stKind = status === "draft" ? "draft" : status === "submitted" ? "sent" : "rev";
  const stIcon = status === "draft" ? "pen" : status === "submitted" ? "clock" : "check";

  const when = useCallback(
    (iso: string | null, withDay = true) => {
      if (!iso || !mounted) return "";
      const d = new Date(iso);
      const time = d.toLocaleTimeString(lang === "es" ? "es-MX" : "en-US", { hour: "numeric", minute: "2-digit" });
      const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
      const day = days === 0 ? t.today : days === 1 ? t.yesterday : d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short" });
      return withDay ? `${day}, ${time}` : time;
    },
    [mounted, lang, t],
  );
  const coach = p.coachName;
  const reviewer = p.reviewerName ?? null;

  return (
    <ShellPage lang={lang} className={s.root}>
      <TopBar
        week={data.week}
        kind="WRITING"
        title={`${data.hero.title_a} ${data.hero.title_b}`}
        backHref={p.backHref}
        lang={lang}
        onLang={chooseLang}
        progress={progress}
        row={
          <>
            <StepRowText lang={lang} n={current + 1} total={4} name={t.steps[current]} />
            <span className={s.stPill} data-k={stKind}>
              {stLabel}
            </span>
          </>
        }
      />
      <Layout
        railLabel={t.rail}
        main={
          <>
            {/* ---------- hero ---------- */}
            <section className={sh.hero} aria-labelledby="wr-title">
              <p className={sh.pill}>
                <Icon name="pen" size={16} />
                {t.kick}
              </p>
              <h1 id="wr-title" className={sh.heroTitle} lang="en">
                {data.hero.title_a} <em>{data.hero.title_b}</em>
              </h1>
              <p className={sh.heroIntro}>{lang === "es" ? data.hero.intro_es : data.hero.intro_en}</p>
              <ul className={sh.chips} aria-label={t.chipsAria}>
                {(lang === "es" ? data.hero.chips_es : data.hero.chips_en).map((chip, i) => (
                  <li key={chip}>
                    <Icon name={(["clock", "para", "chat", "trophy"] as const)[i] ?? "doc"} size={18} />
                    {chip}
                  </li>
                ))}
              </ul>
              <div className={s.scen}>
                <span className={s.scenAv} aria-hidden>
                  {data.scenario.initials}
                </span>
                <div>
                  <p className={s.scenK}>
                    {t.scK} · {data.scenario.from.toUpperCase()}, {(lang === "es" ? data.scenario.role_es : data.scenario.role_en).toUpperCase()}
                  </p>
                  <p className={s.scenQ} lang="en">
                    “{data.scenario.quote}”
                  </p>
                  <p className={s.scenE}>{lang === "es" ? data.scenario.es : data.scenario.en}</p>
                </div>
              </div>
            </section>

            {sentState ? (
              <SentView
                t={t}
                lang={lang}
                data={data}
                status={status}
                subject={subject}
                body={body}
                version={version}
                submittedAt={when(submittedAt)}
                reviewedAt={when(p.sub?.reviewed_at ?? null)}
                coach={coach}
                reviewer={reviewer}
                sub={p.sub}
                capSaved={capSaved}
                busy={busy}
                onCap={() => void addToCapstone()}
                onRedo={() => void improve()}
                error={error}
              />
            ) : (
              <>
                {/* ---------- step 1: the parts ---------- */}
                <section id="w0" className={sh.step} aria-labelledby="wr-s1">
                  <StepHead kicker={`${t.step} 1`} icon="list" id="wr-s1" title={t.s1} />
                  <p className={sh.intro}>{t.s1i}</p>
                  <ol className={s.parts}>
                    {data.parts.map((part, i) => (
                      <li key={i} className={s.part} style={{ "--c": part.color } as React.CSSProperties}>
                        <div className={s.partHead}>
                          <span className={s.partN}>{i + 1}</span>
                          <h3>{lang === "es" ? part.es : part.en}</h3>
                        </div>
                        <p>{part.hint[lang]}</p>
                        <p className={s.partEx}>
                          <span>{t.forEx}</span>
                          <span lang="en">{part.example}</span>
                        </p>
                      </li>
                    ))}
                  </ol>
                  <ul className={s.rules}>
                    {data.rules.map((r) => (
                      <li key={r.t_en} className={s.rule}>
                        <span className={s.ruleIcon}>
                          <Icon name={r.icon} size={20} />
                        </span>
                        <div>
                          <strong>{lang === "es" ? r.t_es : r.t_en}</strong>
                          {lang === "es" ? r.d_es : r.d_en}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* ---------- step 2: the example ---------- */}
                <section id="w1" className={sh.step} aria-labelledby="wr-s2">
                  <StepHead kicker={`${t.step} 2`} icon="eye" id="wr-s2" title={t.ex} />
                  <p className={sh.intro}>{t.exi}</p>
                  <div className={`${sh.card} ${s.ex}`} data-parts={showParts || undefined}>
                    <div className={s.exHead}>
                      <p className={s.exL}>{t.exL}</p>
                      <button type="button" className={s.toggle} aria-pressed={showParts} onClick={() => setShowParts((v) => !v)}>
                        <span className={s.sw} aria-hidden />
                        {t.showP}
                      </button>
                    </div>
                    <div className={s.mailv} lang="en">
                      <p className={s.mailHd}>
                        <strong>Subject:</strong> {data.example.subject}
                      </p>
                      <div className={s.mailBd}>
                        {data.example.paragraphs.map((para, pi) => (
                          <p key={pi}>
                            {para.map(([part, text], si) => {
                              const sep = si === 0 ? "" : para[si - 1][0] !== null && part === null ? "\n" : " ";
                              return part === null ? (
                                <span key={si} className={s.sig}>
                                  {sep}
                                  {text}
                                </span>
                              ) : (
                                <span key={si}>
                                  {sep}
                                  <span className={s.seg} style={{ "--c": data.parts[part].color } as React.CSSProperties}>
                                    {text}
                                    {showParts && (
                                      <sup>
                                        <span className={sh.sr}>({lang === "es" ? "parte" : "part"} </span>
                                        {part + 1}
                                        <span className={sh.sr}>: {lang === "es" ? data.parts[part].es : data.parts[part].en})</span>
                                      </sup>
                                    )}
                                  </span>
                                </span>
                              );
                            })}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ---------- step 3: the composer ---------- */}
                <section id="w2" className={sh.step} aria-labelledby="wr-s3">
                  <StepHead kicker={`${t.step} 3`} icon="mail" id="wr-s3" title={t.w} />
                  <p className={sh.intro}>{t.wi}</p>
                  <div className={`${sh.card} ${s.comp}`}>
                    <div className={s.cm}>
                      <div className={s.fld}>
                        <span className={s.fldL}>{t.to}</span>
                        <span className={s.to}>
                          <i aria-hidden>{data.to_initials}</i>
                          {data.to_label}
                        </span>
                      </div>
                      <div className={s.fld}>
                        <label htmlFor="wr-subj" className={s.fldL}>
                          {t.subj}
                        </label>
                        <input
                          id="wr-subj"
                          className={s.subj}
                          value={subject}
                          maxLength={200}
                          placeholder={t.subjPh}
                          lang="en"
                          onChange={(e) => {
                            setSubject(e.target.value);
                            schedule();
                          }}
                        />
                      </div>
                      <textarea
                        ref={bodyRef}
                        id="wr-body"
                        className={s.body}
                        value={body}
                        placeholder={t.bodyPh}
                        aria-label={t.body}
                        lang="en"
                        maxLength={20000}
                        onChange={(e) => {
                          setBody(e.target.value);
                          schedule();
                        }}
                      />
                      <div className={s.cfoot}>
                        <div className={s.wc} data-k={c.range ? "ok" : c.over ? "over" : undefined}>
                          <div className={s.wcRow}>
                            <span>
                              {t.wc}: <b>{c.words}</b>
                            </span>
                            <span>{t.range(data.words.min, data.words.max)}</span>
                          </div>
                          <div
                            className={s.bar}
                            role="meter"
                            aria-label={t.wc}
                            aria-valuemin={0}
                            aria-valuemax={data.words.max}
                            aria-valuenow={Math.min(c.words, data.words.max)}
                          >
                            <span className={s.zone} style={{ left: `${(data.words.min / data.words.max) * 100}%`, width: `${100 - (data.words.min / data.words.max) * 100}%` }} />
                            <i style={{ width: `${Math.min(100, (c.words / data.words.max) * 100)}%` }} />
                          </div>
                        </div>
                        <span className={s.saved} aria-live="polite" data-k={save ?? undefined}>
                          {save === "saved" && <Icon name="check" size={14} />}
                          {save === "saving" ? t.saving : save === "saved" ? t.saved : save === "error" ? t.saveErr : ""}
                        </span>
                      </div>
                    </div>
                    <div className={s.side}>
                      <h3 className={s.sideH}>{t.phr}</h3>
                      <p className={s.sideP}>{t.phrP}</p>
                      <div className={s.ptabs} role="group" aria-label={t.phr}>
                        {data.parts.map((part, i) => (
                          <button
                            key={i}
                            type="button"
                            style={{ "--c": part.color } as React.CSSProperties}
                            aria-pressed={tab === i}
                            aria-label={`${i + 1}. ${lang === "es" ? part.es : part.en}`}
                            onClick={() => setTab(i)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        {p.myPhrases.length > 0 && (
                          <button type="button" className={s.mineTab} aria-pressed={tab === MINE} aria-label={t.mine} onClick={() => setTab(MINE)}>
                            <Icon name="star" size={15} /> {t.mine}
                          </button>
                        )}
                      </div>
                      {tab === MINE ? (
                        <p className={`${s.ptitle} ${s.mineTitle}`}>★ {t.mine}</p>
                      ) : (
                        <p className={s.ptitle} style={{ color: data.parts[tab].color }}>
                          {lang === "es" ? data.parts[tab].es : data.parts[tab].en}
                        </p>
                      )}
                      <div className={s.phrases}>
                        {(tab === MINE ? p.myPhrases : data.parts[tab].phrases).map((ph) => (
                          <button key={ph} type="button" lang="en" onClick={() => insertPhrase(ph)} aria-label={t.phrAdd(ph)}>
                            {ph}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ---------- step 4: review and submit ---------- */}
                <section id="w3" className={sh.step} aria-labelledby="wr-s4">
                  <StepHead kicker={`${t.step} 4`} icon="send" id="wr-s4" title={t.r} />
                  <div className={sh.card}>
                    <p className={sh.intro}>{t.ri}</p>
                    <div className={s.checks}>
                      <div>
                        <h3 className={s.checksH}>{t.selfH}</h3>
                        <ul className={s.self}>
                          {data.parts.map((part, i) => (
                            <li key={i}>
                              <button type="button" aria-pressed={self.includes(i)} onClick={() => toggleSelf(i)}>
                                <i aria-hidden>
                                  <Icon name="check" size={15} />
                                </i>
                                {lang === "es" ? part.es : part.en}
                                <em style={{ "--c": part.color } as React.CSSProperties} aria-hidden />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className={s.checksH}>{t.autoH}</h3>
                        <ul className={s.auto}>
                          {[c.subject, c.range, c.paragraphs, c.clean].map((ok, i) => {
                            const warn = !ok && ((i === 1 && c.over) || (i === 2 && c.words > 0));
                            const [label, hint] = t.au[i];
                            return (
                              <li key={i} data-k={ok ? "ok" : warn ? "warn" : undefined}>
                                <i aria-hidden>{ok ? <Icon name="check" size={14} /> : warn ? "!" : ""}</i>
                                <div>
                                  {label.replace("{a}", String(data.words.min)).replace("{b}", String(data.words.max))}
                                  <span className={sh.sr}>{ok ? " ✓" : " ✗"}</span>
                                  {(hint || i === 0) && <small>{i === 0 ? `${hint}${data.subject_hint}` : hint}</small>}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                    <div className={s.send}>
                      <button type="button" className={s.btnP} disabled={!canSend || busy === "send"} onClick={() => void send()}>
                        <Icon name="send" size={18} />
                        {busy === "send" ? t.sending : t.sendB}
                      </button>
                      <p aria-live="polite">{canSend ? t.sendOk : `${t.missing} ${missing.join(", ")}.`}</p>
                    </div>
                    {error && (
                      <p className={s.err} role="alert">
                        {t.err}
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}

            <Pager lang={lang} prev={p.prev} next={p.next} label={(x) => navTitle(x, lang)} />
          </>
        }
        rail={
          <>
            <RailCard title={t.rail}>
              <RailSteps steps={t.steps} current={current} done={() => sentState} onGo={(i) => goTo(sentState ? "w3" : IDS[i])} />
            </RailCard>
            <RailCard title={t.stat}>
              <span className={s.stPillBig} data-k={stKind}>
                <Icon name={stIcon} size={16} />
                {stLabel}
              </span>
              <p className={s.stP}>{status === "draft" ? t.stDp : status === "submitted" ? t.stSp : t.stRp}</p>
            </RailCard>
          </>
        }
      />
      <div className={s.toast} data-show={toast || undefined} role="status" aria-live="polite">
        {toast && (
          <>
            <span className={s.toastI}>
              <Icon name="trophy" size={17} />
            </span>
            {t.toast(data.capstone_part)}
          </>
        )}
      </div>
    </ShellPage>
  );
}

function SentView({
  t,
  lang,
  data,
  status,
  subject,
  body,
  version,
  submittedAt,
  reviewedAt,
  coach,
  reviewer,
  sub,
  capSaved,
  busy,
  onCap,
  onRedo,
  error,
}: {
  t: UIT;
  lang: Lang;
  data: WritingData;
  status: SubmissionStatus;
  subject: string;
  body: string;
  version: number;
  submittedAt: string;
  reviewedAt: string;
  coach: string | null;
  reviewer: string | null;
  sub: WritingSubmission | null;
  capSaved: boolean;
  busy: string | null;
  onCap: () => void;
  onRedo: () => void;
  error: boolean;
}) {
  const rev = status === "reviewed";
  const name = reviewer ?? coach;
  const paras = useMemo(() => body.split(/\n\s*\n/).filter((x) => x.trim()), [body]);
  const words = countWords(body);
  const good = sub?.coach_good;
  const improve = sub?.coach_improve;
  const message = sub?.coach_message ?? (!good && !improve ? sub?.coach_feedback : null);
  const steps = [
    { label: t.st[0], small: submittedAt },
    { label: t.st[1], small: coach ?? t.yourCoach },
    { label: t.st[2], small: rev ? reviewedAt : t.within },
  ];
  return (
    <section id="w3" className={sh.step}>
      {rev ? (
        <>
          <StepHead kicker={t.fbK} icon="chat" id="wr-rev" title={t.revH} />
          <p className={sh.intro}>{t.revP}</p>
        </>
      ) : (
        <div className={s.banner} role="status">
          <span className={s.bannerI}>
            <Icon name="send" size={26} />
          </span>
          <div>
            <h2 className={s.bannerH}>{t.sentH}</h2>
            <p>{t.sentP(coach ?? t.yourCoach)}</p>
          </div>
        </div>
      )}
      <div className={sh.card}>
        <ol className={s.track} data-rev={rev || undefined}>
          <span className={s.trackFill} aria-hidden />
          {steps.map((st, i) => {
            const ok = rev || i === 0;
            return (
              <li key={i} data-k={ok ? "ok" : i === 1 ? "now" : undefined} aria-current={!rev && i === 1 ? "step" : undefined}>
                <i aria-hidden>{ok ? <Icon name="check" size={15} /> : i + 1}</i>
                {st.label}
                <small>{st.small}</small>
              </li>
            );
          })}
        </ol>
      </div>

      {rev && (
        <div className={`${sh.card} ${s.fbk}`}>
          <div className={s.coachRow}>
            <span className={s.coachAv} aria-hidden>
              {name ? initials(name) : "C"}
            </span>
            <div>
              <strong>{name ?? t.yourCoach}</strong>
              <span>{t.revWhen(reviewedAt)}</span>
            </div>
            <span className={s.tag}>
              <Icon name="check" size={13} /> {t.stR}
            </span>
          </div>
          {(good || improve) && (
            <div className={s.fbgrid}>
              {good && (
                <div className={s.good}>
                  <b>{t.good}</b>
                  {good}
                </div>
              )}
              {improve && (
                <div className={s.grow}>
                  <b>{t.grow}</b>
                  {improve}
                </div>
              )}
            </div>
          )}
          {message && <p className={s.fbmsg}>“{message}”</p>}
          {capSaved && (
            <p className={s.capDone}>
              <Icon name="trophy" size={20} />
              {t.capDone(data.capstone_part, data.capstone_title[lang])}
            </p>
          )}
          <div className={s.acts}>
            {!capSaved && (
              <button type="button" className={s.btnG} onClick={onCap} disabled={busy === "cap"}>
                <Icon name="trophy" size={18} />
                {t.capB(data.capstone_part)}
              </button>
            )}
            <button type="button" className={s.btnO} onClick={onRedo} disabled={busy === "redo"}>
              <Icon name="redo" size={18} />
              {t.redo}
            </button>
          </div>
          {error && (
            <p className={s.err} role="alert">
              {t.err}
            </p>
          )}
        </div>
      )}

      <div className={`${sh.card} ${s.ex} ${s.sentMail}`}>
        <div className={s.exHead}>
          <h3 className={s.exL}>
            {t.yourMail}
            {version > 1 ? ` · ${t.version(version)}` : ""}
          </h3>
          <span className={s.exWords}>
            {words} {lang === "es" ? "palabras" : "words"}
          </span>
        </div>
        <div className={s.mailv} lang="en">
          <p className={s.mailHd}>
            <strong>To:</strong> {data.to_label}
            <br />
            <strong>Subject:</strong> {subject}
          </p>
          <div className={s.mailBd}>
            {paras.map((x, i) => (
              <p key={i} className={s.pre}>
                {x}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
