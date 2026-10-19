// Progreso (/app/progreso), per progreso-mockup.html: cyan header with the four stat tiles, the road map
// of each program, this week's XP and the English level, one card per program, and the medal case.
// Server-rendered; the road (pin travel) and the tile count-up are a small client component.
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { MedalView, ProgramView, ProgressData, Road as RoadData } from "@/lib/progress-page";
import { Gauge, MEDAL_ICON } from "@/components/home/Gauge";
import { CountUp, Road, type RoadStop } from "./Road";
import s from "./progreso.module.css";

type T = Dictionary["progreso"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = ["L", "R", "W", "S"];
const RING = 527.8;
const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);
/** A string with one {key} shown in bold. */
function rich(str: string, key: string, value: React.ReactNode) {
  const [a, b = ""] = str.split(`{${key}}`);
  return (
    <>
      {a}
      <b>{value}</b>
      {b}
    </>
  );
}
const THEME: Record<ProgramView["brand"], string> = { celsus: s.thUs, celstv: s.thTv, celsbsns: s.thBs, celsglobal: s.thGl };

function Trail({ icon, color, stops }: { icon: string; color: string; stops: [string, string] }) {
  const id = `trail-${icon.codePointAt(0)}`;
  return (
    <div className={s.trail} aria-hidden>
      <svg viewBox="0 0 1240 96" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" stopColor={stops[0]} stopOpacity="0" />
            <stop offset=".3" stopColor={stops[0]} />
            <stop offset=".7" stopColor={stops[1]} />
            <stop offset="1" stopColor={stops[1]} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,60 C180,10 360,90 560,48 M680,48 C880,10 1060,86 1240,40" fill="none" stroke={`url(#${id})`} strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
      </svg>
      <span className={s.stamp} style={{ "--sc": color } as React.CSSProperties}>
        {icon}
      </span>
    </div>
  );
}

/** Where the pin sits on the drawn road (0–1): stops are evenly spaced, units move it within a stretch. */
function roadFraction(r: RoadData) {
  const n = r.at.length;
  if (r.units >= r.at[n - 1]) return 1;
  let i = 0;
  while (i < n - 1 && r.at[i + 1] <= r.units) i++;
  const span = r.at[i + 1] - r.at[i];
  return (i + (span > 0 ? (r.units - r.at[i]) / span : 0)) / (n - 1);
}

function RoadMap({ t, p }: { t: T; p: ProgramView }) {
  const m = t.maps[p.brand];
  const r = p.road;
  const reached = r.at.map((a, i) => (i === r.at.length - 1 ? r.units >= r.total : r.units >= a));
  const nextIdx = reached.indexOf(false);
  const stops: RoadStop[] = m.stops.map(([label, sub], i) => ({ label, sub, state: reached[i] ? "done" : i === nextIdx ? "cur" : "todo" }));
  const percent = Math.min(100, Math.round((r.units / Math.max(r.total, 1)) * 100));
  const next = nextIdx >= 0 ? m.stops[nextIdx][0] : null;
  return (
    <Road
      title={m.title}
      sub={fill(m.sub, { n: p.brand === "celstv" ? p.episodes : 0 })}
      stops={stops}
      target={roadFraction(r)}
      pct={percent}
      nextText={next ? fill(t.next, { stop: next }) : t.arrived}
      ofRoad={t.ofRoad}
      you={t.you}
      label={next ? fill(t.roadLabel, { pct: percent, stop: next }) : t.roadDone}
    />
  );
}

function Tiles({ t, d, locale, dateShort }: { t: T; d: ProgressData; locale: string; dateShort: (iso: string) => string }) {
  const tiles = [
    { cls: s.tFire, icon: "🔥", value: <CountUp to={d.streak} locale={locale} />, label: t.streak, chip: d.record === 1 ? t.record1 : fill(t.record, { n: d.record }) },
    { cls: s.tXp, icon: "⚡", value: <CountUp to={d.totalXp} locale={locale} />, label: t.xp, chip: fill(t.xpWeek, { n: d.weeklyXp.toLocaleString(locale) }) },
    { cls: s.tLv, icon: "🎯", value: d.level ?? "—", label: t.level, chip: d.level && d.evaluatedAt ? fill(t.levelDate, { date: dateShort(d.evaluatedAt) }) : t.levelNone },
    {
      cls: s.tMd,
      icon: "🏅",
      value: <CountUp to={d.earnedCount} locale={locale} />,
      label: t.medals,
      chip: d.nextMedal ? fill(t.medalsNext, { total: d.medals.length, name: d.nextMedal.name }) : fill(t.medalsAll, { total: d.medals.length }),
    },
  ];
  return (
    <ul className={s.tiles} aria-label={t.statsLabel}>
      {tiles.map((x) => (
        <li key={x.label} className={`${s.tile} ${x.cls}`}>
          <span className={s.big} aria-hidden>
            {x.icon}
          </span>
          <span className={s.ic} aria-hidden>
            {x.icon}
          </span>
          <b className={s.tileN}>{x.value}</b>
          <span className={s.tileL}>{x.label}</span>
          <span className={s.tileS}>{x.chip}</span>
        </li>
      ))}
    </ul>
  );
}

function WeekCard({ t, d, locale }: { t: T; d: ProgressData; locale: string }) {
  const max = Math.max(d.dailyGoal * 2, ...d.xpWeek);
  const todayXp = d.xpWeek[d.today];
  return (
    <div className={s.card}>
      <svg className={s.mark} style={{ right: -30, bottom: -40, width: 220 }} viewBox="0 0 24 24" aria-hidden>
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#0F8F7E" />
      </svg>
      <div className={s.chead}>
        <h3 className={s.cTitle}>{t.xpTitle}</h3>
        <span className={s.pill}>{fill(t.xpTotal, { n: d.weeklyXp.toLocaleString(locale) })}</span>
      </div>
      <div className={s.chart} style={{ "--g": d.dailyGoal / max } as React.CSSProperties}>
        <div className={s.goal} aria-hidden>
          <span>{fill(t.dailyGoal, { n: d.dailyGoal })}</span>
        </div>
        <ol className={s.cols}>
          {d.xpWeek.map((xp, i) => {
            const today = i === d.today;
            return (
              <li key={i} className={s.col}>
                <span className={s.v} aria-hidden>
                  {xp || ""}
                </span>
                <span
                  aria-hidden
                  className={`${s.b} ${!xp ? s.zero : ""} ${today ? s.bToday : ""}`}
                  style={{ "--p": xp / max, animationDelay: `${i * 0.07}s` } as React.CSSProperties}
                />
                <span className={`${s.d} ${today ? s.dToday : ""}`} aria-hidden>
                  {t.daysShort[i]}
                </span>
                <span className={s.srOnly}>{`${fill(t.dayXp, { day: t.days[i], n: xp })}${today ? ` (${t.todayMark})` : ""}`}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className={s.wfoot}>
        <span className={s.chip}>
          <span aria-hidden>🎯</span> {fill(t.weeklyGoal, { xp: d.weeklyXp.toLocaleString(locale), goal: d.weeklyGoal.toLocaleString(locale) })}
        </span>
        <span className={s.chip}>
          <span aria-hidden>📅</span> {fill(t.activeDays, { n: d.activeDays })}
        </span>
        <span className={`${s.chip} ${s.chipToday}`}>{todayXp >= d.dailyGoal ? fill(t.todayDone, { n: todayXp }) : fill(t.today, { n: todayXp, left: d.dailyGoal - todayXp })}</span>
      </div>
    </div>
  );
}

function LevelCard({ t, d, dateLong, dateShort }: { t: T; d: ProgressData; dateLong: (iso: string) => string; dateShort: (iso: string) => string }) {
  const idx = d.level ? LEVELS.indexOf(d.level) : -1;
  return (
    <div className={s.card}>
      <svg className={s.mark} style={{ right: -50, bottom: -60, width: 260 }} viewBox="0 0 200 200" aria-hidden>
        <path d="M30 130 A70 70 0 0 1 170 130" fill="none" stroke="#D6006A" strokeWidth="18" strokeLinecap="round" />
        <line x1="100" y1="130" x2="60" y2="88" stroke="#14112B" strokeWidth="8" strokeLinecap="round" />
        <circle cx="100" cy="130" r="12" fill="#14112B" />
      </svg>
      <div className={s.lvhead}>
        <div className={s.emblem}>
          <Gauge small />
        </div>
        <div>
          <h3 className={s.cTitle}>{t.levelTitle}</h3>
          <p className={s.lvSub}>{d.level && d.evaluatedAt ? fill(t.lastEval, { date: dateLong(d.evaluatedAt) }) : t.noEval}</p>
        </div>
      </div>
      <ol className={s.lvl}>
        {LEVELS.map((L, i) => (
          <li key={L} className={i === idx ? s.me : i < idx ? s.below : undefined} aria-current={i === idx ? "true" : undefined}>
            {L}
            {i === idx && <span className={s.srOnly}>{` (${t.yourLevel})`}</span>}
          </li>
        ))}
      </ol>
      {d.level && d.skills && (
        <ul className={s.skills}>
          {SKILLS.map((k) => {
            const lv = d.skills![k];
            const at = LEVELS.indexOf(lv);
            return (
              <li key={k} className={s.sk}>
                <div className={s.skR}>
                  {t.skills[k]} <em>{at >= 0 ? lv : "—"}</em>
                </div>
                <div className={s.skM} aria-hidden>
                  <i style={{ width: `${at >= 0 ? Math.round(((at + 1) / 6) * 100) : 0}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!d.level && <p className={s.lvEmpty}>{t.noEvalSub}</p>}
      {d.history.length > 1 && <p className={s.lvHist}>{fill(t.history, { list: d.history.map((h) => h.level).join(" → ") })}</p>}
      <div className={s.btnrow}>
        {!d.level ? (
          <Link className={s.btn} href="/evaluacion">
            {t.takeEval} <span aria-hidden>→</span>
          </Link>
        ) : d.retakeAt ? (
          <>
            <Link className={s.btn} href="/evaluacion">
              {t.seeResult} <span aria-hidden>→</span>
            </Link>
            <span className={s.ghost}>{fill(t.retakeOn, { date: dateShort(d.retakeAt) })}</span>
          </>
        ) : (
          <Link className={s.btn} href="/evaluacion">
            {t.retakeNow} <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </div>
  );
}

type Bar = { label: string; value: string; pct: number; low?: boolean };
type CardModel = { kick: string; title: string; sub: string | null; ring: number; big: string; of: string; small: string; bars: Bar[]; inc?: string[]; tip: React.ReactNode; cta: string; href: string };

function cardModel(t: T, p: ProgramView): CardModel {
  if (p.brand === "celsus") {
    const u = t.us;
    const l = p.last;
    const r = l ? l.score / l.total : 0;
    return {
      kick: u.kick,
      title: !l ? u.titleNone : fill(r >= 0.9 ? u.titleReady : r >= 0.6 ? u.titleGood : u.titleLow, { n: l.score, total: l.total }),
      sub: u.sub,
      ring: r,
      big: l ? String(l.score) : "—",
      of: fill(t.ringOf, { n: l?.total ?? 20 }),
      small: u.ringSmall,
      bars: u.topics.map((name, i) => ({ label: name, value: p.topics[i] === null ? "—" : `${p.topics[i]}%`, pct: p.topics[i] ?? 0, low: i === p.weakest })),
      tip: (
        <>
          <span aria-hidden>💡 </span>
          {p.weakest === null ? u.tipNone : rich(u.tip, "topic", u.topics[p.weakest])}
        </>
      ),
      cta: u.cta,
      href: p.href,
    };
  }
  if (p.brand === "celstv") {
    const u = t.tv;
    const cu = p.units[p.currentUnit];
    const all = p.units.every((x) => x.done >= x.total);
    const left = cu ? cu.total - cu.done : 0;
    return {
      kick: u.kick,
      title: fill(u.title, { n: p.current, total: p.episodes }),
      sub: all ? u.subDone : p.currentUnit === 0 ? u.subFirst : fill(u.sub, { done: p.currentUnit, next: p.currentUnit + 1 }),
      ring: p.episodes ? p.episodesDone / p.episodes : 0,
      big: String(p.episodesDone),
      of: fill(t.ringOf, { n: p.episodes }),
      small: u.ringSmall,
      bars: p.units.map((x, i) => ({ label: fill(u.unit, { n: i + 1, from: x.from, to: x.to }), value: fill(u.count, { done: x.done, total: x.total }), pct: pct(x.done, x.total), low: !all && i === p.currentUnit })),
      tip: (
        <>
          <span aria-hidden>🎬 </span>
          {all ? u.tipDone : rich(u.tip.replace("{u}", String(p.currentUnit + 1)), "eps", left === 1 ? u.eps1 : fill(u.eps, { n: left }))}
        </>
      ),
      cta: t.continue,
      href: p.href,
    };
  }
  if (p.brand === "celsbsns") {
    const u = t.bs;
    return {
      kick: u.kick,
      title: fill(u.title, { n: p.week }),
      sub: p.weekTitle,
      ring: p.week / p.weeks,
      big: String(p.week),
      of: fill(t.ringOf, { n: p.weeks }),
      small: u.ringSmall,
      bars: p.groups.map((g, i) => ({ label: u.groups[i], value: `${g.pct}%`, pct: g.pct, low: i === p.currentGroup })),
      tip: p.weekTitle ? (
        <>
          <span aria-hidden>💼 </span>
          {rich(u.tip, "title", p.weekTitle)}
        </>
      ) : null,
      cta: t.continue,
      href: p.href,
    };
  }
  const u = t.gl;
  return {
    kick: u.kick,
    title: fill(u.title, { n: p.month }),
    sub: p.month >= 5 ? u.late[p.month - 5] : p.monthCourse,
    ring: p.month / 6,
    big: String(p.month),
    of: fill(t.ringOf, { n: 6 }),
    small: u.ringSmall,
    bars: p.route.map((c, i) => ({ label: c.title, value: fill(u.count, { done: c.done, total: c.total }), pct: pct(c.done, c.total), low: i === p.currentRoute })),
    inc: p.included,
    tip: (
      <>
        <span aria-hidden>📄 </span>
        {rich(u.tip, "tool", "Resume Review")}
      </>
    ),
    cta: t.continue,
    href: p.href,
  };
}

function Deco({ brand }: { brand: ProgramView["brand"] }) {
  return (
    <svg className={s.deco} viewBox="0 0 200 200" aria-hidden>
      {brand === "celsus" && (
        <text x="100" y="140" textAnchor="middle" fontSize="120" fontWeight="900" fill="#fff">
          US
        </text>
      )}
      {brand === "celstv" && (
        <text x="100" y="160" textAnchor="middle" fontSize="190" fontWeight="900" fill="#fff">
          e
        </text>
      )}
      {brand === "celsbsns" && <path d="M170 100a70 70 0 0 1-101 63l-44 10 11-38a70 70 0 1 1 134-35z" fill="#fff" />}
      {brand === "celsglobal" && (
        <g fill="none" stroke="#fff" strokeWidth="5">
          <circle cx="100" cy="100" r="80" />
          <path d="M20 100h160M100 20c40 40 40 120 0 160M100 20c-40 40-40 120 0 160M34 60h132M34 140h132" />
        </g>
      )}
    </svg>
  );
}

function ProgramCard({ t, p }: { t: T; p: ProgramView }) {
  const m = cardModel(t, p);
  const id = `prog-${p.brand}`;
  return (
    <article className={`${s.prog} ${THEME[p.brand]}`} aria-labelledby={id}>
      <span className={s.glo} aria-hidden />
      <div className={s.ringw}>
        <svg viewBox="0 0 200 200" aria-hidden>
          <defs>
            <linearGradient id={`${id}-rg`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="var(--ring2)" />
              <stop offset="1" stopColor="var(--ring1)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="84" fill="rgba(0,0,0,.18)" stroke="rgba(255,255,255,.1)" strokeWidth="16" />
          <circle
            className={s.arc}
            cx="100"
            cy="100"
            r="84"
            fill="none"
            stroke={`url(#${id}-rg)`}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={RING}
            style={{ "--off": RING * (1 - Math.min(1, Math.max(0, m.ring))) } as React.CSSProperties}
          />
        </svg>
        <div className={s.ringIn}>
          <b>{m.big}</b>
          <span>{m.of}</span>
          <small>{m.small}</small>
        </div>
      </div>
      <div className={s.progBody}>
        <div className={s.kick}>{m.kick}</div>
        <h3 id={id} className={s.progTitle}>
          {m.title}
        </h3>
        {m.sub && <p className={s.ps}>{m.sub}</p>}
        {m.bars.length > 0 && (
          <ul className={s.pbars}>
            {m.bars.map((b) => (
              <li key={b.label} className={b.low ? s.low : undefined}>
                <div className={s.pbR}>
                  {b.label}
                  <span>{b.value}</span>
                </div>
                <div className={s.pbM} aria-hidden>
                  <i style={{ width: `${b.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {m.inc && m.inc.length > 0 && (
          <ul className={s.pinc} aria-label={t.gl.includedLabel}>
            {m.inc.map((x) => (
              <li key={x}>✓ {x}</li>
            ))}
          </ul>
        )}
        {m.tip && <p className={s.ptip}>{m.tip}</p>}
        <Link className={s.pbtn} href={m.href}>
          {m.cta} <span aria-hidden>→</span>
        </Link>
      </div>
      <Deco brand={p.brand} />
    </article>
  );
}

function Medal({ t, m, d, dateShort, locale }: { t: T; m: MedalView; d: ProgressData; dateShort: (iso: string) => string; locale: string }) {
  const icon = MEDAL_ICON[m.code] ?? "🏅";
  const nx = m.state === "next" ? d.nextMedal : null;
  const share = nx && nx.min > 0 ? nx.have / nx.min : 0;
  const line =
    m.state === "on"
      ? m.at
        ? fill(t.won, { date: dateShort(m.at) })
        : t.wonNoDate
      : nx?.unit
        ? `${fill(nx.unit === "days" ? t.nextDays : t.nextXp, { n: nx.have.toLocaleString(locale), min: nx.min.toLocaleString(locale) })}${share >= 0.5 ? ` · ${t.almost}` : ""}`
        : m.requirement;
  const cls = m.state === "on" ? s.on : m.state === "next" ? s.next : s.off;
  return (
    <li className={`${s.md} ${cls}`}>
      <div className={s.coin} aria-hidden>
        {m.state === "next" && (
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="#E8137B" strokeWidth="5" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={289 * (1 - Math.max(0.04, share))} />
          </svg>
        )}
        {icon}
        {m.state === "off" && <span className={s.lock}>🔒</span>}
      </div>
      <h3 className={s.mdName}>
        {m.name}
        <span className={s.srOnly}>{`, ${m.state === "on" ? t.earned : m.state === "next" ? t.nextMedal : t.locked}`}</span>
      </h3>
      <p>{line}</p>
    </li>
  );
}

export function Progreso({ t, d, lang }: { t: T; d: ProgressData; lang: "es" | "en" }) {
  const locale = lang === "en" ? "en-US" : "es-MX";
  const tz = "America/Mexico_City";
  const dateShort = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: tz }).replace(".", "");
  const dateLong = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", timeZone: tz });
  const total = d.medals.length;
  const medalPct = pct(d.earnedCount, total);
  return (
    <div className={s.page}>
      <header className={s.head}>
        <div className={`${s.glow} ${s.glowPink}`} aria-hidden />
        <div className={`${s.glow} ${s.glowYellow}`} aria-hidden />
        <div className={s.wrap}>
          <div className={s.crumb}>{t.crumb}</div>
          <h1 className={s.title}>
            {t.titleA} <em>{t.titleB}</em>
          </h1>
          <p className={s.sub}>{t.sub}</p>
        </div>
      </header>

      <div className={s.tilesWrap}>
        <Tiles t={t} d={d} locale={locale} dateShort={dateShort} />
      </div>

      <section className={s.sec} aria-labelledby="pg-route">
        <div className={s.wrap}>
          <Trail icon="🧭" color="#00CCFE" stops={["#00CCFE", "#E8137B"]} />
          <div className={s.eyebrow}>{t.routeEyebrow}</div>
          <h2 id="pg-route" className={s.secTitle}>
            {t.routeTitle}
          </h2>
          {d.programs.length ? (
            <div className={s.stack}>
              {d.programs.map((p) => (
                <RoadMap key={p.brand} t={t} p={p} />
              ))}
            </div>
          ) : (
            <div className={s.empty}>
              <p>{t.noPrograms}</p>
              <Link href="/cursos">
                {t.browse} <span aria-hidden>→</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className={s.sec} aria-labelledby="pg-week">
        <div className={s.wrap}>
          <Trail icon="⚡" color="#21C7A8" stops={["#21C7A8", "#FFB020"]} />
          <div className={`${s.eyebrow} ${s.eyeTeal}`}>{t.weekEyebrow}</div>
          <h2 id="pg-week" className={s.secTitle}>
            {t.weekTitle}
          </h2>
          <div className={s.duo}>
            <WeekCard t={t} d={d} locale={locale} />
            <LevelCard t={t} d={d} dateLong={dateLong} dateShort={dateShort} />
          </div>
        </div>
      </section>

      {d.programs.length > 0 && (
        <section className={s.sec} aria-label={t.progEyebrow}>
          <div className={s.wrap}>
            <Trail icon="🎓" color="#7B61FF" stops={["#7B61FF", "#E8137B"]} />
            <div className={`${s.eyebrow} ${s.eyeViolet}`}>{t.progEyebrow}</div>
            {d.programs.map((p) => (
              <div key={p.brand} className={s.progItem}>
                <h2 className={s.secTitle}>{t.progNames[p.brand]}</h2>
                <ProgramCard t={t} p={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={s.case} aria-labelledby="pg-medals">
        <svg className={s.wave} viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0,36 C240,0 480,60 720,28 C980,0 1220,54 1440,18 L1440,60 L0,60 Z" fill="#221A4A" />
        </svg>
        <div className={s.wrap}>
          <div className={s.mtop}>
            <div>
              <div className={`${s.eyebrow} ${s.eyeYellow}`}>{t.medalsEyebrow}</div>
              <h2 id="pg-medals" className={s.caseTitle}>
                {t.medalsTitle}
              </h2>
              <p>{t.medalsSub}</p>
            </div>
            <div className={s.mprog}>
              <div className={s.mprogR}>
                <span>{fill(t.medalsCount, { n: d.earnedCount, total })}</span>
                <span className={s.yellow}>{medalPct}%</span>
              </div>
              <div className={s.mprogM} role="progressbar" aria-label={t.medalsTitle} aria-valuenow={d.earnedCount} aria-valuemin={0} aria-valuemax={total}>
                <i style={{ width: `${medalPct}%` }} />
              </div>
            </div>
          </div>
          <ul className={s.medals}>
            {d.medals.map((m) => (
              <Medal key={m.code} t={t} m={m} d={d} dateShort={dateShort} locale={locale} />
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
