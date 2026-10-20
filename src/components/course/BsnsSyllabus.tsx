"use client";
// CelsBSNS syllabus lesson (celsu-celsbsns-syllabus-brief.md, celsbsns-syllabus-mockup.html): the lesson text parsed
// into a styled page, an English / Español toggle (remembered in a cookie, so the server renders the right language),
// "Mi compromiso" (the signed commitment, animated once right after signing) and Previous / Next. "Siguiente" marks
// the syllabus as read with the same completion as the other reading lessons. The text itself never changes.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { SYLLABUS_LANG_COOKIE, headingOf, type Syllabus, type TaskKind } from "@/lib/bsns-syllabus";
import { signCommitment } from "@/app/app/cursos/[slug]/semana/[n]/tarea/[id]/actions";
import { montserrat } from "./bsns-fonts";
import { dancing } from "./bsns-hand-font";
import s from "./bsns-syllabus.module.css";

type Lang = "es" | "en";

/** The page's own strings follow the content toggle (EN/ES), not the app language: the mockup's T and CM. */
const UI = {
  en: {
    kicker: "WEEK {n} · SYLLABUS",
    back: "Back to week {n}",
    langLabel: "Language",
    wk: "WEEK",
    cur: "YOU ARE HERE",
    cap: "CAPSTONE · PART",
    prev: "PREVIOUS",
    next: "NEXT",
    nav: "Lesson navigation",
    chips: ["10 weeks", "100 hours", "Level B2–C1", "AI interview practice"],
    task: { read: "READING", write: "WRITING", speak: "SPEAKING", res: "RESEARCH", quiz: "VIDEO QUIZ", check: "FINAL CHECKLIST" },
    week: "Week {n}",
  },
  es: {
    kicker: "SEMANA {n} · SYLLABUS",
    back: "Regresar a la semana {n}",
    langLabel: "Idioma",
    wk: "SEM",
    cur: "ESTÁS AQUÍ",
    cap: "PROYECTO FINAL · PARTE",
    prev: "ANTERIOR",
    next: "SIGUIENTE",
    nav: "Navegación entre lecciones",
    chips: ["10 semanas", "100 horas", "Nivel B2–C1", "Práctica de entrevista con IA"],
    task: { read: "LECTURA", write: "ESCRITURA", speak: "EXPRESIÓN ORAL", res: "INVESTIGACIÓN", quiz: "CUESTIONARIO EN VIDEO", check: "LISTA FINAL" },
    week: "Semana {n}",
  },
} as const;
const CM = {
  es: {
    k: "MI COMPROMISO",
    h: "Me comprometo con mi futuro profesional",
    lead: "Durante las próximas 10 semanas, yo voy a:",
    items: [
      ["clock", "Dedicar alrededor de 10 horas cada semana a mi curso."],
      ["pen", "Entregar mis tareas y construir mi Proyecto Final paso a paso."],
      ["mic", "Hablar en inglés con confianza, aunque me equivoque."],
      ["trophy", "Hacer mi práctica de entrevista con IA en la semana 10."],
    ],
    lab: "Escribe tu nombre completo para firmar",
    ph: "Tu firma aparecerá aquí",
    date: "FECHA",
    btn: "Firmar mi compromiso",
    priv: "Solo tú y tu coach pueden ver tu firma.",
    err: "No se pudo guardar tu firma. Revisa tu conexión e inténtalo de nuevo.",
    dk: "COMPROMISO FIRMADO",
    dh: ["Hoy empezó ", "tu cambio"],
    dp: (n: string) =>
      `${n}, diste el primer paso. Cada semana que completes te acerca a la versión profesional que quieres ser. Nos vemos en tu práctica de entrevista con IA.`,
    sg: "FIRMADO",
  },
  en: {
    k: "MY COMMITMENT",
    h: "I commit to my professional future",
    lead: "Over the next 10 weeks, I will:",
    items: [
      ["clock", "Spend about 10 hours every week on my course."],
      ["pen", "Turn in my assignments and build my Capstone step by step."],
      ["mic", "Speak English with confidence, even when I make mistakes."],
      ["trophy", "Do my AI interview practice in Week 10."],
    ],
    lab: "Type your full name to sign",
    ph: "Your signature will appear here",
    date: "DATE",
    btn: "Sign my commitment",
    priv: "Only you and your coach can see your signature.",
    err: "Your signature couldn't be saved. Check your connection and try again.",
    dk: "COMMITMENT SIGNED",
    dh: ["Your change ", "starts today"],
    dp: (n: string) =>
      `${n}, you took the first step. Every week you complete brings you closer to the professional you want to be. See you at your AI interview practice.`,
    sg: "SIGNED",
  },
};
const TASK_ICON: Record<TaskKind, string> = { read: "book", write: "pen", speak: "mic", res: "search", quiz: "video", check: "list" };
const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const fmt = (d: Date, l: Lang) =>
  d.toLocaleDateString(l === "es" ? "es-MX" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" }).replace(/\./g, "");

function Icon({ id }: { id: string }) {
  return (
    <svg className={s.i} aria-hidden="true" focusable="false">
      <use href={`#sy-${id}`} />
    </svg>
  );
}

function Sprite() {
  return (
    <svg className={s.sprite} aria-hidden="true" focusable="false">
      <symbol id="sy-left" viewBox="0 0 24 24">
        <path d="M15 6l-6 6 6 6" />
      </symbol>
      <symbol id="sy-right" viewBox="0 0 24 24">
        <path d="M9 6l6 6-6 6" />
      </symbol>
      <symbol id="sy-doc" viewBox="0 0 24 24">
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h4" />
      </symbol>
      <symbol id="sy-cal" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </symbol>
      <symbol id="sy-clock" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </symbol>
      <symbol id="sy-level" viewBox="0 0 24 24">
        <path d="M4 20V14M10 20V9M16 20V4" />
      </symbol>
      <symbol id="sy-mic" viewBox="0 0 24 24">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </symbol>
      <symbol id="sy-compass" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </symbol>
      <symbol id="sy-target" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </symbol>
      <symbol id="sy-list" viewBox="0 0 24 24">
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
      </symbol>
      <symbol id="sy-route" viewBox="0 0 24 24">
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
      </symbol>
      <symbol id="sy-check" viewBox="0 0 24 24">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </symbol>
      <symbol id="sy-trophy" viewBox="0 0 24 24">
        <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
        <path d="M16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3M12 13v4M8 21h8M9 17h6" />
      </symbol>
      <symbol id="sy-book" viewBox="0 0 24 24">
        <path d="M3 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" />
      </symbol>
      <symbol id="sy-pen" viewBox="0 0 24 24">
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="M13.5 6.5l4 4" />
      </symbol>
      <symbol id="sy-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </symbol>
      <symbol id="sy-video" viewBox="0 0 24 24">
        <rect x="3" y="6" width="13" height="12" rx="2.5" />
        <path d="M16 10l5-3v10l-5-3z" />
      </symbol>
      <symbol id="sy-award" viewBox="0 0 24 24">
        <circle cx="12" cy="9" r="6" />
        <path d="M8.5 14L7 22l5-3 5 3-1.5-8" />
      </symbol>
      <symbol id="sy-sign" viewBox="0 0 24 24">
        <path d="M3 17c3-4 5-9 7-9s-1 9 1 9 3-4 4-4 1 3 3 3 2-1 3-2" />
        <path d="M3 21h18" />
      </symbol>
      <symbol id="sy-lock" viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="10" rx="2.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </symbol>
      <symbol id="sy-star" viewBox="0 0 24 24">
        <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
      </symbol>
    </svg>
  );
}

type Nav = { label: string; href: string } | null;
export type SyllabusProps = {
  initialLang: Lang;
  /** Parsed text per language; null when parsing failed (then `raw` is shown as plain paragraphs). */
  parsed: { en: Syllabus | null; es: Syllabus | null };
  raw: { en: string; es: string | null };
  week: number;
  currentWeek: number;
  weekHref: string;
  prev: Nav;
  next: Nav;
  userId: string;
  lessonId: string;
  done: boolean;
  courseId: string;
  prefillName: string;
  signed: { name: string; at: string } | null;
};

function Commitment({
  lang,
  courseId,
  prefillName,
  signed: initial,
  onSigned,
}: {
  lang: Lang;
  courseId: string;
  prefillName: string;
  signed: SyllabusProps["signed"];
  onSigned: () => void;
}) {
  const c = CM[lang];
  const [name, setName] = useState(prefillName);
  const [signed, setSigned] = useState(initial);
  const [anim, setAnim] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const today = new Date();

  const sign = () =>
    start(async () => {
      setError(false);
      const r = await signCommitment(courseId, name, lang);
      if (!r.ok) return setError(true);
      setSigned({ name: r.name, at: r.signedAt });
      setAnim(true);
      onSigned();
      requestAnimationFrame(() => document.getElementById("bw-commit")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    });

  if (signed) {
    const first = signed.name.split(" ")[0] || signed.name;
    return (
      <section id="bw-commit" className={`${s.commit} ${anim ? s.anim : ""}`} aria-live="polite">
        <div className={s.done}>
          <div className={s.seal} aria-hidden="true">
            <span className={s.ring} />
            <span className={`${s.ring} ${s.ring2}`} />
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={s.spark} style={{ "--a": `${i * 36}deg` } as React.CSSProperties} />
            ))}
            <span className={s.sealC}>
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </div>
          <small>{c.dk}</small>
          <h2>
            {c.dh[0]}
            <em>{c.dh[1]}</em>
          </h2>
          <p>{c.dp(first)}</p>
          <div className={s.signedCard}>
            <span className={s.hand}>{signed.name}</span>
            <div className={s.ln} />
            <span>
              <b>✓ {c.sg}</b> · {fmt(new Date(signed.at), lang).toUpperCase()}
            </span>
          </div>
        </div>
      </section>
    );
  }
  const ok = name.trim().length >= 3;
  return (
    <section id="bw-commit" className={s.commit} aria-labelledby="bw-commit-h">
      <div className={s.cmIn}>
        <span className={s.cmK}>
          <Icon id="sign" />
          {c.k}
        </span>
        <h2 id="bw-commit-h">{c.h}</h2>
        <p className={s.cmLead}>{c.lead}</p>
        <ul className={s.pledge}>
          {c.items.map(([i, t]) => (
            <li key={t}>
              <Icon id={i} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className={s.sig}>
          <div>
            <label htmlFor="bw-sign-name">{c.lab}</label>
            <input id="bw-sign-name" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className={s.line} aria-hidden="true">
              {!name && <span className={s.x}>✕</span>}
              <span className={s.hand}>{name}</span>
              {!name && <span className={s.ph}>{c.ph}</span>}
            </div>
            <div className={s.meta2}>
              <span>{c.date}</span>
              <span>{fmt(today, lang)}</span>
            </div>
          </div>
        </div>
        <div className={s.cmAct}>
          <button type="button" className={`${s.btn} ${s.btnP}`} disabled={!ok || pending} onClick={sign}>
            <Icon id="sign" />
            {c.btn}
          </button>
          <p>
            <Icon id="lock" />
            {c.priv}
          </p>
        </div>
        {error && (
          <p className={s.err} role="alert">
            {c.err}
          </p>
        )}
      </div>
    </section>
  );
}

export function BsnsSyllabus(p: SyllabusProps) {
  const [lang, setLang] = useState<Lang>(p.initialLang);
  const [glow, setGlow] = useState(false);
  const router = useRouter();
  const T = UI[lang];
  const raw = lang === "es" && p.raw.es ? p.raw.es : p.raw.en;
  const d = lang === "es" ? (p.parsed.es ?? p.parsed.en) : p.parsed.en;

  const choose = (l: Lang) => {
    setLang(l);
    document.cookie = `${SYLLABUS_LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  };
  const goNext = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!p.next || p.done) return;
    e.preventDefault();
    await finishLesson(createClient(), p.userId, p.lessonId);
    router.push(p.next.href);
  };
  const [t1, ...rest] = (d?.title ?? "").split(/:\s*/);
  const t2 = rest.join(": ");

  return (
    <div className={`${s.page} ${montserrat.variable} ${dancing.variable}`} lang={lang}>
      <Sprite />
      <header className={s.top}>
        <div className={s.topIn}>
          <Link prefetch={false} className={s.back} href={p.weekHref} aria-label={fill(T.back, { n: p.week })}>
            <Icon id="left" />
          </Link>
          <div className={s.tt}>
            <small>{fill(T.kicker, { n: p.week })}</small>
            <b>{t2 || t1}</b>
          </div>
          <div className={s.lang} role="group" aria-label={T.langLabel}>
            <button type="button" aria-pressed={lang === "en"} onClick={() => choose("en")} lang="en">
              English
            </button>
            <button type="button" aria-pressed={lang === "es"} onClick={() => choose("es")} lang="es">
              Español
            </button>
          </div>
        </div>
      </header>

      <div className={s.main}>
        {d ? (
          <>
            <section className={s.hero}>
              <span className={s.kick}>
                <Icon id="doc" />
                SYLLABUS
              </span>
              <h1>
                {t1}
                {t2 && (
                  <>
                    : <em>{t2}</em>
                  </>
                )}
              </h1>
              <p>{d.sub}</p>
              <ul className={s.chips}>
                {(["cal", "clock", "level", "mic"] as const).map((ic, i) => (
                  <li key={ic}>
                    <Icon id={ic} />
                    {T.chips[i]}
                  </li>
                ))}
              </ul>
            </section>

            {d.overview.length > 0 && (
              <section className={s.sec} aria-labelledby="sy-overview">
                <div className={s.sh}>
                  <span className={s.ti}>
                    <Icon id="compass" />
                  </span>
                  <h2 id="sy-overview">{headingOf("overview", lang)}</h2>
                </div>
                <div className={`${s.card} ${s.prose}`}>
                  {d.overview.map((x) => (
                    <p key={x}>{x}</p>
                  ))}
                </div>
              </section>
            )}

            {d.goals.length > 0 && (
              <section className={s.sec} aria-labelledby="sy-goals">
                <div className={s.sh}>
                  <span className={s.ti}>
                    <Icon id="target" />
                  </span>
                  <h2 id="sy-goals">{headingOf("goals", lang)}</h2>
                </div>
                {d.goalsLead && <p className={s.lead}>{d.goalsLead}</p>}
                <ul className={s.goals}>
                  {d.goals.map((g) => (
                    <li key={g} className={s.goal}>
                      <span className={s.ck} aria-hidden="true">
                        <Icon id="check" />
                      </span>
                      {g}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {d.reqs.length > 0 && (
              <section className={s.sec} aria-labelledby="sy-reqs">
                <div className={s.sh}>
                  <span className={s.ti}>
                    <Icon id="list" />
                  </span>
                  <h2 id="sy-reqs">{headingOf("reqs", lang)}</h2>
                </div>
                <div className={s.card}>
                  <ol className={s.reqs}>
                    {d.reqs.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            {d.weeks.length > 0 && (
              <section className={s.sec} aria-labelledby="sy-weeks">
                <div className={s.sh}>
                  <span className={s.ti}>
                    <Icon id="route" />
                  </span>
                  <h2 id="sy-weeks">{headingOf("weeks", lang)}</h2>
                </div>
                <ol className={s.weeks}>
                  {d.weeks.map((w) => {
                    const cur = w.n === p.currentWeek;
                    return (
                      <li
                        key={w.n}
                        className={`${s.wk} ${cur ? s.wkCur : ""} ${w.n === d.weeks.length ? s.wkLast : ""}`}
                        aria-current={cur ? "step" : undefined}
                      >
                        {cur && <span className={s.tag}>{T.cur}</span>}
                        <div className={s.wh}>
                          <span className={s.n} aria-hidden="true">
                            <span>
                              <small>{T.wk}</small>
                              {w.n}
                            </span>
                          </span>
                          <div>
                            <h3>
                              <span className={s.srOnly}>{fill(T.week, { n: w.n })}: </span>
                              {w.title}
                            </h3>
                            {w.topics.map((t) => (
                              <p key={t} className={s.topic}>
                                {t}
                              </p>
                            ))}
                          </div>
                        </div>
                        {w.cap && (
                          <div className={s.capr}>
                            <Icon id="star" />
                            <div>
                              <b>
                                {T.cap} {w.cap.part}
                              </b>
                              {w.cap.txt}
                            </div>
                          </div>
                        )}
                        <ul className={s.tasks}>
                          {w.tasks.map((t) => (
                            <li key={t.k + t.txt}>
                              <span className={s.ic} aria-hidden="true">
                                <Icon id={TASK_ICON[t.k]} />
                              </span>
                              <div>
                                <b>{T.task[t.k]}</b>
                                {t.txt}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {d.cert.length > 0 && (
              <section className={s.sec}>
                <div className={s.cert}>
                  <span className={s.md} aria-hidden="true">
                    <Icon id="award" />
                  </span>
                  <div>
                    <h2>{headingOf("cert", lang)}</h2>
                    {d.cert.map((x) => (
                      <p key={x}>{x}</p>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          // Parsing failed: the plain paragraphs, styled, so the lesson never breaks.
          <section className={`${s.card} ${s.prose}`}>
            {raw
              .split(/\n\s*\n/)
              .map((x) => x.trim())
              .filter(Boolean)
              .map((x, i) => (
                <p key={i}>{x}</p>
              ))}
          </section>
        )}

        <Commitment lang={lang} courseId={p.courseId} prefillName={p.prefillName} signed={p.signed} onSigned={() => {
            setGlow(true);
            // Signing is the syllabus's real action: it counts as read even if the student goes back instead of "Next".
            if (!p.done) void finishLesson(createClient(), p.userId, p.lessonId).then(() => router.refresh());
          }}
        />

        <nav className={s.pn} aria-label={T.nav}>
          <Link prefetch={false} className={s.prev} href={p.prev?.href ?? p.weekHref}>
            <small>{T.prev}</small>
            <span>
              <Icon id="left" />
              {p.prev?.label ?? fill(T.week, { n: p.week })}
            </span>
          </Link>
          {p.next && (
            <Link prefetch={false} className={`${s.next} ${glow ? s.glow : ""}`} href={p.next.href} onClick={goNext}>
              <small>{T.next}</small>
              <span>
                {p.next.label}
                <Icon id="right" />
              </span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
