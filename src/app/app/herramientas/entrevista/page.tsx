import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { signStorageRefs } from "@/lib/storage";
import { INTERVIEW_KEYS, type InterviewKey } from "@/lib/ai-tools";
import { AiHeader, aiShell } from "@/components/ai/ResumeTool";
import { InterviewTool } from "@/components/ai/InterviewTool";

export const metadata = { title: "Práctica de entrevista · CelsU" };

// The question recordings live with the "Crack the U.S. Interview Code" course; storage policy
// interview_questions_read lets every AI-tools user read them (checked above).
const COURSE_ID = "f7d7f4e4-b598-4943-8692-e18ce65379d3";
const FILES: Record<InterviewKey, string> = {
  about: "q-about-yourself.mp3",
  why: "q-why-this-job.mp3",
  strengths: "q-strengths-weaknesses.mp3",
  challenge: "q-challenge-at-work.mp3",
};
const refOf = (k: InterviewKey) => `storage://course-media/${COURSE_ID}/interview/${FILES[k]}`;

/** Interview Practice (celsu-ai-tools-spec.md §2): record an answer, Whisper + STAR feedback, summary by email. */
export default async function InterviewPage() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/herramientas/entrevista");

  const { data: allowed } = await supabase.rpc("can_use_ai_tools");
  if (!allowed)
    return (
      <div className={aiShell}>
        <AiHeader t={t.ai} icon="interview" title={t.ai.interviewTitle} backHref="/app/programas/celsglobal" />
        <p className="mt-6 rounded-2xl bg-white p-5 shadow-[0_0_0_1px_#E3DDD0]">{t.ai.noAccess}</p>
        <Link
          href="/comprar/celsglobal"
          className="kit-focus mt-4 block rounded-xl py-3.5 text-center font-extrabold"
          style={{ background: "linear-gradient(180deg, #EBD08C 0%, #C7A24E 100%)" }}
        >
          {t.ai.seePlans}
        </Link>
      </div>
    );

  const [signed, { data: answers }] = await Promise.all([
    signStorageRefs(supabase, INTERVIEW_KEYS.map(refOf), { courseId: COURSE_ID, viewer, access: true }),
    supabase.from("interview_answers").select("question_key, score").eq("user_id", viewer.user.id),
  ]);
  const audio: Partial<Record<InterviewKey, string>> = {};
  for (const k of INTERVIEW_KEYS) {
    const url = signed.get(refOf(k));
    if (url) audio[k] = url;
  }
  const best: Partial<Record<InterviewKey, number>> = {};
  for (const a of answers ?? []) {
    const k = a.question_key as InterviewKey;
    if (a.score != null && (best[k] == null || a.score > best[k]!)) best[k] = a.score;
  }

  return <InterviewTool t={t.ai} userId={viewer.user.id} audio={audio} best={best} />;
}
