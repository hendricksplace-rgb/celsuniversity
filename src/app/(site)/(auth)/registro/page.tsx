import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { enrollCopy } from "@/lib/i18n/enroll-copy";
import { reservePlan, signUp } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; sent?: string; plan?: string; reservado?: string }> };

/**
 * Sign-up. With ?plan=<product code> (plan buttons while purchases are closed, src/lib/enroll.ts) the plan is
 * remembered: sign-up metadata → profiles.requested_plan, or reservePlan for someone already signed in.
 */
export default async function SignUpPage({ searchParams }: Props) {
  const { lang, t } = await getDictionary();
  const e = enrollCopy(lang);
  const { error, sent, plan: planParam, reservado } = await searchParams;

  const supabase = await createClient();
  const code = planParam && /^[a-z0-9_]{1,60}$/.test(planParam) ? planParam : null;
  const { data: product } = code ? await supabase.from("products").select("code, name").eq("code", code).eq("active", true).maybeSingle() : { data: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (product && (sent || reservado)) {
    return (
      <div className="card mx-auto max-w-sm space-y-3 text-center" role="status" data-testid="plan-reserved">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold">{e.reservedTitle}</h1>
        <p className="text-sm text-white/85">{e.reservedSub.replace("{plan}", product.name)}</p>
        {sent ? (
          <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/80">{e.reservedCheck}</p>
        ) : (
          <Link href="/app" className="btn-primary w-full">
            {e.goApp}
          </Link>
        )}
      </div>
    );
  }

  if (sent) {
    return <p className="card mx-auto max-w-sm text-center">{t.auth.checkEmail}</p>;
  }

  const message = error === "weakPassword" ? t.auth.errors.weakPassword : error ? t.auth.errors.generic : null;
  const planBox = product && (
    <div className="rounded-xl border border-[#FFC531]/50 bg-[#FFC531]/10 px-3 py-2.5 text-sm" data-testid="plan-chosen">
      <p className="text-white/80">{e.reserveSub}</p>
      <p className="mt-0.5 font-extrabold text-white">{product.name}</p>
    </div>
  );

  if (user && product) {
    return (
      <div className="card mx-auto max-w-sm space-y-5">
        <h1 className="text-2xl font-bold">{e.reserveTitle}</h1>
        {message && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{message}</p>}
        {planBox}
        <p className="text-sm text-white/75">{e.reservedSignedIn}</p>
        <form action={reservePlan}>
          <input type="hidden" name="plan" value={product.code} />
          <button className="btn-primary w-full">{e.reserveCta}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-sm space-y-5">
      <h1 className="text-2xl font-bold">{product ? e.reserveTitle : t.auth.signUpTitle}</h1>
      {message && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{message}</p>}
      {planBox}
      <form action={signUp} className="space-y-3">
        {product && <input type="hidden" name="plan" value={product.code} />}
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
        <button className="btn-primary w-full">{product ? e.reserveCta : t.auth.submitSignUp}</button>
      </form>
      <p className="text-center text-sm text-white/70">
        {t.auth.haveAccount}{" "}
        <Link href={product ? `/entrar?next=${encodeURIComponent(`/registro?plan=${product.code}`)}` : "/entrar"} className="font-semibold text-brand">
          {t.nav.signIn}
        </Link>
      </p>
    </div>
  );
}
