import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { loadCoursePage } from "@/lib/course-page";
import { MEDIA_TYPES, SUBMISSION_TYPES, taskTime, weekPath } from "@/lib/bsns";
import { BsnsTask } from "@/components/course/BsnsTask";
import { InteractiveFeedback, InteractiveReading, InteractiveResearch, InteractiveSpeaking, InteractiveVideo, InteractiveWriting } from "@/components/bsns/pages";
import { loadReading } from "@/lib/reading-server";
import { loadWriting } from "@/lib/writing-server";
import { loadResearch } from "@/lib/research-server";
import { loadVideoTask } from "@/lib/video-task-server";
import { loadSpeaking } from "@/lib/speaking-server";
import { loadFeedback } from "@/lib/feedback-server";
import { cookies } from "next/headers";
import type { CoursePage, Episode, Part } from "@/lib/course-page";
import { currentWeekOf, videoTitle } from "@/lib/bsns";
import { SYLLABUS_LANG_COOKIE, isSyllabus, loadSyllabus, parseSyllabus } from "@/lib/bsns-syllabus";
import { BsnsSyllabus } from "@/components/course/BsnsSyllabus";
import { dictionaryPath, isDictionaryLesson } from "@/lib/glossary";

type Props = { params: Promise<{ slug: string; n: string; id: string }> };

/** CelsBSNS task (spec §3, phone 4): the interactive page for the lesson's *_content row, else the instructions with
 *  "Ver en español" and the answer. Prev / Next are the week's real neighbouring lessons; Feedback's Next is the
 *  following week (week 10: the course close). */
export default async function BsnsTaskPage({ params }: Props) {
  const { slug, n, id } = await params;
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/semana/${n}/tarea/${id}`);
  const theme = themeForCourse({ slug });
  if (theme !== "celsbsns") notFound();
  if (isDictionaryLesson(id)) redirect(dictionaryPath(slug));
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  const week = page?.episodes.find((e) => e.n === Number(n));
  const part = week?.parts.find((p) => p.id === id);
  if (!page || !week || !part) notFound();
  const access = await canAccessCourse(supabase, viewer, page.course.id);
  if (!access) redirect(`/app/cursos/${slug}`);

  if (isSyllabus(part)) return <Syllabus supabase={supabase} page={page} week={week} part={part} userId={viewer.user.id} displayName={viewer.displayName} />;

  // CelsBSNS interactive lessons: a reading_content, writing_content, research_content, video_task_content, speaking_content or feedback_content row replaces the task screen.
  // Only the loader for this lesson's type runs (one database round trip).
  const ty = part.type;
  const [reading, writing, research, video, speaking] = await Promise.all([
    ty === "reading" ? loadReading(supabase, viewer.user.id, id) : null,
    ty === "writing" ? loadWriting(supabase, viewer.user.id, id, page.course.id) : null,
    ty === "research" ? loadResearch(supabase, viewer.user.id, id) : null,
    ty === "video_submission" ? loadVideoTask(supabase, viewer.user.id, id) : null,
    ty === "speaking" ? loadSpeaking(supabase, viewer.user.id, id) : null,
  ]);
  const feedback =
    ty === "feedback" ? await loadFeedback(supabase, viewer.user.id, id, page.course.id, week.n, week.parts.map((x) => ({ id: x.id, type: x.type, title: x.title, href: x.href }))) : null;
  if (reading || writing || research || video || speaking || feedback) {
    const at = week.parts.findIndex((x) => x.id === id);
    const link = (x: (typeof week.parts)[number] | undefined) => (x ? { title: x.title, href: x.href } : null);
    const nav = { backHref: weekPath(slug, week.n), prev: link(week.parts[at - 1]), next: link(week.parts[at + 1]), defaultLang: (lang === "en" ? "en" : "es") as "es" | "en" };
    if (feedback)
      return (
        <InteractiveFeedback
          backHref={nav.backHref}
          prev={nav.prev}
          defaultLang={nav.defaultLang}
          data={feedback.data}
          lessonId={id}
          courseId={page.course.id}
          userId={viewer.user.id}
          nextWeekHref={week.n < page.episodes.length ? weekPath(slug, week.n + 1) : null}
          capstoneHref={`/app/cursos/${slug}/capstone`}
          courseCloseHref={`/app/cursos/${slug}/capstone`}
          numbers={feedback.numbers}
          reflection={feedback.reflection}
        />
      );
    if (speaking)
      return (
        <InteractiveSpeaking
          {...nav}
          data={speaking.data}
          lessonId={id}
          userId={viewer.user.id}
          vocab={speaking.vocab}
          best={speaking.best}
          reps={speaking.reps}
          partner={speaking.partner}
          completedAt={speaking.completedAt}
        />
      );
    if (video)
      return <InteractiveVideo {...nav} data={video.data} lessonId={id} userId={viewer.user.id} proof={video.proof} writing={video.writing} />;
    if (research)
      return (
        <InteractiveResearch
          {...nav}
          data={research.data}
          lessonId={id}
          userId={viewer.user.id}
          writingHref={week.parts.find((x) => x.type === "writing")?.href ?? null}
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
          lessonId={id}
          courseId={page.course.id}
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
          lessonId={id}
          userId={viewer.user.id}
          initialNotes={reading.notes}
          initialState={reading.state}
          completedAt={reading.completedAt}
        />
      );
  }

  const kind = part.type === "feedback" ? "feedback" : part.type && SUBMISSION_TYPES.has(part.type) ? "submission" : "read";
  const [{ data: blocks }, { data: sub }, { data: weekSubs }] = await Promise.all([
    supabase.from("content_blocks").select("title, body, data").eq("lesson_id", id).eq("block_type", "text").eq("teacher_only", false).order("sort_order"),
    supabase.from("submissions").select("body, media_path, status, coach_feedback, submitted_at, reviewed_at").eq("user_id", viewer.user.id).eq("lesson_id", id).maybeSingle(),
    kind === "feedback"
      ? supabase
          .from("submissions")
          .select("lesson_id, coach_feedback, reviewed_at")
          .eq("user_id", viewer.user.id)
          .in("lesson_id", week.parts.map((p) => p.id))
          .not("coach_feedback", "is", null)
      : Promise.resolve({ data: [] as { lesson_id: string; coach_feedback: string | null; reviewed_at: string | null }[] }),
  ]);
  const en = (blocks ?? []).map((b) => b.body ?? "").filter(Boolean).join("\n\n");
  const esParts = (blocks ?? []).map((b) => {
    const es = (b.data as Record<string, unknown> | null)?.text_es;
    return typeof es === "string" ? es : "";
  });
  const es = esParts.every(Boolean) && esParts.length ? esParts.join("\n\n") : null;
  const { data: media } = sub?.media_path ? await supabase.storage.from("submissions").createSignedUrl(sub.media_path, 3600) : { data: null };
  const titleOf = new Map(week.parts.map((p) => [p.id, taskTime(p.title).name]));

  return (
    <BsnsTask
      t={t.bsns}
      week={week.n}
      backHref={weekPath(slug, week.n)}
      lessonId={id}
      userId={viewer.user.id}
      name={taskTime(part.title).name}
      time={taskTime(part.title).label}
      kind={kind}
      media={part.type && MEDIA_TYPES.has(part.type) ? (part.type === "speaking" ? "audio" : "video") : null}
      en={en}
      es={es}
      done={part.done}
      sub={sub ? { ...sub, media_url: media?.signedUrl ?? null } : null}
      feedback={(weekSubs ?? []).map((s) => ({ task: titleOf.get(s.lesson_id) ?? "", text: s.coach_feedback ?? "", at: s.reviewed_at }))}
    />
  );
}

/** CelsBSNS syllabus (celsu-celsbsns-syllabus-brief.md): the same lesson text, parsed into a styled page. */
async function Syllabus({
  supabase,
  page,
  week,
  part,
  userId,
  displayName,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  page: CoursePage;
  week: Episode;
  part: Part;
  userId: string;
  displayName: string | null;
}) {
  const [text, { data: signed }, jar] = await Promise.all([
    loadSyllabus(supabase, page),
    supabase.from("course_commitments").select("signed_name, signed_at").eq("user_id", userId).eq("course_id", page.course.id).maybeSingle(),
    cookies(),
  ]);
  const en = text?.en ?? "";
  const es = text?.es ?? null;
  // Previous / Next: the real neighbouring lessons of the week (the week page when there is none before).
  const at = week.parts.findIndex((p) => p.id === part.id);
  const label = (p: Part) => (p.type === "video" ? videoTitle(p.title) : taskTime(p.title).name);
  const before = week.parts[at - 1];
  const after = week.parts[at + 1];
  const saved = jar.get(SYLLABUS_LANG_COOKIE)?.value;
  return (
    <BsnsSyllabus
      initialLang={saved === "es" ? "es" : "en"}
      parsed={{ en: parseSyllabus(en), es: es ? parseSyllabus(es) : null }}
      raw={{ en, es }}
      week={week.n}
      currentWeek={currentWeekOf(page.episodes.map((e) => ({ n: e.n, done: e.parts.map((p) => p.done) })))}
      weekHref={weekPath(page.course.slug, week.n)}
      prev={before ? { label: label(before), href: before.href } : null}
      next={after ? { label: label(after), href: after.href } : null}
      userId={userId}
      lessonId={part.id}
      done={part.done}
      courseId={page.course.id}
      prefillName={displayName?.trim() ?? ""}
      signed={signed ? { name: signed.signed_name, at: signed.signed_at } : null}
    />
  );
}
