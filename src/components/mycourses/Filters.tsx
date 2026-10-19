"use client";
// Mis cursos filter pills (Todos / En curso / Completados / Libros). The page is rendered on the server;
// the pill sets data-f on the page root and the CSS module hides what doesn't match.
import { createContext, useContext, useState } from "react";
import Link from "next/link";

export type Filter = "all" | "progress" | "done" | "books";
const FILTERS: Filter[] = ["all", "progress", "done", "books"];
const Ctx = createContext<{ f: Filter; set: (f: Filter) => void }>({ f: "all", set: () => {} });
export const useFilter = () => useContext(Ctx).f;

export function FilterRoot({ initial, className, children }: { initial: Filter; className: string; children: React.ReactNode }) {
  const [f, setF] = useState<Filter>(initial);
  const set = (next: Filter) => {
    setF(next);
    // Keep the choice in the address (?f=…) so a reload or the back button lands on the same view.
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("f");
    else url.searchParams.set("f", next);
    window.history.replaceState(null, "", url);
  };
  return (
    <Ctx.Provider value={{ f, set }}>
      <div className={className} data-f={f}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function FilterPills({ labels, label, className }: { labels: Record<Filter, string>; label: string; className: string }) {
  const { f, set } = useContext(Ctx);
  return (
    <div className={className} role="group" aria-label={label}>
      {FILTERS.map((k) => (
        <button key={k} type="button" aria-pressed={f === k} onClick={() => set(k)}>
          {labels[k]}
        </button>
      ))}
    </div>
  );
}

/** Shown when the chosen filter leaves nothing on the page. */
export function EmptyNote({ counts, text, browse, className }: { counts: Record<Filter, number>; text: Partial<Record<Filter, string>>; browse: string; className: string }) {
  const f = useFilter();
  if (counts[f] > 0 || !text[f]) return null;
  return (
    <div className={className} role="status">
      <p>{text[f]}</p>
      {f === "all" && <Link href="/cursos">{browse}</Link>}
    </div>
  );
}
