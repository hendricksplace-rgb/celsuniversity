"use client";

// C-053: an animated program logo (Higgsfield videos, 8 s, ending on the real logo). Dumb and prop-driven so it
// drops into any box: it fills its parent (object-fit: cover), plays ONCE when it's half in view, and holds on the
// last frame. The poster (that last frame) sits underneath and the video only shows once it's really playing, so
// the box is never empty or black. Fallbacks leave the poster: prefers-reduced-motion, autoplay refused, or not
// playing within READY_MS. `replayKey` replays it (the home recommendation panel, when the goal changes).
import { useEffect, useRef, useState } from "react";

export type MotionProgram = "celstv" | "celsbsns" | "celsus" | "celsglobal" | "celsu";

const SOURCES: Record<MotionProgram, { webm: string; mp4: string; poster: string }> = {
  celstv: { webm: "/motion/celstv.webm", mp4: "/motion/celstv.mp4", poster: "/motion/celstv-poster.webp" },
  celsbsns: { webm: "/motion/celsbsns.webm", mp4: "/motion/celsbsns.mp4", poster: "/motion/celsbsns-poster.webp" },
  celsus: { webm: "/motion/celsus.webm", mp4: "/motion/celsus.mp4", poster: "/motion/celsus-poster.webp" },
  celsglobal: { webm: "/motion/celsglobal.webm", mp4: "/motion/celsglobal.mp4", poster: "/motion/celsglobal-poster.webp" },
  // The C-052 hero U (square, flat blue): available for a later switch of HeroU to this component.
  celsu: { webm: "/site/celsu-u-liquid.webm", mp4: "/site/celsu-u-liquid.mp4", poster: "/site/celsu-logo.png" },
};

const READY_MS = 2500;
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type Props = {
  program: MotionProgram;
  /** Change it to play the animation again from the start. */
  replayKey?: string | number;
  /** When the animation stands in for the logo: its accessible name (else it's decorative). */
  label?: string;
  /** How the video fits its box (default cover: fill it). */
  fit?: "cover" | "contain";
  className?: string;
  style?: React.CSSProperties;
};

export function LogoMotion({ program, replayKey, label, fit = "cover", className, style }: Props) {
  const src = SOURCES[program];
  const box = useRef<HTMLSpanElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const seen = useRef(false);

  /** Play from the start; if it isn't really playing within READY_MS (or play() is refused), keep the poster. */
  const play = () => {
    const v = video.current;
    if (!v || reducedMotion()) return;
    setShowVideo(false);
    let ok = false;
    const onPlaying = () => {
      ok = true;
      setShowVideo(true);
    };
    v.addEventListener("playing", onPlaying, { once: true });
    const timer = window.setTimeout(() => {
      if (ok) return;
      v.removeEventListener("playing", onPlaying);
      v.pause();
    }, READY_MS);
    try {
      v.currentTime = 0;
    } catch {
      /* not loaded yet: it starts at 0 anyway */
    }
    v.play().catch(() => {
      window.clearTimeout(timer);
      v.removeEventListener("playing", onPlaying);
    });
  };

  // First play: once, when half of it is in view. The video isn't requested before that (preload="none").
  useEffect(() => {
    const el = box.current;
    if (!el || reducedMotion()) return;
    if (!("IntersectionObserver" in window)) {
      seen.current = true;
      play();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !seen.current) {
          seen.current = true;
          io.disconnect();
          play();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Replays: only after the first play has happened.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (seen.current) play();
  }, [replayKey]);

  const layer: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit };
  return (
    <span
      ref={box}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-logo-motion={program}
      data-playing={showVideo ? "true" : "false"}
      style={{ position: "absolute", inset: 0, display: "block", overflow: "hidden", ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the poster: tiny webp, the last frame */}
      <img src={src.poster} alt="" loading="lazy" decoding="async" style={layer} />
      <video
        ref={video}
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onEnded={() => setShowVideo(true)}
        style={{ ...layer, opacity: showVideo ? 1 : 0, transition: "opacity 200ms ease" }}
      >
        <source src={src.webm} type="video/webm" />
        <source src={src.mp4} type="video/mp4" />
      </video>
    </span>
  );
}
