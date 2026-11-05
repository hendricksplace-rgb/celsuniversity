"use client";

// C-043: the CelsUS course page as a passport (Matt chose Option B, 2026-11-04). Top to bottom: back pill; hero with
// the passport booklet (holder's name, a dot per stamp) and the interview countdown (interview_dates) or "¿Cuándo es
// tu entrevista?"; "Continúa donde te quedaste"; "Tus sellos" (one passport page per episode: a rubber stamp with the
// real completion date, a progress ring, or an empty slot); the practice exam with the certificate preview; the
// study documents; Hendricks Law. Sounds only after the first tap; prefers-reduced-motion shows everything placed.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lang } from "@/lib/i18n/dictionaries";
import { passportCopy, type PassportCopy } from "./passport-copy";
import "./passport.css";

export type PassportEpisode = {
  n: number;
  title: string;
  href: string;
  state: "done" | "now" | "new";
  done: number;
  total: number;
  /** When the last part was finished (done episodes). */
  completedAt: string | null;
  /** Latest activity in the episode (started ones). */
  lastActivity: string | null;
  cover: string | null;
};
export type PassportResource = { id: string; title: string; href: string; done: boolean };

type Props = {
  lang: Lang;
  userId: string;
  courseId: string;
  holder: string;
  interviewDate: string | null;
  /** Today (YYYY-MM-DD) on the server; the browser replaces it with its own date after load. */
  today: string;
  episodes: PassportEpisode[];
  exam: { href: string; count: number; passed: boolean; best: string | null } | null;
  resources: PassportResource[];
  lawHref: string;
  notice?: React.ReactNode;
};

const INKS = ["#0E2A4F", "#A3242E", "#8A6A14"];
const ROTS = [-12, 9, -6, 11, -9, 7];
const MIN_PER_PART = 5;
const DAY = 864e5;

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
/** "Te faltan <b>3 sellos</b>…" → text with <b> parts, without innerHTML. */
const rich = (s: string) => s.split(/(<b>.*?<\/b>)/).map((p, i) => (p.startsWith("<b>") ? <b key={i}>{p.slice(3, -4)}</b> : p));
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ms = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
const fmtDate = (ymd: string, loc: string, year = true) =>
  new Date(ms(ymd)).toLocaleDateString(loc, { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });

/** Guilloche: 7 rosette lines, the same on server and browser. */
const GUIL = (() => {
  const out: string[] = [];
  for (let k = 0; k < 7; k++) {
    let p = "";
    for (let i = 0; i <= 360; i += 3) {
      const t = (i * Math.PI) / 180;
      p += `${i ? "L" : "M"}${(200 + (150 + k * 10) * Math.cos(t) + 18 * Math.cos(9 * t + k)).toFixed(1)} ${(150 + (95 + k * 8) * Math.sin(t) + 18 * Math.sin(9 * t + k)).toFixed(1)}`;
    }
    out.push(`${p}Z`);
  }
  return out;
})();
const Guil = ({ draw }: { draw?: boolean }) => (
  <svg className={`us-guil${draw ? " draw" : ""}`} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
    {GUIL.map((d, i) => (
      <path key={i} d={d} style={draw ? { animationDelay: `${i * 0.2}s` } : undefined} />
    ))}
  </svg>
);
/** A 24-point seal edge. */
const SEAL = (() => {
  let d = "";
  for (let i = 0; i <= 48; i++) {
    const r = i % 2 ? 43 : 48;
    const a = (i * Math.PI) / 24;
    d += `${i ? "L" : "M"}${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
})();

const Play = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const Chevron = ({ w = 3 }: { w?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/** Low, formal tones (Web Audio), only once the student has tapped the page. */
function useTones() {
  const armed = useRef(false);
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => {
    const arm = () => (armed.current = true);
    addEventListener("pointerdown", arm, { once: true });
    addEventListener("keydown", arm, { once: true });
    return () => {
      removeEventListener("pointerdown", arm);
      removeEventListener("keydown", arm);
    };
  }, []);
  const tone = (f: number, d: number, type: OscillatorType = "sine", v = 0.18) => {
    if (!armed.current) return;
    try {
      const W = window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      ctx.current ??= new (W.AudioContext || W.webkitAudioContext!)();
      const ac = ctx.current;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(v, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + d);
    } catch {}
  };
  return {
    go: () => {
      tone(196, 0.6);
      setTimeout(() => tone(294, 0.5), 140);
    },
    thud: () => {
      tone(90, 0.25, "triangle", 0.3);
      tone(60, 0.3, "sine", 0.25);
    },
    soft: () => tone(220, 0.35),
    law: () => tone(165, 0.5),
  };
}

export function Passport({ lang, userId, courseId, holder, interviewDate, today: serverToday, episodes, exam, resources, lawHref, notice }: Props) {
  const c = passportCopy(lang);
  const sound = useTones();
  const [today, setToday] = useState(serverToday);
  const [date, setDate] = useState(interviewDate);
  const [sheet, setSheet] = useState(false);
  const [shown, setShown] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => setToday(localToday()), []);

  const total = episodes.length;
  const doneCount = episodes.filter((e) => e.state === "done").length;
  const remain = total - doneCount;
  const days = date ? Math.round((ms(date) - ms(today)) / DAY) : null;
  const hasDate = days !== null && days >= 0;

  // The countdown counts up on load.
  useEffect(() => {
    if (!hasDate || days === null) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(days);
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1400);
      setShown(Math.round(days * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [days, hasDate]);

  // Soft gold fireworks in the hero, every ~5.6 s.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cx = cv.getContext("2d");
    if (!cx) return;
    let parts: { x: number; y: number; vx: number; vy: number; l: number }[] = [];
    let raf = 0;
    const size = () => {
      const r = cv.getBoundingClientRect();
      cv.width = r.width * devicePixelRatio;
      cv.height = r.height * devicePixelRatio;
      cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    const burst = () => {
      const r = cv.getBoundingClientRect();
      const x = r.width * (0.5 + Math.random() * 0.45);
      const y = r.height * (0.08 + Math.random() * 0.3);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const v = 0.6 + Math.random() * 1.1;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1 });
      }
    };
    const tick = () => {
      const r = cv.getBoundingClientRect();
      cx.clearRect(0, 0, r.width, r.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.012;
        p.vx *= 0.985;
        p.l -= 0.011;
        cx.fillStyle = `rgba(255,210,77,${Math.max(p.l, 0) * 0.5})`;
        cx.beginPath();
        cx.arc(p.x, p.y, 1.6, 0, 7);
        cx.fill();
      }
      parts = parts.filter((p) => p.l > 0);
      raf = requestAnimationFrame(tick);
    };
    size();
    tick();
    const first = setTimeout(burst, 1600);
    const every = setInterval(burst, 5600);
    addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(first);
      clearInterval(every);
      removeEventListener("resize", size);
    };
  }, []);

  // A low thud as each stamp lands (silent until the first tap, like every sound here).
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ids = episodes.filter((e) => e.state === "done").map((_, i) => setTimeout(sound.thud, 1780 + i * 380));
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on load
  }, []);

  // "Continúa": the last episode opened and not finished; else the first not started; all done → the exam.
  const resume = useMemo(() => {
    const open = episodes.filter((e) => e.state === "now").sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""))[0];
    return open ?? episodes.find((e) => e.state === "new") ?? null;
  }, [episodes]);

  let plan: React.ReactNode = null;
  if (hasDate && days !== null) {
    if (remain === 0) plan = rich(c.planDone);
    else {
      const end = new Date(ms(today) + remain * 7 * DAY).toISOString().slice(0, 10);
      const onTime = ms(end) < ms(date!);
      plan = rich(
        fill(onTime ? (remain === 1 ? c.planOne : c.plan) : remain === 1 ? c.planLateOne : c.planLate, { n: remain, end: fmtDate(end, c.loc, false) }),
      );
    }
  }

  return (
    <div className="us">
      <Link href="/app/cursos" className="us-back">
        <span aria-hidden>←</span> {c.back}
      </Link>

      <section className="us-hero" aria-label={c.eyebrow}>
        <canvas ref={canvas} aria-hidden />
        <Guil draw />
        <div className="us-ppwrap" aria-hidden>
          <div className="us-pp">
            <div className="us-emb">
              <div className="t1">{c.ppT}</div>
              <div className="t2">{c.ppSub}</div>
            </div>
            <svg className="crest us-emb" viewBox="0 0 100 100" fill="none" stroke="#E9C55A" strokeWidth="1.6">
              <circle cx="50" cy="50" r="44" />
              <circle cx="50" cy="50" r="38" strokeDasharray="2 3" />
              <path d="M50 22 L54.7 36.5 L70 36.5 L57.6 45.5 L62.3 60 L50 51 L37.7 60 L42.4 45.5 L30 36.5 L45.3 36.5Z" fill="#E9C55A" stroke="none" />
              <path d="M28 66 Q50 78 72 66" />
              <path d="M32 72 Q50 82 68 72" />
            </svg>
            <div className="us-emb">
              <div className="name">
                <small>{c.holder}</small>
                {holder}
              </div>
              <div className="us-mini">
                {episodes.map((e) => (
                  <i key={e.n} className={e.state === "done" ? "on" : ""} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="us-eyebrow">{c.eyebrow}</p>
          {hasDate && days === 0 ? (
            <>
              <h1>{c.today}</h1>
              <p className="us-plan">{c.todayP}</p>
            </>
          ) : hasDate && days !== null ? (
            <>
              <div className="us-count" data-testid="us-countdown">
                <span className="us-num" aria-hidden>
                  {shown}
                </span>
                <span className="us-unit">
                  <span aria-hidden>{days === 1 ? c.day : c.days}</span>
                  <small aria-hidden>{c.left}</small>
                  <span className="sr-only">
                    {days} {days === 1 ? c.day : c.days} {c.left}
                  </span>
                </span>
              </div>
              <div className="us-daterow">
                <span className="us-datepill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                  {fmtDate(date!, c.loc)}
                </span>
                <button type="button" className="us-change" onClick={() => setSheet(true)}>
                  {c.change}
                </button>
              </div>
              <p className="us-plan">{plan}</p>
            </>
          ) : (
            <>
              <h1>{c.noDateH}</h1>
              <p className="us-plan">{c.noDateP}</p>
              <button
                type="button"
                className="us-gold"
                style={{ marginTop: 16, maxWidth: 340, width: "100%" }}
                onClick={() => setSheet(true)}
                data-testid="us-set-date"
              >
                {c.setDate}
              </button>
            </>
          )}
        </div>
      </section>

      <ContinueCard c={c} resume={resume} exam={exam} onGo={sound.go} />

      {notice && <div className="us-notice">{notice}</div>}

      <div className="us-layout">
        <section aria-labelledby="us-stamps">
          <div className="us-sechead">
            <h2 id="us-stamps">{c.pagesH}</h2>
            <span>{fill(c.sCount, { a: doneCount, b: total })}</span>
          </div>
          <div className="us-rule" />
          <ol className="us-pages">
            {episodes.map((e, i) => (
              <li key={e.n}>
                <StampPage c={c} e={e} i={i} stampIndex={episodes.slice(0, i).filter((x) => x.state === "done").length} onGo={sound.go} />
              </li>
            ))}
          </ol>
        </section>

        <aside className="us-side">
          {exam && (
            <div className="us-final">
              <Guil />
              <p className="us-lbl">{c.finLbl}</p>
              <h3>{c.finH}</h3>
              <p>{fill(c.finP, { n: exam.count })}</p>
              <div className={`us-cert${exam.passed ? "" : " locked"}`} data-testid="us-cert">
                <span className="us-lock">
                  {exam.passed ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  )}
                  {exam.passed ? c.passed : c.lock}
                </span>
                <div className="ct">{c.certT}</div>
                <div className="cn">{holder}</div>
                <div className="cs">{c.certS}</div>
                <svg className="sl" viewBox="0 0 100 100" aria-hidden>
                  <path d={SEAL} fill="#C9A23A" />
                  <path d="M50 30 L54.7 44.5 L70 44.5 L57.6 53.5 L62.3 68 L50 59 L37.7 68 L42.4 53.5 L30 44.5 L45.3 44.5Z" fill="#0E2A4F" />
                </svg>
              </div>
              <div className="us-chips">
                <span className="us-chip">{fill(c.ch1, { n: exam.count })}</span>
                <span className="us-chip">{c.ch2}</span>
                <span className="us-chip">{c.ch3}</span>
                {exam.best && <span className="us-chip best">{fill(c.best, { score: exam.best })}</span>}
              </div>
              <Link href={exam.href} className="us-gold" style={{ width: "100%" }} onClick={sound.go} data-testid="us-exam">
                {exam.passed ? c.examAgain : c.examB}
                <Play />
              </Link>
            </div>
          )}

          {resources.length > 0 && (
            <section className="us-res" aria-labelledby="us-res-h">
              <div className="us-resband">
                <Guil />
                <span className="us-emblem" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0E2A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <path d="M8 13h8" />
                  </svg>
                </span>
                <span>
                  <span className="us-lbl" style={{ fontSize: 11.5 }}>
                    {c.resL}
                  </span>
                  <h3 id="us-res-h">{c.resH}</h3>
                  <p>{c.resP}</p>
                </span>
              </div>
              <ul className="us-docs">
                {resources.map((r) => {
                  const kind = resourceKind(r.title);
                  const [title, sub] = kind ? c.res[kind] : [r.title, ""];
                  return (
                    <li key={r.id}>
                      <Link href={r.href} className="us-doc" onClick={sound.soft}>
                        <span className="us-di" aria-hidden>
                          <DocIcon kind={kind} />
                        </span>
                        <span>
                          <b>{title}</b>
                          {sub && <small>{sub}</small>}
                        </span>
                        <span className="us-go" aria-hidden>
                          <Chevron />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="us-law">
            <Guil />
            <div className="us-lawtop">
              <div className="us-lawseal" aria-hidden>
                <svg className="rim" viewBox="0 0 100 100">
                  <defs>
                    <radialGradient id="us-lg" cx=".35" cy=".3">
                      <stop offset="0" stopColor="#FFEBA8" />
                      <stop offset=".5" stopColor="#FFD24D" />
                      <stop offset="1" stopColor="#B8901F" />
                    </radialGradient>
                  </defs>
                  <path d={SEAL} fill="url(#us-lg)" />
                  <circle cx="50" cy="50" r="33" fill="none" stroke="#0E2A4F" strokeOpacity=".35" strokeDasharray="2 3" />
                </svg>
                <span className="sc">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0E2A4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v18M7 21h10M5 7h14M12 5l0 2" />
                    <path d="M5 7l-3 7a3 3 0 0 0 6 0z" />
                    <path d="M19 7l-3 7a3 3 0 0 0 6 0z" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="us-lbl" style={{ fontSize: 11.5 }}>
                  {c.lawL}
                </p>
                <h3>{c.lawH}</h3>
              </div>
            </div>
            <p>{c.lawS}</p>
            <a className="us-lawbtn" href={`${lawHref}?subject=${encodeURIComponent(c.lawSubject)}`} onClick={sound.law}>
              {c.lawB}
              <Chevron w={2.6} />
            </a>
          </div>
        </aside>
      </div>

      {sheet && (
        <DateSheet c={c} userId={userId} courseId={courseId} initial={date ?? ""} today={today} onClose={() => setSheet(false)} onSaved={(d) => setDate(d)} />
      )}
    </div>
  );
}

function ContinueCard({ c, resume, exam, onGo }: { c: PassportCopy; resume: PassportEpisode | null; exam: Props["exam"]; onGo: () => void }) {
  if (!resume && !exam) return null;
  const isExam = !resume;
  const e = resume;
  const pct = e ? (e.total ? e.done / e.total : 0) : 1;
  const left = e ? Math.max(1, (e.total - e.done) * MIN_PER_PART) : 0;
  const href = e ? e.href : exam!.href;
  const label = e && e.state === "new" ? c.start : isExam ? c.examB : c.cont;
  const btn = (cls: string) => (
    <Link href={href} className={`us-gold ${cls}`} onClick={onGo} data-testid="us-continue">
      {label}
      <Play />
    </Link>
  );
  return (
    <div className="us-cont">
      <div className="us-cover" aria-hidden>
        {e?.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- the CelsBook cover from public storage
          <img src={e.cover} alt="" width={104} height={139} />
        ) : e ? (
          <span className="n">{e.n}</span>
        ) : (
          <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: "22%" }}>
            <path d={SEAL} fill="#FFD24D" />
            <path d="M50 30 L54.7 44.5 L70 44.5 L57.6 53.5 L62.3 68 L50 59 L37.7 68 L42.4 53.5 L30 44.5 L45.3 44.5Z" fill="#0E2A4F" />
          </svg>
        )}
      </div>
      <div className="us-cinfo">
        <p className="us-kicker">{isExam ? c.kickExam : e!.state === "new" ? c.kickNew : c.kick}</p>
        <h2 className="us-ctitle">
          {isExam ? (
            c.finH
          ) : (
            <>
              {c.episode} {e!.n}
              {e!.title && <em> · {e!.title}</em>}
            </>
          )}
        </h2>
        <div className="us-prog" aria-hidden>
          <i style={{ ["--w" as string]: `${Math.round(pct * 100)}%` }} />
        </div>
        {e && (
          <p className="us-ptext">
            {fill(c.parts, { a: e.done, b: e.total })} · {fill(c.minutes, { m: left })}
          </p>
        )}
        {btn("us-cbtn")}
      </div>
      {btn("us-deskbtn")}
    </div>
  );
}

function StampPage({ c, e, i, stampIndex, onGo }: { c: PassportCopy; e: PassportEpisode; i: number; stampIndex: number; onGo: () => void }) {
  const rot = ROTS[(e.n - 1) % ROTS.length];
  const ink = INKS[(e.n - 1) % INKS.length];
  let slot: React.ReactNode;
  if (e.state === "done") slot = <Stamp c={c} e={e} rot={rot} ink={ink} delay={1.6 + stampIndex * 0.38} />;
  else if (e.state === "now") {
    const circ = 2 * Math.PI * 48;
    slot = (
      <>
        <svg className="us-ring" viewBox="0 0 104 104" aria-hidden>
          <circle className="bg" cx="52" cy="52" r="48" />
          <circle
            className="fg"
            cx="52"
            cy="52"
            r="48"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - (e.total ? e.done / e.total : 0))}
            style={{ ["--c" as string]: circ }}
          />
        </svg>
        <span className="us-empty ring">{fill(c.parts, { a: e.done, b: e.total })}</span>
      </>
    );
  } else slot = <span className="us-empty">{c.todo}</span>;
  return (
    <Link
      href={e.href}
      className={`us-page${e.state === "now" ? " isprog" : ""}`}
      style={{ ["--d" as string]: `${1.1 + i * 0.2}s` }}
      onClick={onGo}
      data-testid={`us-page-${e.n}`}
    >
      <svg className="wm" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#0E2A4F" strokeWidth="2" />
        <path d="M50 20 L55.9 38 L75 38 L59.5 49 L65.4 67 L50 56 L34.6 67 L40.5 49 L25 38 L44.1 38Z" fill="#0E2A4F" />
      </svg>
      <span className="pn">
        {c.page} {i + 1}
      </span>
      <span className="us-slot">{slot}</span>
      <span className="us-pinfo">
        <span className="lbl">CelsUS</span>
        <h3>
          {c.episode} {e.n}
          {e.title && <em> · {e.title}</em>}
        </h3>
        <span className={`st${e.state === "done" ? " ok" : ""}`}>
          {e.state === "done" ? c.done : e.state === "now" ? fill(c.parts, { a: e.done, b: e.total }) : c.todo}
        </span>
        <span className={`us-act ${e.state === "done" ? "ghost" : e.state === "now" ? "gold" : "navy"}`}>
          {e.state === "done" ? c.bDone : e.state === "now" ? `${c.bProg} ▸` : c.bTodo}
        </span>
      </span>
    </Link>
  );
}

/** The rubber stamp: arc text, the episode, the completion date in a band, a grainy ink. */
function Stamp({ c, e, rot, ink, delay }: { c: PassportCopy; e: PassportEpisode; rot: number; ink: string; delay: number }) {
  const id = `us-s${e.n}`;
  const date = e.completedAt
    ? new Date(e.completedAt)
        .toLocaleDateString(c.loc, { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Mexico_City" })
        .replace(/\./g, "")
        .toUpperCase()
    : "";
  return (
    <svg
      className="us-stamp"
      style={{ ["--rot" as string]: `${rot}deg`, ["--sd" as string]: `${delay}s` }}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${c.done} ${date}`}
    >
      <defs>
        <filter id={`${id}-ink`}>
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} seed={e.n * 7} />
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 1 1 1 1" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" operator="in" />
        </filter>
        <path id={`${id}-arc`} d="M14 62 A46 46 0 0 1 106 62" />
      </defs>
      <g filter={`url(#${id}-ink)`} fill={ink} stroke={ink}>
        <circle cx="60" cy="60" r="56" fill="none" strokeWidth="3.5" />
        <circle cx="60" cy="60" r="35" fill="none" strokeWidth="1.6" />
        <path d="M27 76 l1.4 3 3.2.3-2.4 2.1.7 3.2-2.9-1.7-2.9 1.7.7-3.2-2.4-2.1 3.2-.3z" stroke="none" />
        <path d="M93 76 l1.4 3 3.2.3-2.4 2.1.7 3.2-2.9-1.7-2.9 1.7.7-3.2-2.4-2.1 3.2-.3z" stroke="none" />
        <text fontFamily="var(--font-nunito), Nunito" fontWeight="900" fontSize="9.5" letterSpacing="1.2" stroke="none">
          <textPath href={`#${id}-arc`} startOffset="50%" textAnchor="middle">
            {c.stampTop}
          </textPath>
        </text>
        <text x="60" y="53" textAnchor="middle" fontFamily="var(--font-nunito), Nunito" fontWeight="900" fontSize="8" letterSpacing="1.5" stroke="none">
          {c.stampEp}
        </text>
        <text x="60" y="75" textAnchor="middle" fontFamily="var(--font-serif), serif" fontWeight="800" fontSize="24" stroke="none">
          {e.n}
        </text>
        <rect x="18" y="83" width="84" height="15" rx="2" stroke="none" />
        <text x="60" y="94" textAnchor="middle" fontFamily="var(--font-nunito), Nunito" fontWeight="900" fontSize="9" fill="#FBF8EF" stroke="none">
          {date}
        </text>
      </g>
    </svg>
  );
}

function DateSheet({
  c,
  userId,
  courseId,
  initial,
  today,
  onClose,
  onSaved,
}: {
  c: PassportCopy;
  userId: string;
  courseId: string;
  initial: string;
  today: string;
  onClose: () => void;
  onSaved: (d: string) => void;
}) {
  const [v, setV] = useState(initial && initial >= today ? initial : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v) return onClose();
    if (v < today) return setErr(c.pastErr);
    setBusy(true);
    const { error } = await createClient()
      .from("interview_dates")
      .upsert({ user_id: userId, course_id: courseId, interview_date: v, updated_at: new Date().toISOString() }, { onConflict: "user_id,course_id" });
    setBusy(false);
    if (error) return setErr(c.saveErr);
    onSaved(v);
    onClose();
  };
  return (
    <div className="us-sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="us-sheet-h" onSubmit={save}>
        <h3 id="us-sheet-h">{c.sheetH}</h3>
        <p>{c.sheetP}</p>
        <input
          ref={input}
          type="date"
          min={today}
          value={v}
          onChange={(e) => (setV(e.target.value), setErr(null))}
          aria-label={c.sheetH}
          data-testid="us-date-input"
        />
        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}
        <div className="row">
          <button type="button" className="cancel" onClick={onClose}>
            {c.cancel}
          </button>
          <button type="submit" className="us-gold" style={{ flex: 1 }} disabled={busy} data-testid="us-date-save">
            {c.save}
          </button>
        </div>
      </form>
    </div>
  );
}

type DocKind = keyof PassportCopy["res"];
/** Which study document a resource is, from its title (for its icon and its name in each language). */
function resourceKind(title: string): DocKind | null {
  const t = title.toLowerCase();
  if (/flashcard|tarjeta/.test(t)) return "flashcards";
  if (/divided|week|semana/.test(t)) return "weekly";
  if (/128/.test(t)) return "all128";
  if (/\b20\b/.test(t)) return "q20";
  if (/lectura|escritura|reading|writing/.test(t)) return "reading";
  return null;
}

function DocIcon({ kind }: { kind: DocKind | null }) {
  const p = { viewBox: "0 0 24 24", fill: "none", stroke: "#FFD24D", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "flashcards")
    return (
      <svg {...p}>
        <path d="M6 9V3h12v6" />
        <rect x="3" y="9" width="18" height="8" rx="2" />
        <path d="M7 14h10v7H7z" />
      </svg>
    );
  if (kind === "all128" || kind === "weekly")
    return (
      <svg {...p}>
        <path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z" />
        <path d="M12 6v13.5" />
      </svg>
    );
  if (kind === "reading")
    return (
      <svg {...p}>
        <path d="M15 4l5 5L9 20H4v-5z" />
        <path d="M13 6l5 5" />
      </svg>
    );
  if (kind === "q20")
    return (
      <svg {...p}>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h7M9 17h5" />
    </svg>
  );
}
