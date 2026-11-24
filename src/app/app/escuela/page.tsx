// C-050 "Mi escuela": the director's view of their school, landing-page style (mockup approved by Matt,
// 2026-11-23). Same data as C-049, read with the director's session (RLS: private.directs_org / directs_user).
// Every number comes from src/lib/class-insights.ts; a section whose rule finds nothing is left out.
// Sections: hero (greeting, summary, activity ring, KPIs) · this week's briefing · your locations · students who
// need you + stars of the week · locations side by side (+ a print stylesheet for "Download PDF").
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import {
  avatarColor,
  currentPosition,
  firstName,
  initials,
  lessonsDone,
  schoolInsights,
  type HardUnit,
  type LocationCard,
  type NeedsYou,
  type SchoolStudent,
  type Status,
  type StudentInsight,
} from "@/lib/class-insights";
import { Greeting, PrintButton, UpdatedAt } from "@/components/school/Client";

export const dynamic = "force-dynamic";

type T = Awaited<ReturnType<typeof getDictionary>>["t"]["school"];
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

// The CelsU palette (C-050). Text colors are the darker shades that pass 4.5:1; the bright ones are fills only.
const C = {
  ink: "#1E1A2E",
  sec: "#4A4360",
  muted: "#6B6482",
  line: "#ECE8F3",
  page: "#F7F5FB",
  magenta: "#F5178C",
  green: "#6DC067",
  blue: "#5B8DEF",
  yellow: "#FFC531",
  cyan: "#35C3F0",
  magentaText: "#B80F68",
  greenText: "#1F7A3A",
  greenStrong: "#1F8A4C",
  yellowText: "#7A5600",
  blueText: "#2457B8",
  grey: "#C9C2D9",
};
const STATUS_DOT: Record<Status, string> = { active: C.green, slowing: C.yellow, inactive: C.magenta, not_started: C.grey };
const BANDS = [
  "linear-gradient(120deg,#FDE3F0,#E3F7FD)",
  "linear-gradient(120deg,#FFF4D6,#E7F6E5)",
  "linear-gradient(120deg,#E3EEFF,#FDE3F0)",
  "linear-gradient(120deg,#E7F6E5,#E3F7FD)",
];
const courseColor = (slug: string | null, i: number) =>
  slug === "celstv-english-for-our-generation" ? C.magenta : slug === "english-for-business" ? C.blue : i % 2 ? C.green : C.cyan;

const focusRing = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#B80F68]";
const btnDark = `inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#1E1A2E] px-[22px] py-3.5 text-base font-black text-white transition hover:-translate-y-px ${focusRing}`;
const btnLight = `inline-flex min-h-[44px] items-center gap-2 rounded-[14px] border-2 border-[#E2DCEC] bg-white px-4 py-2.5 text-sm font-black text-[#1E1A2E] hover:border-[#C9C2D9] ${focusRing}`;
const studentHref = (classId: string, id: string) => `/app/clases/${classId}/estudiante/${id}`;

function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Avatar({ s, size, dot }: { s: StudentInsight; size: number; dot?: Status }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex flex-none items-center justify-center rounded-full font-black text-white"
      style={{ width: size, height: size, background: avatarColor(s.id), fontSize: Math.round(size * 0.36) }}
    >
      {initials(s.name)}
      {dot && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: STATUS_DOT[dot] }} />}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden="true" className="inline-block h-2.5 w-2.5 flex-none rounded-full" style={{ background: color }} />;
}

function SectionHead({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[26px] font-black leading-tight sm:text-[32px]">{title}</h2>
        <p className="m-0 text-base font-semibold text-[#4A4360]">{sub}</p>
      </div>
      {right}
    </div>
  );
}

/** "a, b and c" / "a, b y c". */
const listOf = (items: string[], and: string) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`);

export default async function SchoolPage() {
  const { t: all, lang } = await getDictionary();
  const t = all.school;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/escuela");
  if (viewer.role !== "director") notFound();
  const shell = (body: ReactNode) => (
    <div className="mx-auto max-w-[1200px]" style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif", color: C.ink }}>
      {body}
    </div>
  );
  if (!viewer.organizationId) return shell(<p className="rounded-[26px] border border-[#ECE8F3] bg-white p-6 font-bold">{t.noSchool}</p>);

  const s = await schoolInsights(supabase, viewer.organizationId, lang);
  if (!s.org) return shell(<p className="rounded-[26px] border border-[#ECE8F3] bg-white p-6 font-bold">{t.noSchool}</p>);
  const { org, cards, totals } = s;

  const locale = lang === "en" ? "en-US" : "es-MX";
  const now = new Date();
  const serverHour = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Mexico_City" })) % 24;
  const serverTime = now.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" });
  const me = firstName(viewer.displayName || viewer.user.email || "");
  const kicker = (cards.length === 1 ? fill(t.kickerOne, { org: org.name }) : fill(t.kicker, { org: org.name, n: cards.length })).toUpperCase();

  // Hero summary: fixed templates, each part only when its data exists.
  const top = s.stars[0];
  const summary = [
    top ? fill(t.sumStreak, { city: top.city, name: firstName(top.student.name), n: top.student.streak }) : null,
    s.away.length ? `${s.away.length === 1 ? t.sumAwayOne : fill(t.sumAway, { n: s.away.length })}${s.awayOnePerCity ? t.sumEachCity : ""}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  // Activity ring: green active · yellow 7–13 days · magenta 14+ days · grey not started.
  const n = Math.max(totals.students, 1);
  const deg = (k: number) => (k / n) * 360;
  const a1 = deg(totals.active);
  const a2 = a1 + deg(totals.slowing);
  const a3 = a2 + deg(totals.inactive);
  const ring = `conic-gradient(${C.green} 0 ${a1}deg, ${C.yellow} ${a1}deg ${a2}deg, ${C.magenta} ${a2}deg ${a3}deg, ${C.grey} ${a3}deg 360deg)`;
  const activePct = totals.students ? Math.round((totals.active / totals.students) * 100) : 0;

  const kpis = [
    { icon: "users", tint: "#E7F6E5", ink: C.greenText, value: `${totals.active}`, of: ` / ${totals.students}`, label: t.kpiActive, hint: t.kpiActiveHint },
    { icon: "chart", tint: "#E3EEFF", ink: C.blueText, value: `${totals.progress}%`, of: "", label: t.kpiProgress, hint: t.kpiProgressHint },
    { icon: "check", tint: "#FFF4D6", ink: C.yellowText, value: totals.quiz === null ? "—" : `${totals.quiz}%`, of: "", label: t.kpiQuiz, hint: t.kpiQuizHint },
    { icon: "alert", tint: "#FDE3F0", ink: C.magentaText, value: `${totals.attention}`, of: ` / ${totals.students}`, label: t.kpiAttention, hint: t.kpiAttentionHint },
  ];

  return shell(
    <>
      {/* The page ground behind the shell's content area (white when printed). */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[#F7F5FB] print:hidden" />
      <style>{PRINT_CSS}</style>

      {/* 1 + 2. Hero with the KPI strip */}
      <section
        className="relative -mx-4 overflow-hidden border-b border-[#ECE8F3] px-4 sm:mx-0 sm:rounded-[30px] sm:border"
        style={{
          background:
            "radial-gradient(900px 420px at 88% 10%, rgba(53,195,240,.22), transparent 60%), radial-gradient(700px 380px at 70% 95%, rgba(245,23,140,.14), transparent 60%), radial-gradient(600px 300px at 5% 0%, rgba(255,197,49,.20), transparent 60%), #FFFFFF",
        }}
        data-block="school-hero"
      >
        <div className="flex flex-wrap items-center gap-10 px-1 pb-10 pt-10 sm:px-6 sm:pt-14">
          <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-[18px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-black tracking-[.12em] text-[#B80F68]">{kicker}</span>
              <span className="text-[13px] font-bold text-[#6B6482]">
                <UpdatedAt template={t.updated} serverTime={serverTime} iso={now.toISOString()} locale={locale} />
              </span>
            </div>
            <h1 className="m-0 text-[36px] font-black leading-[1.06] tracking-[-.02em] sm:text-[48px] lg:text-[56px]">
              <Greeting serverHour={serverHour} name={me} g={{ morning: t.greetMorning, afternoon: t.greetAfternoon, evening: t.greetEvening }} />
              <br />
              <span style={{ color: C.greenText }}>{fill(t.headCount, { active: totals.active, total: totals.students })}</span>
              {t.headTail}
            </h1>
            {summary && <p className="m-0 max-w-[620px] text-lg font-semibold leading-relaxed text-[#4A4360] sm:text-[19px]">{summary}</p>}
            <div className="flex flex-wrap gap-3 pt-1.5 print:hidden">
              <a href="#needs-you" className={btnDark}>
                {t.ctaNeeds} <Arrow />
              </a>
              <a href="#compare" className={`${btnLight} min-h-[48px] rounded-2xl px-[22px] text-base`}>
                {t.ctaCompare}
              </a>
            </div>
          </div>

          <div className="flex flex-[1_1_300px] justify-center">
            <div
              data-ring
              className="relative flex h-[280px] w-[280px] items-center justify-center rounded-full shadow-[0_30px_60px_rgba(30,26,46,.12)] sm:h-[300px] sm:w-[300px]"
              style={{ background: ring }}
              role="img"
              aria-label={`${activePct}% ${t.ringLabel}: ${fill(t.legendActive, { n: totals.active })}, ${fill(t.legendSlowing, { n: totals.slowing })}, ${fill(t.legendAway, { n: totals.inactive })}`}
            >
              <div data-ring-inner className="flex h-[212px] w-[212px] flex-col items-center justify-center gap-0.5 rounded-full bg-white sm:h-[228px] sm:w-[228px]">
                <span data-ring-pct className="text-[64px] font-black leading-none sm:text-[72px]">
                  {activePct}
                  <span className="text-[32px] sm:text-[36px]">%</span>
                </span>
                <span className="text-[15px] font-extrabold text-[#4A4360]">{t.ringLabel}</span>
              </div>
              <div data-ring-legend className="absolute -right-2 top-6 flex flex-col gap-1 rounded-[14px] bg-white px-3 py-2 text-[13px] font-extrabold shadow-[0_10px_24px_rgba(30,26,46,.12)] sm:-right-[18px]" aria-hidden="true">
                <span className="flex items-center gap-1.5">
                  <Dot color={C.green} />
                  {fill(t.legendActive, { n: totals.active })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Dot color={C.yellow} />
                  {fill(t.legendSlowing, { n: totals.slowing })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Dot color={C.magenta} />
                  {fill(t.legendAway, { n: totals.inactive })}
                </span>
                {totals.notStarted > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Dot color={C.grey} />
                    {fill(t.legendNotStarted, { n: totals.notStarted })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 px-1 pb-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4" data-block="school-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="flex items-center gap-3.5 rounded-[22px] border border-[#ECE8F3] bg-white p-5">
              <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl" style={{ background: k.tint, color: k.ink }}>
                <KpiIcon name={k.icon} />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[30px] font-black leading-none">
                  {k.value}
                  <span className="text-base text-[#6B6482]">{k.of}</span>
                </span>
                <span className="text-[15px] font-extrabold">{k.label}</span>
                <span className="text-[13px] font-semibold text-[#6B6482]">{k.hint}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {cards.length === 0 ? (
        <p className="mt-12 rounded-[26px] border border-[#ECE8F3] bg-white p-6 font-bold">{t.empty}</p>
      ) : (
        <div className="flex flex-col gap-14 pb-10 pt-12">
          <Briefing t={t} s={s} />
          <Locations t={t} cards={cards} />
          <NeedsAndStars t={t} needs={s.needsYou} stars={s.stars} />
          <Compare t={t} cards={cards} totals={totals} />
        </div>
      )}
    </>,
  );
}

function KpiIcon({ name }: { name: string }) {
  const p = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "users")
    return (
      <svg {...p}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.4c2.2.7 3.5 2.8 3.5 5.6" />
      </svg>
    );
  if (name === "chart")
    return (
      <svg {...p}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    );
  if (name === "check")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M12 3 2 20h20L12 3ZM12 10v4M12 17.5v.01" />
    </svg>
  );
}

// ---- 3. This week's briefing -------------------------------------------------------------------------------

type School = Awaited<ReturnType<typeof schoolInsights>>;

function Briefing({ t, s }: { t: T; s: School }) {
  const cards: { tag: string; bg: string; ink: string; title: string; body: string; cta: string; href: string }[] = [];

  if (s.celebrate) {
    const x = s.celebrate;
    const first = firstName(x.student.name);
    const parts = x.student.courses.filter((c) => c.done > 0).map((c) => fill(t.lessonsIn, { n: c.done, course: c.short }));
    cards.push({
      tag: t.tagCelebrate,
      bg: "#E7F6E5",
      ink: C.greenText,
      title: fill(t.celebrateTitle, { name: x.student.name, n: x.student.streak }),
      body: fill(t.celebrateBody, { first, lessons: listOf(parts, t.and) }),
      cta: fill(t.celebrateCta, { first }),
      href: studentHref(x.classId, x.student.id),
    });
  }

  if (s.hardUnits.length) {
    const h = s.hardUnits;
    const min = Math.round(Math.min(...h.map((x) => x.min)) / 10);
    const max = Math.round(Math.max(...h.map((x) => x.max)) / 10);
    const label = (x: HardUnit) => `${x.short} ${x.unit.label}`;
    const episodes = h.length === 2 && h.every((x) => x.short === h[0].short && /^episode\s+\d+$/i.test(x.unit.label));
    const title =
      h.length === 1
        ? fill(t.reviewTitleOne, { a: label(h[0]) })
        : episodes
          ? fill(t.reviewTitleEpisodes, { a: h[0].unit.label.replace(/\D+/g, ""), b: h[1].unit.label.replace(/\D+/g, "") })
          : fill(t.reviewTitleTwo, { a: label(h[0]), b: label(h[1]) });
    const guide = h.find((x) => x.unit.guideLessonId)?.unit.guideLessonId;
    cards.push({
      tag: t.tagReview,
      bg: "#FFF4D6",
      ink: C.yellowText,
      title,
      body: fill(h.length === 1 ? t.reviewBodyOne : t.reviewBody, { min, max }),
      cta: t.reviewCta,
      href: guide ? `/app/lecciones/${guide}` : "#compare",
    });
  }

  if (s.away.length) {
    const list = listOf(
      s.away.map((x) => fill(t.reachItem, { first: firstName(x.student.name), city: x.city, n: x.student.daysAway ?? 0 })),
      t.and,
    );
    cards.push({
      tag: t.tagReach,
      bg: "#FDE3F0",
      ink: C.magentaText,
      title: s.away.length === 1 ? t.reachTitleOne : fill(t.reachTitle, { n: s.away.length }),
      body: fill(t.reachBody, { list }),
      cta: t.reachCta,
      href: "#needs-you",
    });
  }

  if (!cards.length) return null;
  return (
    <section className="flex flex-col gap-[18px] print:hidden" data-block="school-briefing">
      <SectionHead title={t.briefTitle} sub={t.briefSub} />
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <article key={c.tag} className="flex min-h-[210px] flex-col gap-3 rounded-[26px] p-[26px]" style={{ background: c.bg }}>
            <span className="self-start rounded-full bg-white px-3 py-1.5 text-[13px] font-black tracking-[.04em]" style={{ color: c.ink }}>
              {c.tag}
            </span>
            <h3 className="m-0 text-[23px] font-black leading-tight">{c.title}</h3>
            <p className="m-0 flex-grow text-[15px] font-semibold leading-normal text-[#3A3450]">{c.body}</p>
            <a href={c.href} className={`inline-flex min-h-[44px] items-center gap-1.5 self-start text-[15px] font-black hover:underline ${focusRing}`} style={{ color: c.ink }}>
              {c.cta} <Arrow size={16} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---- 4. Your locations -------------------------------------------------------------------------------------

function Locations({ t, cards }: { t: T; cards: LocationCard[] }) {
  return (
    <section id="locations" className="flex scroll-mt-24 flex-col gap-[18px] print:hidden" data-block="school-locations">
      <SectionHead
        title={t.locTitle}
        sub={t.locSub}
        right={
          <div className="flex flex-wrap gap-3.5 text-[13px] font-extrabold text-[#4A4360]">
            <span className="flex items-center gap-1.5">
              <Dot color={C.green} />
              {t.legendWeek}
            </span>
            <span className="flex items-center gap-1.5">
              <Dot color={C.yellow} />
              {t.legendSlow}
            </span>
            <span className="flex items-center gap-1.5">
              <Dot color={C.magenta} />
              {t.legendAway14}
            </span>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-2">
        {cards.map((loc, i) => (
          <Location key={loc.id} t={t} loc={loc} band={BANDS[i % BANDS.length]} />
        ))}
      </div>
    </section>
  );
}

const statusWord = (t: T, st: Status) => (st === "active" ? t.statusActive : st === "slowing" ? t.statusSlowing : st === "inactive" ? t.statusInactive : t.statusNotStarted);

function Location({ t, loc, band }: { t: T; loc: LocationCard; band: string }) {
  const total = loc.focus.total;
  const ringDeg = total ? (loc.focus.active / total) * 360 : 0;
  const teacher = loc.teachers.length === 0 ? t.noTeacher : loc.teachers.length === 1 ? fill(t.teacherOne, { name: loc.teachers[0] }) : fill(t.teacherMany, { names: loc.teachers.join(", ") });
  const ringStyle: CSSProperties = { background: `conic-gradient(${C.greenStrong} 0 ${ringDeg}deg, rgba(255,255,255,.7) ${ringDeg}deg 360deg)` };
  return (
    <article className="flex flex-col overflow-hidden rounded-[30px] border border-[#ECE8F3] bg-white transition-shadow hover:shadow-[0_18px_40px_rgba(30,26,46,.10)]" data-block="location-card">
      <div className="flex items-start justify-between gap-4 px-6 pb-[22px] pt-[26px] sm:px-7" style={{ background: band }}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-black tracking-[.12em] text-[#3A3450]">{t.locKicker}</span>
          <h3 className="m-0 break-words text-[34px] font-black leading-none sm:text-[40px]">{loc.city}</h3>
          <span className="text-sm font-bold text-[#3A3450]">{[loc.schedule, teacher].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="flex h-[92px] w-[92px] flex-none items-center justify-center rounded-full" style={ringStyle} role="img" aria-label={`${loc.focus.active} / ${total} ${t.ringActive}`}>
          <div className="flex h-[70px] w-[70px] flex-col items-center justify-center rounded-full bg-white">
            <span className="text-[22px] font-black leading-none">
              {loc.focus.active}/{total}
            </span>
            <span className="text-[11px] font-extrabold text-[#4A4360]">{t.ringActive}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-6 pb-7 pt-6 sm:px-7">
        <div className="flex flex-col gap-3.5">
          {loc.courses.map((c, i) => {
            const pct = loc.focus.progress.find((p) => p.id === c.id)?.pct ?? 0;
            return (
              <div key={c.id} className="flex flex-col gap-[7px]">
                <div className="flex justify-between gap-3 text-[15px] font-extrabold">
                  <span className="min-w-0 truncate">{c.title}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#F0ECF6]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${loc.city} · ${c.title}`}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: courseColor(c.slug, i) }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2.5">
          {loc.focus.quiz !== null && <span className="rounded-xl bg-[#FFF6DD] px-3 py-2 text-sm font-black text-[#7A5600]">{fill(t.quizAvg, { pct: loc.focus.quiz })}</span>}
          {loc.topStreak && (
            <span className="rounded-xl bg-[#F3EEFB] px-3 py-2 text-sm font-black text-[#4A3F6B]">
              {fill(t.topStreak, { first: firstName(loc.topStreak.name), n: loc.topStreak.streak })}
            </span>
          )}
        </div>

        {loc.students.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-black tracking-[.1em] text-[#6B6482]">{t.studentsKicker}</span>
            <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
              {loc.students.map((st) => (
                <li key={st.id}>
                  <Link
                    href={studentHref(loc.id, st.id)}
                    className={`flex min-h-[44px] items-center gap-2 rounded-full bg-[#F7F5FB] py-1.5 pl-1.5 pr-3 hover:bg-[#EFEAF7] ${focusRing}`}
                    aria-label={`${st.name} · ${statusWord(t, st.status)}`}
                  >
                    <Avatar s={st} size={32} dot={st.status} />
                    <span className="text-sm font-extrabold">{firstName(st.name)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href={`/app/clases/${loc.id}`} className={`${btnDark} self-start py-[13px] text-[15px]`}>
          {fill(t.openClass, { city: loc.city })} <Arrow size={16} />
        </Link>
      </div>
    </article>
  );
}

// ---- 5. Students who need you + stars of the week ------------------------------------------------------------

function NeedsAndStars({ t, needs, stars }: { t: T; needs: NeedsYou[]; stars: SchoolStudent[] }) {
  const reason = (r: NeedsYou["reason"]) =>
    r.kind === "inactive"
      ? fill(t.reasonAway, { n: r.days ?? 0 })
      : r.kind === "quiz"
        ? fill(t.reasonQuiz, { pct: r.pct ?? 0 })
        : r.kind === "slowing"
          ? fill(t.reasonSlowing, { n: r.days ?? 0 })
          : t.reasonNotStarted;
  const RANK = ["#FFD567", "#E4E0F0", "#F2B48C"];
  return (
    <section id="needs-you" className={`grid scroll-mt-24 grid-cols-1 items-stretch gap-[22px] print:hidden ${stars.length ? "lg:grid-cols-[minmax(0,1fr)_400px]" : ""}`} data-block="school-needs">
      <div className="flex min-w-0 flex-col gap-[18px] rounded-[30px] border border-[#ECE8F3] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[26px] font-black sm:text-[28px]">{t.needsTitle}</h2>
          <p className="m-0 text-[15px] font-semibold text-[#4A4360]">{t.needsSub}</p>
        </div>
        {needs.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {needs.map((x) => {
              const pink = x.tone === "attention";
              const where = currentPosition(x.student) ?? t.notStarted;
              return (
                <li key={x.student.id} className="flex flex-wrap items-center gap-3.5 rounded-[20px] p-3.5" style={{ background: pink ? "#FFF2F8" : "#FFFAEB" }} data-tone={x.tone}>
                  <Avatar s={x.student} size={48} />
                  <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-0.5">
                    <span className="text-[17px] font-black">{x.student.name}</span>
                    <span className="text-sm font-bold text-[#4A4360]">
                      {x.city} · {where}
                    </span>
                  </div>
                  <span className="rounded-full bg-white px-3 py-[7px] text-sm font-black" style={{ color: pink ? C.magentaText : C.yellowText }}>
                    {reason(x.reason)}
                  </span>
                  <Link href={studentHref(x.classId, x.student.id)} className={btnLight}>
                    {t.viewStudent}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 flex items-center gap-3 rounded-[20px] bg-[#E7F6E5] p-4 text-[17px] font-black text-[#1F7A3A]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 3 3 5-6" />
            </svg>
            {t.allOnTrack}
          </p>
        )}
      </div>

      {stars.length > 0 && (
        <div className="flex min-w-0 flex-col gap-[18px] rounded-[30px] p-5 text-white sm:p-7" style={{ background: "linear-gradient(160deg,#1E1A2E,#2F2650)" }} data-block="school-stars">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[26px] font-black sm:text-[28px]">{t.starsTitle}</h2>
            <p className="m-0 text-[15px] font-semibold text-[#CFC8E4]">{t.starsSub}</p>
          </div>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {stars.map((x, i) => (
              <li key={x.student.id}>
                <Link href={studentHref(x.classId, x.student.id)} className={`flex items-center gap-3.5 rounded-2xl hover:bg-white/5 ${focusRing}`}>
                  <span className="w-[34px] text-[26px] font-black" style={{ color: RANK[i] }} aria-hidden="true">
                    {i + 1}
                  </span>
                  <Avatar s={x.student} size={46} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[17px] font-black">{x.student.name}</span>
                    <span className="text-[13px] font-bold text-[#CFC8E4]">{fill(t.starLessons, { city: x.city, n: lessonsDone(x.student) })}</span>
                  </span>
                  <span className="rounded-full bg-[rgba(255,197,49,.18)] px-3 py-[7px] text-sm font-black text-[#FFD567]">{fill(t.starDays, { n: x.student.streak })}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// ---- 6. Locations side by side -----------------------------------------------------------------------------

function Compare({ t, cards, totals }: { t: T; cards: LocationCard[]; totals: School["totals"] }) {
  const rows = [
    ...cards.map((c) => ({ key: c.id, name: c.city, active: `${c.focus.active} / ${c.focus.total}`, pct: c.progress, quiz: c.focus.quiz, att: `${c.behind.length} / ${c.focus.total}`, total: false })),
    { key: "total", name: t.total, active: `${totals.active} / ${totals.students}`, pct: totals.progress, quiz: totals.quiz, att: `${totals.attention} / ${totals.students}`, total: true },
  ];
  return (
    <section id="compare" className="flex scroll-mt-24 flex-col gap-[18px] rounded-[30px] border border-[#ECE8F3] bg-white p-5 sm:p-7" data-block="school-compare">
      <SectionHead title={t.compareTitle} sub={t.compareSub} right={<PrintButton label={t.pdf} className={`${btnLight} print:hidden`} />} />
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full min-w-[640px] border-collapse text-left text-base">
          <thead>
            <tr className="text-[13px] uppercase tracking-[.08em] text-[#6B6482]">
              <th scope="col" className="px-3 py-2.5 font-black">{t.colLocation}</th>
              <th scope="col" className="px-3 py-2.5 font-black">{t.colActive}</th>
              <th scope="col" className="px-3 py-2.5 font-black">{t.colProgress}</th>
              <th scope="col" className="px-3 py-2.5 font-black">{t.colQuiz}</th>
              <th scope="col" className="px-3 py-2.5 font-black">{t.colAttention}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={`border-t border-[#ECE8F3] ${r.total ? "font-black" : "font-bold"}`}>
                <th scope="row" className="px-3 py-4 font-black">
                  {r.name}
                </th>
                <td className="px-3 py-4">{r.active}</td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2.5 w-[120px] overflow-hidden rounded-full bg-[#F0ECF6]" aria-hidden="true">
                      <div className="h-full rounded-full bg-[#5B8DEF]" style={{ width: `${r.pct}%` }} />
                    </div>
                    {r.pct}%
                  </div>
                </td>
                <td className="px-3 py-4">{r.quiz === null ? "—" : `${r.quiz}%`}</td>
                <td className="px-3 py-4">{r.att}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** "Download PDF": the hero (with the ring), the KPIs and the comparison on one white page; no app chrome. */
const PRINT_CSS = `
@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  [data-app-header], [data-app-tabbar] { display: none !important; }
  [data-sound], [data-app-main] { background: #fff !important; }
  [data-block="school-hero"] > div:first-child { flex-wrap: nowrap !important; gap: 24px !important; }
  [data-block="school-hero"] h1 { font-size: 34px !important; }
  [data-block="school-hero"] [data-ring] { width: 210px !important; height: 210px !important; }
  [data-block="school-hero"] [data-ring-inner] { width: 158px !important; height: 158px !important; }
  [data-block="school-hero"] [data-ring-pct] { font-size: 48px !important; }
  [data-block="school-kpis"] { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 10px !important; }
  [data-block="school-kpis"] > div { padding: 12px !important; gap: 10px !important; }
  [data-block="school-kpis"] > div > span:first-child { display: none !important; }
  [data-block="school-hero"] [data-ring] { margin-bottom: 34px; }
  [data-block="school-hero"] > div:first-child > div:last-child { flex: 0 0 250px !important; }
  [data-block="school-hero"] [data-ring-legend] { top: auto !important; right: auto !important; bottom: -44px; left: 50%; transform: translateX(-50%); width: 250px; flex-direction: row !important; flex-wrap: wrap; justify-content: center; gap: 2px 10px !important; }
  [data-app-main] { padding: 0 !important; max-width: none !important; }
  [data-block="school-hero"] { border: 0 !important; background: #fff !important; break-inside: avoid; }
  [data-block="school-hero"] > div { padding-top: 0 !important; padding-bottom: 16px !important; }
  [data-block="school-compare"] { break-inside: avoid; border: 0 !important; padding: 0 !important; }
  [data-block="school-compare"] table { min-width: 0 !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-shadow: none !important; }
}`;
