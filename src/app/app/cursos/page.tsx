import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { loadMyCourses } from "@/lib/my-courses";
import { MisCursos } from "@/components/mycourses/MisCursos";
import type { Filter } from "@/components/mycourses/Filters";

type Props = { searchParams: Promise<{ f?: string }> };
const FILTERS: Filter[] = ["progress", "done", "books"];

export async function generateMetadata() {
  const { t } = await getDictionary();
  return { title: `${t.mycourses.title} · CelsU` };
}

export default async function MisCursosPage({ searchParams }: Props) {
  const { f } = await searchParams;
  const initial: Filter = FILTERS.includes(f as Filter) ? (f as Filter) : "all";
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const data = await loadMyCourses(supabase, user!.id); // the /app shell already sent signed-out visitors to /entrar
  return <MisCursos t={t.misCursos} u={t.mycourses} cv={t.cv} data={data} initial={initial} />;
}
