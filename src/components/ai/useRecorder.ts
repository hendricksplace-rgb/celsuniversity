"use client";

// Microphone recorder (MediaRecorder) with a live level meter and a time limit. The recording stays in the
// browser: callers decide what to do with the blob (InterviewTool sends it for feedback; the CelsUS CelsBook
// only plays it back). Stop always finishes (lib/voice stopRecorder: state check + chunk fallback), and the mic is
// released when the page is hidden or left. Safari records audio/mp4. No speech recognition runs alongside.
import { useCallback, useEffect, useRef, useState } from "react";
import { canRecord, pickMime, stopRecorder, stopTracks, usePageLeave } from "@/lib/voice";

const MAX_S = 120;

export function useRecorder(onDone: (blob: Blob, seconds: number) => void) {
  const [state, setState] = useState<"idle" | "recording" | "stopping" | "denied" | "unsupported">("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(15).fill(0.15));
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const raf = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const session = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stopTracks(stream.current);
    stream.current = null;
    const c = ctx.current;
    ctx.current = null;
    if (c && c.state !== "closed") void c.close().catch(() => undefined);
  }, []);

  const stop = useCallback(async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    const id = session.current;
    const secs = (Date.now() - started.current) / 1000;
    setState("stopping");
    cancelAnimationFrame(raf.current);
    try {
      const blob = await stopRecorder(r, chunks.current, 1500);
      if (id === session.current) done.current(blob, secs);
    } finally {
      chunks.current = [];
      cleanup();
      if (id === session.current) setState("idle");
    }
  }, [cleanup]);

  /** Page hidden or left, or unmount: drop the recording, free the mic. */
  const cancel = useCallback(() => {
    session.current++;
    const r = rec.current;
    rec.current = null;
    if (r && r.state !== "inactive") {
      try {
        r.stop();
      } catch {
        /* already stopped */
      }
    }
    chunks.current = [];
    cleanup();
    setState((s) => (s === "recording" || s === "stopping" ? "idle" : s));
  }, [cleanup]);
  useEffect(() => cancel, [cancel]);
  usePageLeave(() => {
    if (rec.current) cancel();
  });

  const start = async () => {
    if (rec.current) return;
    if (!canRecord()) return setState("unsupported");
    const id = ++session.current;
    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setState("denied");
    }
    if (id !== session.current) return stopTracks(s);
    stream.current = s;
    const type = pickMime("audio");
    let r: MediaRecorder;
    try {
      r = new MediaRecorder(s, type ? { mimeType: type } : undefined);
    } catch {
      cleanup();
      return setState("unsupported");
    }
    rec.current = r;
    chunks.current = [];
    r.ondataavailable = (e) => {
      if (e.data.size && id === session.current) chunks.current.push(e.data);
    };
    // Live level meter from the microphone.
    let analyser: AnalyserNode | null = null;
    try {
      ctx.current = new AudioContext();
      analyser = ctx.current.createAnalyser();
      analyser.fftSize = 64;
      ctx.current.createMediaStreamSource(s).connect(analyser);
    } catch {
      analyser = null;
    }
    const data = new Uint8Array(analyser?.frequencyBinCount ?? 32);
    const tick = () => {
      if (id !== session.current || rec.current !== r) return;
      if (analyser) {
        analyser.getByteFrequencyData(data);
        setLevels(Array.from({ length: 15 }, (_, i) => Math.max(0.12, data[i + 1] / 255)));
      }
      const sec = (Date.now() - started.current) / 1000;
      setSeconds(sec);
      if (sec >= MAX_S) void stop();
      else raf.current = requestAnimationFrame(tick);
    };
    started.current = Date.now();
    r.start(500);
    setState("recording");
    tick();
  };
  return { state, seconds, levels, start, stop };
}
