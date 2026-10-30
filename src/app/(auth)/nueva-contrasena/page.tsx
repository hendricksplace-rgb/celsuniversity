import { getLang } from "@/lib/i18n/server";
import { loginCopy } from "@/lib/i18n/login-copy";
import { NewPassword } from "./NewPassword";

export const metadata = { title: "Nueva contraseña · CelsU", robots: { index: false } };

/** Password reset, step 3: the link from "Crea una nueva contraseña para CelsU" lands here. */
export default async function NuevaContrasenaPage() {
  const lang = await getLang();
  return <NewPassword c={loginCopy(lang)} lang={lang} />;
}
