import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { loadCoursePage } from "@/lib/course-page";
import { loadCapstone } from "@/lib/capstone-server";
import { Capstone } from "@/components/capstone/Capstone";

type Props = { params: Promise<{ slug: string }> };

/** CelsBSNS "Mi Capstone" (celsu-celsbsns-capstone-brief.md, celsbsns-capstone-mockup.html). */
export default async function CapstonePage({ params }: Props) {
  const { slug } = await params;
  const { lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/capstone`);
  if (themeForCourse({ slug }) !== "celsbsns") notFound();
  const page = await loadCoursePage(supabase, viewer.user.id, slug, "celsbsns", viewer.isStaff);
  if (!page) notFound();
  if (!(await canAccessCourse(supabase, viewer, page.course.id))) redirect(`/app/cursos/${slug}`);
  const data = await loadCapstone(supabase, page, viewer.user.id, viewer.displayName);
  return <Capstone d={data} userId={viewer.user.id} defaultLang={lang === "en" ? "en" : "es"} />;
}
