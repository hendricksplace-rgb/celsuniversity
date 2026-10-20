// The CelsUS guide routes (/episodio/<n>/guia and /evaluacion/guia): teachers and admins only (RLS hides the
// guides from everyone else anyway); students get "no access".
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canSeeTeacherGuides, getViewer } from "@/lib/access";
import { episodePath } from "@/lib/course-page";
import { buildGuide } from "@/lib/teacher-guide";
import { guideCourse, guidePath, moduleGuides, type GuidePlace } from "@/lib/teacher-guide-server";
import { fill } from "@/components/course/kit";
import { LockedCard, TeacherGuide } from "./TeacherGuide";

export async function GuidePage({ slug, place }: { slug: string; place: GuidePlace }) {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=${guidePath(slug, place)}`);
  if (!canSeeTeacherGuides(viewer.role)) return <LockedCard title={t.guide.lockedTitle} text={t.guide.locked} href="/app/cursos" cta={t.guide.lockedCta} />;

  const info = await guideCourse(supabase, slug);
  if (!info) notFound();
  const moduleId = place === "evaluacion" ? info.evaluation : (info.weeks[place - 1] ?? null);
  const guide = moduleId ? (await moduleGuides(supabase, [moduleId])).get(moduleId) : null;
  if (!guide) notFound();

  const courseHref = `/app/cursos/${info.course.slug}`;
  return (
    <TeacherGuide
      model={buildGuide(guide.body)}
      t={t.guide}
      backHref={place === "evaluacion" ? courseHref : episodePath(info.course.slug, place)}
      backLabel={place === "evaluacion" ? t.guide.backCourse : fill(t.guide.back, { n: place })}
      crumb={place === "evaluacion" ? t.guide.crumbEval : fill(t.guide.crumb, { n: place })}
      fallbackTitle={t.guide.title}
    />
  );
}
