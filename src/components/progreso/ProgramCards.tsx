"use client";

// C-028 Progreso › "Tu programa" (celsu-progreso-programas-mockup.html): one card per program, each with its own
// logo, type, colors and one motif, a strong glass panel with the details, and motion on load (the card rises,
// numbers count up, the ring / gauge / route draws, bars fill one after another). With prefers-reduced-motion
// everything shows in its final state. The server renders the final state too; the card is only "armed" (set to
// its starting point) on the client, just before it scrolls into view.
import "./program-cards.css";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ProgramView } from "@/lib/progress-page";
import { fill } from "@/components/course/kit";

type T = Dictionary["pc"];
type TP = Dictionary["progreso"];
type P<B extends ProgramView["brand"]> = Extract<ProgramView, { brand: B }>;
type Common = { t: T; tp: TP; locale: string; on: boolean };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** "armed" before it shows (starting state), "on" once it scrolls into view (animates to the final state). */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [on, setOn] = useState(false);
  useIso(() => {
    if (reduced() || !("IntersectionObserver" in window)) return;
    setArmed(true);
  }, []);
  useEffect(() => {
    if (!armed || !ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [armed]);
  return { ref, cls: armed ? (on ? "armed on" : "armed") : "", play: armed && on };
}

function Count({ to, play, locale }: { to: number; play: boolean; locale: string }) {
  const [v, setV] = useState(to);
  useIso(() => {
    if (!reduced() && "IntersectionObserver" in window) setV(0);
  }, []);
  useEffect(() => {
    if (!play) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1400);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [play, to]);
  return <span className="cnt">{v.toLocaleString(locale)}</span>;
}

function Bar({ w, i, label }: { w: number; i: number; label?: string }) {
  return (
    <div className="bar" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <i style={{ ["--w" as string]: `${Math.max(0, Math.min(100, w))}%`, ["--i" as string]: i }} />
    </div>
  );
}

function Blobs({ list }: { list: [string, number, number, number, number, number][] }) {
  return (
    <>
      {list.map(([c, size, left, top, dx, dy], i) => (
        <div
          key={i}
          className="blob"
          style={{
            background: c,
            width: size,
            height: size,
            left: `${left}%`,
            top: `${top}%`,
            ["--dx" as string]: `${dx}px`,
            ["--dy" as string]: `${dy}px`,
            animationDelay: `-${i * 3}s`,
          }}
        />
      ))}
    </>
  );
}

/* ---------------- CelsTV ---------------- */

function Ring({ p, children }: { p: number; children: React.ReactNode }) {
  const C = 2 * Math.PI * 62;
  return (
    <div className="pc-ring">
      <svg viewBox="0 0 150 150" aria-hidden>
        <defs>
          <linearGradient id="pc-tvg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFEF05" />
            <stop offset=".5" stopColor="#FF2E93" />
            <stop offset="1" stopColor="#43D6FE" />
          </linearGradient>
        </defs>
        <circle className="tr" cx="75" cy="75" r="62" />
        <circle
          className="fg"
          cx="75"
          cy="75"
          r="62"
          stroke="url(#pc-tvg)"
          strokeDasharray={C}
          style={{ ["--c" as string]: C, ["--off" as string]: C * (1 - p) }}
        />
      </svg>
      <div className="c">{children}</div>
    </div>
  );
}

function TvCard({ t, p, locale, name, streak, xp }: Omit<Common, "on" | "tp"> & { p: P<"celstv">; name: string | null; streak: number; xp: number }) {
  const r = useReveal();
  const u = t.tv;
  const E = p.episodes || 32;
  const done = p.episodesDone;
  const all = done >= E && E > 0;
  const fresh = !p.started && done === 0;
  const cu = p.units[p.currentUnit];
  const left = cu ? cu.total - cu.done : 0;
  const hl = all ? u.done : fresh ? u.first : name ? fill(u.fly, { name }) : u.flyAnon;
  const sub = all ? u.doneSub : fresh ? u.firstSub : fill(left === 1 ? u.left1 : u.left, { n: left, tier: u.tiers[p.currentUnit] });
  const cta = all ? u.review : fresh ? u.start : fill(u.cont, { n: p.current });
  const href = all ? "/app/cursos/celstv-english-for-our-generation" : p.href;
  const cur = all ? -1 : p.current - 1;
  return (
    <article ref={r.ref} className={`pc tv ${r.cls}`} aria-labelledby="pc-tv-h">
      <div className="bgl">
        <Blobs
          list={[
            ["#43D6FE", 260, 70, -10, 40, -30],
            ["#FFEF05", 180, -8, 70, -30, 25],
            ["#8E5CFF", 300, 40, 60, 50, -40],
          ]}
        />
      </div>
      <div className="in">
        <div className="lft">
          <div className="head">
            <div className="lw" aria-hidden>
              <span className="pulse" />
              <span className="pulse b" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo-e" src="/progreso/celstv-e.svg" alt="" width={96} height={96} />
            </div>
            <div>
              <div className="kick">{u.kick}</div>
              <h3 id="pc-tv-h">{u.title}</h3>
            </div>
          </div>
          <div className="main">
            <Ring p={E ? done / E : 0}>
              <b>
                <Count to={done} play={r.play} locale={locale} />
              </b>
              <small>{fill(u.of, { n: E })}</small>
            </Ring>
            <div>
              <div className="hl">{hl}</div>
              <p className="motto">{sub}</p>
            </div>
          </div>
          <div className="chips">
            <span className="chip">{streak > 1 ? fill(u.streak, { n: streak }) : streak === 1 ? u.streak1 : u.streak0}</span>
            {streak > 0 && xp > 0 && (
              <span className="chip">
                ⚡ <Count to={xp} play={r.play} locale={locale} /> XP
              </span>
            )}
            <span className="chip">{fill(u.pctOf, { n: pct(done, E) })}</span>
          </div>
          <Link className="cta" href={href}>
            {cta} <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="glass">
          <div className="gk">
            <span>{u.units}</span>
            <span>
              {done}/{E}
            </span>
          </div>
          <div className="units">
            {p.units.map((x, i) => {
              const state = x.done >= x.total && x.total > 0 ? "done" : !all && i === p.currentUnit ? "now" : x.done === 0 ? "lock" : "";
              return (
                <div key={i} className={`unit ${state}`} data-now={u.now}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="em" src={`/progreso/unit-${i + 1}.svg`} alt="" width={64} height={64} />
                  <b>{fill(u.unit, { n: i + 1 })}</b>
                  <small>{fill(u.unitCount, { done: x.done, total: x.total, tier: u.tiers[i] })}</small>
                  <Bar w={pct(x.done, x.total)} i={i} />
                </div>
              );
            })}
          </div>
          <div className="dots" aria-hidden>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="dr">
                <span>{fill(u.unit, { n: row + 1 })}</span>
                {Array.from({ length: 8 }, (_, k) => {
                  const n = row * 8 + k;
                  return (
                    <i
                      key={k}
                      className={`dot ${p.epDone[n] ? "ok" : n === cur ? "cur" : ""}`}
                      style={{ ["--d" as string]: `${0.6 + n * 0.03}s` }}
                      title={fill(u.ep, { n: n + 1 })}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------------- CelsUS ---------------- */

const STARS = [
  [52, 10, 0.2, 10],
  [61, 38, 1.1, 14],
  [70, 18, 2.0, 9],
  [78, 64, 0.6, 12],
  [84, 30, 1.6, 16],
  [90, 8, 0.9, 11],
  [95, 52, 2.3, 8],
  [66, 84, 1.3, 13],
  [88, 82, 0.4, 10],
  [57, 60, 1.9, 9],
  [74, 44, 0.8, 15],
  [97, 26, 1.5, 12],
];

function UsCard({ t, tp, p, locale }: Omit<Common, "on"> & { p: P<"celsus"> }) {
  const r = useReveal();
  const u = t.us;
  const s = p.last ? Math.round((p.last.score / p.last.total) * 20) : null;
  const best = p.best ? Math.round((p.best.score / p.best.total) * 20) : null;
  const ang = s === null ? -90 : -90 + (s / 20) * 180;
  const pt = (v: number, k = 1) => {
    const a = Math.PI * (1 - v / 20);
    return [150 + 120 * k * Math.cos(a), 150 - 120 * k * Math.sin(a)];
  };
  const tick = (v: number, label: string, c: string) => {
    const [x, y] = pt(v);
    const [x2, y2] = pt(v, 1.17);
    const [lx, ly] = pt(v, 1.33);
    return (
      <g key={v}>
        <line x1={x} y1={y} x2={x2} y2={y2} stroke={c} strokeWidth="3" strokeLinecap="round" />
        <text x={lx} y={ly} fill={c} fontSize="12" fontWeight="800" textAnchor="middle">
          {label}
        </text>
      </g>
    );
  };
  const C = Math.PI * 120;
  const hl = s === null ? u.none : s >= 18 ? u.ready : s >= 12 ? fill(u.passed, { n: 18 - s }) : fill(u.low, { n: 12 - s });
  const date = p.lastAt
    ? new Date(p.lastAt).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "America/Mexico_City" }).replace(".", "")
    : "";
  const sub = s === null ? u.noneSub : fill(u.sub, { date, best: best ?? s });
  const icons = ["🏛️", "📜", "🗽", "⭐"];
  const weak = p.weakest;
  return (
    <article ref={r.ref} className={`pc us ${r.cls}`} aria-labelledby="pc-us-h">
      <div className="bgl" />
      <div className="stripes" />
      {STARS.map(([l, tp2, d, f], i) => (
        <span key={i} className="star" aria-hidden style={{ left: `${l}%`, top: `${tp2}%`, ["--d" as string]: `${d}s`, fontSize: f }}>
          ★
        </span>
      ))}
      <div className="in">
        <div className="lft">
          <div className="head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/progreso/celsus.png" alt="CelsUS" width={168} height={66} />
          </div>
          <div className="kick">{u.kick}</div>
          <h3 id="pc-us-h">{u.title}</h3>
          <div className="gauge" role="img" aria-label={s === null ? u.scoreNone : fill(u.score, { n: s })}>
            <svg viewBox="0 0 300 165" aria-hidden>
              <defs>
                <linearGradient id="pc-ug" x1="0" x2="1">
                  <stop offset="0" stopColor="#FF5A6E" />
                  <stop offset=".55" stopColor="#F2C230" />
                  <stop offset="1" stopColor="#6FE3A0" />
                </linearGradient>
              </defs>
              <path d="M30 150 A120 120 0 0 1 270 150" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="18" strokeLinecap="round" />
              <path
                className="garc"
                d="M30 150 A120 120 0 0 1 270 150"
                fill="none"
                stroke="url(#pc-ug)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={C}
                style={{ ["--c" as string]: C, ["--off" as string]: s === null ? C : C * (1 - s / 20) }}
              />
              {tick(12, u.pass, "#fff")}
              {tick(18, u.goal, "#F2C230")}
              <g className="needle" style={{ ["--a" as string]: `${ang}deg` }}>
                <line x1="150" y1="150" x2="150" y2="48" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                <circle cx="150" cy="150" r="9" fill="#F2C230" stroke="#fff" strokeWidth="3" />
              </g>
            </svg>
          </div>
          <div className="score" aria-hidden>
            <b>{s === null ? "?" : <Count to={s} play={r.play} locale={locale} />}</b>
            <small>/20</small>
          </div>
          <div className="hl">{hl}</div>
          <p className="motto">{sub}</p>
          <div className="ctas">
            <Link className="cta" href={p.href}>
              {s === null ? u.first : u.practice} <span aria-hidden>→</span>
            </Link>
            <Link className="cta2" href={p.interviewHref ?? p.href}>
              {u.interview}
            </Link>
          </div>
        </div>
        <div className="glass">
          <div className="gk">
            <span>{u.byTopic}</span>
            {s !== null && <span className="gold">{u.recent}</span>}
          </div>
          {tp.us.topics.map((name, i) => {
            const v = p.topics[i];
            return (
              <div key={name} className={`row ${i === weak ? "weak" : ""}`}>
                <div className="t">
                  <span>
                    <span className="ico" aria-hidden>
                      {icons[i]}
                    </span>
                    {name}
                    {i === weak && <span className="flag">{u.review}</span>}
                  </span>
                  <span>{v === null ? "—" : `${v}%`}</span>
                </div>
                <Bar w={v ?? 0} i={i} />
              </div>
            );
          })}
          <div className="tip">
            <span aria-hidden>💡</span>
            <span>{weak === null || p.topics[weak] === null ? u.tipNone : fill(u.tip, { topic: tp.us.topics[weak], n: p.topics[weak] ?? 0 })}</span>
          </div>
          {p.hist.length > 0 && (
            <>
              <div className="gk" style={{ marginTop: 16 }}>
                <span>{u.exams}</span>
                <span className="gold">{u.goalLine}</span>
              </div>
              <div className="histw">
                <div className="hist">
                  {p.hist.map((h, i) => (
                    <div
                      key={i}
                      className={i === p.hist.length - 1 ? "last" : ""}
                      style={{ height: `${(h / 20) * 100}%`, ["--d" as string]: `${0.8 + i * 0.15}s` }}
                    >
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
                <div className="goal" style={{ bottom: (18 / 20) * 64 }} />
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---------------- CelsBSNS ---------------- */

const BUBBLES: [string, number, number, number, number, number, number][] = [
  ["#FFD400", 120, 62, 8, 30, -20, 8],
  ["#43D6FE", 150, 80, 48, -25, 20, -10],
  ["#F20174", 100, 48, 72, 20, 25, 6],
  ["#A9EEFF", 80, 90, 16, -30, -15, -8],
  ["#FFE680", 70, 30, 86, 25, -20, 10],
];

function BsCard({ t, tp, p, locale }: Omit<Common, "on"> & { p: P<"celsbsns"> }) {
  const r = useReveal();
  const u = t.bs;
  const progress = p.road.pct ?? 0;
  const allDone = p.weeksDone.every(Boolean);
  return (
    <article ref={r.ref} className={`pc bs ${r.cls}`} aria-labelledby="pc-bs-h">
      <div className="bgl" />
      {BUBBLES.map(([c, w, l, tp2, dx, dy, rot], i) => (
        <div
          key={i}
          className="bub"
          aria-hidden
          style={{
            width: w,
            height: w * 0.8,
            left: `${l}%`,
            top: `${tp2}%`,
            ["--d" as string]: `-${i * 2}s`,
            ["--dx" as string]: `${dx}px`,
            ["--dy" as string]: `${dy}px`,
            ["--r" as string]: `${rot}deg`,
          }}
        >
          <svg viewBox="0 0 100 80" width="100%" height="100%">
            <path d="M8 6 L92 10 L92 58 L52 60 L34 78 L36 60 L8 62 Z" fill={c} />
          </svg>
        </div>
      ))}
      <div className="in">
        <div className="lft">
          <div className="head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/progreso/celsbsns.png" alt="" width={96} height={72} />
            <div>
              <h3 id="pc-bs-h" className="wm">
                <b>CELS</b> <span>BSNS</span>
              </h3>
              <div className="kick">{u.kick}</div>
            </div>
          </div>
          <div className="big">
            <b>
              {u.week} <Count to={p.week} play={r.play} locale={locale} />
            </b>
            <span>{u.of}</span>
          </div>
          <ol className="weeks" aria-label={u.weeksLabel}>
            {p.weeksDone.map((d, i) => {
              const cur = !allDone && i === p.week - 1;
              return (
                <li
                  key={i}
                  className={`wk ${cur ? "cur" : d ? "ok" : ""}`}
                  style={{ ["--d" as string]: `${0.4 + i * 0.06}s` }}
                  data-today={u.today}
                  aria-label={fill(u.weekN, { n: i + 1 })}
                >
                  {i + 1}
                </li>
              );
            })}
          </ol>
          <div className="hl">{p.started ? fill(u.pct, { n: progress }) : u.welcome}</div>
          <p className="motto">
            {p.weekTitle && (
              <>
                {u.thisWeek} <b>{p.weekTitle}</b>.{" "}
              </>
            )}
            {p.started ? u.go : u.startTip}
          </p>
          <Link className="cta" href={p.href}>
            {p.started ? fill(u.cont, { n: p.week }) : u.start} <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="glass">
          <div className="gk">
            <span>{u.panel}</span>
            <span>{progress}%</span>
          </div>
          {p.groups.map((g, i) => (
            <div key={i} className="row">
              <div className="t">
                <span>{tp.bs.groups[i]}</span>
                <span>{g.pct}%</span>
              </div>
              <Bar w={g.pct} i={i} />
            </div>
          ))}
          <div className="stats">
            <div className="st">
              <b>
                <Count to={p.xpWeek} play={r.play} locale={locale} />
              </b>
              <small>{u.xpWeek}</small>
            </div>
            <div className="st">
              <b>
                <Count to={p.lessonsDone} play={r.play} locale={locale} />
              </b>
              <small>{u.lessons}</small>
            </div>
            <div className="st">
              <b>
                <Count to={p.weeksDone.filter(Boolean).length} play={r.play} locale={locale} />
              </b>
              <small>{u.weeksDone}</small>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------------- CelsGLOBAL ---------------- */

const XS = [30, 110, 190, 270, 350, 430];
const YS = [120, 70, 48, 48, 70, 120];
const seg = (i: number) => ` Q ${(XS[i - 1] + XS[i]) / 2} ${Math.min(YS[i - 1], YS[i]) - 28} ${XS[i]} ${YS[i]}`;
const routePath = (to: number) => `M${XS[0]} ${YS[0]}${Array.from({ length: to }, (_, k) => seg(k + 1)).join("")}`;

function GlobalCard({ t, tp, p }: Omit<Common, "on" | "locale"> & { p: P<"celsglobal"> }) {
  const r = useReveal();
  const u = t.gl;
  const m = Math.min(6, Math.max(1, p.month));
  const name = m <= 4 ? p.monthCourse : tp.gl.late[m - 5];
  const motto = m === 1 ? u.first : m <= 4 ? u.mid : u.late;
  const doneRef = useRef<SVGPathElement>(null);
  const planeRef = useRef<SVGTextElement>(null);
  // The ✈️ flies along the drawn part of the route to this month's stop.
  useEffect(() => {
    const path = doneRef.current;
    const plane = planeRef.current;
    if (!r.play || !path || !plane || m === 1) return;
    const L = path.getTotalLength();
    path.style.strokeDasharray = `${L}`;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1800);
      const len = L * (1 - Math.pow(1 - k, 3));
      path.style.strokeDashoffset = `${L - len}`;
      const a = path.getPointAtLength(len);
      const b = path.getPointAtLength(Math.min(L, len + 1));
      const deg = len >= L - 0.5 ? 45 : (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 45;
      plane.setAttribute("x", `${a.x}`);
      plane.setAttribute("y", `${a.y - 18}`);
      plane.setAttribute("transform", `rotate(${deg} ${a.x} ${a.y - 18})`);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [r.play, m]);
  // Before it flies: the plane waits at the first stop and nothing is drawn.
  useIso(() => {
    if (!r.cls || r.play || m === 1) return;
    const path = doneRef.current;
    const plane = planeRef.current;
    if (!path || !plane) return;
    const L = path.getTotalLength();
    path.style.strokeDasharray = `${L}`;
    path.style.strokeDashoffset = `${L}`;
    plane.setAttribute("x", `${XS[0]}`);
    plane.setAttribute("y", `${YS[0] - 18}`);
  }, [r.cls, r.play, m]);
  return (
    <article ref={r.ref} className={`pc gl ${r.cls}`} aria-labelledby="pc-gl-h">
      <div className="bgl">
        <Blobs
          list={[
            ["#3F8FA6", 260, -5, 55, 40, -30],
            ["#B76F86", 160, 55, 85, -35, 20],
          ]}
        />
      </div>
      <svg className="globe" viewBox="0 0 200 200" aria-hidden>
        <g fill="none" stroke="#DDBE72" strokeWidth=".8">
          <circle cx="100" cy="100" r="96" />
          {[20, 45, 70].map((rx) => (
            <ellipse key={rx} cx="100" cy="100" rx={rx} ry="96" />
          ))}
          {[-60, -30, 0, 30, 60].map((y) => (
            <ellipse key={y} cx="100" cy={100 + y} rx={Math.sqrt(96 * 96 - y * y)} ry={8 + Math.abs(y) / 10} />
          ))}
        </g>
      </svg>
      <div className="in">
        <div className="lft">
          <div className="head">
            <svg className="logo-g" viewBox="0 0 140 140" aria-hidden>
              <defs>
                <linearGradient id="pc-gT" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" stopColor="#2E6F86" />
                  <stop offset=".55" stopColor="#5FB3C8" />
                  <stop offset="1" stopColor="#DDBE72" />
                </linearGradient>
                <linearGradient id="pc-gR" gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="134" y2="0">
                  <stop offset="0" stopColor="#9A5470" />
                  <stop offset="1" stopColor="#CC8AA0" />
                </linearGradient>
              </defs>
              <path pathLength={1} d="M100 32 A 47 47 0 1 0 114 84" fill="none" stroke="url(#pc-gT)" strokeWidth="24" strokeLinecap="round" />
              <path pathLength={1} d="M74 78 H 124" fill="none" stroke="url(#pc-gR)" strokeWidth="18" strokeLinecap="round" />
              <path
                pathLength={1}
                d="M114 64 L 130 78 L 114 92"
                fill="none"
                stroke="url(#pc-gR)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <h3 id="pc-gl-h" className="wm">
                Cels<span>GLOBAL</span>
              </h3>
              <div className="kick">{u.kick}</div>
            </div>
          </div>
          <div className="route" role="img" aria-label={fill(u.routeLabel, { n: m })}>
            <svg viewBox="0 0 460 165" aria-hidden>
              <path d={routePath(5)} fill="none" stroke="rgba(244,241,234,.35)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
              {m > 1 && <path ref={doneRef} d={routePath(m - 1)} fill="none" stroke="#DDBE72" strokeWidth="4" strokeLinecap="round" />}
              {XS.map((x, i) => {
                const n = i + 1;
                const done = n < m;
                const cur = n === m;
                return (
                  <g key={n}>
                    <circle
                      cx={x}
                      cy={YS[i]}
                      r={cur ? 13 : 9}
                      fill={done ? "#DDBE72" : cur ? "#F4F1EA" : "#1D3352"}
                      stroke={done || cur ? "#DDBE72" : "rgba(244,241,234,.45)"}
                      strokeWidth="3"
                    />
                    {cur && <circle className="ping" cx={x} cy={YS[i]} r="13" fill="none" stroke="#DDBE72" strokeWidth="2" />}
                    <text x={x} y={YS[i] + 34} fill={done || cur ? "#F4F1EA" : "rgba(244,241,234,.6)"} fontSize="12.5" fontWeight="800" textAnchor="middle">
                      {n === 6 ? u.last : fill(u.month, { n })}
                    </text>
                  </g>
                );
              })}
              <text
                ref={planeRef}
                x={XS[m - 1]}
                y={YS[m - 1] - 18}
                fontSize="26"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(45 ${XS[m - 1]} ${YS[m - 1] - 18})`}
              >
                ✈️
              </text>
            </svg>
          </div>
          <div className="hl">{name ? fill(u.monthOf, { n: m, name }) : fill(u.monthOnly, { n: m })}</div>
          <p className="motto">{motto}</p>
          <Link className="cta" href="/app/programas/celsglobal">
            {u.cta} <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="glass">
          <div className="gk">
            <span>{u.route}</span>
            <span className="gold">{p.routePct}%</span>
          </div>
          {p.route.map((c, i) => (
            <div key={c.title} className="row">
              <div className="t">
                <span>{c.title}</span>
                <span>{pct(c.done, c.total)}%</span>
              </div>
              <Bar w={pct(c.done, c.total)} i={i} />
            </div>
          ))}
          {p.extras.length > 0 && (
            <>
              <div className="gk" style={{ margin: "14px 0 8px" }}>
                <span>{u.inc}</span>
              </div>
              <ul className="inc">
                {p.extras.map((x) => (
                  <li key={x.label} className={x.started ? "ok" : ""}>
                    {x.started && <span className="sr-only">{u.started}: </span>}
                    {x.label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProgramCards({
  t,
  tp,
  programs,
  lang,
  firstName,
  streak,
  totalXp,
}: {
  t: T;
  tp: TP;
  programs: ProgramView[];
  lang: "es" | "en";
  firstName: string | null;
  streak: number;
  totalXp: number;
}) {
  const locale = lang === "en" ? "en-US" : "es-MX";
  return (
    <div className="pcs">
      <div className="pcs-k">{t.eyebrow}</div>
      <h2 className="pcs-h">{programs.length > 1 ? t.plural : tp.progNames[programs[0].brand]}</h2>
      {programs.map((p) =>
        p.brand === "celstv" ? (
          <TvCard key={p.brand} t={t} p={p} locale={locale} name={firstName} streak={streak} xp={totalXp} />
        ) : p.brand === "celsus" ? (
          <UsCard key={p.brand} t={t} tp={tp} p={p} locale={locale} />
        ) : p.brand === "celsbsns" ? (
          <BsCard key={p.brand} t={t} tp={tp} p={p} locale={locale} />
        ) : (
          <GlobalCard key={p.brand} t={t} tp={tp} p={p} />
        ),
      )}
    </div>
  );
}
