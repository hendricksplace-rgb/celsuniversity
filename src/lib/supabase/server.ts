import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";
import { REMEMBER_COOKIE, authCookieOptions, withRemember } from "./cookies";
import { SITE_URL } from "@/lib/site";

/**
 * Reads the session the middleware already refreshed (C-037). Never call auth.signOut() or refresh from here
 * on an error: only the "Cerrar sesión" button signs out.
 */
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();
  const remember = cookieStore.get(REMEMBER_COOKIE)?.value !== "0";

  return createServerClient<Database>(url, key, {
    cookieOptions: authCookieOptions(SITE_URL.startsWith("https:")),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, withRemember(options, remember)));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
