"use client";

// C-053: an animated program logo (Higgsfield videos, 8 s, ending on the real logo). Dumb and prop-driven so it
// drops into any box: it fills its parent (object-fit: cover), plays ONCE when it comes into view, and holds on the
// last frame. The poster (that last frame) sits underneath and the video only shows once it's really playing, so
// the box is never empty or black. Fallbacks leave the poster: prefers-reduced-motion, autoplay refused, or not
// playing within READY_MS. `replayKey` replays it (the home recommendation panel, when the goal changes).
//
// C-054 (app Home program cards) adds, all optional so the website keeps its behaviour:
//   tone="dark"       the dark CelsTV video (for the dark-plum card)
//   oncePerDay="…"    play at most once a day for that key (localStorage); later the settled poster shows
//   threshold/delayMs when it fires (40 % in view, staggered cards)
//   playOpacity / restOpacity / restFadeMs: big while playing, then it settles into a watermark
// C-055 (program page heroes, ProgramHeroArt):
//   eager             above the fold: play right away on mount (no IntersectionObserver, no lazy poster); still
//                     preload="none", so under reduced motion the video is never requested
//   afterScroll       (C-065) don't watch the viewport until the visitor's first scroll; a replayKey change (a
//                     click) still plays
//   onDone            called once the logo has settled: the video ended, or the poster stays instead
//                     (reduced motion, autoplay refused, not playing within READY_MS, already played today)
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
/** Dark-background versions (C-054): only CelsTV differs; the others are already dark. */
const DARK: Partial<Record<MotionProgram, { webm: string; mp4: string; poster: string }>> = {
  celstv: { webm: "/motion/celstv-dark.webm", mp4: "/motion/celstv-dark.mp4", poster: "/motion/celstv-dark-poster.webp" },
};

const READY_MS = 2500;
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const STORE = "celsu.logoMotion.";
const playedToday = (key: string) => {
  try {
    return localStorage.getItem(STORE + key) === today();
  } catch {
    return false;
  }
};
const markPlayed = (key: string) => {
  try {
    localStorage.setItem(STORE + key, today());
  } catch {
    /* private mode: it may play again, that's fine */
  }
};

type Phase = "rest" | "playing" | "ended";

// C-065: the page's first scroll (scrollY > 40, wheel, touchmove, PageDown / ArrowDown / Space), shared by every
// afterScroll instance: until then they don't watch the viewport (so they don't compete with the hero's intro).
let scrolled = false;
const waiting = new Set<() => void>();
function onFirstScroll(fn: () => void): () => void {
  if (scrolled) {
    fn();
    return () => undefined;
  }
  waiting.add(fn);
  if (waiting.size === 1) {
    const fire = () => {
      if (scrolled) return;
      scrolled = true;
      off();
      const fns = [...waiting];
      waiting.clear();
      fns.forEach((f) => f());
    };
    const onScroll = () => {
      if (window.scrollY > 40) fire();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PageDown" || e.key === "ArrowDown" || e.key === " ") fire();
    };
    const off = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", fire);
      window.removeEventListener("touchmove", fire);
      window.removeEventListener("keydown", onKey);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", fire, { passive: true });
    window.addEventListener("touchmove", fire, { passive: true });
    window.addEventListener("keydown", onKey);
  }
  return () => waiting.delete(fn);
}

type Props = {
  program: MotionProgram;
  /** "dark": the dark-background video where one exists (CelsTV on the app's dark card). */
  tone?: "light" | "dark";
  /** Change it to play the animation again from the start. */
  replayKey?: string | number;
  /** Play at most once a day for this key (localStorage); later the settled poster shows. */
  oncePerDay?: string;
  /** Share of the box that must be visible to start (default 0.5). */
  threshold?: number;
  /** Wait this long after it comes into view before playing (staggers a row of them). */
  delayMs?: number;
  /** Opacity while playing (default 1) and at rest: before, after, or poster only (default 1). */
  playOpacity?: number;
  restOpacity?: number;
  /** How long the fade from playOpacity to restOpacity takes after it ends (default 1200 ms). */
  restFadeMs?: number;
  /** Above the fold: load and play at once, poster not lazy. */
  eager?: boolean;
  /** C-065: don't watch the viewport until the visitor has scrolled (the poster shows until then). */
  afterScroll?: boolean;
  /** Called once the logo has settled (video ended, or the poster stays). */
  onDone?: () => void;
  /** When the animation stands in for the logo: its accessible name (else it's decorative). */
  label?: string;
  /** How the video fits its box (default cover: fill it). */
  fit?: "cover" | "contain";
  className?: string;
  style?: React.CSSProperties;
};

export function LogoMotion({
  program,
  tone = "light",
  replayKey,
  oncePerDay,
  threshold = 0.5,
  delayMs = 0,
  playOpacity = 1,
  restOpacity = 1,
  restFadeMs = 1200,
  eager = false,
  afterScroll = false,
  onDone,
  label,
  fit = "cover",
  className,
  style,
}: Props) {
  const src = (tone === "dark" && DARK[program]) || SOURCES[program];
  const box = useRef<HTMLSpanElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [phase, setPhase] = useState<Phase>("rest");
  const seen = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const done = () => doneRef.current?.();

  /** Play from the start; if it isn't really playing within READY_MS (or play() is refused), keep the poster. */
  const play = () => {
    const v = video.current;
    if (!v || reducedMotion()) {
      done();
      return;
    }
    setShowVideo(false);
    let ok = false;
    const onPlaying = () => {
      ok = true;
      setShowVideo(true);
      setPhase("playing");
      if (oncePerDay) markPlayed(oncePerDay);
    };
    v.addEventListener("playing", onPlaying, { once: true });
    const timer = window.setTimeout(() => {
      if (ok) return;
      v.removeEventListener("playing", onPlaying);
      v.pause();
      setPhase("rest");
      done();
    }, READY_MS);
    try {
      v.currentTime = 0;
    } catch {
      /* not loaded yet: it starts at 0 anyway */
    }
    v.play().catch(() => {
      window.clearTimeout(timer);
      v.removeEventListener("playing", onPlaying);
      setPhase("rest");
      done();
    });
  };

  // First play: once, when it comes into view (and, with oncePerDay, only if it hasn't played today). The video
  // isn't requested before that (preload="none").
  useEffect(() => {
    const el = box.current;
    if (!el || reducedMotion() || (oncePerDay && playedToday(oncePerDay))) {
      done();
      return;
    }
    let delay: number | undefined;
    const go = () => {
      seen.current = true;
      if (delayMs) delay = window.setTimeout(play, delayMs);
      else play();
    };
    if (eager || !("IntersectionObserver" in window)) {
      go();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !seen.current) {
          io.disconnect();
          go();
        }
      },
      { threshold },
    );
    const cancelWait = afterScroll ? onFirstScroll(() => io.observe(el)) : (io.observe(el), () => undefined);
    return () => {
      cancelWait();
      io.disconnect();
      window.clearTimeout(delay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only: one first play per mount
  }, []);

  // Replays: only after the first play has happened.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // afterScroll: a replay comes from a click (an interaction), so it plays even before the first scroll.
    if (seen.current || (afterScroll && !reducedMotion())) {
      seen.current = true;
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- replays follow replayKey only
  }, [replayKey]);

  const layer: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit };
  const opacity = phase === "playing" ? playOpacity : restOpacity;
  return (
    <span
      ref={box}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-logo-motion={program}
      data-playing={showVideo ? "true" : "false"}
      data-phase={phase}
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        overflow: "hidden",
        opacity,
        transition: `opacity ${phase === "ended" ? restFadeMs : 300}ms ease`,
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the poster: tiny webp, the last frame */}
      <img src={src.poster} alt="" loading={eager ? "eager" : "lazy"} decoding="async" style={layer} />
      <video
        ref={video}
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onEnded={() => {
          setShowVideo(true);
          setPhase("ended");
          done();
        }}
        style={{ ...layer, opacity: showVideo ? 1 : 0, transition: "opacity 200ms ease" }}
      >
        <source src={src.webm} type="video/webm" />
        <source src={src.mp4} type="video/mp4" />
      </video>
    </span>
  );
}
