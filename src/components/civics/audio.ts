"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { refreshExamAudio } from "@/app/app/examen-civico/actions";

/** Signed URLs expire after 10 minutes; ask the server again shortly before that. */
const REFRESH_AFTER_MS = 8 * 60 * 1000;

/** A clip is either one of our recordings or, while a recording is missing, the device voice. */
export type Clip = { ref?: string; text: string; lang: "en-US" | "es-US" };

export function useExamAudio(evaluationId: string, initial: Record<string, string>) {
  const urls = useRef({ map: initial, at: Date.now() });
  const audio = useRef<HTMLAudioElement | null>(null);
  const run = useRef(0);
  const [playing, setPlaying] = useState(false);
  // Which recording is playing and where, for word highlighting.
  const [position, setPosition] = useState<{ ref?: string; time: number }>({ time: -1 });

  const stop = useCallback(() => {
    run.current++;
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(false);
    setPosition({ time: -1 });
  }, []);

  useEffect(() => stop, [stop]);

  const urlFor = useCallback(
    async (ref?: string) => {
      if (!ref) return undefined;
      if (Date.now() - urls.current.at > REFRESH_AFTER_MS) {
        urls.current = { map: await refreshExamAudio(evaluationId).catch(() => urls.current.map), at: Date.now() };
      }
      return urls.current.map[ref];
    },
    [evaluationId],
  );

  /** Plays the clips one after another; a new call (or stop) cancels the rest. */
  const play = useCallback(
    async (clips: Clip[]) => {
      stop();
      const id = run.current;
      setPlaying(true);
      for (const clip of clips) {
        if (run.current !== id) return;
        const url = await urlFor(clip.ref);
        if (run.current !== id) return;
        if (url) await playUrl(url, audio, (time) => run.current === id && setPosition({ ref: clip.ref, time }));
        else await speak(clip.text, clip.lang);
      }
      if (run.current === id) {
        setPlaying(false);
        setPosition({ time: -1 });
      }
    },
    [stop, urlFor],
  );

  return { play, stop, playing, position };
}

function playUrl(url: string, holder: React.RefObject<HTMLAudioElement | null>, onTime: (t: number) => void) {
  return new Promise<void>((resolve) => {
    const a = new Audio(url);
    holder.current = a;
    let frame = 0;
    // Every frame rather than on timeupdate (~4 per second), so the highlight keeps up with the voice.
    const tick = () => {
      onTime(a.currentTime);
      frame = requestAnimationFrame(tick);
    };
    const end = () => {
      cancelAnimationFrame(frame);
      resolve();
    };
    a.onplay = () => (frame = requestAnimationFrame(tick));
    a.onended = a.onerror = a.onpause = end;
    a.play().catch(end);
  });
}

function speak(text: string, lang: string) {
  return new Promise<void>((resolve) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.92;
    u.onend = u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

// ---------- speech recognition (Chrome, Edge, Safari; not Firefox) ----------

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type ListenResult = { alternatives: string[]; error?: "no-speech" | "blocked" | "other" };

export function useSpeechAnswer() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognition | null>(null);

  // Checked after mount: the server render can't know the browser.
  useEffect(() => setSupported(!!recognitionCtor()), []);
  useEffect(() => () => rec.current?.abort(), []);

  /** Listens for one answer in English. Resolves with every alternative the recognizer heard. */
  const listen = useCallback(
    () =>
      new Promise<ListenResult>((resolve) => {
        const Ctor = recognitionCtor();
        if (!Ctor) return resolve({ alternatives: [], error: "other" });
        const r = new Ctor();
        rec.current = r;
        r.lang = "en-US";
        r.interimResults = true;
        r.continuous = false;
        r.maxAlternatives = 5;
        const heard: string[] = [];
        let error: ListenResult["error"];
        r.onresult = (e) => {
          const last = e.results[e.results.length - 1];
          setInterim(last[0]?.transcript ?? "");
          if (last.isFinal) for (let i = 0; i < last.length; i++) heard.push(last[i].transcript);
        };
        r.onerror = (e) => {
          error = e.error === "no-speech" ? "no-speech" : e.error === "not-allowed" || e.error === "service-not-allowed" ? "blocked" : "other";
        };
        r.onend = () => {
          setListening(false);
          resolve({ alternatives: heard, error: heard.length ? undefined : (error ?? "no-speech") });
        };
        setInterim("");
        setListening(true);
        r.start();
      }),
    [],
  );

  const stopListening = useCallback(() => rec.current?.stop(), []);

  return { supported, listening, interim, listen, stopListening };
}
