import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { loadCoursePage } from "@/lib/course-page";
import { loadBsnsWeek } from "@/lib/bsns-week";
import { BsnsWeek } from "@/components/course/BsnsWeek";
import { previousWeekGoal } from "@/lib/feedback-server";

type Props = { params: Promise<{ slug: string; n: string }> };

/** CelsBSNS week v2 (celsu-celsbsns-semana-brief.md, celsbsns-semana-v2-mockup.html). Every week opens; nothing is locked. */
export default async function BsnsWeekPage({ params }: Props) {
  const { slug, n } = await params;
  const { lang, t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/semana/${n}`);
  const theme = themeForCourse({ slug });
  if (theme !== "celsbsns") notFound();
  const page = await loadCoursePage(supabase, viewer.user.id, slug, theme, viewer.isStaff);
  const week = page?.episodes.find((e) => e.n === Number(n));
  if (!page || !week) notFound();

  const [data, goal] = await Promise.all([
    loadBsnsWeek(supabase, {
      page,
      week,
      userId: viewer.user.id,
      displayName: viewer.displayName,
      lang,
    }),
    // The goal the student set in last week's Feedback & Progress reflection.
    previousWeekGoal(supabase, viewer.user.id, page.course.id, week.n),
  ]);
  return <BsnsWeek t={t.bsnsWeek} d={data} lang={lang} goal={goal ? { label: t.bsns.weekGoal, text: goal } : null} />;
}
