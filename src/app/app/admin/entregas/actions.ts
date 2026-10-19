"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** The coach's comment: marks the submission reviewed (RLS + guard_submission: staff only). */
export async function reviewSubmission(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!id || !comment) redirect(`/app/admin/entregas?id=${encodeURIComponent(id)}&error=1`);
  const supabase = await createClient();
  const { data, error } = await supabase.from("submissions").update({ coach_feedback: comment, status: "reviewed" }).eq("id", id).select("id");
  revalidatePath("/app/admin/entregas");
  if (error || !data?.length) redirect(`/app/admin/entregas?id=${encodeURIComponent(id)}&error=1`);
  redirect(`/app/admin/entregas?ok=${encodeURIComponent(id)}`);
}

/** CelsBSNS Interactive Writing Task: the coach's three fields. coach_feedback keeps a plain-text copy for the
 *  screens that still read it (the week's "Feedback and Progress"). Staff only (RLS + guard_submission). */
export async function reviewWriting(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const field = (k: string) => String(formData.get(k) ?? "").trim().slice(0, 5000);
  const good = field("good");
  const improve = field("improve");
  const message = field("message");
  if (!id || !good || !improve) redirect(`/app/admin/entregas?id=${encodeURIComponent(id)}&error=1`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const coach_feedback = [`Lo que hiciste bien: ${good}`, `Para mejorar: ${improve}`, message].filter(Boolean).join("\n\n");
  const { data, error } = await supabase
    .from("submissions")
    .update({ coach_good: good, coach_improve: improve, coach_message: message || null, coach_feedback, status: "reviewed", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "submitted")
    .select("id");
  revalidatePath("/app/admin/entregas");
  if (error || !data?.length) redirect(`/app/admin/entregas?id=${encodeURIComponent(id)}&error=1`);
  redirect(`/app/admin/entregas?ok=${encodeURIComponent(id)}`);
}
