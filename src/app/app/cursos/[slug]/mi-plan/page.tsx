import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { loadGuided } from "@/lib/guided-server";
import { MiPlanView } from "@/components/guided/MiPlanView";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Mi plan financiero · CelsU" };

/** Mi plan financiero (celsu-global-finanzas-brief.md): the Finanzas course's product, owner only (financial_plans). */
export default async function MiPlanPage({ params }: Props) {
  const { slug } = await params;
  const { lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/mi-plan`);
  const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  if (!(await canAccessCourse(supabase, viewer, course.id))) redirect(`/app/cursos/${slug}`);
  const g = await loadGuided(supabase, slug, viewer.user.id);
  if (!g || g.theme !== "finanzas") notFound();
  const steps = g.steps.map((x) => x.step);
  return (
    <MiPlanView
      userId={viewer.user.id}
      slug={g.course.slug}
      steps={steps}
      plan={g.resume}
      name={viewer.displayName ?? ""}
      defaultLang={lang === "en" ? "en" : "es"}
      disclaimer={steps.find((x) => x.disclaimer)?.disclaimer ?? null}
    />
  );
}
