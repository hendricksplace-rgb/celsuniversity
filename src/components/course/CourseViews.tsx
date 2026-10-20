// The course page in each program's look: CelsTV episodes (hero, ring, units), CelsBSNS and the
// CelsGLOBAL courses as weeks/sections (navy, square number), CelsUS as citizenship episodes (navy and
// gold, serif titles, practice exam and resources rows).
import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { unitOf, type CoursePage, type Episode, type Extra } from "@/lib/course-page";
import type { ThemeKey } from "@/lib/themes";
import { BRAND } from "@/components/brand";
import { EpisodeArt, Ring, Segments, fill } from "./kit";
import { UnitBrowser } from "./UnitBrowser";

type T = Dictionary["course"];
const THEME_LABEL: Record<ThemeKey, string> = { celstv: "CelsTV", celsbsns: "CelsBSNS", celsus: "CelsUS", celsglobal: "CelsGLOBAL" };

const HERO_BG =
  "radial-gradient(420px 260px at 92% 0%, rgba(242,1,116,.45), rgba(242,1,116,0) 70%), radial-gradient(380px 260px at 0% 100%, rgba(67,214,254,.32), rgba(67,214,254,0) 70%), #1B1830";

function Back({ t, light }: { t: T; light?: boolean }) {
  return (
    <Link href="/app/cursos" className={`kit-focus-light rounded text-xs font-semibold hover:underline ${light ? "text-white/75" : "text-[#5E5A73]"}`}>
      ← {t.back}
    </Link>
  );
}

export function EpisodesView({ page, t, notice }: { page: CoursePage; t: T; notice?: React.ReactNode }) {
  const { course, episodes, resume, doneCount } = page;
  const pct = episodes.length ? doneCount / episodes.length : 0;
  const ep = resume?.episode;
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] p-5 text-white sm:p-8" style={{ background: HERO_BG }}>
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <Back t={t} light />
            <div className="mt-3 flex items-center gap-2.5">
              <Image src="/brand/celstv-e.png" alt="CelsTV" width={34} height={36} className="shrink-0" />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#43D6FE]">CelsTV · {t.season}</p>
            </div>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[36px]">{course.title}</h1>
            {course.description && <p className="mt-2 text-sm leading-relaxed text-white/80">{course.description}</p>}
          </div>
          <div className="hidden shrink-0 flex-col items-center gap-2 md:flex">
            <Ring value={pct} size={112} stroke={9} color="#FFEF05" track="rgba(255,255,255,.12)">
              <span className="block text-[26px] font-extrabold leading-none">{Math.round(pct * 100)}%</span>
            </Ring>
            <p className="text-xs font-semibold text-white/75">{fill(t.episodesOf, { n: doneCount, total: episodes.length })}</p>
          </div>
        </div>

        {resume && ep && (
          <div className="mt-6 flex flex-col gap-4 rounded-[20px] bg-white/[.07] p-3 ring-1 ring-white/10 sm:flex-row sm:items-center sm:gap-5">
            <div className="relative sm:w-[220px] sm:shrink-0">
              <EpisodeArt episode={ep} className="aspect-video rounded-2xl" numberClass="text-[40px]" sizes="(max-width: 640px) 100vw, 220px" priority />
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">▶ {resume.part.name}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 sm:py-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FFEF05]">{resume.fresh ? t.startHere : t.resume}</p>
              <p className="text-lg font-extrabold leading-snug sm:text-xl">
                {t.episode} {ep.n}
                {ep.title && ` · ${ep.title}`}
              </p>
              <p className="text-xs font-semibold text-white/75">{fill(t.partOf, { n: ep.parts.filter((p) => !p.soon).indexOf(resume.part) + 1, total: ep.total, part: resume.part.name })}</p>
              <div className="max-w-[240px] pt-1.5">
                <Segments parts={ep.parts.filter((p) => !p.soon)} current={resume.part.id} />
              </div>
            </div>
            <Link
              href={resume.part.href}
              className="kit-focus-light rounded-full bg-[#FFEF05] px-6 py-3 text-center text-sm font-extrabold text-[#1B1830] transition hover:brightness-95 sm:mr-2"
            >
              {t.continue} ▸
            </Link>
          </div>
        )}
      </section>

      {notice}

      <UnitBrowser episodes={episodes} initialUnit={ep ? unitOf(ep.n) : 1} t={t} />
    </div>
  );
}

function ResourcesRow({ extra, label, dark, serif }: { extra: Extra; label: string; dark?: boolean; serif?: boolean }) {
  return (
    <details className={`group rounded-xl ${dark ? "bg-[#0E2A4F] text-white" : "bg-white text-[#13284D] shadow-[0_0_0_1px_#DCE3F0]"}`}>
      <summary className="kit-focus flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3.5 font-bold [&::-webkit-details-marker]:hidden">
        <span aria-hidden>📁</span>
        <span className={`flex-1 ${serif ? "font-serif" : ""}`}>{label}</span>
        <span aria-hidden className="transition group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <ul className="space-y-1 px-4 pb-4">
        {extra.parts.map((p) => (
          <li key={p.id}>
            <Link href={p.href} className={`kit-focus block rounded-lg px-2 py-1.5 text-sm hover:underline ${dark ? "text-white/90" : "text-[#13284D]"}`}>
              {p.done ? "✓ " : ""}
              {p.name}
            </Link>
          </li>
        ))}
        {extra.parts.length === 0 && <li className="text-sm opacity-75">—</li>}
      </ul>
    </details>
  );
}

/** Row state: done, the one in progress (or the "Continúa" one), or not started. */
const rowState = (e: Episode, page: CoursePage) => (e.state === "done" ? "done" : e.state === "now" || page.resume?.episode.id === e.id ? "now" : "new");

export function WeeksView({ page, t, theme, notice }: { page: CoursePage; t: T; theme: ThemeKey; notice?: React.ReactNode }) {
  const { course, episodes, extras, resume } = page;
  const bsns = theme === "celsbsns";
  const brand = BRAND[theme];
  const accent = bsns ? "#2C6BC4" : "#3F6B57";
  const word = bsns ? t.week : t.section;
  const short = bsns ? t.weekShort : t.sectionShort;
  const bg = bsns ? "linear-gradient(120deg, #13284D, #2C6BC4)" : brand.bg;
  return (
    <div className="space-y-4">
      <Back t={t} />
      <header className="flex flex-col items-start gap-3 rounded-xl px-5 py-4 sm:flex-row sm:items-center sm:gap-4" style={{ background: bg, color: brand.ink }}>
        <div className="shrink-0">{brand.logo}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-80">
            {bsns ? `CelsBSNS · ${fill(t.weeksCount, { n: episodes.length })}` : THEME_LABEL[theme]}
          </p>
          <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">{course.title}</h1>
        </div>
        {resume && <p className="text-sm font-bold">{fill(bsns ? t.weekOf : t.sectionOf, { n: resume.episode.n, total: episodes.length })}</p>}
      </header>
      {notice}
      <ol className="space-y-2.5">
        {episodes.map((e) => {
          const s = rowState(e, page);
          return (
            <li key={e.id}>
              <Link
                href={e.href}
                className="kit-focus flex items-center gap-4 rounded-xl bg-white px-3 py-3 transition hover:bg-[#F6F8FC]"
                style={{ boxShadow: s === "now" ? `0 0 0 2px ${accent}` : "0 0 0 1px #DCE3F0" }}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#13284D] text-center leading-none text-white">
                  <span>
                    <span className="block text-[9px] font-extrabold tracking-wider">{short}</span>
                    <span className="block text-lg font-extrabold">{e.n}</span>
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[#13284D]">{e.title || `${word} ${e.n}`}</span>
                  <span className="mt-0.5 block text-xs text-[#4A5A75]">{fill(t.partsAll, { n: e.done, total: e.total })}</span>
                </span>
                {s === "done" ? (
                  <span className="shrink-0 text-xs font-bold" style={{ color: accent }}>
                    ✓ {t.completedF}
                  </span>
                ) : s === "now" ? (
                  <span className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold text-white" style={{ background: accent }}>
                    {t.continue}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-[#5B6880]">{t.start}</span>
                )}
              </Link>
            </li>
          );
        })}
        {extras
          .filter((x) => x.kind === "resources")
          .map((x) => (
            <li key={x.id}>
              <ResourcesRow extra={x} label={bsns ? t.resourcesMore : t.resources} />
            </li>
          ))}
      </ol>
    </div>
  );
}

export function CitizenshipView({ page, t, best, notice }: { page: CoursePage; t: T; best: string | null; notice?: React.ReactNode }) {
  const { course, episodes, extras, resume } = page;
  return (
    <div className="space-y-4">
      <Back t={t} />
      <header
        className="flex flex-col items-start gap-3 rounded-xl px-5 py-4 sm:flex-row sm:items-center sm:gap-4 text-[#F4F1E8]"
        style={{ background: "linear-gradient(120deg, #0E2A4F, #194876)" }}
      >
        <Image src="/brand/celsus.jpg" alt="CelsUS" width={64} height={26} className="shrink-0 rounded" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FFD24D]">CelsUS · {t.citizenship}</p>
          <h1 className="font-serif text-xl font-semibold leading-tight sm:text-2xl">{course.title}</h1>
        </div>
        {resume && <p className="text-sm font-bold">{fill(t.episodeOf, { n: resume.episode.n, total: episodes.length })}</p>}
      </header>
      {notice}
      <ol className="space-y-2.5">
        {episodes.map((e) => {
          const s = rowState(e, page);
          return (
            <li key={e.id}>
              <Link
                href={e.href}
                className="kit-focus flex items-center gap-4 rounded-xl bg-white px-3 py-3 transition hover:bg-[#FBF8EE]"
                style={{ boxShadow: s === "now" ? "0 0 0 2px #E8B931" : "0 0 0 1px #E3E0D4" }}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0E2A4F] font-serif text-lg font-semibold text-white">{e.n}</span>
                <span className="min-w-0 flex-1 font-serif font-semibold text-[#0E2A4F]">
                  {t.episode} {e.n}
                  {e.title && ` · ${e.title}`}
                </span>
                {s === "done" ? (
                  <span className="shrink-0 text-xs font-bold text-[#7A5C00]">✓ {t.completedM}</span>
                ) : s === "now" ? (
                  <span className="shrink-0 rounded-lg bg-[#FFD24D] px-3.5 py-2 text-xs font-bold text-[#0E2A4F]">{t.continue}</span>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-[#5B6880]">{t.start}</span>
                )}
              </Link>
            </li>
          );
        })}
        {extras.some((x) => x.kind === "evaluation") && (
          <li>
            <Link href="/app/examen-civico" className="kit-focus flex items-center gap-3 rounded-xl bg-[#0E2A4F] px-4 py-3.5 font-bold text-white transition hover:bg-[#13345F]">
              <span aria-hidden>★</span>
              <span className="flex-1">{t.practiceExam}</span>
              {best && <span className="text-sm text-[#FFD24D]">{fill(t.best, { score: best })}</span>}
            </Link>
          </li>
        )}
        {extras
          .filter((x) => x.kind === "resources")
          .map((x) => (
            <li key={x.id}>
              <ResourcesRow extra={x} label={t.resources} dark />
            </li>
          ))}
      </ol>
    </div>
  );
}
