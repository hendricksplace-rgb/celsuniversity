"use client";

// CelsTV course page, below the hero: unit chips, the open unit's episodes (cards from 640 px,
// rows on phones) and the other units as collapsed rows. Nothing is locked.
import Link from "next/link";
import { useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { UNIT_SIZE, unitOf, type Episode } from "@/lib/course-page";
import { EpisodeArt, PartIcons, TILE, fill } from "./kit";

type T = Dictionary["course"];

const range = (u: number, total: number) => ({ a: (u - 1) * UNIT_SIZE + 1, b: Math.min(u * UNIT_SIZE, total) });
const title = (e: Episode, t: T) => e.title || `${t.episode} ${e.n}`;

function subtitle(e: Episode, t: T) {
  const total = e.parts.length;
  if (e.isReview) {
    const { a } = range(unitOf(e.n), Infinity);
    return fill(t.reviewOf, { a, b: Math.max(a, e.n - 1) });
  }
  if (e.state === "done") return fill(t.partsAll, { n: total, total });
  if (e.state === "now" && e.next) return fill(t.partOf, { n: e.parts.indexOf(e.next) + 1, total, part: e.next.name });
  return fill(t.partsCount, { n: total });
}

function Badge({ e, t }: { e: Episode; t: T }) {
  const base = "absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm";
  if (e.state === "done") return <span className={`${base} bg-white text-[#15803D]`}>✓ {t.badgeDone}</span>;
  if (e.state === "now") return <span className={`${base} bg-[#F20174] text-white`}>{t.badgeNow}</span>;
  if (e.isReview) return <span className={`${base} bg-[#FFEF05] text-[#1B1830]`}>{t.badgeReview}</span>;
  return <span className={`${base} bg-white text-[#1B1830]`}>{t.badgeNew}</span>;
}

function action(e: Episode, t: T) {
  if (e.state === "done") return { label: t.review, yellow: false };
  if (e.state === "now") return { label: t.continue, yellow: true };
  return { label: e.isReview ? t.startReview : t.start, yellow: false };
}

function Card({ e, t }: { e: Episode; t: T }) {
  const now = e.state === "now";
  const a = action(e, t);
  const pct = e.parts.length ? e.done / e.parts.length : 0;
  return (
    <li
      className={`relative flex flex-col rounded-[22px] bg-white p-2.5 ${
        now ? "shadow-[0_0_0_3px_#F20174,0_14px_34px_-12px_rgba(242,1,116,.55)]" : "shadow-[0_0_0_1px_#ECE9F2,0_18px_30px_-26px_rgba(27,24,48,.5)]"
      }`}
    >
      <div className="relative">
        <EpisodeArt episode={e} className="aspect-video rounded-2xl" numberClass="text-[44px]" />
        <Badge e={e} t={t} />
      </div>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        {e.title && <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#C8005F]">{fill("{w} {n}", { w: t.episode, n: e.n })}</p>}
        <h3 className="mt-0.5 text-[17px] font-extrabold leading-snug text-[#1B1830]">
          <Link href={e.href} className="kit-focus rounded after:absolute after:inset-0 after:rounded-[22px] after:content-['']">
            {title(e, t)}
          </Link>
        </h3>
        <p className="mt-0.5 text-xs font-semibold text-[#5E5A73]">{subtitle(e, t)}</p>
        <div className="mt-3">
          <PartIcons parts={e.parts} size={26} doneLabel={t.partsAll} />
        </div>
        <div className="mt-auto flex items-center gap-3 pt-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ECE9F2]">
            <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: "linear-gradient(90deg, #F20174, #FFC531)" }} />
          </div>
          {e.next && (
            <Link
              href={e.state === "done" ? e.parts[0].href : e.next.href}
              className={`kit-focus relative z-10 rounded-full px-4 py-2 text-xs font-extrabold text-[#1B1830] transition hover:brightness-95 ${
                a.yellow ? "bg-[#FFEF05]" : "bg-white shadow-[inset_0_0_0_1.5px_#DCD7E6]"
              }`}
            >
              {a.label}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

function Row({ e, t }: { e: Episode; t: T }) {
  const now = e.state === "now";
  return (
    <li>
      <Link href={e.href} className={`kit-focus flex items-center gap-3 rounded-[18px] bg-white p-2 pr-3 ${now ? "shadow-[0_0_0_2px_#F20174]" : "shadow-[0_0_0_1px_#ECE9F2]"}`}>
        <EpisodeArt episode={e} className="size-[70px] shrink-0 rounded-[14px]" numberClass="text-[22px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-[#1B1830]">{title(e, t)}</p>
          <div className="mt-1.5">
            <PartIcons parts={e.parts} size={18} doneLabel={t.partsAll} />
          </div>
        </div>
        {e.state === "done" ? (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#E3F6E8] text-sm font-extrabold text-[#15803D]" aria-label={t.badgeDone}>
            ✓
          </span>
        ) : now ? (
          <span className="shrink-0 rounded-full bg-[#FFEF05] px-3 py-1.5 text-xs font-extrabold text-[#1B1830]">{t.keepGoing}</span>
        ) : e.isReview ? (
          <span className="shrink-0 rounded-full bg-[#FFF6B0] px-2.5 py-1 text-[11px] font-extrabold text-[#1B1830]">{t.badgeReview}</span>
        ) : (
          <span aria-hidden className="shrink-0 text-xl text-[#8A86A0]">
            ›
          </span>
        )}
      </Link>
    </li>
  );
}

export function UnitBrowser({ episodes, initialUnit, t }: { episodes: Episode[]; initialUnit: number; t: T }) {
  const [unit, setUnit] = useState(initialUnit);
  const top = useRef<HTMLDivElement>(null);
  const units = Array.from({ length: Math.ceil(episodes.length / UNIT_SIZE) }, (_, i) => i + 1);
  const inUnit = (u: number) => episodes.filter((e) => unitOf(e.n) === u);
  const shown = inUnit(unit);
  const { a, b } = range(unit, episodes.length);
  const doneIn = (u: number) => inUnit(u).filter((e) => e.state === "done").length;
  const open = (u: number) => {
    setUnit(u);
    top.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return (
    <div ref={top} className="scroll-mt-20 space-y-5">
      <div className="kit-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t.unit}>
        {units.map((u) => {
          const r = range(u, episodes.length);
          const d = doneIn(u);
          const on = u === unit;
          return (
            <button
              key={u}
              type="button"
              aria-pressed={on}
              onClick={() => setUnit(u)}
              className={`kit-focus shrink-0 rounded-2xl px-3.5 py-2 text-left transition ${on ? "bg-[#1B1830] text-white" : "bg-white text-[#1B1830] shadow-[0_0_0_1px_#ECE9F2] hover:bg-[#F7F5FA]"}`}
            >
              <span className="block text-[13px] font-extrabold">
                {t.unit} {u}
              </span>
              <span className={`block text-[11px] font-semibold ${on ? "text-white/75" : "text-[#5E5A73]"}`}>
                {fill(t.eps, r)}
                {d > 0 && ` · ${fill(t.chipDone, { n: d, total: r.b - r.a + 1 })} ✓`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-extrabold text-[#1B1830] sm:text-2xl">
          <span className="sm:hidden">
            {t.unit} {unit}
          </span>
          <span className="hidden sm:inline">{fill(t.unitTitle, { n: unit, a, b })}</span>
        </h2>
        <p className="text-xs font-semibold text-[#5E5A73]">
          {fill(t.unitDone, { n: doneIn(unit), total: shown.length })}
          {shown.at(-1)?.isReview && <span className="hidden sm:inline"> · {t.endsReview}</span>}
        </p>
      </div>

      <ol className="kit-grid hidden gap-4 sm:grid">
        {shown.map((e) => (
          <Card key={e.id} e={e} t={t} />
        ))}
      </ol>
      <ol className="space-y-2.5 sm:hidden">
        {shown.map((e) => (
          <Row key={e.id} e={e} t={t} />
        ))}
      </ol>

      {units.length > 1 && (
        <ul className="space-y-2.5 pt-2">
          {units
            .filter((u) => u !== unit)
            .map((u) => {
              const r = range(u, episodes.length);
              const d = doneIn(u);
              const count = r.b - r.a + 1;
              const status = d === count ? t.unitComplete : d > 0 ? fill(t.unitDone, { n: d, total: count }) : t.notStarted;
              return (
                <li key={u}>
                  <button
                    type="button"
                    onClick={() => open(u)}
                    className="kit-focus flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_0_0_1px_#ECE9F2] transition hover:bg-[#F7F5FA]"
                    aria-label={`${t.expand}: ${t.unit} ${u}`}
                  >
                    <span aria-hidden className="flex shrink-0 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="size-3.5 rounded" style={{ background: TILE[(u + i - 1) % 4] }} />
                      ))}
                    </span>
                    <span className="text-sm font-extrabold text-[#1B1830]">
                      {t.unit} {u}
                    </span>
                    <span className="min-w-0 flex-1 text-xs font-semibold text-[#5E5A73]">
                      {fill(t.epsLong, r)}
                      <span className="hidden sm:inline"> · </span>
                      <span className="block sm:inline">{status}</span>
                    </span>
                    <span aria-hidden className="text-[#8A86A0]">
                      ⌄
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
