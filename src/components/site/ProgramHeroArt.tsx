"use client";

// C-055: the right column of a program page hero, no box. The program's animated logo (LogoMotion, C-053) floats
// on the hero background, and the program's own animated piece goes in the slot underneath (CelsBSNS: the chat),
// overlapping the bottom of the logo so they read as one piece. Built for CelsBSNS first; CelsTV, CelsUS and
// CelsGLOBAL follow the same layout with their own video and slot.
//
// Order: logo first, then the slot. `slot(ready)` gets ready=false while the logo animates and true once it has
// settled (video ended, or the poster stays: reduced motion, autoplay refused, slow load). A safety timer starts
// the slot anyway if the video stalls halfway.
//
// Blend: `mix-blend-mode: lighten` drops the video's dark background (#0F0D1E, darker than every hero navy in
// every channel) into the hero; a radial mask (0 at every edge) fades the bubbles in from off-frame. For the blend to see the hero
// behind it, nothing between the hero section and this column may create a stacking context: on the page, the
// section isolates, its glows / dot layers go to z-index -1 and the content wrapper keeps z-index auto
// (see .bv3-hero in celsbsns-v3.css).
import { useEffect, useState } from "react";
import { LogoMotion, type MotionProgram } from "@/components/site/LogoMotion";
import "./program-hero-art.css";

const SAFETY_MS = 11000;

type Props = {
  program: MotionProgram;
  /** Accessible name of the logo (e.g. "CelsBSNS"). */
  label: string;
  /** The program's own animated piece, under the logo. */
  slot: (ready: boolean) => React.ReactNode;
  /** Something over the logo area (the "Ver video" button). */
  overlay?: React.ReactNode;
  className?: string;
};

export function ProgramHeroArt({ program, label, slot, overlay, className }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), SAFETY_MS);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className={`pha${className ? ` ${className}` : ""}`} data-ready={ready ? "true" : "false"}>
      <div className="pha-top">
        <div className="pha-logo">
          <LogoMotion program={program} label={label} eager onDone={() => setReady(true)} />
        </div>
        {overlay}
      </div>
      <div className="pha-slot">{slot(ready)}</div>
    </div>
  );
}
