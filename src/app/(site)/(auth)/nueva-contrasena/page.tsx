import { getDictionary } from "@/lib/i18n/server";
import { NewPassword } from "./NewPassword";

export const metadata = { title: "Nueva contraseña · CelsU", robots: { index: false } };

/** Password reset, step 3: the link from "Crea una nueva contraseña para CelsU" lands here. */
export default async function NuevaContrasenaPage() {
  const { t } = await getDictionary();
  return <NewPassword t={t.cuenta} />;
}
