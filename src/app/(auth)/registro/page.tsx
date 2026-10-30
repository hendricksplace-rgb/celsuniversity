import Link from "next/link";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { getLang } from "@/lib/i18n/server";
import { enrollCopy } from "@/lib/i18n/enroll-copy";
import { loginCopy } from "@/lib/i18n/login-copy";
import { reservePlan } from "@/lib/actions";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Crea tu cuenta · CelsU" };
type Props = { searchParams: Promise<{ error?: string; sent?: string; plan?: string; reservado?: string; next?: string }> };

/**
 * Sign-up (C-032 design, the "Crear cuenta" tab of /entrar). With ?plan=<product code> (plan buttons while
 * purchases are closed, src/lib/enroll.ts) the plan is remembered: sign-up metadata → profiles.requested_plan,
 * or reservePlan for someone already signed in.
 */
export default async function SignUpPage({ searchParams }: Props) {
  const lang = await getLang();
  const c = loginCopy(lang);
  const e = enrollCopy(lang);
  const { error, sent, plan: planParam, reservado, next } = await searchParams;

  const supabase = await createClient();
  const code = planParam && /^[a-z0-9_]{1,60}$/.test(planParam) ? planParam : null;
  const { data: product } = code ? await supabase.from("products").select("code, name").eq("code", code).eq("active", true).maybeSingle() : { data: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const frame = (body: React.ReactNode) => (
    <AuthFrame c={c} lang={lang} side="signup">
      <div className="au-card ev-pg">
        <div className="au-pane">{body}</div>
      </div>
    </AuthFrame>
  );

  if (product && (sent || reservado)) {
    return frame(
      <div className="au-done" role="status" data-testid="plan-reserved">
        <div style={{ fontSize: 52 }}>🎉</div>
        <h2>{e.reservedTitle}</h2>
        <p className="au-lede">{e.reservedSub.replace("{plan}", product.name)}</p>
        {sent ? (
          <p className="au-alert info">{e.reservedCheck}</p>
        ) : (
          <Link href="/app" className="ev-btn">
            {e.goApp}
          </Link>
        )}
      </div>,
    );
  }

  if (user && product) {
    return frame(
      <>
        <h2>{e.reserveTitle}</h2>
        {error && <p className="au-alert">{lang === "en" ? "Something went wrong. Please try again." : "Algo salió mal. Inténtalo de nuevo."}</p>}
        <div className="au-plan" data-testid="plan-chosen">
          {e.reserveSub}
          <b>{product.name}</b>
        </div>
        <p className="au-lede">{e.reservedSignedIn}</p>
        <form action={reservePlan}>
          <input type="hidden" name="plan" value={product.code} />
          <button className="ev-btn">{e.reserveCta}</button>
        </form>
      </>,
    );
  }

  return (
    <AuthScreen
      c={c}
      lang={lang}
      view="signup"
      next={safeNextPath(next)}
      google={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"}
      plan={product ? { code: product.code, name: product.name, label: e.reserveSub } : null}
    />
  );
}
