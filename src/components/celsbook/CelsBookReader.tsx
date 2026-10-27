"use client";

// CelsUS CelsBook reader (celsus-celsbook-mockup.html): navy top bar, contents, one "book page" per screen with
// the section's band, the narration bar, and the section's own interactions (Blocks.tsx). Progress is saved
// where the e-book reader saves it (ebook_answers: last_screen, completed_at, and the seen pages in answers._seen).
import "./celsbook.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BackButtons, type UsBack } from "@/components/celsus/BackButtons";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Answers, Ebook, Screen } from "@/lib/ebook-format";
import type { Json } from "@/lib/supabase/types";
import { answerKey } from "@/lib/ebook-format";
import { SECTIONS, clock, leadOf, sectionOf, two, type SectionKey } from "@/lib/celsbook";
import { clearLocal, finishLesson, keepLocal, readLocal } from "@/lib/offline";
import { SignedUrls, useSignedRef } from "@/components/reader/media";
import { reportError } from "@/lib/report-error";
import { ReaderBlock } from "@/components/reader/ReaderBlocks";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { BookBlock, BookCtx, type Local } from "./Blocks";
import { jakartaItalic } from "./fonts";
import { Immersive } from "./Immersive";


const SEEN = "_seen";

type Props = {
  ebook: Ebook;
  episodeN: number;
  userId: string;
  initial: { answers: Answers; last_screen: string | null; completed_at: string | null; updated_at?: string } | null;
  signed: Record<string, string>;
  local: Local;
  episodeHref: string;
  /** The episode's next part ("Seguir con CelsAudio →"). */
  nextPart: { href: string; label: string } | null;
  /** The episode's CelsBook lesson: reaching the last page records it as finished (progress + XP, as every part). */
  bookLessonId: string | null;
  bookDone: boolean;
  startScreen: string | null;
  /** Fallback for blocks this design doesn't use (none in the CelsUS books today). */
  readerT: Dictionary["reader"];
  /** The completion screen shown after the last page ("Terminar ✓"). */
  completionHref: string;
  /** C-013 back buttons (course + episode). */
  back?: UsBack;
  /** The CelsUS final exam (checklist links to it). */
  finalExamHref?: string | null;
};

const SECT_TITLE: Record<SectionKey, React.ReactNode> = {
  intro: (
    <>
      <span className="w">Bien</span>venido
    </>
  ),
  wtw: (
    <>
      Words
      <br />
      that Work
    </>
  ),
  vtv: (
    <>
      Verbs
      <br />
      that Vibe
    </>
  ),
  ptf: (
    <>
      Phrases
      <br />
      that Fit
    </>
  ),
  fun: <>funics</>,
  fof: (
    <>
      Foc<span className="us">US</span>
      <small>on your Future</small>
    </>
  ),
  rep: (
    <>
      Repaso
      <br />
      final
    </>
  ),
};

export function CelsBookReader(props: Props) {
  const { ebook, episodeN, userId, initial, signed, episodeHref, nextPart, bookLessonId, readerT } = props;
  const router = useRouter();
  const screens = ebook.screens;
  const last = screens.length - 1;
  const keys = useMemo(() => screens.map((s) => sectionOf(s.kicker)), [screens]);
  const repeat = useMemo(() => {
    const c = new Map<SectionKey, number>();
    keys.forEach((k) => c.set(k, (c.get(k) ?? 0) + 1));
    return c;
  }, [keys]);

  const asked = props.startScreen ? screens.findIndex((s) => s.id === props.startScreen) : -1;
  const resume = Math.max(0, screens.findIndex((s) => s.id === initial?.last_screen));
  const [cur, setCur] = useState(asked >= 0 ? asked : initial?.completed_at ? 0 : resume);
  const [answers, setAnswers] = useState<Answers>(initial?.answers ?? {});
  const [completedAt, setCompletedAt] = useState<string | null>(initial?.completed_at ?? null);
  const [tocOpen, setTocOpen] = useState(false);
  const [local, setLocalState] = useState<Local>(props.local);
  const supabase = useRef(createClient());
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(props.bookDone);
  const recording = useRef<Promise<unknown> | null>(null);

  const persist = useCallback(
    async (row: { answers: Answers; last_screen: string | null; completed_at: string | null }) => {
      const full = { user_id: userId, ebook_id: ebook.id, ...row };
      // A local copy first: if the phone is offline, OfflineSync sends it when the connection returns.
      keepLocal({ ...full, savedAt: new Date().toISOString() });
      const { error } = await supabase.current.from("ebook_answers").upsert(full, { onConflict: "user_id,ebook_id" });
      if (!error) clearLocal(ebook.id);
    },
    [ebook.id, userId],
  );
  const latest = useRef<{ answers: Answers; last_screen: string | null; completed_at: string | null } | null>(null);
  const schedule = (row: { answers: Answers; last_screen: string | null; completed_at: string | null }, wait = 800) => {
    if (pending.current) clearTimeout(pending.current);
    latest.current = row;
    pending.current = setTimeout(() => {
      pending.current = null;
      void persist(row);
    }, wait);
  };
  // Leaving the page (or the app going to the background) sends what is still waiting.
  useEffect(() => {
    const flush = () => {
      if (!pending.current || !latest.current) return;
      clearTimeout(pending.current);
      pending.current = null;
      void persist(latest.current);
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [persist]);

  const seenList = (a: Answers) => (Array.isArray(a[SEEN]) ? (a[SEEN] as string[]).filter((x) => typeof x === "string") : []);

  // An unsent copy written offline is newer than the server's.
  useEffect(() => {
    const saved = readLocal(ebook.id);
    if (!saved || saved.user_id !== userId) return;
    if (initial?.updated_at && new Date(saved.savedAt) <= new Date(initial.updated_at)) return clearLocal(ebook.id);
    setAnswers((saved.answers as Answers) ?? {});
    setCompletedAt(saved.completed_at);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  /** Shows page n: marks it seen, saves where the student is, and the book as done on the last page. */
  const visit = (n: number, base: Answers) => {
    const id = screens[n].id;
    const seen = seenList(base);
    const next = seen.includes(id) ? base : { ...base, [SEEN]: [...seen, id] as Json };
    const done = completedAt ?? (n === last ? new Date().toISOString() : null);
    if (next !== base) setAnswers(next);
    if (done !== completedAt) setCompletedAt(done);
    schedule({ answers: next, last_screen: id, completed_at: done }, n === last ? 0 : 800);
    if (n === last && bookLessonId && !finished.current) {
      finished.current = true;
      recording.current = finishLesson(supabase.current, userId, bookLessonId);
    }
  };

  // The page the student opens counts as seen.
  useEffect(() => {
    visit(cur, answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  const go = (n: number) => {
    if (n < 0 || n > last) return;
    setCur(n);
    setTocOpen(false);
    visit(n, answers);
    window.scrollTo({ top: 0 });
  };

  const setAnswer = (key: string, value: unknown) => {
    const next = { ...answers, [key]: value as Json };
    setAnswers(next);
    schedule({ answers: next, last_screen: screens[cur].id, completed_at: completedAt });
  };

  useEffect(() => {
    if (!tocOpen) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTocOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [tocOpen]);

  const ctx = useMemo(
    () => ({
      local,
      setLocal: (k: keyof Local, v: string) => setLocalState((l) => ({ ...l, [k]: v })),
      goSection: (k: SectionKey) => {
        const i = keys.indexOf(k);
        if (i >= 0) go(i);
      },
      finalExamHref: props.finalExamHref,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go reads the latest state through the render
    [local, keys, answers, cur, completedAt],
  );

  /** "Terminar ✓": waits for the book to be recorded, then the completion screen (state A or B). */
  const [leaving, setLeaving] = useState(false);
  const end = async () => {
    setLeaving(true);
    if (pending.current) clearTimeout(pending.current);
    await persist({ answers, last_screen: screens[last].id, completed_at: completedAt ?? new Date().toISOString() });
    if (bookLessonId && !finished.current) {
      finished.current = true;
      recording.current = finishLesson(supabase.current, userId, bookLessonId);
    }
    await recording.current;
    router.push(props.completionHref);
  };

  const screen = screens[cur];
  const key = keys[cur];
  const sec = SECTIONS[key];
  const seen = new Set(seenList(answers));
  const tocLabel = (s: Screen, i: number) => (repeat.get(keys[i])! > 1 ? `${SECTIONS[keys[i]].short} · ${s.title}` : SECTIONS[keys[i]].name);

  return (
    <SignedUrls.Provider value={signed}>
      <BookCtx.Provider value={ctx}>
        <div className={`cb ${jakartaItalic.variable}`} style={{ ["--sc" as string]: sec.c, ["--si" as string]: sec.ink }}>
      <Immersive />
          {props.back && (
            // C-013: the back buttons scroll away with the page; the sticky bar below stays slim while reading.
            <div className="tbnav">
              <BackButtons t={props.back.t} course={props.back.course} episode={{ href: episodeHref, n: episodeN }} dark />
            </div>
          )}
          <header className="tb">
            {!props.back && (
              <Link href={episodeHref} className="back">
                <i aria-hidden>‹</i>Episodio {episodeN}
              </Link>
            )}
            <div className="ttl">
              <b>CelsBook · Episodio {episodeN}</b>
              {subtitleOf(ebook.subtitle)}
            </div>
            <button type="button" className="tocbtn" aria-expanded={tocOpen} aria-controls="cb-toc" onClick={() => setTocOpen(!tocOpen)}>
              ☰ Contenido
            </button>
            <div className="logo" aria-label="CelsUS">
              cels<span>US</span>
            </div>
          </header>
          <div className="pbar" role="progressbar" aria-label="Avance del libro" aria-valuemin={1} aria-valuemax={screens.length} aria-valuenow={cur + 1}>
            <i style={{ width: `${((cur + 1) / screens.length) * 100}%` }} />
          </div>

          <div className="lay">
            <div className={`scrim${tocOpen ? " open" : ""}`} onClick={() => setTocOpen(false)} aria-hidden />
            <nav className={`toc${tocOpen ? " open" : ""}`} id="cb-toc" aria-label="Contenido">
              <h2>CONTENIDO</h2>
              <ol>
                {screens.map((s, i) => {
                  const done = seen.has(s.id) && i !== cur;
                  return (
                    <li key={s.id}>
                      <button type="button" className={i === cur ? "on" : ""} aria-current={i === cur ? "page" : undefined} style={{ ["--c" as string]: SECTIONS[keys[i]].c }} onClick={() => go(i)}>
                        <i aria-hidden>{done ? "✓" : i + 1}</i>
                        <span className="l">{tocLabel(s, i)}</span>
                        {done && <span className="sr"> (vista)</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="note">✓ Tu avance se guarda solo</p>
            </nav>

            <main>
              <article className="page" key={screen.id}>
                <Page
                  screen={screen}
                  sk={key}
                  n={cur + 1}
                  episodeN={episodeN}
                  answers={answers}
                  setAnswer={setAnswer}
                  nextPart={nextPart}
                  episodeHref={episodeHref}
                  readerT={readerT}
                />
              </article>
            </main>
          </div>

          <nav className="navb" aria-label="Páginas">
            <button type="button" className="pv" disabled={cur === 0} onClick={() => go(cur - 1)}>
              ← Anterior
            </button>
            <span className="pg">
              Página {cur + 1} de {screens.length}
            </span>
            <button type="button" className="nx2" disabled={leaving} onClick={() => (cur === last ? void end() : go(cur + 1))}>
              {cur === last ? "Terminar ✓" : "Siguiente →"}
            </button>
          </nav>
        </div>
      </BookCtx.Provider>
    </SignedUrls.Provider>
  );
}

/** "Overcome your fears knowing who to trust · Principios…" → the part after the slogan. */
function subtitleOf(s: string | null) {
  if (!s) return "";
  const parts = s.split(" · ");
  return parts.length > 1 ? parts.slice(1).join(" · ") : s;
}

function Page({
  screen,
  sk,
  n,
  episodeN,
  answers,
  setAnswer,
  nextPart,
  episodeHref,
  readerT,
}: {
  screen: Screen;
  sk: SectionKey;
  n: number;
  episodeN: number;
  answers: Answers;
  setAnswer: (k: string, v: unknown) => void;
  nextPart: { href: string; label: string } | null;
  episodeHref: string;
  readerT: Dictionary["reader"];
}) {
  const sec = SECTIONS[sk];
  const lead = sk === "intro" ? null : leadOf(screen);
  const script = screen.narration?.script ?? "";
  const wt = screen.narration?.wt;
  const karaoke = sk === "intro" && !!script;
  const [time, setTime] = useState(-1);
  // On the last page, the activity ("Repasa tus Cels cards…") is the end card's line.
  const endIdx = sk === "rep" ? screen.blocks.findIndex((b) => b.type === "activity") : -1;
  const words = script.split(/\s+/).filter(Boolean);
  let spoken = -1;
  if (karaoke && wt && wt.length === words.length && time >= 0) for (let i = 0; i < wt.length && wt[i] <= time; i++) spoken = i;

  return (
    <>
      <div className="band">
        {/* Drawn by CSS (::before), so the decoration never counts as the page's main content. */}
        <span className="wm" aria-hidden data-wm={sec.wm} />
        <span className="mini" aria-hidden>
          cels<span>US</span>
        </span>
        <p className="sect">{SECT_TITLE[sk]}</p>
        <p className="lead">{lead?.text ?? sec.lead}</p>
      </div>
      <div className="ph">
        <h1>{screen.title}</h1>
        <span className="meta">
          {sec.meta}
          {screen.minutes ? ` · ${screen.minutes} min` : ""}
        </span>
      </div>
      <div className="body">
        <Listen refPath={screen.narration?.audio ?? null} onTime={karaoke ? setTime : undefined} />
        {screen.blocks.map((b, i) => {
          if (i === lead?.index || i === endIdx) return null;
          // The intro reads its narration as karaoke in place of the English paragraphs.
          if (karaoke && b.type === "para") return null;
          const node = isOwn(b.type) ? (
            <BookBlock
              key={i}
              block={b}
              section={sk}
              value={answers[answerKey(screen.id, i)]}
              onChange={(v) => setAnswer(answerKey(screen.id, i), v)}
              said={answers[`${answerKey(screen.id, i)}:said`]}
              onSaid={(v) => setAnswer(`${answerKey(screen.id, i)}:said`, v)}
            />
          ) : (
            <div key={i} data-theme="celsus">
              <ReaderBlock block={b} value={answers[answerKey(screen.id, i)]} onChange={(v) => setAnswer(answerKey(screen.id, i), v)} t={readerT} />
            </div>
          );
          if (karaoke && b.type === "quote")
            return [
              node,
              <p key="k" className="karaoke">
                {words.map((w, j) => (
                  <span key={j} className={j <= spoken ? "on" : undefined}>
                    {w}{" "}
                  </span>
                ))}
              </p>,
            ];
          return node;
        })}
        {sk === "rep" && (
          <section className="done">
            <h2>¡Terminaste el CelsBook del episodio {episodeN}!</h2>
            <p>{endIdx >= 0 ? (screen.blocks[endIdx] as { text: string }).text : "Repasa tus Cels cards y escucha el Cels audio una vez más."}</p>
            <Link href={nextPart?.href ?? episodeHref} className="btn b-gold">
              {nextPart ? `Seguir con ${nextPart.label} →` : "Volver al episodio →"}
            </Link>

          </section>
        )}
      </div>
      <div className="foot">
        <span className="pn">{two(n)}</span>
        <small>CelsUS · Latin American Media</small>
      </div>
    </>
  );
}

const OWN = new Set(["para", "quote", "tip", "activity", "list", "expand", "glossary", "phrases", "keys", "myth", "practice", "checklist", "fields", "notes"]);
const isOwn = (t: string) => OWN.has(t);

const SPEEDS = [1, 0.8, 1.2];
/** "▶ Escuchar esta página": narration.audio with a 52 px play button and a speed toggle. */
function Listen({ refPath, onTime }: { refPath: string | null; onTime?: (t: number) => void }) {
  const src = useSignedRef(refPath);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState<number | null>(null);
  const [speed, setSpeed] = useState(0);
  // A file that can't load hides the player (no dead button) and is logged for staff.
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className="listen">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onError={(e) => {
          if (e.currentTarget.getAttribute("src") !== src) return;
          setFailed(true);
          reportError(`CelsBook audio did not load: ${refPath} (media error ${e.currentTarget.error?.code ?? "?"})`);
        }}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDur(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => (setPlaying(false), onTime?.(-1))}
        onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime)}
      />
      <button
        type="button"
        className="play"
        aria-label={playing ? "Pausar" : "Escuchar esta página"}
        onClick={() => {
          const a = audio.current;
          if (!a) return;
          if (a.paused) {
            a.playbackRate = SPEEDS[speed];
            void a.play().catch(() => {});
          } else a.pause();
        }}
      >
        <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
      </button>
      <div>
        <b>Escuchar esta página</b>
        <span>Con la voz de Amy{dur ? ` · ${clock(dur)}` : ""}</span>
      </div>
      <button
        type="button"
        className="sp"
        aria-label={`Velocidad ${SPEEDS[speed]}x. Cambiar`}
        onClick={() => {
          const s = (speed + 1) % SPEEDS.length;
          setSpeed(s);
          if (audio.current) audio.current.playbackRate = SPEEDS[s];
        }}
      >
        {SPEEDS[speed]}x
      </button>
    </div>
  );
}
