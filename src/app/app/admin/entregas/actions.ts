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
