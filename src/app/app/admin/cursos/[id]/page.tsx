import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/access";
import { CourseTree, type TreeModule } from "@/components/builder/CourseTree";

export const metadata = { title: "Editar curso · Admin · CelsU" };

type Props = { params: Promise<{ id: string }> };

export default async function CourseEditorPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !(isAdminRole(viewer.role) || viewer.role === "director")) notFound();

  const { data: course } = await supabase.from("courses").select("id, title, status, slug").eq("id", id).maybeSingle();
  if (!course) notFound();
  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, status, kind, sort_order, lessons(id, title, status, teacher_only, lesson_type, sort_order, content_blocks(count))")
    .eq("course_id", id)
    .order("sort_order");

  const tree: TreeModule[] = (modules ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    kind: m.kind,
    lessons: [...(m.lessons ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        teacher_only: l.teacher_only,
        lesson_type: l.lesson_type,
        blocks: (l.content_blocks as unknown as { count: number }[])?.[0]?.count ?? 0,
      })),
  }));

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-x-1 text-sm font-semibold text-[#6B6680]">
        <Link href="/app/admin" className="hover:underline">
          Admin
        </Link>
        /
        <Link href="/app/admin/cursos" className="hover:underline">
          Cursos
        </Link>
        {course.slug && course.status === "published" && (
          <Link href={`/app/cursos/${course.slug}`} className="ml-auto font-bold text-[#D6006A] hover:underline">
            Ver como estudiante →
          </Link>
        )}
      </nav>
      <CourseTree course={course} modules={tree} />
    </div>
  );
}
