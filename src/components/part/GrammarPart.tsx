"use client";

// Grammar (board "CelsBook, CelsAudio y Grammar", phone 3): the rule in English or Spanish, read by Amy,
// with its examples; then "Practicar": the exercises as sections (the existing exercise renderers),
// with a "Cómo vas" update after each one. Finishing the last section finishes the part.
import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Exercise } from "@/components/lesson/activities/Grammar";
import { T as ActivityT, Urls } from "@/components/lesson/activities/shared";
import { fill } from "@/components/course/kit";
import { usePartShell } from "./PartShell";
import { sfx } from "./fx";

export type GrammarRule = { title: string; text: string[]; examples: string[]; en: string | null; es: string | null };
type GType = keyof Dictionary["part"]["gtypes"];

let player: HTMLAudioElement | null = null;
function play(src: string) {
  player?.pause();
  player = new Audio(src);
  void player.play();
}

export function GrammarPart({
  rule,
  exercises,
  urls,
  activityT,
  seed,
}: {
  rule: GrammarRule;
  exercises: Record<string, unknown>[];
  urls: Record<string, string>;
  activityT: Dictionary["activity"];
  seed: string;
}) {
  const { t, episodeN, setProgress, setCounter, finish } = usePartShell();
  const [step, setStep] = useState(-1); // -1 rule
  const [review, setReview] = useState(false); // the "Cómo vas" update after a section
  const n = exercises.length;

  useEffect(() => {
    setProgress(step < 0 ? 0 : (step + (review ? 1 : 0)) / Math.max(1, n));
    setCounter(step < 0 ? null : fill(t.section, { n: step + 1, total: n }));
  }, [step, review, n, setProgress, setCounter, t.section]);

  const label = (i: number) => t.gtypes[String(exercises[i]?.type) as GType] ?? fill(t.section, { n: i + 1, total: n });

  if (step < 0)
    return (
      <div className="flex flex-1 flex-col gap-4 pt-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#C9B8FF]">{fill(t.grammarKicker, { n: episodeN })}</p>
        <h2 className="-mt-2 text-[36px] font-extrabold leading-tight">{rule.title}</h2>
        {(rule.text.length > 0 || rule.en || rule.es) && (
          <div className="rounded-3xl border border-white/10 bg-white/[.06] p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-white/70">{t.ruleTitle}</p>
            {rule.text.map((p, i) => (
              <p key={i} className="mt-1.5 text-[17px] font-semibold leading-relaxed">
                {p}
              </p>
            ))}
            {(rule.en || rule.es) && (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {[
                  [rule.en, t.ruleEn],
                  [rule.es, t.ruleEs],
                ].map(([src, name]) =>
                  src ? (
                    <button
                      key={name}
                      type="button"
                      onClick={() => play(src)}
                      className="kit-focus-light flex items-center justify-center gap-2 rounded-xl border border-white/20 py-2.5 text-sm font-extrabold"
                    >
                      <span aria-hidden>🔊</span>
                      {name}
                    </button>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )}
        {rule.examples.length > 0 && (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {rule.examples.map((e) => (
              <li key={e} className="rounded-2xl bg-white/[.07] p-3 text-center text-sm font-extrabold">
                {e}
              </li>
            ))}
          </ul>
        )}
        {n > 0 && (
          <button
            type="button"
            onClick={() => {
              sfx.bing(1);
              setStep(0);
            }}
            className="kit-focus-light mt-auto rounded-2xl py-4 text-lg font-extrabold shadow-[0_14px_30px_-12px_#7B5CFF]"
            style={{ background: "linear-gradient(180deg, #9C82FF, #6A4BE0)" }}
          >
            {fill(t.practice, { n })}
          </button>
        )}
      </div>
    );

  if (review) {
    const last = step === n - 1;
    return (
      <div className="my-auto py-6">
        <p className="text-center text-5xl" aria-hidden>
          ✨
        </p>
        <h2 className="mt-2 text-center text-2xl font-extrabold">{t.sectionDone}</h2>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-wider text-white/70">{t.topics}</p>
        <ul className="mt-2 space-y-3">
          {exercises.map((_, i) => (
            <li key={i}>
              <div className="flex justify-between text-sm font-bold">
                <span>{label(i)}</span>
                <span className="text-white/70">{i <= step ? "100%" : "0%"}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#A88BFF] to-[#FFEF05] transition-[width] duration-500" style={{ width: i <= step ? "100%" : "0%" }} />
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            if (last) void finish();
            else {
              setReview(false);
              setStep(step + 1);
            }
          }}
          className="kit-focus-light mt-7 w-full rounded-2xl bg-[#FFEF05] py-3.5 font-extrabold text-[#1B1830]"
        >
          {last ? fill(t.finish, { part: "Grammar" }) : t.continue}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 pt-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#C9B8FF]">
        {fill(t.section, { n: step + 1, total: n })} · {label(step)}
      </p>
      <div data-theme="celstv" className="rounded-3xl bg-white/[.05] p-4" style={{ ["--t-surface" as string]: "rgba(255,255,255,.06)" }}>
        <ActivityT.Provider value={activityT}>
          <Urls.Provider value={urls}>
            <Exercise key={step} ex={exercises[step]} seed={`${seed}:${step}`} />
          </Urls.Provider>
        </ActivityT.Provider>
      </div>
      <button
        type="button"
        onClick={() => {
          sfx.correct();
          setReview(true);
        }}
        className="kit-focus-light mt-auto rounded-2xl py-3.5 font-extrabold"
        style={{ background: "linear-gradient(180deg, #9C82FF, #6A4BE0)" }}
      >
        {t.continue}
      </button>
    </div>
  );
}
