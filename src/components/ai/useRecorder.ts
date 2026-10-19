"use client";

// Microphone recorder (MediaRecorder) with a live level meter and a time limit. The recording stays in the
// browser: callers decide what to do with the blob (InterviewTool sends it for feedback; the CelsUS CelsBook
// only plays it back).
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_S = 120;

export function useRecorder(onDone: (blob: Blob, seconds: number) => void) {
  const [state, setState] = useState<"idle" | "recording" | "denied" | "unsupported">("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(15).fill(0.15));
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const raf = useRef(0);
  const stream = useRef<MediaStream | null>(null);

  const cleanup = () => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  };
  useEffect(() => cleanup, []);

  const stop = useCallback(() => {
    if (rec.current?.state === "recording") rec.current.stop();
  }, []);

  const start = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setState("denied");
    }
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
    const r = new MediaRecorder(stream.current, type ? { mimeType: type } : undefined);
    rec.current = r;
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const secs = (Date.now() - started.current) / 1000;
      cleanup();
      setState("idle");
      onDone(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }), secs);
    };
    // Live waveform from the microphone.
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    ctx.createMediaStreamSource(stream.current).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      setLevels(Array.from({ length: 15 }, (_, i) => Math.max(0.12, data[i + 1] / 255)));
      const s = (Date.now() - started.current) / 1000;
      setSeconds(s);
      if (s >= MAX_S) r.stop();
      else raf.current = requestAnimationFrame(tick);
    };
    started.current = Date.now();
    r.start(500);
    setState("recording");
    tick();
  };
  return { state, seconds, levels, start, stop };
}
