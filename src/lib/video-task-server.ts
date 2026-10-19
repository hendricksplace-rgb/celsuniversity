import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { VideoProof, VideoTaskData } from "@/lib/video-task";

type Client = Awaited<ReturnType<typeof createClient>>;

export type VideoTaskLoad = {
  data: VideoTaskData;
  proof: VideoProof | null;
  /** The student's Week 1 Writing email (subject and body), to start "Mi guion". */
  writing: { subject: string | null; body: string } | null;
};

/** The lesson's Video Submission page, or null when it has none (the lesson then renders as before).
 *  The thumbnail is shown through a short-lived signed URL from the private video-proofs bucket. */
export async function loadVideoTask(supabase: Client, userId: string, lessonId: string): Promise<VideoTaskLoad | null> {
  const [{ data: row }, { data: p }] = await Promise.all([
    supabase.from("video_task_content").select("data").eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("video_proofs").select("thumb_path, duration_s, self_check, confidence, script, updated_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle(),
  ]);
  if (!row?.data) return null;
  const data = row.data as unknown as VideoTaskData;
  const [{ data: sub }, { data: signed }] = await Promise.all([
    data.script_source_lesson_id
      ? supabase.from("submissions").select("subject, body").eq("user_id", userId).eq("lesson_id", data.script_source_lesson_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p?.thumb_path ? supabase.storage.from("video-proofs").createSignedUrl(p.thumb_path, 600) : Promise.resolve({ data: null }),
  ]);
  return {
    data,
    proof: p
      ? {
          thumbUrl: signed?.signedUrl ?? null,
          duration_s: p.duration_s === null ? null : Number(p.duration_s),
          self_check: (p.self_check ?? []).map(Number),
          confidence: p.confidence,
          script: p.script,
          updated_at: p.updated_at,
        }
      : null,
    writing: sub?.body?.trim() ? { subject: sub.subject, body: sub.body } : null,
  };
}
