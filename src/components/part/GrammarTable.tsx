"use client";

// C-007 (CelsTV Grammar, "Elige lo que escuchas" with a table in its description): the Markdown pipe table as a real,
// colored table (subject cyan, verb as a pink pill, the same words marked in the example), grouped by verb when the
// verb repeats; tap a row to hear Amy read the example (content.table_audio), "Escuchar la pregunta" (audioFile), then
// pick the answer: green + one line why (content.explanation), or pink + "try again" until it is right.
// Works with the old data too: no table_audio → rows are not tappable; no audioFile → no listen button.
import { Fragment, useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { parsePipeTable } from "@/lib/grammar-table";
import { fileRoute } from "@/components/reader/media";

type Ex = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const CYAN = "#43D6FE";
const PINK = "#FF6AB0";

/** True when this exercise gets the table screen. */
export function isTableExercise(ex: Ex | undefined) {
  return ex?.type === "choose_text_from_audio" && !!parsePipeTable(obj(ex.content).description);
}

// One player for the table and question clips.
let player: HTMLAudioElement | null = null;

/** **bold**, and 'to be' / "to be" in yellow (without the quotes). */
function Intro({ text }: { text: string }) {
  const toBe = (s: string, k: string) =>
    s.split(/['"“”‘’]to be['"“”‘’]/i).flatMap((part, i) =>
      i === 0
        ? [<Fragment key={`${k}-${i}`}>{part}</Fragment>]
        : [
            <span key={`${k}-tb${i}`} className="font-bold text-[#FFEF05]">
              to be
            </span>,
            <Fragment key={`${k}-${i}`}>{part}</Fragment>,
          ],
    );
  return (
    <p className="whitespace-pre-line text-[15px] font-semibold leading-relaxed">
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{toBe(part, `b${i}`)}</strong> : <Fragment key={i}>{toBe(part, `t${i}`)}</Fragment>))}
    </p>
  );
}

/** A quoted word in the question ('they', "are") shows in cyan without its quotes. */
function Question({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const re = /(^|\s)['"“‘]([A-Za-z][A-Za-z' -]*?)['"”’](?=[\s?.!,]|$)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out.push(text.slice(last, m.index) + m[1]);
    out.push(
      <span key={m.index} style={{ color: CYAN }}>
        {m[2]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return <p className="text-base font-extrabold leading-snug">{out}</p>;
}

/** The example with the row's subject (cyan) and verb (pink) marked. */
function Marked({ text, subject, verb }: { text: string; subject: string; verb: string }) {
  const lower = text.toLowerCase();
  const find = (word: string, from: number) => {
    if (!word) return -1;
    const w = word.toLowerCase();
    for (let i = lower.indexOf(w, from); i >= 0; i = lower.indexOf(w, i + 1)) {
      const before = i === 0 || !/[a-z]/i.test(lower[i - 1]);
      const after = i + w.length >= lower.length || !/[a-z]/i.test(lower[i + w.length]);
      if (before && after) return i;
    }
    return -1;
  };
  const s = find(subject, 0);
  const v = find(verb, s >= 0 ? s + subject.length : 0);
  const marks = [
    s >= 0 ? { at: s, len: subject.length, color: CYAN, weight: 700 } : null,
    v >= 0 ? { at: v, len: verb.length, color: PINK, weight: 800 } : null,
  ]
    .filter((m): m is NonNullable<typeof m> => !!m)
    .sort((a, b) => a.at - b.at);
  const out: React.ReactNode[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.at < pos) continue;
    out.push(text.slice(pos, m.at));
    out.push(
      <span key={m.at} style={{ color: m.color, fontWeight: m.weight }}>
        {text.slice(m.at, m.at + m.len)}
      </span>,
    );
    pos = m.at + m.len;
  }
  out.push(text.slice(pos));
  return <>{out}</>;
}

export function GrammarTable({
  ex,
  urls,
  t,
  onSolved,
}: {
  ex: Ex;
  urls: Record<string, string>;
  t: Dictionary["part"];
  onSolved: () => void;
}) {
  const c = obj(ex.content);
  const table = parsePipeTable(c.description)!;
  const options = arr(c.options).map((o) => ({ text: str(obj(o).text), correct: obj(o).correct === true }));
  const explanation = str(c.explanation);
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState<string | null>(null); // "q" or the row number
  const solved = picked !== null && options[picked]?.correct;

  // Stop the clip when the section changes.
  useEffect(
    () => () => {
      player?.pause();
    },
    [],
  );

  // A file plays only when the page was allowed to sign it; the URL is /app/archivo so it never expires.
  const src = (ref: unknown) => (typeof ref === "string" && ref.startsWith("storage://") && urls[ref] ? fileRoute(ref) : null);
  const rowAudio = new Map<number, string>();
  for (const a of arr(c.table_audio)) {
    const row = Number(obj(a).row);
    const s = src(obj(a).audio);
    if (Number.isInteger(row) && s) rowAudio.set(row, s);
  }
  const questionAudio = src(ex.audioFile);

  const play = (key: string, url: string) => {
    player?.pause();
    if (playing === key) {
      setPlaying(null);
      return;
    }
    const a = new Audio(url);
    player = a;
    setPlaying(key);
    a.onended = a.onpause = () => setPlaying((k) => (k === key && player === a ? null : k));
    a.play().catch(() => setPlaying((k) => (k === key ? null : k)));
  };

  // Rows keep their original number (r1 = first data row) for the audio; grouped by verb when a verb repeats.
  const numbered = table.rows.map((cells, i) => ({ cells, n: i + 1 }));
  const verbKey = (r: { cells: string[] }) => r.cells[1].toLowerCase();
  const order = [...new Set(numbered.map(verbKey))];
  const grouped = order.length < numbered.length;
  const rows = grouped ? [...numbered].sort((a, b) => order.indexOf(verbKey(a)) - order.indexOf(verbKey(b))) : numbered;
  const width = table.header.length;
  const last = width - 1;

  // The old examples list repeats the table's sentences; it shows only if it adds something.
  const examples = arr(c.examples).map(str).filter(Boolean);
  const extraExamples = examples.filter((e) => !table.rows.some((r) => r[last] === e));

  return (
    <div className="space-y-3 text-[#F4F1FF]">
      {table.intro && <Intro text={table.intro} />}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] font-semibold text-[#B9B0E6]">
        {[
          [table.header[0], CYAN],
          [table.header[1], "#F20174"],
        ].map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-[9px] w-[9px] rounded-[3px]" style={{ background: color }} />
            {label}
          </span>
        ))}
        {rowAudio.size > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-[9px] w-[9px] rounded-[3px] bg-[#B9B0E6]" />
            {t.tableTap}
          </span>
        )}
      </div>
      <table className="w-full border-separate text-[13.5px] [border-spacing:0_6px]">
        <thead>
          <tr>
            {table.header.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-2 pb-0.5 text-left text-[10.5px] font-extrabold uppercase tracking-[0.12em]"
                style={{ color: i === 0 ? CYAN : i === 1 ? PINK : "#B9B0E6" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const url = rowAudio.get(r.n);
            const on = playing === String(r.n);
            const tag = grouped && (idx === 0 || verbKey(rows[idx - 1]) !== verbKey(r)) ? r.cells[1] : null;
            const cell = `px-2 py-[9px] align-middle transition-colors first:rounded-l-xl last:rounded-r-xl ${
              on ? "bg-[rgba(67,214,254,.14)]" : url ? "bg-white/[.05] group-hover:bg-white/[.09]" : "bg-white/[.05]"
            }`;
            return (
              <Fragment key={r.n}>
                {tag && (
                  <tr>
                    <td colSpan={width} className="px-2 pt-1">
                      <span className="inline-block rounded-full bg-[#FFEF05] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.1em] text-[#160E3A]">{tag}</span>
                    </td>
                  </tr>
                )}
                <tr
                  className={url ? "group cursor-pointer" : undefined}
                  data-row={r.n}
                  aria-current={on || undefined}
                  {...(url
                    ? {
                        role: "button",
                        tabIndex: 0,
                        "aria-label": `${t.tableTap}: ${r.cells[last]}`,
                        onClick: () => play(String(r.n), url),
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            play(String(r.n), url);
                          }
                        },
                      }
                    : {})}
                >
                  {r.cells.map((value, i) =>
                    i === 0 ? (
                      <td key={i} className={`${cell} w-[22%] font-bold`} style={{ color: CYAN }}>
                        {value}
                      </td>
                    ) : i === 1 ? (
                      <td key={i} className={`${cell} w-[20%]`}>
                        <b
                          className="inline-block whitespace-nowrap rounded-lg border px-[9px] py-0.5 font-extrabold"
                          style={{ background: "rgba(242,1,116,.18)", color: PINK, borderColor: "rgba(242,1,116,.55)" }}
                        >
                          {value}
                        </b>
                      </td>
                    ) : (
                      <td key={i} className={`${cell} font-medium [overflow-wrap:anywhere]`}>
                        {i === last && width >= 3 ? <Marked text={value} subject={r.cells[0]} verb={r.cells[1]} /> : value}
                        {i === last && url && (
                          <span aria-hidden className="ml-1 text-[13px] opacity-70">
                            {on ? "⏸" : "🔊"}
                          </span>
                        )}
                      </td>
                    ),
                  )}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {table.after && <Intro text={table.after} />}
      {extraExamples.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {extraExamples.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {str(c.questionText) && (
        <div className="pt-2">
          <Question text={str(c.questionText)} />
        </div>
      )}
      {questionAudio && (
        <button
          type="button"
          onClick={() => play("q", questionAudio)}
          aria-pressed={playing === "q"}
          className="kit-focus-light inline-flex items-center gap-1.5 rounded-xl border border-[#3A2C7A] bg-white/[.08] px-3 py-2 text-[13px] font-bold"
        >
          <span aria-hidden>{playing === "q" ? "⏸" : "🔊"}</span>
          {t.listenQuestion}
        </button>
      )}
      <div className="space-y-2">
        {options.map((o, i) => {
          const state = picked === i ? (o.correct ? "ok" : "no") : null;
          return (
            <button
              key={i}
              type="button"
              disabled={!!solved}
              onClick={() => {
                setPicked(i);
                if (o.correct) onSolved();
              }}
              className={`kit-focus-light block w-full rounded-[14px] border-[1.5px] px-3.5 py-3 text-left text-[15px] font-bold transition-colors ${
                state === "ok"
                  ? "border-[#3BE38B] bg-[rgba(59,227,139,.14)]"
                  : state === "no"
                    ? "border-[#F20174] bg-[rgba(242,1,116,.14)]"
                    : "border-[#3A2C7A] enabled:hover:border-[#B9B0E6] disabled:opacity-60"
              }`}
            >
              {o.text}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="min-h-5 text-[13px] font-semibold">
        {picked !== null &&
          (solved ? (
            <span className="text-[#3BE38B]">
              ✅ {t.correct} {explanation && <span className="text-[#F4F1FF]">{explanation}</span>}
            </span>
          ) : (
            <span style={{ color: PINK }}>{t.tableRetry}</span>
          ))}
      </p>
    </div>
  );
}
