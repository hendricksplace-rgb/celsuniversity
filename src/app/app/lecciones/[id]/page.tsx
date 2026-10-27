import { loadCoursePage, studentLessons } from "@/lib/course-page";
import { guidedModules } from "@/lib/guided-modules";
import { stepPath } from "@/lib/guided";
import { dictionaryPath, isDictionaryLesson } from "@/lib/glossary";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer, one } from "@/lib/access";
import { loadLessonContent } from "@/lib/lesson-content";
import { themeForCourse } from "@/lib/themes";
import { lessonHref, lessonPagePath } from "@/lib/lesson-href";
import { LessonBlock } from "@/components/lesson/LessonBlock";
import { LessonProgress, Part } from "@/components/lesson/progress";
import { InteractiveFeedback, InteractiveReading, InteractiveResearch, InteractiveSpeaking, InteractiveVideo, InteractiveWriting } from "@/components/bsns/pages";
import { loadReading } from "@/lib/reading-server";
import { loadWriting } from "@/lib/writing-server";
import { loadResearch } from "@/lib/research-server";
import { loadVideoTask } from "@/lib/video-task-server";
import { loadSpeaking } from "@/lib/speaking-server";
import { GUIDE_LAYOUT, guidePlaceOfLesson } from "@/lib/teacher-guide-server";
import { LockedCard } from "@/components/celsus/TeacherGuide";
import { loadFeedback } from "@/lib/feedback-server";
import { CelsCast } from "@/components/celsus/CelsCast";
import { BackButtons } from "@/components/celsus/BackButtons";
import { ReadingWriting, type RwData, type RwState } from "@/components/celsus/ReadingWriting";
import { celscastTrack, transcriptCues } from "@/lib/audio-tracks";
import type { Cue, Track } from "@/components/part/AudioPart";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ original?: string }> };

export default async function LessonPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { original } = await searchParams;
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/lecciones/${id}`);

  // RLS: students only see published, non-teacher lessons.
  const { data: lesson } = await supabase.from("lessons").select("id, title, module_id, lesson_type, status, teacher_only, module:modules(id, title, kind, course:courses(id, slug, title, layout))").eq("id", id).maybeSingle();
  const lessonModule = one(lesson?.module);
  const course = one(lessonModule?.course);
  // RLS hides teacher-only lessons (the Teacher's Guides) and drafts from students: a direct link says "no access".
  if (!lesson && !viewer.isStaff && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return <LockedCard title={t.guide.lockedTitle} text={t.lesson.noAccess} href="/app/cursos" cta={t.guide.lockedCta} />;
  if (!lesson || !lessonModule || !course) notFound();

  // CelsUS Teacher's Guides open their own page (teachers and admins), never inside the student flow.
  if (lesson.teacher_only && course.layout === GUIDE_LAYOUT && course.slug) {
    const guide = await guidePlaceOfLesson(supabase, lesson.id, lessonModule.id, course.slug);
    if (guide) redirect(guide);
  }

  // Guided courses (CelsGLOBAL step template): an old lesson never renders (C-012); it opens the new place for
  // its content, for everyone. Staff see the old page only from the course builder (?original=1).
  if (course.slug && !(viewer.isStaff && original === "1")) {
    const step = (await guidedModules(supabase, [lessonModule.id])).get(lessonModule.id);
    if (step) redirect(await oldLessonTarget(supabase, { id: course.id, slug: course.slug }, lesson, step.step));
  }

  const theme = themeForCourse(course);
  // C-021: a lesson that lives somewhere else now (a CelsTV part screen, a CelsBSNS task) never renders here:
  // old bookmarks, emails and history go to its current page. CelsUS redirects its own parts below.
  if (course.slug && course.layout !== "citizenship_modules" && !(viewer.isStaff && original === "1")) {
    const href = await lessonHref(supabase, { userId: viewer.user.id, isStaff: viewer.isStaff }, lesson.id);
    if (href !== lessonPagePath(lesson.id)) redirect(href);
  }
  // CelsBSNS: "Course Dictionary" (and the old "Course Dictionary (2)" note) open the Dictionary page.
  if (theme === "celsbsns" && course.slug && isDictionaryLesson(lesson.id)) redirect(dictionaryPath(course.slug));
  const access = await canAccessCourse(supabase, viewer, course.id);
  // Staff can open drafts and teacher-only lessons (the Teacher's Guide): they're shown, never recorded, because
  // record_lesson_progress refuses them ("no access", a 400 on every visit).
  const track = lesson.status === "published" && !lesson.teacher_only;

  // CelsUS core parts: the Tarjetas, CelsBook and quiz have their own screens; the video, audio and class stay
  // here and report to the episode's completion flow when finished (afterPartFinished).
  let celsus: { courseSlug: string; n: number } | null = null;
  let usPart: { role: string | undefined; episodeTitle: string } | null = null;
  if (access && course.layout === "citizenship_modules" && lessonModule.kind === "lesson_week" && course.slug) {
    const page = await loadCoursePage(supabase, viewer.user.id, course.slug, theme, viewer.isStaff);
    const ep = page?.episodes.find((e) => e.id === lessonModule.id);
    const part = ep?.parts.find((p) => p.id === lesson.id);
    if (ep && part) {
      if (part.role === "cards" || part.role === "quiz" || part.role === "book") redirect(part.href);
      celsus = { courseSlug: course.slug, n: ep.n };
      usPart = { role: part.role, episodeTitle: ep.title || `${t.episode.tag.replace("{n}", String(ep.n))}` };
    }
  }

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
      supabase.from("lessons").select("id, title, has_content, lesson_type").eq("module_id", lessonModule.id).eq("teacher_only", false).order("sort_order"),
      weekNumber(supabase, course.id, lessonModule.id),
      moduleHref(supabase, course, lessonModule.id),
    ]);
    const list = viewer.isStaff ? (weekLessons ?? []) : studentLessons(weekLessons ?? []);
    const at = list.findIndex((l) => l.id === lesson.id);
    const bsns = themeForCourse(course) === "celsbsns" && weekN > 0;
    const link = (l: (typeof list)[number] | undefined) =>
      l ? { title: l.title, href: bsns && l.lesson_type !== "video" ? `/app/cursos/${course.slug}/semana/${weekN}/tarea/${l.id}` : `/app/lecciones/${l.id}` } : null;
    const nav = { backHref, prev: at > 0 ? link(list[at - 1]) : null, next: at >= 0 ? link(list[at + 1]) : null, defaultLang: (lang === "en" ? "en" : "es") as "es" | "en", track };
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
          track={track}
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
    // Prev / Next never lead to a teacher-only lesson (the Teacher's Guide), not even for staff.
    supabase.from("lessons").select("id, title, has_content").eq("module_id", lessonModule.id).eq("teacher_only", false).order("sort_order"),
  ]);
  const siblings = viewer.isStaff ? allSiblings : studentLessons(allSiblings ?? []);
  // A video lesson whose video isn't up yet: nothing to watch, so it is neither recorded nor finishable.
  const videoSoon = track && partIds.length === 0 && (lesson.lesson_type === "video" || visible.some((b) => b.block_type === "video"));
  const backHref = await moduleHref(supabase, course, lessonModule.id);

  // CelsUS CelsAudio with a CelsCast (C-005): one player, CelsCast first and the original recording as the
  // second tab, standing in for both blocks. Finishing either track completes the part.
  const cast = usPart?.role === "audio" ? visible.find((b) => b.block_type === "celscast") : undefined;
  let castPlayer: React.ReactNode = null;
  if (cast) {
    const orig = visible.find((b) => b.block_type === "audio");
    const media = typeof orig?.data.media_url === "string" ? orig.data.media_url : null;
    let cues: Cue[] = [];
    if (media?.startsWith("storage://course-media/")) {
      const { data: tr } = await supabase.from("audio_transcripts").select("words").eq("path", media.slice("storage://course-media/".length)).eq("status", "done").maybeSingle();
      cues = transcriptCues(tr?.words);
    }
    const original: Track = { key: "original", label: t.part.originalAudio, src: media ? (signed.get(media) ?? null) : null, ref: media, cues, chapters: [], voice: null };
    const tracks = [celscastTrack(cast.data, (r) => signed.get(r) ?? null, lang === "en" ? "en" : "es"), original];
    castPlayer = <CelsCast tracks={tracks} title={usPart!.episodeTitle} t={t.part} />;
  }
  // CelsUS "Reading and Writing" (C-006): the interactive lesson, with this student's saved progress.
  const rw = visible.find((b) => b.block_type === "uscis_reading_writing");
  let rwPlayer: React.ReactNode = null;
  if (rw) {
    const { data: row } = await supabase.from("progress").select("flashcard_state").eq("user_id", viewer.user.id).eq("lesson_id", lesson.id).maybeSingle();
    const saved = ((row?.flashcard_state ?? {}) as { rw?: Partial<RwState> }).rw ?? null;
    rwPlayer = <ReadingWriting data={rw.data as unknown as RwData} t={t.rw} lang={lang === "en" ? "en" : "es"} userId={viewer.user.id} lessonId={lesson.id} saved={saved} />;
  }
  const special = cast ?? rw;
  const specialNode = castPlayer ?? rwPlayer;
  const shown = visible.filter((b) => b !== rw && !(cast && (b.block_type === "celscast" || b.block_type === "audio")));

  const index = (siblings ?? []).findIndex((s) => s.id === lesson.id);
  const prev = index > 0 ? siblings![index - 1] : null;
  const next = index >= 0 && index < (siblings?.length ?? 0) - 1 ? siblings![index + 1] : null;

  return (
    <div data-theme={theme} className="t-panel space-y-6">
      <header className="space-y-2">
        {theme === "celsus" && course.slug ? (
          <BackButtons t={t.usBack} course={{ href: `/app/cursos/${course.slug}`, name: course.title }} episode={usEpisode(backHref)} />
        ) : (
          <Link href={backHref} className="t-muted text-sm hover:underline">
            ← {course.title} · {lessonModule.title}
          </Link>
        )}
        {!rw && <h1 className="t-heading text-3xl">{lesson.title}</h1>}
      </header>

      {!access ? (
        <p className="t-card t-card-accent">{t.lesson.noAccess}</p>
      ) : !track || videoSoon ? (
        <div className="space-y-5">
          {videoSoon && (
            <div className="t-card space-y-1 text-center">
              <p className="t-heading text-xl">🎬 {t.lesson.videoSoonTitle}</p>
              {!visible.some((b) => b.block_type === "video") && <p className="t-muted text-sm">{t.lesson.videoSoon}</p>}
            </div>
          )}
          {specialNode}
          {shown.map((block) => (
            <div key={block.id}>
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
            </div>
          ))}
        </div>
      ) : (
        <LessonProgress
          lessonId={lesson.id}
          partIds={special ? [special.id, ...partIds.filter((id) => shown.some((b) => b.id === id))] : partIds}
          initialParts={(progress?.parts ?? {}) as Record<string, unknown>}
          initialStatus={progress?.status ?? null}
          t={{ parts: t.lesson.partsDone, finish: t.lesson.markDone, finished: t.lesson.finished, xp: t.lesson.xpEarned }}
          celsus={celsus ? { ...celsus, t: t.lesson.celsus } : null}
        >
          {shown.length === 0 && !specialNode ? (
            <p className="t-card t-muted">{t.lesson.empty}</p>
          ) : (
            <div className="space-y-5">
              {special && (
                <Part id={special.id} kind="activity">
                  {specialNode}
                </Part>
              )}
              {shown.map((block) => {
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
              {signed.size > 0 && !special && <p className="t-muted text-xs">{t.lesson.linkExpires}</p>}
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

/** CV to Resume "Downloads" lessons → the matching screen of the interactive downloads reader. */
const CV_DOWNLOADS: { book: string; screen: Record<number, string> } = { book: "cv-to-resume-descargas", screen: { 2: "s3", 3: "s2", 4: "s4", 5: "s5", 6: "s6" } };

/**
 * Where an old guided-course lesson goes: E-Book → the course's interactive e-book at that module's screen (m<step>);
 * Downloads → the interactive downloads reader when the course has one; Activity → the step's "Construye";
 * Video / YouTube → "Mira el video"; anything else → the step page.
 */
async function oldLessonTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  course: { id: string; slug: string },
  lesson: { lesson_type: string | null; title: string },
  step: number,
) {
  const page = stepPath(course.slug, step);
  const kind = lesson.lesson_type ?? "";
  const title = lesson.title.toLowerCase();
  if (kind === "reading" || title.startsWith("e-book")) {
    const { data: books } = await supabase.from("ebooks").select("slug, screens").eq("course_id", course.id).eq("status", "published");
    const book = (books ?? []).find((b) => Array.isArray(b.screens) && (b.screens as { id?: string }[]).some((s) => s?.id === `m${step}`));
    if (book) return `/app/libros/${book.slug}?screen=m${step}`;
    return page;
  }
  if (kind === "download" || title.startsWith("download") || title.startsWith("descarga")) {
    const { data: dl } = await supabase.from("ebooks").select("slug").eq("course_id", course.id).eq("slug", CV_DOWNLOADS.book).eq("status", "published").maybeSingle();
    if (dl) return `/app/libros/${dl.slug}?screen=${CV_DOWNLOADS.screen[step] ?? "s1"}`;
    return page;
  }
  if (kind === "activity" || /actividad|activity/.test(title)) return `${page}#build`;
  if (kind === "video" || kind === "youtube") return `${page}#vid`;
  return page;
}

/** CelsUS: the episode a lesson belongs to, from its module link (/app/cursos/<slug>/episodio/N). */
function usEpisode(href: string) {
  const m = /\/episodio\/(\d+)$/.exec(href);
  return m ? { href, n: Number(m[1]) } : null;
}
