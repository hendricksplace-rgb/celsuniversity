"use client";

// CelsBook (board "CelsBook, CelsAudio y Grammar", phone 1): a book that feels real. Each page comes in
// with a quick fade/slide and a sweep of paper light; the stacked page edge gets thinner as you advance.
// No 3D page flip. The bookmark is remembered on this device. `BookFrame` is shared by the interactive
// book (CelsBookPart) and the original page images (BookPart).
import { useCallback, useEffect, useRef, useState } from "react";
import { fill } from "@/components/course/kit";
import { usePartShell } from "./PartShell";
import { sfx } from "./fx";

export type BookPage = { url: string | null };

function readMark(key: string) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

export function BookFrame({
  total,
  renderPage,
  ratio,
  lessonId,
  finishLabel,
  tools,
  note,
  onPage,
}: {
  total: number;
  renderPage: (i: number) => React.ReactNode;
  /** Page images keep their aspect ratio; null lets the page grow with its content. */
  ratio: number | null;
  lessonId: string;
  finishLabel: string;
  tools?: React.ReactNode;
  note?: React.ReactNode;
  onPage?: (i: number) => void;
}) {
  const { t, setProgress, setCounter, finish } = usePartShell();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [mark, setMark] = useState<number | null>(null);
  const start = useRef<number | null>(null);
  const markKey = `celsu:bookmark:${lessonId}`;

  useEffect(() => setMark(readMark(markKey)), [markKey]);
  useEffect(() => {
    setProgress(total > 1 ? index / (total - 1) : 1);
    setCounter(index === 0 ? t.bookCover : `${index}/${total - 1}`);
  }, [index, total, setProgress, setCounter, t.bookCover]);

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(total - 1, i));
      if (n === index) return;
      setDir(n > index ? 1 : -1);
      setIndex(n);
      onPage?.(n);
      sfx.flip();
    },
    [index, total, onPage],
  );
  const toggleMark = () => {
    const next = mark === index ? null : index;
    setMark(next);
    try {
      if (next === null) localStorage.removeItem(markKey);
      else localStorage.setItem(markKey, String(next));
    } catch {
      /* private mode */
    }
  };

  const remaining = total - 1 - index;
  const edges = Math.min(6, Math.ceil((remaining / Math.max(1, total - 1)) * 6));
  // ★ for the cover, then up to 5 page numbers around the current page.
  const first = Math.max(1, Math.min(index - 2, total - 5));
  const dots = [0, ...Array.from({ length: Math.min(5, total - 1) }, (_, i) => first + i)];
  const sweep = (
    <span
      aria-hidden
      className="kit-sweep pointer-events-none absolute inset-y-0 w-1/2"
      style={{ background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,250,230,.75), rgba(255,255,255,0))" }}
    />
  );

  return (
    <div
      className="flex flex-1 flex-col gap-3 pt-2 outline-none"
      tabIndex={0}
      aria-roledescription="libro"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#7A5418]">{index === 0 ? t.bookCover : fill(t.bookPage, { n: index, total: total - 1 })}</p>
        <div className="flex items-center gap-2">
          {tools}
          {mark !== null && mark !== index && (
            <button type="button" onClick={() => go(mark)} className="kit-focus rounded-xl bg-white px-2.5 py-2 text-xs font-bold text-[#B04378] shadow-sm">
              🔖 {mark === 0 ? "★" : mark}
            </button>
          )}
          <button
            type="button"
            onClick={toggleMark}
            aria-pressed={mark === index}
            aria-label={mark === index ? t.bookMarked : t.bookMark}
            className="kit-focus grid size-10 place-items-center rounded-xl bg-white shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={mark === index ? "#F20174" : "none"} stroke="#F20174" strokeWidth="2.4" strokeLinejoin="round" aria-hidden>
              <path d="M6 3h12v18l-6-4-6 4z" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="relative mx-auto w-full max-w-md"
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerUp={(e) => {
          if (start.current === null) return;
          const dx = e.clientX - start.current;
          start.current = null;
          if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {/* stacked page edge: thinner as you advance */}
        {Array.from({ length: edges }, (_, i) => (
          <span key={i} aria-hidden className="absolute inset-y-[6px] rounded-r-lg border border-[#E6D3A8] bg-[#FFFDF6]" style={{ right: -(i + 1) * 3, left: 8, zIndex: -1 - i }} />
        ))}
        {ratio ? (
          <div className="relative overflow-hidden rounded-xl bg-[#FFFDF6] shadow-[0_18px_40px_-20px_rgba(90,60,10,.55)]" style={{ aspectRatio: String(ratio) }}>
            <div key={index} className="kit-page absolute inset-0" style={{ ["--from" as string]: `${dir * 28}px` }}>
              {renderPage(index)}
              {sweep}
            </div>
          </div>
        ) : (
          <div className="relative min-h-[460px] overflow-hidden rounded-xl bg-[#FFFDF6] text-[#2B1D0E] shadow-[0_18px_40px_-20px_rgba(90,60,10,.55)]">
            <div key={index} className="kit-page relative" style={{ ["--from" as string]: `${dir * 28}px` }}>
              {renderPage(index)}
              {sweep}
            </div>
          </div>
        )}
      </div>

      {note}

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label={t.bookPrev}
          className="kit-focus grid size-12 place-items-center rounded-full bg-black/[.06] text-[#7A5418] disabled:opacity-30"
        >
          ‹
        </button>
        <div className="flex gap-1.5">
          {dots.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => go(d)}
              aria-label={d === 0 ? t.bookCover : fill(t.bookPage, { n: d, total: total - 1 })}
              aria-current={d === index ? "page" : undefined}
              className={`kit-focus grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-xs font-extrabold ${d === index ? "bg-[#2B1A05] text-white" : "bg-black/[.06] text-[#7A5418]"}`}
            >
              {d === 0 ? "★" : d}
            </button>
          ))}
        </div>
        {index < total - 1 ? (
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label={t.bookNext}
            className="kit-focus grid size-12 place-items-center rounded-full bg-[#F20174] text-xl text-white shadow-lg"
          >
            ›
          </button>
        ) : (
          <button type="button" onClick={() => void finish()} className="kit-focus rounded-full bg-[#F20174] px-4 py-3 text-sm font-extrabold text-white shadow-lg">
            {finishLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** The original CelsBook: page images. */
export function BookPart({
  pages,
  ratio,
  lessonId,
  finishLabel,
  interactiveHref,
}: {
  pages: BookPage[];
  ratio: number;
  lessonId: string;
  finishLabel: string;
  interactiveHref?: string;
}) {
  const { t } = usePartShell();
  const total = pages.length;
  return (
    <BookFrame
      total={total}
      ratio={ratio}
      lessonId={`${lessonId}:original`}
      finishLabel={finishLabel}
      renderPage={(i) =>
        pages[i]?.url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img
              src={pages[i].url!}
              alt={i === 0 ? t.bookCover : fill(t.bookPage, { n: i, total: total - 1 })}
              className="h-full w-full select-none object-contain"
              draggable={false}
            />
            {i === 0 && <span className="absolute bottom-3 left-4 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-[#7A5418]">{t.bookSwipe}</span>}
          </>
        ) : (
          <span className="grid h-full place-items-center p-6 text-center text-sm text-[#7A5418]">{t.empty}</span>
        )
      }
      note={
        interactiveHref ? (
          <a href={interactiveHref} className="kit-focus mx-auto rounded text-center text-xs font-bold text-[#B04378] underline">
            ← {t.bookInteractive}
          </a>
        ) : (
          <p className="text-center text-xs text-[#7A5418]">{t.bookNoText}</p>
        )
      }
    />
  );
}
