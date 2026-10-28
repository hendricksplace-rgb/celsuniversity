"use client";

// C-035: CelsTV CelsCards for episodes 1–8 (celsu-celstv-celscards-mockup.html). The same deck, tabs, Amy's audio,
// "Ahora dilo tú" scoring and XP, and end screen as CardsPart; new: big yellow side arrows (with swipe and ← →),
// a livelier card (category gradient, CelsU ribbons, the "e" on both faces, a bouncy flip) and, the very first time
// a student opens any CelsTV deck, a "tap to flip" guide on Palabras card 1. The guide is remembered per student
// (user_preferences.celstv_cards_coach_done), with localStorage as the stopgap until that has been saved.
import "./cards-v2.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FreshImg } from "@/components/reader/media";
import { fill } from "@/components/course/kit";
import { usePartShell } from "./PartShell";
import { reducedMotion, sfx } from "./fx";
import { CATS, CAT_TAB, XP_PER_WORD, recognizer, say, scoreSpeech, type Card, type Cat, type SR } from "./CardsPart";

const CAT_COLOR: Record<Cat, string> = { words: "#35C3F0", verbs: "#F5178C", phrases: "#6DC067" };
const SPARKS = ["#FFC531", "#F5178C", "#35C3F0", "#6DC067", "#5B8DEF"];
const LS_COACH = "celstv-cards-coach-done";

const Logo = () => (
  // eslint-disable-next-line @next/next/no-img-element -- the CelsTV "e", a small local SVG
  <img className="logo-e" src="/progreso/celstv-e.svg" alt="" width={44} height={46} />
);

const Chevron = ({ left }: { left?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#B0136F" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

const Hand = () => (
  <svg viewBox="0 0 64 64" aria-hidden>
    <path
      d="M24 30V12a5 5 0 0110 0v14l12 3c4 1 6 4 5 8l-3 13c-1 4-4 7-9 7H30c-3 0-5-1-7-4L13 39c-2-3 1-7 5-6l6 3z"
      fill="#fff"
      stroke="#1B1640"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  </svg>
);

type MicState = { state: "idle" | "listening" | "off"; result: null | { score: number; heard: string; words: { w: string; ok: boolean }[] } };

export function CardsV2({ cards, coachDone }: { cards: Card[]; coachDone: boolean }) {
  const { t, userId, setProgress, setCounter, addXp, finish, backHref, celebrate } = usePartShell();
  const c2 = t.cv2;
  const cats = CATS.filter((c) => cards.some((k) => k.cat === c));
  const all = useMemo(() => Object.fromEntries(CATS.map((c) => [c, cards.filter((k) => k.cat === c).map((k) => k.id)])) as Record<Cat, string[]>, [cards]);
  const [deck, setDeck] = useState<Record<Cat, string[]>>(all);
  const [pos, setPos] = useState<Record<Cat, number>>({ words: 0, verbs: 0, phrases: 0 });
  const [cat, setCat] = useState<Cat>(cats[0] ?? "words");
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [scored, setScored] = useState<Set<string>>(new Set());
  const [ended, setEnded] = useState(false);
  const [dir, setDir] = useState<"" | "l" | "r">("");
  const [coach, setCoach] = useState(!coachDone);
  const [toast, setToast] = useState("");
  const [nudge, setNudge] = useState(0);
  const [mic, setMic] = useState<MicState>({ state: "idle", result: null });
  const rec = useRef<SR | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const list = deck[cat];
  const i = Math.min(pos[cat], Math.max(0, list.length - 1));
  const card = byId.get(list[i] ?? "");
  const total = CATS.reduce((s, c) => s + deck[c].length, 0);
  const answered = CATS.reduce((s, c) => s + deck[c].filter((id) => known.has(id) || missed.has(id)).length, 0);
  const showCoach = coach && cat === "words" && cats[0] === "words" && i === 0 && !flipped;

  // The guide is per student; this device may already know it was seen before the setting was saved.
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_COACH) === "1") setCoach(false);
    } catch {}
  }, []);
  useEffect(() => () => rec.current?.abort(), []);
  useEffect(() => {
    setProgress(total ? answered / total : 0);
    setCounter(card ? `${i + 1}/${list.length}` : null);
  }, [answered, total, card, i, list.length, setProgress, setCounter]);

  const sparks = useCallback(() => {
    const a = area.current;
    if (!a || reducedMotion()) return;
    for (let k = 0; k < 26; k++) {
      const s = document.createElement("i");
      s.className = "cv2-spark";
      s.style.background = SPARKS[k % SPARKS.length];
      a.appendChild(s);
      const ang = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 140;
      s.animate(
        [
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
          { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) rotate(${Math.random() * 540}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.2,.8,.3,1)" },
      ).onfinish = () => s.remove();
    }
  }, []);

  const stopMic = () => {
    rec.current?.abort();
    setMic({ state: "idle", result: null });
  };

  const end = useCallback(() => {
    setEnded(true);
    celebrate();
    void finish({ stay: true });
  }, [celebrate, finish]);

  /** Moves within the deck; past a tab's last card goes on to the next tab, past the last tab ends the deck. */
  const go = useCallback(
    (step: 1 | -1) => {
      stopMic();
      const n = i + step;
      if (n < 0) return;
      setDir(step > 0 ? "r" : "l");
      setFlipped(false);
      if (n < list.length) return setPos((p) => ({ ...p, [cat]: n }));
      const nextCat = cats.slice(cats.indexOf(cat) + 1).find((c) => deck[c].length);
      if (nextCat) {
        setPos((p) => ({ ...p, [nextCat]: 0 }));
        setCat(nextCat);
      } else end();
    },
    [i, list.length, cat, cats, deck, end],
  );

  const answer = (isKnown: boolean) => {
    if (!card) return;
    if (isKnown) {
      setKnown((s) => new Set(s).add(card.id));
      setMissed((s) => {
        const x = new Set(s);
        x.delete(card.id);
        return x;
      });
      sparks();
      sfx.correct();
    } else setMissed((s) => new Set(s).add(card.id));
    go(1);
  };

  const flip = () => {
    if (!card || swiped.current) return;
    sfx.flip();
    const next = !flipped;
    setFlipped(next);
    if (!next) return stopMic();
    say(card);
    if (showCoach) {
      setCoach(false);
      try {
        localStorage.setItem(LS_COACH, "1");
      } catch {}
      void createClient()
        .from("user_preferences")
        .upsert({ user_id: userId, celstv_cards_coach_done: true }, { onConflict: "user_id" })
        .then(() => undefined);
      sparks();
      setToast(c2.nice);
      setTimeout(() => setToast(""), 1600);
      setNudge((x) => x + 1);
    }
  };

  const startMic = () => {
    if (!card) return;
    const r = recognizer();
    if (!r) return setMic({ state: "off", result: null });
    rec.current = r;
    r.lang = "en-US";
    r.maxAlternatives = 3;
    r.interimResults = false;
    r.onresult = (e) => {
      const alts = Array.from(e.results[0]).map((a) => a.transcript);
      const best = alts.map((h) => ({ h, ...scoreSpeech(card.back, h) })).sort((a, b) => b.score - a.score)[0];
      if (!best) return;
      setMic({ state: "idle", result: { score: best.score, heard: best.h, words: best.words } });
      if (best.score >= 85) {
        sfx.correct();
        if (!scored.has(card.id)) {
          setScored((x) => new Set(x).add(card.id));
          addXp(XP_PER_WORD);
          if (!reducedMotion()) celebrate();
        }
      }
    };
    r.onerror = () => setMic((m) => (m.state === "listening" ? { ...m, state: "idle" } : m));
    r.onend = () => setMic((m) => (m.state === "listening" ? { ...m, state: "idle" } : m));
    setMic({ state: "listening", result: null });
    try {
      r.start();
    } catch {
      setMic({ state: "off", result: null });
    }
  };

  // ← / → turn cards (not while typing).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select") || ended) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [go, ended]);

  if (!cards.length) return null;

  if (ended) {
    const notKnown = cards.filter((k) => !known.has(k.id));
    return (
      <div className="my-auto py-8 text-center">
        <p className="text-6xl" aria-hidden>
          🃏
        </p>
        <h2 className="mt-3 text-3xl font-extrabold">{t.deckDone}</h2>
        <p className="mt-1 text-white/80">{fill(t.deckSub, { n: known.size, total: cards.length })}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href={backHref} className="kit-focus-light rounded-2xl bg-[#FFEF05] px-5 py-3.5 font-extrabold text-[#1B1830]">
            {t.back}
          </Link>
          {notKnown.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const again = Object.fromEntries(CATS.map((c) => [c, all[c].filter((id) => !known.has(id))])) as Record<Cat, string[]>;
                setDeck(again);
                setPos({ words: 0, verbs: 0, phrases: 0 });
                setCat(cats.find((c) => again[c].length) ?? cats[0]);
                setMissed(new Set());
                setDir("");
                setFlipped(false);
                setEnded(false);
              }}
              className="kit-focus-light rounded-2xl border border-white/25 px-5 py-3.5 font-extrabold"
            >
              {t.deckAgain}
            </button>
          )}
        </div>
      </div>
    );
  }

  const long = (s: string) => s.length > 14;
  const tip = !mic.result ? null : mic.result.score >= 85 ? t.tipGreat : mic.result.score >= 60 ? t.tipClose : t.tipAgain;

  return (
    <div className="cv2 flex flex-1 flex-col gap-3 pt-2">
      <div className="flex gap-2" role="tablist" aria-label="CelsCards">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === cat}
            onClick={() => {
              stopMic();
              setDir("");
              setCat(c);
              setFlipped(false);
            }}
            className={`kit-focus-light rounded-full px-3.5 py-1.5 text-[13px] font-extrabold transition ${c === cat ? "text-[#0A2233]" : "bg-white/10 text-white/85"}`}
            style={c === cat ? { background: CAT_TAB[c] } : undefined}
          >
            {t.tabs[c]}
          </button>
        ))}
      </div>

      {card ? (
        <>
          <div className="cv2-area" ref={area}>
            <div className="cv2-arw l">
              <button type="button" onClick={() => go(-1)} disabled={i === 0} aria-label={c2.prevAria} data-testid="cv2-prev">
                <Chevron left />
              </button>
              <span aria-hidden>{c2.prev}</span>
            </div>

            <div className={`cv2-scene ${dir ? `slide-${dir}` : ""}`} key={`${cat}:${card.id}:${dir}`}>
              <div
                className={`cv2-card ${flipped ? "flip" : ""} ${showCoach ? "peek" : ""}`}
                style={{ ["--c" as string]: CAT_COLOR[card.cat] }}
                role="button"
                tabIndex={0}
                aria-label={c2.flipAria}
                aria-pressed={flipped}
                data-testid="cv2-card"
                onClick={flip}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    flip();
                  }
                }}
                onTouchStart={(e) => {
                  touchX.current = e.touches[0].clientX;
                  swiped.current = false;
                }}
                onTouchEnd={(e) => {
                  if (touchX.current == null) return;
                  const dx = e.changedTouches[0].clientX - touchX.current;
                  touchX.current = null;
                  if (Math.abs(dx) > 50) {
                    swiped.current = true;
                    setTimeout(() => (swiped.current = false), 400);
                    go(dx < 0 ? 1 : -1);
                  }
                }}
              >
                <div className="cv2-face front" aria-hidden={flipped}>
                  <i className="rib a" aria-hidden />
                  <i className="rib b" aria-hidden />
                  <i className="rib c" aria-hidden />
                  <span className="cat">{t.tabs[card.cat].toUpperCase()}</span>
                  <span className="num">
                    {i + 1}/{list.length}
                  </span>
                  <Logo />
                  <span className={`es ${long(card.front) ? "long" : ""}`}>{card.front}</span>
                  <span className="sub">{c2.howEn}</span>
                  {!showCoach && (
                    <span className="pill">
                      <span aria-hidden>👆</span> {t.reveal}
                    </span>
                  )}
                  {showCoach && (
                    <span className="coach" aria-hidden>
                      <i className="ring" />
                      <i className="ring b" />
                      <span className="hand">
                        <Hand />
                      </span>
                      <span className="bub">{c2.coach}</span>
                    </span>
                  )}
                  {showCoach && <span className="sr-only">{c2.coach}</span>}
                </div>
                <div className={`cv2-face back ${card.image ? "" : "no-photo"}`} aria-hidden={!flipped}>
                  <Logo />
                  <span className="lbl">{c2.enLabel}</span>
                  {card.image && (
                    <span className="photo">
                      <FreshImg storageRef={card.imageRef} signedUrl={card.image} alt="" className="h-full w-full object-cover" />
                    </span>
                  )}
                  <span className={`en ${long(card.back) ? "long" : ""}`} lang="en">
                    {card.back}
                  </span>
                  <span className="es-mini">{card.front}</span>
                  <span className="row">
                    {card.audio && (
                      <button
                        type="button"
                        className="chipbtn"
                        tabIndex={flipped ? 0 : -1}
                        onClick={(e) => {
                          e.stopPropagation();
                          say(card);
                        }}
                      >
                        🔊 {t.hear}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`chipbtn mic ${mic.state === "listening" ? "kit-pulse" : ""}`}
                      tabIndex={flipped ? 0 : -1}
                      disabled={mic.state === "listening"}
                      onClick={(e) => {
                        e.stopPropagation();
                        startMic();
                      }}
                      data-testid="cv2-mic"
                    >
                      🎙️ {t.sayIt}
                    </button>
                  </span>
                </div>
              </div>
            </div>

            <div className={`cv2-arw r ${nudge ? "nudge" : ""}`} key={`n${nudge}`}>
              <button type="button" onClick={() => go(1)} aria-label={c2.nextAria} data-testid="cv2-next">
                <Chevron />
              </button>
              <span aria-hidden>{c2.next}</span>
            </div>

            {toast && (
              <div className="cv2-toast" role="status">
                {toast}
              </div>
            )}
          </div>

          {flipped && (mic.state !== "idle" || mic.result) && (
            <div className="rounded-3xl bg-white/[.07] p-4" aria-live="polite">
              {mic.state === "off" ? (
                <p className="text-center text-xs text-white/80">{t.micOff}</p>
              ) : mic.state === "listening" ? (
                <p className="text-center text-sm font-bold">{t.micListening}</p>
              ) : (
                mic.result && (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 text-xs text-white/75">{fill(t.heard, { text: mic.result.heard })}</span>
                      <span
                        className={`text-2xl font-extrabold ${mic.result.score >= 85 ? "text-[#A6EB6E]" : mic.result.score >= 60 ? "text-[#FFEF05]" : "text-[#FF8A9A]"}`}
                      >
                        {mic.result.score}%
                      </span>
                    </p>
                    <p className="flex flex-wrap gap-1.5">
                      {mic.result.words.map((w, k) => (
                        <span
                          key={k}
                          className={`rounded-lg px-2 py-0.5 text-sm font-bold ${w.ok ? "bg-[#A6EB6E]/20 text-[#C5F58F]" : "bg-[#FF5C7A]/20 text-[#FFB3C0]"}`}
                        >
                          {w.w}
                        </span>
                      ))}
                    </p>
                    <p className="text-xs text-white/80">
                      {fill(t.score, { n: mic.result.score })} {tip}
                      {mic.result.score >= 85 && <strong className="ml-1 text-[#FFEF05]">+{XP_PER_WORD} XP</strong>}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          <div className="cv2-acts mt-auto pt-1">
            {flipped ? (
              <>
                <button type="button" className="act rev" onClick={() => answer(false)} data-testid="cv2-review">
                  {c2.review}
                </button>
                <button type="button" className="act know" onClick={() => answer(true)} data-testid="cv2-know">
                  {c2.know}
                </button>
              </>
            ) : (
              <button type="button" className="act show" onClick={flip} data-testid="cv2-show">
                {c2.seeEn}
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="my-auto text-center text-white/80">{t.noCards}</p>
      )}
    </div>
  );
}
