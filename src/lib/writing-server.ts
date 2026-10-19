import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { fullEmail, type HistoryEntry, type SubmissionStatus, type WritingData, type WritingSubmission } from "@/lib/writing";

type Client = Awaited<ReturnType<typeof createClient>>;

export type WritingLoad = {
  data: WritingData;
  sub: WritingSubmission | null;
  /** The Capstone part already holds this submission's current text. */
  capstoneSaved: boolean;
  /** The student's coach (a teacher in one of their classes), and who reviewed this submission. */
  coachName: string | null;
  reviewerName: string | null;
  /** The student's "Mis frases" (phrase_bank, owner only), oldest first. */
  myPhrases: string[];
};

/** The lesson's Interactive Writing Task, or null when it has none (the lesson then renders as before).
 *  writing_content's RLS lets in staff and students with access to the course; submissions are the student's own. */
export async function loadWriting(supabase: Client, userId: string, lessonId: string, courseId: string): Promise<WritingLoad | null> {
  // One round trip: the content and the student's rows together.
  const [{ data: row }, { data: s }, { data: people }, { data: caps }, { data: bank }] = await Promise.all([
    supabase.from("writing_content").select("data").eq("lesson_id", lessonId).maybeSingle(),
    supabase
      .from("submissions")
      .select("id, subject, body, status, version, parts_confirmed, history, coach_good, coach_improve, coach_message, coach_feedback, reviewed_by, reviewed_at, submitted_at")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle(),
    supabase.rpc("my_class_people"),
    supabase.from("capstone_parts").select("part, source_submission_id, body").eq("user_id", userId).eq("course_id", courseId),
    supabase.from("phrase_bank").select("text").eq("user_id", userId).order("created_at"),
  ]);
  if (!row?.data) return null;
  const data = row.data as unknown as WritingData;
  const cap = (caps ?? []).find((c) => c.part === data.capstone_part);
  const sub: WritingSubmission | null = s
    ? {
        ...s,
        status: s.status as SubmissionStatus,
        parts_confirmed: (s.parts_confirmed ?? []).map(Number),
        history: (Array.isArray(s.history) ? s.history : []) as unknown as HistoryEntry[],
      }
    : null;
  const list = (people ?? []) as { user_id: string; member_role: string; display_name: string | null }[];
  return {
    data,
    sub,
    capstoneSaved: !!(sub && cap && sub.status === "reviewed" && cap.source_submission_id === sub.id && cap.body === fullEmail(sub.subject ?? "", sub.body)),
    coachName: list.find((p) => p.member_role === "teacher" && p.display_name)?.display_name ?? null,
    myPhrases: [...new Set((bank ?? []).map((b) => b.text))],
    reviewerName: sub?.reviewed_by ? (list.find((p) => p.user_id === sub.reviewed_by && p.display_name)?.display_name ?? null) : null,
  };
}
