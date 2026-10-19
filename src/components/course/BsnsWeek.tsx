// CelsBSNS week page v2 (celsbsns-semana-v2-mockup.html): the hero with the "Tu semana en breve" glass card, the
// 10-week route that overlaps it, "Tus pendientes", the 4-phase flow on a dotted spine, and the side column (coach,
// Capstone, resources). A server component: every action is a link, the hover effects are CSS.
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Activity, BsnsWeek as Data, Kind, Phase, Resource, Row } from "@/lib/bsns-week";
import { capstonePath } from "@/lib/bsns";
import { ResourcesSheet } from "./BsnsResourcesSheet";
import { montserrat } from "./bsns-fonts";
import s from "./bsns-week.module.css";

type T = Dictionary["bsnsWeek"];
const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");
/** WhatsApp 449 497 5359, as on Mis clases: there is no in-app messaging yet. */
const WHATSAPP = "https://wa.me/524494975359";

/** "Faltan <b>9 semanas</b> para…" → text with the bold part, without innerHTML. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(<b>.*?<\/b>)/).map((p, i) => (p.startsWith("<b>") ? <b key={i}>{p.slice(3, -4)}</b> : p))}</>;
}

function Icon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={cx(s.i, className)} aria-hidden="true" focusable="false">
      <use href={`#bw-${id}`} />
    </svg>
  );
}

/** The line-icon set (1.9 px stroke, round caps), once per page. */
function Sprite() {
  return (
    <svg className={s.sprite} aria-hidden="true" focusable="false">
      <symbol id="bw-clock" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </symbol>
      <symbol id="bw-send" viewBox="0 0 24 24">
        <path d="M21 3 10 14" />
        <path d="M21 3l-7 18-4-7-7-4z" />
      </symbol>
      <symbol id="bw-cal" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </symbol>
      <symbol id="bw-arrow" viewBox="0 0 24 24">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </symbol>
      <symbol id="bw-left" viewBox="0 0 24 24">
        <path d="M15 6l-6 6 6 6" />
      </symbol>
      <symbol id="bw-check" viewBox="0 0 24 24">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </symbol>
      <symbol id="bw-trophy" viewBox="0 0 24 24">
        <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
        <path d="M16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3M12 13v4M8 21h8M9 17h6" />
      </symbol>
      <symbol id="bw-route" viewBox="0 0 24 24">
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
      </symbol>
      <symbol id="bw-spark" viewBox="0 0 24 24">
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      </symbol>
      <symbol id="bw-compass" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </symbol>
      <symbol id="bw-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </symbol>
      <symbol id="bw-pen" viewBox="0 0 24 24">
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="M13.5 6.5l4 4" />
      </symbol>
      <symbol id="bw-chart" viewBox="0 0 24 24">
        <path d="M4 20V10M10 20V5M16 20v-7M22 20H2" />
      </symbol>
      <symbol id="bw-doc" viewBox="0 0 24 24">
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h4" />
      </symbol>
      <symbol id="bw-book" viewBox="0 0 24 24">
        <path d="M3 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" />
      </symbol>
      <symbol id="bw-mail" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M4 7l8 6 8-6" />
      </symbol>
      <symbol id="bw-video" viewBox="0 0 24 24">
        <rect x="3" y="6" width="13" height="12" rx="2.5" />
        <path d="M16 10l5-3v10l-5-3z" />
      </symbol>
      <symbol id="bw-mic" viewBox="0 0 24 24">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </symbol>
      <symbol id="bw-chat" viewBox="0 0 24 24">
        <path d="M4 5h16v11H9l-5 4z" />
      </symbol>
      <symbol id="bw-list" viewBox="0 0 24 24">
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4.5" cy="6" r="1" />
        <circle cx="4.5" cy="12" r="1" />
        <circle cx="4.5" cy="18" r="1" />
      </symbol>
      <symbol id="bw-head" viewBox="0 0 24 24">
        <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
        <rect x="3" y="14" width="4" height="6" rx="1.5" />
        <rect x="17" y="14" width="4" height="6" rx="1.5" />
      </symbol>
      <symbol id="bw-link" viewBox="0 0 24 24">
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </symbol>
      <symbol id="bw-play" viewBox="0 0 24 24">
        <path d="M8 5.5v13l11-6.5z" />
      </symbol>
      <symbol id="bw-grid" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
      </symbol>
      <symbol id="bw-user" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </symbol>
    </svg>
  );
}

const KIND_ICON: Record<Kind, string> = {
  syllabus: "doc",
  reading: "book",
  research: "search",
  writing: "mail",
  video_submission: "video",
  speaking: "mic",
  feedback: "chart",
  other: "doc",
};
const KIND_LABEL: Record<Kind, string> = {
  syllabus: "SYLLABUS",
  reading: "READING",
  research: "RESEARCH TASK",
  writing: "WRITING TASK",
  video_submission: "VIDEO SUBMISSION",
  speaking: "SPEAKING PRACTICE",
  feedback: "FEEDBACK & PROGRESS",
  other: "ACTIVITY",
};
const PHASE_ICON: Record<Phase["key"], string> = {
  prep: "compass",
  research: "search",
  produce: "pen",
  review: "chart",
};
const PILL: Record<string, string> = {
  pending: s.pTodo,
  progress: s.pNow,
  done: s.pDone,
  reviewed: s.pDone,
  submitted: s.pCoach,
  coach: s.pCoach,
};

/** The card / row button label: [not started, started, done]. */
function ctaOf(t: T, a: Activity) {
  if (a.status === "reviewed") return t.reviewedCta;
  const set = t.cta[a.kind] ?? t.cta.other;
  return a.done ? set[2] : a.started ? set[1] : set[0];
}

function rowTitle(t: T, r: Row, videoCount: number) {
  if (r.videos) return videoCount > 1 ? t.rowVideos : t.rowVideo;
  const a = r.activity!;
  if (a.kind === "syllabus") return t.rowSyllabus;
  const short = a.title.split(/:\s/)[0];
  return `${a.name}: “${short}”`;
}

function rowSub(t: T, r: Row, videoCount: number) {
  if (r.videos) return [t.rowKind.videos, videoCount > 1 ? fill(t.nVideos, { n: videoCount }) : null].filter(Boolean).join(" · ");
  const a = r.activity!;
  const kind =
    a.kind === "reading" || a.kind === "syllabus"
      ? t.rowKind.reading
      : a.kind === "feedback"
        ? t.rowKind.feedback
        : a.kind === "other"
          ? t.rowKind.other
          : t.rowKind.submit;
  return [kind, a.time].filter(Boolean).join(" · ");
}

function DueText({ t, r, now }: { t: T; r: Row; now: boolean }) {
  if (r.done) return <span className={cx(s.due, s.dueOk)}>{t.dueDone}</span>;
  if (r.due) {
    if (r.due.days === 0) return <span className={cx(s.due, s.dueToday)}>{t.dueToday}</span>;
    if (r.due.days < 0) return <span className={cx(s.due, s.dueSoon)}>{fill(t.duePast, { date: r.due.label })}</span>;
    return <span className={cx(s.due, r.due.days <= 2 && s.dueSoon)}>{fill(t.dueOn, { date: r.due.label })}</span>;
  }
  if (now) return <span className={cx(s.due, s.dueToday)}>{t.dueToday}</span>;
  return <span className={s.due} />;
}

function nextWhat(t: T, r: Row) {
  if (r.videos) return t.next.videos;
  const a = r.activity!;
  if (a.kind === "reading" && a.started) return t.next.readingOn;
  return t.next[a.kind] ?? t.next.other;
}

function Card({ t, a, current }: { t: T; a: Activity; current: boolean }) {
  const fields: [string, string][] = [];
  if (a.kind === "syllabus") fields.push([t.f.what, t.syllabusWhat]);
  else if (a.goal) fields.push([t.f.goal, a.goal]);
  if (a.time) fields.push([t.f.time, a.time]);
  if (a.kind === "research") fields.push([t.f.deliver, t.researchDeliver]);
  if (a.kind === "writing" || a.kind === "video_submission") fields.push([t.f.review, t.coachReview]);
  if (a.kind === "speaking") fields.push([t.f.format, t.speakingFormat]);
  if (a.due) fields.push([t.f.date, a.due.label.charAt(0).toUpperCase() + a.due.label.slice(1)]);
  return (
    <article className={cx(s.card, current && s.ccur)}>
      <div className={s.ct}>
        <span className={s.ico}>
          <Icon id={KIND_ICON[a.kind]} />
        </span>
        <span className={s.type}>
          {KIND_LABEL[a.kind]}
          {a.subtype && (
            <>
              <br />
              {a.subtype}
            </>
          )}
        </span>
        <span className={cx(s.pill, PILL[a.status])}>{t.pill[a.status]}</span>
      </div>
      <h4>{a.title}</h4>
      {fields.length > 0 && (
        <dl className={s.fields}>
          {fields.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Link prefetch={false} href={a.href} className={cx(s.btn, current ? s.btnP : s.btnS)}>
        {ctaOf(t, a)}
        {current && <Icon id="arrow" />}
      </Link>
    </article>
  );
}

function ResourceRow({ t, r, lang }: { t: T; r: Resource; lang: "es" | "en" }) {
  const icon = r.tag === "pdf" ? "doc" : r.tag === "list" ? "list" : r.tag === "audio" ? "head" : r.tag === "video" ? "video" : "link";
  const label = lang === "es" ? r.label.replace(/^Course Dictionary/i, t.dictionary) : r.label;
  const inner = (
    <>
      <span className={s.ico} aria-hidden="true">
        <Icon id={icon} />
      </span>
      {label}
      <span className={s.tag}>{t.resTag[r.tag]}</span>
    </>
  );
  return r.external ? (
    <a className={s.resRow} href={r.href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link prefetch={false} className={s.resRow} href={r.href}>
      {inner}
    </Link>
  );
}

export function BsnsWeek({ t, d, lang }: { t: T; d: Data; lang: "es" | "en" }) {
  const left = 10 - d.currentWeek;
  const videoCount = d.phases.find((p) => p.key === "prep")?.videos.length ?? 0;
  const cur = d.current;
  const curActivity = cur?.activity ?? null;
  const pct = d.allRows ? d.doneRows / d.allRows : 0;
  const greet =
    d.doneRows === 0 ? t.greet.start : d.doneRows >= d.allRows ? t.greet.done : pct <= 3 / 8 ? t.greet.good : pct < 7 / 8 ? t.greet.great : t.greet.almost;
  const curLabel = cur ? (cur.videos ? (videoCount > 1 ? t.rowVideos : t.rowVideo) : rowTitle(t, cur, videoCount)) : null;
  const curCta = cur ? (cur.videos ? t.watch : ctaOf(t, curActivity!)) : null;
  const message = fill(t.whatsapp, { name: d.firstName ?? t.student, n: d.n });
  const capNode = d.route[d.route.length - 1];

  return (
    <div className={cx(s.page, montserrat.variable)}>
      <Sprite />
      <header className={s.hero}>
        <div className={s.wrap}>
          <div className={s.htop}>
            <Link prefetch={false} className={s.back} href="/app/cursos">
              <span>
                <Icon id="left" />
              </span>
              {t.back}
            </Link>
            <Link prefetch={false} className={s.capbtn} href={capstonePath(d.slug)}>
              <span className={s.ct2} aria-hidden="true">
                <Icon id="trophy" />
              </span>
              <span>
                <b>{t.myCapstone}</b>
                <small>{fill(t.partOf, { n: d.currentWeek })}</small>
              </span>
              <Icon id="arrow" />
            </Link>
            <div className={s.logo}>
              <i aria-hidden="true" />
              CELS<span>BSNS</span>
            </div>
          </div>
          <div className={s.hgrid}>
            <div>
              <div className={s.kicks}>
                <p className={s.kick}>
                  <b aria-hidden="true">{d.n}</b>
                  {fill(t.kicker, { n: d.n, total: d.total })}
                </p>
                {d.preview && <p className={cx(s.kick, s.prev)}>{t.preview}</p>}
              </div>
              <h1>
                {d.title[0]} {d.title[1] && <em>{d.title[1]}</em>}
              </h1>
              <p className={s.obj}>{d.n === 1 ? t.intro1 : fill(t.intro, { theme: t.themes[d.n - 1] ?? d.topic })}</p>
            </div>
            <div className={s.stage}>
              <span className={s.layer2} aria-hidden="true" />
              <span className={s.layer} aria-hidden="true" />
              <section className={s.glass} aria-label={t.brief}>
                <p className={s.lab}>
                  <Icon id="spark" />
                  {t.brief}
                </p>
                <ul className={s.gfacts}>
                  <li>
                    <span className={s.gt}>
                      <Icon id="clock" />
                    </span>
                    <div>
                      <b>{fill(t.hours, { n: d.hours })}</b>
                      <span className={s.sub}>{t.hoursSub}</span>
                    </div>
                  </li>
                  <li>
                    <span className={s.gt}>
                      <Icon id="send" />
                    </span>
                    <div>
                      <b>{d.deliverables === 1 ? t.deliverable1 : fill(t.deliverables, { n: d.deliverables })}</b>
                      <span className={s.sub}>{t.deliverablesSub}</span>
                    </div>
                  </li>
                  <li>
                    <span className={s.gt}>
                      <Icon id="cal" />
                    </span>
                    <div>
                      <b>{d.nextDue ? d.nextDue.label.charAt(0).toUpperCase() + d.nextDue.label.slice(1) : t.noDue}</b>
                      <span className={s.sub}>{d.nextDue ? t.dueSub : t.noDueSub}</span>
                    </div>
                  </li>
                </ul>
                <div className={s.gnext}>
                  {cur ? (
                    <>
                      <small>{cur.started || d.doneRows > 0 ? t.resume : t.startHere}</small>
                      <p>{curLabel}</p>
                      <Link prefetch={false} className={cx(s.btn, s.btnW)} href={cur.href}>
                        {curCta}
                        <Icon id="arrow" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <small>{t.allDone}</small>
                      <p>{t.allDoneText}</p>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </header>

      <div className={s.outer}>
        <section className={s.routecard} aria-labelledby="bw-route">
          <div className={s.rhead}>
            <h2 id="bw-route">
              <span className={s.ti}>
                <Icon id="route" />
              </span>
              {t.routeTitle}
            </h2>
            <p className={s.goal}>
              <Icon id="trophy" />
              <span>
                <Rich text={left > 1 ? fill(t.left, { n: left }) : left === 1 ? t.left1 : t.leftNone} />
              </span>
            </p>
          </div>
          <ol className={s.route} style={{ "--fill": d.routeFill } as React.CSSProperties}>
            {d.route.map((r) => {
              const cap = r.n === d.route.length;
              const state = r.done ? t.nodeDone : r.current ? t.nodeCurrent : null;
              return (
                <li key={r.n}>
                  <Link
                    prefetch={false}
                    href={r.href}
                    className={cx(r.current && s.cur, r.done && s.done, cap && !r.current && s.capw, r.viewing && !r.current && s.view)}
                    aria-current={r.current ? "step" : undefined}
                    aria-label={[
                      fill(t.nodeLabel, {
                        n: r.n,
                        topic: cap ? `${t.capstone} · ${r.topic}` : r.topic,
                      }),
                      state,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  >
                    {r.current && (
                      <span className={s.here} aria-hidden="true">
                        {t.here}
                      </span>
                    )}
                    <span className={s.dot} aria-hidden="true">
                      <i>{r.done ? <Icon id="check" /> : cap && !r.current ? <Icon id="trophy" /> : r.n}</i>
                    </span>
                    <b aria-hidden="true">{fill(t.sem, { n: r.n })}</b>
                    <small aria-hidden="true">{r.topic}</small>
                    {cap && (
                      <small className={s.capOnly} aria-hidden="true">
                        {t.capstone}
                      </small>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className={s.rnow}>
            <b>
              {fill(t.rnow, {
                n: d.currentWeek,
                topic: d.route[d.currentWeek - 1]?.topic ?? "",
              })}
            </b>
            <span>{capNode && t.rnowCap}</span>
          </div>
          <p className={s.rfoot}>
            <Icon id="spark" />
            <span>
              <Rich text={t.routeFoot} />
            </span>
          </p>
        </section>

        <div className={s.main}>
          <div>
            <section aria-labelledby="bw-pend">
              <div className={s.secH}>
                <h2 id="bw-pend">{t.pendTitle}</h2>
                {d.nextDue && (
                  <span className={s.chip}>
                    <Icon id="cal" />
                    {fill(t.dueChip, { date: d.nextDue.label })}
                  </span>
                )}
              </div>
              <div className={s.pend}>
                <div className={s.phead}>
                  <div
                    className={s.ring}
                    role="img"
                    aria-label={fill(t.ringLabel, {
                      n: d.doneRows,
                      total: d.allRows,
                    })}
                    style={{ "--p": `${pct * 100}%` } as React.CSSProperties}
                  >
                    <b aria-hidden="true">
                      {d.doneRows}/{d.allRows}
                    </b>
                  </div>
                  <div>
                    <h3>{d.firstName ? `${greet}, ${d.firstName}` : greet}</h3>
                    <p>
                      {cur
                        ? `${fill(t.progressLine, { n: d.doneRows, total: d.allRows })} ${fill(t.nextLine, { what: nextWhat(t, cur) })}`
                        : fill(t.doneLine, { total: d.allRows })}
                    </p>
                  </div>
                </div>
                <ul className={s.tasks}>
                  {d.rows.map((r) => {
                    const now = r === cur;
                    const label = r.videos
                      ? r.done
                        ? t.again
                        : now
                          ? t.continue
                          : t.watch
                      : r.done
                        ? r.activity!.kind === "syllabus" || r.activity!.kind === "reading"
                          ? t.open
                          : ctaOf(t, r.activity!)
                        : now
                          ? t.continue
                          : r.started
                            ? t.continue
                            : t.start;
                    return (
                      <li key={r.key} className={cx(s.task, r.done && s.tdone, now && s.tnow)}>
                        <span className={s.chk} aria-hidden="true">
                          {r.done && <Icon id="check" />}
                        </span>
                        <div className={s.tt}>
                          <b>{rowTitle(t, r, videoCount)}</b>
                          <span>{rowSub(t, r, videoCount)}</span>
                        </div>
                        <DueText t={t} r={r} now={now} />
                        <Link prefetch={false} className={cx(s.btn, now ? s.btnP : s.btnS)} href={r.href}>
                          {label}
                          {now && <Icon id="arrow" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <div className={s.flow}>
              {d.phases.map((p, i) => (
                <section key={p.key} className={s.phase} aria-labelledby={`bw-ph-${p.key}`}>
                  <div className={s.ph}>
                    <span className={cx(s.pnode, p.done && s.pdone)} aria-hidden="true">
                      <Icon id={PHASE_ICON[p.key]} />
                    </span>
                    <div>
                      <small>{fill(t.steps, { n: i + 1 })}</small>
                      <h3 id={`bw-ph-${p.key}`}>{t.phase[p.key][0]}</h3>
                    </div>
                    <p>{t.phase[p.key][1]}</p>
                  </div>
                  {p.videos.length > 0 && (
                    <ul className={s.vids}>
                      {p.videos.map((v, j) => {
                        const vNow = !!cur?.videos && !v.done && p.videos.find((x) => !x.done) === v;
                        return (
                          <li key={v.id} className={cx(s.vrow, vNow && s.vcur)}>
                            <span className={s.thumb} aria-hidden="true">
                              <Icon id="play" />
                            </span>
                            <div>
                              <b>{p.videos.length > 1 ? fill(t.videoN, { n: j + 1 }) : fill(t.videoOf, { n: d.n })}</b>
                              <span className={s.meta}>
                                {v.title}
                                {v.done && (
                                  <>
                                    {" · "}
                                    <em>{t.watched}</em>
                                  </>
                                )}
                              </span>
                            </div>
                            <Link prefetch={false} className={cx(s.btn, vNow ? s.btnP : s.btnS)} href={v.href}>
                              {v.done ? t.again : t.watch}
                              {vNow && <Icon id="arrow" />}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {p.cards.length > 0 && (
                    <div className={s.cards}>
                      {p.cards.map((a) => (
                        <Card key={a.id} t={t} a={a} current={curActivity?.id === a.id} />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>

          <aside className={s.side}>
            <section className={s.box} aria-labelledby="bw-coach">
              <h3 id="bw-coach">{t.coachTitle}</h3>
              <div className={s.coach}>
                <span className={s.avatar} aria-hidden="true">
                  {d.coach ? d.coach.initials : <Icon id="user" />}
                </span>
                <div>
                  <b>{d.coach ? d.coach.name : t.coachDefault}</b>
                  <span className={s.sub}>{d.coach ? t.coachReplies : t.coachTeam}</span>
                </div>
              </div>
              <a className={cx(s.btn, s.btnS)} href={`${WHATSAPP}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                <Icon id="chat" />
                {t.message}
                <span className={s.srOnly}>{t.messageNew}</span>
              </a>
            </section>
            <section className={cx(s.box, s.cap)} aria-labelledby="bw-cap">
              <span className={s.trophy} aria-hidden="true">
                <Icon id="trophy" />
              </span>
              <h3 id="bw-cap">{t.capKicker}</h3>
              <h4>{t.capTitle}</h4>
              <p>{t.capText}</p>
              <ol className={s.ms}>
                {d.milestones.map((m) => (
                  <li key={m.part} className={cx(m.now && s.on)}>
                    <i aria-hidden="true" />
                    <div>
                      <span>
                        {fill(t.msPart, { n: m.part })} · {m.now ? t.msThisWeek : fill(t.msWeek, { n: m.week })}
                      </span>
                      {m.label}
                    </div>
                  </li>
                ))}
              </ol>
              <Link prefetch={false} className={cx(s.btn, s.btnW)} href={capstonePath(d.slug)}>
                <Icon id="trophy" />
                {t.openCapstone}
              </Link>
            </section>
            {(d.resources.length > 0 || d.courseResources.length > 0) && (
              <section className={cx(s.box, s.res)} aria-labelledby="bw-res">
                <h3 id="bw-res">{t.resWeek}</h3>
                {d.resources.length ? d.resources.map((r) => <ResourceRow key={r.id} t={t} r={r} lang={lang} />) : <p className={s.resNone}>{t.resNone}</p>}
                {d.courseResources.length > 0 && (
                  <ResourcesSheet open={t.resCourseBtn} title={t.resCourseTitle} close={t.close} icon={<Icon id="grid" />}>
                    {d.courseResources.map((r) => (
                      <ResourceRow key={r.id} t={t} r={r} lang={lang} />
                    ))}
                  </ResourcesSheet>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
