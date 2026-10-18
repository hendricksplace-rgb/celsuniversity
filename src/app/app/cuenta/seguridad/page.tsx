import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { CuentaPage } from "@/components/cuenta/ui";
import { SecurityForm } from "@/components/cuenta/SecurityForm";

export const metadata = { title: "Seguridad · CelsU" };

export default async function SeguridadPage() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/cuenta/seguridad");
  const providers = (viewer.user.identities ?? []).map((i) => i.provider);
  return (
    <CuentaPage title={t.cuenta.rows.seguridad} back="/app/cuenta" backLabel={t.cuenta.back}>
      <SecurityForm t={t.cuenta} google={providers.includes("google")} hasPassword={providers.includes("email")} />
    </CuentaPage>
  );
}
