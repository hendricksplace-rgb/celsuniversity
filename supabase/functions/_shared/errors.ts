// Failures go to public.function_errors (read by staff on /app/admin/errores) as well as the logs.
// Logging never throws: a broken log must not turn a handled error into a crash.
import { createClient } from "npm:@supabase/supabase-js@2";

// Untyped client: function_errors is the only table it touches.
// deno-lint-ignore no-explicit-any
let client: any = null;

export async function logFunctionError(fn: string, status: number | null, e: unknown) {
  const message = (e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e)) || "error";
  console.error(fn, status ?? "", message);
  try {
    client ??= createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    await client.from("function_errors").insert({ function: fn, status, message: message.slice(0, 1000) });
  } catch {
    /* the console line above is the fallback */
  }
}
