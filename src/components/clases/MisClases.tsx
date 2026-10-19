// Mis clases (/app/clases), student side, per mis-clases-mockup.html: the cyan slanted header, then either the
// class view (next live class, class tasks, the group and the coach's comments) or the "no class yet" view
// (the invitation card and "Mientras tanto"). The page picks the view from the data; only the countdown and
// the calendar link run in the browser.
import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ThemeKey } from "@/lib/themes";
import { CLASS_TZ, type ClassCard, type ClassTask, type Due, type Feedback, type MyClassData, type NextSession, type NoClassData } from "@/lib/my-classes";
import { CalendarLink, Countdown } from "./Live";
import s from "./mis-clases.module.css";

type T = Dictionary["misClases"];
type U = Dictionary["mycourses"];
const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const NAME: Record<ThemeKey, string> = {
  celstv: "CelsTV",
  celsbsns: "CelsBSNS",
  celsus: "CelsUS",
  celsglobal: "CelsGLOBAL",
};
const CHIP: Record<ThemeKey, string> = {
  celstv: "📺",
  celsbsns: "💼",
  celsus: "🇺🇸",
  celsglobal: "📄",
};
/** Avatar colors for classmates (dark enough for white initials). */
const MATE = ["#D6006A", "#B45309", "#0F766E", "#6B3FE0"];
/** WhatsApp 449 497 5359 (the number on the site footers), in wa.me form so the message can be prefilled. */
const WHATSAPP = "https://wa.me/524494975359";

export type Locale = { lang: "es" | "en"; locale: string };

export function Page({ t, children }: { t: T; children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

/** The dotted trail with its stamp, between sections (as on Progreso). */
function Trail({ id, from, to, emoji, d }: { id: string; from: string; to: string; emoji: string; d: string }) {
  return (
    <div className={s.trail} aria-hidden>
      <svg viewBox="0 0 1240 96" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" stopColor={from} stopOpacity="0" />
            <stop offset=".3" stopColor={from} />
            <stop offset=".7" stopColor={to} />
            <stop offset="1" stopColor={to} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className={s.stamp} style={{ "--sc": from } as React.CSSProperties}>
        {emoji}
      </span>
    </div>
  );
}

// ---------- With a class ----------

function NextClass({ t, n, loc }: { t: T; n: NextSession; loc: Locale }) {
  const at = new Date(n.at);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc.locale, { timeZone: CLASS_TZ, ...o }).format(at);
  const month = part({ month: "short" }).replace(".", "").toLocaleUpperCase(loc.locale);
  const weekday = part({ weekday: "long" });
  const time = part({ hour: "numeric", minute: "2-digit" });
  const meta = [`${time} (${t.tzLabel})`, n.durationMin ? fill(t.minutes, { n: n.durationMin }) : null, n.teacher ? fill(t.withTeacher, { name: n.teacher }) : null].filter(Boolean).join(" · ");
  return (
    <section className={`${s.sec} ${s.first}`} aria-labelledby="proxima-clase">
      <div className={s.wrap}>
        <div className={s.live}>
          <div className={s.liveIn}>
            <div className={s.cal} aria-hidden>
              <div className={s.calM}>{month}</div>
              <div className={s.calD}>{part({ day: "numeric" })}</div>
              <div className={s.calW}>{weekday.charAt(0).toLocaleUpperCase(loc.locale) + weekday.slice(1)}</div>
            </div>
            <div className={s.liveMain}>
              <p className={s.liveKick}>
                <i aria-hidden />
                {t.nextKick}
              </p>
              <h2 id="proxima-clase" className={s.liveH}>
                {n.className}
              </h2>
              <p className={s.liveMeta}>
                <span className={s.srOnly}>{part({ weekday: "long", day: "numeric", month: "long" })}, </span>
                {meta}
              </p>
            </div>
            <Countdown
              className={s.count}
              at={n.at}
              now={Date.now()}
              labels={{
                days: t.days,
                hours: t.hours,
                mins: t.mins,
                aria: t.countdownLabel,
              }}
            />
            <div className={s.acts}>
              {n.meetingUrl && (
                <a className={`${s.btn} ${s.btnY}`} href={n.meetingUrl} target="_blank" rel="noopener noreferrer">
                  {t.join} <span aria-hidden>→</span>
                </a>
              )}
              <CalendarLink className={`${s.btn} ${s.btnGh}`} id={n.classId} at={n.at} durationMin={n.durationMin} title={n.className} description={t.calendarDesc} url={n.meetingUrl}>
                <span aria-hidden>📅</span> {t.calendar}
              </CalendarLink>
            </div>
            <svg className={s.deco} viewBox="0 0 24 24" aria-hidden>
              <path d="M3 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM17 10l4-3v10l-4-3z" fill="#fff" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

const TONE: Record<Due["kind"], string> = {
  done: s.tOk,
  late: s.tHot,
  today: s.tHot,
  on: s.tHot,
  in: s.tSoon,
  none: s.tNone,
};

function dueText(t: T, due: Due, loc: Locale) {
  const day = (at: string) =>
    new Intl.DateTimeFormat(loc.locale, {
      timeZone: CLASS_TZ,
      weekday: "long",
    }).format(new Date(at));
  switch (due.kind) {
    case "done":
      return `✓ ${t.delivered}`;
    case "late":
      return `⏰ ${fill(t.dueLate, { day: day(due.at) })}`;
    case "today":
      return `⏰ ${t.dueToday}`;
    case "on":
      return `⏰ ${fill(t.dueOn, { day: day(due.at) })}`;
    case "in":
      return `📅 ${fill(t.dueIn, { n: due.days })}`;
    default:
      return null;
  }
}

function Task({ t, u, task, loc }: { t: T; u: U; task: ClassTask; loc: Locale }) {
  const kick = `${NAME[task.brand]} · ${task.unit ? `${u.unit[task.brand]} ${task.unit}` : task.courseTitle}`.toLocaleUpperCase(loc.locale);
  const chip = dueText(t, task.due, loc);
  return (
    <li className={`${s.task} ${TONE[task.due.kind]} ${task.done ? s.done : ""}`}>
      <div className={s.cv}>
        {task.cover && <Image src={task.cover} alt="" fill sizes="(max-width: 760px) 100vw, 200px" loading="lazy" />}
        <span>{t.taskBadge}</span>
      </div>
      <div className={s.taskMain}>
        <p className={s.k}>{kick}</p>
        <h3 className={s.taskH}>{task.title}</h3>
        {task.note && (
          <p className={s.note}>
            <span className={s.av} aria-hidden>
              {task.author?.initials ?? "P"}
            </span>
            <span>
              {task.author?.name && <b>{task.author.name}: </b>}“{task.note}”
            </span>
          </p>
        )}
      </div>
      <div className={s.side}>
        {chip ? <span className={s.due}>{chip}</span> : <span />}
        <Link className={s.go} href={task.href} aria-label={`${task.done ? t.review : t.startTask}: ${task.title}`}>
          {task.done ? (
            t.review
          ) : (
            <>
              {t.startTask} <span aria-hidden>→</span>
            </>
          )}
        </Link>
      </div>
    </li>
  );
}

function Group({ t, c }: { t: T; c: ClassCard }) {
  const mates = c.mates ?? [];
  const shown = mates.slice(0, 4);
  const more = mates.length - shown.length;
  return (
    <div className={s.card}>
      <svg className={s.mark} viewBox="0 0 24 24" aria-hidden>
        <circle cx="9" cy="8" r="4" fill="#7B61FF" />
        <path d="M1 21c0-4 4-7 8-7s8 3 8 7z" fill="#7B61FF" />
        <circle cx="18" cy="9" r="3" fill="#00CCFE" />
      </svg>
      <h3 className={s.cardH}>{c.schedule ? `${c.name} · ${c.schedule}` : c.name}</h3>
      <div className={s.teacher}>
        <div className={s.ph} aria-hidden>
          {c.teacher?.name ? c.teacher.initials : "👩‍🏫"}
        </div>
        <div>
          <b>{c.teacher?.name ?? t.teacherSoon}</b>
          <span>{c.teacher?.name ? t.yourTeacher : t.teacherSoonSub}</span>
        </div>
      </div>
      {c.mates && (
        <div className={s.mates}>
          {shown.length > 0 && (
            <div className={s.stack} aria-hidden>
              {shown.map((m, i) => (
                <i key={m.id} style={{ background: MATE[i % MATE.length] }}>
                  {m.initials}
                </i>
              ))}
              {more > 0 && <i style={{ background: "#14112B" }}>+{more}</i>}
            </div>
          )}
          <span>{mates.length === 0 ? t.matesNone : mates.length === 1 ? t.mates1 : fill(t.mates, { n: mates.length })}</span>
        </div>
      )}
      {c.courses.length > 0 && (
        <ul className={s.cchips}>
          {c.courses.map((co) => (
            <li key={co.title}>
              <span aria-hidden>{CHIP[co.brand]}</span> {co.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ago(t: T, at: string | null) {
  if (!at) return null;
  const d = Math.floor((Date.now() - Date.parse(at)) / 864e5);
  return d <= 0 ? t.today : d === 1 ? t.yesterday : fill(t.daysAgo, { n: d });
}

function Coach({ t, items, loc }: { t: T; items: Feedback[]; loc: Locale }) {
  return (
    <div className={s.card}>
      <svg className={s.mark} viewBox="0 0 24 24" aria-hidden>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" fill="#00CCFE" />
      </svg>
      <h3 className={s.cardH}>{t.coachTitle}</h3>
      {items.map((f) => {
        const label = [f.week ? fill(t.week, { n: f.week }) : null, f.task.toLocaleUpperCase(loc.locale)].filter(Boolean).join(" · ");
        const when = ago(t, f.at);
        return f.status === "reviewed" ? (
          <div key={f.id} className={s.fb}>
            <div className={s.fbH}>
              <span>{label}</span>
              <em>{t.reviewed}</em>
            </div>
            {f.text && <p>“{f.text}”</p>}
            <div className={s.who}>
              <i aria-hidden />
              {[f.coach ?? t.yourCoach, when].filter(Boolean).join(" · ")}
            </div>
          </div>
        ) : (
          <div key={f.id} className={`${s.fb} ${s.fbWait}`}>
            <div className={s.fbH}>
              <span>{label}</span>
              <em>{t.withCoach}</em>
            </div>
            <p>{t.reviewing}</p>
          </div>
        );
      })}
    </div>
  );
}

export function WithClass({ t, u, data, loc }: { t: T; u: U; data: MyClassData; loc: Locale }) {
  return (
    <Page t={t}>
      {data.next ? <NextClass t={t} n={data.next} loc={loc} /> : <div className={s.noNext} />}

      <section className={s.sec} aria-labelledby="tareas">
        <div className={s.wrap}>
          <Trail id="tg1" from="#FFB020" to="#E8137B" emoji="📝" d="M0,60 C180,10 360,90 560,48 M680,48 C880,10 1060,86 1240,40" />
          <p className={s.eyebrow} style={{ color: "#B5005A" }}>
            {t.tasksEyebrow}
          </p>
          <h2 id="tareas" className={s.secH}>
            {t.tasksTitle}
          </h2>
          {data.tasks.length ? (
            <ul className={s.tasks}>
              {data.tasks.map((task) => (
                <Task key={task.id} t={t} u={u} task={task} loc={loc} />
              ))}
            </ul>
          ) : (
            <p className={s.none}>{t.noTasks}</p>
          )}
        </div>
      </section>

      <section className={s.sec} aria-labelledby="grupo">
        <div className={s.wrap}>
          <Trail id="tg2" from="#00CCFE" to="#7B61FF" emoji="👥" d="M0,40 C200,90 380,10 560,50 M680,50 C860,90 1040,10 1240,56" />
          <p className={s.eyebrow}>{t.groupEyebrow}</p>
          <h2 id="grupo" className={s.secH}>
            {t.groupTitle}
          </h2>
          <div className={`${s.duo} ${data.feedback.length ? "" : s.solo}`}>
            {data.classes.map((c) => (
              <Group key={c.id} t={t} c={c} />
            ))}
            {data.feedback.length > 0 && <Coach t={t} items={data.feedback} loc={loc} />}
          </div>
        </div>
      </section>
      <div className={s.footSpace} />
    </Page>
  );
}

// ---------- No class yet ----------

function Illustration({ label }: { label: string }) {
  return (
    <svg className={s.ill} viewBox="0 0 420 320" role="img" aria-label={label}>
      <defs>
        <linearGradient id="il1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#5E1A63" />
          <stop offset="1" stopColor="#1C0E28" />
        </linearGradient>
        <linearGradient id="il2" x1="0" x2="1">
          <stop offset="0" stopColor="#00CCFE" />
          <stop offset=".5" stopColor="#E8137B" />
          <stop offset="1" stopColor="#FFB020" />
        </linearGradient>
      </defs>
      <circle cx="210" cy="170" r="140" fill="#F2F7FF" />
      <rect x="70" y="70" width="280" height="180" rx="26" fill="url(#il1)" />
      <rect x="66" y="66" width="288" height="188" rx="30" fill="none" stroke="url(#il2)" strokeWidth="4" />
      <rect x="92" y="92" width="114" height="66" rx="14" fill="#2D1640" />
      <circle cx="149" cy="118" r="13" fill="#FF8BC4" />
      <path d="M127 150c0-12 10-18 22-18s22 6 22 18z" fill="#FF8BC4" />
      <rect x="214" y="92" width="114" height="66" rx="14" fill="#2D1640" />
      <circle cx="271" cy="118" r="13" fill="#7FE3FF" />
      <path d="M249 150c0-12 10-18 22-18s22 6 22 18z" fill="#7FE3FF" />
      <rect x="92" y="166" width="114" height="66" rx="14" fill="#2D1640" />
      <circle cx="149" cy="192" r="13" fill="#FFE600" />
      <path d="M127 224c0-12 10-18 22-18s22 6 22 18z" fill="#FFE600" />
      <rect x="214" y="166" width="114" height="66" rx="14" fill="#2D1640" stroke="#fff" strokeWidth="2" strokeDasharray="5 6" />
      <path d="M271 189v22M260 200h22" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <g transform="translate(300 40) rotate(8)">
        <g>
          <rect x="2" y="10" width="96" height="50" rx="16" fill="#14112B" opacity=".08" />
          <rect width="96" height="50" rx="16" fill="#fff" />
          <path d="M20 50l-6 14 18-14z" fill="#fff" />
        </g>
        <text x="48" y="32" textAnchor="middle" fontSize="18" fontWeight="800" fill="#D6006A" fontFamily="inherit">
          Hello!
        </text>
      </g>
      <g transform="translate(18 214) rotate(-8)">
        <rect width="88" height="46" rx="16" fill="#14112B" />
        <text x="44" y="30" textAnchor="middle" fontSize="17" fontWeight="800" fill="#FFE600" fontFamily="inherit">
          ¡Hola!
        </text>
      </g>
    </svg>
  );
}

function Tile({ href, tone, icon, big, title, text, go }: { href: string; tone: string; icon: string; big?: string; title: string; text: string; go: string }) {
  return (
    <li>
      <Link className={`${s.mw} ${tone}`} href={href}>
        <span className={s.big} aria-hidden>
          {big ?? icon}
        </span>
        <span className={s.ic} aria-hidden>
          {icon}
        </span>
        <b>{title}</b>
        <span className={s.mwText}>{text}</span>
        <span className={s.a}>
          {go} <span aria-hidden>→</span>
        </span>
      </Link>
    </li>
  );
}

export function NoClass({ t, u, data }: { t: T; u: U; data: NoClassData }) {
  const r = data.resume;
  return (
    <Page t={t}>
      <section className={`${s.sec} ${s.first}`} aria-labelledby="sin-clase">
        <div className={s.wrap}>
          <div className={s.empty}>
            <Illustration label={t.illustration} />
            <div>
              <p className={s.eyebrow} style={{ color: "#B5005A" }}>
                {t.emptyEyebrow}
              </p>
              <h2 id="sin-clase" className={s.emptyH}>
                {t.emptyTitle}
              </h2>
              <p className={s.emptyP}>{t.emptyText}</p>
              <ul className={s.perks}>
                {t.perks.map((p, i) => (
                  <li key={p}>
                    <i
                      aria-hidden
                      style={{
                        background: ["#FFE8F2", "#E5F8FF", "#FFF4D6"][i],
                      }}
                    >
                      {["🎥", "📝", "💬"][i]}
                    </i>
                    {p}
                  </li>
                ))}
              </ul>
              <div className={s.eacts}>
                <a className={s.btn} href={`${WHATSAPP}?text=${encodeURIComponent(t.whatsappText)}`} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden>💬</span> {t.joinClass}
                </a>
                <Link className={s.link} href="/app/cursos">
                  {t.keepCourses} <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sec} aria-labelledby="mientras-tanto">
        <div className={s.wrap}>
          <Trail id="tg3" from="#21C7A8" to="#E8137B" emoji="✨" d="M0,58 C200,14 380,84 560,44 M680,44 C860,10 1040,80 1240,36" />
          <p className={s.eyebrow} style={{ color: "#0B6B60" }}>
            {t.meanEyebrow}
          </p>
          <h2 id="mientras-tanto" className={s.secH}>
            {t.meanTitle}
          </h2>
          <ul className={s.meanwhile}>
            {r ? (
              <Tile
                href={`/app/lecciones/${r.lessonId}`}
                tone={s.mwPink}
                icon="▶️"
                big="▶"
                title={r.started ? t.continueTitle : t.startTitle}
                text={r.unit ? `${NAME[r.brand]} · ${u.unit[r.brand]} ${r.unit}` : r.courseTitle}
                go={r.started ? t.continueGo : t.startGo}
              />
            ) : (
              <Tile href="/cursos" tone={s.mwPink} icon="▶️" big="▶" title={t.continueTitle} text={t.noCourse} go={t.noCourseGo} />
            )}
            {data.level ? (
              <Tile href="/app/progreso" tone={s.mwTeal} icon="🎯" title={t.resultTitle} text={fill(t.resultText, { level: data.level })} go={t.resultGo} />
            ) : (
              <Tile href="/evaluacion" tone={s.mwTeal} icon="🎯" title={t.levelTitle} text={t.levelText} go={t.levelGo} />
            )}
            <Tile href="/app/libros" tone={s.mwViolet} icon="📘" title={t.bookTitle} text={t.bookText} go={t.bookGo} />
          </ul>
        </div>
      </section>
      <div className={s.footSpace} />
    </Page>
  );
}
