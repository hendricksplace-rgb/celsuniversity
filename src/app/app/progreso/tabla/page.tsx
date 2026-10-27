import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { fetchLeaderboard, leaderboardCourses, type Phrase } from "@/lib/leaderboard";
import { Tabla } from "@/components/leaderboard/Tabla";

// Fresh numbers every time the screen opens (C-026: refresh on open and after any XP event).
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getDictionary();
  return { title: `${t.lb.title} · CelsU` };
}

type Props = { searchParams: Promise<{ c?: string; p?: string }> };

export default async function TablaPage({ searchParams }: Props) {
  const { c, p } = await searchParams;
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { courses, recentSlug } = await leaderboardCourses(supabase, user!.id); // the /app shell sent signed-out visitors to /entrar
  const course = courses.find((x) => x.slug === c) ?? courses.find((x) => x.slug === recentSlug) ?? courses[0];
  if (!course) return <p className="rounded-2xl bg-white p-6 font-semibold text-[#4c4a6b]">{t.lb.noCourse}</p>;

  const period = p === "all" ? "all" : "week";
  const [lb, { data: phrases }, { data: me }, { data: values }, { data: mine }] = await Promise.all([
    fetchLeaderboard(supabase, course.id, period),
    supabase.from("cheer_phrases").select("code, emoji, en, es, note, audio, wt").eq("active", true).order("sort_order"),
    supabase.from("profiles").select("show_on_leaderboard, receive_cheers").eq("id", user!.id).single(),
    supabase.rpc("course_xp_values", { p_course: course.id }),
    supabase.rpc("my_cheers", { p_course: course.id }),
  ]);

  return (
    <Tabla
      key={course.id}
      t={t.lb}
      userId={user!.id}
      lang={lang}
      courses={courses}
      course={course}
      initial={lb}
      initialPeriod={period}
      phrases={(phrases ?? []) as Phrase[]}
      prefs={{ show: me?.show_on_leaderboard ?? true, receive: me?.receive_cheers ?? true }}
      xpValues={(values ?? []) as { type: string; xp: number; n: number }[]}
      mine={(mine ?? { count: 0, latest: [] }) as { count: number; latest: { from: string; en: string; emoji: string }[] }}
    />
  );
}
