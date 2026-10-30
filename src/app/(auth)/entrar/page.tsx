import { AuthScreen } from "@/components/auth/AuthScreen";
import { getLang } from "@/lib/i18n/server";
import { loginCopy } from "@/lib/i18n/login-copy";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Entrar · CelsU" };
type Props = { searchParams: Promise<{ error?: string; next?: string; email?: string }> };

/** Sign in (C-032 design): an email code first (C-039), or the password. ?next= is kept through the whole flow. */
export default async function SignInPage({ searchParams }: Props) {
  const { error, next, email } = await searchParams;
  // Already signed in (e.g. a page sent the student here on a passing Auth hiccup, C-037): straight back.
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (user) redirect(safeNextPath(next));
  const lang = await getLang();
  return (
    <AuthScreen
      c={loginCopy(lang)}
      lang={lang}
      view="login"
      next={safeNextPath(next)}
      google={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"}
      email={typeof email === "string" && email.length <= 254 ? email : ""}
      linkFailed={!!error}
    />
  );
}
