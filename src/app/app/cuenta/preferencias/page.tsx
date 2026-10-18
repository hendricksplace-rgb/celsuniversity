import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { withDefaults } from "@/lib/prefs";
import { CuentaPage } from "@/components/cuenta/ui";
import { PrefsForm } from "@/components/cuenta/PrefsForm";

export const metadata = { title: "Preferencias · CelsU" };

export default async function PreferenciasPage() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/cuenta/preferencias");
  const { data } = await supabase.from("user_preferences").select("*").eq("user_id", viewer.user.id).maybeSingle();
  return (
    <CuentaPage title={t.cuenta.rows.preferencias} back="/app/cuenta" backLabel={t.cuenta.back}>
      <PrefsForm t={t.cuenta} userId={viewer.user.id} initial={withDefaults(data)} />
    </CuentaPage>
  );
}
