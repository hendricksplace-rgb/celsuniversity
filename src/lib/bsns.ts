// CelsBSNS: a week is videos plus tasks a coach reviews (celsu-celsbook-us-bsns-spec.md §3).
import type { Part } from "@/lib/course-page";

/** Tasks the student answers on the task screen and hands to the coach. */
export const SUBMISSION_TYPES = new Set(["writing", "research", "speaking", "video_submission"]);
export const MEDIA_TYPES = new Set(["speaking", "video_submission"]);

export const weekPath = (slug: string, n: number) => `/app/cursos/${slug}/semana/${n}`;
export const taskPath = (slug: string, n: number, lessonId: string) => `${weekPath(slug, n)}/tarea/${lessonId}`;

/** "Week 2 – Business Etiquette & Workplace Culture" → "Business Etiquette & Workplace Culture". */
export const weekTitle = (title: string) => title.replace(/^(Module|Week)\s*\d+\s*[:–—-]?\s*/i, "").trim();

/** "Week 2: 01 | Opening & Week 2 Focus" → "Opening & Week 2 Focus"; "Week 6 - Video 01" → "Video 01". */
export const videoTitle = (title: string) => (title.includes("|") ? title.slice(title.lastIndexOf("|") + 1) : title.replace(/^Week\s*\d+\s*[:–—-]?\s*/i, "")).trim() || title;

/** "Writing Task (1–2 hours)" → { name: "Writing Task", label: "1–2 h", hours: 1.5 }. */
export function taskTime(title: string) {
  const m = title.match(/\(\s*([\d.]+)\s*(?:[–-]\s*([\d.]+))?\s*(?:h|hr|hrs|hour|hours)\s*\)/i);
  const name = title.replace(/\s*\([^)]*\)\s*(\(\d+\))?\s*$/, "").trim() || title;
  if (!m) return { name, label: null, hours: 0 };
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  return { name, label: m[2] ? `${m[1]}–${m[2]} h` : `${m[1]} h`, hours: (lo + hi) / 2 };
}

export type TaskStatus = "pending" | "progress" | "submitted" | "reviewed" | "coach" | "done";
export type SubmissionRow = { lesson_id: string; status: string };

export function taskStatus(p: Part, sub: SubmissionRow | undefined): TaskStatus {
  if (p.type && SUBMISSION_TYPES.has(p.type)) {
    if (sub?.status === "reviewed") return "reviewed";
    if (sub?.status === "submitted") return "submitted";
    return sub || p.started ? "progress" : "pending";
  }
  if (p.done) return "done";
  if (p.type === "feedback") return "coach";
  return p.started ? "progress" : "pending";
}
