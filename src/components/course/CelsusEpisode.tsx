"use client";

// CelsUS episode page (celsus-episodio-mockup.html v2): navy hero with the episode switcher and the gold seal,
// "Continúa donde te quedaste", the 6-part path as a timeline of cards with labeled buttons, and the side column
// (this week's questions, extra material, next episode). Big type and buttons: most students are 45 to 65.
import "./celsus-episode.css";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Episode, Part, UsRole } from "@/lib/course-page";
import { IconAudio, IconBook, IconCards, IconLive, IconPrinter, IconQuiz, IconReview, IconVideo, IconWriting } from "@/components/icons/celsus";
import { fill } from "./kit";

type T = Dictionary["us"];
export type UsExtra = { href: string; label: string; tag: string; icon: "video" | "writing" | "review" | "print-en" | "print-es"; external?: boolean };
export type UsTrack = "A" | "B" | "C" | null;

const PART_ICON: Record<UsRole, (p: { className?: string }) => React.ReactNode> = {
  video: IconVideo,
  cards: IconCards,
  book: IconBook,
  audio: IconAudio,
  live: IconLive,
  quiz: IconQuiz,
};
const PART_TILE: Record<UsRole, string> = { video: "#E8F0FB", cards: "#FFF4D6", book: "#FDE8EC", audio: "#E8F0FB", live: "#FFF4D6", quiz: "#FDE8EC" };
const EXTRA_TILE: Record<UsExtra["icon"], string> = { video: "#E8F0FB", writing: "#FFF4D6", review: "#FFF4D6", "print-en": "#FDE8EC", "print-es": "#E8F7EE" };

function ExtraIcon({ icon }: { icon: UsExtra["icon"] }) {
  if (icon === "video") return <IconVideo />;
  if (icon === "review") return <IconReview />;
  if (icon === "print-en") return <IconPrinter lang="EN" />;
  if (icon === "print-es") return <IconPrinter lang="ES" />;
  return <IconWriting />;
}

// useLayoutEffect warns on the server; this page renders there first.
const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

const STARS: [number, number, number, number][] = [
  [40, 40, 2, 0],
  [90, 70, 1.5, 1],
  [150, 30, 2, 2],
  [210, 90, 1.5, 0.5],
  [60, 140, 1.5, 1.5],
  [130, 170, 2, 2.5],
  [260, 40, 1.5, 3],
  [300, 120, 2, 0.8],
  [30, 230, 1.5, 2.2],
  [200, 220, 1.5, 1.2],
];

export function CelsusEpisode({
  t,
  episode,
  title,
  sub,
  courseHref,
  next,
  examHref,
  completionHref,
  extras,
  subs,
  episodes,
  questions,
  questionCount,
  questionsHref,
  track,
  trackHref,
  resumeMeta,
  xp,
}: {
  t: T;
  episode: Episode;
  title: string;
  sub: string;
  courseHref: string;
  next: { n: number; href: string; title: string } | null;
  examHref: string;
  completionHref: string;
  extras: UsExtra[];
  subs: Partial<Record<UsRole, string>>;
  episodes: { n: number; href: string; done: boolean }[];
  questions: { en: string; es: string; no: number | null }[];
  questionCount: number;
  questionsHref: string;
  track: UsTrack;
  trackHref: string;
  resumeMeta: { done: number; total: number; text: string } | null;
  xp: number;
}) {
  const parts = episode.parts;
  /** Track C doesn't need the quiz: it never blocks them, and shows as "not needed" until it is recorded. */
  const skipped = (p: Part) => track === "C" && p.role === "quiz" && !p.done;
  const done = parts.filter((p) => p.done).length;
  const complete = parts.length > 0 && done === parts.length;
  const current = complete ? null : (parts.find((p) => !p.done && !skipped(p)) ?? null);
  const total = parts.length;
  const role = (p: Part) => p.role!;
  const roleName = (p: Part) => fill(t.roles[role(p)], { n: episode.n });

  // The seal's ring fills to done/total once the page is on screen.
  const [ring, setRing] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRing(total ? done / total : 0));
    return () => cancelAnimationFrame(id);
  }, [done, total]);

  // The gold line runs from part 1's node to the current part's node (or the last done one).
  const listRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{ top: number; height: number } | null>(null);
  useIsoLayout(() => {
    const measure = () => {
      const list = listRef.current;
      if (!list) return;
      const nodes = [...list.querySelectorAll<HTMLElement>(".node")];
      const target = list.querySelector<HTMLElement>(".part.now .node") ?? [...list.querySelectorAll<HTMLElement>(".part.done .node")].pop();
      if (!nodes.length || !target) return setLine(null);
      const lr = list.getBoundingClientRect();
      const a = nodes[0].getBoundingClientRect();
      const b = target.getBoundingClientRect();
      setLine({ top: a.top + a.height / 2 - lr.top, height: Math.max(0, b.top - a.top) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [current?.id, done]);

  const C = 289;
  const trackName = track ? t.trackNames[track] : null;

  return (
    <div className="use">
      <header className="hero">
        <svg className="stars" viewBox="0 0 400 300" preserveAspectRatio="xMinYMin slice" aria-hidden fill="#FFE27A">
          {STARS.map(([cx, cy, r, d]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} style={{ animationDelay: `${d}s` }} />
          ))}
        </svg>
        <span className="glow" aria-hidden style={{ right: -140, top: -200, background: "rgba(242,194,48,.22)" }} />
        <span className="glow" aria-hidden style={{ left: "20%", bottom: -320, background: "rgba(200,16,46,.20)" }} />
        <span className="us" aria-hidden>
          US
        </span>
        <div className="wrap">
          <div className="htop">
            <Link className="back" href={courseHref}>
              <i aria-hidden>‹</i>
              {t.backCourses}
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
            <img className="logo" src="/brand/celsus.jpg" alt="CelsUS" width={100} height={40} />
          </div>
          <nav className="eps" aria-label={t.episodesNav}>
            {episodes.map((e) => (
              <Link key={e.n} href={e.href} className={e.n === episode.n ? "on" : ""} aria-current={e.n === episode.n ? "page" : undefined}>
                {e.done && (
                  <span className="ck" aria-label={t.pillDone}>
                    ✓
                  </span>
                )}
                {fill(t.pill, { n: e.n })}
              </Link>
            ))}
            <Link className="ex" href={examHref}>
              🎓 {t.finalExam}
            </Link>
          </nav>
          <div className="hgrid">
            <div>
              <p className="kick">{fill(t.kickerOf, { n: episode.n, total: episodes.length })}</p>
              <h1>{title}</h1>
              <p className="hsub">{sub}</p>
              <div className="chips">
                {t.chips.map((c) => (
                  <span key={c}>{c}</span>
                ))}
                {trackName && <span>🎯 {trackName}</span>}
              </div>
            </div>
            <div className="seal" role="img" aria-label={fill(t.sealLabel, { n: done, total })}>
              <svg viewBox="0 0 100 100" aria-hidden>
                <defs>
                  <linearGradient id="use-sg" x1="0" x2="1">
                    <stop offset="0" stopColor="#FFE27A" />
                    <stop offset="1" stopColor="#F2C230" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" />
                <circle
                  className="arc"
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="url(#use-sg)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - ring)}
                />
              </svg>
              <div className="in" aria-hidden>
                <b>
                  {done}/{total}
                </b>
                <span>{t.sealParts}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="main">
        <div>
          {current ? (
            <div className="cont">
              <div className="in">
                <div className="ic" aria-hidden>
                  {PART_ICON[role(current)]({})}
                </div>
                <div>
                  <p className="k">{done === 0 && !current.started ? t.start : t.resume}</p>
                  <h2>
                    {roleName(current)} · {fill(t.partOf, { n: parts.indexOf(current) + 1, total })}
                  </h2>
                  {resumeMeta && resumeMeta.total > 0 && (
                    <div className="bar" aria-hidden>
                      <i style={{ width: `${Math.max(4, Math.round((resumeMeta.done / resumeMeta.total) * 100))}%` }} />
                    </div>
                  )}
                  <p className="meta">{resumeMeta?.text ?? subs[role(current)]}</p>
                </div>
                <Link className="play" href={current.href}>
                  <i aria-hidden>▶</i>
                  {t.continue}
                </Link>
              </div>
            </div>
          ) : (
            <div className="cont">
              <div className="in">
                <div className="ic" aria-hidden>
                  🏅
                </div>
                <div>
                  <p className="k">{t.completedKicker}</p>
                  <h2>{t.completedTitle}</h2>
                  <p className="meta">{fill(t.partsXp, { n: done, total, xp })}</p>
                </div>
                <Link className="play" href={complete ? completionHref : courseHref}>
                  <i aria-hidden>▶</i>
                  {t.sealOpen}
                </Link>
              </div>
            </div>
          )}

          <div className="sech">
            <h2 id="use-journey">{t.journey}</h2>
            <span>{fill(t.partsXp, { n: done, total, xp })}</span>
          </div>
          <div className="journey" ref={listRef}>
            {line && <span className="fillline" aria-hidden style={{ top: line.top, height: line.height }} />}
            <ol className="plist" aria-labelledby="use-journey">
            {parts.map((p, i) => {
              const isNow = current?.id === p.id;
              const skip = skipped(p);
              const cls = p.done ? "done" : isNow ? "now" : "";
              return (
                <li key={p.id} style={{ animationDelay: `${i * 0.06}s` }} className={`part ${cls}`}>
                  <span className="node" aria-hidden>
                    {p.done ? "✓" : i + 1}
                  </span>
                  <div className="pi">
                    <span className="tile" aria-hidden style={{ ["--tb" as string]: PART_TILE[role(p)] }}>
                      {PART_ICON[role(p)]({})}
                    </span>
                    <div className="pt">
                      <p className="n">{fill(t.partKicker, { n: i + 1, type: t.types[role(p)] })}</p>
                      <h3>{roleName(p)}</h3>
                      <p>{skip ? t.quizNotForC : subs[role(p)]}</p>
                    </div>
                  </div>
                  <Link
                    href={p.href}
                    className={`st ${p.done ? "ok" : isNow ? "go" : skip ? "ok" : "todo"}`}
                    aria-label={`${roleName(p)}: ${p.done ? t.done : isNow ? t.continueBtn : skip ? t.notNeeded : t.startBtn}`}
                  >
                    {p.done ? (
                      <>
                        <em>✓ {t.done}</em>
                        {role(p) === "audio" ? t.againAudio : t.again}
                      </>
                    ) : isNow ? (
                      t.continueBtn
                    ) : skip ? (
                      <>
                        <em>{t.notNeeded}</em>
                        {t.seeWhy}
                      </>
                    ) : (
                      t.startBtn
                    )}
                  </Link>
                </li>
              );
            })}
            </ol>
          </div>
        </div>

        <aside className="side">
          {questions.length > 0 && (
            <section className="scard navyc" aria-labelledby="use-qs">
              <h2 id="use-qs">{t.weekQs}</h2>
              <ul className="qs">
                {questions.map((q, i) => (
                  <li className="q" key={i}>
                    <b>{q.no ?? "•"}</b>
                    <div>
                      <span lang="en">{q.en}</span>
                      {q.es && <em lang="es">{q.es}</em>}
                    </div>
                  </li>
                ))}
              </ul>
              <Link className="lnk" href={questionsHref}>
                {fill(t.seeAllQs, { n: questionCount })}
              </Link>
              <div className="trk">
                <span>{trackName ? `${t.yourExam}: ${trackName}` : t.noTrack}</span>
                <Link href={trackHref}>{trackName ? t.changeTrack : t.chooseTrack}</Link>
              </div>
            </section>
          )}
          {extras.length > 0 && (
            <section className="scard" aria-labelledby="use-extra">
              <h2 id="use-extra">{t.extra}</h2>
              <ul className="extra">
                {extras.map((x) => (
                  <li key={x.href + x.label}>
                    <a className="ex" href={x.href} {...(x.external ? { target: "_blank", rel: "noopener" } : {})}>
                      <span className="i" aria-hidden style={{ ["--tb" as string]: EXTRA_TILE[x.icon] }}>
                        <ExtraIcon icon={x.icon} />
                      </span>
                      <span className="et">
                        <b>{x.label}</b>
                        {x.tag && <small>{x.tag}</small>}
                      </span>
                      <span className="open" aria-hidden>
                        {t.open} ›
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {next ? (
            <section className="scard nextep">
              <span className="mark" aria-hidden>
                {next.n}
              </span>
              <p className="k">{t.nextKicker}</p>
              <h3>{next.title}</h3>
              <p>{fill(t.nextSub, { n: next.n })}</p>
              <Link className="go" href={next.href}>
                {fill(t.nextBtn, { n: next.n })}
              </Link>
            </section>
          ) : (
            <section className="scard nextep">
              <span className="mark" aria-hidden>
                🎓
              </span>
              <p className="k">{t.examKicker}</p>
              <h3>{t.examTitle}</h3>
              <p>{t.examSub}</p>
              <Link className="go" href={examHref}>
                {t.examBtn}
              </Link>
            </section>
          )}
          <p className="disc">{t.disclaimer}</p>
        </aside>
      </div>
    </div>
  );
}
