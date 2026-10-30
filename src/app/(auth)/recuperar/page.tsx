import { AuthScreen } from "@/components/auth/AuthScreen";
import { getLang } from "@/lib/i18n/server";
import { loginCopy } from "@/lib/i18n/login-copy";

export const metadata = { title: "Recupera tu contraseña · CelsU" };
type Props = { searchParams: Promise<{ email?: string }> };

/** Password reset, step 1 (cuenta spec §5): the email. The answer never says whether it exists. */
export default async function RecuperarPage({ searchParams }: Props) {
  const { email } = await searchParams;
  // /activar sends people here with their address when an invitation expired.
  const prefill = typeof email === "string" && email.length <= 254 && email.includes("@") ? email : "";
  const lang = await getLang();
  return <AuthScreen c={loginCopy(lang)} lang={lang} view="forgot" next="/app" google={false} email={prefill} />;
}
