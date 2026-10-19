"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * "Mi compromiso" on the CelsBSNS syllabus: the student's signature, inserted with their own client (RLS: their own
 * row only, insert-only). signed_at is set by the database. Signing twice keeps the first signature.
 */
export async function signCommitment(courseId: string, name: string, lang: string): Promise<{ ok: true; signedAt: string; name: string } | { ok: false }> {
  const signed = name.replace(/\s+/g, " ").trim().slice(0, 80);
  if (signed.length < 3 || !courseId) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data, error } = await supabase
    .from("course_commitments")
    .insert({ user_id: user.id, course_id: courseId, signed_name: signed, lang: lang === "en" ? "en" : "es" })
    .select("signed_at, signed_name")
    .single();
  if (!error && data) return { ok: true, signedAt: data.signed_at, name: data.signed_name };
  // Already signed (unique per student and course): show that signature.
  const { data: had } = await supabase
    .from("course_commitments")
    .select("signed_at, signed_name")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();
  return had ? { ok: true, signedAt: had.signed_at, name: had.signed_name } : { ok: false };
}
