// C-031: the evaluation's recorded clips (Amy / Brian, audio_jobs kind eval_v2) and one player for all of them, with
// karaoke: the word lit is the last wt[i] at or before currentTime (the Grammar v2 rule). One clip plays at a time.

export type Clip = { id: string; text: string; url: string; wt: number[]; duration: number | null };
export type Clips = Clip[];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”«»"]/g, "")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The clip for a text (a listening audio, a question, a passage, a prompt or an option), if one is recorded. */
export function clipFor(clips: Clips, text: string | null | undefined): Clip | null {
  if (!text) return null;
  const n = norm(text);
  return clips.find((c) => norm(c.text) === n) ?? null;
}

type Opts = { onWord?: (k: number) => void; onProgress?: (p: number) => void; onEnd?: () => void };
let current: { a: HTMLAudioElement; stop: () => void } | null = null;

export function stopAudio() {
  current?.stop();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function playClip(clip: Clip, o: Opts = {}) {
  stopAudio();
  const a = new Audio(clip.url);
  let raf = 0;
  let ended = false;
  const stop = () => {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    a.pause();
    if (current?.a === a) current = null;
    o.onWord?.(-1);
    o.onEnd?.();
  };
  current = { a, stop };
  const tick = () => {
    const t = a.currentTime;
    let k = -1;
    for (let i = 0; i < clip.wt.length; i++) if (t >= clip.wt[i] - 0.02) k = i;
    o.onWord?.(k);
    const d = a.duration || clip.duration || 0;
    if (d) o.onProgress?.(Math.min(1, t / d));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  a.onended = () => {
    o.onProgress?.(1);
    stop();
  };
  a.onerror = stop;
  void a.play().catch(stop);
}

/**
 * A listening audio that isn't recorded yet keeps the browser's voice until Cowork records it (the engine can't
 * skip items: the server replays the same picks). Progress is estimated from the length of the text.
 */
export function speakFallback(text: string, o: Opts = {}) {
  stopAudio();
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return o.onEnd?.();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("en"));
  if (v) u.voice = v;
  const est = Math.max(1.5, text.split(/\s+/).length * 0.42);
  const t0 = performance.now();
  let raf = 0;
  const tick = () => {
    o.onProgress?.(Math.min(0.98, (performance.now() - t0) / 1000 / est));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  u.onend = () => {
    cancelAnimationFrame(raf);
    o.onProgress?.(1);
    o.onEnd?.();
  };
  window.speechSynthesis.speak(u);
}

/** A very soft tick / chime (WebAudio), off when the page asks for reduced motion. */
let ac: AudioContext | null = null;
export function tone(freq: number, dur = 0.12, vol = 0.05) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac ??= new AC();
    if (ac.state === "suspended") void ac.resume();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch {}
}
