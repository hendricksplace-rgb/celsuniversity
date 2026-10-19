import { studentLessons } from "@/lib/course-page";
import { dictionaryPath, isDictionaryLesson } from "@/lib/glossary";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer, one } from "@/lib/access";
import { loadLessonContent } from "@/lib/lesson-content";
import { themeForCourse } from "@/lib/themes";
import { LessonBlock } from "@/components/lesson/LessonBlock";
import { LessonProgress, Part } from "@/components/lesson/progress";
import { InteractiveFeedback, InteractiveReading, InteractiveResearch, InteractiveSpeaking, InteractiveVideo, InteractiveWriting } from "@/components/bsns/pages";
import { loadReading } from "@/lib/reading-server";
import { loadWriting } from "@/lib/writing-server";
import { loadResearch } from "@/lib/research-server";
import { loadVideoTask } from "@/lib/video-task-server";
import { loadSpeaking } from "@/lib/speaking-server";
import { loadFeedback } from "@/lib/feedback-server";

type Props = { params: Promise<{ id: string }> };

export default async function LessonPage({ params }: Props) {
  const { id } = await params;
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/lecciones/${id}`);

  // RLS: students only see published, non-teacher lessons.
  const { data: lesson } = await supabase.from("lessons").select("id, title, module_id, lesson_type, module:modules(id, title, course:courses(id, slug, title))").eq("id", id).maybeSingle();
  const lessonModule = one(lesson?.module);
  const course = one(lessonModule?.course);
  if (!lesson || !lessonModule || !course) notFound();

  const theme = themeForCourse(course);
  // CelsBSNS: "Course Dictionary" (and the old "Course Dictionary (2)" note) open the Dictionary page.
  if (theme === "celsbsns" && course.slug && isDictionaryLesson(lesson.id)) redirect(dictionaryPath(course.slug));
  const access = await canAccessCourse(supabase, viewer, course.id);

  // CelsBSNS interactive lessons: a reading_content, writing_content, research_content, video_task_content, speaking_content or feedback_content row replaces the old page for this lesson.
  // Only the loader for this lesson's type runs (one database round trip).
  const ty = access && theme === "celsbsns" ? lesson.lesson_type : null;
  const [reading, writing, research, video, speaking] = await Promise.all([
    ty === "reading" ? loadReading(supabase, viewer.user.id, lesson.id) : null,
    ty === "writing" ? loadWriting(supabase, viewer.user.id, lesson.id, course.id) : null,
    ty === "research" ? loadResearch(supabase, viewer.user.id, lesson.id) : null,
    ty === "video_submission" ? loadVideoTask(supabase, viewer.user.id, lesson.id) : null,
    ty === "speaking" ? loadSpeaking(supabase, viewer.user.id, lesson.id) : null,
  ]);
  if (reading || writing || research || video || speaking || ty === "feedback") {
    const [{ data: weekLessons }, weekN, backHref] = await Promise.all([
      supabase.from("lessons").select("id, title, has_content, lesson_type").eq("module_id", lessonModule.id).order("sort_order"),
      weekNumber(supabase, course.id, lessonModule.id),
      moduleHref(supabase, course, lessonModule.id),
    ]);
    const list = viewer.isStaff ? (weekLessons ?? []) : studentLessons(weekLessons ?? []);
    const at = list.findIndex((l) => l.id === lesson.id);
    const bsns = themeForCourse(course) === "celsbsns" && weekN > 0;
    const link = (l: (typeof list)[number] | undefined) =>
      l ? { title: l.title, href: bsns && l.lesson_type !== "video" ? `/app/cursos/${course.slug}/semana/${weekN}/tarea/${l.id}` : `/app/lecciones/${l.id}` } : null;
    const nav = { backHref, prev: at > 0 ? link(list[at - 1]) : null, next: at >= 0 ? link(list[at + 1]) : null, defaultLang: (lang === "en" ? "en" : "es") as "es" | "en" };
    const feedback =
      ty === "feedback" && weekN > 0
        ? await loadFeedback(supabase, viewer.user.id, lesson.id, course.id, weekN, list.map((l) => ({ id: l.id, type: l.lesson_type, title: l.title, href: link(l)!.href })))
        : null;
    if (feedback)
      return (
        <InteractiveFeedback
          backHref={nav.backHref}
          prev={nav.prev}
          defaultLang={nav.defaultLang}
          data={feedback.data}
          lessonId={lesson.id}
          courseId={course.id}
          userId={viewer.user.id}
          nextWeekHref={weekN < 10 ? `/app/cursos/${course.slug}/semana/${weekN + 1}` : null}
          capstoneHref={`/app/cursos/${course.slug}/capstone`}
          courseCloseHref={`/app/cursos/${course.slug}/capstone`}
          numbers={feedback.numbers}
          reflection={feedback.reflection}
        />
      );
    if (speaking)
      return (
        <InteractiveSpeaking
          {...nav}
          data={speaking.data}
          lessonId={lesson.id}
          userId={viewer.user.id}
          vocab={speaking.vocab}
          best={speaking.best}
          reps={speaking.reps}
          partner={speaking.partner}
          completedAt={speaking.completedAt}
        />
      );
    if (video)
      return <InteractiveVideo {...nav} data={video.data} lessonId={lesson.id} userId={viewer.user.id} proof={video.proof} writing={video.writing} />;
    if (research)
      return (
        <InteractiveResearch
          {...nav}
          data={research.data}
          lessonId={lesson.id}
          userId={viewer.user.id}
          writingHref={link(list.find((l) => l.lesson_type === "writing"))?.href ?? null}
          entries={research.entries}
          reflection={research.reflection}
          phrases={research.phrases}
        />
      );
    if (writing)
      return (
        <InteractiveWriting
          {...nav}
          data={writing.data}
          lessonId={lesson.id}
          courseId={course.id}
          userId={viewer.user.id}
          sub={writing.sub}
          capstoneSaved={writing.capstoneSaved}
          coachName={writing.coachName}
          reviewerName={writing.reviewerName}
          myPhrases={writing.myPhrases}
        />
      );
    if (reading)
      return (
        <InteractiveReading
          {...nav}
          data={reading.data}
          lessonId={lesson.id}
          userId={viewer.user.id}
          initialNotes={reading.notes}
          initialState={reading.state}
          completedAt={reading.completedAt}
        />
      );
  }

  const [{ visible, signed, kinds, partIds, readers, books, answers, progress }, { data: allSiblings }] = await Promise.all([
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
                    books={books}
                    answers={answers}
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

/** The module's position among the course's weeks (1-based), or 0 when it isn't a week. */
async function weekNumber(supabase: Awaited<ReturnType<typeof createClient>>, courseId: string, moduleId: string) {
  const { data: weeks } = await supabase.from("modules").select("id").eq("course_id", courseId).eq("kind", "lesson_week").order("sort_order");
  return (weeks ?? []).findIndex((m) => m.id === moduleId) + 1;
}

/** Back to the lesson's episode (CelsUS, CelsTV, CelsGLOBAL) or week (CelsBSNS); other modules go to the course. */
async function moduleHref(supabase: Awaited<ReturnType<typeof createClient>>, course: { id: string; slug: string | null }, moduleId: string) {
  const courseHref = `/app/cursos/${course.slug}`;
  const { data: weeks } = await supabase.from("modules").select("id").eq("course_id", course.id).eq("kind", "lesson_week").order("sort_order");
  const i = (weeks ?? []).findIndex((m) => m.id === moduleId);
  if (i < 0) return courseHref;
  return themeForCourse(course) === "celsbsns" ? `${courseHref}/semana/${i + 1}` : `${courseHref}/episodio/${i + 1}`;
}
