"use client";

// Celebration effects for the part screens. CelsTV is the loud one: big confetti and sounds.
// Nothing moves when the student prefers reduced motion; no sounds or confetti when "Sonidos y
// celebraciones" is off in Cuenta → Preferencias.
import { useEffect, useState } from "react";
import { clientPref } from "@/lib/prefs";

let ctx: AudioContext | null = null;
function audio() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "sine", gain = 0.07) {
  if (!clientPref("sound")) return;
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + at);
  o.stop(a.currentTime + at + dur + 0.05);
}

export const sfx = {
  /** An option dropping in. */
  bing: (i = 0) => tone(880 + i * 110, 0, 0.18, "triangle", 0.04),
  correct: () => {
    tone(784, 0, 0.16, "triangle");
    tone(1046, 0.1, 0.28, "triangle");
  },
  wrong: () => tone(196, 0, 0.25, "sawtooth", 0.035),
  flip: () => tone(520, 0, 0.12, "sine", 0.05),
  finish: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.3, "triangle", 0.06)),
  /** A cheer sent or received (C-026). */
  cheer: () => [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.35, "triangle", 0.08)),
};

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const COLORS = ["#F20174", "#FFEF05", "#43D6FE", "#7BE07A", "#A88BFF", "#FF8A5C"];

/** Confetti burst; `big` for CelsTV. Remounts on `burst` change. */
export function Confetti({ burst, big = true }: { burst: number; big?: boolean }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; delay: number; dur: number; color: string; rot: number; w: number }[]>([]);
  useEffect(() => {
    if (!burst || reducedMotion() || !clientPref("sound")) return;
    const n = big ? 70 : 24;
    setPieces(
      Array.from({ length: n }, (_, i) => ({
        id: burst * 1000 + i,
        left: Math.random() * 100,
        delay: Math.random() * 0.25,
        dur: 1.1 + Math.random() * 0.9,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 720 - 360,
        w: 6 + Math.random() * 6,
      })),
    );
    const t = setTimeout(() => setPieces([]), 2400);
    return () => clearTimeout(t);
  }, [burst, big]);
  if (!pieces.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="kit-confetti absolute top-[-12px] block rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 0.45,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
