// CelsBSNS: a week is videos plus tasks (celsu-celsbook-us-bsns-spec.md §3). Since 2026-10-19 no task goes to a
// coach; 'submitted' / 'reviewed' are older Writing rows.
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
    // Writing saved as finished (no coach), or a Research / Video / Speaking lesson completed on its own page.
    if (sub?.status === "finished" || p.done) return "done";
    return sub || p.started ? "progress" : "pending";
  }
  if (p.done) return "done";
  if (p.type === "feedback") return "coach";
  return p.started ? "progress" : "pending";
}

// ---------- Week page v2 (celsu-celsbsns-semana-brief.md) ----------

/** Short topic per week for the 10-week route (the module titles are long English titles; labels from the v2 mockup). */
export const WEEK_TOPICS: Record<"es" | "en", string[]> = {
  es: ["Comunicación", "Etiqueta", "Liderazgo", "RR. HH.", "Organización", "Ética", "Finanzas", "Marketing", "Proyectos", "Entrevista"],
  en: ["Communication", "Etiquette", "Leadership", "HR", "Organization", "Ethics", "Finance", "Marketing", "Projects", "Interview"],
};

/** Suggested due day within the week (day 1 = the week's first day); never a lock. */
export const DUE_DAY: Record<string, number> = { writing: 5, video_submission: 7, speaking: 7 };

/** A time like "1–2 Hours", "~1 hour" or "15 minutes" → { label: "1–2 h", hours: 1.5 }. */
export function parseTime(s: string | null | undefined): { label: string; hours: number } | null {
  const m = (s ?? "").match(/([\d.]+)\s*(?:[–-]\s*([\d.]+))?\s*(hours?|hrs?|horas?|h\b|minutes?|mins?|minutos?)/i);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  const min = /^m/i.test(m[3]);
  const label = `${m[2] ? `${m[1]}–${m[2]}` : m[1]} ${min ? "min" : "h"}`;
  return { label, hours: min ? (lo + hi) / 120 : (lo + hi) / 2 };
}

/** "Title:", "Time:"/"Estimated Time:", "Goal:"/"Objective:" (and the Spanish ones) from the head of a lesson text. */
export function lessonFields(en: string, es: string | null) {
  const head = (s: string) => s.split("\n").slice(0, 14).join("\n");
  const get = (s: string, re: RegExp) => head(s).match(re)?.[1]?.trim() || null;
  const unquote = (s: string | null) => (s ? s.replace(/^["“”']+|["“”']+$/g, "").trim() : null);
  return {
    title: unquote(get(en, /^\s*Title:\s*(.+)$/im)),
    time: parseTime(get(en, /^\s*(?:Estimated\s+)?Time:\s*(.+)$/im) ?? (es ? get(es, /^\s*Tiempo(?:\s+estimado)?:\s*(.+)$/im) : null)),
    type: get(en, /^\s*Type:\s*(.+)$/im),
    goalEn: get(en, /^\s*(?:Goal|Objective):\s*(.+)$/im),
    goalEs: es ? get(es, /^\s*Objetivo:\s*(.+)$/im) : null,
  };
}

export const BSNS_SLUG = "english-for-business";
export const BSNS_WEEKS = 10;
export const capstonePath = (slug: string) => `/app/cursos/${slug}/capstone`;

/**
 * The student's current week (Matt, 2026-10-19): the lowest week that still has incomplete lessons; week 10 once
 * every week is done; week 1 for a new student. `weeks` are the lesson weeks in order, with each lesson's completion.
 */
export function currentWeekOf(weeks: { n: number; done: boolean[] }[]) {
  const open = weeks.find((w) => w.done.some((d) => !d));
  if (open) return Math.min(open.n, BSNS_WEEKS);
  return weeks.length ? Math.min(weeks[weeks.length - 1].n, BSNS_WEEKS) : 1;
}

/**
 * The week the student is on, for Progreso, Inicio, Mis cursos and the course's redirect
 * (content/fixes/celsbsns-recording-progress-fix.md): the week of the most recent activity (progress.last_activity of
 * that week's lessons); if that week is complete, the next one; week 1 with no activity. Students who work out of
 * order (weeks 7–9 first) see where they really are, not the first week they skipped. The week page's own route
 * map keeps currentWeekOf (the lowest week with incomplete lessons).
 */
export function activeWeekOf(weeks: { n: number; done: boolean[]; last: string | null }[]) {
  const latest = weeks.filter((w) => w.last).sort((a, b) => (a.last! < b.last! ? 1 : a.last! > b.last! ? -1 : a.n - b.n))[0];
  if (!latest) return Math.min(weeks[0]?.n ?? 1, BSNS_WEEKS);
  const complete = latest.done.length > 0 && latest.done.every(Boolean);
  if (!complete) return Math.min(latest.n, BSNS_WEEKS);
  const next = weeks.find((w) => w.n > latest.n);
  return Math.min(next?.n ?? latest.n, BSNS_WEEKS);
}

/** Where "English For Business" opens from Inicio, Mis cursos and the route cards: the active week, from course stats. */
export function bsnsHomeHref(c: { slug: string; modules: { complete: boolean; lastActivity?: string | null }[] }) {
  return weekPath(c.slug, activeWeekOf(c.modules.slice(0, BSNS_WEEKS).map((m, i) => ({ n: i + 1, done: [m.complete], last: m.lastActivity ?? null }))));
}
