// C-026: the per-course XP leaderboard ("Tabla de posiciones") and preset cheers. Ranks come from
// public.leaderboard (xp_events, week from Monday 00:00 Mexico City); names arrive already shortened
// ("Valeria M.") and never with an email.
import type { Client } from "@/lib/supabase/types";
import { accessibleCourses, courseStats, nextLesson } from "@/lib/learning";
import { hrefOf } from "@/lib/my-courses";
import { lessonHrefs } from "@/lib/lesson-href";
import { BRAND_COLOR, courseLabel, xpToPass, type Lb, type LbCourse, type LbRow, type Period } from "@/lib/leaderboard-shared";

export * from "@/lib/leaderboard-shared";

export async function fetchLeaderboard(supabase: Client, courseId: string, period: Period): Promise<Lb | null> {
  const { data, error } = await supabase.rpc("leaderboard", {
    p_course: courseId,
    p_period: period === "all" ? "all" : "week",
    p_scope: period === "class" ? "class" : "course",
  });
  return error || !data ? null : (data as unknown as Lb);
}

/** The student's courses for the pills (with where "Ganar XP" goes), most recently studied first. */
export async function leaderboardCourses(supabase: Client, userId: string) {
  const access = await accessibleCourses(supabase, userId);
  const stats = [...(await courseStats(supabase, userId, access.ids)).values()].sort((a, b) => a.sort - b.sort);
  const hrefs = await lessonHrefs(
    supabase,
    { userId, isStaff: false },
    stats.map((c) => nextLesson(c)?.id),
  );
  for (const c of stats) {
    const n = nextLesson(c);
    if (n) c.nextHref = hrefs.get(n.id);
  }
  const recent = [...stats].sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? ""));
  return {
    courses: stats.map<LbCourse>((c) => ({ id: c.id, slug: c.slug, label: courseLabel(c.brand, c.title), color: BRAND_COLOR[c.brand], earnHref: hrefOf(c) })),
    recentSlug: recent[0]?.last ? recent[0].slug : (stats[0]?.slug ?? null),
  };
}

export type LeaderCardData = {
  courseLabel: string;
  slug: string;
  rank: number;
  of: number;
  ahead: { name: string; xp: number } | null;
  first: boolean;
  top: Pick<LbRow, "initial" | "avatar_url" | "user_id">[];
};

/** The small card on Inicio and the course page; null when fewer than 3 students have XP this week. */
export async function leaderCard(supabase: Client, course: { id: string; slug: string; label: string }): Promise<LeaderCardData | null> {
  const lb = await fetchLeaderboard(supabase, course.id, "week");
  if (!lb || lb.ranked < 3 || !lb.my_rank) return null;
  return {
    courseLabel: course.label,
    slug: course.slug,
    rank: lb.my_rank,
    of: Math.max(lb.students, lb.ranked, lb.my_rank),
    ahead: lb.ahead ? { name: lb.ahead.display, xp: xpToPass(lb) } : null,
    first: lb.my_rank === 1,
    top: lb.rows.filter((r) => r.rank <= 3).map((r) => ({ initial: r.initial, avatar_url: r.avatar_url, user_id: r.user_id })),
  };
}
