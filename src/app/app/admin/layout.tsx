import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";

/** The admin area opens for super_admin and administrator. Teachers keep the book review page. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer(await createClient());
  if (!viewer || !(isAdminRole(viewer.role) || viewer.role === "teacher")) notFound();
  return children;
}
