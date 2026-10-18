import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer, one } from "@/lib/access";
import { collectStorageRefs, signStorageRefs } from "@/lib/storage";
import { themeForCourse } from "@/lib/themes";
import { LessonBlock, type Block } from "@/components/lesson/LessonBlock";

type Props = { params: Promise<{ id: string }> };

export default async function LessonPage({ params }: Props) {
  const { id } = await params;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/lecciones/${id}`);

  // RLS: students only see published, non-teacher lessons.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, module_id, module:modules(id, title, course:courses(id, slug, title))")
    .eq("id", id)
    .maybeSingle();
  const lessonModule = one(lesson?.module);
  const course = one(lessonModule?.course);
  if (!lesson || !lessonModule || !course) notFound();

  const theme = themeForCourse(course);
  const access = await canAccessCourse(supabase, viewer, course.id);

  const [{ data: blocks }, { data: siblings }] = await Promise.all([
    // RLS also filters blocks by course access and hides teacher-only blocks from students.
    access
      ? supabase
          .from("content_blocks")
          .select("id, block_type, title, body, data, teacher_only")
          .eq("lesson_id", lesson.id)
          .order("sort_order")
      : Promise.resolve({ data: [] as Block[] }),
    supabase.from("lessons").select("id, title").eq("module_id", lessonModule.id).order("sort_order"),
  ]);

  const visible = (blocks ?? []).filter((b) => viewer.isStaff || !b.teacher_only) as Block[];
  const ebookPdfs = visible.map((b) => b.data?.ebook_pdf).filter((v): v is string => typeof v === "string");
  const [signed, { data: readerBooks }] = await Promise.all([
    signStorageRefs(supabase, collectStorageRefs(visible), { courseId: course.id, viewer, access }),
    // Interactive versions of this lesson's PDFs (RLS: students only see published ones).
    ebookPdfs.length
      ? supabase.from("ebooks").select("slug, pdf_path").in("pdf_path", ebookPdfs)
      : Promise.resolve({ data: [] as { slug: string; pdf_path: string }[] }),
  ]);
  const readers = Object.fromEntries((readerBooks ?? []).map((e) => [e.pdf_path, e.slug]));

  const index = (siblings ?? []).findIndex((s) => s.id === lesson.id);
  const prev = index > 0 ? siblings![index - 1] : null;
  const next = index >= 0 && index < (siblings?.length ?? 0) - 1 ? siblings![index + 1] : null;

  return (
    <div data-theme={theme} className="t-panel space-y-6">
      <header className="space-y-2">
        <Link href={`/app/cursos/${course.slug}`} className="t-muted text-sm hover:underline">
          ← {course.title} · {lessonModule.title}
        </Link>
        <h1 className="t-heading text-3xl">{lesson.title}</h1>
      </header>

      {!access ? (
        <p className="t-card t-card-accent">{t.lesson.noAccess}</p>
      ) : visible.length === 0 ? (
        <p className="t-card t-muted">{t.lesson.empty}</p>
      ) : (
        <div className="space-y-5">
          {visible.map((block) => (
            <LessonBlock
              key={block.id}
              block={block}
              signed={signed}
              t={t.lesson}
              isStaff={viewer.isStaff}
              readers={readers}
              readLabel={t.reader.interactive}
            />
          ))}
          {signed.size > 0 && <p className="t-muted text-xs">{t.lesson.linkExpires}</p>}
        </div>
      )}

      <nav className="flex flex-wrap justify-between gap-3 border-t border-[var(--t-border)] pt-5">
        {prev ? (
          <Link href={`/app/lecciones/${prev.id}`} className="t-btn-ghost">
            ← {t.lesson.prev}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/app/lecciones/${next.id}`} className="t-btn">
            {t.lesson.next} →
          </Link>
        ) : (
          <Link href={`/app/cursos/${course.slug}`} className="t-btn">
            {t.lesson.backToCourse}
          </Link>
        )}
      </nav>
    </div>
  );
}
