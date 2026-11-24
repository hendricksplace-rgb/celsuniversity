"use client";

// C-059: CelsTV section 2, the episode cards flip through and land on Episode 1 (Matt's approved animation,
// 2026-11-24; the Higgsfield video is the reference, this is the code version: sharp, light, and always the app's
// current thumbnails).
//
// Images: modules.artwork_url of episodes 1–8 (the page reads them from Supabase; never copied into the site),
// served by next/image, only mounted when the section is about a screen away.
// Stage: always 3 cards (front, back-left, back-right). Each step the next episode flips in to the front, the old
// front goes back-right, back-right goes back-left, back-left falls away. Order 2, 3, 5, 6, 8, 4, 7, 1: it starts
// and ends on 1 in front, 4 back-left, 7 back-right. Step i waits 520 + (i/7)² · 700 ms (starts moderately, slows
// down, ~7 s); each transition lasts min(wait · 0.95, 900) ms. Below: "EPISODIO 0X" and 8 dashes filling gold,
// then the counter fades out (0.35 s) and "32 EPISODIOS · TEMPORADA 1" fades in (0.7 s), never both at once.
// Plays once at 40% in view. Reduced motion, or the images not loaded in time: the final 3 and the end caption.
// Sizes: every length is a multiple of --k (the stage's scale to its column), so the cards are laid out at their
// real size, never a scaled bitmap (no blur).
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import "./episode-flip.css";

export type FlipEpisode = { num: number; art: string };

type Slot = "front" | "left" | "right" | "enter" | "out";

const ORDER = [2, 3, 5, 6, 8, 4, 7, 1];
const FINAL: Record<number, Slot> = { 1: "front", 4: "left", 7: "right" };
const LOAD_GRACE_MS = 3000;
const CARD_W = 500;
const BACK_HALF = (CARD_W / 2) * 0.86;

const wait = (i: number) => 520 + (i / 7) ** 2 * 700;
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const two = (n: number) => String(n).padStart(2, "0");

type Phase = "idle" | "playing" | "ending" | "done";

export function EpisodeFlip({ episodes }: { episodes: FlipEpisode[] }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [slots, setSlots] = useState<Record<number, Slot>>(() => {
    const s: Record<number, Slot> = {};
    for (const e of episodes) s[e.num] = FINAL[e.num] ?? "enter";
    return s;
  });
  const [step, setStep] = useState(-1);
  const [dur, setDur] = useState(0);
  const [k, setK] = useState(1);
  const [spread, setSpread] = useState(230);
  const timers = useRef<number[]>([]);
  const loadedRef = useRef(0);
  const inView = useRef(false);
  const started = useRef(false);

  // Fit the stage to its column: the back cards tuck in (±150) when it's narrow, then everything scales.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const x = w < 700 ? 150 : 230;
      const need = 2 * (x + BACK_HALF) + 24;
      setSpread(x);
      setK(Math.min(1, w / need));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const finish = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const s: Record<number, Slot> = {};
    for (const e of episodes) s[e.num] = FINAL[e.num] ?? "enter";
    setSlots(s);
    setStep(ORDER.length - 1);
    setDur(0);
    setPhase("done");
  };

  const play = () => {
    if (started.current) return;
    started.current = true;
    if (reducedMotion()) return finish();
    setPhase("playing");
    let t = 0;
    const cur: Record<number, Slot> = {};
    for (const e of episodes) cur[e.num] = FINAL[e.num] ?? "enter";
    ORDER.forEach((num, i) => {
      timers.current.push(
        window.setTimeout(() => {
          const d = Math.min(wait(i) * 0.95, 900);
          for (const [n, sl] of Object.entries(cur)) {
            const ep = Number(n);
            if (sl === "front") cur[ep] = "right";
            else if (sl === "right") cur[ep] = "left";
            else if (sl === "left") cur[ep] = "out";
          }
          cur[num] = "front";
          setDur(d);
          setStep(i);
          setSlots({ ...cur });
          // The card that fell away goes back to the entry pose (no transition) for a later turn.
          timers.current.push(
            window.setTimeout(() => {
              for (const [n, sl] of Object.entries(cur)) if (sl === "out") cur[Number(n)] = "enter";
              setDur(0);
              setSlots({ ...cur });
            }, d + 20),
          );
        }, t),
      );
      t += wait(i);
    });
    timers.current.push(window.setTimeout(() => setPhase("ending"), t));
    timers.current.push(window.setTimeout(() => setPhase("done"), t + 350));
  };

  // Mount the images about a screen before the section; play once at 40% in view, when the images are ready.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (reducedMotion()) {
      setNear(true);
      finish();
      return;
    }
    const nearIo = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (setNear(true), nearIo.disconnect()), { rootMargin: "100% 0px" });
    let grace: number | undefined;
    const viewIo = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        viewIo.disconnect();
        inView.current = true;
        if (loadedRef.current >= episodes.length) play();
        // Not loaded in time: the final 3 directly.
        else grace = window.setTimeout(() => !started.current && ((started.current = true), finish()), LOAD_GRACE_MS);
      },
      { threshold: 0.4 },
    );
    nearIo.observe(el);
    viewIo.observe(el);
    return () => {
      nearIo.disconnect();
      viewIo.disconnect();
      window.clearTimeout(grace);
      timers.current.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const onLoad = () => {
    loadedRef.current += 1;
    setLoaded(loadedRef.current);
    if (loadedRef.current >= episodes.length && inView.current) play();
  };

  const front = step >= 0 ? ORDER[step] : null;
  const filled = phase === "done" ? ORDER.length : step + 1;
  const vars = { "--k": k, "--x": `${spread}px`, "--d": `${dur}ms` } as React.CSSProperties;

  return (
    <div ref={box} className="ef" data-phase={phase} data-loaded={loaded} style={vars} role="img" aria-label="Los episodios de la Temporada 1 de CelsTV">
      <div className="ef-stage" aria-hidden="true">
        {episodes.map((e) => (
          <div key={e.num} className={`ef-card ef-${slots[e.num]}`} data-ep={e.num}>
            {near && <Image src={e.art} alt="" fill sizes="(max-width: 700px) 62vw, 470px" quality={75} loading="eager" onLoad={onLoad} />}
            {phase === "playing" && front === e.num && <span key={step} className="ef-sweep" />}
          </div>
        ))}
      </div>
      <div className="ef-cap" aria-hidden="true">
        <div className="ef-count">
          <span>EPISODIO {front ? two(front) : "01"}</span>
          <span className="ef-dashes">
            {ORDER.map((n, i) => (
              <i key={n} className={i < filled ? "on" : undefined} />
            ))}
          </span>
        </div>
        <div className="ef-end">32 EPISODIOS · TEMPORADA 1</div>
      </div>
    </div>
  );
}
