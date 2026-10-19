// Pieces of the student home (Inicio), after inicio-mockup.html: hero with the rainbow "continue" card and
// the frosted week, the tilted updates band, program cards with static depth, and "Tu siguiente paso".
import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { BandItem, ContinueLesson, HomeData, HomeProgram } from "@/lib/home";
import type { ThemeKey } from "@/lib/themes";
import s from "./inicio.module.css";

type T = Dictionary["dash"];
export const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

export function Page({ children }: { children: React.ReactNode }) {
  return <div className={s.page}>{children}</div>;
}

/** Hero: light-blue band with the LAM wordmark and glows, the three tags and the greeting. */
export function Hero({ t, name, sub, children }: { t: T; name: string | null; sub?: string; children?: React.ReactNode }) {
  return (
    <header className={`${s.hero} ${s.bleed}`} style={children ? undefined : { paddingBottom: 44 }}>
      {/* Above the fold and 4.7 KB: loaded eagerly as is (lazy loading made it the late LCP element). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative PNG */}
      <img className={s.wm} src="/site/lam-white.png" alt="" aria-hidden width={600} height={195} fetchPriority="high" />
      <div className={`${s.glow} ${s.g1}`} />
      <div className={`${s.glow} ${s.g2}`} />
      <div className={s.wrap}>
        <div className={s.tags} aria-hidden>
          {t.tags.map((tag, i) => (
            <span key={tag} className={`${s.tag} ${[s.t1, s.t2, s.t3][i]}`}>
              {tag}
            </span>
          ))}
        </div>
        {children ?? (
          <>
            <Greeting t={t} name={name} />
            {sub && <p className={s.sub}>{sub}</p>}
          </>
        )}
      </div>
    </header>
  );
}

function Greeting({ t, name }: { t: T; name: string | null }) {
  const [before, after] = t.hi.split("{name}");
  return (
    <h1 className={s.h1}>
      {name ? (
        <>
          {before}
          <em>{name}</em>
          {after}
        </>
      ) : (
        t.hiAnon
      )}{" "}
      👋
    </h1>
  );
}

const MARK: Record<ThemeKey, { src: string; w: number; h: number }> = {
  celstv: { src: "/site/celstv-e.webp", w: 567, h: 600 },
  celsbsns: { src: "/site/celsbsns-bubbles.png", w: 289, h: 252 },
  celsus: { src: "/site/celsus-logo.jpg", w: 1000, h: 402 },
  celsglobal: { src: "/site/celsglobal-mark.png", w: 1024, h: 992 },
};

export function StudentHero({ t, data }: { t: T; data: HomeData }) {
  return (
    <Hero t={t} name={data.name}>
      <div className={s.hgrid}>
        <div>
          <Greeting t={t} name={data.name} />
          {data.continueLesson && <ContinueCard t={t} lesson={data.continueLesson} />}
        </div>
        <WeekCard t={t} data={data} />
      </div>
    </Hero>
  );
}

function ContinueCard({ t, lesson }: { t: T; lesson: ContinueLesson }) {
  const m = MARK[lesson.brand];
  const w = Math.max(4, Math.round(lesson.progress * 100));
  return (
    <div className={`${s.lit} ${s.cont}`}>
      <div className={s.contIn}>
        <div className="min-w-0 flex-1">
          <p className={s.kick}>{lesson.started ? t.continue : t.startHere}</p>
          <h2 className={s.contH}>{lesson.module ? `${lesson.part} · ${lesson.module}` : lesson.lessonTitle}</h2>
          <p className={s.contP}>{lesson.courseTitle}</p>
          <div className={s.bar} role="progressbar" aria-label={lesson.module ?? lesson.courseTitle} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lesson.progress * 100)}>
            <i className={s.shine} style={{ width: `${w}%` }} />
          </div>
          <Link href={`/app/lecciones/${lesson.lessonId}`} className={s.btn}>
            {lesson.started ? t.go : t.start} <span aria-hidden>→</span>
          </Link>
        </div>
        <div className={s.thumb} aria-hidden>
          <Image src={m.src} alt="" width={m.w} height={m.h} sizes="74px" />
        </div>
      </div>
    </div>
  );
}

function WeekCard({ t, data }: { t: T; data: HomeData }) {
  const daysDone = data.week.filter(Boolean).length;
  const goalPct = Math.min(100, pct(data.weeklyXp, data.goal));
  return (
    <section className={s.week} aria-labelledby="tu-semana">
      <h2 id="tu-semana" className={s.weekH}>
        {t.week} <small>{fill(t.daysOf, { n: daysDone })}</small>
      </h2>
      <ol className={s.days}>
        {t.weekDays.map((d, i) => {
          const done = data.week[i];
          const today = i === data.today;
          return (
            <li key={i} className={s.day}>
              <span className={`${s.dot} ${done ? s.done : ""} ${today ? s.today : ""}`} aria-hidden>
                {today && done ? "🔥" : ""}
              </span>
              <span>
                {d}
                {(done || today) && <span className={s.srOnly}>{`: ${[today ? t.dayToday : "", done ? t.dayDone : ""].filter(Boolean).join(", ")}`}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div className={s.chips}>
        <span className={`${s.chip} ${s.c1}`}>
          <span aria-hidden>🔥</span> {data.streak === 1 ? t.streakDay : fill(t.streakDays, { n: data.streak })}
        </span>
        <span className={`${s.chip} ${s.c2}`}>
          <span aria-hidden>⚡</span> {data.weeklyXp} XP
        </span>
        <span className={`${s.chip} ${s.c3}`}>
          <span aria-hidden>🏅</span> {data.medals.earned === 1 ? t.medal1 : fill(t.medalsN, { n: data.medals.earned })}
        </span>
      </div>
      <div className={s.goal}>
        {fill(t.goal, { xp: data.weeklyXp, goal: data.goal })}
        <div className={s.goalBar} aria-hidden>
          <i style={{ width: `${goalPct}%` }} />
        </div>
      </div>
    </section>
  );
}

const DOTS = ["#E8137B", "#00CCFE", "#FFE600", "#B6EC7A", "#FFB020"];
const bandText = (t: T, b: BandItem) =>
  b.kind === "streakToday" || b.kind === "goal"
    ? fill(t.band[b.kind], { n: b.n })
    : b.kind === "medal"
      ? fill(t.band.medal, { name: b.name })
      : b.kind === "fresh"
        ? fill(t.band.fresh, b)
        : t.band[b.kind];

/** The dark band, tilted −2°, scrolling every 46 s: personal messages built on the server (lib/home). */
export function Band({ t, items }: { t: T; items: BandItem[] }) {
  // Short lists are repeated so one half of the track is always wider than the screen.
  const copies = Math.max(1, Math.ceil(6 / items.length));
  const list = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined}>
      {Array.from({ length: copies }, (_, c) =>
        items.map((b, i) => (
          <li key={`${c}-${i}`} className={b.kind === "app" ? s.appMsg : undefined} aria-hidden={c > 0 || undefined}>
            {bandText(t, b)} <b aria-hidden style={{ background: DOTS[i % DOTS.length] }} />
          </li>
        )),
      )}
    </ul>
  );
  return (
    <section aria-label={t.updates} className={`${s.ticker} ${s.bleed}`}>
      <div className={s.track}>
        {list(false)}
        {list(true)}
      </div>
    </section>
  );
}

const DECO: Partial<Record<ThemeKey, { src: string; w: number; h: number }>> = {
  celstv: { src: "/site/celstv-e.webp", w: 567, h: 600 },
  celsbsns: { src: "/site/celsbsns-bubbles.png", w: 289, h: 252 },
  celsus: { src: "/site/celsus-us3d.jpg", w: 1000, h: 540 },
};
const CARD: Record<ThemeKey, string> = {
  celstv: s.tv,
  celsbsns: s.bs,
  celsus: s.us,
  celsglobal: s.gl,
};

function Logo({ brand }: { brand: ThemeKey }) {
  if (brand === "celstv")
    return (
      <>
        <Image src="/site/celstv-e.webp" alt="" width={567} height={600} sizes="44px" />
        <span>
          Cels<span style={{ color: "#FF5FAE" }}>TV</span>
        </span>
      </>
    );
  if (brand === "celsbsns") return <Image src="/site/celsbsns-logo.png" alt="CelsBSNS" width={900} height={252} sizes="160px" />;
  if (brand === "celsus") return <Image src="/site/celsus-logo.jpg" alt="CelsUS" width={1000} height={402} sizes="110px" />;
  return (
    <>
      <Image src="/site/celsglobal-mark.png" alt="" width={1024} height={992} sizes="46px" />
      <span style={{ letterSpacing: ".04em" }}>
        CELS<span style={{ fontWeight: 400 }}>GLOBAL</span>
      </span>
    </>
  );
}

function Globe() {
  return (
    <svg className={s.deco} viewBox="0 0 200 200" aria-hidden fill="none" stroke="#E9D29A" strokeWidth="1.2">
      <circle cx="100" cy="100" r="92" />
      <ellipse cx="100" cy="100" rx="40" ry="92" />
      <ellipse cx="100" cy="100" rx="70" ry="92" />
      <line x1="100" y1="8" x2="100" y2="192" />
      <ellipse cx="100" cy="100" rx="92" ry="30" />
      <ellipse cx="100" cy="100" rx="92" ry="62" />
      <line x1="8" y1="100" x2="192" y2="100" />
    </svg>
  );
}

function ProgramCard({ t, p }: { t: T; p: HomeProgram }) {
  const percent = pct(p.done, p.total);
  const deco = DECO[p.brand];
  const global = p.brand === "celsglobal";
  return (
    <article className={`${s.pc} ${CARD[p.brand]}`}>
      <span className={s.layer} aria-hidden />
      {deco ? <Image className={s.deco} src={deco.src} alt="" aria-hidden width={deco.w} height={deco.h} sizes="340px" loading="lazy" /> : <Globe />}
      <div className={s.top}>
        {global ? (
          <h3 className={s.logo}>
            <Logo brand={p.brand} />
          </h3>
        ) : (
          <div className={s.logo}>
            <Logo brand={p.brand} />
          </div>
        )}
        <div className={s.ring} style={{ "--p": percent } as React.CSSProperties}>
          <b>{percent}%</b>
        </div>
      </div>
      {global ? (
        <ul className={s.list}>
          {p.courses.map((c) => (
            <li key={c.id}>
              <Link href={`/app/cursos/${c.slug}`} className="block hover:underline">
                <span className={s.row}>
                  {c.title} <small>{c.total ? `${c.done}/${c.total}` : t.noLessons}</small>
                </span>
                <span className={s.mini} aria-hidden style={{ display: "block" }}>
                  <i style={{ width: `${pct(c.done, c.total)}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <h3 className={s.pcH}>{p.focus?.title}</h3>
          <p className={s.meta}>
            {p.total ? fill(t.lessonsDone, { done: p.done, total: p.total }) : t.noLessons}
            {p.focus?.module ? ` · ${p.focus.module}` : ""}
          </p>
        </>
      )}
      <div className={s.next}>
        {global ? (
          <span>{fill(t.monthOf, { n: p.month ?? 1 })}</span>
        ) : (
          <span>
            {p.next ? (
              <>
                {p.next.started ? t.keepOn : t.begin} <b>{p.next.part}</b>
              </>
            ) : null}
          </span>
        )}
        {global ? (
          <Link href="/app/programas/celsglobal" className={s.pcLink}>
            {t.viewRoute} <span aria-hidden>→</span>
          </Link>
        ) : (
          p.next && (
            <Link href={`/app/lecciones/${p.next.lessonId}`} className={s.pcLink} aria-label={`${p.next.started ? t.openIt : t.start}: ${p.next.part} · ${p.focus?.title ?? ""}`}>
              {p.next.started ? t.openIt : t.start} <span aria-hidden>→</span>
            </Link>
          )
        )}
      </div>
    </article>
  );
}

export function Programs({ t, programs, before }: { t: T; programs: HomeProgram[]; before?: React.ReactNode }) {
  return (
    <section className={s.sec} aria-labelledby="tus-programas">
      {before}
      <p className={s.eyebrow}>{t.myPrograms}</p>
      <h2 id="tus-programas" className={s.secH}>
        {t.pickToday}
      </h2>
      <div className={s.pgrid}>
        {programs.map((p) => (
          <ProgramCard key={p.brand} t={t} p={p} />
        ))}
      </div>
    </section>
  );
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const MEDAL_ICON: Record<string, string> = {
  first_episode: "🎬",
  streak_3: "🔥",
  streak_7: "🔥",
  streak_30: "🔥",
  evaluation_done: "🎯",
  polyglot: "🗣️",
  reader: "📘",
  first_celscast: "🎧",
  unit_1: "🏁",
  level_up: "📈",
  citizen_ready: "🇺🇸",
  unstoppable: "🏆",
};

function Gauge({ className, small }: { className?: string; small?: boolean }) {
  const id = small ? "gauge-s" : "gauge-b";
  return small ? (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#FFE600" />
          <stop offset=".55" stopColor="#FFB020" />
          <stop offset="1" stopColor="#00CCFE" />
        </linearGradient>
      </defs>
      <path d="M12 42 A20 20 0 0 1 52 42" fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" />
      <line x1="32" y1="42" x2="44" y2="28" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="42" r="4.5" fill="#fff" />
      <text x="32" y="56" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" letterSpacing="1">
        A1–C2
      </text>
    </svg>
  ) : (
    <svg viewBox="0 0 200 200" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#FFE600" />
          <stop offset=".5" stopColor="#FFB020" />
          <stop offset="1" stopColor="#00CCFE" />
        </linearGradient>
      </defs>
      <path d="M30 130 A70 70 0 0 1 170 130" fill="none" stroke={`url(#${id})`} strokeWidth="18" strokeLinecap="round" />
      <line x1="100" y1="130" x2="146" y2="82" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      <circle cx="100" cy="130" r="12" fill="#fff" />
    </svg>
  );
}

/** "Sigue creciendo · Tu siguiente paso": the wave, the route (desktop), the evaluation and the medals. */
export function Grow({ t, data }: { t: T; data: HomeData }) {
  const level = data.evaluationLevel;
  const m = data.medals;
  const nx = m.next;
  return (
    <section className={`${s.grow} ${s.bleed}`} aria-labelledby="siguiente-paso">
      <svg className={s.wave} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="grow-wave" x1="0" x2="1">
            <stop offset="0" stopColor="#FFE6F2" />
            <stop offset=".5" stopColor="#F1E8FF" />
            <stop offset="1" stopColor="#FFF6D6" />
          </linearGradient>
        </defs>
        <path d="M0,70 C240,10 420,120 720,64 C1010,10 1200,100 1440,40 L1440,120 L0,120 Z" fill="url(#grow-wave)" />
      </svg>
      <svg className={s.path} viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden>
        <path d="M60,70 C300,10 520,80 760,40 S1180,10 1380,46" fill="none" stroke="#E8137B" strokeWidth="2.5" strokeDasharray="2 10" strokeLinecap="round" opacity=".55" />
        <circle cx="60" cy="70" r="7" fill="#E8137B" />
        <circle cx="760" cy="40" r="6" fill="#FFB020" />
        <circle cx="1380" cy="46" r="8" fill="#7B61FF" />
      </svg>
      <div className={s.wrap}>
        <p className={s.eyebrow} style={{ color: "#B0005A" }}>
          {t.grow}
        </p>
        <h2 id="siguiente-paso" className={s.secH}>
          {t.nextStep}
        </h2>
        <div className={s.ggrid}>
          <div className={s.eval}>
            <Gauge className={s.emblemBg} />
            <div className={s.ehead}>
              <div className={s.emblem}>
                <Gauge small />
              </div>
              <div>
                <span
                  className={`${s.tag} ${s.t3}`}
                  style={{
                    display: "inline-block",
                    textTransform: "uppercase",
                  }}
                >
                  {t.evalTag}
                </span>
                <h3 className={s.evalH}>{t.english}</h3>
              </div>
            </div>
            <p className={s.evalP}>{level ? fill(t.evalHave, { level }) : t.evalDesc}</p>
            <ul className={s.lv}>
              {LEVELS.map((l) => (
                <li key={l} className={l === level ? s.me : undefined} aria-current={l === level || undefined}>
                  {l}
                </li>
              ))}
            </ul>
            <Link href={level ? "/app/progreso" : "/evaluacion"} className={s.evalBtn}>
              {level ? t.evalSee : t.englishCta} <span aria-hidden>→</span>
            </Link>
          </div>
          <div className={s.tip}>
            <svg className={s.medalBg} viewBox="0 0 200 200" aria-hidden>
              <path d="M70 10 L100 80 L130 10 Z" fill="#E8137B" />
              <path d="M100 80 L80 10 L60 10 Z" fill="#7B61FF" />
              <circle cx="100" cy="125" r="62" fill="#FFB020" />
              <circle cx="100" cy="125" r="46" fill="#FFD34D" />
              <path d="M100 95 l9 19 21 3 -15 14 4 21 -19 -10 -19 10 4 -21 -15 -14 21 -3z" fill="#fff" />
            </svg>
            <p className={s.eyebrow} style={{ color: "#8A5200" }}>
              {t.yourMedals}
            </p>
            <h3 className={s.tipH}>{fill(t.medalsOf, { n: m.earned, total: m.total })}</h3>
            <p className={s.tipP}>
              {nx ? (
                <>
                  {fill(t.toEarn, { req: nx.requirement })} <b>{nx.name}</b>.
                </>
              ) : (
                t.allMedals
              )}
            </p>
            {nx?.unit && nx.min > 0 && (
              <div className={s.mbar}>
                <i style={{ width: `${Math.max(6, pct(nx.have, nx.min))}%` }} />
                <span>
                  {fill(nx.unit === "days" ? t.daysProgress : t.xpProgress, {
                    n: nx.have.toLocaleString("es-MX"),
                    min: nx.min.toLocaleString("es-MX"),
                  })}
                </span>
              </div>
            )}
            <ul className={s.badges}>
              {m.row.map((b) => (
                <li key={b.code} className={`${s.badge} ${b.state === "on" ? s.badgeOn : b.state === "next" ? s.badgeNext : s.badgeOff}`} title={b.name}>
                  <span aria-hidden>{MEDAL_ICON[b.code] ?? "🏅"}</span>
                  <span className={s.srOnly}>{`${b.name}, ${b.state === "on" ? t.earned : b.state === "next" ? t.nextMedal : t.locked}`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
