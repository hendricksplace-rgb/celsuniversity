"use client";

// C-061: the CelsGLOBAL hero (Matt's approved prototype + preview with sound, 2026-11-24). In ~15 s it shows the size
// (8 programs), the time (6 months) and the result (a world of opportunities):
//   1. HeroTakeover (third use): the G video fills the hero (lighten, radial edge mask), copy hidden.
//   2. At 5.4 s the G flies to the start of the route (the dock, 13% of the route box; G = 58% of the video height)
//      and hands over to the still G; the copy reveals.
//   3. 0.5 s after landing the route draws in 6 legs of 0.9 s: at each stop a gold dot pings, the month's label
//      appears and the counter "n de 8 incluidos" fills (2, 3, 4, 5, 7, 8).
//   4. The path ends in the glowing destination, arcs burst out, the world video fades in (1.6 s) behind the copy
//      (left side faded), the route dims to .18; 0.9 s later the closing ("Se abre un mundo de oportunidades.").
// Sound: silent by default (never autoplays); a "Activar sonido" pill during the intro starts the theme at the
// seconds since the intro started (it was mixed to start with the G video); it fades out over its last 1.8 s.
// "Ver de nuevo" replays everything, with sound if it was turned on (that click is the gesture). The choice is kept
// for the visit (sessionStorage).
// Skip (button, scroll, keys): the G seeks to 4.6 s and flies, then the route appears at once. Reduced motion,
// autoplay refused or no video after 5 s: the end state at once (G at the dock, full route, labels, the world
// poster, the closing), no sound pill.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  HeroTakeover,
  type HeroArtApi,
  type LandedMode,
} from "@/components/site/HeroTakeover";
import { fraunces } from "./fonts";

const MONTHS = [
  { n: 1, t: "Fundamentos", p: "CelsTV · Finanzas", add: 2, side: "r" },
  {
    n: 2,
    t: "Inglés profesional",
    p: "English for Business",
    add: 1,
    side: "l",
  },
  { n: 3, t: "Tu resume", p: "CV to Resume", add: 1, side: "r" },
  { n: 4, t: "Revisión experta", p: "Resume Review", add: 1, side: "l" },
  {
    n: 5,
    t: "La entrevista",
    p: "Interview Code · Interview Prep",
    add: 2,
    side: "r",
  },
  { n: 6, t: "Tu camino", p: "Visa TN", add: 1, side: "l" },
] as const;
const FR = [0.12, 0.27, 0.42, 0.57, 0.72, 0.86];
const PATH =
  "M70 400 C170 410 150 300 245 292 S 330 200 400 205 S 500 120 540 70";
const ARC_ENDS = [
  [600, -40],
  [640, 90],
  [630, 230],
  [470, -60],
  [330, -50],
  [200, 20],
  [660, 330],
  [560, -80],
  [120, 110],
  [690, 10],
];
const LEG_MS = 900;
const ROUTE_AFTER_LANDING_MS = 1500; // landing (copy) is 0.45 s into the 1.4 s flight; the route starts 0.5 s after it ends
const SOUND_KEY = "celsglobal.sound";

type Pt = { x: number; y: number };
type Geo = {
  L: number;
  p0: Pt;
  pe: Pt;
  stops: Pt[];
  arcs: { d: string; stroke: string }[];
};

const pct = (p: Pt) => ({
  left: `${(p.x / 600) * 100}%`,
  top: `${(p.y / 470) * 100}%`,
});
const store = {
  get: () => {
    try {
      return sessionStorage.getItem(SOUND_KEY) === "on";
    } catch {
      return false;
    }
  },
  set: (on: boolean) => {
    try {
      sessionStorage.setItem(SOUND_KEY, on ? "on" : "off");
    } catch {
      /* private mode */
    }
  },
};

type Props = { price: string; enrollHref: string };

export function GlobalHero({ price, enrollHref }: Props) {
  // Route geometry, measured from the SVG path once mounted.
  const pathRef = useRef<SVGPathElement | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const arcRefs = useRef<(SVGPathElement | null)[]>([]);
  const [arcLens, setArcLens] = useState<number[]>([]);
  // A label that would run off the screen slides inward by exactly its overflow, on its own side (and drops just
  // under its dot when that brings it over the dot). On phones the map is also taller (stretched SVG, see CSS).
  const mapRef = useRef<HTMLDivElement | null>(null);
  const labRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [shift, setShift] = useState<number[]>([]);
  const [nudge, setNudge] = useState<number[]>([]);

  // Route state.
  const [draw, setDraw] = useState({ frac: 0, ms: 0 });
  const [stopsOn, setStopsOn] = useState(0);
  const [count, setCount] = useState(0);
  const [dest, setDest] = useState(false);
  const [arcs, setArcs] = useState<{ on: boolean; fast: boolean }>({
    on: false,
    fast: false,
  });
  const [world, setWorld] = useState<"off" | "load" | "on">("off");
  const [worldPlay, setWorldPlay] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mode, setMode] = useState<LandedMode | null>(null);
  const timers = useRef<number[]>([]);
  const worldVid = useRef<HTMLVideoElement | null>(null);

  // Sound.
  const audio = useRef<HTMLAudioElement | null>(null);
  const introAt = useRef<number | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [soundUi, setSoundUi] = useState(true);

  const later = (fn: () => void, ms: number) =>
    timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const L = p.getTotalLength();
    const at = (f: number) => {
      const q = p.getPointAtLength(L * f);
      return { x: q.x, y: q.y };
    };
    const pe = at(1);
    setGeo({
      L,
      p0: at(0),
      pe,
      stops: FR.map(at),
      arcs: ARC_ENDS.map(([x, y], k) => {
        const cx = (pe.x + x) / 2 + (k % 2 ? 40 : -40);
        const cy = Math.min(pe.y, y) - 60;
        return {
          d: `M${pe.x} ${pe.y} Q${cx} ${cy} ${x} ${y}`,
          stroke: k % 3 === 0 ? "#E9D29A" : "#7FD1C5",
        };
      }),
    });
    setSoundOn(store.get());
    return () => clearTimers();
  }, []);
  useEffect(() => {
    if (geo)
      setArcLens(arcRefs.current.map((a) => (a ? a.getTotalLength() : 0)));
  }, [geo]);
  useEffect(() => {
    const box = mapRef.current;
    if (!geo || !box) return;
    const fit = () => {
      const b = box.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const sh = MONTHS.map((m, i) => {
        const lab = labRefs.current[i];
        if (!lab) return 0;
        const x = b.left + (geo.stops[i].x / 600) * b.width;
        const over =
          m.side === "r"
            ? x + 16 + lab.offsetWidth - (vw - 12)
            : 12 - (x - 16 - lab.offsetWidth);
        return Math.max(0, Math.ceil(over));
      });
      // The labels' boxes (map px), then push the lower of any two overlapping labels down until they clear.
      const rects = MONTHS.map((m, i) => {
        const lab = labRefs.current[i];
        const w = lab?.offsetWidth ?? 0;
        const h = lab?.offsetHeight ?? 0;
        const x = (geo.stops[i].x / 600) * b.width;
        const y = (geo.stops[i].y / 470) * b.height;
        const left = m.side === "r" ? x + 16 - sh[i] : x - 16 + sh[i] - w;
        const top = m.side === "r" ? y + (sh[i] > 8 ? 14 : 6) : y - 58;
        return { left, top, w, h };
      });
      const nd = MONTHS.map(() => 0);
      for (let pass = 0; pass < 4; pass++)
        for (let i = 0; i < rects.length; i++)
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i];
            const c = rects[j];
            const ta = a.top + nd[i];
            const tc = c.top + nd[j];
            if (
              a.left < c.left + c.w &&
              c.left < a.left + a.w &&
              ta < tc + c.h &&
              tc < ta + a.h
            ) {
              const lower = ta >= tc ? i : j;
              const upperBottom = lower === i ? tc + c.h : ta + a.h;
              nd[lower] += Math.ceil(upperBottom - (lower === i ? ta : tc)) + 4;
            }
          }
      setShift(sh);
      setNudge(nd);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [geo]);

  const resetRoute = () => {
    clearTimers();
    setDraw({ frac: 0, ms: 0 });
    setStopsOn(0);
    setCount(0);
    setDest(false);
    setArcs({ on: false, fast: false });
    setClosing(false);
    setWorld((w) => (w === "off" ? "off" : "load"));
    setWorldPlay(false);
    setMode(null);
  };

  /** The route: 6 legs (or everything at once when fast), the burst, the world, the closing. */
  const runRoute = useCallback((fast: boolean, playWorld: boolean) => {
    if (fast) {
      setDraw({ frac: 1, ms: 0 });
      setStopsOn(6);
      setCount(8);
      setDest(true);
      setArcs({ on: true, fast: true });
      setWorld("on");
      setWorldPlay(playWorld);
      setClosing(true);
      setSoundUi(false);
      return;
    }
    setWorld((w) => (w === "off" ? "load" : w)); // start loading the world video now
    let n = 0;
    MONTHS.forEach((m, i) => {
      later(() => {
        setDraw({ frac: FR[i], ms: LEG_MS * 0.8 });
        later(() => {
          setStopsOn(i + 1);
          n += m.add;
          setCount(n);
        }, LEG_MS * 0.8);
      }, i * LEG_MS);
    });
    const t = MONTHS.length * LEG_MS;
    later(() => setDraw({ frac: 1, ms: 700 }), t);
    later(() => {
      setDest(true);
      setArcs({ on: true, fast: false });
      setWorld("on");
      setWorldPlay(true);
    }, t + 700);
    later(
      () => {
        setClosing(true);
        setSoundUi(false);
      },
      t + 700 + 900,
    );
  }, []);

  const onLanded = useCallback(
    (m: LandedMode) => {
      setMode(m);
      if (m === "static") {
        setSoundUi(false);
        runRoute(true, false);
      } else if (m === "skipped") runRoute(true, true);
      else later(() => runRoute(false, true), ROUTE_AFTER_LANDING_MS);
    },
    [runRoute],
  );

  // The world video plays when it's on (the poster shows meanwhile, and alone in the static end state).
  useEffect(() => {
    const v = worldVid.current;
    if (!v || world !== "on" || !worldPlay) return;
    v.play().catch(() => undefined);
  }, [world, worldPlay]);

  // Sound: play from the seconds since the intro started; fade out over the last 1.8 s.
  const playSound = (from: number) => {
    const a = audio.current;
    if (!a) return;
    a.volume = 1;
    try {
      a.currentTime = Math.max(0, from);
    } catch {
      /* not loaded yet: starts at 0 */
    }
    a.play().catch(() => undefined);
  };
  const toggleSound = () => {
    const on = !soundOn;
    setSoundOn(on);
    store.set(on);
    if (on)
      playSound(
        introAt.current ? (performance.now() - introAt.current) / 1000 : 0,
      );
    else audio.current?.pause();
  };
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onTime = () => {
      if (!a.duration) return;
      a.volume = Math.max(0, Math.min(1, (a.duration - a.currentTime) / 1.8));
    };
    a.addEventListener("timeupdate", onTime);
    return () => a.removeEventListener("timeupdate", onTime);
  }, []);

  const onIntroStart = useCallback(() => {
    introAt.current = performance.now();
  }, []);

  const replay = (api: HeroArtApi) => {
    resetRoute();
    setSoundUi(true);
    // The click is the gesture: start the theme here, with the intro.
    if (soundOn) playSound(0);
    else audio.current?.pause();
    api.replay();
  };

  const dim = world === "on";

  const renderArt = (api: HeroArtApi) => (
    <div className="gl-route" aria-label="Tu ruta de 6 meses">
      <div ref={mapRef} className={`gl-map${dim ? " dim" : ""}`}>
        <svg
          viewBox="0 0 600 470"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="glrg" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0" stopColor="#3F8FA6" />
              <stop offset="1" stopColor="#E9D29A" />
            </linearGradient>
          </defs>
          <path
            d={PATH}
            fill="none"
            stroke="rgba(255,255,255,.10)"
            strokeWidth="2"
            strokeDasharray="3 7"
            vectorEffect="non-scaling-stroke"
          />
          <path
            ref={pathRef}
            d={PATH}
            fill="none"
            stroke="url(#glrg)"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={
              geo
                ? {
                    strokeDasharray: geo.L,
                    strokeDashoffset: geo.L * (1 - draw.frac),
                    transition: `stroke-dashoffset ${draw.ms}ms ease-in-out`,
                  }
                : { opacity: 0 }
            }
          />
          <g>
            {geo?.arcs.map((a, k) => (
              <path
                key={k}
                ref={(el) => {
                  arcRefs.current[k] = el;
                }}
                d={a.d}
                fill="none"
                stroke={a.stroke}
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity=".85"
                style={
                  arcLens[k]
                    ? {
                        strokeDasharray: arcLens[k],
                        strokeDashoffset: arcs.on ? 0 : arcLens[k],
                        transition:
                          arcs.on && !arcs.fast
                            ? `stroke-dashoffset 1100ms ease-out ${k * 70}ms`
                            : "none",
                      }
                    : { opacity: 0 }
                }
              />
            ))}
          </g>
        </svg>
        {geo && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- the G still: the landing target */}
            <img
              ref={api.stillRef}
              className="hto-still gl-dock"
              src="/site/celsglobal-mark.png"
              alt=""
              style={pct(geo.p0)}
            />
            {MONTHS.map((m, i) => {
              const o = pct(geo.stops[i]);
              const on = i < stopsOn;
              return (
                <div key={m.n}>
                  <i className={`gl-stop${on ? " on" : ""}`} style={o} />
                  <div
                    ref={(el) => {
                      labRefs.current[i] = el;
                    }}
                    className={`gl-lab${on ? " on" : ""}`}
                    style={
                      m.side === "r"
                        ? {
                            top: `calc(${o.top} + ${((shift[i] ?? 0) > 8 ? 14 : 6) + (nudge[i] ?? 0)}px)`,
                            left: `calc(${o.left} + ${16 - (shift[i] ?? 0)}px)`,
                          }
                        : {
                            top: `calc(${o.top} - ${58 - (nudge[i] ?? 0)}px)`,
                            right: `calc(${100 - (geo.stops[i].x / 600) * 100}% + ${16 - (shift[i] ?? 0)}px)`,
                          }
                    }
                  >
                    <b>MES {m.n}</b>
                    <strong>{m.t}</strong>
                    <span>{m.p}</span>
                  </div>
                </div>
              );
            })}
            <div
              className={`gl-dest${dest ? " on" : ""}`}
              style={pct(geo.pe)}
            />
          </>
        )}
      </div>
      <div className={`gl-end${closing ? " on" : ""}`}>
        <h2>Se abre un mundo de oportunidades.</h2>
        <p className="gl-who">
          Una nueva carrera · Nuevos clientes · Nuevos mercados
        </p>
      </div>
      <div className="gl-count">
        <span className="gl-pills">
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} className={i < count ? "on" : undefined} />
          ))}
        </span>
        {closing ? (
          <span className="gl-final">
            8 de 8 incluidos · 6 meses · un solo precio
          </span>
        ) : (
          <span>{count} de 8 incluidos</span>
        )}
      </div>
      {api.phase === "landed" && mode !== "static" && (
        <button
          type="button"
          className="hto-again gl-again"
          onClick={() => replay(api)}
        >
          ↺ Ver de nuevo
        </button>
      )}
    </div>
  );

  return (
    <HeroTakeover
      id="inicio"
      className={`gl-hero ${fraunces.variable}`}
      video={{ webm: "/motion/celsglobal.webm", mp4: "/motion/celsglobal.mp4" }}
      posterImg="/site/celsglobal-mark.png"
      posterAlt=""
      flyAt={5.4}
      skipTo={4.6}
      eFrac={0.58}
      videoMask="radial-gradient(65% 70% at 50% 50%, #000 55%, transparent 82%)"
      handoff
      onLanded={onLanded}
      onIntroStart={onIntroStart}
      renderArt={renderArt}
      backdrop={
        <>
          <span className="gl-dots" aria-hidden="true" />
          <div
            className={`gl-world${world === "on" ? " on" : ""}`}
            aria-hidden="true"
          >
            {world !== "off" && (
              <video
                ref={worldVid}
                muted
                playsInline
                preload="auto"
                poster="/motion/celsglobal-world-poster.webp"
                tabIndex={-1}
              >
                {mode !== "static" && (
                  <source
                    src="/motion/celsglobal-world.webm"
                    type="video/webm"
                  />
                )}
                {mode !== "static" && (
                  <source src="/motion/celsglobal-world.mp4" type="video/mp4" />
                )}
              </video>
            )}
          </div>
        </>
      }
      overlay={
        <>
          {/* Never autoplays: a tap starts it (in sync), a second tap stops it. */}
          <audio ref={audio} preload="none">
            <source src="/motion/celsglobal-theme.mp3" type="audio/mpeg" />
            <source src="/motion/celsglobal-theme.ogg" type="audio/ogg" />
          </audio>
          {soundUi && mode !== "static" && (
            <button
              type="button"
              className="gl-sound"
              onClick={toggleSound}
              aria-pressed={soundOn}
            >
              {soundOn ? "🔇 Silenciar" : "🔊 Activar sonido"}
            </button>
          )}
        </>
      }
    >
      <Link href="/#programas" className="gl-back">
        ← Todos los programas
      </Link>
      <span className="gl-kick">
        CELSGLOBAL · INTERNATIONAL BUSINESS DEVELOPMENT
      </span>
      <h1 className="gl-h1">
        Tu carrera,
        <br />
        <em>sin fronteras.</em>
      </h1>
      <p className="gl-sub">
        Un programa de 6 meses para profesionales que quieren crecer en Estados
        Unidos: inglés de negocios, un resume al estilo americano, entrevistas
        que sí ganas, tus finanzas en orden y tu camino con la Visa TN.
      </p>
      <div className="gl-ctas">
        <a href={enrollHref} className="cu-btn cu-btn-gold">
          Inscríbete por {price}{" "}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </a>
        <a href="#ruta" className="cu-btn cu-btn-ghost">
          Ver la ruta de 6 meses
        </a>
      </div>
      <div className="gl-chips">
        <span className="cu-chip">6 meses</span>
        <span className="cu-chip">8 programas y servicios</span>
        <span className="cu-chip">Inglés con apoyo en español</span>
      </div>
    </HeroTakeover>
  );
}
