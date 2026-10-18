import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * A signed-out client for public data (products, published episode titles). It reads no cookies, so
 * its results can be cached across visitors with unstable_cache.
 */
export function publicClient() {
  const { url, key } = supabaseEnv();
  return createSupabaseClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
