"use client";

import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Calls the `evaluation` edge function. A signed-in student's session goes along, so the
 * function can save the result to their profile; otherwise the publishable key is enough.
 */
export async function callEvaluation<T = Record<string, unknown>>(body: Record<string, unknown> | FormData) {
  const { url, key } = supabaseEnv();
  const { data } = await createClient().auth.getSession();
  const isForm = body instanceof FormData;
  const res = await fetch(`${url}/functions/v1/evaluation`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${data.session?.access_token ?? key}`,
      ...(isForm ? {} : { "Content-Type": "application/json" }),
    },
    body: isForm ? body : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, data: json };
}
