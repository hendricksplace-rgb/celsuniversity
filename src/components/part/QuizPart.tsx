"use client";

// Quiz (board "App — Episodio v2", phone 3): intro, then the questions in 5 formats. Amy reads each
// question with the word being read highlighted (her recording and word timings when the question has
// them, else the device's English voice); options drop in one by one
// with a "bing"; a right answer gets confetti, "¡Correcto!" and +10 XP. The end shows the score, the
// streak, "Siguiente: Episodio N+1" and "Intentar de nuevo".
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QuizQ, Voice } from "@/lib/quiz";
import { PartIcon, fill } from "@/components/course/kit";
import { usePartShell } from "./PartShell";
import { reducedMotion, sfx } from "./fx";

const XP_EACH = 10;

/** Amy reads `text`; returns the index of the word being read (or -1). */
function useReader(text: string, voice?: Voice) {
  const [word, setWord] = useState(-1);
  const player = useRef<HTMLAudioElement | null>(null);
  const read = useCallback(() => {
    if (voice) {
      player.current?.pause();
      const a = new Audio(voice.url);
      player.current = a;
      a.ontimeupdate = () => setWord(voice.wt.findLastIndex((s) => s <= a.currentTime + 0.05));
      a.onended = () => setWord(-1);
      void a.play().catch(() => setWord(-1));
      return;
    }
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    const starts = [...text.matchAll(/\S+/g)].map((m) => m.index ?? 0);
    u.onboundary = (e) => setWord(starts.findLastIndex((s) => s <= e.charIndex));
    u.onend = () => setWord(-1);
    speechSynthesis.speak(u);
  }, [text, voice]);
  useEffect(
    () => () => {
      player.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    },
    [],
  );
  return { word, read };
}

function Prompt({ text, voice, label }: { text: string; voice?: Voice; label: string }) {
  const { word, read } = useReader(text, voice);
  useEffect(() => {
    const t = setTimeout(read, 250);
    return () => clearTimeout(t);
  }, [read]);
  if (!text) return null;
  return (
    <div className="flex items-start gap-3">
      <p className="flex-1 text-[22px] font-extrabold leading-snug">
        {text.split(/(\s+)/).map((w, i) =>
          /\s/.test(w) ? (
            w
          ) : (
            <span key={i} className={`rounded px-0.5 transition-colors ${Math.floor(i / 2) === word ? "bg-[#FFEF05] text-[#1A0812]" : ""}`}>
              {w}
            </span>
          ),
        )}
      </p>
      <button type="button" onClick={read} aria-label={label} className="kit-focus-light grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
        🔊
      </button>
    </div>
  );
}

/** Options drop in one by one, each with a "bing". */
function useDropIn(count: number) {
  useEffect(() => {
    if (reducedMotion()) return;
    const ts = Array.from({ length: count }, (_, i) => setTimeout(() => sfx.bing(i), 450 + i * 140));
    return () => ts.forEach(clearTimeout);
  }, [count]);
  return (i: number) => ({ animationDelay: `${450 + i * 140}ms` });
}

type Answer = (correct: boolean, right?: string) => void;

function Choice({ q, onAnswer }: { q: Extract<QuizQ, { kind: "choose" | "listen" | "picture" }>; onAnswer: Answer }) {
  const [picked, setPicked] = useState<number | null>(null);
  const delay = useDropIn(q.options.length);
  const audio = useRef<HTMLAudioElement | null>(null);
  const { t } = usePartShell();
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const right = q.kind === "picture" ? q.options[q.answer].alt : q.options[q.answer];
    onAnswer(i === q.answer, right);
  };
  const state = (i: number) =>
    picked === null ? "" : i === q.answer ? "ring-[3px] ring-[#7CC94A] bg-[#7CC94A]/20" : i === picked ? "ring-[3px] ring-[#FF5C7A] bg-[#FF5C7A]/15" : "opacity-50";
  return (
    <div className="space-y-3">
      {q.kind === "listen" && (
        <button
          type="button"
          onClick={() => {
            if (!q.audio) return;
            audio.current?.pause();
            audio.current = new Audio(q.audio);
            void audio.current.play();
          }}
          disabled={!q.audio}
          className="kit-focus-light mx-auto flex size-20 items-center justify-center rounded-full bg-[#F20174] text-3xl shadow-lg disabled:opacity-40"
          aria-label={t.hear}
        >
          🔊
        </button>
      )}
      {q.kind === "picture" ? (
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={picked !== null}
              aria-label={o.alt}
              className={`kit-drop kit-focus-light overflow-hidden rounded-2xl bg-white/10 transition ${state(i)}`}
              style={delay(i)}
            >
              {o.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.img} alt={o.alt} className="aspect-square w-full object-cover" />
              ) : (
                <span className="grid aspect-square place-items-center p-3 text-sm font-bold">{o.alt}</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {q.options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={picked !== null}
              className={`kit-drop kit-focus-light w-full rounded-2xl bg-white/10 px-4 py-3.5 text-left text-[15px] font-bold transition enabled:hover:bg-white/15 ${state(i)}`}
              style={delay(i)}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Build({ q, onAnswer }: { q: Extract<QuizQ, { kind: "build" }>; onAnswer: Answer }) {
  const { t } = usePartShell();
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const delay = useDropIn(q.tiles.length);
  const sentence = placed.map((i) => q.tiles[i]);
  const check = () => {
    const ok = sentence.join(" ") === q.answer.join(" ");
    setChecked(ok);
    onAnswer(ok, q.answer.join(" "));
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/75">{t.tapWords}</p>
      <div
        className={`flex min-h-16 flex-wrap gap-2 rounded-2xl border-2 border-dashed p-3 ${checked === null ? "border-white/25" : checked ? "border-[#7CC94A]" : "border-[#FF5C7A]"}`}
        aria-live="polite"
      >
        {placed.map((i) => (
          <button
            key={i}
            type="button"
            disabled={checked !== null}
            onClick={() => setPlaced((p) => p.filter((x) => x !== i))}
            className="kit-focus-light rounded-xl bg-[#FFEF05] px-3 py-2 font-bold text-[#1A0812]"
          >
            {q.tiles[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {q.tiles.map((w, i) =>
          placed.includes(i) ? (
            <span key={i} className="rounded-xl bg-white/5 px-3 py-2 font-bold text-transparent" aria-hidden>
              {w}
            </span>
          ) : (
            <button
              key={i}
              type="button"
              disabled={checked !== null}
              onClick={() => setPlaced((p) => [...p, i])}
              className="kit-drop kit-focus-light rounded-xl bg-white/15 px-3 py-2 font-bold"
              style={delay(i)}
            >
              {w}
            </button>
          ),
        )}
      </div>
      {checked === null && (
        <button
          type="button"
          disabled={placed.length !== q.tiles.length}
          onClick={check}
          className="kit-focus-light w-full rounded-2xl bg-[#F20174] py-3.5 font-extrabold disabled:opacity-40"
        >
          {t.check}
        </button>
      )}
    </div>
  );
}

function Extra({ q, onAnswer }: { q: Extract<QuizQ, { kind: "extra" }>; onAnswer: Answer }) {
  const [picked, setPicked] = useState<number | null>(null);
  const delay = useDropIn(q.tiles.length);
  return (
    <div className="flex flex-wrap gap-2">
      {q.tiles.map((w, i) => (
        <button
          key={i}
          type="button"
          disabled={picked !== null}
          onClick={() => {
            setPicked(i);
            onAnswer(i === q.extra, q.tiles.filter((_, k) => k !== q.extra).join(" "));
          }}
          className={`kit-drop kit-focus-light rounded-xl px-3.5 py-2.5 text-lg font-bold transition ${
            picked === null
              ? "bg-white/15"
              : i === q.extra
                ? "bg-[#7CC94A]/25 line-through decoration-[#FF5C7A] decoration-[3px]"
                : i === picked
                  ? "bg-[#FF5C7A]/25"
                  : "bg-white/10"
          }`}
          style={delay(i)}
        >
          {w}
        </button>
      ))}
    </div>
  );
}

function Match({ q, onAnswer }: { q: Extract<QuizQ, { kind: "match" }>; onAnswer: Answer }) {
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [miss, setMiss] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const answered = useRef(false);
  const delay = useDropIn(q.pairs.length * 2);
  const tryPair = (en: string) => {
    if (left === null) return;
    const p = q.pairs[left];
    if (p.en === en) {
      sfx.bing(2);
      const next = new Set(done).add(en);
      setDone(next);
      setLeft(null);
      if (next.size === q.pairs.length && !answered.current) {
        answered.current = true;
        onAnswer(miss === 0);
      }
    } else {
      sfx.wrong();
      setMiss((m) => m + 1);
      setFlash(en);
      setTimeout(() => setFlash(null), 450);
    }
  };
  const cell = "kit-drop kit-focus-light w-full rounded-2xl px-3 py-3 text-[15px] font-bold transition";
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="space-y-2.5">
        {q.pairs.map((p, i) => (
          <button
            key={p.es}
            type="button"
            disabled={done.has(p.en)}
            aria-pressed={left === i}
            onClick={() => setLeft(i)}
            className={`${cell} ${done.has(p.en) ? "bg-[#7CC94A]/25 text-[#C5F58F]" : left === i ? "bg-[#FFEF05] text-[#1A0812]" : "bg-white/10"}`}
            style={delay(i)}
          >
            {p.es}
          </button>
        ))}
      </div>
      <div className="space-y-2.5">
        {q.right.map((en, i) => (
          <button
            key={en}
            type="button"
            disabled={done.has(en)}
            onClick={() => tryPair(en)}
            className={`${cell} ${done.has(en) ? "bg-[#7CC94A]/25 text-[#C5F58F]" : flash === en ? "bg-[#FF5C7A]/30" : "bg-white/10"}`}
            style={delay(q.pairs.length + i)}
          >
            {en}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuizPart({ questions }: { questions: QuizQ[] }) {
  const { t, userId, episodeN, setProgress, addXp, celebrate, finish, backHref, nextEpisodeHref, nextEpisodeN } = usePartShell();
  const [step, setStep] = useState(-1); // -1 intro, questions.length = end
  const [result, setResult] = useState<null | { ok: boolean; right?: string }>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState<number | null>(null);
  const kinds = useMemo(() => new Set(questions.map((q) => q.kind)).size, [questions]);
  const q = questions[step];

  useEffect(() => setProgress(step < 0 ? 0 : Math.min(1, step / questions.length)), [step, questions.length, setProgress]);

  const onAnswer: Answer = (ok, right) => {
    setResult({ ok, right });
    if (ok) {
      sfx.correct();
      celebrate();
      setScore((s) => s + 1);
      addXp(XP_EACH);
    } else sfx.wrong();
  };
  const next = async () => {
    setResult(null);
    const n = step + 1;
    setStep(n);
    if (n === questions.length) {
      await finish({ stay: true });
      const { data } = await createClient().from("gamification").select("current_streak").eq("user_id", userId).maybeSingle();
      setStreak(data?.current_streak ?? null);
    }
  };

  if (step < 0)
    return (
      <div className="my-auto flex flex-col items-center py-6 text-center">
        <PartIcon k="quiz" size={128} />
        <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.14em] text-[#FF7AB8]">{fill(t.quizKicker, { n: episodeN })}</p>
        <h2 className="mt-2 text-[32px] font-extrabold leading-tight">{t.quizReady}</h2>
        <p className="mt-3 text-white/80">{fill(t.quizMeta, { n: kinds, xp: questions.length * XP_EACH })}</p>
        <button
          type="button"
          onClick={() => {
            sfx.bing(0);
            setStep(0);
          }}
          className="kit-focus-light mt-7 w-full max-w-xs rounded-2xl bg-gradient-to-b from-[#FF5FA2] to-[#D4145A] py-4 text-lg font-extrabold shadow-[0_14px_30px_-12px_#F20174]"
        >
          {t.quizStart}
        </button>
      </div>
    );

  if (!q)
    return (
      <div className="my-auto py-6 text-center">
        <p className="text-6xl" aria-hidden>
          {score / questions.length >= 0.7 ? "🏆" : "💪"}
        </p>
        <h2 className="mt-3 text-3xl font-extrabold">{fill(t.result, { n: score, total: questions.length })}</h2>
        <p className="mt-1 text-lg font-extrabold text-[#FFEF05]">{fill(t.xpWon, { n: score * XP_EACH })}</p>
        {streak !== null && streak > 0 && <p className="mt-2 font-bold text-white/85">🔥 {streak === 1 ? t.streakOne : fill(t.streak, { n: streak })}</p>}
        <div className="mx-auto mt-7 flex max-w-xs flex-col gap-2.5">
          {nextEpisodeHref && (
            <Link href={nextEpisodeHref} className="kit-focus-light rounded-2xl bg-[#FFEF05] px-5 py-3.5 font-extrabold text-[#1B1830]">
              {fill(t.nextEp, { n: nextEpisodeN ?? episodeN + 1 })}
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setScore(0);
              setRound((r) => r + 1);
              setStep(0);
            }}
            className="kit-focus-light rounded-2xl border border-white/30 px-5 py-3.5 font-extrabold"
          >
            {t.retry}
          </button>
          <Link href={backHref} className="kit-focus-light rounded-xl py-2 text-sm font-bold text-white/80 underline">
            {t.back}
          </Link>
        </div>
      </div>
    );

  const label =
    q.kind === "picture"
      ? t.q.picture
      : q.kind === "listen"
        ? t.q.listen
        : q.kind === "build"
          ? t.q.build
          : q.kind === "match"
            ? t.q.match
            : q.kind === "extra"
              ? t.q.extra
              : t.q.choose;
  return (
    <div className="flex flex-1 flex-col gap-5 pt-3">
      <div className="flex gap-1.5" aria-hidden>
        {questions.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-[#FF7AB8]" : i === step ? "bg-white" : "bg-white/15"}`} />
        ))}
      </div>
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF7AB8]">
        {step + 1}/{questions.length} · {label}
      </p>
      {"prompt" in q && <Prompt key={`p${round}:${step}`} text={q.prompt} voice={"voice" in q ? q.voice : null} label={t.readQ} />}
      <div key={`${round}:${step}`}>
        {q.kind === "build" ? (
          <Build q={q} onAnswer={onAnswer} />
        ) : q.kind === "extra" ? (
          <Extra q={q} onAnswer={onAnswer} />
        ) : q.kind === "match" ? (
          <Match q={q} onAnswer={onAnswer} />
        ) : (
          <Choice q={q} onAnswer={onAnswer} />
        )}
      </div>
      {result && (
        <div className={`kit-pop mt-auto rounded-3xl p-4 ${result.ok ? "bg-[#7CC94A] text-[#0E2B07]" : "bg-[#3A1020] text-white ring-1 ring-[#FF5C7A]/50"}`} role="status">
          <p className="text-xl font-extrabold">{result.ok ? `🎉 ${t.correct} +${XP_EACH} XP` : result.right ? fill(t.wrong, { a: result.right }) : t.almost}</p>
          <button
            type="button"
            onClick={() => void next()}
            className={`kit-focus-light mt-3 w-full rounded-2xl py-3 font-extrabold ${result.ok ? "bg-[#0E2B07] text-white" : "bg-white text-[#1A0812]"}`}
          >
            {t.next}
          </button>
        </div>
      )}
    </div>
  );
}
