import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { CuentaPage } from "@/components/cuenta/ui";
import { DeleteAccount } from "@/components/cuenta/DeleteAccount";

export const metadata = { title: "Eliminar mi cuenta · CelsU" };

export default async function EliminarPage() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/cuenta/eliminar");
  return (
    <CuentaPage title={t.cuenta.deleteLink} back="/app/cuenta" backLabel={t.cuenta.back}>
      <DeleteAccount t={t.cuenta} />
    </CuentaPage>
  );
}
