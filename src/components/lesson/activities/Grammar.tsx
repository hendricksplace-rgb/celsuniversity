"use client";

import { useState } from "react";
import { arr, AudioButton, Feedback, obj, Option, Rich, seededShuffle, speak, str, useResolve, useScrollIntoView, useT } from "./shared";

type Ex = Record<string, unknown>;
const KNOWN = new Set([
  "drag_drop_single",
  "choose_text_from_audio",
  "drag_drop_multiple",
  "funics",
  "listen_only",
  "listening_select_inverted",
]);

export function Grammar({ settings, seed }: { settings: unknown; seed: string }) {
  const t = useT();
  const s = obj(settings);
  const exercises = arr<Ex>(s.exercises).filter((e) => KNOWN.has(str(obj(e).type)));
  const [index, setIndex] = useState(0);
  const top = useScrollIntoView<HTMLDivElement>(index);
  if (!exercises.length) return null;
  const ex = obj(exercises[index]);
  const heading = [str(s.subtitle), str(s.grammarTopic)].filter(Boolean).join(" · ");

  return (
    <div ref={top} className="scroll-mt-24 space-y-4">
      {heading && <p className="t-muted text-sm">{heading}</p>}
      <p className="t-muted text-xs font-semibold uppercase tracking-wide">
        {t.exercise} {index + 1} {t.of} {exercises.length}
      </p>
      {/* key: each exercise starts fresh */}
      <Exercise key={index} ex={ex} seed={`${seed}:${index}`} />
      <div className="flex justify-between gap-2 border-t border-[var(--t-border)] pt-4">
        <button type="button" className="t-btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ← {t.prev}
        </button>
        <button
          type="button"
          className="t-btn"
          disabled={index === exercises.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          {t.next} →
        </button>
      </div>
    </div>
  );
}

function Exercise({ ex, seed }: { ex: Ex; seed: string }) {
  const resolve = useResolve();
  const c = obj(ex.content);
  const audio = resolve(ex.audioFile);
  switch (ex.type) {
    case "drag_drop_single":
      return <BuildSentence content={c} audio={audio} seed={seed} />;
    case "choose_text_from_audio":
      return <ChooseText content={c} audio={audio} />;
    case "drag_drop_multiple":
      return <FillBlanks content={c} />;
    case "funics":
      return <Funics content={c} audio={audio} />;
    case "listen_only":
      return <ListenOnly content={c} audio={audio} />;
    case "listening_select_inverted":
      return <PickTheSound content={c} />;
    default:
      return null;
  }
}

/** Instruction groups: paragraphs, example lists and English / Spanish explanation audio. */
function Instructions({ groups }: { groups: unknown }) {
  const t = useT();
  const resolve = useResolve();
  const list = arr(groups).map((g) => (Array.isArray(g) ? g : [g]));
  if (!list.length) return null;
  return (
    <div className="space-y-3">
      {list.map((group, gi) => (
        <div key={gi} className="space-y-2 rounded-[var(--t-radius)] border border-[var(--t-border)] p-4">
          {group.map((raw, i) => {
            const item = obj(raw);
            if (item.type === "paragraph") return <Rich key={i} text={str(item.text)} />;
            if (item.type === "list")
              return (
                <ul key={i} className="list-disc space-y-1 pl-5 font-medium">
                  {arr(item.items).map((li, j) => (
                    <li key={j}>{str(li)}</li>
                  ))}
                </ul>
              );
            if (item.type === "audios")
              return (
                <div key={i} className="flex flex-wrap gap-2">
                  <AudioButton src={resolve(item.english)} label={`${t.listen} · English`} />
                  <AudioButton src={resolve(item.spanish)} label={`${t.listen} · Español`} />
                </div>
              );
            return null;
          })}
        </div>
      ))}
    </div>
  );
}

function Examples({ title, items }: { title?: string; items: unknown }) {
  const list = arr(items).map(str).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="space-y-1">
      {title && <Rich text={title} className="font-semibold" />}
      <ul className="list-disc space-y-1 pl-5">
        {list.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

/** drag_drop_single: tap the words in order to rebuild the sentence you hear. */
function BuildSentence({ content, audio, seed }: { content: Ex; audio?: string; seed: string }) {
  const t = useT();
  const target = str(content.correctSentence).trim();
  const words = target.split(/\s+/).filter(Boolean);
  const [bank] = useState(() => seededShuffle(words.map((w, i) => ({ w, i })), seed));
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  if (!words.length) return null;
  const built = picked.map((i) => words[i]).join(" ");
  const ok = built === target;

  return (
    <div className="space-y-4">
      <Instructions groups={content.instructions} />
      <p className="font-semibold">{t.buildSentence}</p>
      <AudioButton src={audio} className="t-btn" />
      <div
        className="flex min-h-14 flex-wrap items-center gap-2 rounded-[var(--t-radius)] border-2 border-dashed border-[var(--t-border)] p-3"
        aria-live="polite"
      >
        {picked.map((i, pos) => (
          <button
            key={pos}
            type="button"
            className="t-btn !px-3 !py-1"
            onClick={() => {
              setPicked(picked.filter((_, p) => p !== pos));
              setChecked(false);
            }}
          >
            {words[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {bank.map(({ w, i }) =>
          picked.includes(i) ? (
            <span key={i} className="t-btn-ghost invisible !px-3 !py-1">
              {w}
            </span>
          ) : (
            <button
              key={i}
              type="button"
              className="t-btn-ghost !px-3 !py-1"
              onClick={() => {
                setPicked([...picked, i]);
                setChecked(false);
              }}
            >
              {w}
            </button>
          ),
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="t-btn" disabled={picked.length !== words.length} onClick={() => setChecked(true)}>
          {t.check}
        </button>
        <button
          type="button"
          className="t-btn-ghost"
          disabled={!picked.length}
          onClick={() => {
            setPicked([]);
            setChecked(false);
          }}
        >
          {t.clear}
        </button>
        {checked && <Feedback ok={ok} extra={ok ? undefined : target} />}
      </div>
    </div>
  );
}

/** choose_text_from_audio: explanation + examples, then pick the correct sentence. */
function ChooseText({ content, audio }: { content: Ex; audio?: string }) {
  const options = arr(content.options).map((o) => ({ text: str(obj(o).text), correct: obj(o).correct === true }));
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="space-y-4">
      <Rich text={str(content.description)} />
      {arr(content.sections).map((sec, i) => (
        <Examples key={i} title={str(obj(sec).name)} items={obj(sec).examples} />
      ))}
      <Examples items={content.examples} />
      <AudioButton src={audio} />
      {str(content.questionText) && <p className="text-lg font-semibold">{str(content.questionText)}</p>}
      <div className="space-y-2">
        {options.map((o, i) => (
          <Option
            key={i}
            disabled={picked !== null}
            onClick={() => setPicked(i)}
            state={picked === null ? "idle" : o.correct ? "correct" : i === picked ? "wrong" : "dim"}
          >
            {o.text}
          </Option>
        ))}
      </div>
      {picked !== null && <Feedback ok={options[picked].correct} />}
    </div>
  );
}

/** drag_drop_multiple: one blank per sentence; tap an option to fill it. */
function FillBlanks({ content }: { content: Ex }) {
  const t = useT();
  const sentences = arr(content.sentences).map((s) => {
    const o = obj(s);
    return { before: str(o.textBefore), after: str(o.textAfter), options: arr(o.options).map(str), correct: str(o.correct) };
  });
  const [chosen, setChosen] = useState<(string | null)[]>(() => sentences.map(() => null));
  const [checked, setChecked] = useState(false);
  const allRight = sentences.every((s, i) => chosen[i] === s.correct);

  return (
    <div className="space-y-4">
      <Rich text={str(content.description)} className="font-semibold" />
      <ol className="space-y-4">
        {sentences.map((s, i) => {
          const state = !checked || chosen[i] === null ? "" : chosen[i] === s.correct ? "t-opt-correct" : "t-opt-wrong";
          return (
            <li key={i} className="space-y-2">
              <p className="text-lg">
                {s.before}{" "}
                <span className={`inline-block min-w-16 rounded border-b-2 border-[var(--t-accent)] px-2 text-center font-semibold ${state}`}>
                  {chosen[i] ?? " "}
                </span>{" "}
                {s.after}
              </p>
              <div className="flex flex-wrap gap-2">
                {s.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={chosen[i] === opt}
                    className={chosen[i] === opt ? "t-btn !px-3 !py-1" : "t-btn-ghost !px-3 !py-1"}
                    onClick={() => {
                      setChosen(chosen.map((c, j) => (j === i ? opt : c)));
                      setChecked(false);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="t-btn" disabled={chosen.some((c) => c === null)} onClick={() => setChecked(true)}>
          {t.check}
        </button>
        {checked && <Feedback ok={allRight} extra={allRight ? undefined : t.fixMarked} />}
      </div>
    </div>
  );
}

/** funics: sound families; tap a word to hear it with the device voice. */
function Funics({ content, audio }: { content: Ex; audio?: string }) {
  const t = useT();
  return (
    <div className="space-y-4">
      {str(content.title) && <p className="t-heading text-lg">{str(content.title)}</p>}
      <Rich text={str(content.description)} />
      <AudioButton src={audio} className="t-btn" />
      {arr(content.wordFamilies).map((fam, i) => (
        <div key={i} className="space-y-2">
          <p className="font-semibold">{str(obj(fam).name)}</p>
          <div className="flex flex-wrap gap-2">
            {arr(obj(fam).words).map((w, j) => (
              <button
                key={j}
                type="button"
                className="t-btn-ghost flex-col !gap-0 !px-4"
                onClick={() => speak(str(obj(w).word))}
                aria-label={`${t.pronounce}: ${str(obj(w).word)}`}
              >
                <span className="text-base">{str(obj(w).word)}</span>
                <span className="t-muted text-xs font-normal">{str(obj(w).phonetic)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** listen_only: read along with the recording. */
function ListenOnly({ content, audio }: { content: Ex; audio?: string }) {
  return (
    <div className="space-y-4">
      {str(content.title) && <p className="t-heading text-lg">{str(content.title)}</p>}
      <Rich text={str(content.description)} />
      <AudioButton src={audio} className="t-btn" />
      {arr(content.sentences).map((s, i) => {
        const o = obj(s);
        return (
          <p key={i} className="text-lg leading-relaxed">
            {str(o.textBefore)}
            {str(o.highlightedText) && <mark className="rounded px-1">{str(o.highlightedText)}</mark>}
            {str(o.textAfter)}
          </p>
        );
      })}
    </div>
  );
}

/** listening_select_inverted: play each recording and pick the one that says the highlighted word. */
function PickTheSound({ content }: { content: Ex }) {
  const t = useT();
  const resolve = useResolve();
  const sentence = str(content.sentence);
  const word = str(content.highlightedWord);
  const options = arr(content.audioOptions).map((o) => ({ file: resolve(obj(o).file), value: str(obj(o).value) }));
  const correct = str(content.correctAnswer);
  const [picked, setPicked] = useState<string | null>(null);
  const at = word ? sentence.toLowerCase().indexOf(word.toLowerCase()) : -1;

  return (
    <div className="space-y-4">
      <Rich text={str(content.description)} className="font-semibold" />
      <p className="text-lg">
        {at < 0 ? (
          sentence
        ) : (
          <>
            {sentence.slice(0, at)}
            <mark className="rounded px-1">{sentence.slice(at, at + word.length)}</mark>
            {sentence.slice(at + word.length)}
          </>
        )}
      </p>
      <div className="space-y-2">
        {options.map((o, i) => (
          <div key={o.value || i} className="flex items-stretch gap-2">
            <AudioButton src={o.file} label="" />
            <Option
              disabled={picked !== null}
              onClick={() => setPicked(o.value)}
              state={picked === null ? "idle" : o.value === correct ? "correct" : o.value === picked ? "wrong" : "dim"}
            >
              {t.option} {i + 1}
            </Option>
          </div>
        ))}
      </div>
      {picked !== null && <Feedback ok={picked === correct} />}
    </div>
  );
}
