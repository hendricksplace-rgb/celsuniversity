"use client";
// "Mis libros": one shelf per program, books drawn in CSS (spine, page edges, ribbon on the one in
// progress, glyph, number). Its own pills filter by program or unread; the page filter applies too.
import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Glyph, ShelfBook } from "@/lib/my-courses";
import { useFilter } from "./Filters";
import s from "./mis-cursos.module.css";

type T = Dictionary["misCursos"];
const fill = (str: string, v: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const SHELVES = ["celsus", "celsglobal", "celstv", "celsbsns"];
const PER_ROW = 6;
const TONE = { us: s.bUs, us2: s.bUs2, gl: s.bGl, gold: s.bGold, teal: s.bTeal, rose: s.bRose, violet: s.bViolet };

const GLYPHS: Record<Glyph, React.ReactNode> = {
  globe: (
    <>
      <circle cx="50" cy="50" r="44" />
      <ellipse cx="50" cy="50" rx="20" ry="44" />
      <line x1="6" y1="50" x2="94" y2="50" />
    </>
  ),
  doc: (
    <>
      <rect x="18" y="10" width="64" height="80" rx="6" />
      <line x1="30" y1="30" x2="70" y2="30" />
      <line x1="30" y1="45" x2="70" y2="45" />
      <line x1="30" y1="60" x2="58" y2="60" />
    </>
  ),
  chat: <path d="M14 22h56a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H40l-16 14V64H14z" />,
  money: (
    <>
      <circle cx="50" cy="50" r="40" />
      <path d="M50 26v48M62 36c-4-6-24-6-24 4s24 6 24 16-20 10-24 4" />
    </>
  ),
  people: (
    <>
      <circle cx="36" cy="40" r="14" />
      <circle cx="66" cy="44" r="11" />
      <path d="M12 84c4-16 14-24 24-24s20 8 24 24M54 84c2-12 8-18 14-18s14 6 16 18" />
    </>
  ),
  check: (
    <>
      <path d="M20 14h44l16 16v56H20z" />
      <path d="M34 52l10 10 20-22" />
    </>
  ),
};

function Book({ t, b, name }: { t: T; b: ShelfBook; name: string }) {
  const status = b.state === "done" ? t.bookRead : b.state === "progress" ? t.bookReading : t.bookNew;
  return (
    <li className={s.book} data-state={b.state}>
      <Link href={`/app/libros/${b.slug}`}>
        <div className={`${s.bk} ${TONE[b.tone]}`}>
          {b.state === "progress" && <span className={s.rib} aria-hidden />}
          <div className={s.tagp}>{t.kind[b.kind]}</div>
          {b.number && <div className={s.bn} aria-hidden>{b.number}</div>}
          {b.glyph && (
            <svg className={s.glyph} viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth="3" aria-hidden>
              {GLYPHS[b.glyph]}
            </svg>
          )}
          <div className={s.bt}>{b.face}</div>
          <div className={s.foot}>
            {b.minutes ? <span>{fill(t.minutes, { n: b.minutes })}</span> : null}
            {b.screens > 0 && <span>{fill(t.screens, { n: b.screens })}</span>}
          </div>
        </div>
        <span className={s.cap}>
          {b.caption}
          <small>{b.program === "celsglobal" ? `${name} · ${status}` : status}</small>
        </span>
      </Link>
    </li>
  );
}

export function Books({ t, books, names }: { t: T; books: ShelfBook[]; names: Record<string, string> }) {
  const page = useFilter();
  const [pick, setPick] = useState<string>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const programs = [...SHELVES.filter((p) => books.some((b) => b.program === p)), ...[...new Set(books.map((b) => b.program))].filter((p) => !SHELVES.includes(p))];
  const pills: [string, string][] = [
    ["all", fill(t.allBooks, { n: books.length })],
    ...programs.map((p): [string, string] => [p, `${names[p] ?? p} · ${books.filter((b) => b.program === p).length}`]),
    ["unread", t.unread],
  ];

  return (
    <section className={`${s.books} ${s.hideEmpty}`} aria-labelledby="mc-books">
      <svg className={s.wave} viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0,40 C260,0 520,60 760,30 C1020,0 1220,50 1440,20 L1440,60 L0,60 Z" fill="#1A1535" />
      </svg>
      <div className={s.wrap}>
        <div className={s.eyebrow}>{t.booksKicker}</div>
        <h2 id="mc-books" className={s.secTitle}>
          {t.booksTitle}
        </h2>
        <div className={s.bfil} role="group" aria-label={t.booksFilterLabel}>
          {pills.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={pick === k} onClick={() => setPick(k)}>
              {label}
            </button>
          ))}
        </div>

        {programs
          .filter((p) => pick === "all" || pick === "unread" || pick === p)
          .map((p) => {
            const all = books.filter((b) => b.program === p);
            const list = pick === "unread" ? all.filter((b) => b.state === "new") : all;
            if (!list.length) return null;
            // Filtered views show every match; otherwise one row, and a button for the rest.
            const expanded = open[p] || page !== "all" || pick !== "all";
            const shown = expanded ? list : list.slice(0, PER_ROW);
            const rows = Array.from({ length: Math.ceil(shown.length / PER_ROW) }, (_, i) => shown.slice(i * PER_ROW, (i + 1) * PER_ROW));
            const name = names[p] ?? p;
            return (
              <div key={p} className={`${s.shelf} ${s.hideEmpty}`}>
                <h3 className={s.shelfTitle}>
                  {name} <small>{fill(t.shelfSub[p] ?? t.shelfBooks, { n: all.length })}</small>
                </h3>
                {rows.map((r, i) => (
                  <ul key={i} className={s.row}>
                    {r.map((b) => (
                      <Book key={b.id} t={t} b={b} name={name} />
                    ))}
                  </ul>
                ))}
                {list.length > PER_ROW && page === "all" && pick === "all" && (
                  <div className={s.more}>
                    <button type="button" aria-expanded={!!open[p]} onClick={() => setOpen((o) => ({ ...o, [p]: !o[p] }))}>
                      {open[p] ? t.lessBooks : `${fill(t.moreBooks, { n: list.length, program: name })} →`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
}
