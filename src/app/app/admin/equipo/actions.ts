"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/access";

const ROLES = ["super_admin", "administrator", "director", "teacher", "student", "individual_student"] as const;
type Role = (typeof ROLES)[number];

/** Only a super_admin changes roles; public.guard_profile_update refuses everyone else too. */
export async function setRole(userId: string, form: FormData) {
  const role = String(form.get("role") ?? "") as Role;
  if (!ROLES.includes(role) || !/^[0-9a-f-]{36}$/i.test(userId)) return;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (viewer?.role !== "super_admin" || viewer.user.id === userId) return; // nobody demotes themselves by accident
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/app/admin/equipo");
}
