// Mis cursos (/app/cursos), per the approved mockup: cyan header with stats and filters, "Donde te
// quedaste", "Tus programas", the CelsGLOBAL group and the bookshelf. Server-rendered; the filter pills
// and the bookshelf are small client components.
import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { CourseStats } from "@/lib/learning";
import type { ThemeKey } from "@/lib/themes";
import { hrefOf, pctOf, stateOf, type MyCoursesData } from "@/lib/my-courses";
import { EmptyNote, FilterPills, FilterRoot, type Filter } from "./Filters";
import { Books } from "./Books";
import s from "./mis-cursos.module.css";

type T = Dictionary["misCursos"];
type U = Dictionary["mycourses"];
const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const NAME: Record<string, string> = { celstv: "CelsTV", celsbsns: "CelsBSNS", celsus: "CelsUS", celsglobal: "CelsGLOBAL" };
const KIT: Record<ThemeKey, string> = { celstv: s.kTv, celsbsns: s.kBs, celsus: s.kUs, celsglobal: s.kGl };
const COVER_SIZES = "(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 310px";

/** "CelsTV: English For Our Generation" → "English For Our Generation" on the cards. */
const shortTitle = (title: string) => title.replace(/^Cels\w+:\s*/, "");
const unitLine = (u: U, c: CourseStats) => fill(u.unitOf, { unit: u.unit[c.brand], x: Math.min(c.currentModule, Math.max(c.units, 1)), y: c.units });

const ICONS = {
  resume: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  interview: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  celsbsns: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  celstv: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M8 2l4 4 4-4M10 10.5v5l4-2.5z" />
    </>
  ),
};
function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <span className={s.ico} aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E9D29A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </svg>
    </span>
  );
}

function Cover({ src, children, framed }: { src: string | null; children?: React.ReactNode; framed?: boolean }) {
  return (
    <div className={s.cov}>
      {src &&
        (framed ? (
          // C-015: the whole artwork in a frame (never cropped); the glass panel sits beside it.
          <span className={s.frame}>
            <Image src={src} alt="" fill sizes={COVER_SIZES} loading="lazy" />
          </span>
        ) : (
          <Image src={src} alt="" fill sizes={COVER_SIZES} loading="lazy" />
        ))}
      {children}
    </div>
  );
}

/** A course card: cover, label, title, state line, unit progress, button. */
function CourseCard({
  t,
  u,
  c,
  kit,
  label,
  badge,
  blurb,
  icon,
  glass,
}: {
  t: T;
  u: U;
  c: CourseStats;
  kit: string;
  label: string;
  badge: React.ReactNode;
  blurb: boolean;
  icon?: keyof typeof ICONS;
  /** "Tus programas" (C-015): the logo whole on the left, a glass info panel on the right. */
  glass?: boolean;
}) {
  const state = stateOf(c);
  const pct = pctOf(c);
  const extra = blurb ? fill(t.blurb[c.brand], { n: c.units }) : "";
  const line = state === "done" ? t.completed : state === "progress" ? `${t.inProgress} · ${unitLine(u, c)}` : extra ? `${t.notStarted} · ${extra}` : t.notStarted;
  return (
    <li className={`${s.cc} ${kit}${glass ? ` ${s.glassCard}` : ""}`} data-state={state}>
      {glass && c.cover && (
        <span className={s.bgArt} aria-hidden>
          <Image src={c.cover} alt="" fill sizes="200px" loading="lazy" />
        </span>
      )}
      <Cover src={c.cover} framed={glass}>
        {badge}
        {icon && <Icon name={icon} />}
      </Cover>
      <div className={s.body}>
        <div className={s.lbl}>{label}</div>
        <h3 className={s.ccTitle}>{shortTitle(c.title)}</h3>
        <p className={s.st}>{line}</p>
        <div className={s.spacer} />
        {c.modules.length > 0 && (
          <>
            <div className={s.pr}>
              <span>{unitLine(u, c)}</span>
              <span>{pct}%</span>
            </div>
            <div className={s.mini} role="progressbar" aria-label={t.progressLabel} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
        <Link className={s.cta} href={hrefOf(c)} aria-label={`${state === "done" ? t.review : state === "progress" ? t.continue : t.start}: ${shortTitle(c.title)}`}>
          {state === "done" ? t.review : state === "progress" ? t.continue : t.start} →
        </Link>
      </div>
    </li>
  );
}

function stateBadge(t: T, c: CourseStats) {
  const st = stateOf(c);
  if (st === "new") return <span className={`${s.badge} ${s.badgeGo}`}>{t.badgeNew}</span>;
  return <span className={s.badge}>{st === "done" ? t.badgeDone : t.badgeProgress}</span>;
}

/** An AI tool included with CelsGLOBAL (Resume Review, Interview Prep). */
function ToolCard({ t, title, text, cta, href, cover, icon }: { t: T; title: string; text: string; cta: string; href: string; cover: string | null; icon: keyof typeof ICONS }) {
  return (
    <li className={`${s.cc} ${s.kGl}`} data-state="tool">
      <Cover src={cover}>
        <span className={`${s.badge} ${s.badgeInc}`}>{t.includedBadge}</span>
        <Icon name={icon} />
      </Cover>
      <div className={s.body}>
        <div className={s.lbl}>{t.aiTool}</div>
        <h3 className={s.ccTitle}>{title}</h3>
        <p className={s.st}>{text}</p>
        <div className={s.spacer} />
        <span className={s.ai}>{t.withAi}</span>
        <Link className={s.cta} href={href}>
          {cta} →
        </Link>
      </div>
    </li>
  );
}

function Resume({ t, u, r }: { t: T; u: U; r: NonNullable<MyCoursesData["resume"]> }) {
  const c = r.course;
  const pct = pctOf(c);
  const state = stateOf(c);
  const kick = `${NAME[c.brand]} · ${fill(u.unitOf, { unit: u.unit[c.brand], x: Math.min(Math.max(r.unit, 1), Math.max(c.units, 1)), y: c.units })}`.toLocaleUpperCase("es");
  const when = c.last ? (Date.now() - new Date(c.last.at).getTime() < 864e5 ? u.today : Date.now() - new Date(c.last.at).getTime() < 2 * 864e5 ? u.yesterday : fill(u.daysAgo, { n: Math.floor((Date.now() - new Date(c.last.at).getTime()) / 864e5) })) : t.notStarted;
  return (
    <div className={s.hideEmpty}>
      <div className={s.eyebrow}>{c.started ? t.keepLearning : t.startHere}</div>
      <h2 className={s.secTitle}>{t.whereYouLeft}</h2>
      <div className={s.feat} data-state={state}>
        <div className={s.featIn}>
          <div className={s.art}>{c.cover && <Image src={c.cover} alt={c.title} fill sizes="(max-width: 760px) 100vw, 600px" priority />}</div>
          <div>
            <div className={s.kick}>{kick}</div>
            <h3 className={s.featTitle}>{c.title}</h3>
            <p className={s.meta}>
              {when} · {r.next.part}
            </p>
            {r.parts.length > 0 && (
              <ul className={s.parts} aria-label={t.partsLabel}>
                {r.parts.map((p) => (
                  <li key={p.id} className={`${s.part} ${p.state === "done" ? s.partDone : p.state === "now" ? s.partNow : ""}`} aria-current={p.state === "now" ? "step" : undefined}>
                    {p.state === "done" ? "✓ " : p.state === "now" ? "▶ " : ""}
                    {p.name}
                  </li>
                ))}
                {r.moreParts > 0 && <li className={s.part}>+{r.moreParts}</li>}
              </ul>
            )}
            <div className={s.prow}>
              <div className={s.bar} role="progressbar" aria-label={t.progressLabel} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <span className={s.pct}>{pct}%</span>
            </div>
            <Link className={s.btn} href={`/app/lecciones/${r.next.id}`}>
              {c.started ? t.continue : t.start} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MisCursos({ t, u, data, initial }: { t: T; u: U; data: MyCoursesData; initial: Filter }) {
  const { counts, resume, standalone, global } = data;
  const g = global;
  const pkgCards = g ? (g.tools ? 2 : 0) + g.included.length : 0;
  return (
    <FilterRoot initial={initial} className={s.page}>
      <header className={s.head}>
        <div className={`${s.glow} ${s.glowPink}`} aria-hidden />
        <div className={`${s.glow} ${s.glowYellow}`} aria-hidden />
        <div className={s.wrap}>
          <div className={s.crumb}>{t.crumb}</div>
          <h1 className={s.title}>
            {t.titleA} <em>{t.titleB}</em>
          </h1>
          <div className={s.hrow}>
            <ul className={s.stats}>
              <li className={s.stat}>
                <b>{counts.courses}</b>
                <span>{t.statCourses}</span>
              </li>
              <li className={s.stat}>
                <b>{counts.inProgress}</b>
                <span>{t.statProgress}</span>
              </li>
              <li className={s.stat}>
                <b>{counts.books}</b>
                <span>{t.statBooks}</span>
              </li>
            </ul>
            <FilterPills className={s.filters} labels={t.filters} label={t.filtersLabel} />
          </div>
        </div>
      </header>

      <section className={`${s.sec} ${s.coursesSec}`}>
        <div className={s.wrap}>
          {resume && <Resume t={t} u={u} r={resume} />}

          {standalone.length > 0 && (
            <div className={`${s.group} ${s.hideEmpty}`}>
              <div className={s.ghead}>
                <h2 className={`${s.gtitle} ${s.dotViolet}`}>
                  <i aria-hidden />
                  {t.myPrograms} <small>{standalone.length === 1 ? t.program1 : fill(t.programsN, { n: standalone.length })}</small>
                </h2>
              </div>
              <ul className={`${s.cgrid} ${s.two}`}>
                {standalone.map((c) => (
                  <CourseCard key={c.id} t={t} u={u} c={c} kit={KIT[c.brand]} label={NAME[c.brand].toUpperCase()} badge={stateBadge(t, c)} blurb glass />
                ))}
              </ul>
            </div>
          )}

          {g && (
            <div className={`${s.group} ${s.hideEmpty}`}>
              <div className={s.ghead}>
                <h2 className={`${s.gtitle} ${s.dotGold}`}>
                  <i aria-hidden />
                  {t.globalTitle} <small>{t.globalSub}</small>
                </h2>
                <div className={s.route}>
                  {fill(t.monthOf, { n: g.month })}
                  {[1, 2, 3, 4, 5, 6].map((m) => (
                    <span key={m} className={m <= g.month ? s.routeOn : undefined} aria-hidden />
                  ))}
                </div>
              </div>
              {g.route.length > 0 && (
                <ul className={`${s.cgrid} ${s.four}`}>
                  {g.route.map(({ course, month }) => (
                    <CourseCard key={course.id} t={t} u={u} c={course} kit={s.kGl} label="CELSGLOBAL" badge={<span className={s.badge}>{fill(t.month, { n: month })}</span>} blurb={false} />
                  ))}
                </ul>
              )}
              {pkgCards > 0 && (
                <div className={`${s.pkg} ${s.hideEmpty}`}>
                  <div className={s.pkh}>
                    <span className={s.seal} aria-hidden>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E9D29A" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
                      </svg>
                    </span>
                    <div>
                      <h3 className={s.pkhTitle}>{t.included}</h3>
                      <p className={s.pkhSub}>{pkgCards === 1 ? t.includedSub1 : fill(t.includedSubN, { n: pkgCards })}</p>
                    </div>
                    <span className={s.tag}>{t.packageTag}</span>
                  </div>
                  <ul className={`${s.cgrid} ${s.four}`}>
                    {g.tools && (
                      <>
                        <ToolCard t={t} title={t.resumeTitle} text={t.resumeText} cta={t.resumeCta} href="/app/herramientas/resume" cover={g.resumeCover} icon="resume" />
                        <ToolCard t={t} title={t.interviewTitle} text={t.interviewText} cta={t.interviewCta} href="/app/herramientas/entrevista" cover={g.interviewCover} icon="interview" />
                      </>
                    )}
                    {g.included.map((c) => (
                      <CourseCard
                        key={c.id}
                        t={t}
                        u={u}
                        c={c}
                        kit={s.kGl}
                        label={`CELSGLOBAL · ${NAME[c.brand].toUpperCase()}`}
                        badge={<span className={`${s.badge} ${s.badgeInc}`}>{t.includedBadge}</span>}
                        blurb
                        icon={c.brand === "celstv" ? "celstv" : "celsbsns"}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <EmptyNote
        className={s.empty}
        counts={{ all: counts.courses + counts.books, progress: counts.progressItems, done: counts.doneItems, books: counts.books }}
        text={{ all: t.none, progress: t.emptyProgress, done: t.emptyDone }}
        browse={t.browse}
      />

      {data.books.length > 0 && <Books t={t} books={data.books} names={NAME} />}
    </FilterRoot>
  );
}
