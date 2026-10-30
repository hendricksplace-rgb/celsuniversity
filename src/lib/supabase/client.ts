import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";
import { REMEMBER_COOKIE, authCookieOptions, withRemember } from "./cookies";

// One browser client for the whole app (C-037): every component shares it, so only one auth listener
// refreshes the session in this tab and no two clients race to rotate the same refresh token.
let client: SupabaseClient<Database> | null = null;

export function createClient() {
  if (client) return client;
  const { url, key } = supabaseEnv();
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  client = createBrowserClient<Database>(url, key, {
    isSingleton: true,
    cookieOptions: authCookieOptions(secure),
    cookies: {
      getAll: () => parseCookieHeader(document.cookie).map(({ name, value }) => ({ name, value: value ?? "" })),
      setAll(cookiesToSet) {
        const remember = !parseCookieHeader(document.cookie).some((c) => c.name === REMEMBER_COOKIE && c.value === "0");
        for (const { name, value, options } of cookiesToSet) document.cookie = serializeCookieHeader(name, value, withRemember(options, remember));
      },
    },
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

/** "Recordarme" on /entrar, written before signing in (a year; only the auth cookies follow it). */
export function setRemember(remember: boolean) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${REMEMBER_COOKIE}=${remember ? 1 : 0}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
}
