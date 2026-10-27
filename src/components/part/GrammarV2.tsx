"use client";

// CelsTV Grammar v2 (celstv-grammar-todas-mockup.html): one style for every section and episode. Everything a
// student reads has Amy's audio; paragraphs light up word by word while she speaks. EN | ES switches only the
// instructions and explanations; examples, options and readings stay in English. Each finished section opens
// "¡Sección terminada!" (SectionDone, C-022); the last one finishes the part.
import "./grammar-v2.css";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fileRoute } from "@/components/reader/media";
import { fill } from "@/components/course/kit";
import { taskItems, type G2Block, type G2Section, type G2Task, type GrammarV2 } from "@/lib/grammar-v2";
import { usePartShell } from "./PartShell";
import { SectionDone } from "./SectionDone";
import { sfx } from "./fx";

type L = Dictionary["g2"]["es"];
type Lang = "en" | "es";
const LANG_KEY = "celsu_g2_lang";

/* ---------- audio: one clip at a time, the word being said from currentTime on every frame ---------- */
let current: { a: HTMLAudioElement; stop: () => void } | null = null;
function playClip(ref: string | undefined, onWord?: (k: number) => void, wt?: number[], done?: () => void) {
  current?.stop();
  if (!ref) return done?.();
  const a = new Audio(fileRoute(ref));
  let raf = 0;
  let ended = false;
  const stop = () => {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    a.pause();
    if (current?.a === a) current = null;
    done?.();
  };
  current = { a, stop };
  if (onWord && wt?.length) {
    const tick = () => {
      const t = a.currentTime;
      let k = -1;
      for (let i = 0; i < wt.length; i++) if (t >= wt[i] - 0.02) k = i;
      onWord(k);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  a.onended = stop;
  a.onerror = stop;
  void a.play().catch(stop);
}

const Play = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);
const Spk = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
  </svg>
);

function Say({ refPath, label, onPlay }: { refPath?: string; label: string; onPlay?: () => void }) {
  const [on, setOn] = useState(false);
  if (!refPath) return null;
  return (
    <button
      type="button"
      className={`g2-say${on ? " on" : ""}`}
      onClick={() => {
        if (onPlay) return onPlay();
        setOn(true);
        playClip(refPath, undefined, undefined, () => setOn(false));
      }}
    >
      <Play /> {label}
    </button>
  );
}

/** "I am Carla." → subject in cyan, the grammar point in pink. */
function Marked({ text, hl }: { text: string; hl: RegExp | null }) {
  const sub = /^(I|You|He|She|It|We|They|My \w+|This|These)\b/.exec(text);
  const head = sub ? sub[0] : "";
  const rest = text.slice(head.length);
  const out: React.ReactNode[] = [];
  if (head) out.push(<span key="s" className="g2-sub">{head}</span>);
  if (!hl) out.push(rest);
  else {
    let last = 0;
    for (const m of rest.matchAll(new RegExp(hl.source, "g"))) {
      if (m.index! > last) out.push(rest.slice(last, m.index));
      out.push(<span key={m.index} className="g2-hl">{m[0]}</span>);
      last = m.index! + m[0].length;
    }
    out.push(rest.slice(last));
  }
  return <>{out}</>;
}

/** Words that light up while Amy reads them. */
function Karaoke({ text, k, className }: { text: string; k: number; className?: string }) {
  let i = -1;
  return (
    <span className={className}>
      {text.split(/(\s+)/).map((p, j) => {
        if (!p.trim()) return <Fragment key={j}>{p}</Fragment>;
        i++;
        return (
          <span key={j} className={`g2-w${i === k ? " now" : i < k && k >= 0 ? " past" : ""}`}>
            {p}
          </span>
        );
      })}
    </span>
  );
}

function useKaraoke() {
  const [k, setK] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const start = useCallback((ref: string, wt?: number[]) => {
    setPlaying(true);
    playClip(ref, setK, wt, () => {
      setPlaying(false);
      setK(-1);
    });
  }, []);
  return { k, playing, start };
}

/* ---------- blocks ---------- */
function Para({ b, lang, l }: { b: Extract<G2Block, { t: "para" }>; lang: Lang; l: L }) {
  const { k, playing, start } = useKaraoke();
  // The audio is in English: while it plays, the card shows the English text.
  const en = lang === "en" || playing;
  return (
    <div className="g2-card">
      <div className="g2-lbl">
        <span>{l.explanation}</span>
        <button type="button" className={`g2-say${playing ? " on" : ""}`} onClick={() => start(b.audio, b.wt)}>
          <Play /> {l.listen}
        </button>
      </div>
      <p className={`g2-para${en ? "" : " es"}`} lang={en ? "en" : "es"}>
        {en ? <Karaoke text={b.en} k={k} /> : b.es}
      </p>
      {!en && l.esNote && <p className="g2-esnote">{l.esNote}</p>}
    </div>
  );
}

function Tap({ refPath, className, children }: { refPath: string; className: string; children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      className={`${className}${on ? " on" : ""}`}
      onClick={() => {
        setOn(true);
        playClip(refPath, undefined, undefined, () => setOn(false));
      }}
    >
      {children}
    </button>
  );
}

function Block({ b, lang, l, hl }: { b: G2Block; lang: Lang; l: L; hl: RegExp | null }) {
  switch (b.t) {
    case "para":
      return <Para b={b} lang={lang} l={l} />;
    case "examples":
      return (
        <div className="g2-card">
          <div className="g2-lbl">
            <span>{lang === "es" ? b.label_es : b.label_en}</span>
          </div>
          <div className="g2-exl" lang="en">
            {b.items.map((x, i) => (
              <Tap key={i} refPath={x.audio} className="g2-ex">
                <span>
                  <Marked text={x.en} hl={hl} />
                </span>
                <span className="g2-spk">
                  <Spk />
                </span>
              </Tap>
            ))}
          </div>
        </div>
      );
    case "pairs": {
      const wide = b.items.some((p) => p.a.length > 10);
      return (
        <div className="g2-card">
          <div className="g2-lbl">
            <span>{l.pairs}</span>
          </div>
          <div className="g2-pairs" lang="en">
            {b.items.map((p, i) => (
              <Tap key={i} refPath={p.audio} className={`g2-pair${wide ? " wide" : ""}`}>
                {p.a}
                <i aria-hidden>→</i>
                <b>{p.b}</b>
              </Tap>
            ))}
          </div>
        </div>
      );
    }
    case "table":
      return <Table b={b} hl={hl} />;
    case "reading":
      return <Reading b={b} lang={lang} l={l} />;
    case "phonics":
      return (
        <div className="g2-card">
          <div className="g2-lbl">
            <span>Phonics</span>
            <Say refPath={b.audio_desc} label={l.listen} />
          </div>
          <p className={`g2-para${lang === "es" ? " es" : ""}`} style={{ marginBottom: 12 }}>
            {lang === "es" ? b.es : b.en}
          </p>
          {b.families.map((f, i) => (
            <div key={i} className="g2-fam">
              <h4>
                {lang === "es" ? f.es : f.en} {f.audio && <Say refPath={f.audio} label="" />}
              </h4>
              <div className="g2-tiles" lang="en">
                {f.words.map((w, j) => (
                  <Tap key={j} refPath={w.audio} className="g2-tile">
                    <b>{w.w}</b>
                    <small>{w.ipa}</small>
                  </Tap>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
  }
}

function Table({ b, hl }: { b: Extract<G2Block, { t: "table" }>; hl: RegExp | null }) {
  const [on, setOn] = useState(-1);
  return (
    <div className="g2-card">
      <table className="g2-table" lang="en">
        <thead>
          <tr>
            <th className="s">{b.head[0]}</th>
            <th className="v">{b.head[1]}</th>
            <th className="e">{b.head[2]}</th>
          </tr>
        </thead>
        <tbody>
          {b.rows.map((r, i) => (
            <tr
              key={i}
              className={`g2-row${on === i ? " on" : ""}`}
              tabIndex={0}
              role="button"
              onClick={() => {
                setOn(i);
                playClip(r.audio, undefined, undefined, () => setOn(-1));
              }}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOn(i), playClip(r.audio, undefined, undefined, () => setOn(-1)))}
            >
              <td className="cs">{r.cells[0]}</td>
              <td className="cv">
                <b>{r.cells[1]}</b>
              </td>
              <td>
                <Marked text={r.cells[2]} hl={hl} /> <span aria-hidden className="g2-dim">🔊</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Reading({ b, lang, l }: { b: Extract<G2Block, { t: "reading" }>; lang: Lang; l: L }) {
  const { k, playing, start } = useKaraoke();
  // Word index across the whole reading, so each sentence part lights up in turn.
  let offset = 0;
  const part = (text: string, cls?: string) => {
    const n = text.split(/\s+/).filter(Boolean).length;
    const node = <Karaoke text={text} k={k - offset} className={cls} />;
    offset += n;
    return node;
  };
  return (
    <div className="g2-card">
      <div className="g2-lbl">
        <span>{l.reading}</span>
        <button type="button" className={`g2-say${playing ? " on" : ""}`} onClick={() => start(b.audio, b.wt)}>
          <Play /> {l.listenRead}
        </button>
      </div>
      <p className={`g2-para${lang === "es" ? " es" : ""}`} style={{ marginBottom: 10 }}>
        {lang === "es" ? b.es : b.en}
      </p>
      <p className="g2-read" lang="en">
        {b.sentences.map((s, i) => (
          <Fragment key={i}>
            {part(s.before)}
            {s.hl && <> {part(s.hl, "g2-g")}</>}
            {s.after && <> {part(s.after)}</>}{" "}
          </Fragment>
        ))}
      </p>
    </div>
  );
}

/* ---------- tasks: each reports when the section can go on, and how many it got right the first time ---------- */
type Result = { ready: boolean; right: number; total: number };

function seeded<T>(list: T[], seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1103515245) + 12345;
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Choose({ t, lang, l, onResult }: { t: Extract<G2Task, { type: "choose" }>; lang: Lang; l: L; onResult: (r: Result) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const first = useRef<boolean | null>(null);
  const why = lang === "es" ? t.why_es : t.why_en;
  const ok = pick !== null && t.options[pick].correct;
  return (
    <div className="g2-card">
      <div className="g2-lbl">
        <span>{l.question}</span>
        <Say refPath={t.q_audio} label={l.listen} />
      </div>
      <div className="g2-q">{lang === "es" ? t.q_es : t.q_en}</div>
      {t.options.map((o, i) => (
        <button
          key={i}
          type="button"
          lang="en"
          className={`g2-opt${pick === i ? (o.correct ? " ok" : " no") : ""}`}
          disabled={ok}
          onClick={() => {
            setPick(i);
            if (first.current === null) first.current = o.correct;
            if (o.correct) sfx.correct();
            else sfx.wrong();
            onResult({ ready: o.correct, right: first.current ? 1 : 0, total: 1 });
          }}
        >
          {o.text}
        </button>
      ))}
      <div className="g2-fb" aria-live="polite">
        {pick === null ? null : ok ? (
          <div className="g2-why">
            ✅ <b>{l.correct}</b> {why} <Say refPath={t.why_audio} label={l.why} />
          </div>
        ) : (
          <>
            {l.tryAgain} {l.hint} {why.split(":")[0]}…
          </>
        )}
      </div>
    </div>
  );
}

function Build({ t, lang, l, onResult }: { t: Extract<G2Task, { type: "build" }>; lang: Lang; l: L; onResult: (r: Result) => void }) {
  const words = useMemo(() => t.sentence.replace(/[.!?]$/, "").split(" "), [t.sentence]);
  const bank = useMemo(() => seeded(words.map((w, k) => ({ w, k })), t.sentence), [words, t.sentence]);
  const [ans, setAns] = useState<number[]>([]);
  const first = useRef<boolean | null>(null);
  const full = ans.length === words.length;
  const ok = full && ans.map((k) => bank.find((x) => x.k === k)!.w).join(" ").toLowerCase() === words.join(" ").toLowerCase();
  useEffect(() => {
    if (!full) return;
    if (first.current === null) first.current = ok;
    if (ok) {
      sfx.correct();
      playClip(t.audio);
    } else sfx.wrong();
    onResult({ ready: ok, right: first.current ? 1 : 0, total: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per full answer
  }, [full, ok]);
  return (
    <div className="g2-card">
      <div className="g2-lbl">
        <span>{l.build}</span>
        <Say refPath={t.audio_inst} label={l.instruction} />
      </div>
      <p className={`g2-para${lang === "es" ? " es" : ""}`} style={{ marginBottom: 10 }}>
        {lang === "es" ? t.es : t.en}
      </p>
      <div className={`g2-slot${full ? (ok ? " ok" : " no") : ""}`} lang="en">
        {ans.map((k, i) => (
          <button key={k} type="button" className="g2-tok" disabled={ok} onClick={() => setAns(ans.filter((_, j) => j !== i))}>
            {bank.find((x) => x.k === k)!.w}
          </button>
        ))}
      </div>
      <div className="g2-bank" lang="en">
        {bank
          .filter((x) => !ans.includes(x.k))
          .map((x) => (
            <button key={x.k} type="button" className="g2-tok" onClick={() => setAns([...ans, x.k])}>
              {x.w}
            </button>
          ))}
      </div>
      <div className="g2-fb" aria-live="polite">
        {full &&
          (ok ? (
            <>
              ✅ <b>{l.perfect}</b> <Say refPath={t.audio} label={l.sentence} />
            </>
          ) : (
            l.almost
          ))}
      </div>
    </div>
  );
}

function FillTask({ t, l, onResult }: { t: Extract<G2Task, { type: "fill" }>; l: L; onResult: (r: Result) => void }) {
  const [got, setGot] = useState<Record<number, boolean>>({});
  const [bad, setBad] = useState<Record<string, boolean>>({});
  const firstWrong = useRef<Set<number>>(new Set());
  return (
    <div className="g2-card">
      <div className="g2-lbl">
        <span>{l.complete}</span>
      </div>
      {t.items.map((it, i) => (
        <div key={i} className="g2-fillrow" lang="en">
          {it.before} <span className={`g2-blank${got[i] ? " ok" : ""}`}>{got[i] ? it.correct : " "}</span> {it.after}{" "}
          {got[i] && (
            <button type="button" className="g2-say" aria-label={l.sentence} onClick={() => playClip(it.audio)}>
              <Spk />
            </button>
          )}
          {!got[i] && (
            <div className="g2-chips">
              {it.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`g2-chip${bad[`${i}|${o}`] ? " no" : ""}`}
                  onClick={() => {
                    if (o === it.correct) {
                      const next = { ...got, [i]: true };
                      setGot(next);
                      sfx.correct();
                      playClip(it.audio);
                      const all = t.items.every((_, j) => next[j]);
                      onResult({ ready: all, right: t.items.length - firstWrong.current.size, total: t.items.length });
                    } else {
                      firstWrong.current.add(i);
                      setBad({ ...bad, [`${i}|${o}`]: true });
                      sfx.wrong();
                    }
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HearPick({ t, lang, l, onResult }: { t: Extract<G2Task, { type: "hear_pick" }>; lang: Lang; l: L; onResult: (r: Result) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const heard = useRef<Set<number>>(new Set());
  const lastTap = useRef(0);
  const first = useRef<boolean | null>(null);
  const ok = pick === t.correct;
  const parts = t.sentence.split(new RegExp(`\\b${t.word}\\b`));
  return (
    <div className="g2-card">
      <div className="g2-lbl">
        <span>{l.hear}</span>
        <Say refPath={t.audio_inst} label={l.instruction} />
      </div>
      <p className={`g2-para${lang === "es" ? " es" : ""}`} style={{ marginBottom: 10 }}>
        {lang === "es" ? t.es : t.en}
      </p>
      <div className="g2-q" lang="en">
        {parts[0]}
        <span className={`g2-blank${ok ? " ok" : ""}`}>{ok ? t.word : " ? "}</span>
        {parts.slice(1).join(t.word)}
      </div>
      <div className="g2-hear">
        {t.files.map((f, i) => (
          <button
            key={i}
            type="button"
            className={`g2-hb${pick === i ? (i === t.correct ? " ok" : " no") : ""}`}
            disabled={ok}
            onClick={() => {
              const now = Date.now();
              playClip(f);
              // A second tap (or a tap on one already heard) chooses it.
              if (now - lastTap.current < 600 || heard.current.has(i)) {
                setPick(i);
                const right = i === t.correct;
                if (first.current === null) first.current = right;
                if (right) {
                  sfx.correct();
                  setTimeout(() => playClip(t.audio), 900);
                } else sfx.wrong();
                onResult({ ready: right, right: first.current ? 1 : 0, total: 1 });
              }
              heard.current.add(i);
              lastTap.current = now;
            }}
          >
            <span className="g2-pl">
              <Play />
            </span>
            {fill(l.option, { n: i + 1 })}
          </button>
        ))}
      </div>
      <div className="g2-fb" aria-live="polite">
        {pick === null ? l.hearHelp : ok ? (
          <>
            ✅ <b>{l.correct}</b> <Say refPath={t.audio} label={l.sentence} />
          </>
        ) : (
          l.notThat
        )}
      </div>
    </div>
  );
}

function Task({ t, lang, l, onResult }: { t: G2Task; lang: Lang; l: L; onResult: (r: Result) => void }) {
  switch (t.type) {
    case "choose":
      return <Choose t={t} lang={lang} l={l} onResult={onResult} />;
    case "build":
      return <Build t={t} lang={lang} l={l} onResult={onResult} />;
    case "fill":
      return <FillTask t={t} l={l} onResult={onResult} />;
    case "hear_pick":
      return <HearPick t={t} lang={lang} l={l} onResult={onResult} />;
  }
}

/* ---------- the part ---------- */
export function GrammarV2Part({ data, g2, sd, xpReward, streak }: { data: GrammarV2; g2: Dictionary["g2"]; sd: Dictionary["sd"]; xpReward: number; streak: number }) {
  const { t, setProgress, setCounter, finish } = usePartShell();
  const sections = data.sections;
  const n = sections.length;
  const [sec, setSec] = useState(0);
  const [lang, setLangState] = useState<Lang>("en");
  const [done, setDone] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<Record<number, Result>>({});
  const [showDone, setShowDone] = useState<number | null>(null);
  const hl = useMemo(() => (data.hl ? new RegExp(data.hl) : null), [data.hl]);
  const l = g2[lang];
  const names = sections.map((s) => (lang === "en" && s.name_en) || s.name_es);

  useEffect(() => {
    try {
      const v = localStorage.getItem(LANG_KEY);
      if (v === "es" || v === "en") setLangState(v);
    } catch {
      // private mode: English by default
    }
  }, []);
  const setLang = (v: Lang) => {
    setLangState(v);
    try {
      localStorage.setItem(LANG_KEY, v);
    } catch {
      // not saved: fine
    }
  };

  useEffect(() => {
    setProgress(done.size / n);
    setCounter(fill(t.section, { n: (showDone ?? sec) + 1, total: n }));
  }, [done, n, sec, showDone, setProgress, setCounter, t.section]);
  useEffect(() => () => current?.stop(), []);

  const section: G2Section = sections[sec];
  const items = taskItems(section.task);
  const ready = items === 0 || !!result[sec]?.ready;
  const go = (i: number) => {
    current?.stop();
    setShowDone(null);
    setSec(i);
    window.scrollTo({ top: 0 });
  };
  // XP shown per section: the part's XP shared out (the rest on the last one); the real XP is written on finish.
  const share = Math.floor(xpReward / n);
  const xpFor = (i: number) => (i === n - 1 ? xpReward - share * (n - 1) : share);

  if (showDone !== null) {
    const r = result[showDone];
    return (
      <SectionDone
        t={sd}
        part="Grammar"
        names={names}
        index={showDone}
        done={done}
        score={taskItems(sections[showDone].task) ? { right: r?.right ?? 0, total: r?.total ?? taskItems(sections[showDone].task) } : null}
        xp={xpFor(showDone)}
        streak={streak}
        onNext={() => (showDone === n - 1 ? void finish() : go(showDone + 1))}
        onReview={() => go(showDone)}
      />
    );
  }

  return (
    <div className="g2">
      <div className="g2-bar">
        <div className="g2-secnav" role="tablist" aria-label="Grammar">
          {sections.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === sec}
              aria-label={`${fill(sd.section, { n: i + 1 })}: ${names[i]}`}
              title={names[i]}
              className={i === sec ? "on" : done.has(i) ? "done" : ""}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <div className="g2-lang" role="group" aria-label={l.lang}>
          {(["en", "es"] as Lang[]).map((v) => (
            <button key={v} type="button" aria-pressed={lang === v} className={lang === v ? "on" : ""} onClick={() => setLang(v)}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <p className="g2-kick">
        {fill(t.section, { n: sec + 1, total: n })} · <b>{names[sec]}</b>
      </p>
      <div key={`${sec}`}>
        {section.blocks.map((b, i) => (
          <Block key={i} b={b} lang={lang} l={l} hl={hl} />
        ))}
        {section.task && <Task t={section.task} lang={lang} l={l} onResult={(r) => setResult((x) => ({ ...x, [sec]: r }))} />}
      </div>
      <button
        type="button"
        className="g2-cta"
        disabled={!ready}
        onClick={() => {
          current?.stop();
          sfx.correct();
          setDone((d) => new Set(d).add(sec));
          setShowDone(sec);
          window.scrollTo({ top: 0 });
        }}
      >
        {l.continue}
      </button>
    </div>
  );
}
