"use client";

// CelsCards (board "App — Episodio v2", phone 2). Tabs Palabras / Verbos / Frases; the front shows the
// Spanish word in the category color with the CelsU ribbons; flipping shows the English word (and the
// photo when there is one) while Amy says it; then "Ahora dilo tú": Web Speech scores the pronunciation
// (85 % or more earns XP). "Repasar" sends the card to the back of the deck, "Lo sé" takes it out.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fill } from "@/components/course/kit";
import { usePartShell } from "./PartShell";
import { reducedMotion, sfx } from "./fx";

export type Card = { id: string; front: string; back: string; cat: Cat; audio: string | null; image: string | null };
type Cat = "words" | "verbs" | "phrases";
const CATS: Cat[] = ["words", "verbs", "phrases"];
const CAT_BG: Record<Cat, string> = {
  words: "linear-gradient(165deg, #12A6DD 0%, #0A72A8 100%)",
  verbs: "linear-gradient(165deg, #E0127A 0%, #A8105A 100%)",
  phrases: "linear-gradient(165deg, #16A36B 0%, #0B7A5E 100%)",
};
const CAT_TAB: Record<Cat, string> = { words: "#43D6FE", verbs: "#FF5FA2", phrases: "#7BE07A" };
const XP_PER_WORD = 5;

// ---------- pronunciation ----------
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
function similarity(a: string, b: string) {
  if (a === b) return 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}
/** Per target word: the best match among the words heard. Score = their average. */
export function scoreSpeech(target: string, heard: string) {
  const want = words(target.replace(/^to\s+/i, "")); // "To bake": saying "bake" is enough
  const got = words(heard);
  const per = want.map((w) => ({ w, ok: Math.max(0, ...got.map((g) => similarity(w, g))) }));
  const score = per.length ? Math.round((per.reduce((s, p) => s + p.ok, 0) / per.length) * 100) : 0;
  return { score, words: per.map((p) => ({ w: p.w, ok: p.ok >= 0.8 })) };
}

type SR = {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  start: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SRWindow = { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
function recognizer(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as SRWindow;
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

function say(card: Card) {
  if (card.audio) {
    const a = new Audio(card.audio);
    a.play().catch(() => speakEn(card.back));
  } else speakEn(card.back);
}
function speakEn(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

function Ribbons() {
  return (
    <svg aria-hidden viewBox="0 0 320 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[34%] w-full">
      <path d="M0 30 C 80 0, 160 60, 320 20 L320 120 L0 120Z" fill="#F20174" />
      <path d="M0 58 C 90 30, 190 86, 320 50 L320 120 L0 120Z" fill="#FFEF05" />
      <path d="M0 88 C 100 64, 200 112, 320 84 L320 120 L0 120Z" fill="#43D6FE" />
    </svg>
  );
}

function Mic({ card, t, onScore }: { card: Card; t: ReturnType<typeof usePartShell>["t"]; onScore: (score: number) => void }) {
  const [state, setState] = useState<"idle" | "listening" | "off">("idle");
  const [result, setResult] = useState<null | { score: number; heard: string; words: { w: string; ok: boolean }[] }>(null);
  const rec = useRef<SR | null>(null);
  useEffect(() => () => rec.current?.abort(), []);

  const start = () => {
    const r = recognizer();
    if (!r) return setState("off");
    rec.current = r;
    r.lang = "en-US";
    r.maxAlternatives = 3;
    r.interimResults = false;
    r.onresult = (e) => {
      const alts = Array.from(e.results[0]).map((a) => a.transcript);
      const best = alts.map((h) => ({ h, ...scoreSpeech(card.back, h) })).sort((a, b) => b.score - a.score)[0];
      if (best) {
        setResult({ score: best.score, heard: best.h, words: best.words });
        onScore(best.score);
        if (best.score >= 85) sfx.correct();
      }
    };
    r.onerror = () => setState((s) => (s === "listening" ? "idle" : s));
    r.onend = () => setState((s) => (s === "listening" ? "idle" : s));
    setResult(null);
    setState("listening");
    try {
      r.start();
    } catch {
      setState("off");
    }
  };

  if (state === "off") return <p className="rounded-2xl bg-white/[.07] p-3 text-center text-xs text-white/80">{t.micOff}</p>;
  const tip = !result ? null : result.score >= 85 ? t.tipGreat : result.score >= 60 ? t.tipClose : t.tipAgain;
  return (
    <div className="rounded-3xl bg-white/[.07] p-4" aria-live="polite">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={state === "listening"}
          aria-label={t.sayIt}
          className={`kit-focus-light grid size-14 shrink-0 place-items-center rounded-full bg-[#D6006A] text-white shadow-lg ${state === "listening" ? "kit-pulse" : ""}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{t.sayIt}</p>
          <p className="text-xs text-white/75">{state === "listening" ? t.micListening : result ? fill(t.heard, { text: result.heard }) : t.micStart}</p>
        </div>
        {result && (
          <span className={`text-2xl font-extrabold ${result.score >= 85 ? "text-[#A6EB6E]" : result.score >= 60 ? "text-[#FFEF05]" : "text-[#FF8A9A]"}`}>{result.score}%</span>
        )}
      </div>
      {result && (
        <div className="mt-3 space-y-1.5">
          <p className="flex flex-wrap gap-1.5">
            {result.words.map((w, i) => (
              <span key={i} className={`rounded-lg px-2 py-0.5 text-sm font-bold ${w.ok ? "bg-[#A6EB6E]/20 text-[#C5F58F]" : "bg-[#FF5C7A]/20 text-[#FFB3C0]"}`}>
                {w.w}
              </span>
            ))}
          </p>
          <p className="text-xs text-white/80">
            {fill(t.score, { n: result.score })} {tip}
            {result.score >= 85 && <strong className="ml-1 text-[#FFEF05]">+{XP_PER_WORD} XP</strong>}
          </p>
        </div>
      )}
    </div>
  );
}

export function CardsPart({ cards }: { cards: Card[] }) {
  const { t, setProgress, setCounter, addXp, finish, backHref, celebrate } = usePartShell();
  const cats = CATS.filter((c) => cards.some((k) => k.cat === c));
  const [cat, setCat] = useState<Cat>(cats[0] ?? "words");
  const [queues, setQueues] = useState<Record<Cat, string[]>>(
    () => Object.fromEntries(CATS.map((c) => [c, cards.filter((k) => k.cat === c).map((k) => k.id)])) as Record<Cat, string[]>,
  );
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [scored, setScored] = useState<Set<string>>(new Set());
  const [ended, setEnded] = useState(false);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const left = CATS.reduce((s, c) => s + queues[c].length, 0);
  const inCat = cards.filter((k) => k.cat === cat).length;
  const card = byId.get(queues[cat][0] ?? "");

  useEffect(() => {
    setProgress(cards.length ? (cards.length - left) / cards.length : 0);
    setCounter(card ? `${inCat - queues[cat].length + 1}/${inCat}` : null);
  }, [left, cards.length, card, inCat, queues, cat, setProgress, setCounter]);

  if (!cards.length) return null;

  const flip = () => {
    if (!card) return;
    sfx.flip();
    if (!flipped) say(card);
    setFlipped((f) => !f);
  };
  const advance = (known: boolean) => {
    if (!card) return;
    if (!known) setMissed((m) => new Set(m).add(card.id));
    const q = queues[cat].slice(1);
    const nextQ = { ...queues, [cat]: known ? q : [...q, card.id] };
    setQueues(nextQ);
    setFlipped(false);
    if (!nextQ[cat].length) {
      const other = cats.find((c) => nextQ[c].length);
      if (other) setCat(other);
      else {
        setEnded(true);
        celebrate();
        void finish({ stay: true });
      }
    }
  };

  if (ended) {
    const mastered = cards.length - missed.size;
    return (
      <div className="my-auto py-8 text-center">
        <p className="text-6xl" aria-hidden>
          🃏
        </p>
        <h2 className="mt-3 text-3xl font-extrabold">{t.deckDone}</h2>
        <p className="mt-1 text-white/80">{fill(t.deckSub, { n: mastered, total: cards.length })}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href={backHref} className="kit-focus-light rounded-2xl bg-[#FFEF05] px-5 py-3.5 font-extrabold text-[#1B1830]">
            {t.back}
          </Link>
          {missed.size > 0 && (
            <button
              type="button"
              onClick={() => {
                setQueues(Object.fromEntries(CATS.map((c) => [c, cards.filter((k) => k.cat === c && missed.has(k.id)).map((k) => k.id)])) as Record<Cat, string[]>);
                setCat(cats.find((c) => cards.some((k) => k.cat === c && missed.has(k.id))) ?? cats[0]);
                setMissed(new Set());
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

  return (
    <div className="flex flex-1 flex-col gap-3 pt-2">
      <div className="flex gap-2" role="tablist" aria-label="CelsCards">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === cat}
            onClick={() => {
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
          <div className="[perspective:1200px]">
            <button
              type="button"
              onClick={flip}
              className="kit-focus-light relative block aspect-[4/5] max-h-[440px] w-full rounded-[28px] text-left transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none sm:aspect-[5/5]"
              style={{ transform: flipped ? "rotateY(180deg)" : undefined }}
            >
              <span className="sr-only">{flipped ? t.hear : t.reveal}</span>
              {/* front */}
              <span aria-hidden={flipped} className="absolute inset-0 overflow-hidden rounded-[28px] shadow-2xl [backface-visibility:hidden]" style={{ background: CAT_BG[card.cat] }}>
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-[.12]"
                  style={{ backgroundImage: "radial-gradient(#fff 1.2px, transparent 1.2px)", backgroundSize: "18px 18px" }}
                />
                <span className="absolute left-4 right-4 top-4 flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-white shadow">
                    <Image src="/brand/celstv-e.png" alt="" width={22} height={23} />
                  </span>
                  <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider">{t.tabs[card.cat]}</span>
                  <span className="ml-auto rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider">🇲🇽 {t.spanish}</span>
                </span>
                <span
                  className="absolute inset-x-4 top-[24%] text-center text-[clamp(2.2rem,11vw,3.4rem)] font-extrabold leading-tight text-white"
                  style={{ textShadow: "0 3px 14px rgba(0,0,0,.25)" }}
                >
                  {card.front}
                </span>
                <Ribbons />
                <span className="absolute inset-x-4 bottom-5 flex items-center gap-2.5 rounded-2xl bg-[#FFEF05] px-4 py-3 text-[15px] font-extrabold text-[#1B1830] shadow-lg">
                  <span aria-hidden>👆</span>
                  {t.reveal}
                </span>
              </span>
              {/* back */}
              <span aria-hidden={!flipped} className="absolute inset-0 overflow-hidden rounded-[28px] bg-[#0F2A3A] shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span aria-hidden className="absolute inset-0 opacity-40" style={{ background: CAT_BG[card.cat] }} />
                )}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider">🇺🇸 {t.english}</span>
                <span className="absolute inset-x-4 bottom-6 text-center">
                  <span className="block text-[clamp(2.2rem,11vw,3.4rem)] font-extrabold leading-tight">{card.back}</span>
                  <span className="mt-1 block text-sm font-semibold text-white/80">{card.front}</span>
                  <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-bold">🔊 {t.hear}</span>
                </span>
              </span>
            </button>
          </div>

          {flipped && (
            <Mic
              key={card.id}
              card={card}
              t={t}
              onScore={(s) => {
                if (s >= 85 && !scored.has(card.id)) {
                  setScored((x) => new Set(x).add(card.id));
                  addXp(XP_PER_WORD);
                  if (!reducedMotion()) celebrate();
                }
              }}
            />
          )}

          <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => advance(false)}
              className="kit-focus-light flex items-center justify-center gap-2 rounded-2xl border-2 border-[#FFEF05]/70 py-3.5 font-extrabold text-[#FFEF05]"
            >
              ↺ {t.again}
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              className="kit-focus-light flex items-center justify-center gap-2 rounded-2xl bg-[#7CC94A] py-3.5 font-extrabold text-[#0E2B07]"
            >
              ✓ {t.know}
            </button>
          </div>
        </>
      ) : (
        <p className="my-auto text-center text-white/80">{t.noCards}</p>
      )}
    </div>
  );
}
