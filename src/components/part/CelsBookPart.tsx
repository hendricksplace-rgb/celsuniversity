"use client";

// Interactive CelsBook (block `celsbook`, version 1): a cover, then Words That Work, Verbs That Vibe and
// Phrases That Fit split into pages (8 words, 4 verbs or 4 phrases each). Tap anything and Amy reads it
// while it lights up; verb examples highlight word by word from `example_wt`. "ES" shows or hides all the
// Spanish; "Léeme todo" reads every item on the page in order. Finishing the last page completes the part.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fill } from "@/components/course/kit";
import { BookFrame } from "./BookPart";
import { usePartShell } from "./PartShell";

export type BookItem = { en: string; es: string; audio: string | null; exEn?: string; exEs?: string; exAudio?: string | null; exWt?: number[] };
export type BookSection = { key: "words" | "verbs" | "phrases"; title: string; titleEs: string; items: BookItem[] };
export type CelsBook = { kicker: string; title: string; subEn: string; subEs: string; image: string | null; sections: BookSection[] };

const PER_PAGE = { words: 8, verbs: 4, phrases: 4 } as const;
const ACCENT = { words: "#0A82B8", verbs: "#3E9C1E", phrases: "#D4145A" } as const;
type Page = { section: BookSection; items: { item: BookItem; id: string }[] } | null; // null = cover

type Clip = { id: string; src: string; wt?: number[] };

/** One player for the book: plays clips in order, reports which clip (and which example word) is on. */
function usePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Clip[]>([]);
  const [on, setOn] = useState<{ id: string; word: number } | null>(null);
  const [reading, setReading] = useState(false);

  const stop = useCallback(() => {
    queue.current = [];
    audio.current?.pause();
    setOn(null);
    setReading(false);
  }, []);

  const next = useCallback(() => {
    const clip = queue.current.shift();
    if (!clip) {
      setOn(null);
      setReading(false);
      return;
    }
    audio.current?.pause();
    const a = new Audio(clip.src);
    audio.current = a;
    setOn({ id: clip.id, word: clip.wt ? 0 : -1 });
    if (clip.wt) {
      const wt = clip.wt;
      a.ontimeupdate = () =>
        setOn({
          id: clip.id,
          word: Math.max(
            0,
            wt.findLastIndex((s) => s <= a.currentTime + 0.04),
          ),
        });
    }
    a.onended = () => next();
    a.onerror = () => next();
    a.play().catch(() => next());
  }, []);

  const play = useCallback(
    (clips: Clip[], all = false) => {
      queue.current = clips.filter((c) => c.src);
      setReading(all);
      next();
    },
    [next],
  );

  useEffect(() => () => audio.current?.pause(), []);
  return { on, reading, play, stop };
}

const Speaker = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden className="shrink-0">
    <path d="M11 5 6 9H3v6h3l5 4z" />
  </svg>
);

export function CelsBookPart({ book, lessonId, finishLabel, originalHref }: { book: CelsBook; lessonId: string; finishLabel: string; originalHref: string | null }) {
  const { t } = usePartShell();
  const [es, setEs] = useState(false);
  const player = usePlayer();
  const { on, play, stop, reading } = player;

  const pages = useMemo<Page[]>(() => {
    const out: Page[] = [null];
    for (const s of book.sections) {
      const size = PER_PAGE[s.key];
      for (let i = 0; i < s.items.length; i += size) out.push({ section: s, items: s.items.slice(i, i + size).map((item, k) => ({ item, id: `${s.key}:${i + k}` })) });
    }
    return out;
  }, [book]);

  const clipsFor = (page: Page): Clip[] =>
    page
      ? page.items.flatMap(({ item, id }) => [...(item.audio ? [{ id, src: item.audio }] : []), ...(item.exAudio ? [{ id: `${id}:ex`, src: item.exAudio, wt: item.exWt }] : [])])
      : [];

  const renderPage = (i: number) => {
    const page = pages[i];
    if (!page)
      return (
        <div className="flex min-h-[460px] flex-col">
          {book.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.image} alt="" className="h-48 w-full object-cover" />
          ) : (
            <div aria-hidden className="h-40 w-full" style={{ background: "linear-gradient(135deg, #FFE08A, #F7B2D3)" }} />
          )}
          <div className="flex flex-1 flex-col gap-2 px-5 pb-5 pt-4">
            <span className="self-start rounded-[7px] bg-[#F20174] px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">{book.kicker}</span>
            <h2 className="font-serif text-[40px] font-bold leading-none tracking-tight">{book.title}</h2>
            {book.subEn && <p className="text-sm leading-relaxed text-[#6B5636]">{book.subEn}</p>}
            {es && book.subEs && <p className="text-[13px] font-semibold leading-relaxed text-[#B04378]">{book.subEs}</p>}
            <span className="mt-auto pt-4 text-xs font-bold text-[#8A6A3A]">{t.bookSwipe}</span>
          </div>
        </div>
      );
    const { section, items } = page;
    const accent = ACCENT[section.key];
    const lit = (id: string) => on?.id === id;
    return (
      <div className="flex flex-col gap-3 px-4 pb-5 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="font-serif text-[26px] font-bold leading-tight tracking-tight">{section.title}</h2>
            {es && section.titleEs && <p className="text-xs font-semibold text-[#B04378]">{section.titleEs}</p>}
          </div>
          <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-wide" style={{ color: accent }}>
            {t.bookTap}
          </span>
        </div>
        <button
          type="button"
          onClick={() => (reading ? stop() : play(clipsFor(page), true))}
          className="kit-focus self-start rounded-full px-3.5 py-2 text-[13px] font-extrabold text-white shadow-[0_8px_16px_-8px_#F20174]"
          style={{ background: "linear-gradient(160deg, #FF7AB8, #D4145A)" }}
        >
          {reading ? `■ ${t.bookStop}` : `▶ ${t.bookReadAll}`}
        </button>

        {section.key === "words" && (
          <div className="grid grid-cols-2 gap-2.5">
            {items.map(({ item, id }) => (
              <button
                key={id}
                type="button"
                onClick={() => play([{ id, src: item.audio ?? "" }])}
                disabled={!item.audio}
                className={`kit-focus rounded-2xl border bg-white px-3 py-2.5 text-left transition ${lit(id) ? "border-[#0A82B8] bg-[#E3F6FD] shadow-[0_0_0_3px_rgba(10,130,184,.25)]" : "border-[#EADBB8]"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-[15px] font-extrabold">{item.en}</strong>
                  <Speaker color={lit(id) ? "#0A82B8" : "#C8B48A"} />
                </span>
                {es && <span className="block text-xs font-semibold text-[#B04378]">{item.es}</span>}
              </button>
            ))}
          </div>
        )}

        {section.key === "verbs" && (
          <ul className="space-y-2.5">
            {items.map(({ item, id }) => {
              const exId = `${id}:ex`;
              const words = (item.exEn ?? "").split(/\s+/).filter(Boolean);
              return (
                <li
                  key={id}
                  className={`rounded-2xl border bg-white p-3 transition ${lit(id) || lit(exId) ? "border-[#3E9C1E] shadow-[0_0_0_3px_rgba(62,156,30,.2)]" : "border-[#EADBB8]"}`}
                >
                  <button
                    type="button"
                    onClick={() => play([{ id, src: item.audio ?? "" }])}
                    disabled={!item.audio}
                    className="kit-focus flex w-full items-center justify-between gap-2 rounded-lg text-left"
                  >
                    <span>
                      <strong className={`text-lg font-extrabold ${lit(id) ? "text-[#2C6E12]" : ""}`}>{item.en}</strong>
                      {es && <span className="ml-2 text-xs font-bold text-[#B04378]">{item.es}</span>}
                    </span>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full" style={{ background: lit(id) ? "#3E9C1E" : "#C8B48A" }}>
                      <Speaker color="#FFFFFF" />
                    </span>
                  </button>
                  {item.exEn && (
                    <button
                      type="button"
                      onClick={() => play([{ id: exId, src: item.exAudio ?? "", wt: item.exWt }])}
                      disabled={!item.exAudio}
                      aria-label={fill(t.bookExample, { text: item.exEn })}
                      className="kit-focus mt-1 block w-full rounded-lg text-left text-[15px] leading-snug text-[#6B5636]"
                    >
                      {words.map((w, k) => (
                        <span key={k} className={`rounded px-0.5 transition-colors ${on?.id === exId && on.word === k ? "bg-[#FFEF05] text-[#2B1D0E]" : ""}`}>
                          {w}{" "}
                        </span>
                      ))}
                      {es && item.exEs && <span className="block text-xs font-semibold text-[#B04378]">{item.exEs}</span>}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {section.key === "phrases" && (
          <ul className="space-y-2.5">
            {items.map(({ item, id }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => play([{ id, src: item.audio ?? "" }])}
                  disabled={!item.audio}
                  className={`kit-focus w-full rounded-2xl border px-3.5 py-3 text-left transition ${lit(id) ? "border-[#D4145A] bg-[#FFE3F0]" : "border-[#EADBB8] bg-white"}`}
                >
                  <span className={`block font-serif text-xl leading-snug ${lit(id) ? "text-[#9E0F4B]" : ""}`}>{item.en}</span>
                  {es && <span className="mt-1 block text-[13px] font-semibold text-[#B04378]">{item.es}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <BookFrame
      total={pages.length}
      ratio={null}
      lessonId={lessonId}
      finishLabel={finishLabel}
      onPage={stop}
      renderPage={renderPage}
      tools={
        <button
          type="button"
          onClick={() => setEs((v) => !v)}
          aria-pressed={es}
          aria-label={es ? t.bookEsHide : t.bookEsShow}
          className={`kit-focus grid h-10 min-w-10 place-items-center rounded-xl px-2 text-sm font-extrabold shadow-sm ${es ? "bg-[#2B1A05] text-white" : "bg-white text-[#2B1A05]"}`}
        >
          ES
        </button>
      }
      note={
        originalHref ? (
          <a href={originalHref} className="kit-focus mx-auto rounded text-center text-xs font-bold text-[#8A6A3A] underline">
            {t.bookOriginal}
          </a>
        ) : null
      }
    />
  );
}
