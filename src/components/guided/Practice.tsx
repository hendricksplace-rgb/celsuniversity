"use client";

// "Practica": the five kinds of game (sort, order, pick, spot, highlight). Answers are kept in
// guided_step_progress.state.practice so the student finds them again.
import { useEffect, useMemo, useState } from "react";
import type { HighlightPractice, LabelPractice, ListenPickPractice, MythPractice, OrderPractice, PickPractice, Practice, SortPractice, SpotPractice } from "@/lib/guided";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Binary } from "./Essentials";
import { Ico, say, type T } from "./ui";
import s from "./guided.module.css";

type V = Record<string, unknown>;
type Props<P> = { p: P; v: V; set: (v: V) => void; t: T; lang: "es" | "en" };

const L = {
  es: {
    next: "Siguiente",
    final: (a: number, b: number) => `Acertaste ${a} de ${b}.`,
    again: "Repetir",
    outline: "Tu resume, en orden",
    outlineEmpty: "Toca la primera sección.",
    notYet: "Todavía no: ¿qué va antes?",
    orderDone: "¡Así va un resume de EE.UU.!",
    errs: (a: number, b: number) => `${a} de ${b} errores`,
    lineOk: "Esta línea está bien.",
    showRest: "Ver los que faltan",
    kw: (a: number, b: number) => `${a} de ${b} mínimo`,
    showAll: "Ver todas",
    notKey: "No es palabra clave",
    allFound: "¡Encontraste las palabras clave!",
  },
  en: {
    next: "Next",
    final: (a: number, b: number) => `You got ${a} of ${b} right.`,
    again: "Try again",
    outline: "Your resume, in order",
    outlineEmpty: "Tap the first section.",
    notYet: "Not yet: what comes before?",
    orderDone: "That's how a U.S. resume goes!",
    errs: (a: number, b: number) => `${a} of ${b} mistakes`,
    lineOk: "This line is fine.",
    showRest: "Show the ones left",
    kw: (a: number, b: number) => `${a} of ${b} minimum`,
    showAll: "Show all",
    notKey: "Not a keyword",
    allFound: "You found the keywords!",
  },
};

export function PracticeView(props: { p: Practice; v: V; set: (v: V) => void; t: T; lang: "es" | "en"; readerT: Dictionary["reader"] }) {
  const { p } = props;
  if (p.kind === "label") return <Label {...props} p={p} />;
  if (p.kind === "listen_pick") return <ListenPick {...props} p={p} />;
  if (p.kind === "myth") return <Myth p={p} v={props.v} set={props.set} />;
  if (p.kind === "sort") return <Sort {...props} p={p} />;
  if (p.kind === "order") return <Order {...props} p={p} />;
  if (p.kind === "pick") return <Pick {...props} p={p} />;
  if (p.kind === "spot") return <Spot {...props} p={p} />;
  if (p.kind === "highlight") return <Highlight {...props} p={p} />;
  return null;
}

/** Fraction done, for the step's progress bar. */
export function practiceDone(p: Practice | null, v: V) {
  if (!p) return true;
  const a = (v.answers ?? {}) as Record<string, unknown>;
  if (p.kind === "sort" || p.kind === "pick") return Object.keys(a).length >= p.items.length;
  if (p.kind === "order") return ((v.placed as string[]) ?? []).length >= p.items.length;
  if (p.kind === "spot") return ((v.found as number[]) ?? []).length >= p.doc.filter((d) => d.err).length;
  if (p.kind === "label" || p.kind === "listen_pick") return Object.keys(a).length >= p.items.length;
  if (p.kind === "myth") return Array.isArray(v.picks) && (v.picks as unknown[]).filter((x) => x !== null && x !== undefined).length >= p.items.length;
  return ((v.found as number[]) ?? []).length >= (p.min_found ?? 6);
}

/** Each statement with the two labels (CV / Resume): right or wrong with its `why`, plus the score above. */
function Sort({ p, v, set, t }: Props<SortPractice>) {
  const answers = (v.answers ?? {}) as Record<string, "a" | "b">;
  return (
    <div className={s.gm}>
      {p.items.map((it, i) => {
        const a = answers[i];
        const done = a !== undefined;
        return (
          <div className={s.dq} key={i}>
            <div className={s.gmQ}>{it.text}</div>
            <div className={s.bin}>
              {(["a", "b"] as const).map((k) => {
                const c = !done ? "" : k === it.answer ? s.right : k === a ? s.wrong : "";
                return (
                  <button key={k} type="button" className={c} disabled={done} aria-pressed={a === k} onClick={() => set({ ...v, answers: { ...answers, [i]: k } })}>
                    {p.labels[k]}
                  </button>
                );
              })}
            </div>
            {done && it.why && (
              <div className={s.dfb}>
                {a === it.answer ? <b>{t.right} </b> : <b className={s.no}>{t.almost} </b>}
                {it.why}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
export const sortScore = (p: SortPractice, v: V) => {
  const a = (v.answers ?? {}) as Record<string, string>;
  return { n: Object.keys(a).length, right: p.items.filter((d, i) => a[i] === d.answer).length };
};

function shuffle<X>(xs: X[], seed: number) {
  const a = [...xs];
  let x = seed || 7;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function Order({ p, v, set, t, lang }: Props<OrderPractice>) {
  const l = L[lang];
  const placed = (v.placed as string[]) ?? [];
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const pool = useMemo(() => shuffle([...p.items.map((x) => ({ text: x, why: null as string | null })), ...(p.distractors ?? []).map((d) => ({ text: d.text, why: d.why }))], p.items.length * 31 + 3), [p]);
  const done = placed.length >= p.items.length;
  const tap = (x: { text: string; why: string | null }) => {
    if (x.why) return setMsg({ text: `${x.text}: ${x.why}`, bad: true });
    if (p.items[placed.length] === x.text) {
      const next = [...placed, x.text];
      set({ ...v, placed: next });
      setMsg(next.length >= p.items.length ? { text: l.orderDone, bad: false } : null);
    } else setMsg({ text: l.notYet, bad: true });
  };
  return (
    <div className={s.dq}>
      <div className={s.pool}>
        {pool
          .filter((x) => !placed.includes(x.text))
          .map((x) => (
            <button key={x.text} type="button" onClick={() => tap(x)} disabled={done}>
              {x.text}
            </button>
          ))}
      </div>
      {msg && (
        <div className={s.dfb} aria-live="polite">
          {msg.bad ? <b className={s.no}>{t.almost} </b> : <b>{t.right} </b>}
          {msg.text}
        </div>
      )}
      <div className={s.outline} aria-label={l.outline}>
        {placed.length ? (
          <ol>
            {placed.map((x, i) => (
              <li key={x}>
                <span>{i + 1}</span>
                {x}
              </li>
            ))}
          </ol>
        ) : (
          <p className={s.outlineEmpty}>{l.outlineEmpty}</p>
        )}
      </div>
      {done && (
        <div className={s.rowEnd}>
          <span className={s.score}>{t.of(p.items.length, p.items.length)}</span>
          <button
            type="button"
            className={`${s.btn} ${s.btnO}`}
            onClick={() => {
              set({ ...v, placed: [] });
              setMsg(null);
            }}
          >
            {l.again}
          </button>
        </div>
      )}
    </div>
  );
}

function Pick({ p, v, set, t }: { p: PickPractice; v: V; set: (v: V) => void; t: T }) {
  const answers = (v.answers ?? {}) as Record<string, number>;
  return (
    <div className={s.drill}>
      {p.items.map((d, i) => {
        const ans = answers[i];
        return (
          <div className={s.dq} key={i}>
            <div className={s.weak}>
              {t.weak}
              <b>{d.weak}</b>
            </div>
            <div className={s.dopts}>
              {d.options.map((o, j) => {
                const c = ans === undefined ? "" : j === d.answer ? s.right : j === ans ? s.wrong : "";
                return (
                  <button key={j} type="button" className={c} disabled={ans !== undefined} onClick={() => set({ ...v, answers: { ...answers, [i]: j } })}>
                    <i>{c === s.right ? "✓" : c === s.wrong ? "✗" : "ABC"[j]}</i>
                    {o}
                  </button>
                );
              })}
            </div>
            {ans !== undefined && (
              <div className={s.dfb} aria-live="polite">
                {ans === d.answer ? <b>{t.right} </b> : <b className={s.no}>{t.almost} </b>}
                {d.why}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
export const pickScore = (p: PickPractice, v: V) => {
  const a = (v.answers ?? {}) as Record<string, number>;
  return { n: Object.keys(a).length, right: p.items.filter((d, i) => a[i] === d.answer).length };
};

function Spot({ p, v, set, lang }: Props<SpotPractice>) {
  const l = L[lang];
  const found = (v.found as number[]) ?? [];
  const [ok, setOk] = useState<number | null>(null);
  const [late, setLate] = useState(false);
  const [all, setAll] = useState(false);
  const total = p.doc.filter((d) => d.err).length;
  useEffect(() => {
    const id = setTimeout(() => setLate(true), 120_000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className={s.dq}>
      <div className={s.rowEnd} style={{ marginTop: 0, justifyContent: "space-between", alignItems: "center" }}>
        <span className={s.score}>{l.errs(found.length, total)}</span>
        {late && found.length < total && !all && (
          <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} onClick={() => setAll(true)}>
            {l.showRest}
          </button>
        )}
      </div>
      <div className={s.fake} style={{ marginTop: 14 }}>
        {p.doc.map((d, i) => {
          const hit = d.err && (found.includes(i) || all);
          return (
            <button
              key={i}
              type="button"
              className={hit ? s.wrong : ok === i ? s.fakeOk : ""}
              aria-pressed={!!hit}
              onClick={() => {
                if (d.err) {
                  if (!found.includes(i)) set({ ...v, found: [...found, i] });
                } else setOk(i);
              }}
            >
              <span style={{ display: "block" }}>{d.text}</span>
              {hit && <span className={s.errNote}>{d.err}</span>}
              {ok === i && !d.err && <span className={s.errNote} style={{ color: "var(--ok)" }}>{l.lineOk}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const nrm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** The ad split into words; each word that belongs to a keyword phrase carries that keyword's index. */
function tokenize(ad: string, keywords: string[]) {
  const owner = new Array<number>(ad.length).fill(-1);
  const low = nrm(ad);
  keywords.forEach((k, ki) => {
    const kk = nrm(k);
    let at = low.indexOf(kk);
    while (at >= 0) {
      for (let c = at; c < at + kk.length; c++) if (owner[c] === -1) owner[c] = ki;
      at = low.indexOf(kk, at + kk.length);
    }
  });
  const out: { text: string; k: number; word: boolean }[] = [];
  const re = /[\p{L}\p{N}'’/+.-]+|[^\p{L}\p{N}'’/+.-]+/gu;
  for (const m of ad.matchAll(re)) {
    const word = /[\p{L}\p{N}]/u.test(m[0]);
    const start = m.index ?? 0;
    out.push({ text: m[0], k: word ? owner[start] ?? -1 : -1, word });
  }
  return out;
}

function Highlight({ p, v, set, lang }: Props<HighlightPractice>) {
  const l = L[lang];
  const found = (v.found as number[]) ?? [];
  const [miss, setMiss] = useState<number[]>([]);
  const [all, setAll] = useState(false);
  const toks = useMemo(() => tokenize(p.ad, p.keywords), [p]);
  const min = p.min_found ?? 6;
  const lit = (k: number) => k >= 0 && (found.includes(k) || all);
  return (
    <div className={s.dq}>
      <div className={s.rowEnd} style={{ marginTop: 0, justifyContent: "space-between", alignItems: "center" }}>
        <span className={s.score}>{l.kw(Math.min(found.length, p.keywords.length), min)}</span>
        {(found.length >= min || all) && !all && (
          <button type="button" className={`${s.btn} ${s.btnO} ${s.btnSm}`} onClick={() => setAll(true)}>
            {l.showAll}
          </button>
        )}
      </div>
      <div className={s.ad} style={{ marginTop: 14 }} lang="en">
        {p.label && <span className={s.adLabel}>{p.label}</span>}
        {p.ad_title && !p.ad.startsWith(p.ad_title) && <b className={s.adTitle}>{p.ad_title}</b>}
        {toks.map((x, i) =>
          x.word ? (
            <button
              key={i}
              type="button"
              className={`${s.w} ${lit(x.k) ? s.wHit : ""} ${miss.includes(i) ? s.wMiss : ""}`}
              aria-pressed={lit(x.k)}
              title={miss.includes(i) ? l.notKey : undefined}
              onClick={() => {
                if (x.k >= 0) {
                  if (!found.includes(x.k)) set({ ...v, found: [...found, x.k] });
                } else setMiss((m) => (m.includes(i) ? m : [...m, i]));
              }}
            >
              {x.text}
            </button>
          ) : (
            <span key={i}>{x.text}</span>
          ),
        )}
      </div>
      {found.length >= min && (
        <div className={s.dfb} aria-live="polite">
          <b>{l.allFound}</b>
        </div>
      )}
    </div>
  );
}

// ---------- label (S / T / A / R), myth as practice, listen_pick ----------

function Label({ p, v, set, t }: Props<LabelPractice>) {
  const answers = (v.answers ?? {}) as Record<string, string>;
  const all = p.items.every((_, i) => answers[i] !== undefined);
  return (
    <div className={s.drill}>
      {p.items.map((it, i) => {
        const a = answers[i];
        return (
          <div className={s.dq} key={i}>
            <div className={s.sent}>
              <small>FRASE {i + 1}</small>
              <span lang="en">{it.text}</span>
            </div>
            <div className={s.labs}>
              {p.labels.map((k) => {
                const c = a === undefined ? "" : k === it.answer ? s.right : k === a ? s.wrong : "";
                return (
                  <button key={k} type="button" className={c} disabled={a !== undefined} onClick={() => set({ ...v, answers: { ...answers, [i]: k } })} aria-pressed={a === k}>
                    {k}
                  </button>
                );
              })}
            </div>
            {a !== undefined && a !== it.answer && (
              <p className={s.count}>
                <b className={s.no}>{t.almost}</b> Es «{it.answer}».
              </p>
            )}
          </div>
        );
      })}
      {all && p.done && (
        <div className={s.dfb} aria-live="polite">
          <b>{t.right}</b> {p.done}
        </div>
      )}
    </div>
  );
}

/** The e-book's myth / reality block as practice, with the course's own button labels ("Ayuda / Perjudica", "Sí / Mejor no"). */
function Myth({ p, v, set }: { p: MythPractice; v: V; set: (v: V) => void }) {
  return (
    <Binary items={p.items} value={v.picks} onChange={(x) => set({ ...v, picks: x })} labels={p.labels ?? { true: "Sí", false: "No" }} />
  );
}

function ListenPick({ p, v, set, t }: Props<ListenPickPractice>) {
  const answers = (v.answers ?? {}) as Record<string, number>;
  return (
    <div className={s.drill}>
      {p.items.map((d, i) => {
        const ans = answers[i];
        return (
          <div className={s.dq} key={i}>
            <div className={s.weak}>
              Situación
              <b>{d.situation}</b>
            </div>
            <div className={s.dopts}>
              {d.options.map((o, j) => {
                const c = ans === undefined ? "" : j === d.answer ? s.right : j === ans ? s.wrong : "";
                return (
                  <div key={j} className={s.lpRow}>
                    <button type="button" className={c} disabled={ans !== undefined} onClick={() => set({ ...v, answers: { ...answers, [i]: j } })} lang="en">
                      <i>{c === s.right ? "✓" : c === s.wrong ? "✗" : "ABC"[j]}</i>
                      {o}
                    </button>
                    <button type="button" className={s.sayBtn} aria-label={`Escuchar ${o}`} onClick={() => say(o)}>
                      <Ico n="vol" />
                    </button>
                  </div>
                );
              })}
            </div>
            {ans !== undefined && (
              <div className={s.dfb} aria-live="polite">
                {ans === d.answer ? <b>{t.right} </b> : <b className={s.no}>{t.almost} </b>}
                {d.why ?? <span lang="en">«{d.options[d.answer]}»</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
