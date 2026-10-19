// CelsBSNS Video Submission: "record, keep your video, save only a thumbnail" (celsu-celsbsns-video-brief.md).
// One data structure for every week; the page (src/components/video/InteractiveVideo.tsx) is built once from it.
// Matt's decision: the video never leaves the device (a Blob URL in memory only). Only the chosen JPEG frame is saved.

export type Bi = { es: string; en: string };

export type VideoTaskData = {
  week: number;
  /** The lesson's text before the redesign, kept verbatim (content_blocks body and data.text_es). */
  original: { title: string; title_es: string; time: string; goal: string; goal_es: string; body_en: string; body_es: string };
  hero: { title_a: string; title_b: string; intro_es: string; intro_en: string; chips_es: string[]; chips_en: string[]; priv_b: Bi; priv_p: Bi };
  /** The target length in seconds (1:30–2:00); recording stops by itself at auto_stop_s. */
  seconds: { min: number; max: number };
  auto_stop_s: number;
  /** Learners reading aloud: about 100 words per minute. */
  wpm: number;
  must: { color: string; es: string; en: string }[];
  tips: { icon: "phone" | "mic" | "sun" | "shirt" | "eye" | "smile"; es: string; en: string; desc_es: string; desc_en: string }[];
  delivery: { es: [string, string][]; en: [string, string][] };
  /** The Writing lesson whose submission pre-fills "Mi guion". */
  script_source_lesson_id: string;
  capstone_part: number;
};

export type VideoProof = {
  thumbUrl: string | null;
  duration_s: number | null;
  self_check: number[];
  confidence: number | null;
  script: string | null;
  updated_at: string;
};

export const THUMB_MAX_BYTES = 200 * 1024;
export const thumbPath = (userId: string, lessonId: string) => `${userId}/${lessonId}.jpg`;
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const spokenSeconds = (script: string, wpm: number) => ((script.trim().match(/\S+/g) || []).length / wpm) * 60;

/** The mockup's grabFrames(): 4 JPEG frames at 12.5, 37.5, 62.5 and 87.5 % of the video, 640 px wide. Includes the
 *  Chrome WebM fix (a recorded WebM reports duration = Infinity until you seek far past the end). */
export async function grabFrames(url: string, fallbackDur: number): Promise<{ frames: string[]; dur: number }> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.src = url;
  await new Promise<void>((r) => {
    v.onloadedmetadata = () => r();
    v.onerror = () => r();
  });
  if (!isFinite(v.duration)) {
    v.currentTime = 1e7;
    await new Promise<void>((r) => {
      v.ontimeupdate = () => {
        v.ontimeupdate = null;
        r();
      };
      setTimeout(r, 2000);
    });
  }
  const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : fallbackDur;
  const c = document.createElement("canvas");
  const frames: string[] = [];
  for (let i = 0; i < 4; i++) {
    v.currentTime = (dur * (i + 0.5)) / 4;
    await new Promise<void>((r) => {
      v.onseeked = () => r();
      setTimeout(r, 1500);
    });
    const w = 640;
    const h = Math.round((640 * (v.videoHeight || 360)) / (v.videoWidth || 640));
    c.width = w;
    c.height = h;
    c.getContext("2d")?.drawImage(v, 0, 0, w, h);
    frames.push(c.toDataURL("image/jpeg", 0.72));
  }
  v.removeAttribute("src");
  v.load();
  return { frames, dur };
}

/** A data: URL JPEG as a Blob, re-encoded smaller if it would go over the bucket's 200 KB limit. */
export async function jpegBlob(dataUrl: string): Promise<Blob> {
  let blob = await (await fetch(dataUrl)).blob();
  if (blob.size <= THUMB_MAX_BYTES) return blob;
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement("canvas");
  for (const [w, q] of [
    [640, 0.55],
    [480, 0.5],
    [320, 0.5],
  ] as const) {
    c.width = w;
    c.height = Math.round((w * img.height) / img.width);
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", q));
    if (blob.size <= THUMB_MAX_BYTES) break;
  }
  return blob;
}
