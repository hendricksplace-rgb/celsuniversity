import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { signIn, signInWithGoogle } from "@/lib/actions";

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { t } = await getDictionary();
  const { error, next = "/app" } = await searchParams;
  const message = error === "invalid" ? t.auth.errors.invalid : error ? t.auth.errors.generic : null;

  return (
    <div className="card mx-auto max-w-sm space-y-5">
      <h1 className="text-2xl font-bold">{t.auth.signInTitle}</h1>
      {message && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{message}</p>}
      <form action={signIn} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-1 text-sm">
          <span>{t.auth.email}</span>
          <input className="field" type="email" name="email" autoComplete="email" required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t.auth.password}</span>
          <input className="field" type="password" name="password" autoComplete="current-password" required />
        </label>
        <p className="text-right text-sm">
          <Link href="/recuperar" className="font-semibold text-brand">
            {t.cuenta.forgot}
          </Link>
        </p>
        <button className="btn-primary w-full">{t.auth.submitSignIn}</button>
      </form>
      <div className="text-center text-xs text-white/50">{t.auth.or}</div>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button className="btn-ghost w-full">{t.auth.google}</button>
      </form>
      <p className="text-center text-sm text-white/70">
        {t.auth.noAccount}{" "}
        <Link href="/registro" className="font-semibold text-brand">
          {t.nav.signUp}
        </Link>
      </p>
    </div>
  );
}
