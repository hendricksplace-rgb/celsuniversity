"use client";

// C-052: the home hero's CelsU "U". Four liquid ribbons swirl in and settle into the U (video by Higgsfield,
// approved by Matt), then the sharp PNG fades in exactly on top of the video's last frame. The video's flat blue
// background is faded into the hero gradient with a radial mask, so no square edge shows.
//
// Fallbacks (nobody sees an empty box):
//   · prefers-reduced-motion: no video at all, only the static logo.
//   · autoplay blocked / play() rejected (iOS Low Power Mode, data saver): the static logo.
//   · the video isn't ready within READY_MS: the static logo, and the video never starts late.
// "Repetir animación" bumps `replay`: logo back to 0, video to 0:00, play again.
import { useEffect, useRef, useState } from "react";

const READY_MS = 2500;
/** Where the U sits in the video: centered, 70% of the frame wide (the PNG is 900×594). */
export const U_BOX = { width: 70, left: 15 } as const;
const LOGO_FILTER = "drop-shadow(0 14px 22px rgba(0,50,80,.30)) drop-shadow(0 0 2px rgba(255,255,255,.6))";
const MASK = "radial-gradient(circle at 50% 50%, #000 52%, transparent 72%)";

type Mode = "video" | "static";

export function HeroU({ replay }: { replay: number }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<Mode>("video");
  const [logo, setLogo] = useState(false);
  const started = useRef(false);

  // First play: reduced motion → static; otherwise play once, and give up after READY_MS.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setMode("static");
      return;
    }
    const v = video.current;
    if (!v) return;
    // autoPlay can start the video before this effect runs (its "playing" event already gone), so the timer
    // looks at the video itself: playing or already past 0:00 means it started in time.
    const isPlaying = () => started.current || v.currentTime > 0 || (!v.paused && v.readyState >= 3);
    const fallback = () => {
      if (isPlaying()) {
        started.current = true;
        return;
      }
      v.pause();
      setMode("static");
    };
    const timer = window.setTimeout(fallback, READY_MS);
    const onPlaying = () => {
      started.current = true;
      window.clearTimeout(timer);
    };
    v.addEventListener("playing", onPlaying);
    if (isPlaying()) onPlaying();
    v.play().catch(() => {
      window.clearTimeout(timer);
      fallback();
    });
    return () => {
      window.clearTimeout(timer);
      v.removeEventListener("playing", onPlaying);
    };
  }, []);

  // "Repetir animación": hide the logo and run the video again from the start.
  useEffect(() => {
    if (replay === 0 || mode !== "video") return;
    const v = video.current;
    if (!v) return;
    setLogo(false);
    v.currentTime = 0;
    v.play().catch(() => setMode("static"));
  }, [replay, mode]);

  const logoStyle = (visible: boolean): React.CSSProperties => ({
    position: "absolute",
    left: `${U_BOX.left}%`,
    top: "50%",
    width: `${U_BOX.width}%`,
    height: "auto",
    transform: "translateY(-50%)",
    filter: LOGO_FILTER,
    opacity: visible ? 1 : 0,
    transition: "opacity 400ms ease",
  });

  return (
    <div className="cu-par" style={{ position: "relative", width: "min(100%, 520px)", aspectRatio: "1 / 1" }} data-hero-u={mode}>
      {mode === "video" && (
        <video
          ref={video}
          muted
          playsInline
          autoPlay
          preload="auto"
          onEnded={() => setLogo(true)}
          onError={() => setMode("static")}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", WebkitMaskImage: MASK, maskImage: MASK }}
        >
          <source src="/site/celsu-u-liquid.webm" type="video/webm" />
          <source src="/site/celsu-u-liquid.mp4" type="video/mp4" />
        </video>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- the brand PNG, same as the rest of the board */}
      <img src="/site/celsu-logo.png" alt="" style={logoStyle(mode === "static" || logo)} data-hero-u-logo />
    </div>
  );
}
