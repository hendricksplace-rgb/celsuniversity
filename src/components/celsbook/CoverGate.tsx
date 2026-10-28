"use client";

// C-030: before the first page of a CelsUS CelsBook, the real cover over a navy sky with gold stars. "📖 Abrir el
// libro" swings the cover open like a book (a soft page-turn sound) onto the episode's welcome page. Shown the first
// time; a student coming back goes straight to their page, with a small "Ver portada" link. Once open, the reader
// stays mounted underneath, so nothing the student did is lost when they look at the cover again.
import "./covers.css";
import { useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/components/course/kit";
import { clientPref } from "@/lib/prefs";
import { reducedMotion } from "@/components/part/fx";

type T = Dictionary["cv"];

const STARS = Array.from({ length: 28 }, (_, i) => ({ l: (i * 37 + 11) % 100, t: (i * 53 + 7) % 100, d: ((i * 7) % 25) / 10 }));

/** A short, soft page-turn: filtered noise with a swell. */
function pageTurn() {
  if (!clientPref("sound")) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const len = Math.floor(ac.sampleRate * 0.5);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin((Math.PI * i) / len), 2) * 0.35;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1200;
    src.connect(f).connect(ac.destination);
    src.start();
    src.onended = () => void ac.close();
  } catch {}
}

export function CoverGate({
  t,
  cover,
  n,
  topic,
  pages,
  minutes,
  firstTime,
  resumePage,
  children,
}: {
  t: T;
  cover: string;
  n: number;
  topic: string;
  pages: number;
  minutes: number | null;
  firstTime: boolean;
  /** The page the student is on (1-based), when they've read before. */
  resumePage: number;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(firstTime);
  // The reader mounts only once the student starts reading: looking at the cover isn't reading (it would save page 1).
  const [mounted, setMounted] = useState(!firstTime);
  const [open, setOpen] = useState(false);
  const goRef = useRef<HTMLButtonElement>(null);
  const openBook = () => {
    setOpen(true);
    if (!reducedMotion()) pageTurn();
    // Keyboard and screen-reader users land on "Empezar a leer" once the cover has swung open.
    setTimeout(() => goRef.current?.focus({ preventScroll: true }), reducedMotion() ? 50 : 900);
  };
  const read = () => {
    setMounted(true);
    setShow(false);
    setOpen(false);
    window.scrollTo({ top: 0 });
  };
  return (
    <>
      {show && (
        <section className={`cbi ${open ? "open" : ""}`} aria-label={fill(t.coverOf, { n })}>
          <div className="stars" aria-hidden>
            {STARS.map((s, i) => (
              <i key={i} style={{ left: `${s.l}%`, top: `${s.t}%`, ["--d" as string]: `${s.d}s` }} />
            ))}
          </div>
          <div className="rd">
            <div className="inside" aria-hidden={!open}>
              <small>{fill(t.kick, { n })}</small>
              <h1>{topic}</h1>
              <p>{fill(t.meta, { p: pages, m: minutes ?? Math.max(10, pages * 3) })}</p>
              <div className="chips">
                {t.chips.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <button ref={goRef} type="button" className="go" onClick={read} tabIndex={open ? 0 : -1}>
                {resumePage > 1 ? fill(t.goOn, { p: resumePage }) : t.go}
              </button>
            </div>
            <div className="front" onClick={() => !open && openBook()}>
              <div className="face">
                {/* The cover shown when opening the book loads right away (every other cover is lazy). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt={fill(t.coverOf, { n })} width={1400} height={1812} loading="eager" fetchPriority="high" />
              </div>
              <div className="back" aria-hidden>
                <span>CelsUS · English for us</span>
              </div>
            </div>
          </div>
          <button type="button" className="opener" onClick={openBook} tabIndex={open ? -1 : 0}>
            {t.open}
          </button>
        </section>
      )}
      <div hidden={show}>
        <div className="mb-2 flex justify-end">
          <button type="button" className="cbk-seecover" onClick={() => setShow(true)}>
            📖 {t.seeCover}
          </button>
        </div>
        {mounted && children}
      </div>
    </>
  );
}
