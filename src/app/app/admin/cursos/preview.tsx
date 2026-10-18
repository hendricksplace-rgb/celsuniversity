"use server";

// The lesson editor's live preview: renders unsaved block edits with the student components.
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole, one } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { PreviewBlocks } from "@/components/builder/PreviewBlocks";
import type { Block } from "@/components/lesson/LessonBlock";

export async function previewLesson(lessonId: string, blocks: Block[]) {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !(isAdminRole(viewer.role) || viewer.role === "director")) return null;
  const { data: lesson } = await supabase.from("lessons").select("module:modules(course:courses(id, slug))").eq("id", lessonId).maybeSingle();
  const course = one(one(lesson?.module)?.course);
  if (!course) return null;
  const clean = blocks.slice(0, 200).map((b) => ({
    id: String(b.id),
    block_type: String(b.block_type),
    title: b.title ?? null,
    body: b.body ?? null,
    data: b.data && typeof b.data === "object" ? b.data : {},
    teacher_only: !!b.teacher_only,
  }));
  return <PreviewBlocks supabase={supabase} viewer={viewer} courseId={course.id} theme={themeForCourse(course)} blocks={clean} />;
}
