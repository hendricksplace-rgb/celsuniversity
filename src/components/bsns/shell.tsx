"use client";

// CelsBSNS v2 page shell shared by the Interactive Reading and the Interactive Writing Task: the sticky top bar
// (back, "SEMANA N · KIND", title, ES/EN toggle, 4 px progress), the tablet/phone step row, the right rail
// ("Tu avance" plus a page-specific card), the step headings and Previous / Next.
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { montserrat } from "./fonts";
import s from "./shell.module.css";

export type Lang = "es" | "en";
export type NavLink = { title: string; href: string } | null;

// ---------- icons (inline, stroke-based) ----------
const PATHS = {
  back: <path d="m15 18-6-6 6-6" />,
  next: <path d="m9 18 6-6-6-6" />,
  book: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  doc: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h6" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  video: (
    <>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m16 10 6-3v10l-6-3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  pencil: <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  pen: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  link: <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />,
  play: <path d="M7 4v16l13-8z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  mega: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1" />
      <path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
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
      <path d="M21 3 10 14" />
      <path d="M21 3l-7 18-4-7-7-4z" />
    </>
  ),
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3M12 13v4M8 21h8M9 17h6" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  para: <path d="M4 6h16M4 10h16M4 16h10M4 20h12" />,
  nob: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" />
    </>
  ),
  redo: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </>
  ),
  star: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  msg: <path d="M4 4h16v12H8l-4 4z" />,
  phone: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2.5" />
      <path d="M18 12h.01" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  shirt: <path d="M8 3l4 3 4-3 5 4-3 3v11H6V10L3 7z" />,
  cam: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v4h16v-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-9 8" />
    </>
  ),
  cal: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  text: <path d="M4 6h16M4 10h16M4 14h10M4 18h12" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  elev: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M12 3v18M8 9l-1.5 2h3zM16 15l-1.5-2h3z" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 2l3 3-3 3" />
      <path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" />
      <path d="M20 13v2a4 4 0 0 1-4 4H4" />
    </>
  ),
  mirror: (
    <>
      <ellipse cx="12" cy="10" rx="6" ry="8" />
      <path d="M12 18v4M8 22h8" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V5M16 20v-7M22 20H2" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  sign: (
    <>
      <path d="M3 17c3-4 5-9 7-9s-1 9 1 9 3-4 4-4 1 3 3 3 2-1 3-2" />
      <path d="M3 21h18" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  chev: <path d="M9 6l6 6-6 6" />,
};
export type IconName = keyof typeof PATHS;
/** An icon name from content data, or the fallback when the set doesn't have it (e.g. week 2's "user2"). */
export const iconOr = (name: string, fallback: IconName): IconName => (Object.hasOwn(PATHS, name) ? (name as IconName) : fallback);
export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {PATHS[name]}
    </svg>
  );
}

const SHELL = {
  es: { back: (n: number) => `Volver a la semana ${n}`, lang: "Idioma de las instrucciones", stepOf: (a: number, b: number) => `Paso ${a} de ${b}`, prev: "ANTERIOR", next: "SIGUIENTE", lessons: "Lecciones de la semana" },
  en: { back: (n: number) => `Back to week ${n}`, lang: "Language for the instructions", stepOf: (a: number, b: number) => `Step ${a} of ${b}`, prev: "PREVIOUS", next: "NEXT", lessons: "Lessons this week" },
};

/** The ES/EN choice for the instructions, remembered per student on this device. */
export function useLangPref(userId: string, initial: Lang) {
  const [lang, setLang] = useState<Lang>(initial);
  const key = `celsu:bsns-lang:${userId}`;
  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      if (v === "es" || v === "en") setLang(v);
    } catch {
      /* storage blocked */
    }
  }, [key]);
  const choose = useCallback(
    (v: Lang) => {
      setLang(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        /* storage blocked */
      }
    },
    [key],
  );
  return [lang, choose] as const;
}

/** Page scroll (0–1) and the current step: the last section whose top passed 35 % of the viewport. */
export function useScrollSpy(ids: string[], onReach?: (i: number) => void) {
  const [pct, setPct] = useState(0);
  const [current, setCurrent] = useState(0);
  const reach = useRef(onReach);
  reach.current = onReach;
  const key = ids.join("|");
  useEffect(() => {
    const list = key.split("|");
    let raf = 0;
    const measure = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setPct(h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0);
      const line = window.innerHeight * 0.35;
      let c = 0;
      list.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) c = i;
      });
      if (h > 0 && window.scrollY >= h - 4) c = list.length - 1;
      setCurrent(c);
      reach.current?.(c);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [key]);
  return { pct, current };
}

export const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Root of a CelsBSNS v2 page: the app shell's bar steps aside, fonts and tokens apply. */
export function ShellPage({ lang, className, children }: { lang: Lang; className?: string; children: React.ReactNode }) {
  return (
    <div className={`${s.page} ${montserrat.variable} ${className ?? ""}`} lang={lang}>
      {children}
    </div>
  );
}

export function TopBar({
  week,
  kind,
  title,
  backHref,
  lang,
  onLang,
  progress,
  row,
}: {
  week: number;
  kind: string;
  title: string;
  backHref: string;
  lang: Lang;
  onLang: (l: Lang) => void;
  progress: number;
  /** The tablet/phone row under the bar ("Paso N de M · step" and a button or status). */
  row: React.ReactNode;
}) {
  const t = SHELL[lang];
  return (
    <div className={s.sticky}>
      <header className={s.bar}>
        <div className={s.barIn}>
          <Link href={backHref} className={s.backBtn} aria-label={t.back(week)}>
            <Icon name="back" size={20} />
          </Link>
          <div className={s.barTitle}>
            <p className={s.barKick}>
              {lang === "es" ? "SEMANA" : "WEEK"} {week} · {kind}
            </p>
            <p className={s.barName}>{title}</p>
          </div>
          <div className={s.langToggle} role="group" aria-label={t.lang}>
            {(["es", "en"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={lang === v} onClick={() => onLang(v)} lang={v}>
                {v === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
        </div>
        <div className={s.progress} aria-hidden>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </header>
      <div className={s.stepRow}>{row}</div>
    </div>
  );
}

/** "Paso N de M · name" for the tablet/phone row. */
export function StepRowText({ lang, n, total, name }: { lang: Lang; n: number; total: number; name: string }) {
  return (
    <p className={s.stepRowText} aria-live="polite">
      <strong>
        {SHELL[lang].stepOf(n, total)} · {name}
      </strong>
    </p>
  );
}

export function Layout({ main, rail, railLabel }: { main: React.ReactNode; rail: React.ReactNode; railLabel: string }) {
  return (
    <div className={s.layout}>
      <div className={s.main}>{main}</div>
      <aside className={s.rail} aria-label={railLabel}>
        {rail}
      </aside>
    </div>
  );
}

export function RailCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`${s.railCard} ${className ?? ""}`}>
      <p className={s.railK}>{title}</p>
      {children}
    </div>
  );
}

/** "Tu avance": a step is checked once reached; the current one is highlighted. */
export function RailSteps({
  steps,
  current,
  done,
  onGo,
  extra,
}: {
  steps: string[];
  current: number;
  done: (i: number) => boolean;
  onGo: (i: number) => void;
  /** A small counter after the step name (Speaking: "1/3"). */
  extra?: (i: number) => React.ReactNode;
}) {
  return (
    <ol className={s.railSteps}>
      {steps.map((name, i) => (
        <li key={name}>
          <button type="button" onClick={() => onGo(i)} aria-current={current === i ? "step" : undefined} data-done={done(i) || undefined}>
            <span className={s.railDot}>{done(i) ? <Icon name="check" size={13} /> : i + 1}</span>
            {name}
            {extra?.(i) != null && <small className={s.railExtra}>{extra(i)}</small>}
          </button>
        </li>
      ))}
    </ol>
  );
}

export function StepHead({ kicker, icon, id, title }: { kicker: string; icon: IconName; id: string; title: string }) {
  return (
    <div className={s.stepHead}>
      <span className={s.stepIcon}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className={s.stepK}>{kicker}</p>
        <h2 id={id} className={s.stepTitle}>
          {title}
        </h2>
      </div>
    </div>
  );
}

export function Pager({ lang, prev, next, label }: { lang: Lang; prev: NavLink; next: NavLink; label: (title: string) => string }) {
  const t = SHELL[lang];
  return (
    <nav className={s.pager} aria-label={t.lessons}>
      {prev ? (
        <Link href={prev.href} className={s.prevBtn}>
          <span className={s.pagerK}>{t.prev}</span>
          <span className={s.pagerT}>
            <Icon name="back" size={16} /> {label(prev.title)}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href} className={s.nextBtn}>
          <span className={s.pagerK}>{t.next}</span>
          <span className={s.pagerT}>
            {label(next.title)} <Icon name="next" size={16} />
          </span>
        </Link>
      )}
    </nav>
  );
}

/** A side drawer on desktop and tablet, a bottom sheet on phone: focus moves in, Tab stays inside, Esc closes. */
export function Sheet({ title, sub, closeLabel, onClose, children }: { title: string; sub: React.ReactNode; closeLabel: string; onClose: () => void; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && boxRef.current) {
        const f = boxRef.current.querySelectorAll<HTMLElement>("button, a[href]");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return createPortal(
    <div className={`${s.scrim} ${montserrat.variable}`} onClick={onClose}>
      <div ref={boxRef} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby="bsns-sheet-h" onClick={(e) => e.stopPropagation()}>
        <div className={s.sheetHead}>
          <div>
            <h2 id="bsns-sheet-h" className={s.sheetTitle}>
              {title}
            </h2>
            <div className={s.sheetSub}>{sub}</div>
          </div>
          <button ref={closeRef} type="button" className={s.sheetClose} onClick={onClose} aria-label={closeLabel}>
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Shared class names (hero, cards, step sections) for the pages built on the shell. */
export { s as shell };
