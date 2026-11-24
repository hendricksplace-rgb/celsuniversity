"use client";

// C-057: a program hero where the logo video takes over the whole hero, then flies into a slot on the right
// (Matt's approved prototype, 2026-11-24). Built for CelsTV (C-057); CelsUS (C-060)
// is the second: its landing image is the whole final frame, with the logo off-centre in it (stillShows="frame",
// logoCenter).
//
// Sequence: the copy starts hidden; once the video can play through it plays from 0 over the whole hero
// (object-fit: cover). At `flyAt` s the video's transform animates (1.4 s) so the logo lands on the slot's still
// image; 450 ms later the copy reveals (staggered) and the decor fades in; the video holds its last frame there.
// Skip: the "Saltar" button, wheel, touchmove, ArrowDown, PageDown, Space and Escape (seek to `skipTo`, then fly).
// Replay: "Ver de nuevo" under the slot. Fallbacks (static image in the slot, copy right away): reduced motion (the
// video is never requested: its sources are only added from JS), play() refused, a video error, or nothing
// playing after 5 s.
//
// Blend: the stage (a full-hero layer, no z-index) has `mix-blend-mode: lighten`, so the video's flat background
// disappears as long as every colour in the hero is at or above it in each RGB channel. Nothing between the
// section and the stage may create a stacking context (no z-index / transform / filter on the section).
import { useCallback, useEffect, useRef, useState } from "react";
import "./hero-takeover.css";

const START_TIMEOUT_MS = 5000;
const COPY_AFTER_MS = 450;
const FLIGHT_MS = 1400;

type Phase = "intro" | "landed" | "static";
/** How the intro ended: it flew on its own, the visitor skipped it, or it fell back to the static still. */
export type LandedMode = "flown" | "skipped" | "static";
export type HeroArtApi = {
  /** Put this on the image the logo lands on (the landing target; give it the class hto-still). */
  stillRef: React.RefObject<HTMLImageElement | null>;
  phase: Phase;
  /** True once the video has handed over to the still (with `handoff`). */
  docked: boolean;
  /** Runs the whole intro again (only meaningful once landed). */
  replay: () => void;
};

type Props = {
  id?: string;
  /** The logo video (webm first, then mp4). */
  video: { webm: string; mp4: string };
  /** The static logo shown in the slot (fallbacks) and measured as the landing target. */
  posterImg: string;
  posterAlt: string;
  /** When the logo is complete and it can fly (s), and where a skip seeks to first (s). */
  flyAt?: number;
  skipTo?: number;
  /** The logo's height as a share of the video's height, and its centre in the frame (fractions). */
  eFrac?: number;
  logoCenter?: { x: number; y: number };
  /** What the slot's still image shows: just the logo (it lands on the logo) or the whole final frame (it lands
   *  on the frame, so the logo keeps its place in it). */
  stillShows?: "logo" | "frame";
  /** A mask for the video once it flies (e.g. the poster's radial edge): a wide frame's glow would otherwise show
   *  its corners in the slot. At fly time the frame's edges are plain background, so the switch can't be seen. */
  landMask?: string;
  /** Slot size and the logo's height in it, desktop and mobile (≤ 820px). */
  slotSize?: { desktop: number; mobile: number };
  logoHeight?: { desktop: number; mobile: number };
  /** Decor inside the slot, behind the logo (rings); shown after landing. Gets the class hto-decor. */
  decor?: React.ReactNode;
  /** Layers painted behind everything (beams, orbs). They must only lighten the hero. */
  backdrop?: React.ReactNode;
  /** The left column; each direct child reveals in turn. */
  children: React.ReactNode;
  onLanded?: (mode: LandedMode) => void;
  /** Called when the intro video really starts playing (from 0), e.g. to sync music. */
  onIntroStart?: () => void;
  /** C-061: a custom right column instead of the slot (CelsGLOBAL's route): it renders the landing still. */
  renderArt?: (api: HeroArtApi) => React.ReactNode;
  /** A mask on the takeover video for its whole life (e.g. a radial edge). */
  videoMask?: string;
  /** After the flight, hide the video and show the still (so the still can be styled, e.g. dimmed). */
  handoff?: boolean;
  /** Controls painted over everything in the hero (e.g. a sound button). */
  overlay?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  labels?: { skip: string; replay: string };
};

export function HeroTakeover({
  id,
  video,
  posterImg,
  posterAlt,
  flyAt = 6.2,
  skipTo = 5.4,
  eFrac = 0.6,
  logoCenter = { x: 0.5, y: 0.5 },
  stillShows = "logo",
  landMask,
  videoMask,
  handoff = false,
  renderArt,
  overlay,
  onIntroStart,
  slotSize = { desktop: 300, mobile: 220 },
  logoHeight = { desktop: 190, mobile: 140 },
  decor,
  backdrop,
  children,
  onLanded,
  className,
  style,
  labels = { skip: "Saltar ›", replay: "↺ Ver de nuevo" },
}: Props) {
  const hero = useRef<HTMLElement | null>(null);
  const vid = useRef<HTMLVideoElement | null>(null);
  const still = useRef<HTMLImageElement | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [fly, setFly] = useState(false);
  const [src, setSrc] = useState(false);
  const [docked, setDocked] = useState(false);
  const flown = useRef(false);
  const skipped = useRef(false);
  const startCb = useRef(onIntroStart);
  startCb.current = onIntroStart;
  const timers = useRef<number[]>([]);
  const landedCb = useRef(onLanded);
  landedCb.current = onLanded;

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  /** The transform that puts the video's logo on the slot's still image. */
  const target = useCallback(() => {
    const h = hero.current!.getBoundingClientRect();
    const s = still.current!.getBoundingClientRect();
    const vh = Math.max(h.height, (h.width * 9) / 16); // the object-fit: cover size
    const vw = (vh * 16) / 9;
    const sh = s.height || logoHeight.desktop;
    // Land the logo on the still: the still is the logo itself, or the whole frame with the logo inside it.
    const scale = stillShows === "frame" ? sh / vh : sh / (vh * eFrac);
    const lx = stillShows === "frame" ? s.left + s.width * logoCenter.x : s.left + s.width / 2;
    const ly = stillShows === "frame" ? s.top + s.height * logoCenter.y : s.top + s.height / 2;
    const ox = (logoCenter.x - 0.5) * vw * scale; // the logo's offset from the video's centre, once scaled
    const oy = (logoCenter.y - 0.5) * vh * scale;
    const dx = lx - (h.left + h.width / 2) - ox;
    const dy = ly - (h.top + h.height / 2) - oy;
    return `translate(${dx}px, ${dy}px) scale(${scale})`;
  }, [eFrac, logoCenter.x, logoCenter.y, stillShows, logoHeight.desktop]);

  /** Static fallback: no video, the still logo, the copy right away. */
  const finish = useCallback(() => {
    flown.current = true;
    clearTimers();
    vid.current?.pause();
    setPhase("static");
    landedCb.current?.("static");
  }, []);

  const flyNow = useCallback(() => {
    const v = vid.current;
    if (flown.current || !v) return;
    flown.current = true;
    clearTimers();
    setFly(true);
    void v.offsetWidth; // reflow first, or the transform snaps instead of animating
    requestAnimationFrame(() => {
      v.style.transform = target();
      later(() => {
        setPhase("landed");
        landedCb.current?.(skipped.current ? "skipped" : "flown");
      }, COPY_AFTER_MS);
      if (handoff) later(() => setDocked(true), FLIGHT_MS + 50);
    });
  }, [target, handoff]);

  const start = useCallback(() => {
    const v = vid.current;
    if (!v) return;
    clearTimers();
    flown.current = false;
    skipped.current = false;
    setFly(false);
    setDocked(false);
    setPhase("intro");
    v.style.transform = "none";
    const go = () => {
      if (flown.current) return; // the fallback took over meanwhile
      try {
        v.currentTime = 0;
      } catch {
        /* not loaded yet */
      }
      v.addEventListener("playing", () => startCb.current?.(), { once: true });
      v.play().catch(finish);
    };
    if (v.readyState >= 4) go();
    else v.addEventListener("canplaythrough", go, { once: true });
    later(() => {
      if (!flown.current && v.currentTime < 0.2) finish();
    }, START_TIMEOUT_MS);
  }, [finish]);

  const skip = useCallback(() => {
    const v = vid.current;
    if (flown.current || !v) return;
    skipped.current = true;
    if (v.currentTime < skipTo) {
      try {
        v.currentTime = skipTo;
      } catch {
        /* not seekable yet */
      }
    }
    flyNow();
  }, [flyNow, skipTo]);

  // Start: reduced motion → static, the video never requested. Otherwise add the sources, then start.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    setSrc(true);
    return clearTimers;
  }, [finish]);
  useEffect(() => {
    const v = vid.current;
    if (!src || !v) return;
    // A source that fails to load fires "error" on the <source>, which doesn't bubble: listen in the capture phase.
    // Only the last source failing (the browser tries the next one first) or the video itself means no video.
    const onError = (e: Event) => {
      if (e.target instanceof HTMLSourceElement && e.target.nextElementSibling) return;
      finish();
    };
    v.addEventListener("error", onError, true);
    v.load();
    start();
    return () => v.removeEventListener("error", onError, true);
  }, [src, start, finish]);

  // While the intro runs: the video's clock flies it; scrolling or the keys skip it.
  useEffect(() => {
    const v = vid.current;
    if (!v || phase !== "intro") return;
    const onTime = () => {
      if (!flown.current && v.currentTime >= flyAt) flyNow();
    };
    const onEnded = () => flyNow();
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "Escape"].includes(e.key)) skip();
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, flyAt, flyNow, skip]);

  // After landing, keep the logo on the slot when the layout changes (no transition).
  useEffect(() => {
    if (phase !== "landed") return;
    const onResize = () => {
      const v = vid.current;
      if (!v) return;
      setFly(false);
      v.style.transform = target();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, target]);

  const vars = {
    "--hto-slot": `${slotSize.desktop}px`,
    "--hto-slot-m": `${slotSize.mobile}px`,
    "--hto-logo": `${logoHeight.desktop}px`,
    "--hto-logo-m": `${logoHeight.mobile}px`,
    ...(landMask ? { "--hto-landmask": landMask } : {}),
    ...(videoMask ? { "--hto-vmask": videoMask } : {}),
  } as React.CSSProperties;

  return (
    <section ref={hero} id={id} className={`hto${className ? ` ${className}` : ""}`} data-phase={phase} data-docked={docked ? "true" : undefined} style={{ ...vars, ...style }}>
      {backdrop}
      <div className={`hto-stage${fly ? " fly" : ""}`} aria-hidden="true">
        <video ref={vid} muted playsInline preload="auto" tabIndex={-1}>
          {src && <source src={video.webm} type="video/webm" />}
          {src && <source src={video.mp4} type="video/mp4" />}
        </video>
      </div>
      <div className="hto-wrap">
        <div className="hto-copy">{children}</div>
        {renderArt ? (
          <div className="hto-art hto-art-custom">{renderArt({ stillRef: still, phase, docked, replay: start })}</div>
        ) : (
          <div className="hto-art">
            <div className="hto-slot">
              {decor}
              {/* eslint-disable-next-line @next/next/no-img-element -- the brand still, also the landing target */}
              <img ref={still} className="hto-still" src={posterImg} alt={posterAlt} />
              {phase === "landed" && (
                <button type="button" className="hto-again" onClick={start}>
                  {labels.replay}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {overlay}
      {phase === "intro" && (
        <button type="button" className="hto-skip" onClick={skip}>
          {labels.skip}
        </button>
      )}
      <noscript>
        <style>{".hto .hto-copy>*{opacity:1;transform:none}.hto .hto-still{opacity:1}.hto .hto-stage{display:none}"}</style>
      </noscript>
    </section>
  );
}
