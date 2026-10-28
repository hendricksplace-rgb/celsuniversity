"use client";

// C-031: results in the CelsU look: a prism orb with the level, the A1–C2 scale, per-skill bars that fill one by
// one, strength and area to grow, and the recommendation in gold glass (USD + MXN reference), with confetti and a
// short chord. The recommendation rule and the program offer (/inscribirme) are unchanged.
import Link from "next/link";
import { useEffect, useState } from "react";
import { LEVELS, SECTIONS, type Goal, type Product } from "@/lib/eval-engine";
import { InstallLink } from "@/components/install/InstallApp";
import { SEC_HEX, fill, tick, type EvT, type EvalT, type SpeakingResult, type WritingResult } from "./Questions";
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
const lvlIdx = (l: string | null | undefined) => LEVELS.indexOf(l as (typeof LEVELS)[number]);

function Mxn({ cents, rate, t }: { cents: number; rate: number | null; t: EvT }) {
  return (
    <small>
      {rate ? `${fill(t.mxn, { n: Math.round((cents / 100) * rate).toLocaleString("es-MX") })} · ` : ""}
      {t.chargedUsd}
    </small>
  );
}

/** Light confetti in the logo colors (none with reduced motion). */
export function confetti() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.className = "ev-conf";
  cv.setAttribute("aria-hidden", "true");
  document.querySelector(".ev")?.appendChild(cv);
  const w = (cv.width = window.innerWidth);
  const h = (cv.height = window.innerHeight);
  const x = cv.getContext("2d");
  if (!x) return cv.remove();
  const cols = ["#43D6FE", "#5B8DEF", "#B3EC79", "#FFC531", "#F20174"];
  const P = Array.from({ length: 90 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * 80,
    y: h * 0.25,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 3,
    s: 5 + Math.random() * 5,
    a: Math.random() * 6,
    c: cols[Math.floor(Math.random() * 5)],
  }));
  let n = 0;
  const f = () => {
    x.clearRect(0, 0, w, h);
    for (const p of P) {
      p.vy += 0.2;
      p.x += p.vx;
      p.y += p.vy;
      p.a += 0.1;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.a);
      x.fillStyle = p.c;
      x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      x.restore();
    }
    if (++n < 180) requestAnimationFrame(f);
    else cv.remove();
  };
  requestAnimationFrame(f);
}

/**
 * The offer after an evaluation started from /inscribirme?programa=…: that program's recommended plan.
 * plan (?plan=, the card clicked on the home page): pre-selected and shown as "Elegiste"; when it differs from
 * the recommendation both are shown, the chosen one first (Matt, 2026-10-20 item 3).
 */
function ProgramOffer({
  t,
  et,
  enrollT,
  programa,
  products,
  rate,
  g,
  band,
  plan = null,
}: {
  t: EvT;
  et: EvalT;
  enrollT: EnrollT;
  programa: ProgramKey;
  products: OfferProducts;
  rate: number | null;
  g: number | null;
  band: string | null;
  plan?: string | null;
}) {
  const meta = PROGRAMS[programa];
  const code = recommendedPlan(programa, g ?? 2);
  const chosen = plan && products[plan] ? plan : null;
  const w = enrollT.offerWhy;
  const why = band
    ? fill(programa === "celsbsns" ? (code === "bundle_tv_bsns" ? w.celsbsnsBundle : w.celsbsnsReady) : w[programa], { band })
    : enrollT.promise[programa];
  const cards = chosen && chosen !== code ? [chosen, code] : [code];
  return (
    <div data-testid="program-offer" data-plan={code} data-chosen={chosen ?? undefined}>
      {cards.map((c, i) => {
        const p = products[c];
        const isRec = c === code;
        const isChosen = c === chosen;
        const primary = i === 0;
        const installments = c === "celsglobal" ? products.celsglobal_plan?.installments : null;
        return (
          <div
            key={c}
            data-testid="offer-card"
            data-plan={c}
            data-selected={primary ? "true" : undefined}
            className={`ev-pg ${primary ? "ev-reco" : "ev-card"}`}
          >
            <div className="rk">
              {isChosen && <span data-testid="offer-chosen">✓ {enrollT.chosen.toUpperCase()}</span>}
              {isChosen && isRec && " · "}
              {isRec && <span data-testid="offer-recommended">{t.recoKick}</span>}
            </div>
            <p className="ev-lab" style={{ marginTop: 8, color: meta.color }}>
              {fill(enrollT.offerFor, { program: meta.title })}
            </p>
            <h3>{p?.name ?? meta.title}</h3>
            {isRec && <p>{why}</p>}
            {p && (
              <div className="ev-price">
                <b>{usd(p.cents)} USD</b>
                <Mxn cents={p.cents} rate={rate} t={t} />
                {installments?.length ? (
                  <small style={{ flexBasis: "100%" }}>{fill(enrollT.monthly, { count: installments.length, first: usd(installments[0]) })}</small>
                ) : null}
              </div>
            )}
            <Link
              href={planHref(c)}
              data-testid={primary ? "offer-start" : "offer-start-alt"}
              className={primary ? "ev-btn gold" : "ev-ghost"}
              style={primary ? undefined : { marginTop: 12 }}
            >
              {et.startToday}
            </Link>
          </div>
        );
      })}
      <Link href={plansHref(programa, chosen)} className="ev-link">
        {fill(enrollT.seeAllPlans, { program: meta.title })}
      </Link>
    </div>
  );
}

/** Per-skill bars in section colors that fill one by one; Hablar when the speaking answer has a level. */
function SkillBars({ t, levels, speaking }: { t: EvT; levels: Record<string, string>; speaking?: string | null }) {
  const rows: [string, string][] = SECTIONS.map((s): [string, string] => [s.key, levels[s.key]]);
  if (speaking && lvlIdx(speaking) >= 0) rows.push(["P", speaking]);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOn(true), 300);
    return () => clearTimeout(id);
  }, []);
  const idx = rows.map(([, l]) => lvlIdx(l));
  const hi = Math.max(...idx);
  const lo = Math.min(...idx);
  const names = (v: number) =>
    rows
      .filter((_, i) => idx[i] === v)
      .map(([k]) => t.secNames[k].toLowerCase())
      .join(", ");
  return (
    <div className="ev-pg ev-card">
      <div className="ev-lab" style={{ marginBottom: 10 }}>
        {t.bySkill}
      </div>
      <div className="ev-sk">
        {rows.map(([k, l], i) => (
          <div className="r" key={k}>
            <span>{t.secNames[k]}</span>
            <div className="bar">
              <i style={{ background: SEC_HEX[k], width: on ? `${((lvlIdx(l) + 1) / 6) * 100}%` : 0, transitionDelay: `${i * 0.12}s` }} />
            </div>
            <b>{l ?? "—"}</b>
          </div>
        ))}
      </div>
      {hi >= 0 && (
        <p>
          <b style={{ color: "var(--ink)" }}>{t.strength}</b> {names(hi)}.{" "}
          {lo < hi && (
            <>
              <b style={{ color: "var(--ink)" }}>{t.grow}</b> {names(lo)}.
            </>
          )}
        </p>
      )}
    </div>
  );
}

function LevelOrb({ band, t, et }: { band: string; t: EvT; et: EvalT }) {
  const g = lvlIdx(band);
  return (
    <div style={{ textAlign: "center" }}>
      <div className="ev-orb" data-testid="ev-level">
        <div className="in">
          <div>
            <b>{band}</b>
            <small>{t.levelNames[band]}</small>
          </div>
        </div>
      </div>
      <p className="ev-lead" style={{ margin: "6px 0 0" }}>
        {et.levels[band]} <b style={{ color: "var(--ink)" }}>{g >= 5 ? t.top : fill(t.nextGoal, { band: LEVELS[g + 1] })}</b>
      </p>
      <div className="ev-scale" aria-hidden>
        {LEVELS.map((l) => (
          <span key={l} className={l === band ? "on" : ""}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Results({
  t,
  et,
  name,
  goal,
  result,
  writingText,
  student,
  programa = null,
  plan = null,
  products,
  rate,
  enrollT,
}: {
  t: EvT;
  et: EvalT;
  name: string;
  goal: Goal;
  result: FinalResult;
  writingText: string;
  student: boolean;
  programa?: ProgramKey | null;
  plan?: string | null;
  products: OfferProducts;
  rate: number | null;
  enrollT: EnrollT;
}) {
  const rec = result.recommendation;
  const entry = products[ENTRY_PLAN[rec.product]];
  const [copied, setCopied] = useState(false);
  const page = rec.product === "celstv" ? "/celstv" : "/celsbsns";
  const q = new URLSearchParams({ name, level: result.band, goal });

  useEffect(() => {
    confetti();
    const ids = [523, 659, 784, 1047].map((f, i) => setTimeout(() => tick(f, 0.4, 0.07), 300 + i * 110));
    return () => ids.forEach(clearTimeout);
  }, []);

  const share = async () => {
    const text = `${fill(et.shareTitle, { band: result.band })} · ${SITE_URL}/evaluacion`;
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
    <div>
      <div style={{ textAlign: "center" }}>
        <span className="ev-kick" style={{ justifyContent: "center" }}>
          <i />
          {t.resKick} · {name.toUpperCase()}
        </span>
      </div>
      <LevelOrb band={result.band} t={t} et={et} />

      <SkillBars t={t} levels={result.skillLevels} speaking={result.speaking?.band} />

      {result.writing && (
        <div className="ev-pg ev-card" style={{ ["--c" as string]: SEC_HEX.W }}>
          <h3>{et.writingReview}</h3>
          {writingText && (
            <p style={{ fontStyle: "italic" }} lang="en">
              “{writingText}”
            </p>
          )}
          <p style={{ fontWeight: 700 }}>{result.writing.feedback}</p>
          {result.writing.corrections.length === 0 ? (
            <p style={{ fontWeight: 800, color: "#2f6e25" }}>{et.noErrors}</p>
          ) : (
            result.writing.corrections.map((c, i) => (
              <div key={i} className="ev-fix">
                <s lang="en">{c.original}</s> → <b lang="en">{c.corrected}</b>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{c.note}</div>
              </div>
            ))
          )}
        </div>
      )}

      {result.speaking && (
        <div className="ev-pg ev-card" style={{ ["--c" as string]: SEC_HEX.P }}>
          <h3>{et.speakingReview}</h3>
          {result.speaking.transcript && (
            <p style={{ fontStyle: "italic" }} lang="en">
              “{result.speaking.transcript}”
            </p>
          )}
          <p style={{ fontWeight: 700 }}>{result.speaking.feedback}</p>
        </div>
      )}

      {programa && (
        <ProgramOffer t={t} et={et} enrollT={enrollT} programa={programa} products={products} rate={rate} g={result.g} band={result.band} plan={plan} />
      )}

      {student ? (
        <Link href="/app" className="ev-btn" style={{ marginTop: 18 }}>
          {et.keepLearning}
        </Link>
      ) : (
        <>
          {!programa && (
            <div className="ev-pg ev-reco" data-testid="ev-reco">
              <div className="rk">{t.recoKick}</div>
              <h3>
                {rec.emoji} {rec.name}
              </h3>
              <p>{rec.why}</p>
              {rec.path && <p style={{ fontWeight: 800, color: "#8a5c00" }}>{rec.path}</p>}
              {entry && (
                <div className="ev-price">
                  <b>{usd(entry.cents)} USD</b>
                  <Mxn cents={entry.cents} rate={rate} t={t} />
                </div>
              )}
              <Link href={`${page}?${q}`} className="ev-btn gold">
                {et.startToday}
              </Link>
            </div>
          )}
          <div className="ev-pg ev-card" style={{ textAlign: "center" }}>
            <h3>{fill(et.shareTitle, { band: result.band })}</h3>
            <p style={{ marginTop: 0 }}>{et.shareSub}</p>
            <div className="ev-row">
              <button type="button" className="ev-ghost" onClick={() => void share()}>
                {copied ? et.copied : et.share}
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <InstallLink className="ev-ghost">⬇ {et.getApp}</InstallLink>
      </div>
      <p className="ev-note">{t.retake}</p>
    </div>
  );
}

export function Locked({
  t,
  et,
  info,
  programa = null,
  plan = null,
  products,
  rate,
  enrollT,
}: {
  t: EvT;
  et: EvalT;
  info: LockedInfo;
  programa?: ProgramKey | null;
  plan?: string | null;
  products: OfferProducts;
  rate: number | null;
  enrollT: EnrollT;
}) {
  const g = lvlIdx(info.cefr_level);
  const date = new Date(info.retake_on).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <span className="ev-kick" style={{ justifyContent: "center" }}>
          <i />
          {t.resKick}
        </span>
        <h1 className="ev-h">{et.lockedTitle}</h1>
        <p className="ev-lead">{fill(et.lockedSub, { date })}</p>
      </div>
      {g >= 0 ? (
        <>
          <LevelOrb band={info.cefr_level!} t={t} et={et} />
          {info.skill_levels && <SkillBars t={t} levels={info.skill_levels} />}
        </>
      ) : (
        info.lead && (
          <div className="ev-pg ev-card" style={{ textAlign: "center" }}>
            <p style={{ margin: 0 }}>{et.lockedLead}</p>
          </div>
        )
      )}
      {programa && (
        <ProgramOffer
          t={t}
          et={et}
          enrollT={enrollT}
          programa={programa}
          products={products}
          rate={rate}
          g={g >= 0 ? g : null}
          band={g >= 0 ? info.cefr_level! : null}
          plan={plan}
        />
      )}
      <p className="ev-note">{et.lockedBack}</p>
    </div>
  );
}
