import "server-only";
import { cookies } from "next/headers";
import type { createClient } from "@/lib/supabase/server";
import { LANG_COOKIE, isLang } from "./dictionaries";

/**
 * After signing in: the language saved on the profile (profiles.preferred_language) comes back on a new device.
 * A device that already has a choice keeps it, unless the profile says English (C-002: English students
 * must not land in Spanish).
 */
export async function restoreLang(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("preferred_language").eq("id", userId).maybeSingle();
  const saved = data?.preferred_language;
  if (!isLang(saved)) return;
  const jar = await cookies();
  const current = jar.get(LANG_COOKIE)?.value;
  if (current === saved || (isLang(current) && saved !== "en")) return;
  jar.set(LANG_COOKIE, saved, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
