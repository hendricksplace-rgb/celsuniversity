import type { CookieOptions } from "@supabase/ssr";

// Auth cookie settings shared by the middleware, the server client and the browser client (C-037). The
// session cookies last 400 days (the @supabase/ssr default, the browser maximum), are SameSite=Lax and Secure
// on https, and never set a domain, so each host keeps its own. "Recordarme" unchecked on /entrar writes
// REMEMBER_COOKIE=0: the session cookies are then written without an expiry and end when the browser closes.

export const REMEMBER_COOKIE = "celsu-remember";
export const AUTH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export const authCookieOptions = (secure: boolean): CookieOptions => ({ path: "/", sameSite: "lax", secure, maxAge: AUTH_COOKIE_MAX_AGE });

/** The options for one auth cookie write: removals (maxAge 0) pass through; "Recordarme" off drops the expiry. */
export function withRemember(options: CookieOptions, remember: boolean): CookieOptions {
  if (remember || options.maxAge === 0) return options;
  const session = { ...options };
  delete session.maxAge;
  delete session.expires;
  return session;
}
