import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { loadCoursePage } from "@/lib/course-page";
import { MEDIA_TYPES, SUBMISSION_TYPES, taskTime, weekPath } from "@/lib/bsns";
import { BsnsTask } from "@/components/course/BsnsTask";

type Props = { params: Promise<{ slug: string; n: string; id: string }> };

/** CelsBSNS task (spec §3, phone 4): the instructions with "Ver en español", the answer, "Entregar a mi coach". */
export default async function BsnsTaskPage({ params }: Props) {
  const { slug, n, id } = await params;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/semana/${n}/tarea/${id}`);
  const theme = themeForCourse({ slug });
  if (theme !== "celsbsns") notFound();
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  const week = page?.episodes.find((e) => e.n === Number(n));
  const part = week?.parts.find((p) => p.id === id);
  if (!page || !week || !part) notFound();
  const access = await canAccessCourse(supabase, viewer, page.course.id);
  if (!access) redirect(`/app/cursos/${slug}`);

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
