import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { loadHome } from "@/lib/home";
import { GuestHome, StudentHome } from "@/components/home/Home";
import { courseLabel, leaderCard } from "@/lib/leaderboard";
import { LeaderCard } from "@/components/leaderboard/LeaderCard";

/** Students with an active enrollment get their personal home; everyone else the evaluations and programs. */
export default async function StudentHomePage() {
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/app");

  const data = await loadHome(supabase, user.id);
  // Leaderboard card (C-026) for the course they're studying: the one "Continuar" opens, else the first.
  const cl = data.continueLesson;
  const program = data.programs.find((p) => cl && p.brand === cl.brand) ?? data.programs[0];
  const course = program && (program.courses.find((c) => c.title === cl?.courseTitle) ?? program.courses[0]);
  const card = course ? await leaderCard(supabase, { id: course.id, slug: course.slug, label: courseLabel(program.brand, course.title) }) : null;
  return data.programs.length ? (
    <StudentHome t={t.dash} cv={t.cv} data={data} leader={card && <LeaderCard t={t.lb} d={card} />} />
  ) : (
    <GuestHome t={t.dash} levelLabel={t.app.level} data={data} locale={lang === "en" ? "en-US" : "es-MX"} />
  );
}
