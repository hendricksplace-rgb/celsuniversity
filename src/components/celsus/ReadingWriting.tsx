"use client";

// CelsUS "Lectura y Escritura" (C-006, celsus-lectura-escritura-mockup.html): the USCIS rules, the official reading
// and writing vocabulary (tap to hear, Amy), 20 reading sentences (listen with word highlighting, slower, Spanish,
// "Ya la leí") and 20 writing sentences (copy or dictation by Brian, checked word by word the way USCIS scores).
// Progress is saved per student in progress.flashcard_state.rw; the lesson is complete at 20 read + 15 written.
import "./reading-writing.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fileRoute } from "@/components/reader/media";
import { usePartDone } from "@/components/lesson/progress";
import { fill } from "@/components/course/kit";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["rw"];
type Item = { word: string; audio: string };
type Sentence = { id: string; text: string; es: string; topic: string; audio: string; wt?: number[] };
export type RwData = {
  checked?: string;
  source_urls?: string[];
  rules_es: string[];
  rules_en: string[];
  reading_vocab: { category: string; items: Item[] }[];
  writing_vocab: { category: string; items: Item[] }[];
  reading_sentences: Sentence[];
  writing_sentences: Sentence[];
  settings?: { complete_rule?: { reading_done?: number; writing_correct?: number } };
};
/** Saved per student (progress.flashcard_state.rw). */
export type RwState = { heardR: string[]; heardW: string[]; readDone: string[]; writeOk: string[]; writeTried: string[]; ri: number; wi: number; mode: "copy" | "dict"; tab: number };
const EMPTY: RwState = { heardR: [], heardW: [], readDone: [], writeOk: [], writeTried: [], ri: 0, wi: 0, mode: "copy", tab: 0 };

/* ---------- the USCIS-style checker (from the mockup) ---------- */
const NUMS: Record<string, string> = { "100": "one hundred", "50": "fifty", "1st": "first", "2nd": "second" };
function toks(s: string) {
  s = s
    .toLowerCase()
    .replace(/\b(100|50|1st|2nd)\b/g, (m) => NUMS[m])
    .replace(/[’`]/g, "'");
  return s
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
/** Edit distance with adjacent transpositions ("frist" ~ "first"). */
function lev(a: string, b: string) {
  const D: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    D.push([i]);
    for (let j = 1; j <= b.length; j++) D[i][j] = i ? 0 : j;
  }
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, D[i - 2][j - 2] + 1);
      D[i][j] = v;
    }
  return D[a.length][b.length];
}
const close = (a: string, b: string) => (a === b ? 0 : b.length >= 4 && lev(a, b) <= (b.length >= 7 ? 2 : 1) ? 1 : 2);
type Cell = { t: "g" | "a" | "r" | "m"; w: string; exp?: string };
/** Aligns the target with what was typed (DP, cheapest path), allowing near matches (spelling). */
function align(T: string[], U: string[]): Cell[] {
  const n = T.length;
  const m = U.length;
  const C: number[][] = [];
  const B: string[][] = [];
  for (let i = 0; i <= n; i++) {
    C.push(Array(m + 1).fill(0));
    B.push(Array(m + 1).fill(""));
  }
  for (let i = 1; i <= n; i++) {
    C[i][0] = i;
    B[i][0] = "del";
  }
  for (let j = 1; j <= m; j++) {
    C[0][j] = j;
    B[0][j] = "ins";
  }
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const c = close(U[j - 1], T[i - 1]);
      const opts: [number, string][] = [
        [C[i - 1][j] + 1, "del"],
        [C[i][j - 1] + 1, "ins"],
      ];
      if (c < 2) opts.push([C[i - 1][j - 1] + c * 0.5, c ? "near" : "eq"]);
      else opts.push([C[i - 1][j - 1] + 1.6, "sub"]);
      opts.sort((a, b) => a[0] - b[0]);
      C[i][j] = opts[0][0];
      B[i][j] = opts[0][1];
    }
  const out: Cell[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const b = B[i][j];
    if (b === "eq") out.push({ t: "g", w: U[j - 1] });
    else if (b === "near") out.push({ t: "a", w: U[j - 1], exp: T[i - 1] });
    else if (b === "sub") out.push({ t: "m", w: T[i - 1] }, { t: "r", w: U[j - 1] });
    else if (b === "del") out.push({ t: "m", w: T[i - 1] });
    else out.push({ t: "r", w: U[j - 1] });
    if (b !== "ins") i--;
    if (b !== "del") j--;
  }
  return out.reverse();
}
const SHORT = new Set(["the", "a", "in", "of", "on", "to", "and", "for"]);
/** USCIS: an abbreviation of a dictated word fails ("D.C." is itself the dictated form). */
const ABBREV = /\b(U\.?\s?S\.?A?\.?|Pres|Wash|Sen|Calif|Mex|Ind|Sept?|Feb|Nov|Oct)(\.|\b)/;
export function checkWriting(target: string, typed: string) {
  const A = align(toks(target), toks(typed));
  const missing = A.filter((x) => x.t === "m");
  const extra = A.filter((x) => x.t === "r");
  const near = A.filter((x) => x.t === "a");
  const missContent = missing.filter((x) => !SHORT.has(x.w));
  const abbrev = ABBREV.test(typed);
  return { cells: A, ok: !missContent.length && !extra.length && !abbrev, abbrev, near: near.length, missing: missing.length, missContent: missContent.length, extra: extra.length };
}

/* ---------- audio: one clip at a time, signed on request ---------- */
function usePlayer() {
  const el = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [word, setWord] = useState(-1);
  const stop = useCallback(() => {
    el.current?.pause();
    el.current = null;
    setPlaying(null);
    setWord(-1);
  }, []);
  useEffect(() => stop, [stop]);
  const play = useCallback(
    (key: string, ref: string, opts: { rate?: number; wt?: number[] } = {}) => {
      el.current?.pause();
      const a = new Audio(fileRoute(ref));
      a.playbackRate = opts.rate ?? 1;
      el.current = a;
      setPlaying(key);
      setWord(-1);
      if (opts.wt?.length) a.ontimeupdate = () => setWord(opts.wt!.findLastIndex((s) => s <= a.currentTime + 0.04));
      const reset = () => {
        setPlaying(null);
        setWord(-1);
      };
      a.onended = () => {
        if (el.current === a) reset();
      };
      void a.play().catch(reset);
    },
    [],
  );
  return { play, stop, playing, word };
}

export function ReadingWriting({ data, t, lang, userId, lessonId, saved }: { data: RwData; t: T; lang: "es" | "en"; userId: string; lessonId: string; saved: Partial<RwState> | null }) {
  const [st, setSt] = useState<RwState>(() => ({ ...EMPTY, ...(saved ?? {}) }));
  const player = usePlayer();
  const partDone = usePartDone();
  const need = { read: data.settings?.complete_rule?.reading_done ?? 20, write: data.settings?.complete_rule?.writing_correct ?? 15 };

  // Save (debounced) to progress.flashcard_state.rw: survives a reload and works on any device.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(st);
  latest.current = st;
  const flush = useCallback(async () => {
    const now = new Date().toISOString();
    await createClient()
      .from("progress")
      .upsert({ user_id: userId, lesson_id: lessonId, flashcard_state: { rw: latest.current }, last_activity: now, client_updated_at: now }, { onConflict: "user_id,lesson_id" });
  }, [userId, lessonId]);
  const update = (f: (s: RwState) => RwState) => {
    setSt((s) => f(s));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 700);
  };
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void flush();
      }
    },
    [flush],
  );

  const complete = st.readDone.length >= need.read && st.writeOk.length >= need.write;
  useEffect(() => {
    if (complete) partDone();
  }, [complete, partDone]);

  const go = (tab: number) => {
    player.stop();
    update((s) => ({ ...s, tab }));
    if (typeof window !== "undefined") document.getElementById("rw-top")?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="rw" id="rw-top">
      <header className="top">
        <div className="wrap">
          <div className="crumb">{t.crumb}</div>
          <h1>{t.title}</h1>
          <p className="sub">{t.sub}</p>
        </div>
      </header>
      <nav className="tabs" aria-label={t.title}>
        <div className="wrap" role="tablist">
          {t.tabs.map((label, i) => (
            <button key={label} type="button" className="tab" role="tab" aria-selected={st.tab === i} onClick={() => go(i)}>
              <span className="n">{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
      </nav>
      <div className="rwmain">
        <div className="wrap">
          {st.tab === 0 && <How data={data} t={t} lang={lang} onNext={() => go(1)} />}
          {st.tab === 1 && <Vocab kind="r" data={data} t={t} st={st} update={update} player={player} onNext={() => go(2)} />}
          {st.tab === 2 && <ReadPractice data={data} t={t} st={st} update={update} player={player} />}
          {st.tab === 3 && <Vocab kind="w" data={data} t={t} st={st} update={update} player={player} onNext={() => go(4)} />}
          {st.tab === 4 && <WritePractice data={data} t={t} st={st} update={update} player={player} />}
          {st.tab === 5 && <Progress data={data} t={t} st={st} update={update} complete={complete} />}
        </div>
      </div>
    </div>
  );
}

type Player = ReturnType<typeof usePlayer>;
type Ctl = { data: RwData; t: T; st: RwState; update: (f: (s: RwState) => RwState) => void; player: Player };
const Html = ({ html, as: Tag = "span", className }: { html: string; as?: "span" | "p" | "div"; className?: string }) => <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
const toggle = (list: string[], id: string, on: boolean) => (on ? (list.includes(id) ? list : [...list, id]) : list.filter((x) => x !== id));

function How({ data, t, lang, onNext }: { data: RwData; t: T; lang: "es" | "en"; onNext: () => void }) {
  const rules = lang === "en" ? data.rules_en : data.rules_es;
  return (
    <section className="on">
      <h2>{t.howTitle}</h2>
      <p className="lead">{t.howLead}</p>
      <div className="grid2">
        <div className="card rule-card">
          <h3>{t.readCard}</h3>
          <Html as="p" className="big-rule" html={t.readRule} />
          <ul className="clean">
            {t.readHow.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className="okx">
            <div className="y">
              <strong>{t.ok}</strong>
              {t.readOk}
            </div>
            <div className="n">
              <strong>{t.notOk}</strong>
              {t.readNo}
            </div>
          </div>
        </div>
        <div className="card rule-card w">
          <h3>{t.writeCard}</h3>
          <Html as="p" className="big-rule" html={t.writeRule} />
          <ul className="clean">
            {t.writeHow.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className="okx">
            <div className="y">
              <strong>{t.ok}</strong>
              {t.writeOk}
            </div>
            <div className="n">
              <strong>{t.notOk}</strong>
              {t.writeNo}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <h3>{t.rulesTitle}</h3>
        <ul className="clean">
          {rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <Html as="div" className="note" html={t.listsNote} />
      <Html as="div" className="note navy" html={t.sameNote} />
      {!!data.source_urls?.length && (
        <p className="src">
          {t.sources}:{" "}
          {data.source_urls.map((u, i) => (
            <span key={u}>
              {i > 0 && " · "}
              <a href={u} target="_blank" rel="noopener noreferrer">
                {u.replace(/^https?:\/\/(www\.|public-inspection\.)?/, "").split("/").pop()}
              </a>
            </span>
          ))}
          {data.checked && <> {fill(t.reviewed, { d: data.checked })}</>}
        </p>
      )}
      <div className="next-wrap">
        <button type="button" className="btn primary" onClick={onNext}>
          {t.start}
        </button>
      </div>
    </section>
  );
}

function Vocab({ kind, data, t, st, update, player, onNext }: Ctl & { kind: "r" | "w"; onNext: () => void }) {
  const list = kind === "r" ? data.reading_vocab : data.writing_vocab;
  const heard = kind === "r" ? st.heardR : st.heardW;
  const total = list.reduce((a, c) => a + c.items.length, 0);
  return (
    <section className="on">
      <h2>{kind === "r" ? t.vocabRTitle : t.vocabWTitle}</h2>
      <p className="lead">{kind === "r" ? t.vocabRLead : t.vocabWLead}</p>
      <div className="prog">
        <div className="bar">
          <i style={{ width: `${(100 * heard.length) / total}%` }} />
        </div>
        <span className="lbl">{fill(t.heard, { n: heard.length, m: total })}</span>
      </div>
      {list.map((c) => (
        <div className="cat" key={c.category}>
          <h3>
            {t.cats[c.category] ?? c.category}
            {t.cats[c.category] !== c.category && <small lang="en">{c.category}</small>}
          </h3>
          <div className="chips">
            {c.items.map((it) => {
              const id = `${c.category}|${it.word}`;
              return (
                <button
                  key={id}
                  type="button"
                  lang="en"
                  className={`chip${heard.includes(id) ? " heard" : ""}${player.playing === id ? " playing" : ""}`}
                  onClick={() => {
                    player.play(id, it.audio);
                    update((s) => (kind === "r" ? { ...s, heardR: toggle(s.heardR, id, true) } : { ...s, heardW: toggle(s.heardW, id, true) }));
                  }}
                >
                  <span className="ic" aria-hidden>
                    🔊
                  </span>
                  {it.word.split("/").join(" / ")}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="next-wrap">
        <button type="button" className="btn primary" onClick={onNext}>
          {kind === "r" ? t.nextReadPractice : t.nextWritePractice}
        </button>
      </div>
    </section>
  );
}

function Words({ text, word }: { text: string; word: number }) {
  return (
    <>
      {text.split(/(\s+)/).map((w, i) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <span key={i} className={`w${Math.floor(i / 2) === word ? " hl" : ""}`}>
            {w}
          </span>
        ),
      )}
    </>
  );
}

function Dots({ items, cur, cls, onPick, label }: { items: Sentence[]; cur: number; cls: (s: Sentence) => string; onPick: (i: number) => void; label: (n: number) => string }) {
  return (
    <div className="dots">
      {items.map((s, i) => (
        <button key={s.id} type="button" className={`dot${i === cur ? " cur" : ""} ${cls(s)}`} aria-label={label(i + 1)} aria-current={i === cur ? "true" : undefined} onClick={() => onPick(i)}>
          {i + 1}
        </button>
      ))}
    </div>
  );
}

function ReadPractice({ data, t, st, update, player }: Ctl) {
  const list = data.reading_sentences;
  const i = Math.min(st.ri, list.length - 1);
  const it = list[i];
  const [slow, setSlow] = useState(false);
  const [es, setEs] = useState(false);
  const done = st.readDone.includes(it.id);
  const key = `r:${it.id}`;
  const pick = (k: number) => {
    player.stop();
    update((s) => ({ ...s, ri: k }));
  };
  const total = list.length;
  return (
    <section className="on">
      <h2>{t.readTitle}</h2>
      <p className="lead">{t.readLead}</p>
      <div className="prog">
        <div className="bar">
          <i style={{ width: `${(100 * st.readDone.length) / total}%` }} />
        </div>
        <span className="lbl">{fill(t.readCount, { n: st.readDone.length })}</span>
      </div>
      <Dots items={list} cur={i} cls={(s) => (st.readDone.includes(s.id) ? "done" : "")} onPick={pick} label={(n) => fill(t.sentence, { n, m: total })} />
      <div className="scard">
        <div className="meta">
          <span>{fill(t.sentence, { n: i + 1, m: total })}</span>
          <span className="pill">{t.topics[it.topic] ?? it.topic}</span>
        </div>
        {done && (
          <div className="done-tag">
            <div className="seal" aria-hidden>
              ✓
            </div>
          </div>
        )}
        <p className="sentence" lang="en">
          <Words text={it.text} word={player.playing === key ? player.word : -1} />
        </p>
        {es && (
          <div className="es" lang="es">
            {it.es}
          </div>
        )}
      </div>
      <div className="row fill">
        <button type="button" className="btn primary" onClick={() => player.play(key, it.audio, { rate: slow ? 0.75 : 1, wt: it.wt })}>
          {t.listen}
        </button>
        <button type="button" className="btn" aria-pressed={slow} onClick={() => setSlow(!slow)}>
          {t.slower}
        </button>
        <button type="button" className="btn ghost" aria-pressed={es} onClick={() => setEs(!es)}>
          {es ? t.hideEs : t.showEs}
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn gold"
          style={{ width: "100%" }}
          onClick={() => {
            update((s) => ({ ...s, readDone: toggle(s.readDone, it.id, !done) }));
            if (!done && i < total - 1) setTimeout(() => pick(i + 1), 650);
          }}
        >
          {done ? t.unmarkRead : t.markRead}
        </button>
      </div>
      <div className="pager">
        <button type="button" className="btn ghost" disabled={i === 0} onClick={() => pick(i - 1)}>
          {t.prev}
        </button>
        <button type="button" className="btn ghost" disabled={i === total - 1} onClick={() => pick(i + 1)}>
          {t.next}
        </button>
      </div>
    </section>
  );
}

function WritePractice({ data, t, st, update, player }: Ctl) {
  const list = data.writing_sentences;
  const i = Math.min(st.wi, list.length - 1);
  const it = list[i];
  const dict = st.mode === "dict";
  const [slow, setSlow] = useState(false);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<ReturnType<typeof checkWriting> | "empty" | null>(null);
  const key = `w:${it.id}`;
  const total = list.length;
  const pick = (k: number) => {
    player.stop();
    setTyped("");
    setResult(null);
    update((s) => ({ ...s, wi: k }));
  };
  const mode = (m: RwState["mode"]) => {
    player.stop();
    setTyped("");
    setResult(null);
    update((s) => ({ ...s, mode: m }));
  };
  const check = () => {
    const raw = typed.trim();
    if (!raw) return setResult("empty");
    const r = checkWriting(it.text, raw);
    setResult(r);
    update((s) => ({ ...s, writeTried: toggle(s.writeTried, it.id, true), writeOk: r.ok ? toggle(s.writeOk, it.id, true) : s.writeOk }));
  };
  const ok = st.writeOk.includes(it.id);
  return (
    <section className="on">
      <h2>{t.writeTitle}</h2>
      <p className="lead">{t.writeLead}</p>
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={!dict} onClick={() => mode("copy")}>
          {t.copy}
        </button>
        <button type="button" role="tab" aria-selected={dict} onClick={() => mode("dict")}>
          {t.dictation}
        </button>
      </div>
      <div className="prog">
        <div className="bar">
          <i style={{ width: `${(100 * st.writeOk.length) / total}%` }} />
        </div>
        <span className="lbl">{fill(t.correctCount, { n: st.writeOk.length })}</span>
      </div>
      <Dots
        items={list}
        cur={i}
        cls={(s) => (st.writeOk.includes(s.id) ? "done" : st.writeTried.includes(s.id) ? "bad" : "")}
        onPick={pick}
        label={(n) => fill(t.sentence, { n, m: total })}
      />
      <div className="scard">
        <div className="meta">
          <span>{fill(t.sentence, { n: i + 1, m: total })}</span>
          <span className="pill">{t.topics[it.topic] ?? it.topic}</span>
        </div>
        {ok && (
          <div className="done-tag">
            <div className="seal" aria-hidden>
              ✓
            </div>
          </div>
        )}
        {dict ? (
          <div className="hidden-sent">{t.hidden}</div>
        ) : (
          <p className="sentence" lang="en">
            <Words text={it.text} word={player.playing === key ? player.word : -1} />
          </p>
        )}
        <div className="row fill">
          <button type="button" className="btn primary" onClick={() => player.play(key, it.audio, { rate: slow ? 0.75 : 1, wt: dict ? undefined : it.wt })}>
            {dict ? t.dictate : t.listen}
          </button>
          <button type="button" className="btn" aria-pressed={slow} onClick={() => setSlow(!slow)}>
            {t.slower}
          </button>
        </div>
        <label className="inl" htmlFor="rw-input">
          {t.typeHere}
        </label>
        <textarea
          id="rw-input"
          lang="en"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          placeholder={t.placeholder}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn gold" style={{ width: "100%" }} onClick={check}>
            {t.check}
          </button>
        </div>
        {result === "empty" ? (
          <div className="result">{t.writeFirst}</div>
        ) : (
          result && <WriteResult r={result} it={it} t={t} />
        )}
      </div>
      <div className="pager">
        <button type="button" className="btn ghost" disabled={i === 0} onClick={() => pick(i - 1)}>
          {t.prev}
        </button>
        <button type="button" className="btn ghost" disabled={i === total - 1} onClick={() => pick(i + 1)}>
          {t.next}
        </button>
      </div>
      <div className="note" style={{ marginTop: 14 }}>
        <strong>{t.tipTitle}</strong> <Html html={t.tip} />
      </div>
      <div className="note navy">
        <strong>{t.paperTitle}</strong> {t.paper}
      </div>
    </section>
  );
}

function WriteResult({ r, it, t }: { r: ReturnType<typeof checkWriting>; it: Sentence; t: T }) {
  return (
    <div className="result" role="status">
      {r.ok ? (
        <div className="verdict">
          <div className="seal lg" aria-hidden>
            ✓
          </div>
          <div>
            <h3>{!r.near && !r.missing ? t.perfect : t.passed}</h3>
            <div>
              {!r.near && !r.missing ? t.perfectSub : t.passedSub} {r.near ? t.spellHint : ""} {r.missing ? t.shortHint : ""}
            </div>
          </div>
        </div>
      ) : (
        <div className="verdict">
          <div>
            <h3 style={{ color: "var(--bad)" }}>{t.retry}</h3>
            <div>
              {r.abbrev && <Html html={`${t.noAbbrev} `} />}
              {r.missContent ? `${t.missingWords} ` : ""}
              {r.extra ? t.extraWords : ""}
            </div>
          </div>
        </div>
      )}
      <div className="cmp" lang="en">
        {r.cells.map((x, k) => (
          <span key={k} className={x.t} title={x.t === "a" ? fill(t.spelled, { w: x.exp ?? "" }) : x.t === "m" ? t.missing : undefined}>
            {x.w}
          </span>
        ))}
      </div>
      <div className="legend">
        <span className="lg">{t.legendOk}</span>
        <span className="la">{t.legendSpell}</span>
        <span className="lr">{t.legendBad}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 15, color: "var(--muted)" }}>{t.correctLine}</div>
      <p className="correct-line" lang="en">
        {it.text}
      </p>
      <div style={{ fontSize: 16, color: "var(--muted)" }} lang="es">
        {it.es}
      </div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>{t.scoring}</div>
    </div>
  );
}

function Progress({ data, t, st, update, complete }: Omit<Ctl, "player"> & { complete: boolean }) {
  const totalR = data.reading_vocab.reduce((a, c) => a + c.items.length, 0);
  const totalW = data.writing_vocab.reduce((a, c) => a + c.items.length, 0);
  const r = st.readDone.length;
  const w = st.writeOk.length;
  const ring = (n: number) => ({ ["--p" as string]: (100 * n) / 20 }) as React.CSSProperties;
  return (
    <section className="on">
      <h2>{t.progressTitle}</h2>
      <p className="lead">{t.progressLead}</p>
      <div className="sum">
        <div className="card stat">
          <div className="ring" style={ring(r)}>
            <div>
              <span className="num">{r}</span>
            </div>
          </div>
          <div className="of">{t.readStat}</div>
        </div>
        <div className="card stat">
          <div className="ring" style={ring(w)}>
            <div>
              <span className="num">{w}</span>
            </div>
          </div>
          <div className="of">{t.writeStat}</div>
        </div>
        <div className="card stat">
          <div className="num" style={{ fontSize: 34 }}>
            {st.heardR.length} / {totalR}
          </div>
          <div className="of">{t.vocabRStat}</div>
        </div>
        <div className="card stat">
          <div className="num" style={{ fontSize: 34 }}>
            {st.heardW.length} / {totalW}
          </div>
          <div className="of">{t.vocabWStat}</div>
        </div>
      </div>
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }} role="status">
        <div className="seal lg" style={complete ? undefined : { filter: "grayscale(.7)", opacity: 0.6 }} aria-hidden>
          ★
        </div>
        <div>
          <h3>{complete ? t.doneTitle : t.keepTitle}</h3>
          {complete ? t.doneText : t.keepText}
        </div>
      </div>
      <div className="row fill">
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            if (window.confirm(t.resetAsk)) update((s) => ({ ...EMPTY, tab: s.tab }));
          }}
        >
          {t.reset}
        </button>
      </div>
    </section>
  );
}
