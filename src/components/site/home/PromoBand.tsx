"use client";

// C-070: the promo video. A band between the program marquee and #programas holds only a pulsing pink play button
// (and a small "Saltar video ↓"); it carries the blue → light fade that used to open #programas. A click plays the
// 56 s promo full screen with sound (vertical cut in portrait, landscape otherwise, chosen at the click; nothing is
// downloaded before it: no src until then). When it ends, the overlay closes, the page glides to #programas and
// "¿Cuál es tu meta?" is revealed.
//
// #programas is hidden by a class this component adds after hydration (so it's visible without JS) and revealed,
// for the rest of the session, by any of: the video ending, closing it early, "Saltar video", any jump to
// #programas (nav, "Ver programas", a hash in the URL), or simply scrolling to it (its top 15% into the viewport).
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fireFirstScroll } from "@/components/site/LogoMotion";
import "./promo.css";

const SRC = { land: "/promo/celsu-promo-landscape.mp4", vert: "/promo/celsu-promo-vertical.mp4" };
const KEY = "celsu.promo.revealed";
const START_MS = 4000;
const HIDE = "cu-promohide";

const reduced = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const seen = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

type W = Window & {
  gtag?: (...a: unknown[]) => void;
  plausible?: (e: string) => void;
  dataLayer?: unknown[];
};
/** Analytics, where the page has any (none is installed today): gtag, Plausible or a GTM dataLayer. */
function track(event: "promo_play" | "promo_complete" | "promo_skip") {
  const w = window as W;
  try {
    w.gtag?.("event", event);
    w.plausible?.(event);
    w.dataLayer?.push({ event });
  } catch {
    /* never let analytics break the player */
  }
}

/** Reveal #programas (once per session). */
function reveal() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode */
  }
  const s = document.getElementById("programas");
  if (!s || !s.classList.contains(HIDE)) return;
  s.classList.remove(HIDE);
  s.removeAttribute("aria-hidden");
  s.removeAttribute("inert");
}

export function PromoBand() {
  const btn = useRef<HTMLButtonElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const vid = useRef<HTMLVideoElement | null>(null);
  const bar = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const raf = useRef(0);
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hide #programas until it's revealed (not in this session yet, and not arriving on #programas).
  useEffect(() => {
    setMounted(true);
    const s = document.getElementById("programas");
    if (!s || seen() || location.hash === "#programas") return;
    s.classList.add(HIDE);
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("inert", "");
    // Scrolled to: its top 15% into the viewport.
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && reveal(), { rootMargin: "0px 0px -15% 0px" });
    io.observe(s);
    // Any jump to #programas: links (capture, before the browser scrolls) and hash changes.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (a?.getAttribute("href") === "#programas") reveal();
    };
    const onHash = () => location.hash === "#programas" && reveal();
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHash);
    return () => {
      io.disconnect();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const close = useCallback((how: "ended" | "early") => {
    const v = vid.current;
    window.clearTimeout(timer.current);
    cancelAnimationFrame(raf.current);
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load(); // stop the download
    }
    setOpen(false);
    document.documentElement.classList.remove("cu-promo-lock");
    reveal();
    if (how === "ended") {
      const s = document.getElementById("programas");
      btn.current?.focus({ preventScroll: true });
      s?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    } else {
      btn.current?.focus({ preventScroll: true });
    }
  }, []);

  const play = () => {
    const v = vid.current;
    if (!v || open) return;
    fireFirstScroll(); // C-065: this interaction counts as the first scroll
    const portrait = window.matchMedia?.("(orientation: portrait)").matches;
    v.src = portrait ? SRC.vert : SRC.land;
    v.muted = false;
    setMuted(false);
    setPaused(false);
    if (bar.current) bar.current.style.transform = "scaleX(0)";
    setOpen(true);
    document.documentElement.classList.add("cu-promo-lock");
    track("promo_play");
    // Not started within 4 s (or an error): close and reveal.
    let started = false;
    v.addEventListener("playing", () => (started = true), { once: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => !started && close("early"), START_MS);
    v.play().catch((e: DOMException) => {
      if (e?.name !== "AbortError") close("early");
    });
  };

  // While open: the progress line, Esc, focus kept inside, the end.
  useEffect(() => {
    if (!open) return;
    const v = vid.current!;
    const o = box.current!;
    o.querySelector<HTMLButtonElement>(".cu-promo-x")?.focus({ preventScroll: true });
    const tick = () => {
      if (bar.current && v.duration) bar.current.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        track("promo_skip");
        close("early");
      } else if (e.key === "Tab") {
        const f = [...o.querySelectorAll<HTMLElement>("button")];
        const i = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      }
    };
    const onEnded = () => {
      track("promo_complete");
      close("ended");
    };
    const onError = () => close("early");
    const onPause = () => setPaused(true);
    const onPlay = () => setPaused(false);
    document.addEventListener("keydown", onKey);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    v.addEventListener("pause", onPause);
    v.addEventListener("play", onPlay);
    return () => {
      cancelAnimationFrame(raf.current);
      document.removeEventListener("keydown", onKey);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("play", onPlay);
    };
  }, [open, close]);

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };

  const overlay = (
    <div ref={box} className={`cu-promo-ov${open ? " on" : ""}`} role="dialog" aria-modal="true" aria-label="Video de CelsUniversity" hidden={!open}>
      <video ref={vid} className="cu-promo-vid" playsInline preload="none" onClick={toggle} />
      {paused ? (
        <span className="cu-promo-paused" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34"><path d="M8 5.5v13l11-6.5z" fill="#fff" /></svg>
        </span>
      ) : null}
      <button type="button" className="cu-promo-ctl cu-promo-x" aria-label="Cerrar video" onClick={() => (track("promo_skip"), close("early"))}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </button>
      <button
        type="button"
        className="cu-promo-ctl cu-promo-mute"
        aria-label={muted ? "Activar sonido" : "Silenciar"}
        aria-pressed={muted}
        onClick={() => {
          const v = vid.current;
          if (!v) return;
          v.muted = !v.muted;
          setMuted(v.muted);
        }}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff" /><path d="M16 9l5 6M21 9l-5 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
        )}
      </button>
      <span className="cu-promo-prog" aria-hidden="true">
        <span ref={bar} />
      </span>
    </div>
  );

  return (
    <div className="cu-promo" role="region" aria-label="Video de CelsUniversity">
      <div className="cu-promo-in">
        <button ref={btn} type="button" className="cu-promo-play" aria-label="Ver el video de CelsUniversity (56 segundos)" onClick={play}>
          <span className="cu-promo-ring" aria-hidden="true" />
          <span className="cu-promo-ring" aria-hidden="true" />
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.2v13.6L19.5 12z" fill="#fff" /></svg>
        </button>
        <a
          href="#programas"
          className="cu-promo-skip"
          onClick={() => {
            fireFirstScroll();
            track("promo_skip");
            reveal();
          }}
        >
          Saltar video ↓
        </a>
      </div>
      {mounted ? createPortal(overlay, document.body) : null}
    </div>
  );
}
