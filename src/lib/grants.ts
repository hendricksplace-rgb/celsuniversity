// What a product gives (public.products.grants: [{ course | program: slug, months }]) and what a student
// already has. Used by the purchase summary ("Ya tienes acceso") and by staff's "Dar acceso".
import "server-only";
import type { Client } from "@/lib/supabase/types";

export type Grant = { course?: string; program?: string; months: number };
export type AccessTarget = { kind: "course" | "program"; id: string; slug: string; title: string; months: number };

/** Programs and published courses staff can grant, each with its default access length (the longest grant any product gives; 12 months otherwise). */
export async function accessTargets(supabase: Client): Promise<AccessTarget[]> {
  const [{ data: programs }, { data: courses }, { data: products }] = await Promise.all([
    supabase.from("programs").select("id, slug, title").eq("status", "published").order("title"),
    supabase.from("courses").select("id, slug, title").eq("status", "published").order("sort_order"),
    supabase.from("products").select("grants").eq("active", true),
  ]);
  const grants = (products ?? []).flatMap((p) => (Array.isArray(p.grants) ? (p.grants as Grant[]) : []));
  const months = (key: "course" | "program", slug: string) => Math.max(0, ...grants.filter((g) => g[key] === slug).map((g) => g.months)) || 12;
  return [
    ...(programs ?? []).filter((p) => p.slug).map((p) => ({ kind: "program" as const, id: p.id, slug: p.slug!, title: p.title, months: months("program", p.slug!) })),
    ...(courses ?? []).filter((c) => c.slug).map((c) => ({ kind: "course" as const, id: c.id, slug: c.slug!, title: c.title, months: months("course", c.slug!) })),
  ];
}

/** The grants of `grants` the user doesn't have yet (an active, unexpired enrollment; a program covers its courses). */
export async function missingGrants(supabase: Client, userId: string, grants: Grant[]): Promise<Grant[]> {
  const now = new Date().toISOString();
  const { data: enr } = await supabase
    .from("enrollments")
    .select("course_id, program_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${now}`);
  const courseIds = new Set((enr ?? []).map((e) => e.course_id).filter(Boolean));
  const programIds = new Set((enr ?? []).map((e) => e.program_id).filter(Boolean));
  const slugs = grants.map((g) => g.course ?? g.program!);
  const [{ data: courses }, { data: programs }, { data: pcs }] = await Promise.all([
    supabase.from("courses").select("id, slug").in("slug", slugs),
    supabase.from("programs").select("id, slug").in("slug", slugs),
    programIds.size ? supabase.from("program_courses").select("program_id, course_id").in("program_id", [...programIds] as string[]) : Promise.resolve({ data: [] }),
  ]);
  const viaProgram = new Set((pcs ?? []).map((pc) => pc.course_id));
  const courseId = new Map((courses ?? []).map((c) => [c.slug, c.id]));
  const programId = new Map((programs ?? []).map((p) => [p.slug, p.id]));
  return grants.filter((g) => {
    if (g.course) {
      const id = courseId.get(g.course);
      return !id || !(courseIds.has(id) || viaProgram.has(id));
    }
    const id = programId.get(g.program!);
    return !id || !programIds.has(id);
  });
}
