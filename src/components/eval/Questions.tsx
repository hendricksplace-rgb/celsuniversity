"use client";

// C-031: the evaluation's questions in the CelsU look. Every text with a recorded clip (Amy / Brian) plays it with
// karaoke; a listening audio that isn't recorded yet keeps the browser voice (see audio.ts). The answers, the
// engine and the grading are unchanged: each screen reports the raw answer.
import { useCallback, useEffect, useRef, useState } from "react";
import { FR, type Answer, type Item, type SpeakingPrompt } from "@/lib/eval-engine";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { callEvaluation } from "./api";
import { clipFor, playClip, speakFallback, stopAudio, tone, type Clip, type Clips } from "./audio";

export type EvalT = Dictionary["evaluation"];
export type EvT = Dictionary["ev"];
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/** Section colors (C-031 brief; P is Hablar, which has no engine section). */
export const SEC_HEX: Record<string, string> = { V: "#F20174", L: "#5B8DEF", R: "#4FAE4A", W: "#E0A100", S: "#1FA9D6", P: "#9B5DE5" };
export const SEC_ICON: Record<string, React.ReactNode> = {
  V: <path d="M4 6h16M4 12h10M4 18h7" />,
  L: (
    <>
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  R: <path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" />,
  W: <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z" />,
  S: <path d="M4 5h16v11H9l-5 4z" />,
  P: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
};

const shuffle = <T,>(a: T[]) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const Speaker = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M7 4.5v15l12.5-7.5z" fill="#fff" />
  </svg>
);
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

/** The illustrated pictures that replace the bank's emoji (V01 apple); any other emoji stays as a big glyph. */
const PICTURES: Record<string, React.ReactNode> = {
  "🍎": (
    <svg viewBox="0 0 120 120" aria-hidden>
      <defs>
        <radialGradient id="ev-apple" cx=".35" cy=".3">
          <stop offset="0" stopColor="#FF8A9A" />
          <stop offset=".6" stopColor="#F0304A" />
          <stop offset="1" stopColor="#B0122E" />
        </radialGradient>
      </defs>
      <path d="M60 34c-8-8-30-10-38 10-8 22 6 56 24 60 6 1 10-3 14-3s8 4 14 3c18-4 32-38 24-60-8-20-30-18-38-10z" fill="url(#ev-apple)" />
      <path d="M60 34c0-10 4-18 12-22" stroke="#6B3B1F" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M64 22c10-8 22-6 26 0-10 6-20 6-26 0z" fill="#6DC067" />
      <ellipse cx="42" cy="54" rx="8" ry="12" fill="#fff" opacity=".35" transform="rotate(-20 42 54)" />
    </svg>
  ),
};

/** Soft sounds on choices (off when the page asks for reduced motion). */
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const tick = (f: number, d = 0.12, v = 0.05) => {
  if (!reduced()) tone(f, d, v);
};

/** One player for the screen: which text is speaking and its lit word. */
export function useSpeaker() {
  const [who, setWho] = useState<string | null>(null);
  const [k, setK] = useState(-1);
  useEffect(() => () => stopAudio(), []);
  const play = useCallback((clip: Clip, id: string, o: { onProgress?: (p: number) => void; onEnd?: () => void } = {}) => {
    setWho(id);
    playClip(clip, {
      onWord: setK,
      onProgress: o.onProgress,
      onEnd: () => {
        setWho((w) => (w === id ? null : w));
        o.onEnd?.();
      },
    });
  }, []);
  const at = useCallback((id: string) => (who === id ? k : -1), [who, k]);
  return { play, at };
}

/** A text split into words; the word being spoken lights up (and, in a scrolling box, scrolls into view). */
export function Words({ text, k, follow }: { text: string; k: number; follow?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!follow || k < 0 || !ref.current) return;
    const w = ref.current.querySelectorAll<HTMLElement>(".w")[k];
    const box = ref.current.closest<HTMLElement>(".ev-kara");
    if (!w || !box) return;
    const top = w.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 8 || top > box.scrollTop + box.clientHeight - 40)
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: reduced() ? "auto" : "smooth" });
  }, [k, follow]);
  let n = -1;
  return (
    <span ref={ref}>
      {text.split(/(\s+)/).map((p, i) => {
        if (p === "" || /^\s+$/.test(p)) return p;
        n++;
        return (
          <span key={i} className={`w ${n === k ? "now" : ""}`}>
            {p}
          </span>
        );
      })}
    </span>
  );
}

export function SayButton({ label, onClick, compact }: { label: string; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      className="ev-say"
      onClick={onClick}
      aria-label={compact ? label : undefined}
      style={compact ? { padding: "5px 9px", marginLeft: 6 } : undefined}
    >
      <Speaker />
      {!compact && label}
    </button>
  );
}

/** 1–4 pick an option, Enter goes on (not while typing in a field). */
function useKeys(n: number, pick: (i: number) => void, enter: () => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      const d = Number(e.key);
      if (d >= 1 && d <= n) {
        e.preventDefault();
        pick(d - 1);
      } else if (e.key === "Enter" && !el.closest("button, a")) {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [n, pick, enter]);
}

function Next({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="ev-btn" style={{ marginTop: 18 }} disabled={disabled} onClick={onClick} data-testid="ev-next">
      {label} →
    </button>
  );
}

/** One bank item; reports the raw answer (the engine and the server decide if it is right). */
export function QuestionView({ item, sec, t, clips, onAnswer }: { item: Item; sec: string; t: EvT; clips: Clips; onAnswer: (a: Answer) => void }) {
  if (item.type === "unscramble") return <Unscramble item={item} t={t} onAnswer={onAnswer} />;
  if (item.type === "spot") return <SpotError item={item} t={t} onAnswer={onAnswer} />;
  return <MultipleChoice item={item} sec={sec} t={t} clips={clips} onAnswer={onAnswer} />;
}

/** A real-situation item as a chat: the quoted line is the other person's bubble, the rest is the scene. */
function parseScene(q: string) {
  const m = q.match(/^(\p{Extended_Pictographic}️?)\s*/u);
  const emoji = m?.[1] ?? "";
  const rest = q.slice(m?.[0].length ?? 0);
  const quote = rest.match(/"([^"]+)"/);
  if (!quote || quote.index === undefined) return { emoji, who: "", line: "", scene: rest };
  const who = rest.slice(0, quote.index).replace(/[:\s]+$/, "");
  return { emoji, who, line: quote[1], scene: rest.slice(quote.index + quote[0].length).trim() };
}

function MultipleChoice({ item, sec, t, clips, onAnswer }: { item: Item; sec: string; t: EvT; clips: Clips; onAnswer: (a: Answer) => void }) {
  const [order] = useState(() => shuffle(item.opts ?? []));
  const [sel, setSel] = useState<number | null>(null);
  const { play, at } = useSpeaker();
  const qClip = clipFor(clips, item.q);
  const chat = sec === "S" ? parseScene(item.q) : null;
  const lineClip = chat?.line ? clipFor(clips, chat.line) : null;
  const passClip = clipFor(clips, item.passage);

  // Listening: 2 plays; the waveform fills with the audio, then the question is read with karaoke.
  const audioClip = clipFor(clips, item.audio);
  const [plays, setPlays] = useState(2);
  const [prog, setProg] = useState(0);
  const [listening, setListening] = useState(false);
  const BARS = 32;
  const playAudio = () => {
    if (!item.audio || plays <= 0 || listening) return;
    setPlays((p) => p - 1);
    setListening(true);
    setProg(0);
    const end = () => {
      setListening(false);
      if (qClip) play(qClip, "q");
    };
    if (audioClip) play(audioClip, "audio", { onProgress: setProg, onEnd: end });
    else speakFallback(item.audio, { onProgress: setProg, onEnd: end });
  };

  // Options drop in with a soft tick each; a real situation's line plays on its own.
  useEffect(() => {
    const ids = (item.opts ?? []).map((_, i) => setTimeout(() => tick(520 + i * 60, 0.06, 0.025), 250 + i * 80));
    if (lineClip) ids.push(setTimeout(() => play(lineClip, "line"), 700));
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per item (the screen is keyed by the item id)
  }, []);

  const choose = useCallback(
    (i: number) => {
      setSel(i);
      tick(660);
      const c = sec === "V" ? clipFor(clips, order[i]) : null;
      if (c) play(c, "opt");
    },
    [sec, clips, order, play],
  );
  const submit = useCallback(() => {
    if (sel !== null) onAnswer(order[sel]);
  }, [sel, order, onAnswer]);
  useKeys(order.length, choose, submit);

  const pic = item.img ? (PICTURES[item.img] ?? <span className="emo">{item.img}</span>) : null;
  const grid = !!pic && order.every((o) => o.length < 18);

  return (
    <div className="ev-pg ev-qc">
      {pic && <div className="ev-pic">{pic}</div>}

      {item.audio && (
        <div className="ev-player">
          <button type="button" className="ev-pbtn" onClick={playAudio} disabled={plays <= 0 || listening} aria-label={t.play} data-testid="ev-play">
            <PlayIcon />
          </button>
          <div className="ev-wave" aria-hidden>
            {Array.from({ length: BARS }, (_, i) => (
              <i
                key={i}
                className={prog > 0 && i / BARS <= prog ? "on" : ""}
                style={{ ["--h" as string]: `${12 + Math.abs(Math.sin(i * 1.7)) * 26 + (i % 5) * 3}px` }}
              />
            ))}
          </div>
          <span className="ev-rep" aria-live="polite">
            {plays === 2 ? t.plays2 : plays === 1 ? t.plays1 : t.plays0}
          </span>
        </div>
      )}

      {item.passage && (
        <>
          <div className="ev-krow">
            <span className="ev-lab">{t.readText}</span>
            {passClip && <SayButton label={t.listenRead} onClick={() => play(passClip, "passage")} />}
          </div>
          <div className="ev-kara" lang="en">
            <Words text={item.passage} k={at("passage")} follow />
          </div>
        </>
      )}

      {chat ? (
        <>
          <div className="ev-scene">
            {chat.emoji && <span className="em">{chat.emoji}</span>}
            <span lang="en">{chat.scene}</span>
          </div>
          {chat.line && (
            <div className="ev-chat">
              <span className="ev-av" aria-hidden>
                {(chat.who || "B")[0].toUpperCase()}
              </span>
              <div className="ev-bub" lang="en">
                <small>{chat.who ? chat.who.toUpperCase() : t.they}</small>
                <Words text={chat.line} k={at("line")} />
                {lineClip && <SayButton compact label={t.listen} onClick={() => play(lineClip, "line")} />}
              </div>
            </div>
          )}
          <div className="ev-lab" style={{ marginBottom: 8 }}>
            {t.reply}
          </div>
        </>
      ) : (
        <>
          {(item.audio || qClip) && (
            <div className="ev-krow">
              <span className="ev-lab">{t.question}</span>
              {qClip && <SayButton label={t.listenQ} onClick={() => play(qClip, "q")} />}
            </div>
          )}
          <h2 className="ev-qt">
            <Words text={item.q} k={at("q")} />
          </h2>
        </>
      )}

      <div className={`ev-opts ${grid ? "ev-grid2" : ""}`} role="group" aria-label={t.choose}>
        {order.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`ev-opt ${chat ? "reply" : ""} ${sel === i ? "sel" : ""}`}
            style={{ ["--d" as string]: `${0.25 + i * 0.08}s` }}
            onClick={() => choose(i)}
            aria-pressed={sel === i}
            data-testid="ev-opt"
            lang="en"
          >
            <span className="k" aria-hidden>
              {"ABCD"[i]}
            </span>
            {o}
          </button>
        ))}
      </div>
      <Next label={t.next} disabled={sel === null} onClick={submit} />
    </div>
  );
}

const noPick = () => {};

function Unscramble({ item, t, onAnswer }: { item: Item; t: EvT; onAnswer: (a: Answer) => void }) {
  const [tiles, setTiles] = useState(() => shuffle((item.words ?? []).map((w, i) => ({ w, i }))));
  const [placed, setPlaced] = useState<{ w: string; i: number }[]>([]);
  const done = placed.length === (item.words ?? []).length;
  const submit = useCallback(() => {
    if (done) onAnswer(placed.map((p) => p.w).join(" "));
  }, [done, placed, onAnswer]);
  useKeys(0, noPick, submit);
  return (
    <div className="ev-pg ev-qc">
      <div className="ev-lab">{t.order}</div>
      <h2 className="ev-qt small">{item.q}</h2>
      <div className="ev-slot" data-testid="ev-slot" lang="en">
        {placed.map((p, k) => (
          <button
            key={p.i}
            type="button"
            className="ev-tile"
            onClick={() => {
              tick(440, 0.08);
              setTiles([...tiles, p]);
              setPlaced(placed.filter((_, j) => j !== k));
            }}
          >
            {p.w}
          </button>
        ))}
      </div>
      <div className="ev-tiles" lang="en">
        {tiles.map((p, k) => (
          <button
            key={p.i}
            type="button"
            className="ev-tile"
            data-testid="ev-tile"
            style={{ ["--d" as string]: `${0.2 + k * 0.06}s` }}
            onClick={() => {
              tick(700, 0.08);
              setPlaced([...placed, p]);
              setTiles(tiles.filter((_, j) => j !== k));
            }}
          >
            {p.w}
          </button>
        ))}
      </div>
      <p className="ev-note" style={{ textAlign: "left" }}>
        {t.tapHint}
      </p>
      <Next label={t.next} disabled={!done} onClick={submit} />
    </div>
  );
}

function SpotError({ item, t, onAnswer }: { item: Item; t: EvT; onAnswer: (a: Answer) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const words = item.words ?? [];
  const pick = useCallback((i: number) => {
    setSel(i);
    tick(660);
  }, []);
  const submit = useCallback(() => {
    if (sel !== null) onAnswer(sel);
  }, [sel, onAnswer]);
  useKeys(Math.min(9, words.length), pick, submit);
  return (
    <div className="ev-pg ev-qc">
      <div className="ev-lab">{t.spot}</div>
      <h2 className="ev-qt small">{item.q}</h2>
      <div className="ev-tiles" lang="en">
        {words.map((w, i) => (
          <button
            key={i}
            type="button"
            className={`ev-tile ${sel === i ? "sel" : ""}`}
            style={{ ["--d" as string]: `${0.2 + i * 0.06}s` }}
            aria-pressed={sel === i}
            onClick={() => pick(i)}
            data-testid="ev-word"
          >
            {w}
          </button>
        ))}
      </div>
      <Next label={t.next} disabled={sel === null} onClick={submit} />
    </div>
  );
}

export type WritingResult = {
  band: string;
  feedback: string;
  corrections: { original: string; corrected: string; note: string }[];
};
export type SpeakingResult = {
  band: string;
  feedback: string;
  transcript?: string;
};

export function Thinking({ text }: { text: string }) {
  return (
    <div className="ev-ai" role="status">
      <span className="ev-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {text}
    </div>
  );
}

export function FreeResponse({
  level,
  token,
  t,
  et,
  onDone,
}: {
  level: number;
  token: string | null;
  t: EvT;
  et: EvalT;
  onDone: (r: WritingResult | null, text: string) => void;
}) {
  const fr = FR[level];
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const ok = text.trim().length >= 10;
  const submit = async () => {
    const v = text.trim();
    if (v.length < 10) return;
    setLoading(true);
    const res = token ? await callEvaluation<WritingResult>({ action: "writing", token, level, text: v }).catch(() => null) : null;
    onDone(res?.ok ? res.data : null, v);
  };
  return (
    <div className="ev-pg ev-qc">
      <div className="ev-lab">{t.writeKick}</div>
      <h2 className="ev-qt">{fr.prompt}</h2>
      <textarea
        className="ev-inp"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        lang="en"
        placeholder={et.writingPlaceholder}
        aria-label={fr.prompt}
        disabled={loading}
        data-testid="ev-write"
      />
      {loading ? (
        <Thinking text={t.aiWriting} />
      ) : (
        <>
          <button type="button" className="ev-btn" disabled={!ok} onClick={() => void submit()} data-testid="ev-write-send">
            {t.writeSend} ✨
          </button>
          <button type="button" className="ev-link" style={{ marginInline: "auto" }} onClick={() => onDone(null, "")} data-testid="ev-write-skip">
            {et.skipFree}
          </button>
        </>
      )}
    </div>
  );
}

const LIMIT = 45;
const mmss = (s: number) => `0:${String(Math.min(LIMIT, Math.floor(s))).padStart(2, "0")}`;

/**
 * Speaking: the prompt (Amy reads it with karaoke when it's recorded), a friendly explainer before the browser asks
 * for the microphone, then a big mic with pulse rings and a live waveform from the real microphone (AnalyserNode),
 * 0:45 at most. The student can hear the answer and record again before sending; the voice is never stored here.
 */
export function Speaking({
  prompt,
  token,
  t,
  clips,
  onDone,
}: {
  prompt: SpeakingPrompt;
  token: string | null;
  t: EvT;
  clips: Clips;
  onDone: (r: SpeakingResult | null) => void;
}) {
  type St = "ask" | "ready" | "rec" | "done" | "sending" | "denied";
  const [st, setSt] = useState<St>("ask");
  const [secs, setSecs] = useState(0);
  const blob = useRef<Blob | null>(null);
  const live = useRef<HTMLDivElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const { play, at } = useSpeaker();
  const pClip = clipFor(clips, prompt.audio);

  useEffect(() => {
    const id = pClip ? setTimeout(() => play(pClip, "p"), 600) : null;
    return () => {
      if (id) clearTimeout(id);
      stopRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

  const askMic = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((tr) => tr.stop());
      setSt("ready");
    } catch {
      setSt("denied");
    }
  };

  const record = async () => {
    stopAudio();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setSt("denied");
    }
    const mr = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    mr.onstop = () => {
      blob.current = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
      setSt("done");
    };
    let ac: AudioContext | null = null;
    let an: AnalyserNode | null = null;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      ac = new AC();
      an = ac.createAnalyser();
      an.fftSize = 64;
      ac.createMediaStreamSource(stream).connect(an);
    } catch {}
    const data = new Uint8Array(an?.frequencyBinCount ?? 32);
    const t0 = performance.now();
    let raf = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      if (mr.state === "recording") mr.stop();
      stream.getTracks().forEach((tr) => tr.stop());
      void ac?.close().catch(() => {});
      live.current?.querySelectorAll("i").forEach((b) => (b.style.height = "6px"));
      stopRef.current = () => {};
    };
    stopRef.current = stop;
    const frame = () => {
      const s = (performance.now() - t0) / 1000;
      setSecs(s);
      if (an) an.getByteFrequencyData(data);
      live.current?.querySelectorAll("i").forEach((b, i) => (b.style.height = `${6 + (an ? (data[i % data.length] / 255) * 40 : 0)}px`));
      if (s >= LIMIT) return stop();
      raf = requestAnimationFrame(frame);
    };
    mr.start();
    setSecs(0);
    setSt("rec");
    raf = requestAnimationFrame(frame);
  };

  const send = async () => {
    if (!blob.current) return;
    setSt("sending");
    const form = new FormData();
    form.append("action", "speaking");
    form.append("token", token ?? "");
    form.append("prompt_id", prompt.id);
    form.append("audio", blob.current);
    const res = await callEvaluation<SpeakingResult>(form).catch(() => null);
    onDone(res?.ok ? res.data : null);
  };

  const hear = () => {
    if (!blob.current) return;
    stopAudio();
    const a = new Audio(URL.createObjectURL(blob.current));
    a.onended = () => URL.revokeObjectURL(a.src);
    void a.play().catch(() => {});
  };

  const micOn = st === "ready" || st === "rec" || st === "done" || st === "sending";
  return (
    <div className="ev-pg ev-qc" style={{ textAlign: "center" }}>
      <div className="ev-krow">
        <span className="ev-lab">{t.speakKick}</span>
        {pClip && <SayButton label={t.listen} onClick={() => play(pClip, "p")} />}
      </div>
      {prompt.image && (
        <div className="ev-pic" style={{ height: "auto", padding: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- our own public asset */}
          <img src={prompt.image} alt="" />
        </div>
      )}
      {prompt.audio && (
        <h2 className="ev-qt" style={{ textAlign: "left" }} lang="en">
          <Words text={prompt.audio} k={at("p")} />
        </h2>
      )}
      <p className="ev-lead" style={{ fontSize: 14.5, margin: "0 0 4px", textAlign: "left" }}>
        {prompt.audio ? t.speakHint : prompt.prompt}
      </p>

      {st === "ask" && (
        <div className="ev-explain">
          {t.micAsk}
          <button type="button" className="ev-btn" style={{ marginTop: 12 }} onClick={() => void askMic()} disabled={!token} data-testid="ev-mic-on">
            {t.micOn}
          </button>
        </div>
      )}
      {st === "denied" && (
        <div className="ev-explain" role="alert">
          {t.micDenied}
        </div>
      )}
      {micOn && (
        <>
          <button
            type="button"
            className={`ev-mic ${st === "rec" ? "rec" : ""}`}
            onClick={() => (st === "rec" ? stopRef.current() : void record())}
            disabled={st === "sending"}
            aria-label={st === "rec" ? t.stop : t.record}
            data-testid="ev-mic"
          >
            <MicIcon />
          </button>
          <div className="ev-live" ref={live} aria-hidden>
            {Array.from({ length: 28 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="ev-timer" aria-live="polite">
            {st === "rec" ? `${mmss(secs)} / 0:45 · ${t.stopRec}` : st === "ready" ? t.tapMic : t.recDone}
          </div>
          {(st === "done" || st === "sending") && (
            <div className="ev-row">
              <button type="button" className="ev-ghost" onClick={hear} disabled={st === "sending"}>
                {t.listenMine}
              </button>
              <button type="button" className="ev-ghost" onClick={() => void record()} disabled={st === "sending"}>
                {t.again}
              </button>
            </div>
          )}
          {st === "sending" ? (
            <Thinking text={t.aiListening} />
          ) : (
            <button type="button" className="ev-btn" style={{ marginTop: 16 }} disabled={st !== "done"} onClick={() => void send()} data-testid="ev-speak-send">
              {t.send} →
            </button>
          )}
        </>
      )}
      {st !== "sending" && (
        <button type="button" className="ev-link" style={{ marginInline: "auto" }} onClick={() => onDone(null)} data-testid="ev-speak-skip">
          {t.skipSpeak}
        </button>
      )}
    </div>
  );
}
