import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { loadRoute } from "@/lib/route";
import { RoutePage } from "@/components/route/Route";

export const metadata = { title: "CelsGLOBAL · Tu ruta" };

export default async function CelsGlobalRoute() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const data = await loadRoute(supabase, user!.id); // the /app shell already sent signed-out visitors to /entrar
  return <RoutePage t={t.route} data={data} />;
}
