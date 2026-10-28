// Student home (/app). Two views: enrolled students get Inicio (inicio-mockup.html: hero with the
// continue card and the week, the updates band, their programs and "Tu siguiente paso"); everyone else
// gets the same hero, the two free evaluations and the four programs.
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { BRANDS, type HomeData, type OpenAssignment } from "@/lib/home";
import type { ThemeKey } from "@/lib/themes";
import { InstallCardSlot } from "@/components/install/InstallCardSlot";
import { BRAND } from "@/components/brand";
import { Band, fill, Grow, Hero, Page, Programs, StudentHero } from "./Inicio";

type T = Dictionary["dash"];

function EvaluationCards({ t, data, locale }: { t: T; data: HomeData; locale: string }) {
  const retake = data.evaluationDate ? new Date(new Date(data.evaluationDate).getTime() + 30 * 864e5) : null;
  const locked = retake && retake > new Date();
  return (
    <section>
      <h2 className="text-xl font-extrabold text-[#1B1830]">{t.evaluations}</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div
          className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
          style={{
            background: "linear-gradient(140deg,#F5178C 0%,#B5007E 55%,#13284D 100%)",
          }}
        >
          <span className="rounded-full bg-[#FFEF05] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#1B1830]">{t.free}</span>
          <h3 className="mt-3 text-2xl font-extrabold text-white">🎯 {t.english}</h3>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-white/85">{t.englishDesc}</p>
          {data.level && data.evaluationDate ? (
            <>
              <p className="mt-3 text-sm font-extrabold text-[#FFEF05]">{fill(t.englishLevel, { level: data.level })}</p>
              {locked ? (
                <p className="mt-1 text-xs font-bold text-white/75">
                  {fill(t.englishRetake, {
                    date: retake!.toLocaleDateString(locale, {
                      day: "numeric",
                      month: "long",
                    }),
                  })}
                </p>
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

        <div
          className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
          style={{
            background: "linear-gradient(150deg,#194876 0%,#0E2A4F 100%)",
          }}
        >
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

export function StudentHome({ t, cv, data, leader }: { t: T; cv: Dictionary["cv"]; data: HomeData; leader?: React.ReactNode }) {
  return (
    <Page>
      <StudentHero t={t} cv={cv} data={data} />
      <Band t={t} items={data.band} />
      <Programs
        t={t}
        programs={data.programs}
        before={
          <div className="mb-10 space-y-4 empty:hidden">
            <InstallCardSlot />
            {leader}
            {data.assignments.length > 0 && <Assignments t={t} items={data.assignments} />}
          </div>
        }
      />
      <Grow t={t} data={data} />
    </Page>
  );
}

export function GuestHome({ t, levelLabel, data, locale }: { t: T; levelLabel: string; data: HomeData; locale: string }) {
  return (
    <Page>
      <Hero t={t} name={data.name} sub={t.subNew} />
      <div className="mt-8 space-y-8">
        {data.level && (
          <span className="inline-block rounded-full bg-[#FFE3F0] px-3.5 py-1.5 text-sm font-extrabold text-[#B5007E]">
            {levelLabel} {data.level}
          </span>
        )}
        <InstallCardSlot />
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
    </Page>
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
            {a.dueAt && (
              <p className="mt-1.5 text-xs font-bold text-[#6B6680]">
                {fill(t.due, {
                  date: new Date(a.dueAt).toLocaleDateString("es-MX", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }),
                })}
              </p>
            )}
          </div>
          <Link
            href={a.href}
            className="inline-flex shrink-0 justify-center rounded-full bg-[#14182B] px-5 py-3 text-sm font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]"
          >
            {t.startTask} →
          </Link>
        </div>
      ))}
    </section>
  );
}
