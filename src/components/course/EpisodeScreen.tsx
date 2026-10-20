// Episode screen (board "App — Episodio v2", phone 1): hero with the still, progress ring and XP,
// "Continúa" card, the offline download, and the 6 parts as a winding path. Nothing is locked.
import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PART_KEYS, type Episode, type Part, type PartKey } from "@/lib/course-page";
import { EpisodeArt, PartIcon, fill, pad } from "./kit";
import { EpisodeDownload } from "./EpisodeDownload";

type T = Dictionary["episode"];

/** Each part's color (the kit icons' light tone) and a dark gradient for the "Continúa" card (white text). */
export const PART_COLOR: Record<PartKey, { c: string; card: string }> = {
  celsvideo: { c: "#F567B1", card: "linear-gradient(120deg, #9E0F4B 0%, #D4145A 100%)" },
  celscards: { c: "#5CE1FF", card: "linear-gradient(120deg, #075F8A 0%, #0A82B8 100%)" },
  celsbook: { c: "#FFD34D", card: "linear-gradient(120deg, #8F5300 0%, #B86A00 100%)" },
  celsaudio: { c: "#A6EB6E", card: "linear-gradient(120deg, #2C6E12 0%, #3E9C1E 100%)" },
  grammar: { c: "#A88BFF", card: "linear-gradient(120deg, #3F23A8 0%, #6343D8 100%)" },
  quiz: { c: "#FF8A5C", card: "linear-gradient(120deg, #A3123F 0%, #C93A0E 100%)" },
};

// Node centers in a 356 × 560 area, alternating left and right, and the curve joining them.
const NODES = [
  [92, 78],
  [264, 164],
  [92, 252],
  [264, 340],
  [92, 428],
  [264, 516],
];
const SEGMENTS = ["C 92 130, 264 112, 264 164", "S 92 202, 92 252", "S 264 290, 264 340", "S 92 378, 92 428", "S 264 466, 264 516"];
const curve = (upTo: number) => `M92 78 ${SEGMENTS.slice(0, upTo).join(" ")}`;

function progressLabel(done: number, total: number, t: T) {
  if (done === 0) return t.startHere;
  if (done >= total) return t.finished;
  if (done * 2 === total) return t.halfway;
  return done * 2 < total ? t.goodStart : t.almost;
}

function Check({ pop }: { pop: boolean }) {
  return (
    <span
      className={`absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border-[3px] border-[#160C1F] ${pop ? "kit-pop" : ""}`}
      style={{ background: "linear-gradient(160deg, #C5F58F, #4E9F25)" }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function Path({ parts, current, t, justDone }: { parts: Part[]; current: Part | null; t: T; justDone: string | null }) {
  const nodes = PART_KEYS.map((k) => parts.find((p) => p.key === k)).filter((p): p is Part => !!p);
  const reached = current ? nodes.indexOf(current) : nodes.length - 1;
  return (
    <section aria-labelledby="journey" className="mx-auto w-[356px] max-w-full">
      <h2 id="journey" className="px-5 text-xs font-extrabold uppercase tracking-[0.13em] text-white/65">
        {t.journey}
      </h2>
      <ol className="relative mt-1 h-[560px]">
        <svg viewBox="0 0 356 560" width="356" height="560" aria-hidden className="absolute inset-0">
          <defs>
            <linearGradient id="pathDone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F567B1" />
              <stop offset="1" stopColor="#FFEF05" />
            </linearGradient>
          </defs>
          <path d={curve(nodes.length - 1)} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 12" />
          {reached > 0 && <path d={curve(reached)} fill="none" stroke="url(#pathDone)" strokeWidth="6" strokeLinecap="round" />}
        </svg>
        {nodes.map((p, i) => {
          const [x, y] = NODES[i];
          const left = x < 178;
          const now = current?.id === p.id && !p.done;
          const color = PART_COLOR[p.key!].c;
          const badge = p.soon ? (
            <span className="rounded-full bg-white/[.07] px-2 py-1 text-[11px] font-extrabold text-white/75">{t.soon}</span>
          ) : p.done ? (
            <span className="rounded-full bg-[rgba(124,201,74,.16)] px-2 py-1 text-[11px] font-extrabold text-[#C5F58F]">
              {p.xpEarned ? fill(t.xpEarned, { n: p.xpEarned }) : t.done}
            </span>
          ) : now ? (
            <span className="rounded-full px-2 py-1 text-[11px] font-extrabold text-[#160C1F]" style={{ background: color }}>
              {t.here}
            </span>
          ) : (
            <span className="rounded-full bg-white/[.07] px-2 py-1 text-[11px] font-extrabold" style={{ color }}>
              {fill(t.xpTodo, { n: p.xpReward })}
            </span>
          );
          return (
            <li key={p.id}>
              <Link
                href={p.href}
                aria-label={`${fill(t.open, { part: p.name })}${p.soon ? ` · ${t.soon}` : p.done ? ` · ${t.done}` : now ? ` · ${t.here}` : ""}`}
                className="kit-focus-light group absolute rounded-[22px]"
                style={{ left: x - 32, top: y - 32, width: 64, height: 64 }}
              >
                {now && <span aria-hidden className="kit-pulse absolute -inset-2 rounded-[26px]" />}
                <span
                  className="relative block transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none"
                  style={{ filter: p.done || now ? undefined : "saturate(.75) brightness(.85)" }}
                >
                  <PartIcon k={p.key!} size={64} />
                </span>
                {p.done && <Check pop={justDone === p.key} />}
              </Link>
              <div
                aria-hidden
                className={`pointer-events-none absolute flex w-[150px] flex-col gap-1 ${left ? "items-start text-left" : "items-end text-right"}`}
                style={{ left: left ? x + 44 : x - 44 - 150, top: y - 30 }}
              >
                <strong className="text-base font-extrabold text-white">{p.name}</strong>
                <span className="text-xs text-white/70">{t.subs[p.key!]}</span>
                {badge}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function EpisodeScreen({
  t,
  episode,
  courseHref,
  program,
  nextEpisode,
  justDone,
  download,
  teacherGuide,
}: {
  t: T;
  episode: Episode;
  courseHref: string;
  program: string;
  nextEpisode: Episode | null;
  justDone: string | null;
  download: { userId: string; pages: string[]; key: string } | null;
  teacherGuide: string | null;
}) {
  const { parts } = episode;
  // A CelsVideo still "Próximamente" stays on the path but doesn't count (it can't be finished yet).
  const counted = parts.filter((p) => !p.soon);
  const done = counted.filter((p) => p.done).length;
  const xpTotal = counted.reduce((s, p) => s + p.xpReward, 0);
  const xpEarned = counted.reduce((s, p) => s + p.xpEarned, 0);
  const allDone = counted.length > 0 && done === counted.length;
  const current = allDone ? null : episode.next;
  const ringC = 2 * Math.PI * 22;

  return (
    <div className="-mx-4 -mt-6 overflow-hidden bg-[#160C1F] pb-10 text-white sm:mx-auto sm:mt-0 sm:max-w-[560px] sm:rounded-[32px] md:-mt-2">
      {/* Hero */}
      <div className="relative h-[340px] overflow-hidden sm:h-[380px]">
        <div className="kit-kenburns absolute inset-0">
          <EpisodeArt episode={episode} className="h-full w-full" sizes="(max-width: 640px) 100vw, 560px" priority number={!episode.artwork} numberClass="text-[120px] opacity-30" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(22,12,31,.35) 0%, rgba(22,12,31,0) 30%, rgba(22,12,31,.55) 62%, #160C1F 100%)" }}
        />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <Link href={courseHref} aria-label={t.back} className="kit-focus-light grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <span className="flex items-center gap-1.5 rounded-full bg-black/45 py-1.5 pl-1.5 pr-3 text-xs font-bold backdrop-blur">
            <Image src="/brand/celstv-e.png" alt="" width={20} height={21} />
            {program}
          </span>
        </div>
        <div className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5">
          <span className="self-start rounded-[7px] bg-[#FFEF05] px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#160C1F]">
            {fill(t.tag, { n: pad(episode.n) })}
          </span>
          <h1 className="text-[40px] font-extrabold leading-none tracking-tight" style={{ textShadow: "0 6px 24px rgba(0,0,0,.45)" }}>
            {episode.title || fill(t.tag, { n: episode.n })}
          </h1>
          {episode.description && <p className="text-sm font-semibold text-white/85">{episode.description}</p>}
        </div>
      </div>

      <div className="space-y-3.5 px-5 pt-1">
        {/* Progress */}
        <div className="flex items-center gap-3.5">
          <div className="relative size-[52px] shrink-0">
            <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden>
              <defs>
                <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFEF05" />
                  <stop offset="1" stopColor="#F567B1" />
                </linearGradient>
              </defs>
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke="url(#ringG)"
                strokeWidth="5"
                strokeLinecap="round"
                transform="rotate(-90 26 26)"
                strokeDasharray={ringC}
                strokeDashoffset={ringC * (1 - (counted.length ? done / counted.length : 0))}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[13px] font-extrabold">
              {done}/{counted.length}
            </span>
          </div>
          <div>
            <strong className="block text-base font-extrabold">{progressLabel(done, counted.length, t)}</strong>
            <span className="text-[13px] text-white/70">{fill(t.xp, { n: xpEarned, total: xpTotal })}</span>
          </div>
        </div>

        {/* Continue */}
        {current?.key ? (
          <Link
            href={current.href}
            className="kit-focus-light flex items-center gap-3 rounded-[20px] px-3.5 py-3"
            style={{ background: PART_COLOR[current.key].card, boxShadow: "inset 0 1px 0 rgba(255,255,255,.3), 0 16px 30px -16px rgba(0,0,0,.6)" }}
          >
            <PartIcon k={current.key} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wide text-white/90">{done === 0 ? t.begin : t.resume}</span>
              <strong className="block text-[17px] font-extrabold">{current.name}</strong>
            </span>
            <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-full bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#160C1F">
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            </span>
          </Link>
        ) : (
          allDone && (
            <Link
              href={nextEpisode ? nextEpisode.href : courseHref}
              className="kit-focus-light flex items-center gap-3 rounded-[20px] px-4 py-3.5"
              style={{ background: "linear-gradient(120deg, #9E0F4B 0%, #6343D8 100%)" }}
            >
              <span className="text-2xl" aria-hidden>
                🎉
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-white/90">{t.finished}</span>
                <strong className="block text-[17px] font-extrabold">{nextEpisode ? fill(t.next, { n: nextEpisode.n }) : t.back}</strong>
              </span>
              <span aria-hidden className="text-xl">
                ›
              </span>
            </Link>
          )
        )}

        {download && <EpisodeDownload t={t} episodeKey={download.key} moduleId={episode.id} userId={download.userId} pages={download.pages} />}
      </div>

      <div className="mt-7">
        <Path parts={parts} current={current} t={t} justDone={justDone} />
      </div>

      {teacherGuide && (
        <p className="px-5 text-center">
          <Link href={teacherGuide} className="kit-focus-light rounded text-sm font-bold text-white/80 underline">
            {t.teacherGuide}
          </Link>
        </p>
      )}
    </div>
  );
}

/** Other programs' episode/week screen: the same data as a simple list of parts. */
export function PartList({ t, episode, title, courseHref, kicker }: { t: T; episode: Episode; title: string; courseHref: string; kicker: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={courseHref} className="kit-focus rounded text-xs font-semibold text-[#5E5A73] hover:underline">
        ← {t.back}
      </Link>
      <header>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2C6BC4]">{kicker}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[#13284D]">{title}</h1>
        {episode.description && <p className="mt-1 text-sm text-[#4A5A75]">{episode.description}</p>}
        <p className="mt-1 text-sm font-semibold text-[#4A5A75]">
          {fill(t.xp, { n: episode.parts.reduce((s, p) => s + p.xpEarned, 0), total: episode.parts.reduce((s, p) => s + p.xpReward, 0) })}
        </p>
      </header>
      <ol className="space-y-2">
        {episode.parts.map((p, i) => (
          <li key={p.id}>
            <Link
              href={p.href}
              className="kit-focus flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_0_0_1px_#DCE3F0] transition hover:bg-[#F6F8FC]"
              style={episode.next?.id === p.id && !p.done ? { boxShadow: "0 0 0 2px #2C6BC4" } : undefined}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${p.done ? "bg-[#E3F6E8] text-[#15803D]" : "bg-[#EEF2F9] text-[#13284D]"}`}
                aria-label={p.done ? t.done : undefined}
              >
                {p.done ? "✓" : i + 1}
              </span>
              <span className="min-w-0 flex-1 font-semibold text-[#13284D]">{p.name}</span>
              {!p.done && p.xpReward > 0 && <span className="text-xs font-bold text-[#4A5A75]">{fill(t.xpTodo, { n: p.xpReward })}</span>}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
