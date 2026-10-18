import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { signUp } from "@/lib/actions";

type Props = { searchParams: Promise<{ error?: string; sent?: string }> };

export default async function SignUpPage({ searchParams }: Props) {
  const { t } = await getDictionary();
  const { error, sent } = await searchParams;

  if (sent) {
    return <p className="card mx-auto max-w-sm text-center">{t.auth.checkEmail}</p>;
  }

  const message =
    error === "weakPassword" ? t.auth.errors.weakPassword : error ? t.auth.errors.generic : null;

  return (
    <div className="card mx-auto max-w-sm space-y-5">
      <h1 className="text-2xl font-bold">{t.auth.signUpTitle}</h1>
      {message && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{message}</p>}
      <form action={signUp} className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span>{t.auth.name}</span>
          <input className="field" name="name" autoComplete="name" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t.auth.email}</span>
          <input className="field" type="email" name="email" autoComplete="email" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t.auth.password}</span>
          <input className="field" type="password" name="password" autoComplete="new-password" minLength={8} required />
        </label>
        <button className="btn-primary w-full">{t.auth.submitSignUp}</button>
      </form>
      <p className="text-center text-sm text-white/70">
        {t.auth.haveAccount}{" "}
        <Link href="/entrar" className="font-semibold text-brand">
          {t.nav.signIn}
        </Link>
      </p>
    </div>
  );
}
