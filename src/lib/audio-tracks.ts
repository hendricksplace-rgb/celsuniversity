// Player tracks for CelsAudio: the CelsCast podcast (block `celscast`) and a recording's generated transcript
// (audio_transcripts.words). Shared by the CelsTV part screen and the CelsUS CelsAudio lesson.
import type { Chapter, Cue, Track } from "@/components/part/AudioPart";

/**
 * CelsCast (block `celscast`, version 1): lines with speaker and per-word start times (`wt`). CelsUS lines also
 * carry a Spanish subtitle (`es`) and chapters a Spanish title (`title_es`), used when `lang` is "es".
 */
export function celscastTrack(data: Record<string, unknown>, sign: (ref: string) => string | null, lang: "es" | "en" = "es"): Track {
  const speakers = (data.speakers ?? {}) as Record<string, string>;
  const lines = (Array.isArray(data.lines) ? data.lines : []) as { speaker?: string; text?: string; es?: string; start?: number; wt?: number[] }[];
  const cues: Cue[] = lines
    .filter((l) => typeof l.text === "string" && typeof l.start === "number")
    .map((l) => {
      const parts = l.text!.split(/\s+/).filter(Boolean);
      const wt = Array.isArray(l.wt) ? l.wt.filter((x) => typeof x === "number") : [];
      return {
        start: l.start!,
        text: l.text!,
        es: typeof l.es === "string" && l.es.trim() ? l.es : undefined,
        speaker: l.speaker ? (speakers[l.speaker] ?? l.speaker) : undefined,
        words: wt.length === parts.length ? parts.map((text, i) => ({ start: wt[i], text })) : undefined,
      };
    });
  const chapters = (Array.isArray(data.chapters) ? data.chapters : []) as (Chapter & { title_es?: unknown })[];
  const audio = typeof data.audio === "string" ? data.audio : null;
  return {
    key: "celscast",
    label: "CelsCast",
    src: audio ? sign(audio) : null,
    ref: audio,
    cues,
    chapters: chapters
      .filter((c) => typeof c?.start === "number" && typeof c?.title === "string")
      .map((c) => ({ start: c.start, title: lang === "es" && typeof c.title_es === "string" && c.title_es ? c.title_es : c.title })),
    voice: Object.values(speakers).join(" y "),
  };
}

type Timed = { start?: unknown; text?: unknown };
/** audio_transcripts.words → player lines, each with its own words (by start time). */
export function transcriptCues(w: unknown): Cue[] {
  const ok = (x: Timed): x is { start: number; text: string } => typeof x?.start === "number" && typeof x?.text === "string" && !!x.text.trim();
  const data = (w ?? {}) as { segments?: Timed[]; words?: Timed[] };
  const segs = (Array.isArray(data.segments) ? data.segments : []).filter(ok);
  const words = (Array.isArray(data.words) ? data.words : []).filter(ok);
  return segs.map((s, i) => {
    const end = segs[i + 1]?.start ?? Infinity;
    const mine = words.filter((x) => x.start >= s.start && x.start < end).map((x) => ({ start: x.start, text: x.text.trim() }));
    return { start: s.start, text: s.text.trim(), words: mine.length ? mine : undefined };
  });
}
