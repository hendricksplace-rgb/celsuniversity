import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { getLang } from "@/lib/i18n/server";
import { loginCopy } from "@/lib/i18n/login-copy";
import { redeemInvite, type Redeemed } from "@/lib/invites";

export const metadata = { title: "Activa tu cuenta · CelsU", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ t?: string }> };

const COPY = {
  es: {
    expired: {
      title: "Esta invitación ya venció",
      text: "Las invitaciones duran 30 días. No pasa nada: pide un enlace para crear tu contraseña y entra a CelsU.",
    },
    used: { title: "Ya activaste tu cuenta", text: "Este enlace ya se usó para crear tu contraseña. Entra con tu correo y tu contraseña." },
    unknown: {
      title: "No encontramos esta invitación",
      text: "El enlace está incompleto o ya no es válido. Pide un enlace para crear tu contraseña con tu correo.",
    },
    rate: { title: "Demasiados intentos", text: "Espera unos minutos y vuelve a abrir el enlace de tu correo." },
    error: { title: "Algo salió mal", text: "No pudimos abrir tu invitación. Inténtalo de nuevo en un momento." },
    forgot: "¿Olvidaste tu contraseña?",
    signIn: "Entrar",
  },
  en: {
    expired: {
      title: "This invitation has expired",
      text: "Invitations last 30 days. No problem: ask for a link to create your password and sign in to CelsU.",
    },
    used: { title: "Your account is already active", text: "This link was already used to create your password. Sign in with your email and password." },
    unknown: {
      title: "We couldn't find this invitation",
      text: "The link is incomplete or no longer valid. Ask for a link to create your password with your email.",
    },
    rate: { title: "Too many attempts", text: "Wait a few minutes and open the link in your email again." },
    error: { title: "Something went wrong", text: "We couldn't open your invitation. Try again in a moment." },
    forgot: "Forgot your password?",
    signIn: "Sign in",
  },
};

/**
 * The button in the invite-celsglobal email: /activar?t=<token>. The student-invite function checks the
 * invitation (30 days, password not set yet) and returns a fresh recovery token, which /auth/confirm
 * verifies server-side (signs the student in) before /nueva-contrasena asks for the password, then Mis cursos.
 */
export default async function ActivarPage({ searchParams }: Props) {
  const { t } = await searchParams;
  const lang = await getLang();
  const c = COPY[lang === "en" ? "en" : "es"];
  const r: Redeemed = t ? await redeemInvite(t) : { ok: false, reason: "unknown" };
  if (r.ok) {
    const q = new URLSearchParams({ token_hash: r.token_hash, type: "recovery", next: "/nueva-contrasena?next=/app/cursos" });
    redirect(`/auth/confirm?${q}`);
  }
  const msg = c[r.reason];
  const recuperar = r.email ? `/recuperar?email=${encodeURIComponent(r.email)}` : "/recuperar";
  return (
    <AuthFrame c={loginCopy(lang)} lang={lang} side="forgot">
      <div className="au-card ev-pg" data-testid="activar-error">
        <div className="au-pane">
          <h2>{msg.title}</h2>
          <p className="au-lede">{msg.text}</p>
          {r.reason === "used" ? (
            <Link href="/entrar" className="ev-btn">
              {c.signIn}
            </Link>
          ) : null}
          <Link href={recuperar} className={r.reason === "used" ? "au-link au-alt" : "ev-btn"} style={{ textAlign: "center" }}>
            {c.forgot}
          </Link>
        </div>
      </div>
    </AuthFrame>
  );
}
