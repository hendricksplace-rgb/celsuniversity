import "server-only";
import type { Client } from "@/lib/supabase/types";

/**
 * School staff: every course and every student. A teacher is NOT staff (C-048): they see their own classes'
 * students and courses through class membership, which the database enforces (private.teaches_user/course).
 */
export const STAFF_ROLES = ["super_admin", "director", "administrator"] as const;
/** Who may open /admin. Only super_admin changes roles (enforced again by public.guard_profile_update). */
export const ADMIN_ROLES = ["super_admin", "administrator"] as const;
export const isAdminRole = (role: string) => (ADMIN_ROLES as readonly string[]).includes(role);
/** Who sees the CelsUS teacher guides: teachers and the admin roles (other school staff roles come later). */
export const TEACHER_GUIDE_ROLES = ["teacher", "super_admin", "director", "administrator"] as const;
export const canSeeTeacherGuides = (role: string) => (TEACHER_GUIDE_ROLES as readonly string[]).includes(role);

/** Embedded relations come back as an object at runtime but are typed as arrays without generated DB types. */
export const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export async function getViewer(supabase: Client) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile?.role as string | undefined) ?? "individual_student";
  const isStaff = (STAFF_ROLES as readonly string[]).includes(role);
  // teacherView: show teacher-only content (Teachersbook, guides) when the database returns it. For a teacher
  // RLS only returns it for the courses of the classes they teach.
  return { user, role, displayName: profile?.display_name ?? null, isStaff, teacherView: isStaff || role === "teacher" };
}

/**
 * Mirrors private.has_course_access() using only rows the user may read under RLS:
 * staff, an active enrollment in the course or one of its programs, or an active class that has it.
 * Storage RLS runs the same check again when the URL is signed.
 */
export async function canAccessCourse(
  supabase: Client,
  viewer: { user: { id: string }; isStaff: boolean } | null,
  courseId: string,
) {
  if (!viewer) return false;
  if (viewer.isStaff) return true;

  const { data: links } = await supabase.from("program_courses").select("program_id").eq("course_id", courseId);
  const programIds = (links ?? []).map((l) => l.program_id as string);
  const scope = [`course_id.eq.${courseId}`, ...(programIds.length ? [`program_id.in.(${programIds.join(",")})`] : [])];

  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewer.user.id)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .or(scope.join(","));
  if (count) return true;

  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id, classes!inner(status)")
    .eq("user_id", viewer.user.id)
    .eq("classes.status", "active");
  const classIds = (memberships ?? []).map((m) => m.class_id as string);
  if (!classIds.length) return false;
  const { count: viaClass } = await supabase
    .from("class_courses")
    .select("class_id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .in("class_id", classIds);
  return Boolean(viaClass);
}
