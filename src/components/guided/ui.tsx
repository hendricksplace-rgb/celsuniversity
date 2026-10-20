"use client";

// Shared pieces of the CelsGLOBAL guided course screens: icons, the ES/EN interface strings (the course content
// itself is Spanish), the sticky top bar, the toast and the autosave hooks for resumes and guided_step_progress.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type { Lang, ResumeData, StepState } from "@/lib/guided";
import s from "./guided.module.css";

// ---------- icons ----------
const P: Record<string, React.ReactNode> = {
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  play: <path d="M7 4.5v15l13-7.5z" />,
  vol: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  down: (
    <>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5S14.5 17.9 12 20.5C9.5 17.9 8.4 15.1 8.4 12S9.5 6.1 12 3.5z" />
    </>
  ),
  brief: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5h6v2M3 12.5h18" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  send: (
    <>
      <path d="M4 12l16-8-6 16-2.5-6.5z" />
      <path d="M11.5 13.5L20 4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  pass: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <circle cx="12" cy="10" r="3" />
      <path d="M9 16h6" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />,
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </>
  ),
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  book: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  link: <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />,
};
export function Ico({ n, style }: { n: keyof typeof P | string; style?: React.CSSProperties }) {
  return (
    <svg className={s.i} viewBox="0 0 24 24" aria-hidden style={style}>
      {P[n] ?? null}
    </svg>
  );
}

// ---------- interface strings (the content is data, in Spanish) ----------
export const UI = {
  es: {
    back: "Regresar",
    toCourse: "Al curso",
    myResume: "Mi resume",
    seeResume: "Ver mi resume",
    stepOf: (n: number, of: number) => `PASO ${n} DE ${of}`,
    stepN: (n: number) => `Paso ${n}`,
    min: (n: number) => `${n} min`,
    builds: (t: string) => `Construyes: ${t}`,
    ready: (t: string) => `Listo: ${t}`,
    review: "Repasar",
    cont: "Continuar",
    open: "Abrir",
    continueStep: (n: number) => `Continuar · Paso ${n}`,
    sections: "SECCIONES",
    route: "TU RUTA",
    routeH: (n: number) => `${n} pasos, un resume`,
    routeI: "Cada paso termina con una parte nueva de tu resume. Puedes regresar a cualquier paso cuando quieras.",
    toolsK: "INCLUIDO EN TU CELSGLOBAL",
    toolsH: "Herramientas para el siguiente paso",
    ai: "CON INTELIGENCIA ARTIFICIAL",
    rrT: "Revisión de tu resume",
    rrP: "Sube tu resume terminado y recibe una calificación de 30 puntos, recomendaciones y una versión optimizada.",
    rrB: "Subir mi resume",
    ipT: "Practica tu entrevista",
    ipP: "Cuando tu resume esté listo, practica las preguntas que te van a hacer, en inglés y en voz alta.",
    ipB: "Practicar",
    booksH: "Material original",
    booksP: "El e-book y las descargas del curso siguen en Mis libros, con el PDF original.",
    yourResume: "TU RESUME",
    whenDone: "AL TERMINAR",
    whenDoneP: "Descargas tu resume en inglés (PDF y Word) y lo mandas a la revisión con IA de tu CelsGLOBAL.",
    mobHome: (n: number, of: number, a: number, b: number) => `Paso ${n} de ${of} · ${a} de ${b} secciones`,
    secNames: { contact: "Contacto", summary: "Perfil profesional", jobs: "Experiencia", education: "Educación", skills: "Habilidades", en: "Versión en inglés" } as Record<string, string>,
    paperH: { contact: "CONTACTO", summary: "PERFIL", jobs: "EXPERIENCIA", education: "EDUCACIÓN", skills: "HABILIDADES" } as Record<string, string>,
    yourName: "Tu nombre",
    yourRole: "Tu puesto",
    parts: { vid: "Mira el video", nutshell: "En pocas palabras", ess: "Lo esencial", prac: "Practica", build: "Construye tu resume", chk: "Comprueba" } as Record<string, string>,
    partH: { vid: "Las ideas clave en video", nutshell: "Lo más importante de este paso", ess: "Lo que necesitas saber", chk: "Tres preguntas para cerrar", fin: "Termina" } as Record<string, string>,
    stepSaved: (b: string, p: string) => `${b}: guardado en ${p}.`,
    readyQ: "¿Listo?",
    readyP: "Revisa tu lista de arriba. Cuando quieras, marca el curso como terminado: siempre puedes regresar a cualquier paso.",
    endCourse: "Terminar el curso",
    courseDone: "¡Curso terminado!",
    finished: "TERMINASTE",
    backToCourse: "Regresar al curso",
    inStep: "EN ESTE PASO",
    youBuild: "LO QUE CONSTRUYES",
    youBuildP: (t: string, p = "Mi resume") => `${t}. Todo se guarda solo en ${p}.`,
    seeProduct: (p: string) => (p === "Mi resume" ? "Ver mi resume" : `Ver ${p.toLowerCase()}`),
    mobStep: (a: number, b: number, name: string) => `Parte ${a} de ${b} · ${name}`,
    moreVideo: "Para ver más",
    lang: { es: "ESPAÑOL", en: "INGLÉS" } as Record<string, string>,
    prev: "ANTERIOR",
    next: "SIGUIENTE",
    stepDone: (n: number) => `¡Paso ${n} completo!`,
    stepDoneP: "Lo que construiste ya está en tu resume.",
    toastDone: (n: number) => `Paso ${n} completo · se guardó en tu resume`,
    right: "¡Exacto!",
    almost: "Casi.",
    of: (a: number, b: number) => `✓ ${a} de ${b}`,
    weak: "Línea débil",
    saved: "Guardado en Mi resume",
    savedIn: (w: string) => `Guardado en ${w}`,
    saving: "Guardando…",
    saveErr: "No se pudo guardar. Revisa tu conexión.",
    privateNote: "Solo tú ves tus respuestas.",
    langEs: "Español",
    langEn: "English",
    langAria: "Idioma de la interfaz",
  },
  en: {
    back: "Back",
    toCourse: "To the course",
    myResume: "My resume",
    seeResume: "See my resume",
    stepOf: (n: number, of: number) => `STEP ${n} OF ${of}`,
    stepN: (n: number) => `Step ${n}`,
    min: (n: number) => `${n} min`,
    builds: (t: string) => `You build: ${t}`,
    ready: (t: string) => `Done: ${t}`,
    review: "Review",
    cont: "Continue",
    open: "Open",
    continueStep: (n: number) => `Continue · Step ${n}`,
    sections: "SECTIONS",
    route: "YOUR PATH",
    routeH: (n: number) => `${n} steps, one resume`,
    routeI: "Each step ends with a new part of your resume. You can go back to any step whenever you want.",
    toolsK: "INCLUDED IN YOUR CELSGLOBAL",
    toolsH: "Tools for the next step",
    ai: "WITH ARTIFICIAL INTELLIGENCE",
    rrT: "Resume Review",
    rrP: "Upload your finished resume and get a 30-point score, recommendations and an optimized version.",
    rrB: "Upload my resume",
    ipT: "Interview Practice",
    ipP: "When your resume is ready, practice the questions you'll be asked, in English and out loud.",
    ipB: "Practice",
    booksH: "Original material",
    booksP: "The course e-book and downloads stay in My books, with the original PDF.",
    yourResume: "YOUR RESUME",
    whenDone: "WHEN YOU FINISH",
    whenDoneP: "You download your resume in English (PDF and Word) and send it to your CelsGLOBAL AI review.",
    mobHome: (n: number, of: number, a: number, b: number) => `Step ${n} of ${of} · ${a} of ${b} sections`,
    secNames: { contact: "Contact", summary: "Professional summary", jobs: "Experience", education: "Education", skills: "Skills", en: "English version" } as Record<string, string>,
    paperH: { contact: "CONTACT", summary: "SUMMARY", jobs: "EXPERIENCE", education: "EDUCATION", skills: "SKILLS" } as Record<string, string>,
    yourName: "Your name",
    yourRole: "Your role",
    parts: { vid: "Watch the video", nutshell: "In a nutshell", ess: "The essentials", prac: "Practice", build: "Build your resume", chk: "Check" } as Record<string, string>,
    partH: { vid: "The key ideas on video", nutshell: "The most important part of this step", ess: "What you need to know", chk: "Three questions to close", fin: "Finish" } as Record<string, string>,
    stepSaved: (b: string, p: string) => `${b}: saved to ${p}.`,
    readyQ: "Ready?",
    readyP: "Review your list above. Whenever you want, mark the course as finished: you can always come back to any step.",
    endCourse: "Finish the course",
    courseDone: "Course finished!",
    finished: "YOU FINISHED",
    backToCourse: "Back to the course",
    inStep: "IN THIS STEP",
    youBuild: "WHAT YOU BUILD",
    youBuildP: (t: string, p = "My resume") => `${t}. Everything saves to ${p} automatically.`,
    seeProduct: (p: string) => (p === "My resume" ? "See my resume" : `See ${p.toLowerCase()}`),
    mobStep: (a: number, b: number, name: string) => `Part ${a} of ${b} · ${name}`,
    moreVideo: "Watch more",
    lang: { es: "SPANISH", en: "ENGLISH" } as Record<string, string>,
    prev: "PREVIOUS",
    next: "NEXT",
    stepDone: (n: number) => `Step ${n} complete!`,
    stepDoneP: "What you built is already in your resume.",
    toastDone: (n: number) => `Step ${n} complete · saved to your resume`,
    right: "Exactly!",
    almost: "Almost.",
    of: (a: number, b: number) => `✓ ${a} of ${b}`,
    weak: "Weak line",
    saved: "Saved to My resume",
    savedIn: (w: string) => `Saved to ${w}`,
    saving: "Saving…",
    saveErr: "Couldn't save. Check your connection.",
    privateNote: "Only you can see your answers.",
    langEs: "Español",
    langEn: "English",
    langAria: "Interface language",
  },
};
export type T = (typeof UI)["es"];

/** The interface language, remembered on this device (Spanish by default). */
export function useLang(initial: Lang) {
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    try {
      const v = localStorage.getItem("celsu:guided-lang");
      if (v === "es" || v === "en") setLang(v);
    } catch {
      /* storage blocked */
    }
  }, []);
  const choose = useCallback((v: Lang) => {
    setLang(v);
    try {
      localStorage.setItem("celsu:guided-lang", v);
    } catch {
      /* storage blocked */
    }
  }, []);
  return [lang, choose] as const;
}

export function TopBar({ kicker, title, backHref, progress, lang, onLang, resumeHref, productLabel, productIcon = "doc", t, row }: { kicker: string; title: string; backHref: string; progress: number; lang: Lang; onLang: (l: Lang) => void; resumeHref?: string; productLabel?: string; productIcon?: string; t: T; row?: React.ReactNode }) {
  return (
    <>
      <header className={s.top}>
        <div className={s.topIn}>
          <Link href={backHref} className={s.back} aria-label={t.back}>
            <Ico n="left" />
          </Link>
          <div className={s.tt}>
            <small>{kicker}</small>
            <b>{title}</b>
          </div>
          <div className={s.lang} role="group" aria-label={t.langAria}>
            {(["es", "en"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={lang === v} onClick={() => onLang(v)} lang={v}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          {resumeHref && (
            <Link href={resumeHref} className={`${s.btn} ${s.btnG} ${s.myr}`}>
              <Ico n={productIcon} />
              {productLabel ?? t.myResume}
            </Link>
          )}
        </div>
        <div className={s.pbar} aria-hidden>
          <i style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }} />
        </div>
      </header>
      {row && <div className={s.mobbar}>{row}</div>}
    </>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  const node = (
    <div className={`${s.toast} ${msg ? s.toastOn : ""}`} role="status" aria-live="polite">
      {msg && (
        <>
          <Ico n="check" />
          {msg}
        </>
      )}
    </div>
  );
  return [node, show] as const;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/** resumes.data / answer_banks.data: the whole product, debounced; flushed when the page hides. Owner only (RLS). */
export function useResume(userId: string, initial: ResumeData, table: "resumes" | "answer_banks" | "financial_plans" | "tn_plans" = "resumes") {
  const [data, setData] = useState<ResumeData>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const latest = useRef(data);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setState("saving");
    const { error } = await createClient()
      .from(table)
      .upsert({ user_id: userId, data: latest.current as unknown as Json, updated_at: new Date().toISOString() });
    if (error) {
      dirty.current = true;
      setState("error");
    } else setState("saved");
  }, [userId, table]);

  const update = useCallback(
    (fn: (d: ResumeData) => ResumeData, now = false) => {
      setData((d) => {
        const next = fn(d);
        latest.current = next;
        return next;
      });
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), now ? 0 : 700);
    },
    [flush],
  );
  const set = useCallback((key: string, value: unknown, now = false) => update((d) => ({ ...d, [key]: value }), now), [update]);

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      void flush();
    };
  }, [flush]);
  return { data, set, update, state, flush };
}

/** guided_step_progress.state for one step (practice answers, check answers, e-book block values). */
export function useStepState(userId: string, moduleId: string, initial: StepState) {
  const [state, setStateRaw] = useState<StepState>(initial);
  const latest = useRef(state);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(async () => {
    await createClient()
      .from("guided_step_progress")
      .upsert({ user_id: userId, module_id: moduleId, state: latest.current as unknown as Json, updated_at: new Date().toISOString() });
  }, [userId, moduleId]);
  const update = useCallback(
    (fn: (s: StepState) => StepState) => {
      setStateRaw((cur) => {
        const next = fn(cur);
        latest.current = next;
        return next;
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 500);
    },
    [save],
  );
  useEffect(() => () => void (timer.current && save()), [save]);
  return [state, update] as const;
}

export function SavedBadge({ state, t, where }: { state: SaveState; t: T; where?: string }) {
  if (state === "error")
    return (
      <span className={`${s.saved} ${s.savedErr}`} role="alert">
        <Ico n="alert" />
        {t.saveErr}
      </span>
    );
  return (
    <span className={s.saved} aria-live="polite">
      <Ico n="check" />
      {state === "saving" ? t.saving : where ? t.savedIn(where) : t.saved}
    </span>
  );
}

export function say(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch {
    /* no voices */
  }
}
