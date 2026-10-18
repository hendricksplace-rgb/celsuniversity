import { studentLessons } from "@/lib/course-page";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer, one } from "@/lib/access";
import { loadLessonContent } from "@/lib/lesson-content";
import { themeForCourse } from "@/lib/themes";
import { LessonBlock } from "@/components/lesson/LessonBlock";
import { LessonProgress, Part } from "@/components/lesson/progress";

type Props = { params: Promise<{ id: string }> };

export default async function LessonPage({ params }: Props) {
  const { id } = await params;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/lecciones/${id}`);

  // RLS: students only see published, non-teacher lessons.
  const { data: lesson } = await supabase.from("lessons").select("id, title, module_id, module:modules(id, title, course:courses(id, slug, title))").eq("id", id).maybeSingle();
  const lessonModule = one(lesson?.module);
  const course = one(lessonModule?.course);
  if (!lesson || !lessonModule || !course) notFound();

  const theme = themeForCourse(course);
  const access = await canAccessCourse(supabase, viewer, course.id);

  const [{ visible, signed, kinds, partIds, readers, progress }, { data: allSiblings }] = await Promise.all([
    loadLessonContent(supabase, viewer, lesson.id, course.id, access),
    supabase.from("lessons").select("id, title, has_content").eq("module_id", lessonModule.id).order("sort_order"),
  ]);
  const siblings = viewer.isStaff ? allSiblings : studentLessons(allSiblings ?? []);
  const backHref = await moduleHref(supabase, course, lessonModule.id);

  const index = (siblings ?? []).findIndex((s) => s.id === lesson.id);
  const prev = index > 0 ? siblings![index - 1] : null;
  const next = index >= 0 && index < (siblings?.length ?? 0) - 1 ? siblings![index + 1] : null;

  return (
    <div data-theme={theme} className="t-panel space-y-6">
      <header className="space-y-2">
        <Link href={backHref} className="t-muted text-sm hover:underline">
          ← {course.title} · {lessonModule.title}
        </Link>
        <h1 className="t-heading text-3xl">{lesson.title}</h1>
      </header>

      {!access ? (
        <p className="t-card t-card-accent">{t.lesson.noAccess}</p>
      ) : (
        <LessonProgress
          lessonId={lesson.id}
          partIds={partIds}
          initialParts={(progress?.parts ?? {}) as Record<string, unknown>}
          initialStatus={progress?.status ?? null}
          t={{ parts: t.lesson.partsDone, finish: t.lesson.markDone, finished: t.lesson.finished, xp: t.lesson.xpEarned }}
        >
          {visible.length === 0 ? (
            <p className="t-card t-muted">{t.lesson.empty}</p>
          ) : (
            <div className="space-y-5">
              {visible.map((block) => {
                const kind = kinds.get(block.id)!;
                const node = (
                  <LessonBlock
                    block={block}
                    signed={signed}
                    t={t.lesson}
                    activityT={t.activity}
                    civicsT={t.civics}
                    isStaff={viewer.isStaff}
                    readers={readers}
                    readLabel={t.reader.interactive}
                  />
                );
                return kind === "none" ? (
                  <div key={block.id}>{node}</div>
                ) : (
                  <Part key={block.id} id={block.id} kind={kind}>
                    {node}
                  </Part>
                );
              })}
              {signed.size > 0 && <p className="t-muted text-xs">{t.lesson.linkExpires}</p>}
            </div>
          )}
        </LessonProgress>
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
          <Link href={backHref} className="t-btn">
            {t.lesson.backToCourse}
          </Link>
        )}
      </nav>
    </div>
  );
}

/** Back to the lesson's episode (CelsUS, CelsTV, CelsGLOBAL) or week (CelsBSNS); other modules go to the course. */
async function moduleHref(supabase: Awaited<ReturnType<typeof createClient>>, course: { id: string; slug: string | null }, moduleId: string) {
  const courseHref = `/app/cursos/${course.slug}`;
  const { data: weeks } = await supabase.from("modules").select("id").eq("course_id", course.id).eq("kind", "lesson_week").order("sort_order");
  const i = (weeks ?? []).findIndex((m) => m.id === moduleId);
  if (i < 0) return courseHref;
  return themeForCourse(course) === "celsbsns" ? `${courseHref}/semana/${i + 1}` : `${courseHref}/episodio/${i + 1}`;
}
