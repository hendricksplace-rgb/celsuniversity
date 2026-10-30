import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { CuentaPage } from "@/components/cuenta/ui";
import { SecurityForm } from "@/components/cuenta/SecurityForm";

export const metadata = { title: "Seguridad · CelsU" };

export default async function SeguridadPage() {
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/cuenta/seguridad");
  const providers = (viewer.user.identities ?? []).map((i) => i.provider);
  // Signed in with an email code (C-039): the password is optional, so the section offers to create one.
  const { data: claims } = await supabase.auth.getClaims();
  const amr = (claims?.claims.amr ?? []) as { method?: string }[];
  const byCode = amr.some((a) => a.method === "otp" || a.method === "magiclink") && !amr.some((a) => a.method === "password");
  return (
    <CuentaPage title={t.cuenta.rows.seguridad} back="/app/cuenta" backLabel={t.cuenta.back}>
      <SecurityForm t={t.cuenta} lang={lang} google={providers.includes("google")} hasPassword={providers.includes("email")} byCode={byCode} />
    </CuentaPage>
  );
}
