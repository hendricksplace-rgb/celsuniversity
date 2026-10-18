"use client";

// CelsUS episode (board "Cada programa, su propia experiencia", phones 1–2): formal and calm. Navy and gold,
// serif titles, a vertical timeline of the 6 core parts with gold seals, "Continúa" on top and the extra
// material apart. When all 6 are done, the seal screen shows once (no confetti), then stays reachable.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Episode, Part, UsRole } from "@/lib/course-page";
import { fill } from "./kit";

type T = Dictionary["us"];
export type UsExtra = { href: string; label: string; tag: string; icon: string; external?: boolean };

function Seal({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full text-[#0E2A4F]"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, #FFE89A 0%, #FFD24D 45%, #D9A514 100%)",
        boxShadow: `0 0 0 ${Math.max(2, size / 22)}px rgba(255,210,77,.35), inset 0 -${size / 18}px ${size / 9}px rgba(150,100,0,.35)`,
      }}
    >
      {children}
    </span>
  );
}

const sealKey = (id: string) => `celsu:seal:${id}`;

export function CelsusEpisode({
  t,
  episode,
  title,
  sub,
  courseHref,
  nextHref,
  examHref,
  extras,
  subs,
  episodesDone,
  episodesTotal,
}: {
  t: T;
  episode: Episode;
  title: string;
  sub: string;
  courseHref: string;
  nextHref: string | null;
  examHref: string;
  extras: UsExtra[];
  subs: Partial<Record<UsRole, string>>;
  episodesDone: number;
  episodesTotal: number;
}) {
  const parts = episode.parts;
  const done = parts.filter((p) => p.done).length;
  const complete = parts.length > 0 && done === parts.length;
  const current = complete ? null : episode.next;
  const [seal, setSeal] = useState(false);

  // The seal screen the first time the student comes back with all 6 done.
  useEffect(() => {
    if (!complete) return;
    try {
      if (!localStorage.getItem(sealKey(episode.id))) {
        localStorage.setItem(sealKey(episode.id), "1");
        setSeal(true);
      }
    } catch {
      /* private mode: no automatic seal screen */
    }
  }, [complete, episode.id]);

  const shell = "-mx-4 -mt-6 overflow-hidden sm:mx-auto sm:mt-0 sm:max-w-[560px] sm:rounded-[28px] md:-mt-2";
  if (seal) {
    const xp = [...parts, ...episode.extra].reduce((s, p) => s + p.xpEarned, 0);
    return (
      <div
        className={`${shell} flex min-h-[calc(100dvh-7.5rem)] flex-col items-center px-6 pb-10 pt-12 text-center text-white`}
        style={{ background: "radial-gradient(420px 320px at 50% 18%, rgba(255,210,77,.22), rgba(255,210,77,0) 70%), linear-gradient(180deg, #194876 0%, #0E2A4F 100%)" }}
      >
        <Seal size={150}>
          <span className="flex flex-col items-center">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0E2A4F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.16em]">{fill(t.kicker, { n: episode.n })}</span>
          </span>
        </Seal>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-[#FFD24D]">{t.completedKicker}</p>
        <h1 className="mt-3 font-serif text-[30px] font-semibold leading-tight" role="status">
          {t.completedTitle}
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/85">{t.completedText}</p>
        <div className="mt-7 grid w-full max-w-sm grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/15 bg-white/[.06] px-3 py-4">
            <p className="font-serif text-3xl font-semibold text-[#FFD24D]">+{xp}</p>
            <p className="mt-1 text-xs text-white/80">{t.xpEarned}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/[.06] px-3 py-4">
            <p className="font-serif text-3xl font-semibold text-[#FFD24D]">{fill(t.episodesOf, { n: episodesDone, total: episodesTotal })}</p>
            <p className="mt-1 text-xs text-white/80">{t.episodes}</p>
          </div>
        </div>
        <div className="mt-auto flex w-full max-w-sm flex-col gap-3 pt-8">
          {nextHref && (
            <Link href={nextHref} className="kit-focus-light rounded-xl bg-[#FFD24D] py-3.5 font-bold text-[#0E2A4F]">
              {fill(t.next, { n: episode.n + 1 })}
            </Link>
          )}
          <Link href={examHref} className="kit-focus-light rounded py-1 text-sm font-semibold text-white/90 underline-offset-4 hover:underline">
            {t.practiceExam}
          </Link>
          <button type="button" onClick={() => setSeal(false)} className="kit-focus-light rounded py-1 text-sm text-white/70 underline">
            {t.backEpisode}
          </button>
        </div>
      </div>
    );
  }

  const row = (p: Part, i: number) => {
    const isNow = current?.id === p.id;
    const last = i === parts.length - 1;
    return (
      <li key={p.id} className="relative flex gap-3.5 pb-5">
        {!last && (
          <span aria-hidden className="absolute left-[16px] top-[34px] h-[calc(100%-34px)] w-0.5" style={{ background: p.done && parts[i + 1]?.done ? "#E8B931" : "#D9DEE7" }} />
        )}
        {p.done ? (
          <Seal size={34}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E2A4F" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </Seal>
        ) : (
          <span
            className={`grid size-[34px] shrink-0 place-items-center rounded-full font-serif text-[15px] font-semibold ${isNow ? "bg-[#0E2A4F] text-white shadow-[0_0_0_3px_#FFD24D]" : "bg-white text-[#4A5A75] shadow-[inset_0_0_0_2px_#D9DEE7]"}`}
          >
            {i + 1}
          </span>
        )}
        <Link href={p.href} className="kit-focus -my-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1">
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[17px] font-semibold leading-snug text-[#0E2A4F]">{t.roles[p.role!]}</span>
            <span className="mt-0.5 block text-xs text-[#4A5A75]">{subs[p.role!]}</span>
          </span>
          {p.done ? (
            <span className="shrink-0 text-xs font-bold text-[#7A5C00]">{t.done}</span>
          ) : isNow ? (
            <span className="shrink-0 rounded-lg bg-[#FFD24D] px-3 py-2 text-xs font-bold text-[#0E2A4F]">{t.continue}</span>
          ) : (
            <span aria-hidden className="shrink-0 text-lg text-[#8A94A6]">
              ›
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <div className={`${shell} bg-[#F7F5EF] pb-8`}>
      <header
        className="relative px-5 pb-6 pt-4 text-[#F4F1E8]"
        style={{ background: "radial-gradient(300px 200px at 90% 70%, rgba(255,210,77,.25), rgba(255,210,77,0) 70%), linear-gradient(160deg, #194876 0%, #0E2A4F 100%)" }}
      >
        <div className="flex items-center justify-between">
          <Link href={courseHref} aria-label={t.back} className="kit-focus-light grid size-9 place-items-center rounded-full bg-white/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Image src="/brand/celsus.jpg" alt="CelsUS" width={64} height={26} className="rounded" />
        </div>
        <div className="mt-4 flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#FFD24D]">{fill(t.kicker, { n: episode.n })}</p>
            <h1 className="mt-1.5 font-serif text-[28px] font-semibold leading-tight">{title}</h1>
            <p className="mt-1.5 text-[13px] text-white/80">{sub}</p>
          </div>
          <Seal size={64}>
            <span className="font-serif text-lg font-bold" aria-label={`${done}/${parts.length}`}>
              {done}/{parts.length}
            </span>
          </Seal>
        </div>
      </header>

      <div className="space-y-6 px-5 pt-5">
        {current ? (
          <Link href={current.href} className="kit-focus flex items-center gap-3 rounded-xl border-2 border-[#FFD24D] bg-white px-4 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7A5C00]">{done === 0 ? t.start : t.resume}</span>
              <span className="mt-0.5 block font-serif text-[17px] font-semibold text-[#0E2A4F]">
                {t.roles[current.role!]} · {fill(t.partOf, { n: parts.indexOf(current) + 1, total: parts.length })}
              </span>
            </span>
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0E2A4F]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD24D">
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            </span>
          </Link>
        ) : (
          complete && (
            <button
              type="button"
              onClick={() => setSeal(true)}
              className="kit-focus flex w-full items-center gap-3 rounded-xl border-2 border-[#FFD24D] bg-white px-4 py-3.5 text-left"
            >
              <Seal size={36}>
                <span className="text-sm font-bold">✓</span>
              </Seal>
              <span className="font-serif text-[17px] font-semibold text-[#0E2A4F]">{t.completedKicker}</span>
            </button>
          )
        )}

        <section aria-labelledby="us-journey">
          <h2 id="us-journey" className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#4A5A75]">
            {t.journey}
          </h2>
          <ol className="mt-3">{parts.map(row)}</ol>
        </section>

        {extras.length > 0 && (
          <section aria-labelledby="us-extra">
            <h2 id="us-extra" className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#4A5A75]">
              {t.extra}
            </h2>
            <ul className="mt-3 space-y-2">
              {extras.map((x) => (
                <li key={x.href + x.label}>
                  <a
                    href={x.href}
                    {...(x.external ? { target: "_blank", rel: "noopener" } : {})}
                    className="kit-focus flex items-center gap-3 rounded-[10px] bg-white px-4 py-3 shadow-[0_0_0_1px_#E3E0D4] transition hover:bg-[#FBF8EE]"
                  >
                    <span aria-hidden>{x.icon}</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-[#0E2A4F]">{x.label}</span>
                    <span className="text-xs text-[#5B6880]">{x.tag}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
