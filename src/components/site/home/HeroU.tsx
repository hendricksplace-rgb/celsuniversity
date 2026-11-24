"use client";

// C-052 / C-067: the home hero's CelsU "U".
//
// C-067 (Matt's prototype, 2026-11-24): the liquid U takes over the whole hero, then lands in its spot.
//   1. On load the hero shows only the U video, as big as the visible hero allows while the whole formed U stays on
//      screen: S = min(max(W, Hvis), 1.3·W, 1.25·Hvis), centred in the visible part (Hvis = min(heroH, innerHeight)).
//      A flat #02C5F7 layer (the video's own background, in the board's hero markup) covers the hero gradient, and the
//      video's radial mask disappears into it: one canvas, no box. The copy is hidden (hero class cu-uintro).
//   2. At 5.6 s the video glides into the slot: transform from the full box to the slot's rect (transform-origin
//      0 0, 1.4 s). The U is centred in the frame at 70% width (U_BOX), so it's a straight scale. The flat layer
//      fades out and the copy fades in, staggered (CSS).
//   3. When the video ends (8 s) the sharp PNG fades in on top, as before.
// Mobile (≤ 820px): the slot comes first (above the tags and headline), min(78vw, 320px) square.
// Skip: wheel, touchmove, a key or a tap on the hero during the intro → the video jumps to 5.0 s and flies home.
// "Repetir animación" (the board's button, `replay`) scrolls to the top and replays the takeover.
// Waits for canplaythrough (5 s fallback: the landed state with the static logo; the video never starts late).
// Reduced motion or autoplay refused: no takeover, the static logo and the copy at once, and no video request
// (the sources are only added once motion is allowed).
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FLY_AT = 5.6;
const SKIP_TO = 5.0;
const READY_MS = 5000;
const FLIGHT_MS = 1400;
/** Where the U sits in the video: centred, 70% of the frame wide (the PNG is 900×594). */
export const U_BOX = { width: 70, left: 15 } as const;
const LOGO_FILTER = "drop-shadow(0 14px 22px rgba(0,50,80,.30)) drop-shadow(0 0 2px rgba(255,255,255,.6))";

type State = "idle" | "intro" | "landing" | "landed" | "static";

export function HeroU({ replay }: { replay: number }) {
  const slot = useRef<HTMLDivElement | null>(null);
  const fly = useRef<HTMLDivElement | null>(null);
  const vid = useRef<HTMLVideoElement | null>(null);
  const [hero, setHero] = useState<HTMLElement | null>(null);
  const [sources, setSources] = useState(false);
  const [logo, setLogo] = useState(false);
  const [hidden, setHidden] = useState(false); // the flying video, once the static fallback took over
  const state = useRef<State>("idle");
  const box = useRef({ S: 0, x0: 0, y0: 0 });
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const setIntro = (on: boolean) => hero?.classList.toggle("cu-uintro", on);

  /** The full-screen box: as big as the visible hero allows, the whole formed U on screen. */
  const layoutFull = useCallback(() => {
    const f = fly.current;
    if (!hero || !f) return;
    const W = hero.clientWidth;
    const H = Math.min(hero.clientHeight, window.innerHeight);
    const S = Math.min(Math.max(W, H), W * 1.3, H * 1.25);
    const x0 = (W - S) / 2;
    const y0 = (H - S) / 2;
    box.current = { S, x0, y0 };
    Object.assign(f.style, { width: `${S}px`, height: `${S}px`, left: `${x0}px`, top: `${y0}px` });
  }, [hero]);

  /** The transform that puts the full box exactly on the slot (the U is centred in both). */
  const landedTransform = useCallback(() => {
    const h = hero!.getBoundingClientRect();
    const r = slot.current!.getBoundingClientRect();
    const { S, x0, y0 } = box.current;
    return `translate(${r.left - h.left - x0}px, ${r.top - h.top - y0}px) scale(${r.width / S})`;
  }, [hero]);

  /** Static: no takeover, the logo in its slot, the copy at once. */
  const toStatic = useCallback(() => {
    clearTimers();
    state.current = "static";
    vid.current?.pause();
    setHidden(true);
    setLogo(true);
    hero?.classList.add("cu-ustatic");
    setIntro(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setIntro only reads hero
  }, [hero]);

  const land = useCallback(() => {
    const f = fly.current;
    if (state.current !== "intro" || !f) return;
    state.current = "landing";
    f.classList.add("go");
    void f.offsetWidth;
    f.style.transform = landedTransform();
    hero?.classList.remove("cu-ustatic");
    setIntro(false);
    later(() => {
      state.current = "landed";
    }, FLIGHT_MS + 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setIntro only reads hero
  }, [hero, landedTransform]);

  const start = useCallback(() => {
    const f = fly.current;
    const v = vid.current;
    if (!f || !v || state.current === "static") return;
    clearTimers();
    setLogo(false);
    setHidden(false);
    f.classList.remove("go");
    f.style.transform = "none";
    hero?.classList.remove("cu-ustatic");
    setIntro(true);
    layoutFull();
    state.current = "intro";
    sampled.current = 0;
    try {
      v.currentTime = 0;
    } catch {
      /* not loaded yet */
    }
    // Autoplay refused → static. An AbortError only means a newer load/play took over: not a refusal.
    v.play().catch((e: unknown) => {
      if (!(e instanceof DOMException && e.name === "AbortError")) toStatic();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setIntro only reads hero
  }, [hero, layoutFull, toStatic]);

  // Find the hero; decide: reduced motion → static (no video request), else add the sources and wait for the video.
  useEffect(() => {
    const h = slot.current?.closest("section") as HTMLElement | null;
    setHero(h);
  }, []);
  useEffect(() => {
    if (!hero) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      toStatic();
      return;
    }
    setSources(true);
    return clearTimers;
  }, [hero, toStatic]);
  // Load once, when the sources are added (calling load() again would abort a play in progress).
  useEffect(() => {
    if (sources) vid.current?.load();
  }, [sources]);
  useEffect(() => {
    const v = vid.current;
    if (!sources || !v) return;
    const go = () => {
      if (state.current === "idle") start();
    };
    if (v.readyState >= 3) go();
    else v.addEventListener("canplaythrough", go, { once: true });
    // Not ready in time: the landed state with the static logo; the video never starts late.
    const t = window.setTimeout(() => {
      if (state.current === "idle") toStatic();
    }, READY_MS);
    const onError = () => {
      if (state.current === "idle" || state.current === "intro") toStatic();
    };
    v.addEventListener("error", onError, true);
    return () => {
      window.clearTimeout(t);
      v.removeEventListener("canplaythrough", go);
      v.removeEventListener("error", onError, true);
    };
  }, [sources, start, toStatic]);

  // C-069: paint the flat layer with the video's real edge colours (browsers decode colours slightly differently: in
  // Chrome a fixed #02C5F7 left a faint darker circle around the U), on `playing` and again at 1.0 s.
  const sampled = useRef(0);
  const matchColor = useCallback(() => {
    const v = vid.current;
    const flat = hero?.querySelector<HTMLElement>(".cu-uflat");
    if (!v || !flat) return;
    try {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const x = c.getContext("2d");
      if (!x) return;
      x.drawImage(v, 0, 0, 16, 16);
      // The ribbons can sweep through any edge point: of several along the top and bottom rows, keep the one
      // closest to the video's flat blue (#02C5F7); if none is close (all ribbon), keep the fixed colour.
      const near = (cy: number) => {
        let best: Uint8ClampedArray | null = null;
        let bd = Infinity;
        for (const cx of [1, 4, 8, 11, 14]) {
          const d = x.getImageData(cx, cy, 1, 1).data;
          const dist = Math.abs(d[0] - 2) + Math.abs(d[1] - 197) + Math.abs(d[2] - 247);
          if (dist < bd) {
            bd = dist;
            best = d;
          }
        }
        return bd <= 60 ? best : null;
      };
      const t = near(1);
      const b = near(14);
      if (!t || !b) return;
      flat.style.background = `linear-gradient(180deg,rgb(${t[0]},${t[1]},${t[2]}),rgb(${b[0]},${b[1]},${b[2]}))`;
    } catch {
      /* keep #02C5F7 */
    }
  }, [hero]);

  // The video's clock flies it; at its end the sharp logo fades in.
  useEffect(() => {
    const v = vid.current;
    if (!sources || !v) return;
    const onPlaying = () => {
      if (!sampled.current) {
        sampled.current = 1;
        matchColor();
      }
    };
    v.addEventListener("playing", onPlaying);
    const onTime = () => {
      if (sampled.current < 2 && v.currentTime >= 1.0) {
        sampled.current = 2;
        matchColor();
      }
      if (state.current === "intro" && v.currentTime >= FLY_AT) land();
    };
    const onEnded = () => {
      if (state.current === "intro") land();
      setLogo(true);
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, [sources, land, matchColor]);

  // Skip: a scroll, a swipe, a key or a tap on the hero during the intro.
  useEffect(() => {
    if (!hero) return;
    const skip = (e?: Event) => {
      if (state.current !== "intro") return;
      if (e && e.type === "click" && (e.target as HTMLElement).closest("button, a")) return;
      const v = vid.current;
      if (v && v.currentTime < SKIP_TO) {
        try {
          v.currentTime = SKIP_TO;
        } catch {
          /* not seekable yet */
        }
      }
      land();
    };
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    window.addEventListener("keydown", skip);
    hero.addEventListener("click", skip);
    return () => {
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("keydown", skip);
      hero.removeEventListener("click", skip);
    };
  }, [hero, land]);

  // Resize: keep the box full-screen during the intro, or on the slot (no transition) once it has flown.
  useEffect(() => {
    if (!hero) return;
    const onResize = () => {
      const f = fly.current;
      if (!f || state.current === "idle" || state.current === "static") return;
      if (state.current === "intro") {
        layoutFull();
        return;
      }
      f.classList.remove("go");
      layoutFull();
      f.style.transform = landedTransform();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hero, layoutFull, landedTransform]);

  // "Repetir animación": back to the top, the whole takeover again.
  // Only a real change of `replay` (a click) replays; start's identity changing must not.
  const lastReplay = useRef(replay);
  useEffect(() => {
    if (replay === lastReplay.current) return;
    lastReplay.current = replay;
    if (state.current === "static" || !vid.current) return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    start();
  }, [replay, start]);

  return (
    <div ref={slot} className="cu-uslot" style={{ position: "relative", aspectRatio: "1 / 1" }} data-hero-u>
      {/* eslint-disable-next-line @next/next/no-img-element -- the brand PNG, same as the rest of the board */}
      <img
        src="/site/celsu-logo.png"
        alt=""
        data-hero-u-logo
        style={{ position: "absolute", left: `${U_BOX.left}%`, top: "50%", width: `${U_BOX.width}%`, height: "auto", transform: "translateY(-50%)", filter: LOGO_FILTER, opacity: logo ? 1 : 0, transition: "opacity 400ms ease" }}
      />
      {hero &&
        createPortal(
          <div ref={fly} className="cu-ufly" aria-hidden="true" style={hidden ? { display: "none" } : undefined}>
            <video ref={vid} muted playsInline preload="auto" tabIndex={-1}>
              {sources && <source src="/site/celsu-u-liquid.webm" type="video/webm" />}
              {sources && <source src="/site/celsu-u-liquid.mp4" type="video/mp4" />}
            </video>
          </div>,
          hero,
        )}
    </div>
  );
}
