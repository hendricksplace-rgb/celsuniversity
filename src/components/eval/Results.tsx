"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LEVELS, SECTIONS, type Goal, type Product } from "@/lib/eval-engine";
import { InstallLink } from "@/components/install/InstallApp";
import { BigButton, C, Pill, fill, type EvalT, type SpeakingResult, type WritingResult } from "./Questions";
import { SITE_URL } from "@/lib/site";
import { planHref, plansHref, recommendedPlan } from "@/lib/enroll";
import type { EnrollT } from "@/lib/i18n/enroll-copy";
import { PROGRAMS, type ProgramKey } from "@/lib/purchase-programs";

export type FinalResult = {
  g: number;
  band: string;
  skillLevels: Record<string, string>;
  recommendation: { product: Product; emoji: string; name: string; hex: string; why: string; path: string | null };
  writing: WritingResult | null;
  speaking?: SpeakingResult | null;
};
export type LockedInfo = { retake_on: string; cefr_level?: string | null; skill_levels?: Record<string, string> | null; lead?: boolean };

/** Active products by code, from public.products (the evaluation page reads them on the server). */
export type OfferProducts = Record<string, { name: string; cents: number; installments: number[] | null }>;

/** Without a program, the engine's recommendation shows its entry plan's price. */
const ENTRY_PLAN: Record<Product, string> = { celstv: "celstv_standard", celsbsns: "celsbsns_standard", bundle: "bundle_tv_bsns" };
const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

/** The offer after an evaluation started from /inscribirme?programa=…: that program's recommended plan. */
function ProgramOffer({ t, enrollT, programa, products, g, band }: { t: EvalT; enrollT: EnrollT; programa: ProgramKey; products: OfferProducts; g: number | null; band: string | null }) {
  const meta = PROGRAMS[programa];
  const code = recommendedPlan(programa, g ?? 2);
  const p = products[code];
  const plan = programa === "celsglobal" ? products.celsglobal_plan?.installments : null;
  const w = enrollT.offerWhy;
  const why = band ? fill(programa === "celsbsns" ? (code === "bundle_tv_bsns" ? w.celsbsnsBundle : w.celsbsnsReady) : w[programa], { band }) : enrollT.promise[programa];
  return (
    <div className="rounded-2xl border-2 p-5" style={{ borderColor: C.yellow, background: "rgba(255,197,49,0.10)" }} data-testid="program-offer" data-plan={code}>
      <span className="inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#3a2a00]" style={{ background: C.yellow }}>
        {t.recommended}
      </span>
      <p className="mt-2.5 text-xs font-extrabold uppercase tracking-wider" style={{ color: meta.color }}>
        {fill(enrollT.offerFor, { program: meta.title })}
      </p>
      <h2 className="mt-1 text-xl font-extrabold text-white">{p?.name ?? meta.title}</h2>
      <p className="mt-1.5 text-sm font-semibold leading-relaxed text-white/90">{why}</p>
      {p && (
        <div className="mt-2 text-2xl font-extrabold text-white">
          {usd(p.cents)} <span className="text-sm font-bold text-[#A9A4C0]">{enrollT.oneTime}</span>
          {plan?.length ? (
            <p className="text-xs font-bold text-[#A9A4C0]">
              {fill(enrollT.monthly, { count: plan.length, first: usd(plan[0]) })}
            </p>
          ) : null}
        </div>
      )}
      <Link
        href={planHref(code)}
        data-testid="offer-start"
        className="mt-4 block w-full rounded-2xl py-4 text-center text-base font-extrabold text-white transition hover:brightness-110"
        style={{ background: C.pink }}
      >
        {t.startToday}
      </Link>
      <Link href={plansHref(programa)} className="mt-3 block text-center text-sm font-bold text-[#A9A4C0] underline underline-offset-4 hover:text-white">
        {fill(enrollT.seeAllPlans, { program: meta.title })}
      </Link>
    </div>
  );
}

function Gauge({ g }: { g: number }) {
  const arc = useRef<SVGPathElement>(null);
  const needle = useRef<SVGGElement>(null);
  const angle = -90 + (g / 5) * 180;
  useEffect(() => {
    const id = setTimeout(() => {
      if (arc.current) arc.current.style.strokeDashoffset = String(330 - 330 * (g / 5 || 0.04));
      needle.current?.setAttribute("transform", `rotate(${angle} 130 135)`);
    }, 150);
    return () => clearTimeout(id);
  }, [g, angle]);
  return (
    <svg width="260" height="150" viewBox="0 0 260 150" className="mx-auto block" aria-hidden>
      <defs>
        <linearGradient id="eval-gauge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.pink} />
          <stop offset="35%" stopColor={C.blue} />
          <stop offset="70%" stopColor={C.cyan} />
          <stop offset="100%" stopColor={C.green} />
        </linearGradient>
      </defs>
      <path d="M 25 135 A 105 105 0 0 1 235 135" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="16" strokeLinecap="round" />
      <path
        ref={arc}
        d="M 25 135 A 105 105 0 0 1 235 135"
        fill="none"
        stroke="url(#eval-gauge)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="330"
        strokeDashoffset="330"
        style={{ transition: "stroke-dashoffset 1.4s ease" }}
      />
      <g ref={needle} transform="rotate(-90 130 135)" style={{ transition: "transform 1.4s ease" }}>
        <line x1="130" y1="135" x2="130" y2="48" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="130" cy="135" r="9" fill="#fff" />
      </g>
      {LEVELS.map((L, i) => {
        const a = ((-90 + (i / 5) * 180) * Math.PI) / 180;
        return (
          <text key={L} x={130 + 122 * Math.sin(a)} y={135 - 122 * Math.cos(a)} fill="rgba(245,242,250,.55)" fontSize="11" fontWeight="800" textAnchor="middle">
            {L}
          </text>
        );
      })}
    </svg>
  );
}

export function SkillBars({ t, levels }: { t: EvalT; levels: Record<string, string> }) {
  return (
    <div className="card">
      <h3 className="text-base font-extrabold text-white">{t.skills}</h3>
      <div className="mt-3 flex flex-col gap-3">
        {SECTIONS.map((sec) => {
          const lvl = levels[sec.key] ?? "—";
          const w = ((LEVELS.indexOf(lvl as (typeof LEVELS)[number]) + 1) / 6) * 100;
          return (
            <div key={sec.key}>
              <div className="mb-1 flex justify-between text-sm font-extrabold">
                <span className="text-white">
                  {sec.icon} {t.sections[sec.key]}
                </span>
                <span style={{ color: sec.hex }}>{lvl}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${w}%`, background: sec.hex }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Results({
  t,
  name,
  goal,
  result,
  writingText,
  student,
  programa = null,
  products,
  enrollT,
}: {
  t: EvalT;
  name: string;
  goal: Goal;
  result: FinalResult;
  writingText: string;
  student: boolean;
  programa?: ProgramKey | null;
  products: OfferProducts;
  enrollT: EnrollT;
}) {
  const rec = result.recommendation;
  const entry = products[ENTRY_PLAN[rec.product]];
  const [copied, setCopied] = useState(false);
  const page = rec.product === "celstv" ? "/celstv" : "/celsbsns";
  const q = new URLSearchParams({ name, level: result.band, goal });

  const share = async () => {
    const text = `${fill(t.shareTitle, { band: result.band })} · ${SITE_URL}/evaluacion`;
    try {
      if (navigator.share) return await navigator.share({ text });
    } catch {
      /* fall through to copy */
    }
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="text-center">
        <Pill>{fill(t.resultsOf, { name })}</Pill>
        <Gauge g={result.g} />
        <div className="text-6xl font-extrabold leading-none" style={{ color: C.yellow }}>
          {result.band}
        </div>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[#A9A4C0]">{t.levels[result.band]}</p>
      </div>

      <SkillBars t={t} levels={result.skillLevels} />

      {result.writing && (
        <div className="card">
          <h3 className="text-base font-extrabold text-white">{t.writingReview}</h3>
          {writingText && <p className="mt-1 text-sm italic text-[#A9A4C0]">“{writingText}”</p>}
          <p className="mt-2 text-sm font-bold" style={{ color: C.green }}>
            {result.writing.feedback}
          </p>
          {result.writing.corrections.length === 0 ? (
            <p className="mt-2 text-sm font-extrabold" style={{ color: C.green }}>
              {t.noErrors}
            </p>
          ) : (
            result.writing.corrections.map((c, i) => (
              <div key={i} className="mt-2.5 rounded-xl bg-white/5 p-3 text-sm leading-relaxed">
                <span className="line-through" style={{ color: C.pink }}>
                  {c.original}
                </span>{" "}
                →{" "}
                <span className="font-extrabold" style={{ color: C.green }}>
                  {c.corrected}
                </span>
                <div className="mt-0.5 text-xs text-[#A9A4C0]">{c.note}</div>
              </div>
            ))
          )}
        </div>
      )}

      {result.speaking && (
        <div className="card">
          <h3 className="text-base font-extrabold text-white">{t.speakingReview}</h3>
          {result.speaking.transcript && <p className="mt-1 text-sm italic text-[#A9A4C0]">“{result.speaking.transcript}”</p>}
          <p className="mt-2 text-sm font-bold" style={{ color: C.green }}>
            {result.speaking.feedback}
          </p>
        </div>
      )}

      <InstallLink className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/15 bg-white/5 py-3.5 text-sm font-extrabold text-white transition hover:bg-white/10">
        ⬇ {t.getApp}
      </InstallLink>

      {programa && <ProgramOffer t={t} enrollT={enrollT} programa={programa} products={products} g={result.g} band={result.band} />}

      {student ? (
        <Link href="/app" className="btn-primary w-full !rounded-2xl !py-4 text-base font-extrabold">
          {t.keepLearning}
        </Link>
      ) : (
        <>
          {!programa && (
            <div
              className="rounded-2xl border-2 p-5"
              style={{ borderColor: C.yellow, background: "rgba(255,197,49,0.10)" }}
            >
              <span className="inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#3a2a00]" style={{ background: C.yellow }}>
                {t.recommended}
              </span>
              <h2 className="mt-2.5 text-xl font-extrabold text-white">
                {rec.emoji} {rec.name}
              </h2>
              <p className="mt-1.5 text-sm font-semibold leading-relaxed text-white/90">{rec.why}</p>
              {rec.path && (
                <p className="mt-2 text-xs font-extrabold" style={{ color: C.yellow }}>
                  {rec.path}
                </p>
              )}
              {entry && (
                <div className="mt-2 text-2xl font-extrabold text-white">
                  {usd(entry.cents)} <span className="text-sm font-bold text-[#A9A4C0]">USD</span>
                </div>
              )}
              <Link href={`${page}?${q}`} className="mt-4 block w-full rounded-2xl py-4 text-center text-base font-extrabold text-white transition hover:brightness-110" style={{ background: C.pink }}>
                {t.startToday}
              </Link>
            </div>
          )}
          <div className="rounded-2xl border-2 border-white/15 p-5 text-center" style={{ background: "linear-gradient(140deg,#3A1B57,#182042)" }}>
            <div className="text-lg font-extrabold" style={{ color: C.pink }}>
              Cels<span style={{ color: C.cyan }}>U</span>
            </div>
            <div className="my-1.5 text-3xl font-extrabold" style={{ color: C.cyan }}>
              {fill(t.shareTitle, { band: result.band })}
            </div>
            <p className="text-xs text-[#A9A4C0]">{t.shareSub}</p>
            <BigButton className="mt-3 !bg-white/10 !py-3 text-sm" onClick={() => void share()}>
              {copied ? t.copied : t.share}
            </BigButton>
          </div>
        </>
      )}
    </div>
  );
}

export function Locked({ t, info, programa = null, products, enrollT }: { t: EvalT; info: LockedInfo; programa?: ProgramKey | null; products: OfferProducts; enrollT: EnrollT }) {
  const g = info.cefr_level ? LEVELS.indexOf(info.cefr_level as (typeof LEVELS)[number]) : -1;
  const date = new Date(info.retake_on).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="space-y-4 pb-10 pt-6">
      <div className="text-center">
        <div className="text-5xl">🔒</div>
        <h2 className="mt-2 text-xl font-extrabold text-white">{t.lockedTitle}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-[#A9A4C0]">{fill(t.lockedSub, { date })}</p>
      </div>
      {info.cefr_level ? (
        <>
          <div className="card text-center">
            <div className="text-5xl font-extrabold" style={{ color: C.yellow }}>
              {info.cefr_level}
            </div>
            <p className="mt-1.5 text-sm text-[#A9A4C0]">{t.levels[info.cefr_level]}</p>
          </div>
          {info.skill_levels && <SkillBars t={t} levels={info.skill_levels} />}
        </>
      ) : (
        info.lead && <p className="card text-center text-sm text-white/90">{t.lockedLead}</p>
      )}
      {programa && <ProgramOffer t={t} enrollT={enrollT} programa={programa} products={products} g={g >= 0 ? g : null} band={g >= 0 ? info.cefr_level! : null} />}
      <p className="text-center text-xs text-[#A9A4C0]">{t.lockedBack}</p>
    </div>
  );
}
