import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { loadProgress } from "@/lib/progress-page";
import { Progreso } from "@/components/progreso/Progreso";

export async function generateMetadata() {
  const { t } = await getDictionary();
  return { title: `${t.progreso.title} · CelsU` };
}

export default async function ProgresoPage() {
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const d = await loadProgress(supabase, user!.id); // the /app shell already sent signed-out visitors to /entrar
  return <Progreso t={t.progreso} d={d} lang={lang} />;
}
