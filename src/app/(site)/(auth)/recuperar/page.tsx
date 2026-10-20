import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { requestPasswordReset } from "@/lib/actions";

export const metadata = { title: "Recupera tu contraseña · CelsU" };
type Props = { searchParams: Promise<{ enviado?: string; email?: string }> };

/** Password reset, step 1 (cuenta spec §5): the email. The answer never says whether it exists. */
export default async function RecuperarPage({ searchParams }: Props) {
  const { enviado, email } = await searchParams;
  // /activar sends people here with their address when an invitation expired.
  const prefill = typeof email === "string" && email.length <= 254 && email.includes("@") ? email : undefined;
  const { t } = await getDictionary();
  return (
    <div className="card mx-auto max-w-sm space-y-5">
      <h1 className="text-2xl font-bold">{t.cuenta.recoverTitle}</h1>
      {enviado ? (
        <p role="status" className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm">
          {t.cuenta.recoverSent}
        </p>
      ) : (
        <>
          <p className="text-sm text-white/70">{t.cuenta.recoverText}</p>
          <form action={requestPasswordReset} className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>{t.auth.email}</span>
              <input className="field" type="email" name="email" autoComplete="email" defaultValue={prefill} required />
            </label>
            <button className="btn-primary w-full">{t.cuenta.recoverSend}</button>
          </form>
        </>
      )}
      <p className="text-center text-sm">
        <Link href="/entrar" className="font-semibold text-brand">
          ← {t.auth.signInTitle}
        </Link>
      </p>
    </div>
  );
}
