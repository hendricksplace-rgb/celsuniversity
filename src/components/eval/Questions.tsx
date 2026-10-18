"use client";

import { useEffect, useRef, useState } from "react";
import { FR, type Answer, type Item, type SpeakingPrompt } from "@/lib/eval-engine";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { callEvaluation } from "./api";

export type EvalT = Dictionary["evaluation"];
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

// Bright CelsU palette (same as the Base44 app)
export const C = {
  pink: "#F5178C",
  blue: "#5B8DEF",
  cyan: "#35C3F0",
  green: "#6DC067",
  yellow: "#FFC531",
  lavender: "#A9A4C0",
};

const shuffle = <T,>(a: T[]) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Browser voice for the listening items (as in Base44). */
function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return onEnd?.();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("en"));
  if (v) u.voice = v;
  u.onend = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#A9A4C0]">{children}</span>
);

/** Main action pinned to the bottom of the screen, above the phone's home bar. */
export const StickyBar = ({ children }: { children: React.ReactNode }) => (
  <div className="sticky bottom-0 z-30 -mx-4 mt-4 bg-[#12101f]/90 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">{children}</div>
);

export const BigButton = ({ children, color = C.pink, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { color?: string }) => (
  <button
    {...props}
    className={`w-full rounded-2xl py-4 text-base font-extrabold transition active:scale-[0.98] enabled:hover:brightness-110 disabled:opacity-40 ${props.className ?? ""}`}
    style={{
      background: color,
      color: color === C.yellow ? "#3a2a00" : "#fff",
      ...props.style,
    }}
  >
    {children}
  </button>
);

const optionClass = (on: boolean) =>
  `mt-2.5 w-full rounded-2xl border-2 px-4 py-3.5 text-left text-base font-bold text-white transition active:scale-[0.99] ${
    on ? "border-[#35C3F0] bg-[#35C3F0]/15" : "border-transparent bg-white/5 hover:bg-white/10"
  }`;

/** One bank item; reports the raw answer (the engine and the server decide if it is right). */
export function QuestionView({ item, t, onAnswer }: { item: Item; t: EvalT; onAnswer: (a: Answer) => void }) {
  if (item.type === "unscramble") return <Unscramble item={item} t={t} onAnswer={onAnswer} />;
  if (item.type === "spot") return <SpotError item={item} t={t} onAnswer={onAnswer} />;
  return <MultipleChoice item={item} t={t} onAnswer={onAnswer} />;
}

function MultipleChoice({ item, t, onAnswer }: { item: Item; t: EvalT; onAnswer: (a: Answer) => void }) {
  const [order] = useState(() => shuffle(item.opts ?? []));
  const [sel, setSel] = useState<string | null>(null);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => void (typeof window !== "undefined" && window.speechSynthesis?.cancel()), []);

  return (
    <div>
      {item.audio && (
        <button
          type="button"
          disabled={plays >= 2}
          onClick={() => {
            setPlays(plays + 1);
            setPlaying(true);
            speak(item.audio!, () => setPlaying(false));
          }}
          className={`mt-2 flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-base font-bold text-white transition disabled:opacity-50 ${playing ? "animate-pulse" : ""}`}
          style={{ borderColor: C.blue, background: `${C.blue}26` }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: C.blue }}>
            ▶
          </span>
          {t.play}
          <span className="ml-auto text-xs text-[#A9A4C0]">{fill(t.playsLeft, { n: 2 - plays })}</span>
        </button>
      )}
      {item.img && <div className="mt-2 text-center text-6xl">{item.img}</div>}
      {item.passage && <div className="card mt-2 text-sm font-semibold leading-relaxed text-white/90">{item.passage}</div>}
      <h3 className="mt-4 text-base font-extrabold leading-snug text-white">{item.q}</h3>
      <div className="mt-1">
        {order.map((o) => (
          <button key={o} type="button" onClick={() => setSel(o)} className={optionClass(sel === o)} aria-pressed={sel === o}>
            {o}
          </button>
        ))}
      </div>
      <StickyBar>
        <BigButton disabled={sel === null} onClick={() => sel !== null && onAnswer(sel)}>
          {t.confirm}
        </BigButton>
      </StickyBar>
    </div>
  );
}

function Unscramble({ item, t, onAnswer }: { item: Item; t: EvalT; onAnswer: (a: Answer) => void }) {
  const [tiles, setTiles] = useState(() => shuffle((item.words ?? []).map((w, i) => ({ w, i }))));
  const [placed, setPlaced] = useState<{ w: string; i: number }[]>([]);
  return (
    <div>
      <h3 className="text-base font-extrabold text-white">{item.q}</h3>
      <div className="mt-3 flex min-h-[52px] flex-wrap gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-white/5 p-2">
        {placed.length === 0 ? (
          <span className="px-2 py-3 text-xs text-[#A9A4C0]">{t.tapWords}</span>
        ) : (
          placed.map((p, k) => (
            <button
              key={p.i}
              type="button"
              className="rounded-xl px-3.5 py-2.5 text-base font-extrabold text-[#3a2a00]"
              style={{ background: C.yellow }}
              onClick={() => {
                setTiles([...tiles, p]);
                setPlaced(placed.filter((_, j) => j !== k));
              }}
            >
              {p.w}
            </button>
          ))
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tiles.map((p, k) => (
          <button
            key={p.i}
            type="button"
            className="rounded-xl px-3.5 py-2.5 text-base font-extrabold text-white"
            style={{ background: C.blue }}
            onClick={() => {
              setPlaced([...placed, p]);
              setTiles(tiles.filter((_, j) => j !== k));
            }}
          >
            {p.w}
          </button>
        ))}
      </div>
      <StickyBar>
        <BigButton disabled={placed.length !== (item.words ?? []).length} onClick={() => onAnswer(placed.map((p) => p.w).join(" "))}>
          {t.confirm}
        </BigButton>
      </StickyBar>
    </div>
  );
}

function SpotError({ item, t, onAnswer }: { item: Item; t: EvalT; onAnswer: (a: Answer) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div>
      <h3 className="text-base font-extrabold text-white">{item.q}</h3>
      <div className="mt-3 leading-loose">
        {(item.words ?? []).map((w, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={sel === i}
            onClick={() => setSel(i)}
            className={`rounded-lg px-1.5 py-1 text-lg font-bold transition ${sel === i ? "text-white" : "text-white hover:bg-[#F5178C]/25"}`}
            style={sel === i ? { background: C.pink } : undefined}
          >
            {w}
          </button>
        ))}
      </div>
      <StickyBar>
        <BigButton disabled={sel === null} onClick={() => sel !== null && onAnswer(sel)}>
          {t.confirm}
        </BigButton>
      </StickyBar>
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

export function FreeResponse({ level, token, t, onDone }: { level: number; token: string | null; t: EvalT; onDone: (r: WritingResult | null, text: string) => void }) {
  const fr = FR[level];
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const v = text.trim();
    if (v.length < 10) return;
    setLoading(true);
    const res = token
      ? await callEvaluation<WritingResult>({
          action: "writing",
          token,
          level,
          text: v,
        }).catch(() => null)
      : null;
    onDone(res?.ok ? res.data : null, v);
  };
  if (loading)
    return (
      <div className="py-20 text-center">
        <div className="text-5xl">🤖</div>
        <h3 className="mt-3 text-lg font-extrabold text-white">{t.aiWriting}</h3>
        <p className="mt-1 text-sm text-[#A9A4C0]">{t.aiWritingSub}</p>
      </div>
    );
  return (
    <div>
      <Pill>{t.writingBadge}</Pill>
      <h3 className="mt-3 text-base font-extrabold leading-snug text-white">{fr.prompt}</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        lang="en"
        placeholder={t.writingPlaceholder}
        className="mt-3 min-h-[140px] w-full resize-y rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-base font-semibold text-white focus:border-[#F5178C] focus:outline-none"
      />
      <StickyBar>
        <BigButton disabled={text.trim().length < 10} onClick={() => void submit()}>
          {t.sendToAi}
        </BigButton>
        <button type="button" onClick={() => onDone(null, "")} className="mt-2.5 w-full rounded-2xl bg-white/10 py-4 text-base font-bold text-white">
          {t.skip}
        </button>
      </StickyBar>
    </div>
  );
}

export function Speaking({ prompt, token, t, onDone }: { prompt: SpeakingPrompt; token: string | null; t: EvalT; onDone: (r: SpeakingResult | null) => void }) {
  const [status, setStatus] = useState<"idle" | "recording" | "submitting" | "error">("idle");
  const [played, setPlayed] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setStatus("submitting");
        const form = new FormData();
        form.append("action", "speaking");
        form.append("token", token ?? "");
        form.append("prompt_id", prompt.id);
        form.append("audio", new Blob(chunks, { type: mr.mimeType || "audio/webm" }));
        const res = await callEvaluation<SpeakingResult>(form).catch(() => null);
        onDone(res?.ok ? res.data : null);
      };
      mr.start();
      rec.current = mr;
      setStatus("recording");
      // Plenty for a 45-second answer; stops runaway recordings.
      setTimeout(() => mr.state === "recording" && mr.stop(), 90_000);
    } catch {
      setStatus("error");
    }
  };

  if (status === "submitting")
    return (
      <div className="py-16 text-center">
        <div className="text-5xl">🤖</div>
        <h3 className="mt-3 text-lg font-extrabold text-white">{t.aiSpeaking}</h3>
      </div>
    );
  return (
    <div>
      <Pill>{t.speakingBadge}</Pill>
      {prompt.image && (
        // eslint-disable-next-line @next/next/no-img-element -- our own public asset
        <img src={prompt.image} alt="" className="mt-3 max-h-56 w-full rounded-2xl object-cover" />
      )}
      {prompt.audio && (
        <button
          type="button"
          disabled={played}
          onClick={() => {
            setPlayed(true);
            speak(prompt.audio!);
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-base font-bold text-white disabled:opacity-50"
          style={{ borderColor: C.blue, background: `${C.blue}26` }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: C.blue }}>
            ▶
          </span>
          {played ? t.played : t.listenQuestion}
        </button>
      )}
      <h3 className="mt-3 text-base font-extrabold leading-snug text-white">{prompt.prompt}</h3>
      {status === "error" && <p className="mt-3 text-sm text-[#FFC531]">{t.micError}</p>}
      {status === "recording" ? (
        <BigButton className="mt-3 animate-pulse" onClick={() => rec.current?.stop()}>
          {t.stopSend}
        </BigButton>
      ) : (
        <BigButton className="mt-3" color={C.blue} disabled={!token} onClick={() => void start()}>
          {t.record}
        </BigButton>
      )}
      <button type="button" onClick={() => onDone(null)} className="mt-2.5 w-full rounded-2xl bg-white/10 py-4 text-base font-bold text-white">
        {t.skipFree}
      </button>
    </div>
  );
}
