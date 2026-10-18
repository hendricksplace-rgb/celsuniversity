import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { CuentaPage } from "@/components/cuenta/ui";
import { DatosForm } from "@/components/cuenta/DatosForm";

export const metadata = { title: "Mis datos · CelsU" };

export default async function DatosPage() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/cuenta/datos");
  const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url, preferred_language").eq("id", viewer.user.id).maybeSingle();
  return (
    <CuentaPage title={t.cuenta.rows.datos} back="/app/cuenta" backLabel={t.cuenta.back}>
      <DatosForm
        t={t.cuenta}
        userId={viewer.user.id}
        email={viewer.user.email ?? ""}
        pendingEmail={viewer.user.new_email ?? null}
        initial={{ name: profile?.display_name ?? "", avatar: profile?.avatar_url ?? null, lang: profile?.preferred_language === "en" ? "en" : "es" }}
      />
    </CuentaPage>
  );
}
