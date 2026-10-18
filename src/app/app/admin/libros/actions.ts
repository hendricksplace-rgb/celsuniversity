"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["published", "review"] as const;

/**
 * Publish a book or send it back to review. RLS decides: only admins (ebooks.admin_all)
 * can update, so for anyone else the update matches no rows and we report it.
 */
export async function setEbookStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(STATUSES as readonly string[]).includes(status)) redirect("/app/admin/libros?error=1");

  const supabase = await createClient();
  const { data, error } = await supabase.from("ebooks").update({ status }).eq("id", id).select("id");
  revalidatePath("/app/admin/libros");
  if (error || !data?.length) redirect("/app/admin/libros?error=forbidden");
  redirect(`/app/admin/libros?ok=${encodeURIComponent(id)}`);
}
