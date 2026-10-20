"use client";

// Microphone / camera helpers shared by every recorder (Speaking Practice, the Interview simulator, BsnsTask,
// useRecorder, the video proof and the self video). The rules (content/fixes/celsbsns-recording-progress-fix.md):
// - SpeechRecognition and getUserMedia never run at the same time (WebKit handles two captures of one mic badly:
//   results stop, onend never comes and the tab's audio can stay stuck).
// - Safari / WebKit (Mac, iPhone, iPadOS that reports "Macintosh") records with MediaRecorder (audio/mp4) and the
//   transcribe-speech Edge Function; it never uses webkitSpeechRecognition.
// - Chrome / Edge use SpeechRecognition alone (live words, no getUserMedia, no AudioContext). If the speech service
//   fails (offline, blocked), that session switches to MediaRecorder once recognition has stopped.
// - Stopping always finishes: recognition is aborted after 1.2 s, the recorder falls back to the chunks it already
//   has after 1.5 s, and transcription gives up after 20 s.
// Audio is never stored: blobs live in memory, go to transcribe-speech once (it keeps nothing) and are dropped.
import { useCallback, useEffect, useRef } from "react";
import type { createClient } from "@/lib/supabase/client";

type Client = ReturnType<typeof createClient>;

export type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

/** Test hook (harmless in production): localStorage "celsu:rec-engine" = "webkit" | "speech" | "recorder". */
function forcedEngine(): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem("celsu:rec-engine") : null;
  } catch {
    return null;
  }
}

/** Safari or any iOS / iPadOS browser (all WebKit underneath), including iPadOS that reports "Macintosh". */
export function isWebKitBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const forced = forcedEngine();
  if (forced === "webkit") return true;
  if (forced === "speech" || forced === "recorder") return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const webkit = /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR|Android/.test(ua);
  return ios || webkit;
}

export function speechApi(): (new () => SpeechRec) | null {
  if (typeof window === "undefined" || isWebKitBrowser() || forcedEngine() === "recorder") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canRecord = () => typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/** The best recorder type: Safari gets mp4 first (its webm support is partial); others webm. */
export function pickMime(kind: "audio" | "video"): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const webkit = isWebKitBrowser();
  const list =
    kind === "audio"
      ? webkit
        ? ["audio/mp4", "audio/mp4;codecs=mp4a.40.2", "audio/webm;codecs=opus", "audio/webm"]
        : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
      : webkit
        ? ["video/mp4", "video/mp4;codecs=avc1", "video/webm"]
        : ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  return list.find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m);
    } catch {
      return false;
    }
  });
}

export function stopTracks(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((tr) => {
    try {
      tr.stop();
    } catch {
      /* already stopped */
    }
  });
}

/**
 * Stops a MediaRecorder and resolves with what it recorded. Never hangs: if the recorder is already inactive, or
 * onstop doesn't come within `ms`, the Blob is built from the chunks collected so far.
 */
export function stopRecorder(rec: MediaRecorder, chunks: Blob[], ms = 1500): Promise<Blob> {
  const type = (rec.mimeType || "audio/webm").split(";")[0];
  const build = () => new Blob(chunks, { type });
  return new Promise<Blob>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(build());
    };
    const timer = setTimeout(finish, ms);
    if (rec.state === "inactive") return finish();
    rec.addEventListener("stop", () => setTimeout(finish, 0), { once: true });
    try {
      rec.stop();
    } catch {
      finish();
    }
  });
}

/** Stops speech recognition; resolves on onend, or after `ms` calls abort() and resolves anyway. */
export function stopRecognition(recog: SpeechRec, ms = 1200): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      try {
        recog.abort?.();
      } catch {
        /* nothing to abort */
      }
      finish();
    }, ms);
    recog.onend = finish;
    try {
      recog.stop();
    } catch {
      try {
        recog.abort?.();
      } catch {
        /* nothing to abort */
      }
      finish();
    }
  });
}

export function abortRecognition(recog: SpeechRec | null | undefined) {
  if (!recog) return;
  recog.onend = null;
  recog.onresult = null;
  recog.onerror = null;
  try {
    if (recog.abort) recog.abort();
    else recog.stop();
  } catch {
    /* already stopped */
  }
}

export const MAX_TRANSCRIBE = 3_000_000;

/** One recording → transcribe-speech → text. null on error, timeout (20 s) or a file that's too big. */
export async function transcribe(supabase: Client, blob: Blob, ms = 20_000): Promise<string | null> {
  if (blob.size === 0 || blob.size > MAX_TRANSCRIBE) return null;
  const ctrl = new AbortController();
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.append("audio", blob, `speech.${ext}`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      ctrl.abort();
      resolve(null);
    }, ms);
  });
  try {
    const call = supabase.functions.invoke("transcribe-speech", { body: fd, signal: ctrl.signal }).then(({ data, error }) => {
      const text = (data as { text?: unknown } | null)?.text;
      return error || typeof text !== "string" ? null : text.trim();
    });
    return await Promise.race([call, timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type VoiceResult = { text: string; dur: number; failed: boolean };

type Session = {
  id: number;
  t0: number;
  recog: SpeechRec | null;
  rec: MediaRecorder | null;
  stream: MediaStream | null;
  chunks: Blob[];
  final: string;
  interim: string;
  stopping: boolean;
  restarts: number;
};

/** Speech service failures: this session goes on with MediaRecorder (recognition has stopped by then). */
const FATAL = new Set(["network", "service-not-allowed", "language-not-supported", "bad-grammar"]);
let speechBroken = false;

/**
 * One voice answer at a time: start() → stop() gives {text, dur, failed}. stop() always settles within ~1.5 s plus
 * the transcription (≤ 20 s). cancel() drops the session (page hidden, another exercise, unmount); late callbacks
 * from an old session are ignored through the session id.
 */
export function useVoiceCapture(opts: { supabase: () => Client; onLive?: (text: string) => void; onTranscribing?: () => void }) {
  const cur = useRef<Session | null>(null);
  const seq = useRef(0);
  const onLive = useRef(opts.onLive);
  onLive.current = opts.onLive;
  const onTranscribing = useRef(opts.onTranscribing);
  onTranscribing.current = opts.onTranscribing;
  const sbRef = useRef(opts.supabase);
  sbRef.current = opts.supabase;

  const release = (x: Session) => {
    abortRecognition(x.recog);
    x.recog = null;
    if (x.rec && x.rec.state !== "inactive") {
      try {
        x.rec.stop();
      } catch {
        /* already stopped */
      }
    }
    stopTracks(x.stream);
    x.stream = null;
  };

  const cancel = useCallback(() => {
    const x = cur.current;
    cur.current = null;
    seq.current++;
    if (x) {
      release(x);
      x.rec = null;
      x.chunks = [];
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const startRecorder = async (x: Session): Promise<boolean> => {
    if (!canRecord()) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (cur.current !== x) {
      stopTracks(stream);
      return false;
    }
    x.stream = stream;
    const type = pickMime("audio");
    const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 64_000 });
    rec.ondataavailable = (e) => {
      if (e.data.size && cur.current === x) x.chunks.push(e.data);
    };
    rec.start(500);
    x.rec = rec;
    return true;
  };

  const startSpeech = (x: Session, Speech: new () => SpeechRec) => {
    const recog = new Speech();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;
    recog.onresult = (e) => {
      if (cur.current !== x) return;
      let interim = "";
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const res = e.results[k];
        if (res.isFinal) x.final += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      x.interim = interim;
      onLive.current?.((x.final + interim).replace(/\s+/g, " ").trim());
    };
    recog.onerror = (e) => {
      if (cur.current !== x || x.stopping) return;
      if (FATAL.has(e?.error ?? "")) {
        // The speech service isn't there: drop recognition, record instead (one capture at a time).
        speechBroken = true;
        abortRecognition(recog);
        if (x.recog === recog) x.recog = null;
        void startRecorder(x).catch(() => undefined);
      }
    };
    // Chrome ends continuous recognition after a silence; keep listening while the student is still recording.
    recog.onend = () => {
      if (cur.current !== x || x.stopping || x.recog !== recog || x.restarts >= 20) return;
      x.restarts++;
      try {
        recog.start();
      } catch {
        /* the next stop() handles it */
      }
    };
    recog.start();
    x.recog = recog;
  };

  /** false when there's no way to capture the voice here (the caller shows "type it"). */
  const start = useCallback(async (): Promise<boolean> => {
    cancel();
    const x: Session = { id: ++seq.current, t0: Date.now(), recog: null, rec: null, stream: null, chunks: [], final: "", interim: "", stopping: false, restarts: 0 };
    cur.current = x;
    const Speech = speechBroken ? null : speechApi();
    try {
      if (Speech) startSpeech(x, Speech);
      else if (!(await startRecorder(x))) throw new Error("no recorder");
    } catch {
      if (cur.current === x) cancel();
      return false;
    }
    if (cur.current !== x) return false;
    x.t0 = Date.now();
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startSpeech / startRecorder only use refs
  }, [cancel]);

  /** Ends the current answer. null when there was none, or when it was cancelled while finishing. */
  const stop = useCallback(async (): Promise<VoiceResult | null> => {
    const x = cur.current;
    if (!x || x.stopping) return null;
    x.stopping = true;
    const dur = Math.round((Date.now() - x.t0) / 1000);
    try {
      if (x.recog) {
        const recog = x.recog;
        x.recog = null;
        await stopRecognition(recog, 1200);
      }
      const said = (x.final + " " + x.interim).replace(/\s+/g, " ").trim();
      let blob: Blob | null = null;
      if (x.rec) {
        blob = await stopRecorder(x.rec, x.chunks, 1500);
        x.rec = null;
      }
      stopTracks(x.stream);
      x.stream = null;
      if (cur.current !== x) return null;
      if (said || !blob) return { text: said, dur, failed: false };
      if (blob.size === 0) return { text: "", dur, failed: false };
      onTranscribing.current?.();
      const text = await transcribe(sbRef.current(), blob);
      if (cur.current !== x) return null;
      return { text: text ?? "", dur, failed: text === null };
    } catch {
      return cur.current === x ? { text: "", dur, failed: true } : null;
    } finally {
      release(x);
      x.chunks = [];
      if (cur.current === x) cur.current = null;
    }
  }, []);

  return { start, stop, cancel, active: () => !!cur.current };
}

/** Calls `onLeave` when the page is hidden or unloaded (phone locked, app switched, tab closed, back/forward cache). */
export function usePageLeave(onLeave: () => void) {
  const ref = useRef(onLeave);
  ref.current = onLeave;
  useEffect(() => {
    const hide = () => document.visibilityState === "hidden" && ref.current();
    const leave = () => ref.current();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
    };
  }, []);
}
