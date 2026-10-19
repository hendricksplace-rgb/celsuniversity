import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Pasted secrets sometimes carry zero-width characters, which fetch rejects in a header. */
const clean = (v: string | undefined) => (v ?? "").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim();

/**
 * Server-only client with the secret key, or null when SUPABASE_SECRET_KEY isn't set. Never import this from a
 * client component, and only use it for reads the caller has already scoped with the user's own RLS client
 * (Mis clases: the names in a class the student is a member of, which class_members/profiles RLS hides).
 */
export function adminClient() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY);
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
