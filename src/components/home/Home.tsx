// Student home (/app). Two views: enrolled students get their personal home; everyone else gets
// the two free evaluations and the four programs. Each program card carries its own brand look.
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { BRANDS, type ContinueLesson, type HomeData, type HomeProgram, type OpenAssignment } from "@/lib/home";
import type { ThemeKey } from "@/lib/themes";
import { InstallCard } from "@/components/install/InstallApp";
import { BRAND } from "@/components/brand";

type T = Dictionary["dash"];
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));


function Bar({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full" style={{ background: track }}>
      <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}

function Greeting({ t, name, sub, level, levelLabel }: { t: T; name: string | null; sub: string; level: string | null; levelLabel: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold text-[#1B1830] sm:text-4xl">{name ? fill(t.hi, { name }) : t.hiAnon} 👋</h1>
        <p className="mt-1.5 max-w-xl text-sm font-semibold text-[#4A4766] sm:text-base">{sub}</p>
      </div>
      {level && (
        <span className="rounded-full bg-[#FFE3F0] px-3.5 py-1.5 text-sm font-extrabold text-[#B5007E]">
          {levelLabel} {level}
        </span>
      )}
    </header>
  );
}

function EvaluationCards({ t, data, locale }: { t: T; data: HomeData; locale: string }) {
  const retake = data.evaluationDate ? new Date(new Date(data.evaluationDate).getTime() + 30 * 864e5) : null;
  const locked = retake && retake > new Date();
  return (
    <section>
      <h2 className="text-xl font-extrabold text-[#1B1830]">{t.evaluations}</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6" style={{ background: "linear-gradient(140deg,#F5178C 0%,#B5007E 55%,#13284D 100%)" }}>
          <span className="rounded-full bg-[#FFEF05] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#1B1830]">{t.free}</span>
          <h3 className="mt-3 text-2xl font-extrabold text-white">🎯 {t.english}</h3>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-white/85">{t.englishDesc}</p>
          {data.level && data.evaluationDate ? (
            <>
              <p className="mt-3 text-sm font-extrabold text-[#FFEF05]">{fill(t.englishLevel, { level: data.level })}</p>
              {locked ? (
                <p className="mt-1 text-xs font-bold text-white/75">{fill(t.englishRetake, { date: retake!.toLocaleDateString(locale, { day: "numeric", month: "long" }) })}</p>
              ) : (
                <Link href="/evaluacion" className="mt-4 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-[#B5007E] transition hover:brightness-95">
                  {t.englishAgain} →
                </Link>
              )}
            </>
          ) : (
            <Link href="/evaluacion" className="mt-4 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-[#B5007E] transition hover:brightness-95">
              {t.englishCta} →
            </Link>
          )}
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6" style={{ background: "linear-gradient(150deg,#194876 0%,#0E2A4F 100%)" }}>
          <span className="rounded-full bg-[#FFD24D] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#0E2A4F]">{t.free}</span>
          <h3 className="mt-3 font-serif text-2xl font-bold text-[#F4F1E8]">🇺🇸 {t.civics}</h3>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[#C9D3E2]">{t.civicsDesc}</p>
          {data.civicsUrl ? (
            <a
              href={data.civicsUrl}
              {...(data.civicsUrl.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
              className="mt-4 inline-flex rounded-2xl bg-[#FFD24D] px-5 py-3 text-sm font-extrabold text-[#0E2A4F] transition hover:brightness-95"
            >
              {t.civicsCta} →
            </a>
          ) : (
            <span aria-disabled className="mt-4 inline-flex cursor-default rounded-2xl border border-[#FFD24D]/50 px-5 py-3 text-sm font-extrabold text-[#FFD24D]">
              {t.soon}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/** A program as a sales card (not enrolled): logo, tagline, one line, link to its page. */
function ProgramCard({ t, brand, compact }: { t: T; brand: ThemeKey; compact?: boolean }) {
  const b = BRAND[brand];
  return (
    <Link href={b.href} className="group relative flex flex-col overflow-hidden rounded-3xl p-5 transition hover:-translate-y-0.5 sm:p-6" style={{ background: b.bg, color: b.ink }}>
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: b.bar }} />
      <div className="flex h-12 items-center">{b.logo}</div>
      <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: b.accent }}>
        {t.brands[brand].tag}
      </p>
      {!compact && (
        <p className="mt-1.5 text-sm font-semibold leading-relaxed" style={{ color: b.muted }}>
          {t.brands[brand].desc}
        </p>
      )}
      <span className="mt-auto pt-4 text-sm font-extrabold" style={{ color: b.accent }}>
        {t.learnMore} <span className="inline-block transition group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

/** A program the student has: its courses with lesson progress. CelsGLOBAL is one card for all its courses. */
function MyProgramCard({ t, program }: { t: T; program: HomeProgram }) {
  const b = BRAND[program.brand];
  const light = program.brand === "celsglobal";
  const track = light ? "rgba(47,58,54,.12)" : "rgba(255,255,255,.14)";
  return (
    <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6" style={{ background: b.bg, color: b.ink }}>
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: b.bar }} />
      <div className="flex h-12 items-center justify-between gap-3">
        {b.logo}
        {program.total > 0 && (
          <span className="text-2xl font-extrabold" style={{ color: b.accent }}>
            {Math.round((program.done / program.total) * 100)}%
          </span>
        )}
      </div>
      {program.brand === "celsglobal" && (
        <Link href="/app/programas/celsglobal" className="mt-3 inline-flex rounded-full px-4 py-2 text-sm font-extrabold text-white focus-visible:outline focus-visible:outline-2" style={{ background: b.accent }}>
          {t.viewRoute} →
        </Link>
      )}
      <ul className="mt-4 space-y-3.5">
        {program.courses.map((c) => (
          <li key={c.id}>
            <Link href={`/app/cursos/${c.slug}`} className="group block">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-extrabold leading-snug group-hover:underline">{c.title}</span>
                <span className="shrink-0 text-xs font-bold" style={{ color: b.muted }}>
                  {c.total ? fill(t.lessonsDone, { done: c.done, total: c.total }) : t.noLessons}
                </span>
              </div>
              {c.total > 0 && (
                <div className="mt-1.5">
                  <Bar value={c.done / c.total} color={b.accent} track={track} />
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContinueCard({ t, lesson }: { t: T; lesson: ContinueLesson }) {
  const b = BRAND[lesson.brand];
  return (
    <Link href={`/app/lecciones/${lesson.lessonId}`} className="group relative block overflow-hidden rounded-3xl p-5 sm:p-6" style={{ background: b.bg, color: b.ink }}>
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: b.bar }} />
      <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: b.accent }}>
        {lesson.started ? t.continue : t.startHere}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold leading-tight">{lesson.lessonTitle}</h2>
      <p className="mt-1 text-sm font-semibold" style={{ color: b.muted }}>
        {lesson.courseTitle}
      </p>
      <span
        className="mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-extrabold transition group-hover:brightness-110"
        style={{ background: b.accent, color: lesson.brand === "celsus" ? "#0E2A4F" : "#fff" }}
      >
        {lesson.started ? t.go : t.start} →
      </span>
    </Link>
  );
}

function WeekCard({ t, data }: { t: T; data: HomeData }) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-[#EFE6F2] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-extrabold text-[#1B1830]">{t.week}</h2>
      <ol className="mt-4 grid grid-cols-7 gap-1.5">
        {t.weekDays.map((d, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={`grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold ${i === data.today ? "ring-2 ring-[#F5178C]" : ""}`}
              style={{ background: data.week[i] ? "#6DC067" : "#F1EDF5", color: data.week[i] ? "#0d2210" : "#8A86A0" }}
            >
              {data.week[i] ? "✓" : ""}
            </span>
            <span className="text-[11px] font-bold text-[#6B6680]">{d}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-extrabold">
        <span className="rounded-full bg-[#FFE3F0] px-3 py-1.5 text-[#B5007E]">🔥 {data.streak === 1 ? t.streakDay : fill(t.streakDays, { n: data.streak })}</span>
        <span className="rounded-full bg-[#FFF3D6] px-3 py-1.5 text-[#7A5600]">⚡ {fill(t.weeklyXp, { n: data.weeklyXp })}</span>
      </div>
    </div>
  );
}

export function StudentHome({ t, levelLabel, data }: { t: T; levelLabel: string; data: HomeData }) {
  const mine = new Set(data.programs.map((p) => p.brand));
  const others = BRANDS.filter((b) => !mine.has(b));
  const canEvaluate = !data.evaluationDate || new Date(data.evaluationDate).getTime() + 30 * 864e5 <= Date.now();
  return (
    <div className="space-y-8">
      <Greeting t={t} name={data.name} sub={t.subBack} level={data.level} levelLabel={levelLabel} />
      <InstallCard />
      <div className={data.continueLesson ? "grid gap-4 lg:grid-cols-[1.4fr_1fr]" : ""}>
        {data.continueLesson && <ContinueCard t={t} lesson={data.continueLesson} />}
        <WeekCard t={t} data={data} />
      </div>
      {data.assignments.length > 0 && <Assignments t={t} items={data.assignments} />}
      <section>
        <h2 className="text-xl font-extrabold text-[#1B1830]">{t.myPrograms}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {data.programs.map((p) => (
            <MyProgramCard key={p.brand} t={t} program={p} />
          ))}
        </div>
      </section>
      {(canEvaluate || others.length > 0) && (
        <section>
          <h2 className="text-xl font-extrabold text-[#1B1830]">{t.grow}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {canEvaluate && <EvaluationMini t={t} again={!!data.evaluationDate} />}
            {others.map((b) => (
              <ProgramCard key={b} t={t} brand={b} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** The English evaluation as a small card inside "Sigue creciendo". */
function EvaluationMini({ t, again }: { t: T; again: boolean }) {
  return (
    <Link href="/evaluacion" className="group flex flex-col rounded-3xl p-5 sm:p-6" style={{ background: "linear-gradient(140deg,#F5178C 0%,#B5007E 55%,#13284D 100%)" }}>
      <span className="text-3xl">🎯</span>
      <h3 className="mt-2 text-lg font-extrabold text-white">{t.english}</h3>
      <span className="mt-auto pt-4 text-sm font-extrabold text-[#FFEF05]">{again ? t.englishAgain : t.englishCta} →</span>
    </Link>
  );
}

export function GuestHome({ t, levelLabel, data, locale }: { t: T; levelLabel: string; data: HomeData; locale: string }) {
  return (
    <div className="space-y-8">
      <Greeting t={t} name={data.name} sub={t.subNew} level={data.level} levelLabel={levelLabel} />
      <InstallCard />
      <EvaluationCards t={t} data={data} locale={locale} />
      <section>
        <h2 className="text-xl font-extrabold text-[#1B1830]">{t.programs}</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {BRANDS.map((b) => (
            <ProgramCard key={b} t={t} brand={b} />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Class assignments not started yet: they stay here until the student opens the course. */
function Assignments({ t, items }: { t: T; items: OpenAssignment[] }) {
  return (
    <section className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="flex flex-col gap-3 rounded-3xl border-2 border-[#14182B] bg-white p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-md bg-[#14182B] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">{t.assignment}</span>
            <h3 className="mt-2 text-lg font-extrabold leading-snug">{a.courseTitle}</h3>
            {a.note && <p className="mt-1 rounded-xl bg-[#FBF3DD] px-3 py-2 text-sm font-semibold text-[#5C4A12]">{a.note}</p>}
            {a.dueAt && <p className="mt-1.5 text-xs font-bold text-[#6B6680]">{fill(t.due, { date: new Date(a.dueAt).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) })}</p>}
          </div>
          <Link
            href={a.lessonId ? `/app/lecciones/${a.lessonId}` : `/app/cursos/${a.courseSlug}`}
            className="inline-flex shrink-0 justify-center rounded-full bg-[#14182B] px-5 py-3 text-sm font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]"
          >
            {t.startTask} →
          </Link>
        </div>
      ))}
    </section>
  );
}
