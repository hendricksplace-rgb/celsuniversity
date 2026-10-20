import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { loadGuided } from "@/lib/guided-server";
import { guidedStage } from "@/lib/guided-copy";
import { stepPath } from "@/lib/guided";
import { GuidedStepView } from "@/components/guided/GuidedStepView";
import { signStorageRefs } from "@/lib/storage";

type Props = { params: Promise<{ slug: string; n: string }> };

/** One step of a guided course (celsu-global-cv-resume-brief.md §2): the same template for every step. */
export default async function GuidedStepPage({ params }: Props) {
  const { slug, n } = await params;
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=${stepPath(slug, Number(n) || 1)}`);
  const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  // Without access the course page explains why (ended, paused or never bought).
  if (!(await canAccessCourse(supabase, viewer, course.id))) redirect(`/app/cursos/${slug}`);
  const g = await loadGuided(supabase, slug, viewer.user.id);
  if (!g) redirect(`/app/cursos/${slug}`);
  const index = g.steps.findIndex((x) => x.step.step === Number(n));
  if (index < 0) notFound();
  const row = g.steps[index]!;
  // The e-book narration of this step's screens ("▶ Escuchar"): short-lived signed URLs from course-media.
  // and the step's audio summary (audio.storage).
  const refs = [...(row.step.ebookScreens ?? []).flatMap((x) => (x.audio ? [x.audio] : [])), ...(row.step.audio?.storage ? [row.step.audio.storage] : [])];
  if (refs.length) {
    const signed = await signStorageRefs(supabase, refs, { courseId: course.id, viewer, access: true });
    if (row.step.ebookScreens) row.step.ebookScreens = row.step.ebookScreens.map((x) => ({ ...x, audio: x.audio ? (signed.get(x.audio) ?? null) : null }));
    if (row.step.audio?.storage) row.step.audio = { ...row.step.audio, url: signed.get(row.step.audio.storage) ?? null };
  }
  return (
    <GuidedStepView
      userId={viewer.user.id}
      slug={g.course.slug}
      courseTitle={g.course.title}
      stage={guidedStage(slug, "es") ?? ""}
      steps={g.steps.map((x) => x.step)}
      index={index}
      moduleId={row.moduleId}
      lessonIds={row.lessonIds}
      completedAt={row.completedAt}
      state={row.state}
      resume={g.resume}
      readerT={t.reader}
      defaultLang={lang === "en" ? "en" : "es"}
      theme={g.theme}
    />
  );
}
