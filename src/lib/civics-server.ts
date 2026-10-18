import "server-only";
import { canAccessCourse, one } from "@/lib/access";
import { collectStorageRefs, signStorageRefs } from "@/lib/storage";
import type { Client } from "@/lib/supabase/types";
import { kindOf, toCardState, toQuestion, type CardState, type CivicsExam } from "@/lib/civics";

type Viewer = { user: { id: string }; isStaff: boolean };

/** The 2025 exams a viewer may take (archived ones are hidden), with the course they belong to. */
export async function listExams(supabase: Client, viewer: Viewer) {
  const { data } = await supabase
    .from("evaluations")
    .select("id, title, language, exam_question_count, pass_count, large_text, source_subset_of, module:modules(course_id, course:courses(slug, title))")
    .eq("archived", false)
    .eq("test_version", "2025")
    .order("sort_order");
  const out = [];
  // evaluations are readable by every signed-in user, so course access is checked here.
  for (const e of data ?? []) {
    const courseId = one(e.module)?.course_id;
    if (courseId && (await canAccessCourse(supabase, viewer, courseId))) out.push(e);
  }
  return out;
}

/** One exam with its questions and signed audio, or null when it is archived or the viewer has no access. */
export async function loadExam(supabase: Client, viewer: Viewer, id: string) {
  const { data: e } = await supabase
    .from("evaluations")
    .select("id, title, language, exam_question_count, pass_count, large_text, archived, source_subset_of, module:modules(course_id, course:courses(id, slug, title))")
    .eq("id", id)
    .maybeSingle();
  const mod = one(e?.module);
  const course = one(mod?.course);
  if (!e || e.archived || !mod || !course) return null;
  if (!(await canAccessCourse(supabase, viewer, mod.course_id))) return null;

  const { data: rows } = await supabase
    .from("evaluation_questions")
    .select("id, question_type, is_asterisked, data, sort_order")
    .eq("evaluation_id", e.id)
    .order("sort_order");
  const questions = (rows ?? []).map(toQuestion).sort((a, b) => a.n - b.n);
  const exam: CivicsExam = {
    id: e.id,
    title: e.title,
    kind: kindOf(e),
    language: e.language,
    count: e.exam_question_count,
    pass: e.pass_count,
    largeText: e.large_text,
    questions,
  };
  return { exam, course, courseId: mod.course_id };
}

/**
 * Lessons holding a 2025 `evaluation` block. Study-card progress is stored on each of them
 * (progress.flashcard_state), kept identical, so a card known in one exam is known in all three.
 */
export async function examLessons(supabase: Client) {
  const { data } = await supabase
    .from("content_blocks")
    .select("lesson_id")
    .eq("block_type", "evaluation")
    .eq("data->>test_version", "2025");
  return [...new Set((data ?? []).map((b) => b.lesson_id))];
}

/** Known / to-review question numbers for the viewer, merged over the given lessons. */
export async function loadCardState(supabase: Client, userId: string, lessonIds: string[]): Promise<CardState> {
  if (!lessonIds.length) return { known: [], review: [] };
  const { data } = await supabase.from("progress").select("flashcard_state").eq("user_id", userId).in("lesson_id", lessonIds);
  const known = new Set<number>();
  const review = new Set<number>();
  for (const row of data ?? []) {
    const st = toCardState(row.flashcard_state);
    st.known.forEach((n) => known.add(n));
    st.review.forEach((n) => review.add(n));
  }
  known.forEach((n) => review.delete(n));
  return { known: [...known], review: [...review] };
}

/** Signed URLs for every audio file in the exam (10 minutes; the client asks again when they expire). */
export async function signExamAudio(supabase: Client, viewer: Viewer, exam: CivicsExam, courseId: string) {
  const refs = collectStorageRefs(exam.questions.map((q) => q.audio));
  const signed = await signStorageRefs(supabase, refs, { courseId, viewer, access: true });
  return Object.fromEntries(signed);
}
