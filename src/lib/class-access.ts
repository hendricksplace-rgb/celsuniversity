// Who may see a class's students and their progress (C-048 teachers, C-049 directors). RLS enforces the same
// rule (private.teaches_user / private.directs_user); this only decides what the page offers.
import { isAdminRole } from "@/lib/access";

type Viewer = { user: { id: string }; role: string; organizationId: string | null };
type ClassLike = { organization_id?: string | null; class_members?: { user_id: string; member_role: string }[] | null };

export const teachesClass = (viewer: Viewer, cl: ClassLike) =>
  (cl.class_members ?? []).some((m) => m.user_id === viewer.user.id && m.member_role === "teacher");

/** The director of the school (organization) this class belongs to. */
export const directsClass = (viewer: Viewer, cl: ClassLike) =>
  viewer.role === "director" && !!viewer.organizationId && viewer.organizationId === cl.organization_id;

export const canSeeClassStudents = (viewer: Viewer, cl: ClassLike) => isAdminRole(viewer.role) || teachesClass(viewer, cl) || directsClass(viewer, cl);
