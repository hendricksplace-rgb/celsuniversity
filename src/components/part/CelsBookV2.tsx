"use client";

// C-036: the CelsTV CelsBook as a real book (episodes 1–8; celsu-celstv-celsbook-mockup.html v2). The first time,
// the episode's thumbnail as a book over a dark sky: "Abrir el libro" grows it and fades it into the first page.
// Then pages, never scrolling: each page is filled by measuring (no item is ever split; a word group stays together
// when it fits, else it continues on the next page under the same heading), and re-filled when the screen or the
// "Con español / Solo inglés" switch changes, keeping the student on the item they were reading. Pages turn with a
// slide, a fade and a paper-light sweep. Words, verbs (karaoke from example_wt) and phrases play Amy's audio; the
// Repaso rápido (data.review) finishes the part. The opened books and the page reached are saved per student in
// user_preferences.celsbook_opened.
import "./celsbook-v2.css";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientPref } from "@/lib/prefs";
import { fill } from "@/components/course/kit";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { usePartShell } from "./PartShell";
import { reducedMotion, sfx } from "./fx";
import type { BookItem, BookSection } from "./CelsBookPart";

type T = Dictionary["part"]["cb2"];
type SecKey = BookSection["key"];
export type BookGroup = { key: string; nameEs: string; nameEn: string; color: string; items: number[] };
export type ReviewQ = { q: string; options: string[]; answer: number; xp: number };
export type CelsBookV2Data = {
  ep: number;
  title: string;
  subEs: string;
  image: string | null;
  sections: BookSection[];
  groups: BookGroup[];
  review: ReviewQ[];
};

const SEC_COLOR: Record<SecKey, string> = { words: "#35C3F0", verbs: "#F5178C", phrases: "#6DC067" };
const SPARKS = ["#FFC531", "#F5178C", "#35C3F0", "#6DC067", "#5B8DEF"];
const DOTS = Array.from({ length: 22 }, (_, k) => ({
  s: 2 + ((k * 37) % 40) / 10,
  l: (k * 53 + 7) % 100,
  t: (k * 31 + 11) % 100,
  c: ["#FFC531", "#35C3F0", "#F5178C", "#fff"][k % 4],
  d: ((k * 7) % 30) / 10,
}));

// ---------- pages ----------
type Chunk = { group: BookGroup; items: number[] };
type Page =
  | { kind: "welcome" }
  | { kind: "review" }
  | { kind: "chapter"; sec: SecKey; chap: number; k: number; of: number; chunks?: Chunk[]; items?: number[] };

/** The item a page starts with: the place the student is kept on when pages are re-filled. */
const anchorOf = (p: Page) => (p.kind !== "chapter" ? p.kind : `${p.sec}:${p.chunks ? p.chunks[0].items[0] : p.items![0]}`);

type Sizes = {
  avail: number;
  full: Record<SecKey, number>;
  cont: Record<SecKey, number>;
  heads: Record<string, number>;
  rows: Record<string, number[][]>;
  items: Record<string, number>;
};
const GAP = 8;
const GROUP_GAP = 10;

/** Fills pages greedily from measured heights. */
function paginate(secs: BookSection[], groups: BookGroup[], z: Sizes, hasReview: boolean): Page[] {
  const out: Page[] = [{ kind: "welcome" }];
  secs.forEach((sec, si) => {
    const chap = si + 1;
    const pages: Page[] = [];
    let used = 0;
    const open = () => {
      const p: Page = { kind: "chapter", sec: sec.key, chap, k: 0, of: 0, ...(sec.key === "words" ? { chunks: [] } : { items: [] }) };
      pages.push(p);
      used = pages.length === 1 ? z.full[sec.key] : z.cont[sec.key];
      return p as Extract<Page, { kind: "chapter" }>;
    };
    let cur = open();
    if (sec.key === "words") {
      for (const g of groups) {
        const rows = z.rows[g.key] ?? [];
        const head = z.heads[g.key] ?? 0;
        const rowsH = (rs: number[][]) => rs.reduce((s, r, i) => s + Math.max(...r) + (i ? GAP : 0), 0);
        const whole = head + rowsH(rows);
        const lead = cur.chunks!.length ? GROUP_GAP : 0;
        if (used + lead + whole <= z.avail) {
          cur.chunks!.push({ group: g, items: g.items });
          used += lead + whole;
          continue;
        }
        if (whole <= z.avail - z.cont[sec.key] && cur.chunks!.length) {
          cur = open();
          cur.chunks!.push({ group: g, items: g.items });
          used += whole;
          continue;
        }
        // Taller than a page: row by row, the heading repeated on each page.
        let idx = 0;
        let chunk: Chunk | null = null;
        rows.forEach((r) => {
          const h = Math.max(...r);
          const add = chunk ? GAP + h : (cur.chunks!.length ? GROUP_GAP : 0) + head + h;
          if (used + add > z.avail && (chunk || cur.chunks!.length)) {
            cur = open();
            chunk = null;
          }
          if (!chunk) {
            used += (cur.chunks!.length ? GROUP_GAP : 0) + head + h;
            chunk = { group: g, items: [] };
            cur.chunks!.push(chunk);
          } else used += GAP + h;
          chunk.items.push(...g.items.slice(idx, idx + r.length));
          idx += r.length;
        });
      }
    } else {
      sec.items.forEach((_, i) => {
        const h = z.items[`${sec.key}:${i}`] ?? 0;
        const add = (cur.items!.length ? GAP : 0) + h;
        if (used + add > z.avail && cur.items!.length) cur = open();
        used += (cur.items!.length ? GAP : 0) + h;
        cur.items!.push(i);
      });
    }
    const real = pages.filter((p) => p.kind === "chapter" && (p.chunks?.length || p.items?.length)) as Extract<Page, { kind: "chapter" }>[];
    real.forEach((p, k) => {
      p.k = k;
      p.of = real.length;
    });
    out.push(...real);
  });
  if (hasReview) out.push({ kind: "review" });
  return out;
}

// ---------- audio ----------
type Clip = { id: string; src: string; wt?: number[] };
function usePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Clip[]>([]);
  const raf = useRef(0);
  const [on, setOn] = useState<{ id: string; word: number } | null>(null);
  const [reading, setReading] = useState(false);
  const stop = useCallback(() => {
    queue.current = [];
    cancelAnimationFrame(raf.current);
    audio.current?.pause();
    setOn(null);
    setReading(false);
  }, []);
  const next = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const clip = queue.current.shift();
    if (!clip) {
      setOn(null);
      setReading(false);
      return;
    }
    audio.current?.pause();
    const a = new Audio(clip.src);
    audio.current = a;
    setOn({ id: clip.id, word: -1 });
    if (clip.wt?.length) {
      const wt = clip.wt;
      const tick = () => {
        setOn({ id: clip.id, word: wt.findLastIndex((s) => s <= a.currentTime + 0.02) });
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }
    a.onended = () => setTimeout(next, queue.current.length ? 250 : 0);
    a.onerror = () => next();
    a.play().catch(() => next());
  }, []);
  const play = useCallback(
    (clips: Clip[], all = false) => {
      queue.current = clips.filter((c) => c.src);
      setReading(all && queue.current.length > 0);
      next();
    },
    [next],
  );
  useEffect(() => () => stop(), [stop]);
  return { on, reading, play, stop };
}

// ---------- pieces ----------
const Logo = ({ className = "logo-e" }: { className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element -- the CelsTV "e", a small local SVG
  <img className={className} src="/progreso/celstv-e.svg" alt="" width={34} height={36} />
);
const Chevron = ({ left }: { left?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#B0136F" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

function ChapterHead({
  t,
  sec,
  page,
  first,
  title,
  titleEs,
  onRead,
  reading,
}: {
  t: T;
  sec: SecKey;
  page: { chap: number; k: number; of: number };
  first: boolean;
  title: string;
  titleEs: string;
  onRead?: () => void;
  reading?: boolean;
}) {
  const lead = { words: t.leadWords, verbs: t.leadVerbs, phrases: t.leadPhrases }[sec];
  return (
    <div className="head">
      <div className="kick">{page.of > 1 ? fill(t.chapterPart, { n: page.chap, k: page.k + 1, of: page.of }) : fill(t.chapter, { n: page.chap })}</div>
      <h2 className={`h ${first ? "" : "sm"}`}>
        {title}
        {first && titleEs && <span className="es-line es-title">{titleEs}</span>}
      </h2>
      {first ? <p className="lead">{lead}</p> : <div style={{ height: 8 }} />}
      <button type="button" className={`readall ${reading ? "on" : ""}`} onClick={onRead} data-testid="cb2-read">
        {reading ? t.stop : t.readPage}
      </button>
    </div>
  );
}

export function CelsBookV2({
  t,
  book,
  opened,
  episodeHref,
  audioHref,
  originalHref,
}: {
  t: T;
  book: CelsBookV2Data;
  /** user_preferences.celsbook_opened: every episode opened, with the page anchor reached. */
  opened: Record<string, { page?: string }>;
  episodeHref: string;
  audioHref: string | null;
  originalHref: string | null;
}) {
  const { userId, finish, celebrate } = usePartShell();
  const ep = String(book.ep);
  const secs = book.sections;
  const groups = useMemo<BookGroup[]>(() => {
    const words = secs.find((s) => s.key === "words");
    if (!words) return [];
    const valid = book.groups.map((g) => ({ ...g, items: g.items.filter((i) => i >= 0 && i < words.items.length) })).filter((g) => g.items.length);
    // No groups yet (later episodes): every word in one group.
    return valid.length ? valid : [{ key: "all", nameEs: t.allWords, nameEn: "Words", color: SEC_COLOR.words, items: words.items.map((_, i) => i) }];
  }, [book.groups, secs, t.allWords]);
  const hasReview = book.review.length > 0;

  const [es, setEs] = useState(true);
  const [cover, setCover] = useState(!opened[ep]);
  const [opening, setOpening] = useState(false);
  const [pages, setPages] = useState<Page[] | null>(null);
  const [p, setP] = useState(0);
  const [turn, setTurn] = useState<{ from: number; dir: 1 | -1 } | null>(null);
  const [enter, setEnter] = useState<"r" | "l" | "f" | "">("f");
  const [xp, setXp] = useState(0);
  const [qi, setQi] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  /** The cover keeps the thumbnail's own proportions (Ludo's thumbnails are wide), never cropped. */
  const [ratio, setRatio] = useState(16 / 9);
  /** Bumped when the book opens, so the first page fades in again under the fading cover. */
  const [openKey, setOpenKey] = useState(0);
  const [pageH, setPageH] = useState(560);
  const anchor = useRef<string>(opened[ep]?.page ?? "welcome");
  const saved = useRef(opened);
  const pagesBox = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const { on, reading, play, stop } = usePlayer();
  const busy = turn !== null;

  // "Mostrar traducción al español" (Cuenta → Preferencias) sets where the switch starts.
  useEffect(() => setEs(clientPref("es")), []);

  /** Page height: what is left of the screen under the top bars and above the arrows (and the phone tab bar). */
  useLayoutEffect(() => {
    // Full screen on phones while the book is open (celsbook-v2.css), before measuring.
    document.documentElement.dataset.immersive = "1";
    const fit = () => {
      const box = pagesBox.current;
      if (!box) return;
      const top = box.getBoundingClientRect().top + window.scrollY;
      const nav = navRef.current?.offsetHeight ?? 84;
      const tab = [...document.querySelectorAll<HTMLElement>("nav.fixed")].find(
        (n) => getComputedStyle(n).display !== "none" && n.getBoundingClientRect().bottom >= window.innerHeight - 2,
      );
      const h = Math.round(Math.max(420, Math.min(640, window.innerHeight - top - nav - (tab?.offsetHeight ?? 0) - 28)));
      setPageH((old) => (Math.abs(old - h) > 6 ? h : old));
    };
    fit();
    const raf = requestAnimationFrame(fit);
    void document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      delete document.documentElement.dataset.immersive;
    };
  }, []);

  /** Measures every piece in a hidden page of the same size, then fills the pages. */
  const repaginate = useCallback(() => {
    const m = measure.current;
    if (!m) return;
    const st = getComputedStyle(m);
    // A few pixels to spare for rounding, so nothing ever touches the page number.
    const avail = m.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom) - 6;
    const h = (sel: string) => {
      const el = m.querySelector<HTMLElement>(sel);
      if (!el) return 0;
      const cs = getComputedStyle(el);
      return el.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    };
    const z: Sizes = { avail, full: { words: 0, verbs: 0, phrases: 0 }, cont: { words: 0, verbs: 0, phrases: 0 }, heads: {}, rows: {}, items: {} };
    for (const s of secs) {
      z.full[s.key] = h(`[data-m="full-${s.key}"]`);
      z.cont[s.key] = h(`[data-m="cont-${s.key}"]`);
    }
    for (const g of groups) {
      z.heads[g.key] = h(`[data-m="head-${g.key}"]`);
      const tiles = [...m.querySelectorAll<HTMLElement>(`[data-m="tiles-${g.key}"] > *`)];
      const rows: number[][] = [];
      let lastTop = -1;
      for (const el of tiles) {
        if (el.offsetTop !== lastTop) {
          rows.push([]);
          lastTop = el.offsetTop;
        }
        rows[rows.length - 1].push(el.getBoundingClientRect().height);
      }
      z.rows[g.key] = rows;
    }
    m.querySelectorAll<HTMLElement>("[data-mi]").forEach((el) => (z.items[el.dataset.mi!] = el.getBoundingClientRect().height));
    const next = paginate(secs, groups, z, hasReview);
    setPages(next);
    const i = next.findIndex((pg) => anchorOf(pg) === anchor.current || (pg.kind === "chapter" && containsAnchor(pg, anchor.current)));
    setP(i >= 0 ? i : 0);
  }, [secs, groups, hasReview]);

  useLayoutEffect(() => {
    repaginate();
  }, [repaginate, es, pageH]);
  useEffect(() => {
    const ro = new ResizeObserver(() => repaginate());
    if (measure.current) ro.observe(measure.current);
    return () => ro.disconnect();
  }, [repaginate]);

  const total = pages?.length ?? 1;
  const page = pages?.[p] ?? null;

  // Where the student is: kept across re-pagination, saved for next time (debounced).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (entry: { page: string }) => {
      saved.current = { ...saved.current, [ep]: entry };
      try {
        localStorage.setItem(`celsbook-v2-${ep}`, JSON.stringify(entry));
      } catch {}
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void createClient()
          .from("user_preferences")
          .upsert({ user_id: userId, celsbook_opened: saved.current }, { onConflict: "user_id" })
          .then(() => undefined);
      }, 800);
    },
    [ep, userId],
  );
  useEffect(() => {
    if (!page || cover) return;
    anchor.current = anchorOf(page);
    persist({ page: anchor.current });
  }, [page, cover, persist]);

  const go = useCallback(
    (to: number) => {
      if (!pages || busy || to < 0 || to >= pages.length || to === p) return;
      stop();
      setMenu(false);
      const dir = to > p ? 1 : -1;
      if (reducedMotion()) {
        // A plain crossfade (CSS); no leaving page.
        setEnter(dir > 0 ? "r" : "l");
        setP(to);
        return;
      }
      setTurn({ from: p, dir });
      setEnter(dir > 0 ? "r" : "l");
      setP(to);
      setTimeout(() => setTurn(null), 460);
    },
    [pages, busy, p, stop],
  );

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (cover || (e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowRight") go(p + 1);
      else if (e.key === "ArrowLeft") go(p - 1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [go, p, cover]);

  const touchX = useRef<number | null>(null);

  const sparks = () => {
    const a = appRef.current;
    if (!a || reducedMotion()) return;
    for (let k = 0; k < 28; k++) {
      const s = document.createElement("i");
      s.className = "cb2-spark";
      s.style.background = SPARKS[k % SPARKS.length];
      a.appendChild(s);
      const g = Math.random() * Math.PI * 2;
      const d = 110 + Math.random() * 150;
      s.animate(
        [
          { transform: "translate(0,0)", opacity: 1 },
          { transform: `translate(${Math.cos(g) * d}px,${Math.sin(g) * d}px) rotate(${Math.random() * 540}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.2,.8,.3,1)" },
      ).onfinish = () => s.remove();
    }
  };

  const openBook = () => {
    if (opening) return;
    setOpening(true);
    setEnter("f");
    setOpenKey((k) => k + 1);
    sfx.flip();
    persist({ page: anchor.current });
    setTimeout(() => setCover(false), reducedMotion() ? 0 : 1150);
  };

  // ---------- items ----------
  const sec = (k: SecKey) => secs.find((s) => s.key === k);
  const clip = (k: SecKey, i: number): Clip[] => {
    const it = sec(k)?.items[i];
    if (!it) return [];
    if (k === "verbs" && it.exAudio) return [{ id: `${k}:${i}`, src: it.exAudio, wt: it.exWt }];
    return it.audio ? [{ id: `${k}:${i}`, src: it.audio }] : [];
  };
  const pageClips = (pg: Page) =>
    pg.kind !== "chapter" ? [] : pg.chunks ? pg.chunks.flatMap((c) => c.items.flatMap((i) => clip("words", i))) : pg.items!.flatMap((i) => clip(pg.sec, i));
  const lit = (id: string) => on?.id === id;

  const tile = (i: number, g: BookGroup) => {
    const it = sec("words")!.items[i];
    const id = `words:${i}`;
    return (
      <button
        key={i}
        type="button"
        className={`tile ${lit(id) ? "hl" : ""}`}
        style={{ ["--c" as string]: g.color }}
        onClick={() => play(clip("words", i))}
        data-testid="cb2-tile"
      >
        <span className="sp" aria-hidden>
          🔊
        </span>
        <b lang="en">{it.en}</b>
        <small className="es-line">{it.es}</small>
      </button>
    );
  };
  const verb = (i: number) => {
    const it: BookItem = sec("verbs")!.items[i];
    const id = `verbs:${i}`;
    const words = (it.exEn ?? "").split(/\s+/).filter(Boolean);
    return (
      <button key={i} type="button" className={`vcard ${lit(id) ? "hl" : ""}`} onClick={() => play(clip("verbs", i))} data-testid="cb2-verb">
        <span className="vt">
          <b lang="en">{it.en}</b>
          <small className="es-line">{it.es}</small>
        </span>
        {words.length > 0 && (
          <span className="ex" lang="en">
            {words.map((w, k) => (
              <span key={k} className={lit(id) && on!.word === k ? "on" : ""}>
                {w}{" "}
              </span>
            ))}
          </span>
        )}
        {it.exEs && <small className="es-line">{it.exEs}</small>}
      </button>
    );
  };
  const bubble = (i: number) => {
    const it = sec("phrases")!.items[i];
    const id = `phrases:${i}`;
    return (
      <button
        key={i}
        type="button"
        className={`bub ${i % 2 ? "r" : ""} ${lit(id) ? "hl" : ""}`}
        onClick={() => play(clip("phrases", i))}
        data-testid="cb2-bubble"
      >
        <b lang="en">{it.en}</b>
        <small className="es-line">{it.es}</small>
      </button>
    );
  };

  // ---------- review ----------
  const Q = book.review[qi];
  const pick = (k: number) => {
    if (!Q || right !== null) return;
    if (k === Q.answer) {
      setRight(k);
      setXp((x) => x + Q.xp);
      setToast(fill(t.correct, { xp: Q.xp }));
      setTimeout(() => setToast(""), 1400);
      sfx.correct();
      sparks();
      setTimeout(() => {
        setRight(null);
        setQi((q) => q + 1);
        if (qi + 1 >= book.review.length) {
          celebrate();
          void finish({ stay: true });
        }
      }, 1000);
    } else {
      sfx.wrong();
      setWrong(null);
      requestAnimationFrame(() => setWrong(k));
    }
  };

  const renderPage = (pg: Page, idx: number) => {
    if (pg.kind === "welcome") {
      const n = (k: SecKey) => sec(k)?.items.length ?? 0;
      return (
        <div className="welcome">
          <div className="kick">{fill(t.kicker, { n: book.ep })}</div>
          <h2 className="h">
            {book.title}
            {book.subEs && <span className="es-line es-title">{book.subEs}</span>}
          </h2>
          <div className="chips">
            <span>{fill(t.pages, { n: total })}</span>
            <span>{fill(t.minutes, { n: Math.max(3, Math.round(total * 0.75)) })}</span>
            <span className="amy">{t.amy}</span>
          </div>
          <div className="chap">
            {secs.map((s, si) => (
              <button
                key={s.key}
                type="button"
                className="chapb"
                style={{ ["--c" as string]: SEC_COLOR[s.key] }}
                onClick={() => go(pages!.findIndex((x) => x.kind === "chapter" && x.sec === s.key))}
                data-testid="cb2-chapter"
              >
                <span className="n">{si + 1}</span>
                <span>
                  <b lang="en">{s.title}</b>
                  <small>
                    {fill(t[s.key], { n: n(s.key) })}
                    {s.titleEs && <span className="es-line"> · {s.titleEs}</span>}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="big" onClick={() => go(1)} data-testid="cb2-start">
            {t.start}
          </button>
        </div>
      );
    }
    if (pg.kind === "review") {
      if (!Q)
        return (
          <div className="fin">
            <Logo className="medal" />
            <h2 className="h">{t.done}</h2>
            <p className="lead" style={{ margin: 0 }}>
              {fill(t.doneSub, { n: book.ep, xp: book.review.reduce((s, q) => s + q.xp, 0) })}
            </p>
            {audioHref && (
              <Link href={audioHref} className="big" data-testid="cb2-next-part">
                {t.next}
              </Link>
            )}
          </div>
        );
      return (
        <div className="q">
          <div className="kick">{t.review.toUpperCase()}</div>
          <span className="qp">{fill(t.question, { n: qi + 1, total: book.review.length, xp: Q.xp })}</span>
          <div className="qq">{Q.q}</div>
          <div className="opts">
            {Q.options.map((o, k) => (
              <button
                key={`${qi}-${k}`}
                type="button"
                className={`opt ${right === k ? "ok" : ""} ${wrong === k ? "no" : ""}`}
                onClick={() => pick(k)}
                onAnimationEnd={() => setWrong(null)}
                data-testid="cb2-opt"
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    }
    const s = sec(pg.sec)!;
    const first = pg.k === 0;
    const isCur = idx === p;
    return (
      <>
        <ChapterHead
          t={t}
          sec={pg.sec}
          page={pg}
          first={first}
          title={s.title}
          titleEs={s.titleEs}
          reading={isCur && reading}
          onRead={() => (reading ? stop() : play(pageClips(pg), true))}
        />
        {pg.chunks?.map((c, ci) => (
          <div key={`${c.group.key}-${ci}`} className="grp" style={{ ["--c" as string]: c.group.color }}>
            <h4>
              <i aria-hidden />
              {es ? c.group.nameEs : c.group.nameEn.toUpperCase()}
            </h4>
            <div className="tiles">{c.items.map((i) => tile(i, c.group))}</div>
          </div>
        ))}
        {pg.sec === "verbs" && <div className="vlist">{pg.items!.map((i) => verb(i))}</div>}
        {pg.sec === "phrases" && <div className="chat">{pg.items!.map((i) => bubble(i))}</div>}
      </>
    );
  };

  const label = (pg: Page | null) =>
    !pg ? "" : pg.kind === "welcome" ? t.welcome : pg.kind === "review" ? t.review : `${sec(pg.sec)?.title ?? ""}${pg.of > 1 ? ` · ${pg.k + 1}/${pg.of}` : ""}`;

  const pageEl = (idx: number, cls: string) => {
    const pg = pages![idx];
    return (
      <div
        key={`${idx}-${cls}-${openKey}`}
        className={`page ${cls}`}
        style={{ ["--edge" as string]: (1 - idx / Math.max(1, total)).toFixed(2) }}
        aria-hidden={cls.startsWith("leave")}
        data-testid={cls.startsWith("leave") ? undefined : "cb2-page"}
      >
        {renderPage(pg, idx)}
        <span className="sweep" aria-hidden />
        <span className="folio" aria-hidden>
          — {idx + 1} —
        </span>
      </div>
    );
  };

  return (
    <div className={`cb2 ${es ? "" : "hide-es"}`} ref={appRef} style={{ ["--page-h" as string]: `${pageH}px` }}>
      <div className="bar">
        <Link href={episodeHref} className="back" aria-label={t.backAria}>
          ‹
        </Link>
        <Logo />
        <div className="tt">
          <b>{fill(t.book, { n: book.ep })}</b>
          <small aria-live="polite">{label(page)}</small>
        </div>
        <span className="xp">⚡ {xp} XP</span>
        {originalHref && (
          <div className="menu">
            <button type="button" className="dots" aria-label={t.menu} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              ⋯
            </button>
            {menu && (
              <div className="pop" role="menu">
                <a role="menuitem" href={originalHref}>
                  {t.original}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="bar row2">
        <div className="tog" role="group">
          <button type="button" className={es ? "on" : ""} aria-pressed={es} onClick={() => setEs(true)} data-testid="cb2-es">
            {t.withEs}
          </button>
          <button type="button" className={es ? "" : "on"} aria-pressed={!es} onClick={() => setEs(false)} data-testid="cb2-en">
            {t.onlyEn}
          </button>
        </div>
        {!cover && (
          <button
            type="button"
            className="seecover"
            onClick={() => {
              stop();
              setOpening(false);
              setCover(true);
            }}
          >
            {t.seeCover}
          </button>
        )}
      </div>
      <div className="rail" aria-hidden>
        {Array.from({ length: total }, (_, k) => (
          <i key={k} className={k < p ? "done" : k === p ? "cur" : ""} />
        ))}
      </div>

      <div className="pagewrap">
        <div
          className="pages"
          ref={pagesBox}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 60) go(dx < 0 ? p + 1 : p - 1);
          }}
        >
          {pages && turn && pageEl(turn.from, turn.dir > 0 ? "leave-l" : "leave-r")}
          {pages && pageEl(p, enter ? `enter-${enter}` : "")}
          {/* The measuring page: same size and styles, never shown. */}
          <div className="page measure" ref={measure} aria-hidden>
            {secs.map((s, si) => (
              <div key={s.key}>
                <div data-m={`full-${s.key}`}>
                  <ChapterHead t={t} sec={s.key} page={{ chap: si + 1, k: 0, of: 2 }} first title={s.title} titleEs={s.titleEs} />
                </div>
                <div data-m={`cont-${s.key}`}>
                  <ChapterHead t={t} sec={s.key} page={{ chap: si + 1, k: 1, of: 2 }} first={false} title={s.title} titleEs={s.titleEs} />
                </div>
                {s.key === "words" &&
                  groups.map((g) => (
                    <div key={g.key} className="grp" style={{ ["--c" as string]: g.color }}>
                      <h4 data-m={`head-${g.key}`}>
                        <i />
                        {es ? g.nameEs : g.nameEn.toUpperCase()}
                      </h4>
                      <div className="tiles" data-m={`tiles-${g.key}`}>
                        {g.items.map((i) => tile(i, g))}
                      </div>
                    </div>
                  ))}
                {s.key === "verbs" && (
                  <div className="vlist">
                    {s.items.map((_, i) => (
                      <div key={i} data-mi={`verbs:${i}`}>
                        {verb(i)}
                      </div>
                    ))}
                  </div>
                )}
                {s.key === "phrases" && (
                  <div className="chat">
                    {s.items.map((_, i) => (
                      <div key={i} data-mi={`phrases:${i}`} className="mwrap">
                        {bubble(i)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="nav" ref={navRef}>
        <div className="arw">
          <button type="button" onClick={() => go(p - 1)} disabled={p === 0} aria-label={t.prevAria} data-testid="cb2-prev">
            <Chevron left />
          </button>
        </div>
        <span>{fill(t.pageOf, { n: p + 1, total })}</span>
        <div className="arw">
          <button type="button" onClick={() => go(p + 1)} disabled={p >= total - 1} aria-label={t.nextAria} data-testid="cb2-next">
            <Chevron />
          </button>
        </div>
      </div>

      {toast && (
        <div className="cb2-toast" role="status">
          {toast}
        </div>
      )}

      {cover && (
        <div className={`cb2-cover ${opening ? "opening" : ""}`} data-testid="cb2-cover">
          {DOTS.map((d, k) => (
            <i key={k} className="dot" style={{ width: d.s, height: d.s, left: `${d.l}%`, top: `${d.t}%`, background: d.c, animationDelay: `${d.d}s` }} />
          ))}
          <div className="hdr">
            {/* Ludo's thumbnails carry the CelsTV logo themselves; the "e" sits by the title, never over the art. */}
            <Logo />
            {fill(t.kicker, { n: book.ep })}
          </div>
          <div className="book" style={{ aspectRatio: String(ratio), ["--r" as string]: ratio }}>
            <div className="front">
              {book.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- the episode's thumbnail (Ludo's), public
                <img
                  className="art-img"
                  src={book.image}
                  alt={book.title}
                  onLoad={(e) => {
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                    if (w && h) setRatio(w / h);
                  }}
                />
              ) : (
                <div className="art" aria-hidden />
              )}
              <div className="spine" aria-hidden />
              <div className="sheen" aria-hidden />
            </div>
          </div>
          <button type="button" className="open-btn" onClick={openBook} data-testid="cb2-open">
            {t.open}
          </button>
        </div>
      )}
    </div>
  );
}

function containsAnchor(pg: Extract<Page, { kind: "chapter" }>, a: string) {
  const [k, i] = a.split(":");
  if (k !== pg.sec) return false;
  const n = Number(i);
  return pg.chunks ? pg.chunks.some((c) => c.items.includes(n)) : pg.items!.includes(n);
}
