"use client";

// Every part screen sits in this shell: the top bar (part icon, "{Part} · Ep. N", a progress bar and a
// counter or the XP) and the finish flow. Finishing writes progress.status = 'completed' plus the XP
// (record_lesson_progress; queued on the phone when offline), celebrates, then goes back to the episode,
// where that node's check pops in (?hecho=<part>).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PartKey } from "@/lib/course-page";
import { finishLesson } from "@/lib/offline";
import { PartIcon, fill } from "@/components/course/kit";
import { Confetti, sfx } from "./fx";

type T = Dictionary["part"];

export const PART_BG: Record<PartKey, { bg: string; light?: boolean }> = {
  celsvideo: { bg: "linear-gradient(180deg, #2A0F2E 0%, #160C1F 60%)" },
  celscards: { bg: "linear-gradient(180deg, #0B3A52 0%, #0A2233 55%, #08161F 100%)" },
  celsbook: { bg: "linear-gradient(180deg, #FFF1CC 0%, #FBE7C2 100%)", light: true },
  celsaudio: { bg: "linear-gradient(180deg, #1F5A10 0%, #0E2B07 55%, #091A05 100%)" },
  grammar: { bg: "linear-gradient(180deg, #2B1777 0%, #1A0E45 55%, #120A2E 100%)" },
  quiz: { bg: "linear-gradient(180deg, #4A0E2E 0%, #2A0A1C 55%, #1A0812 100%)" },
};

type Ctx = {
  t: T;
  userId: string;
  partKey: PartKey;
  episodeN: number;
  /** 0–1, drawn in the top bar. */
  setProgress: (v: number) => void;
  /** "1 / 8", or null to show the XP. */
  setCounter: (s: string | null) => void;
  addXp: (n: number) => void;
  /** Big celebration (CelsTV). */
  celebrate: () => void;
  /** Records the part as finished. `stay`: the screen shows its own end (quiz, cards); otherwise the overlay, then back to the episode. */
  finish: (opts?: { stay?: boolean }) => Promise<{ xp: number; queued: boolean } | null>;
  /** The episode, with this part's check popping in. */
  backHref: string;
  /** The episode, as it is (nothing finished). */
  episodeHref: string;
  done: boolean;
  nextEpisodeHref: string | null;
  nextEpisodeN: number | null;
};
const PartCtx = createContext<Ctx | null>(null);
export function usePartShell() {
  const c = useContext(PartCtx);
  if (!c) throw new Error("PartShell missing");
  return c;
}

export function PartShell({
  t,
  partKey,
  partName,
  episodeN,
  episodeHref,
  lessonId,
  userId,
  alreadyDone,
  nextEpisode,
  bare = false,
  children,
}: {
  t: T;
  partKey: PartKey;
  partName: string;
  episodeN: number;
  episodeHref: string;
  lessonId: string;
  userId: string;
  alreadyDone: boolean;
  nextEpisode: { href: string; n: number } | null;
  /** The screen draws its own top bar on a white panel (CelsTV CelsBook v2, C-036); the finish flow stays. */
  bare?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [counter, setCounter] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [burst, setBurst] = useState(0);
  const [ending, setEnding] = useState<null | { xp: number; queued: boolean }>(null);
  const finishing = useRef(false);
  const light = PART_BG[partKey].light;
  const back = `${episodeHref}?hecho=${partKey}`;

  const celebrate = useCallback(() => setBurst((b) => b + 1), []);
  const finish = useCallback(
    async (opts?: { stay?: boolean }) => {
      if (finishing.current) return null;
      finishing.current = true;
      setProgress(1);
      const r = await finishLesson(createClient(), userId, lessonId);
      sfx.finish();
      celebrate();
      // refresh() drops the router cache, so the episode shows the new check and XP.
      router.refresh();
      if (!opts?.stay) {
        setEnding({ xp: r.xp, queued: r.queued });
        setTimeout(() => router.push(back), r.queued ? 2600 : 1800);
      }
      return r;
    },
    [userId, lessonId, celebrate, router, back],
  );

  const value = useMemo<Ctx>(
    () => ({
      t,
      userId,
      partKey,
      episodeN,
      setProgress,
      setCounter,
      addXp: (n) => setXp((x) => x + n),
      celebrate,
      finish,
      backHref: back,
      episodeHref,
      done: alreadyDone,
      nextEpisodeHref: nextEpisode?.href ?? null,
      nextEpisodeN: nextEpisode?.n ?? null,
    }),
    [t, userId, partKey, episodeN, celebrate, finish, back, episodeHref, alreadyDone, nextEpisode],
  );

  const ink = light ? "text-[#2B1A05]" : "text-white";
  return (
    <PartCtx.Provider value={value}>
      <div
        className={`relative -mx-4 -mt-6 flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden pb-6 sm:mx-auto sm:mt-0 sm:max-w-[560px] sm:rounded-[32px] md:-mt-2 ${ink}`}
        style={{ background: bare ? "var(--cb2-panel, #fff)" : PART_BG[partKey].bg }}
      >
        {!bare && (
          <header className="flex items-center gap-2.5 px-4 pb-2 pt-4">
            <Link
              href={episodeHref}
              aria-label={t.back}
              className={`kit-focus-light grid size-9 shrink-0 place-items-center rounded-full ${light ? "bg-black/[.07]" : "bg-white/10"}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <PartIcon k={partKey} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{fill(t.of, { part: partName, n: episodeN })}</p>
              <div
                className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${light ? "bg-black/10" : "bg-white/15"}`}
                role="progressbar"
                aria-label={fill(t.of, { part: partName, n: episodeN })}
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[#FFEF05] transition-[width] duration-300"
                  style={{ width: `${progress * 100}%`, background: light ? "#E08A00" : undefined }}
                />
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${light ? "bg-black/[.07]" : "bg-white/10"}`}
              aria-live="polite"
              style={{ color: counter ? undefined : light ? "#8F5300" : "#FFEF05" }}
            >
              {counter ?? <>● {fill(t.xp, { n: xp })}</>}
            </span>
          </header>
        )}

        <div className={`flex flex-1 flex-col ${bare ? "" : "px-4"}`}>{children}</div>

        {ending && (
          <div role="status" className="absolute inset-0 z-40 grid place-items-center bg-black/55 p-6 backdrop-blur-sm">
            <div className="kit-pop w-full max-w-xs rounded-[28px] bg-[#1B1830] p-6 text-center text-white shadow-2xl">
              <div className="mx-auto w-fit">
                <PartIcon k={partKey} size={72} />
              </div>
              <p className="mt-3 text-2xl font-extrabold">{fill(t.finished, { part: partName })}</p>
              {ending.xp > 0 && <p className="mt-1 text-lg font-extrabold text-[#FFEF05]">{fill(t.xpWon, { n: ending.xp })}</p>}
              {ending.queued && <p className="mt-2 text-sm text-white/80">{t.savedOffline}</p>}
              <Link href={back} className="kit-focus-light mt-5 inline-flex rounded-full bg-[#FFEF05] px-5 py-2.5 text-sm font-extrabold text-[#1B1830]">
                {t.back}
              </Link>
            </div>
          </div>
        )}
      </div>
      <Confetti burst={burst} />
    </PartCtx.Provider>
  );
}

/** Bottom action for parts that have nothing to interact with yet (or the video). */
export function FinishButton({ label }: { label: string }) {
  const { finish } = usePartShell();
  return (
    <button
      type="button"
      onClick={() => void finish()}
      className="kit-focus-light mt-6 w-full rounded-2xl bg-[#FFEF05] px-5 py-3.5 text-base font-extrabold text-[#1B1830] transition hover:brightness-95"
    >
      {label}
    </button>
  );
}

export function Empty({ text, light }: { text: string; light?: boolean }) {
  return (
    <div className={`my-auto rounded-3xl p-6 text-center ${light ? "bg-white/70 text-[#4A3410]" : "bg-white/[.07] text-white/85"}`}>
      <p className="text-3xl" aria-hidden>
        🌱
      </p>
      <p className="mt-2 text-sm font-semibold leading-relaxed">{text}</p>
    </div>
  );
}
