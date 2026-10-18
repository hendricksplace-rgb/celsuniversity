"use client";

import { useEffect, useMemo, useState } from "react";
import { usePartDone } from "../progress";
import { AudioButton, seededShuffle, str, useResolve, useT } from "./shared";

type Card = { front?: string; back?: string; category?: string; front_audio?: string | null; back_audio?: string | null };

const CATEGORIES = ["words", "verbs", "phrases"] as const;

export function Flashcards({ cards, seed }: { cards: Card[]; seed: string }) {
  const t = useT();
  const resolve = useResolve();
  const valid = useMemo(() => cards.filter((c) => str(c.front) || str(c.back)), [cards]);
  const present = CATEGORIES.filter((c) => valid.some((card) => card.category === c));
  const [category, setCategory] = useState<string | null>(null);
  const [shuffled, setShuffled] = useState(false);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const deck = useMemo(() => {
    const filtered = category ? valid.filter((c) => c.category === category) : valid;
    return shuffled ? seededShuffle(filtered, `${seed}:${round}`) : filtered;
  }, [valid, category, shuffled, round, seed]);

  const partDone = usePartDone();
  useEffect(() => {
    if (deck.length && index >= deck.length - 1) partDone();
  }, [index, deck.length, partDone]);

  if (!deck.length) return null;
  const card = deck[Math.min(index, deck.length - 1)];
  const go = (i: number) => {
    setIndex((i + deck.length) % deck.length);
    setFlipped(false);
  };
  const label = (c: string) => (c === "words" ? t.words : c === "verbs" ? t.verbs : t.phrases);
  const frontAudio = resolve(card.front_audio);
  const backAudio = resolve(card.back_audio);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {present.length > 1 &&
          [null, ...present].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              onClick={() => {
                setCategory(c);
                setIndex(0);
                setFlipped(false);
              }}
              className={category === c ? "t-btn !px-3 !py-1" : "t-btn-ghost !px-3 !py-1"}
              aria-pressed={category === c}
            >
              {c ? label(c) : t.all}
            </button>
          ))}
        <button
          type="button"
          onClick={() => {
            setShuffled(true);
            setRound((r) => r + 1);
            setIndex(0);
            setFlipped(false);
          }}
          className="t-btn-ghost ml-auto !px-3 !py-1"
        >
          🔀 {t.shuffle}
        </button>
      </div>

      {/* The card itself is the flip control; audio buttons inside stop propagation. */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={t.flip}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          } else if (e.key === "ArrowRight") go(index + 1);
          else if (e.key === "ArrowLeft") go(index - 1);
        }}
        className="flex min-h-48 cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-[var(--t-radius)] border-2 border-[var(--t-border)] p-6 text-center transition hover:border-[var(--t-accent)]"
        style={flipped ? { background: "color-mix(in srgb, var(--t-accent) 12%, transparent)" } : undefined}
      >
        <p className="t-heading text-2xl sm:text-3xl">
          {flipped ? str(card.back) : str(card.front)}
        </p>
        {flipped ? <AudioButton src={backAudio} /> : <AudioButton src={frontAudio} />}
        {!flipped && <p className="t-muted text-xs">{t.flip}</p>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(index - 1)} className="t-btn-ghost" aria-label={t.prev}>
          ←
        </button>
        <p className="t-muted text-sm" aria-live="polite">
          {Math.min(index, deck.length - 1) + 1} {t.of} {deck.length}
        </p>
        <button type="button" onClick={() => go(index + 1)} className="t-btn" aria-label={t.next}>
          →
        </button>
      </div>
    </div>
  );
}
