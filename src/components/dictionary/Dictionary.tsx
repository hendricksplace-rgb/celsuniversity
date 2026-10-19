"use client";

// CelsBSNS Course Dictionary (celsu-celsbsns-dictionary-brief.md, celsbsns-dictionary-mockup.html): the hero with
// the counts, sticky search + Todas/Guardadas + A–Z, the letter groups of term cards ("Escuchar" with the browser's
// speech synthesis, "Guardar" in glossary_saves), the rail (Mis palabras, Practica una palabra, Descargar) and a
// print stylesheet for "Descargar PDF". The entries come from the lesson text, parsed on the server.
import { createPortal } from "react-dom";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { norm, type Term } from "@/lib/glossary";
import { Icon, Layout, RailCard, ShellPage, TopBar, shell as sh, useLangPref } from "@/components/bsns/shell";
import s from "./dictionary.module.css";

type Lang = "es" | "en";
const UI = {
  es: {
    tk: "CELSBSNS · RECURSOS",
    ttl: "Diccionario del curso",
    back: "Volver a tu semana",
    kick: "DICCIONARIO · SEMANAS 1–10",
    h1a: "Tu vocabulario de",
    h1b: "negocios",
    p: "Todas las palabras clave del curso, en inglés con su traducción y significado. Búscalas, escucha cómo se pronuncian y guarda las que quieres practicar.",
    terms: "términos",
    letters: "letras",
    saved: "guardadas",
    pdf: "Descargar PDF",
    ph: "Busca en inglés o en español…",
    clr: "Borrar búsqueda",
    all: "Todas",
    mine: "Guardadas",
    filter: "Mostrar",
    az: "Ir a una letra",
    count: (n: number, t: number) => (
      <>
        Mostrando <b>{n}</b> de {t} términos
      </>
    ),
    countAll: (t: number) => (
      <>
        <b>{t}</b> términos · de la A a la Z
      </>
    ),
    words: (n: number) => (n === 1 ? "1 término" : `${n} términos`),
    listen: "Escuchar",
    save: "Guardar",
    savedB: "Guardada",
    tStar: "MÉTODO STAR",
    noQ: (q: string) => `No encontramos “${q}”`,
    noQp: "Revisa cómo lo escribiste o busca la palabra en español.",
    noS: "Aún no guardas palabras",
    noSp: "Toca “Guardar” en cualquier palabra y aparecerá aquí para que la practiques.",
    seeAll: "Ver todas",
    myW: "MIS PALABRAS",
    myE: "Toca “Guardar” en una palabra para tenerla aquí y practicarla.",
    prac: "PRACTICA UNA PALABRA",
    pracQ: "¿Qué significa?",
    reveal: "Ver significado",
    next: "Otra",
    dl: "DESCARGAR",
    dlP: "El diccionario completo en PDF, para imprimir o tenerlo sin internet.",
    mob: (n: number) => (n === 1 ? "1 guardada" : `${n} guardadas`),
    tSaved: "Guardada en tus palabras",
    tRem: "Quitada de tus palabras",
    tErr: "No se pudo guardar. Revisa tu conexión.",
    rm: (w: string) => `Quitar ${w}`,
    toTop: "Volver arriba",
    rail: "Diccionario",
    fallback: "Este es el texto del diccionario tal como está en la lección.",
  },
  en: {
    tk: "CELSBSNS · RESOURCES",
    ttl: "Course Dictionary",
    back: "Back to your week",
    kick: "DICTIONARY · WEEKS 1–10",
    h1a: "Your business",
    h1b: "vocabulary",
    p: "Every key word in the course, in English with its Spanish translation and meaning. Search, hear how each one sounds, and save the ones you want to practice.",
    terms: "terms",
    letters: "letters",
    saved: "saved",
    pdf: "Download PDF",
    ph: "Search in English or Spanish…",
    clr: "Clear search",
    all: "All",
    mine: "Saved",
    filter: "Show",
    az: "Jump to a letter",
    count: (n: number, t: number) => (
      <>
        Showing <b>{n}</b> of {t} terms
      </>
    ),
    countAll: (t: number) => (
      <>
        <b>{t}</b> terms · A to Z
      </>
    ),
    words: (n: number) => (n === 1 ? "1 term" : `${n} terms`),
    listen: "Listen",
    save: "Save",
    savedB: "Saved",
    tStar: "STAR METHOD",
    noQ: (q: string) => `No results for “${q}”`,
    noQp: "Check the spelling or try the word in Spanish.",
    noS: "No saved words yet",
    noSp: "Tap “Save” on any word and it will show up here so you can practice it.",
    seeAll: "See all",
    myW: "MY WORDS",
    myE: "Tap “Save” on a word to keep it here and practice it.",
    prac: "PRACTICE A WORD",
    pracQ: "What does it mean?",
    reveal: "Show meaning",
    next: "Another",
    dl: "DOWNLOAD",
    dlP: "The full dictionary as a PDF, to print or use offline.",
    mob: (n: number) => `${n} saved`,
    tSaved: "Saved to your words",
    tRem: "Removed from your words",
    tErr: "Couldn't save. Check your connection.",
    rm: (w: string) => `Remove ${w}`,
    toTop: "Back to top",
    rail: "Dictionary",
    fallback: "This is the dictionary text as it is in the lesson.",
  },
};
type UIT = (typeof UI)["es"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const cardId = (en: string) => `t-${norm(en).replace(/[^a-z0-9]+/g, "-")}`;

/** Highlights the first match, accent- and case-insensitive, mapped back onto the original characters. */
function Hl({ text, q }: { text: string; q: string }) {
  const nq = norm(q.trim());
  if (!nq) return <>{text}</>;
  let n = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = norm(text[i]!);
    for (let k = 0; k < c.length; k++) map.push(i);
    n += c;
  }
  const at = n.indexOf(nq);
  if (at < 0) return <>{text}</>;
  const a = map[at]!;
  const b = map[at + nq.length - 1]! + 1;
  return (
    <>
      {text.slice(0, a)}
      <mark>{text.slice(a, b)}</mark>
      {text.slice(b)}
    </>
  );
}

/** "Escuchar": the browser's speech synthesis only (en-US, rate 0.9, text in parentheses removed). */
function say(txt: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return onEnd?.();
  const w = txt
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/&/g, " and ")
    .trim();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(w);
  u.lang = "en-US";
  u.rate = 0.9;
  const v = speechSynthesis.getVoices().find((x) => x.lang === "en-US");
  if (v) u.voice = v;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
    setTimeout(onEnd, 2500);
  }
  speechSynthesis.speak(u);
}

export type DictionaryProps = {
  items: Term[];
  /** Title and subtitle lines, for the PDF (EN from body, ES from data.text_es). */
  head: { en: { title: string; sub: string }; es: { title: string; sub: string } };
  /** The lesson text, shown as-is when no entry parses. */
  raw: string;
  savedInit: string[];
  courseId: string;
  userId: string;
  backHref: string;
  defaultLang: Lang;
};

export function Dictionary(p: DictionaryProps) {
  const [lang, chooseLang] = useLangPref(p.userId, p.defaultLang);
  const t = UI[lang];
  const ALL = p.items;
  const sb = useRef<ReturnType<typeof createClient> | null>(null);
  const db = useCallback(() => (sb.current ??= createClient()), []);

  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [mode, setMode] = useState<"all" | "saved">("all");
  const [saved, setSaved] = useState<Set<string>>(() => new Set(p.savedInit));
  const [cur, setCur] = useState("A");
  const [pw, setPw] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [topBtn, setTopBtn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toastT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const azRef = useRef<HTMLDivElement>(null);
  const has = useMemo(() => new Set(ALL.map((x) => x.L)), [ALL]);

  // After mount: a random practice word, and the deep links ?q=, ?view=saved, ?go=P.
  useEffect(() => {
    setMounted(true);
    if (ALL.length) setPw(Math.floor(Math.random() * ALL.length));
    const u = new URLSearchParams(location.search);
    if (u.get("q")) setQ(u.get("q")!);
    if (u.get("view") === "saved") setMode("saved");
    const go = u.get("go");
    if (go && /^[A-Z]$/.test(go)) requestAnimationFrame(() => document.getElementById(`g-${go}`)?.scrollIntoView());
  }, [ALL.length]);

  const list = useMemo(() => {
    let r = ALL;
    if (mode === "saved") r = r.filter((x) => saved.has(x.en));
    const nq = norm(dq.trim());
    if (nq) r = r.filter((x) => norm(x.en).includes(nq) || norm(x.es).includes(nq) || norm(x.def).includes(nq));
    return r;
  }, [ALL, mode, saved, dq]);
  const groups = useMemo(() => LETTERS.map((l) => [l, list.filter((x) => x.L === l)] as const).filter((g) => g[1].length), [list]);
  const shownLetters = new Set(groups.map((g) => g[0]));
  const filtered = !!dq.trim() || mode === "saved";

  // Current letter while scrolling, and the "back to top" button.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      setTopBtn(window.scrollY > 900);
      let c: string | null = null;
      for (const g of document.querySelectorAll<HTMLElement>("[data-grp]")) if (g.getBoundingClientRect().top < 300) c = g.dataset.grp!;
      if (c) setCur(c);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", on, { passive: true });
    measure();
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  // On phone the strip scrolls sideways and keeps the current letter centered.
  useEffect(() => {
    const strip = azRef.current;
    const b = strip?.querySelector<HTMLElement>(`[data-go="${cur}"]`);
    if (!strip || !b || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: b.offsetLeft - strip.clientWidth / 2 + b.offsetWidth / 2, behavior: "smooth" });
  }, [cur]);

  const flash = (m: string) => {
    setToast(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 1800);
  };
  const toggleSave = async (en: string) => {
    const on = !saved.has(en);
    const apply = (yes: boolean) =>
      setSaved((x) => {
        const n = new Set(x);
        if (yes) n.add(en);
        else n.delete(en);
        return n;
      });
    apply(on);
    flash(on ? t.tSaved : t.tRem);
    const { error } = on
      ? await db().from("glossary_saves").upsert({ user_id: p.userId, course_id: p.courseId, term: en }, { onConflict: "user_id,course_id,term", ignoreDuplicates: true })
      : await db().from("glossary_saves").delete().eq("user_id", p.userId).eq("course_id", p.courseId).eq("term", en);
    if (error) {
      apply(!on);
      flash(t.tErr);
    }
  };
  const listen = (en: string, key: string) => {
    setPlaying(key);
    say(en, () => setPlaying((k) => (k === key ? null : k)));
  };
  const goLetter = (l: string) => {
    const g = document.getElementById(`g-${l}`);
    if (!g) return;
    setCur(l);
    g.scrollIntoView({ behavior: "smooth" });
  };
  const jumpTo = (en: string) => {
    setQ("");
    setMode("all");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById(cardId(en));
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.animate?.([{ boxShadow: "0 0 0 4px rgba(245,197,66,.6)" }, { boxShadow: "0 0 0 0 rgba(245,197,66,0)" }], { duration: 1400 });
      }),
    );
  };
  const print = () => window.print();

  const savedList = ALL.filter((x) => saved.has(x.en));
  const w = ALL[pw];

  const row = (
    <>
      <button type="button" className={cx(s.rowBtn, mode === "saved" && s.rowOn)} aria-pressed={mode === "saved"} onClick={() => setMode(mode === "saved" ? "all" : "saved")}>
        <Icon name="star" size={16} />
        {t.mob(saved.size)}
      </button>
      <button type="button" className={s.rowBtn} onClick={print}>
        <Icon name="download" size={16} />
        {t.pdf}
      </button>
    </>
  );

  const rail = (
    <>
      <RailCard title={`${t.myW} · ${savedList.length}`} className={s.railStar}>
        {savedList.length ? (
          <ul className={s.sl}>
            {savedList.map((x) => (
              <li key={x.en}>
                <button type="button" className={s.slA} onClick={() => jumpTo(x.en)}>
                  <b lang="en">{x.en}</b>
                  <span>{x.es}</span>
                </button>
                <button type="button" className={s.slX} onClick={() => void toggleSave(x.en)} aria-label={t.rm(x.en)}>
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.boxP}>{t.myE}</p>
        )}
      </RailCard>
      {w && (
        <div className={s.prac}>
          <p className={s.pracK}>
            <Icon name="sparkle" size={16} />
            {t.prac}
          </p>
          <p className={s.pw} lang="en">
            {w.en}
          </p>
          <div className={s.pa} aria-live="polite">
            {reveal ? (
              <>
                <b>{w.es}</b>
                {w.def}
              </>
            ) : (
              t.pracQ
            )}
          </div>
          <div className={s.prow}>
            {!reveal && (
              <button type="button" className={cx(s.btn, s.btnW)} onClick={() => setReveal(true)}>
                <Icon name="eye" size={18} />
                {t.reveal}
              </button>
            )}
            <button
              type="button"
              className={cx(s.btn, s.btnGhost)}
              onClick={() => {
                setPw((i) => (ALL.length > 1 ? (i + 1 + Math.floor(Math.random() * (ALL.length - 1))) % ALL.length : i));
                setReveal(false);
              }}
            >
              <Icon name="shuffle" size={18} />
              {t.next}
            </button>
            <button type="button" className={cx(s.btn, s.btnGhost, s.sq, playing === "pw" && s.playing)} onClick={() => listen(w.en, "pw")} aria-label={`${t.listen}: ${w.en}`}>
              <Icon name="vol" size={18} />
            </button>
          </div>
        </div>
      )}
      <RailCard title={t.dl} className={s.railDl}>
        <p className={s.boxP}>{t.dlP}</p>
        <button type="button" className={cx(s.btn, s.btnP, s.full)} onClick={print}>
          <Icon name="download" size={18} />
          {t.pdf}
        </button>
      </RailCard>
    </>
  );

  const main = (
    <>
      <section className={cx(sh.hero, s.hero)} aria-labelledby="dic-h1">
        <div className={s.hgrid}>
          <div>
            <p className={sh.pill}>
              <Icon name="book" size={16} />
              {t.kick}
            </p>
            <h1 id="dic-h1" className={cx(sh.heroTitle, s.h1)}>
              {t.h1a} <em>{t.h1b}</em>
            </h1>
            <p className={sh.heroIntro}>{t.p}</p>
            <ul className={s.stats}>
              <li>
                <b>{ALL.length}</b>
                <span>{t.terms}</span>
              </li>
              <li>
                <b>{has.size}</b>
                <span>{t.letters}</span>
              </li>
              <li>
                <b aria-live="polite">{saved.size}</b>
                <span>{t.saved}</span>
              </li>
            </ul>
          </div>
          <button type="button" className={cx(s.btn, s.btnW, s.heroBtn)} onClick={print}>
            <Icon name="download" size={18} />
            {t.pdf}
          </button>
        </div>
      </section>

      {ALL.length === 0 ? (
        <section className={s.rawCard} aria-label={t.ttl}>
          <p className={s.rawNote}>{t.fallback}</p>
          <div className={s.rawText} lang="en">
            {p.raw}
          </div>
        </section>
      ) : (
        <>
          <div className={s.tools}>
            <div className={s.trow}>
              <div className={cx(s.search, q && s.has)}>
                <Icon name="search" size={20} className={s.sIco} />
                <input type="search" placeholder={t.ph} value={q} autoComplete="off" aria-label={t.ph} onChange={(e) => setQ(e.target.value)} />
                {q && (
                  <button type="button" className={s.clr} onClick={() => setQ("")} aria-label={t.clr}>
                    <Icon name="x" size={20} />
                  </button>
                )}
              </div>
              <div className={s.seg} role="group" aria-label={t.filter}>
                <button type="button" aria-pressed={mode === "all"} onClick={() => setMode("all")}>
                  <Icon name="list" size={17} />
                  {t.all} <em>{ALL.length}</em>
                </button>
                <button type="button" aria-pressed={mode === "saved"} onClick={() => setMode("saved")}>
                  <Icon name="star" size={17} />
                  {t.mine} <em>{saved.size}</em>
                </button>
              </div>
            </div>
            <nav className={s.az} aria-label={t.az} ref={azRef}>
              {LETTERS.map((l) => {
                const on = shownLetters.has(l);
                return (
                  <button key={l} type="button" data-go={l} disabled={!on} className={cx(cur === l && on && s.azCur)} aria-current={cur === l && on ? "true" : undefined} onClick={() => goLetter(l)}>
                    {l}
                  </button>
                );
              })}
            </nav>
          </div>
          <p className={s.count} aria-live="polite">
            {filtered ? t.count(list.length, ALL.length) : t.countAll(ALL.length)}
          </p>
          {list.length === 0 ? (
            mode === "saved" && !dq.trim() ? (
              <div className={s.empty}>
                <div className={s.eic}>
                  <Icon name="star" size={28} />
                </div>
                <h2>{t.noS}</h2>
                <p>{t.noSp}</p>
                <button type="button" className={cx(s.btn, s.btnP)} onClick={() => setMode("all")}>
                  <Icon name="list" size={18} />
                  {t.seeAll}
                </button>
              </div>
            ) : (
              <div className={s.empty}>
                <div className={s.eic}>
                  <Icon name="search" size={28} />
                </div>
                <h2>{t.noQ(dq)}</h2>
                <p>{t.noQp}</p>
                <button type="button" className={cx(s.btn, s.btnS)} onClick={() => setQ("")}>
                  <Icon name="x" size={18} />
                  {t.clr}
                </button>
              </div>
            )
          ) : (
            groups.map(([l, xs]) => (
              <section key={l} className={s.grp} id={`g-${l}`} data-grp={l} aria-labelledby={`gh-${l}`}>
                <div className={s.lh}>
                  <h2 id={`gh-${l}`}>{l}</h2>
                  <span>{t.words(xs.length)}</span>
                </div>
                <div className={s.cards}>
                  {xs.map((x) => (
                    <TermCard key={x.en} t={t} x={x} q={dq} saved={saved.has(x.en)} playing={playing === x.en} onListen={() => listen(x.en, x.en)} onSave={() => void toggleSave(x.en)} />
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </>
  );

  return (
    <ShellPage lang={lang} className={s.root}>
      <TopBar kicker={t.tk} title={t.ttl} backHref={p.backHref} backLabel={t.back} lang={lang} onLang={chooseLang} progress={null} row={row} />
      <Layout main={main} rail={rail} railLabel={t.rail} />
      <button type="button" className={cx(s.topBtn, topBtn && s.topOn)} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={t.toTop} tabIndex={topBtn ? 0 : -1}>
        <Icon name="up" size={20} />
      </button>
      <div className={cx(s.toast, toast && s.toastOn)} role="status" aria-live="polite">
        {toast && (
          <>
            <Icon name="star" size={18} className={s.toastIco} />
            {toast}
          </>
        )}
      </div>
      {mounted &&
        createPortal(
          <div className={s.printRoot} aria-hidden>
            <h1>{p.head[lang].title || p.head.en.title}</h1>
            <div className={s.prSub}>{p.head[lang].sub || p.head.en.sub}</div>
            {ALL.length ? (
              <div className={s.cols}>
                {LETTERS.filter((l) => has.has(l)).map((l) => (
                  <div key={l}>
                    <h2>{l}</h2>
                    {ALL.filter((x) => x.L === l).map((x) => (
                      <p key={x.en}>
                        <b>{x.en}</b> – <i>{x.es}</i>: {x.def}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className={s.rawText}>{p.raw}</div>
            )}
          </div>,
          document.body,
        )}
    </ShellPage>
  );
}

function TermCard({ t, x, q, saved, playing, onListen, onSave }: { t: UIT; x: Term; q: string; saved: boolean; playing: boolean; onListen: () => void; onSave: () => void }) {
  return (
    <article className={cx(s.term, saved && s.sv)} id={cardId(x.en)}>
      <h3 lang="en">
        <Hl text={x.en} q={q} />
      </h3>
      <div className={s.es}>
        <i>ES</i>
        <span lang="es">
          <Hl text={x.es} q={q} />
        </span>
      </div>
      <p lang="es">
        <Hl text={x.def} q={q} />
      </p>
      {x.star && <span className={s.tag}>{t.tStar}</span>}
      <div className={s.acts}>
        <button type="button" className={cx(s.ab, playing && s.playing)} onClick={onListen} aria-label={`${t.listen}: ${x.en}`}>
          <Icon name="vol" size={18} />
          {t.listen}
        </button>
        <button type="button" className={cx(s.ab, s.star, saved && s.on)} onClick={onSave} aria-pressed={saved} aria-label={`${saved ? t.savedB : t.save}: ${x.en}`}>
          <Icon name="star" size={18} />
          {saved ? t.savedB : t.save}
        </button>
      </div>
    </article>
  );
}
