"use client";
// The "El camino de tu progreso" map: a winding road with the program's stops, placed with
// path.getPointAtLength, and the "Tú" pin that travels to the student's position while the % counts up.
// Phones get a vertical zig-zag road, larger screens the wide one. The road is drawn in the browser only
// (the stops need it anyway), when the map nears the screen, inside a box of the same aspect ratio.
import { useEffect, useId, useRef, useState } from "react";
import s from "./progreso.module.css";

export type StopState = "done" | "cur" | "todo";
export type RoadStop = { label: string; sub: string; state: StopState };

const WIDE = { w: 1100, h: 330, d: "M50,250 C190,250 210,90 370,100 S560,260 730,220 S900,70 1050,90" };
function tall(n: number) {
  const h = 70 + n * 86;
  const step = (h - 80) / (n - 1);
  let d = "M70,40";
  for (let i = 1; i < n; i++) {
    const y = 40 + i * step;
    const py = y - step;
    d += ` C${i % 2 ? 70 : 270},${py + step * 0.55} ${i % 2 ? 270 : 70},${y - step * 0.55} ${i % 2 ? 270 : 70},${y}`;
  }
  return { w: 340, h, d };
}
const DUR = 1700;
type Pt = { x: number; y: number };

function Layout({ geo, phone, stops, you, uid, onReady }: { geo: { w: number; h: number; d: string }; phone: boolean; stops: RoadStop[]; you: string; uid: string; onReady: (p: SVGPathElement, pin: SVGGElement) => void }) {
  const path = useRef<SVGPathElement>(null);
  const pin = useRef<SVGGElement>(null);
  const [pts, setPts] = useState<Pt[] | null>(null);
  useEffect(() => {
    const p = path.current!;
    const L = p.getTotalLength();
    const n = stops.length;
    setPts(stops.map((_, i) => {
      const q = p.getPointAtLength((i / (n - 1)) * L);
      return { x: q.x, y: q.y };
    }));
    onReady(p, pin.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const g = `${uid}g`;
  const n = stops.length;
  return (
    <svg className={s.roadSvg} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" x2={phone ? 0 : 1} y1="0" y2={phone ? 1 : 0}>
          <stop offset="0" stopColor="#00CCFE" />
          <stop offset=".45" stopColor="#E8137B" />
          <stop offset="1" stopColor="#FFB020" />
        </linearGradient>
      </defs>
      <path d={geo.d} fill="none" stroke="#E3E8F2" strokeWidth={phone ? 26 : 30} strokeLinecap="round" />
      <path d={geo.d} fill="none" stroke="#fff" strokeWidth={phone ? 18 : 22} strokeLinecap="round" />
      <path d={geo.d} fill="none" stroke="#D5DCEA" strokeWidth="2.5" strokeDasharray="2 10" strokeLinecap="round" />
      <path ref={path} d={geo.d} pathLength={1} fill="none" stroke={`url(#${g})`} strokeWidth={phone ? 12 : 14} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1} />
      {pts &&
        stops.map((st, i) => {
          const pt = pts[i];
          const last = i === n - 1;
          const done = st.state === "done";
          return (
            <g key={i}>
              {st.state === "cur" && <circle className={s.pulse} cx={pt.x} cy={pt.y} r="16" fill="#E8137B" />}
              {last ? (
                <>
                  <circle cx={pt.x} cy={pt.y + 6} r="27" fill="rgba(20,17,43,.10)" />
                  <circle cx={pt.x} cy={pt.y} r="24" fill="#14112B" />
                  <path d={`M${pt.x - 6} ${pt.y + 11}V${pt.y - 12}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  <path d={`M${pt.x - 5} ${pt.y - 12}h14l-4 5 4 5h-14z`} fill="#FFE600" />
                </>
              ) : (
                <>
                  <circle cx={pt.x} cy={pt.y + 5} r="20" fill="rgba(20,17,43,.08)" />
                  <circle cx={pt.x} cy={pt.y} r="16" fill={done ? `url(#${g})` : "#fff"} stroke={done ? "#fff" : st.state === "cur" ? "#E8137B" : "#C9D2E3"} strokeWidth="4" />
                  <text x={pt.x} y={pt.y + 4.5} textAnchor="middle" fontSize="12" fontWeight="800" fill={done ? "#fff" : "#6A6788"}>
                    {done ? "✓" : String(i + 1)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      {pts &&
        stops.map((st, i) => {
          const pt = pts[i];
          const left = pt.x < 170;
          const lx = phone ? (left ? pt.x + 34 : pt.x - 34) : pt.x;
          const ly = phone ? pt.y - 2 : pt.y > 170 ? pt.y + 46 : pt.y - 48;
          const anchor = phone ? (left ? "start" : "end") : "middle";
          return (
            <g key={i}>
              <text className={s.lbl} x={lx} y={ly} textAnchor={anchor}>
                {st.label}
              </text>
              <text className={s.lbl2} x={lx} y={ly + 16} textAnchor={anchor}>
                {st.sub}
              </text>
            </g>
          );
        })}
      <g ref={pin} style={{ visibility: pts ? "visible" : "hidden" }}>
        <g className={s.bob}>
          <path d="M0,-6 C-15,-6 -20,-20 -20,-30 A20,20 0 1 1 20,-30 C20,-20 15,-6 0,-6 Z" transform="translate(0,-7)" fill="rgba(20,17,43,.14)" />
          <path d="M0,-6 C-15,-6 -20,-20 -20,-30 A20,20 0 1 1 20,-30 C20,-20 15,-6 0,-6 Z" transform="translate(0,-12)" fill="#14112B" />
          <circle cx="0" cy="-42" r="14" fill={`url(#${g})`} />
          <text x="0" y="-37.5" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
            {you}
          </text>
        </g>
        <ellipse cx="0" cy="0" rx="9" ry="3.5" fill="rgba(20,17,43,.25)" />
      </g>
    </svg>
  );
}

/** The map card: header with the % of the road and the next stop, and the road itself. */
export function Road({ title, sub, stops, target, pct, nextText, ofRoad, you, label }: { title: string; sub: string; stops: RoadStop[]; target: number; pct: number; nextText: string; ofRoad: string[]; you: string; label: string }) {
  const uid = useId().replace(/:/g, "");
  const road = useRef<HTMLDivElement>(null);
  const pctEl = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"wide" | "tall" | null>(null);
  const part = useRef<{ p: SVGPathElement; pin: SVGGElement } | null>(null);
  const seen = useRef(false);
  const ran = useRef(false);

  const place = (f: number) => {
    const x = part.current;
    if (!x) return;
    x.p.setAttribute("stroke-dashoffset", String(1 - f));
    const q = x.p.getPointAtLength(f * x.p.getTotalLength());
    x.pin.setAttribute("transform", `translate(${q.x},${q.y})`);
    if (pctEl.current) pctEl.current.textContent = `${Math.round(target ? (f / target) * pct : 0)}%`;
  };
  // The pin sets off once the road is drawn and the map is on screen (reduced motion: straight to the end).
  const start = () => {
    if (!part.current || !seen.current || ran.current) return;
    ran.current = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return place(target);
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / DUR);
      place(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const ready = (p: SVGPathElement, pin: SVGGElement) => {
    part.current = { p, pin };
    if (ran.current || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ran.current = true;
      return place(target);
    }
    place(0);
    start();
  };

  useEffect(() => {
    const el = road.current!;
    // Reduced motion: no count-up, the % is final from the start.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches && pctEl.current) pctEl.current.textContent = `${pct}%`;
    const mq = matchMedia("(max-width: 760px)");
    const pick = () => setMode(mq.matches ? "tall" : "wide");
    const near = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        near.disconnect();
        pick();
        mq.addEventListener("change", pick);
      },
      { rootMargin: "400px 0px" },
    );
    const visible = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        visible.disconnect();
        seen.current = true;
        start();
      },
      { threshold: 0.3 },
    );
    near.observe(el);
    visible.observe(el);
    return () => {
      near.disconnect();
      visible.disconnect();
      mq.removeEventListener("change", pick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tallGeo = tall(stops.length);
  return (
    <div className={s.map}>
      <svg className={s.topo} viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden fill="none" stroke="#C9D6EA" strokeWidth="1">
        <path d="M-20 60c120-40 220 40 340 10s220-60 500 10" />
        <path d="M-20 100c140-40 240 40 360 10s220-60 480 10" />
        <path d="M-20 250c160-30 260 30 380 0s220-50 460 0" />
        <path d="M-20 285c160-30 260 30 380 0s220-50 460 0" />
        <circle cx="660" cy="170" r="40" />
        <circle cx="660" cy="170" r="70" />
        <circle cx="140" cy="180" r="30" />
        <circle cx="140" cy="180" r="56" />
      </svg>
      <div className={s.mhead}>
        <div>
          <h3 className={s.mTitle}>{title}</h3>
          <p className={s.mSub}>{sub}</p>
        </div>
        <div className={s.pct} aria-hidden>
          <b ref={pctEl}>0%</b>
          <span>
            {ofRoad[0]}
            <br />
            {ofRoad[1]}
          </span>
          <span className={s.nxt}>
            <i />
            {nextText}
          </span>
        </div>
      </div>
      <div ref={road} className={s.road} role="img" aria-label={label} style={{ "--arw": `${WIDE.w} / ${WIDE.h}`, "--art": `${tallGeo.w} / ${tallGeo.h}` } as React.CSSProperties}>
        {mode && <Layout key={mode} geo={mode === "wide" ? WIDE : tallGeo} phone={mode === "tall"} stops={stops} you={you} uid={`${uid}${mode}`} onReady={ready} />}
      </div>
    </div>
  );
}
/** A stat-tile number that counts up on load (shown as is with reduced motion). */
export function CountUp({ to, locale }: { to: number; locale: string }) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!to || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1200);
      if (el.current) el.current.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString(locale);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, locale]);
  return <span ref={el}>{to.toLocaleString(locale)}</span>;
}
