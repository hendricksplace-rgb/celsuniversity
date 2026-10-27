"use client";

// C-022: "¡Sección terminada!" (celstv-seccion-terminada-mockup.html), shared by every CelsTV part that has
// sections (Grammar today). The star enters spinning, 12 mini stars burst out and twinkle, rays turn, the ring
// fills to the part's progress, ~120 pieces of confetti fall once (canvas), the XP counts up. About 2 s, never
// blocking: the buttons work from the first frame. prefers-reduced-motion: everything static and visible.
import "./section-done.css";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/components/course/kit";
import { reducedMotion } from "./fx";

const COLORS = ["#FFEF05", "#43D6FE", "#FF7AB8", "#8E5CFF", "#FFFFFF", "#6DE39B"];
const STAR = "M60 6 C64 40 80 56 114 60 C80 64 64 80 60 114 C56 80 40 64 6 60 C40 56 56 40 60 6Z";
const RING = 2 * Math.PI * 95;

export type SectionDoneProps = {
  t: Dictionary["sd"];
  /** "Grammar" */
  part: string;
  /** Every section's name, in order. */
  names: string[];
  /** The section just finished (0-based). */
  index: number;
  /** Sections finished so far, this one included. */
  done: Set<number>;
  /** Right on the first try / items; null when the section had nothing to answer. */
  score: { right: number; total: number } | null;
  xp: number;
  streak: number;
  onNext: () => void;
  onReview: () => void;
};

export function SectionDone(p: SectionDoneProps) {
  const { t, names, index } = p;
  const n = names.length;
  const last = index === n - 1;
  const pct = n ? p.done.size / n : 1;
  const ratio = p.score && p.score.total ? p.score.right / p.score.total : 1;
  const msg = ratio >= 1 ? t.perfect : ratio >= 0.8 ? t.good : t.okay;
  const xp = useCountUp(p.xp);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [minis] = useState(() =>
    Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const r = 95 + Math.random() * 60;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.75, s: 0.5 + Math.random() * 0.8, rot: Math.random() * 180, d: 0.35 + Math.random() * 0.3, c: COLORS[i % COLORS.length] };
    }),
  );

  useEffect(() => {
    if (reducedMotion() || !canvas.current) return;
    const cv = canvas.current;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr;
    cv.height = r.height * dpr;
    ctx.scale(dpr, dpr);
    const W = r.width;
    const H = r.height;
    const parts = Array.from({ length: 120 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 60,
      y: 200,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 9 - 4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      a: Math.random() * 6,
      va: (Math.random() - 0.5) * 0.3,
      t: 0,
    }));
    let raf = 0;
    const start = setTimeout(() => {
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        let alive = 0;
        for (const q of parts) {
          q.t++;
          q.vy += 0.18;
          q.vx *= 0.99;
          q.x += q.vx;
          q.y += q.vy;
          q.a += q.va;
          if (q.y < H + 20 && q.t < 220) {
            alive++;
            ctx.save();
            ctx.translate(q.x, q.y);
            ctx.rotate(q.a);
            ctx.globalAlpha = Math.max(0, 1 - q.t / 220);
            ctx.fillStyle = q.c;
            ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h * Math.abs(Math.cos(q.a * 2)));
            ctx.restore();
          }
        }
        if (alive) raf = requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, W, H);
      };
      raf = requestAnimationFrame(tick);
    }, 350);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
    };
  }, []);

  const row = (name: string, i: number) => {
    const state = i === index ? "now" : p.done.has(i) ? "done" : i === index + 1 ? "next" : "";
    const sub = i === index ? fill(t.justDone, { n: i + 1 }) : fill(t.section, { n: i + 1 });
    return (
      <li key={i} className={`sd-st ${state}`} style={{ animationDelay: `${1.25 + i * 0.08}s` }}>
        <span className="sd-n" aria-hidden>
          {state === "done" || state === "now" ? "✓" : i + 1}
        </span>
        <div>
          <div className="sd-nm">
            {name}
            <small>{sub}</small>
          </div>
          <div className="sd-bar">
            <i />
          </div>
        </div>
        {state === "next" ? <span className="sd-tag">{t.next}</span> : <span className="sd-pct">{state === "done" || state === "now" ? "100%" : "0%"}</span>}
      </li>
    );
  };

  return (
    <div className="sd" role="status" aria-live="polite">
      <canvas ref={canvas} className="sd-confetti" aria-hidden />
      <div className="sd-stage" aria-hidden>
        <div className="sd-rays" />
        <div className="sd-glow" />
        <svg className="sd-ring" viewBox="0 0 210 210">
          <defs>
            <linearGradient id="sd-rg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#43D6FE" />
              <stop offset=".5" stopColor="#8E5CFF" />
              <stop offset="1" stopColor="#FFEF05" />
            </linearGradient>
          </defs>
          <circle className="bg" cx="105" cy="105" r="95" />
          <circle className="fg" cx="105" cy="105" r="95" style={{ strokeDasharray: RING, ["--to" as string]: `${RING * (1 - pct)}` }} />
        </svg>
        <div className="sd-minis">
          {minis.map((m, i) => (
            <span
              key={i}
              className="sd-mini"
              style={{ ["--x" as string]: `${m.x}px`, ["--y" as string]: `${m.y}px`, ["--s" as string]: m.s, ["--r" as string]: `${m.rot}deg`, ["--d" as string]: `${m.d}s` }}
            >
              <svg viewBox="0 0 120 120">
                <path d={STAR} fill={m.c} />
              </svg>
            </span>
          ))}
        </div>
        <svg className="sd-star" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="sd-sg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFF7A0" />
              <stop offset=".45" stopColor="#FFD21F" />
              <stop offset="1" stopColor="#FF8A00" />
            </linearGradient>
            <clipPath id="sd-sc">
              <path d={STAR} />
            </clipPath>
          </defs>
          <path d={STAR} fill="url(#sd-sg)" />
          <path d="M60 6 C62 34 70 50 86 56 C72 54 62 40 60 6Z" fill="#fff" opacity=".55" />
          <g clipPath="url(#sd-sc)">
            <rect className="sd-shine" x="40" y="-10" width="16" height="140" fill="#fff" opacity="0" transform="rotate(20 60 60)" />
          </g>
        </svg>
      </div>

      <div className="sd-h">
        <h2>{t.title}</h2>
        <p>
          {names[index]} · {msg}
        </p>
      </div>
      <div className="sd-chips">
        <span className="sd-chip xp">
          ⚡ <b>+{xp}</b> XP
        </span>
        {p.score && p.score.total > 0 && (
          <span className="sd-chip ok">
            ✓ <b>
              {p.score.right}/{p.score.total}
            </b>{" "}
            {t.correct}
          </span>
        )}
        <span className="sd-chip st">
          🔥 <b>{p.streak}</b> {p.streak === 1 ? t.day : t.days}
        </span>
      </div>

      <p className="sd-k">{fill(t.path, { part: p.part.toUpperCase() })}</p>
      <ol className="sd-path">{names.map(row)}</ol>

      <button type="button" className="sd-cta" onClick={p.onNext}>
        {last ? fill(t.finishBtn, { part: p.part }) : t.nextBtn}
      </button>
      <button type="button" className="sd-sec" onClick={p.onReview}>
        {t.review}
      </button>
    </div>
  );
}

/** +0 → +n after the star lands (1 s), one step every 40 ms; reduced motion: the number at once. */
function useCountUp(target: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return setV(target);
    const t0 = performance.now();
    let raf = 0;
    const f = (now: number) => {
      const x = Math.min(target, Math.max(0, Math.round((now - t0 - 1000) / 40)));
      setV(x);
      if (x < target) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
