import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { loadHome } from "@/lib/home";
import { GuestHome, StudentHome } from "@/components/home/Home";

/** Students with an active enrollment get their personal home; everyone else the evaluations and programs. */
export default async function StudentHomePage() {
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/app");

  const data = await loadHome(supabase, user.id);
  return data.programs.length ? (
    <StudentHome t={t.dash} levelLabel={t.app.level} data={data} />
  ) : (
    <GuestHome t={t.dash} levelLabel={t.app.level} data={data} locale={lang === "en" ? "en-US" : "es-MX"} />
  );
}
