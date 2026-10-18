// A lesson's visible blocks, their signed Storage URLs and the viewer's progress. Shared by the lesson
// page (/app/lecciones/[id]) and the CelsTV part screens (/app/cursos/…/episodio/N/<part>).
import type { createClient } from "@/lib/supabase/server";
import type { getViewer } from "@/lib/access";
import { collectStorageRefs, signStorageRefs } from "@/lib/storage";
import { partKind, type Block } from "@/components/lesson/LessonBlock";

type Client = Awaited<ReturnType<typeof createClient>>;
type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function loadLessonContent(supabase: Client, viewer: Viewer, lessonId: string, courseId: string, access: boolean) {
  // RLS also filters blocks by course access and hides teacher-only blocks from students.
  const { data: blocks } = access
    ? await supabase.from("content_blocks").select("id, block_type, title, body, data, teacher_only").eq("lesson_id", lessonId).order("sort_order")
    : { data: [] as Block[] };
  const visible = (blocks ?? []).filter((b) => viewer.isStaff || !b.teacher_only) as Block[];
  const ebookPdfs = visible.map((b) => b.data?.ebook_pdf).filter((v): v is string => typeof v === "string");
  const [signed, { data: readerBooks }, { data: progress }] = await Promise.all([
    signStorageRefs(supabase, collectStorageRefs(visible), { courseId, viewer, access }),
    // Interactive versions of this lesson's PDFs (RLS: students only see published ones).
    ebookPdfs.length ? supabase.from("ebooks").select("slug, pdf_path").in("pdf_path", ebookPdfs) : Promise.resolve({ data: [] as { slug: string; pdf_path: string }[] }),
    supabase.from("progress").select("status, parts, xp_earned").eq("user_id", viewer.user.id).eq("lesson_id", lessonId).maybeSingle(),
  ]);
  // The parts of the lesson: every block that shows something to this viewer.
  const kinds = new Map(visible.map((b) => [b.id, partKind(b, viewer.isStaff)] as const));
  return {
    visible,
    signed,
    kinds,
    partIds: visible.filter((b) => kinds.get(b.id) !== "none").map((b) => b.id),
    readers: Object.fromEntries((readerBooks ?? []).map((e) => [e.pdf_path, e.slug])) as Record<string, string>,
    progress,
  };
}
