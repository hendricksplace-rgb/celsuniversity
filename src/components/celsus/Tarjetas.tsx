"use client";

// CelsUS "Tarjetas del examen" (celsus-tarjetas-mockup.html): one deck at a time, chosen by the student's exam
// track (profiles.civics_track). A: English question → English answer, with an optional Spanish line. B: Spanish.
// C (65/20): only the starred 2025 questions, in Spanish, plus "Practicar mis 20 preguntas" (all 20, from the
// "Examen 65/20 (2025)" evaluation). Flip, listen, "Ya me la sé / Todavía no", progress, an end screen and a
// review of the missed cards. No pronunciation scoring.
import "./tarjetas.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { finishLesson } from "@/lib/offline";
import { afterPartFinished } from "@/app/app/cursos/[slug]/episodio/[n]/terminado/actions";
import { setCivicsTrack } from "@/app/app/cursos/[slug]/episodio/[n]/tarjetas/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/components/course/kit";
import { Immersive } from "@/components/celsbook/Immersive";

type T = Dictionary["usCards"];
export type Track = "A" | "B" | "C";
export type DeckCard = {
  /** Stable id for the saved result: the 2025 question number, else the card's position. */
  key: string;
  no: number | null;
  starred: boolean;
  q: string;
  /** Accepted answers (an answer with ";" becomes a list). Empty when the answer changes (see `note`). */
  a: string[];
  note?: { text: string; link: string | null };
  qAudio: string | null;
  aAudio: string | null;
  /** Track A only: the matching Spanish card. */
  es?: { q: string; a: string } | null;
};
type Results = Record<string, boolean>;

/** Episode deck: saved per track on the flashcards lesson (progress.flashcard_state). */
type EpisodeMode = {
  kind: "episode";
  episodeN: number;
  partIndex: number;
  partTotal: number;
  courseSlug: string;
  lessonId: string;
  decks: Record<Track, DeckCard[]>;
  saved: Partial<Record<Track, Results>>;
  /** Starred questions in this episode (deduped across the English and Spanish decks). */
  starredCount: number;
  twentyHref: string;
  next: { label: string; href: string } | null;
};
/** "Practicar mis 20 preguntas": saved as known / review question numbers, like the civics exam cards. */
type TwentyMode = {
  kind: "twenty";
  deck: DeckCard[];
  examLessons: string[];
  cardState: { known: number[]; review: number[] };
};

export type TarjetasProps = {
  t: T;
  userId: string;
  track: Track | null;
  backHref: string;
  backLabel: string;
  signed: Record<string, string>;
  refreshAudio: () => Promise<Record<string, string>>;
  mode: EpisodeMode | TwentyMode;
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const REFRESH_AFTER_MS = 8 * 60 * 1000;
const ES_KEY = "celsu:tarjetas:es";

function shuffled<X>(xs: X[]) {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Signed audio that is asked for again before it expires (10 minutes). */
function useAudio(initial: Record<string, string>, refresh: () => Promise<Record<string, string>>) {
  const urls = useRef({ map: initial, at: Date.now() });
  const el = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => el.current?.pause(), []);
  const play = useCallback(
    async (ref: string | null) => {
      if (!ref) return;
      if (Date.now() - urls.current.at > REFRESH_AFTER_MS) urls.current = { map: await refresh().catch(() => urls.current.map), at: Date.now() };
      const url = urls.current.map[ref];
      if (!url) return;
      el.current?.pause();
      el.current = new Audio(url);
      el.current.play().catch(() => undefined);
    },
    [refresh],
  );
  const stop = useCallback(() => el.current?.pause(), []);
  return { play, stop, has: (ref: string | null) => !!ref && !!urls.current.map[ref] };
}

export function Tarjetas(p: TarjetasProps) {
  const { t, mode } = p;
  const router = useRouter();
  const twenty = mode.kind === "twenty";
  const [track, setTrack] = useState<Track | null>(twenty ? "C" : p.track);
  const [choosing, setChoosing] = useState(!twenty && !p.track);
  const audio = useAudio(p.signed, p.refreshAudio);

  // ---- the deck for the track, and saved results ----
  const fullDeck = useMemo<DeckCard[]>(() => (mode.kind === "twenty" ? mode.deck : track ? mode.decks[track] : []), [mode, track]);
  const savedFor = useCallback(
    (tr: Track | null): Results => {
      if (mode.kind === "twenty") {
        const r: Results = {};
        mode.cardState.review.forEach((n) => (r[String(n)] = false));
        mode.cardState.known.forEach((n) => (r[String(n)] = true));
        return r;
      }
      return (tr && mode.saved[tr]) || {};
    },
    [mode],
  );
  const store = useRef<Partial<Record<Track, Results>>>(mode.kind === "episode" ? { ...mode.saved } : {});
  const cards20 = useRef(mode.kind === "twenty" ? { known: [...mode.cardState.known], review: [...mode.cardState.review] } : { known: [], review: [] });
  const [deck, setDeck] = useState<DeckCard[]>(fullDeck);
  const [res, setRes] = useState<Results>(() => savedFor(track));
  const [i, setI] = useState(() => {
    const r = savedFor(track);
    const k = fullDeck.findIndex((c) => r[c.key] === undefined);
    return k < 0 ? 0 : k;
  });
  const [flipped, setFlipped] = useState(false);
  const [end, setEnd] = useState(false);
  const [showEs, setShowEs] = useState(false);
  const [finish, setFinish] = useState<{ complete: boolean; href: string } | null>(null);

  useEffect(() => {
    try {
      setShowEs(localStorage.getItem(ES_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  // Opening the part counts as studying today and marks it "in progress".
  useEffect(() => {
    if (mode.kind !== "episode") return;
    void createClient().rpc("record_lesson_progress", { p_lesson: mode.lessonId, p_finish: false });
  }, [mode]);

  const startDeck = (tr: Track | null, cards: DeckCard[], keep = true) => {
    const r = keep ? (mode.kind === "episode" ? (tr && store.current[tr]) || {} : savedFor(tr)) : {};
    setDeck(cards);
    setRes(r);
    const k = cards.findIndex((c) => r[c.key] === undefined);
    setI(keep && k > 0 ? k : 0);
    setFlipped(false);
    setEnd(false);
  };

  // ---- saving ----
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<(() => Promise<void>) | null>(null);
  const flush = useCallback(async () => {
    const job = pending.current;
    pending.current = null;
    if (job) await job();
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush],
  );
  const save = (next: Results) => {
    const now = new Date().toISOString();
    if (mode.kind === "episode") {
      if (!track) return;
      store.current = { ...store.current, [track]: { ...(store.current[track] ?? {}), ...next } };
      const state = store.current;
      pending.current = async () => {
        await createClient()
          .from("progress")
          .upsert({ user_id: p.userId, lesson_id: mode.lessonId, flashcard_state: state, last_activity: now, client_updated_at: now }, { onConflict: "user_id,lesson_id" });
      };
    } else {
      const known = new Set(cards20.current.known);
      const review = new Set(cards20.current.review);
      for (const [k, v] of Object.entries(next)) {
        const n = Number(k);
        if (!Number.isInteger(n)) continue;
        if (v) {
          known.add(n);
          review.delete(n);
        } else {
          review.add(n);
          known.delete(n);
        }
      }
      const state = { known: [...known], review: [...review] };
      cards20.current = state;
      pending.current = async () => {
        if (!mode.examLessons.length) return;
        await createClient()
          .from("progress")
          .upsert(
            mode.examLessons.map((lesson_id) => ({ user_id: p.userId, lesson_id, flashcard_state: state, last_activity: now, client_updated_at: now })),
            { onConflict: "user_id,lesson_id" },
          );
      };
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  };

  // ---- the end of the deck: the part is done (episode mode) ----
  const finished = useRef(false);
  const reachEnd = async () => {
    audio.stop();
    setEnd(true);
    await flush();
    if (mode.kind !== "episode" || finished.current) return;
    finished.current = true;
    await finishLesson(createClient(), p.userId, mode.lessonId);
    const r = await afterPartFinished(mode.courseSlug, mode.episodeN).catch(() => null);
    if (r) setFinish({ complete: r.complete, href: r.href });
    router.refresh();
  };

  const go = (k: number) => {
    audio.stop();
    setFlipped(false);
    if (k >= deck.length) void reachEnd();
    else setI(Math.max(0, k));
  };
  const mark = (v: boolean) => {
    const c = deck[i];
    const next = { ...res, [c.key]: v };
    setRes(next);
    save({ [c.key]: v });
    go(i + 1);
  };

  const pick = async (tr: Track) => {
    setTrack(tr);
    setChoosing(false);
    if (mode.kind === "episode") startDeck(tr, mode.decks[tr]);
    await setCivicsTrack(tr).catch(() => null);
    router.refresh();
  };

  // ---- chooser helper ----
  const [age, setAge] = useState("");
  const [years, setYears] = useState("");
  const [rec, setRec] = useState<Track | null>(null);
  const recommend = () => {
    const a = Number(age);
    const y = Number(years);
    setRec(a >= 65 && y >= 20 ? "C" : (a >= 50 && y >= 20) || (a >= 55 && y >= 15) ? "B" : "A");
  };

  const lang: "A" | "B" = track === "A" ? "A" : "B";
  const card = deck[i];
  const vals = deck.map((c) => res[c.key]);
  const known = vals.filter((v) => v === true).length;
  const notYet = vals.filter((v) => v === false).length;
  const missed = deck.filter((c) => res[c.key] === false);

  const toggleEs = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = !showEs;
    setShowEs(v);
    try {
      localStorage.setItem(ES_KEY, v ? "1" : "0");
    } catch {
      /* private mode */
    }
  };

  const title = twenty ? t.twentyTitle : t.title;
  const kicker = mode.kind === "twenty" ? t.twentyKicker : fill(t.kicker, { n: mode.episodeN, part: mode.partIndex, total: mode.partTotal });

  const header = (
    <header className="top">
      <span className="us" aria-hidden>
        US
      </span>
      <div className="wrap">
        <div className="bar">
          <Link className="back" href={p.backHref}>
            <i aria-hidden>‹</i>
            {p.backLabel}
          </Link>
          {!choosing && !end && deck.length > 1 && (
            <button type="button" className="shuf" onClick={() => startDeck(track, shuffled(deck), false)}>
              🔀 {t.shuffle}
            </button>
          )}
        </div>
        <p className="kick">{kicker}</p>
        <h1>{title}</h1>
        <p className="sub">{twenty ? t.twentySub : t.sub}</p>
      </div>
    </header>
  );

  const answer = (c: DeckCard) => {
    if (!c.a.length && c.note)
      return (
        <div className="ans">
          <p className="note">
            {t.checkOnline}
            <br />
            {c.note.text}
            {c.note.link && (
              <>
                <br />
                <a href={c.note.link} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                  {c.note.link.replace(/^https:\/\//, "")}
                </a>
              </>
            )}
          </p>
        </div>
      );
    if (c.a.length > 1)
      return (
        <div className="ans">
          <small>{t.anyOf[lang]}</small>
          <ul className="opts">
            {c.a.map((x) => (
              <li key={x}>{cap(x)}</li>
            ))}
          </ul>
        </div>
      );
    return (
      <div className="ans">
        <div className="one">{cap(c.a[0] ?? "")}</div>
      </div>
    );
  };

  return (
    <div className="tj">
      <Immersive />
      {header}
      <div className="main">
        {choosing ? (
          <section className="choose" aria-labelledby="tj-choose">
            <h2 id="tj-choose">{t.chooseTitle}</h2>
            <p>{t.chooseLead}</p>
            {(["A", "B", "C"] as Track[]).map((g) => (
              <button key={g} type="button" className={`opt t${g}${rec === g ? " rec" : ""}`} onClick={() => void pick(g)}>
                <span className="tl" aria-hidden>
                  {g}
                </span>
                <span className="od">
                  <b>{t.options[g].name}</b>
                  <span>{t.options[g].rule}</span>
                  <span className="tag">{t.options[g].tag}</span>
                </span>
                <em>{t.choose}</em>
              </button>
            ))}
            <div className="helper">
              <h3>{t.helperTitle}</h3>
              <div className="hrow">
                <label>
                  {t.age}
                  <input inputMode="numeric" placeholder={t.agePh} value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} />
                </label>
                <label>
                  {t.years}
                  <input inputMode="numeric" placeholder={t.yearsPh} value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, ""))} />
                </label>
                <button type="button" onClick={recommend}>
                  {t.calc}
                </button>
              </div>
              <p className="res" aria-live="polite">
                {rec && fill(t.result, { g: rec })}
              </p>
            </div>
            <p className="note">{t.note}</p>
          </section>
        ) : (
          <>
            {track && (
              <div className={`track t${track}`}>
                <span className="tl" aria-hidden>
                  {track}
                </span>
                <div className="tt">
                  <b>{t.tracks[track].name}</b>
                  <span>{t.tracks[track].desc}</span>
                </div>
                {!twenty && (
                  <button
                    type="button"
                    className="chg"
                    onClick={() => {
                      audio.stop();
                      setChoosing(true);
                    }}
                  >
                    {t.change}
                  </button>
                )}
              </div>
            )}
            {mode.kind === "episode" && track === "C" && (
              <div className="cinfo">
                <span>⭐ {mode.starredCount ? fill(t.cInfo, { n: mode.starredCount }) : t.cInfoNone}</span>
                <Link href={mode.twentyHref}>{t.practice20}</Link>
              </div>
            )}

            {!deck.length ? (
              <p className="empty">{t.empty}</p>
            ) : end ? (
              <section className="done" aria-live="polite" style={{ marginTop: 18 }}>
                <div className="coin">
                  <b>{known}</b>
                  <span>
                    {t.of} {deck.length}
                  </span>
                </div>
                <h2>{t.doneTitle}</h2>
                <p>{missed.length ? fill(t.doneSome, { k: known, m: missed.length }) : t.doneAll}</p>
                <div className="acts">
                  <button
                    type="button"
                    className="big reveal"
                    onClick={() => (missed.length ? startDeck(track, missed, false) : startDeck(track, deck, false))}
                  >
                    {missed.length === 1 ? t.retryOne : missed.length ? fill(t.retryMissed, { m: missed.length }) : t.retryAll}
                  </button>
                  {mode.kind === "episode" &&
                    (finish?.complete ? (
                      <Link className="big ghost" href={finish.href}>
                        {t.finishEpisode}
                      </Link>
                    ) : mode.next ? (
                      <Link className="big ghost" href={mode.next.href}>
                        {fill(t.nextPart, { part: mode.next.label })}
                      </Link>
                    ) : (
                      <Link className="big ghost" href={p.backHref}>
                        {t.backEpisode}
                      </Link>
                    ))}
                  {mode.kind === "twenty" && (
                    <Link className="big ghost" href={p.backHref}>
                      {p.backLabel}
                    </Link>
                  )}
                  <button type="button" className="big ghost" onClick={() => startDeck(track, fullDeck, false)}>
                    {t.restart}
                  </button>
                </div>
              </section>
            ) : (
              card && (
                <>
                  <div className="prog">
                    <span className="cnt">{fill(t.count, { n: i + 1, total: deck.length })}</span>
                    <div className="pbar" role="progressbar" aria-valuemin={0} aria-valuemax={deck.length} aria-valuenow={i} aria-label={fill(t.count, { n: i + 1, total: deck.length })}>
                      <i style={{ width: `${(i / deck.length) * 100}%` }} />
                    </div>
                    <div className="tally">
                      <span className="t-ok">
                        ✓ {known} <span className="sr-only">{t.known}</span>
                      </span>
                      <span className="t-no">
                        ✗ {notYet} <span className="sr-only">{t.notYet}</span>
                      </span>
                    </div>
                  </div>
                  <div className="scene">
                    <div
                      className={`fcard${flipped ? " flip" : ""}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button, a")) return;
                        setFlipped((f) => !f);
                      }}
                    >
                      <div className="face front" aria-hidden={flipped} lang={lang === "A" ? "en" : "es"}>
                        <div className="lab">
                          <span>
                            {t.question[lang]}
                            {card.no ? ` ${card.no}` : ""}
                          </span>
                          {card.starred && track !== "C" && <span className="star">★ 65/20</span>}
                        </div>
                        <div className="q">{card.q}</div>
                        {track === "A" && showEs && card.es?.q && (
                          <div className="es" lang="es">
                            {card.es.q}
                          </div>
                        )}
                        {audio.has(card.qAudio) && (
                          <button type="button" className="listen" tabIndex={flipped ? -1 : 0} onClick={() => void audio.play(card.qAudio)}>
                            🔊 {t.listenQ}
                          </button>
                        )}
                        {track === "A" && card.es && (
                          <button type="button" className="esb" tabIndex={flipped ? -1 : 0} onClick={toggleEs} aria-pressed={showEs}>
                            {showEs ? t.hideEs : t.showEs}
                          </button>
                        )}
                        <p className="hint">{t.tapHint}</p>
                      </div>
                      <div className="face rear" aria-hidden={!flipped} lang={lang === "A" ? "en" : "es"}>
                        <div className="lab">
                          <span>{t.answer[lang]}</span>
                        </div>
                        {answer(card)}
                        {track === "A" && showEs && card.es?.a && (
                          <div className="es" lang="es">
                            {card.es.a}
                          </div>
                        )}
                        {audio.has(card.aAudio) && (
                          <button type="button" className="listen" tabIndex={flipped ? 0 : -1} onClick={() => void audio.play(card.aAudio)}>
                            🔊 {t.listenA}
                          </button>
                        )}
                        {track === "A" && card.es && (
                          <button type="button" className="esb" tabIndex={flipped ? 0 : -1} onClick={toggleEs} aria-pressed={showEs}>
                            {showEs ? t.hideEs : t.showEs}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="acts">
                    {!flipped ? (
                      <button type="button" className="big reveal" onClick={() => setFlipped(true)}>
                        {t.reveal}
                      </button>
                    ) : (
                      <div className="two">
                        <button type="button" className="big no" onClick={() => mark(false)}>
                          {t.no}
                        </button>
                        <button type="button" className="big yes" onClick={() => mark(true)}>
                          {t.yes}
                        </button>
                      </div>
                    )}
                    <div className="nav">
                      <button type="button" disabled={i === 0} onClick={() => go(i - 1)}>
                        {t.prev}
                      </button>
                      <button type="button" onClick={() => go(i + 1)}>
                        {t.skip}
                      </button>
                    </div>
                  </div>
                </>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
