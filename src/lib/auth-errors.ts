// The one place auth screens turn a Supabase Auth error into words (C-038). Every login, sign-up, code,
// reset and password screen calls authError(); new tickets add their codes here, in both languages.
// Codes: https://supabase.com/docs/guides/auth/debugging/error-codes

import type { Lang } from "@/lib/i18n/dictionaries";

/** What the screen shows under the message: a link to /recuperar, to sign-up, "send a new one", or WhatsApp. */
export type AuthErrorAction = "reset" | "signup" | "resend" | "help" | null;
export type AuthErrorKind =
  | "weak_password"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "same_password"
  | "rate_limit"
  | "code_rate_limit"
  | "link_expired"
  | "no_account"
  | "bad_code"
  | "network"
  | "other";

export const WHATSAPP_URL = "https://wa.me/524494975359";

const TEXT: Record<Lang, Record<AuthErrorKind, string>> = {
  es: {
    weak_password: "Esa contraseña es muy común o apareció en una filtración. Elige otra: al menos 8 caracteres, con letras y números.",
    invalid_credentials: "Correo o contraseña incorrectos.",
    email_not_confirmed: "Revisa tu correo para confirmar tu cuenta.",
    same_password: "Es la misma contraseña que ya tienes. Elige una nueva.",
    rate_limit: "Espera un minuto e inténtalo de nuevo.",
    code_rate_limit: "Espera un minuto antes de pedir otro código.",
    link_expired: "El enlace ya venció. Pide uno nuevo.",
    no_account: "No encontramos una cuenta con ese correo.",
    bad_code: "Ese código no es correcto o ya venció. Revisa el último correo o pide uno nuevo.",
    network: "No pudimos conectar. Revisa tu internet e inténtalo de nuevo.",
    other: "Algo salió mal.",
  },
  en: {
    weak_password: "That password is too common or appeared in a data leak. Choose another: at least 8 characters, with letters and numbers.",
    invalid_credentials: "Wrong email or password.",
    email_not_confirmed: "Check your email to confirm your account.",
    same_password: "That's the password you already have. Choose a new one.",
    rate_limit: "Wait a minute and try again.",
    code_rate_limit: "Wait a minute before asking for another code.",
    link_expired: "The link has expired. Ask for a new one.",
    no_account: "We couldn't find an account with that email.",
    bad_code: "That code isn't right or has expired. Check the latest email or ask for a new one.",
    network: "We couldn't connect. Check your internet and try again.",
    other: "Something went wrong.",
  },
};

/** The link text under a message, per action. */
export const AUTH_ERROR_LINK: Record<Lang, Record<Exclude<AuthErrorAction, null>, string>> = {
  es: { reset: "¿Olvidaste tu contraseña?", signup: "¿Quieres crear una?", resend: "Envíame uno nuevo", help: "Escríbenos por WhatsApp (449 497 5359)" },
  en: { reset: "Forgot your password?", signup: "Want to create one?", resend: "Send me a new one", help: "Message us on WhatsApp (449 497 5359)" },
};

const ACTION: Record<AuthErrorKind, AuthErrorAction> = {
  weak_password: null,
  invalid_credentials: "reset",
  email_not_confirmed: null,
  same_password: null,
  rate_limit: null,
  code_rate_limit: null,
  link_expired: "resend",
  no_account: "signup",
  bad_code: null,
  network: null,
  other: "help",
};

type ErrorLike = { code?: string; status?: number; message?: string; name?: string } | null | undefined;

/**
 * Which kind of error this is. `context` changes a few: a rate limit while asking for a code says "otro código",
 * and in the code step an expired OTP is a wrong code (the boxes clear), not an expired link.
 */
export function authErrorKind(error: ErrorLike, context: "password" | "code" | "verify" | "link" | "other" = "other"): AuthErrorKind {
  const code = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  if (code === "weak_password" || msg.includes("known to be weak") || msg.includes("password should")) return "weak_password";
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "invalid_credentials";
  if (code === "email_not_confirmed") return "email_not_confirmed";
  if (code === "same_password") return "same_password";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || code === "over_sms_send_rate_limit" || error?.status === 429)
    return context === "code" ? "code_rate_limit" : "rate_limit";
  // signInWithOtp with shouldCreateUser: false and no account behind the email.
  if (code === "otp_disabled" || code === "user_not_found" || msg.includes("signups not allowed for otp")) return "no_account";
  if (context === "verify" && (code === "otp_expired" || code === "invalid_otp" || msg.includes("token has expired or is invalid"))) return "bad_code";
  if (code === "otp_expired" || code === "flow_state_expired" || code === "flow_state_not_found" || code === "bad_code_verifier") return "link_expired";
  if (!error?.status && (error?.name === "AuthRetryableFetchError" || msg.includes("failed to fetch") || msg.includes("network"))) return "network";
  return "other";
}

/** The message and the link to show under it, in the screen's language. */
export function authError(error: ErrorLike, lang: Lang, context?: Parameters<typeof authErrorKind>[1]) {
  const kind = authErrorKind(error, context);
  const raw = error?.message?.trim();
  // Anything unmapped: Supabase's own words too, so the student (and we, on WhatsApp) know what happened.
  const text = kind === "other" && raw ? `${TEXT[lang].other} (${raw})` : TEXT[lang][kind];
  return { kind, text, action: ACTION[kind] };
}

export function authErrorText(kind: AuthErrorKind, lang: Lang) {
  return TEXT[lang][kind];
}
