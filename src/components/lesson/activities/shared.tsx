"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type ActivityT = Dictionary["activity"];

/** Signed URLs for this block's `storage://` refs, resolved on the server. */
export const Urls = createContext<Record<string, string>>({});
export const T = createContext<ActivityT | null>(null);

export function useT() {
  const t = useContext(T);
  if (!t) throw new Error("activity dictionary missing");
  return t;
}

/**
 * The app is self-contained: only our own Storage files (signed) and inline audio from the
 * migrated content are loaded. Anything else resolves to undefined and shows as unavailable.
 */
export function useResolve() {
  const urls = useContext(Urls);
  return (ref: unknown): string | undefined => {
    if (typeof ref !== "string" || !ref) return undefined;
    if (ref.startsWith("storage://")) return urls[ref];
    if (ref.startsWith("data:audio/")) return ref;
    return undefined;
  };
}

export const str = (v: unknown) => (typeof v === "string" ? v : "");
export const arr = <T = unknown,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
export const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Same order on the server and in the browser (no hydration mismatch), different per block. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    const j = (h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Migrated text uses **bold** markers and \n line breaks. */
export function Rich({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <p className={`whitespace-pre-line ${className ?? ""}`}>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}
    </p>
  );
}

// One player for the whole page, so starting a clip stops the previous one.
let current: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();

function usePlaying(src: string | undefined) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const update = () => setPlaying(!!src && current?.dataset.src === src && !current.paused);
    listeners.add(update);
    return () => void listeners.delete(update);
  }, [src]);
  return playing;
}

function play(src: string) {
  const notify = () => listeners.forEach((l) => l());
  if (current && current.dataset.src === src && !current.paused) {
    current.pause();
    notify();
    return;
  }
  current?.pause();
  const a = new Audio(src);
  a.dataset.src = src;
  a.onplay = a.onpause = a.onended = notify;
  current = a;
  a.play().catch(notify);
}

export function AudioButton({ src, label, className }: { src?: string; label?: string; className?: string }) {
  const t = useT();
  const playing = usePlaying(src);
  if (!src) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        play(src);
      }}
      className={className ?? "t-btn-ghost !px-3 !py-1.5"}
      aria-label={label || t.listen}
      aria-pressed={playing}
    >
      <span aria-hidden>{playing ? "⏸" : "🔊"}</span>
      {label !== "" && <span>{label ?? t.listen}</span>}
    </button>
  );
}

/** Device voice, for words that have no recording. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  window.speechSynthesis.speak(u);
}

/** Option button with the reader's correct / wrong styling. */
export function Option({
  state,
  onClick,
  disabled,
  children,
}: {
  state: "idle" | "correct" | "wrong" | "dim";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls = state === "correct" ? "t-opt-correct" : state === "wrong" ? "t-opt-wrong" : state === "dim" ? "t-opt-dim" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-[var(--t-radius)] border border-[var(--t-border)] p-3 text-left transition enabled:hover:bg-[var(--t-border)] ${cls}`}
    >
      {children}
    </button>
  );
}

export function Feedback({ ok, extra }: { ok: boolean; extra?: string }) {
  const t = useT();
  return (
    <p aria-live="polite" className={`text-sm font-semibold ${ok ? "text-green-600" : "text-red-600"}`}>
      {ok ? `✓ ${t.correct}` : `✗ ${t.incorrect}`}
      {extra && <span className="t-muted block font-normal">{extra}</span>}
    </p>
  );
}

export function Unavailable() {
  const t = useT();
  return <p className="t-muted text-sm">{t.unavailable}</p>;
}

/** Keeps a scroll target in view when stepping through a set. */
export function useScrollIntoView<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dep]);
  return ref;
}
