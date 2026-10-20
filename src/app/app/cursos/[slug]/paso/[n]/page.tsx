import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { loadGuided } from "@/lib/guided-server";
import { stageLabel } from "@/lib/route";
import { stepPath } from "@/lib/guided";
import { GuidedStepView } from "@/components/guided/GuidedStepView";

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
  return (
    <GuidedStepView
      userId={viewer.user.id}
      slug={g.course.slug}
      courseTitle={g.course.title}
      stage={stageLabel(slug, "es") ?? ""}
      steps={g.steps.map((x) => x.step)}
      index={index}
      moduleId={row.moduleId}
      lessonIds={row.lessonIds}
      completedAt={row.completedAt}
      state={row.state}
      resume={g.resume}
      readerT={t.reader}
      defaultLang={lang === "en" ? "en" : "es"}
    />
  );
}
