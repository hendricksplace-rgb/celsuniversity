"use server";

import { createClient } from "@/lib/supabase/server";

export type LocalCivics = { civics_senator?: string | null; civics_representative?: string | null };

/**
 * CelsUS CelsBook "Mis respuestas locales": the student's own senator / representative, saved on their profile
 * with their own session (RLS: a student may update only their own row). Empty → null; at most 120 characters.
 */
export async function saveLocalCivics(input: LocalCivics): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const clean = (v: unknown) => {
    if (typeof v !== "string") return null;
    const s = v.replace(/\s+/g, " ").trim().slice(0, 120);
    return s || null;
  };
  const row: LocalCivics = {};
  if ("civics_senator" in input) row.civics_senator = clean(input.civics_senator);
  if ("civics_representative" in input) row.civics_representative = clean(input.civics_representative);
  if (!Object.keys(row).length) return { ok: true };
  const { data, error } = await supabase.from("profiles").update(row).eq("id", user.id).select("id");
  return { ok: !error && !!data?.length };
}
