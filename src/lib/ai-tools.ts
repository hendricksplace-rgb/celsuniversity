// CelsGLOBAL AI tools (celsu-ai-tools-spec.md): shared types and helpers for the screens.
// The evaluations run in the `ai-tools` edge function.

export type ResumeCategory = { name: string; score: number; strengths: string; recommendation: string };
export type OptimizedResume = {
  summary: string;
  experience: { title: string; company: string; dates: string; bullets: string[] }[];
  education: { credential: string; institution: string; dates: string }[];
  skills: string[];
};
export type ResumeResult = {
  valid: boolean;
  reason?: string;
  total_score?: number;
  readiness_level?: string;
  overview?: string;
  categories?: ResumeCategory[];
  top_recommendations?: string[];
  red_flags?: string[];
  optimized_resume?: OptimizedResume;
  motivational_note?: string;
};
export type ResumeReview = {
  id: string;
  file_name: string | null;
  status: string;
  created_at: string;
  unlock_at: string;
  result: ResumeResult | null;
  original_text: string | null;
};

export const RESUME_HOLD_HOURS = 48;

/** "Very Good (Minor Edits)" → "veryGood" (the dictionary key). */
export function levelKey(readiness: string | undefined) {
  const r = (readiness ?? "").toLowerCase();
  if (r.startsWith("excellent")) return "excellent";
  if (r.startsWith("very good")) return "veryGood";
  if (r.startsWith("needs")) return "needsWork";
  if (r.startsWith("weak")) return "weak";
  return "poor";
}

/** Name and contact line for the optimized resume, from the top of the original text. */
export function resumeHeader(original: string | null) {
  const lines = (original ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8);
  const contact = lines.find((l) => /@|\+?\d[\d\s().-]{7,}|linkedin/i.test(l)) ?? "";
  const name = lines.find((l) => l !== contact && l.length <= 60 && !/@|\d|resume|curriculum|cv\b/i.test(l)) ?? "";
  return { name, contact };
}

/** Plain text of the optimized resume ("Copiar texto"). */
export function resumeText(header: { name: string; contact: string }, r: OptimizedResume) {
  const out: string[] = [];
  if (header.name) out.push(header.name.toUpperCase());
  if (header.contact) out.push(header.contact);
  out.push("", "PROFESSIONAL SUMMARY", r.summary, "", "EXPERIENCE");
  for (const e of r.experience) {
    out.push(`${e.title} · ${e.company} · ${e.dates}`);
    for (const b of e.bullets) out.push(`• ${b}`);
    out.push("");
  }
  out.push("EDUCATION");
  for (const e of r.education) out.push(`${e.credential} · ${e.institution} · ${e.dates}`);
  out.push("", "SKILLS", r.skills.join(" · "));
  return out.join("\n");
}

export const INTERVIEW_KEYS = ["about", "why", "strengths", "challenge"] as const;
export type InterviewKey = (typeof INTERVIEW_KEYS)[number];
// Same list as supabase/functions/ai-tools/interview.ts.
export const QUESTIONS: Record<InterviewKey, { en: string; es: string; short: string }> = {
  about: { en: "Tell me about yourself.", es: "Háblame de ti.", short: "Tell me about yourself." },
  why: { en: "Why do you want this job?", es: "¿Por qué quieres este trabajo?", short: "Why do you want this job?" },
  strengths: { en: "What are your strengths and weaknesses?", es: "¿Cuáles son tus fortalezas y debilidades?", short: "Strengths and weaknesses" },
  challenge: { en: "Tell me about a challenge you faced at work.", es: "Cuéntame un reto que enfrentaste en el trabajo.", short: "A challenge at work" },
};

export type InterviewFeedback = {
  star: Record<"situation" | "task" | "action" | "result", { found: boolean; note: string }>;
  score: number;
  under_two_minutes: boolean;
  positive_ending: boolean;
  clear_english: boolean;
  verdict_es: string;
  strength_es: string;
  improve_es: string;
  suggested_line: string;
};
export type InterviewSummary = { points: number; max: number; questions: { key: string; score: number; suggested_line: string }[]; strength_es: string; improve_es: string };
