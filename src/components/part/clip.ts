// One clip at a time, with the word being said read from currentTime on every frame (karaoke). Used by
// CelsTV Grammar v2 and the leaderboard cheers (C-026).
import { fileRoute } from "@/components/reader/media";

let current: { a: HTMLAudioElement; stop: () => void } | null = null;
export function playClip(ref: string | undefined, onWord?: (k: number) => void, wt?: number[], done?: () => void) {
  current?.stop();
  if (!ref) return done?.();
  const a = new Audio(fileRoute(ref));
  let raf = 0;
  let ended = false;
  const stop = () => {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    a.pause();
    if (current?.a === a) current = null;
    done?.();
  };
  current = { a, stop };
  if (onWord && wt?.length) {
    const tick = () => {
      const t = a.currentTime;
      let k = -1;
      for (let i = 0; i < wt.length; i++) if (t >= wt[i] - 0.02) k = i;
      onWord(k);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  a.onended = stop;
  a.onerror = stop;
  void a.play().catch(stop);
}

/** Stops whatever clip is playing. */
export const stopClip = () => current?.stop();
