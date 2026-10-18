"use client";

import { useEffect, useState } from "react";
import { usePartDone } from "../progress";
import { arr, obj, useResolve, useT } from "./shared";

/** CelsBook page images, one page at a time (works on phones, unlike inline PDFs). */
export function Flipbook({ settings, title }: { settings: unknown; title: string }) {
  const t = useT();
  const resolve = useResolve();
  const s = obj(settings);
  const pages = arr(s.pages)
    .map((p) => obj(p))
    .sort((a, b) => Number(a.n) - Number(b.n))
    .map((p) => ({ url: resolve(p.url), thumb: resolve(p.thumb) ?? resolve(p.url) }));
  const ratio = Number(s.aspectRatio) > 0 ? Number(s.aspectRatio) : 0.65;
  const [index, setIndex] = useState(0);
  const partDone = usePartDone();
  useEffect(() => {
    if (pages.length && index >= pages.length - 1) partDone();
  }, [index, pages.length, partDone]);
  if (!pages.length) return null;
  const go = (i: number) => setIndex(Math.max(0, Math.min(pages.length - 1, i)));
  const page = pages[index];

  return (
    <div
      className="space-y-3 outline-none"
      tabIndex={0}
      aria-roledescription="flipbook"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[var(--t-radius)] border border-[var(--t-border)] bg-white">
        <div style={{ aspectRatio: String(ratio) }}>
          {page.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img src={page.url} alt={`${title} · ${t.page} ${index + 1}`} className="h-full w-full object-contain" />
          ) : (
            <p className="t-muted p-6 text-center text-sm">{t.unavailable}</p>
          )}
        </div>
        {/* Tap the left / right half to turn the page. */}
        <button type="button" aria-label={t.prev} onClick={() => go(index - 1)} className="absolute inset-y-0 left-0 w-1/3" />
        <button type="button" aria-label={t.next} onClick={() => go(index + 1)} className="absolute inset-y-0 right-0 w-1/3" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" className="t-btn-ghost" disabled={index === 0} onClick={() => go(index - 1)} aria-label={t.prev}>
          ←
        </button>
        <p className="t-muted text-sm" aria-live="polite">
          {t.page} {index + 1} {t.of} {pages.length}
        </p>
        <button type="button" className="t-btn" disabled={index === pages.length - 1} onClick={() => go(index + 1)} aria-label={t.next}>
          →
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {pages.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`${t.page} ${i + 1}`}
            aria-current={i === index ? "page" : undefined}
            className={`shrink-0 overflow-hidden rounded border-2 ${i === index ? "border-[var(--t-accent)]" : "border-transparent opacity-70"}`}
          >
            {p.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
              <img src={p.thumb} alt="" loading="lazy" className="h-16 w-auto" />
            ) : (
              <span className="block h-16 w-10" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
