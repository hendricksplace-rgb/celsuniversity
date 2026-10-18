import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole, one } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { LessonEditor } from "@/components/builder/LessonEditor";
import { PreviewBlocks } from "@/components/builder/PreviewBlocks";
import type { BuilderBlock } from "@/lib/builder";

export const metadata = { title: "Editar lección · Admin · CelsU" };

type Props = { params: Promise<{ id: string; lessonId: string }> };

const ACTION: Record<string, string> = { insert: "agregó", update: "editó", delete: "eliminó", reorder: "reordenó", duplicate: "duplicó", undo: "deshizo un cambio en" };
const TABLE: Record<string, string> = { content_blocks: "un bloque", lessons: "la lección", modules: "el módulo", courses: "el curso" };

export default async function LessonEditorPage({ params }: Props) {
  const { id, lessonId } = await params;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !(isAdminRole(viewer.role) || viewer.role === "director")) notFound();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, status, teacher_only, module:modules(id, title, course:courses(id, title, slug))")
    .eq("id", lessonId)
    .maybeSingle();
  const lessonModule = one(lesson?.module);
  const course = one(lessonModule?.course);
  if (!lesson || !lessonModule || !course || course.id !== id) notFound();

  const [{ data: blocks }, { data: ebooks }, { data: history }] = await Promise.all([
    supabase.from("content_blocks").select("id, block_type, title, body, data, teacher_only, sort_order").eq("lesson_id", lessonId).order("sort_order"),
    supabase.from("ebooks").select("slug, title").order("title"),
    supabase.from("admin_audit_log").select("id, at, actor, action, table_name, undone_at").eq("lesson_id", lessonId).order("id", { ascending: false }).limit(12),
  ]);
  const actorIds = [...new Set((history ?? []).map((h) => h.actor).filter((a): a is string => !!a))];
  const { data: people } = actorIds.length ? await supabase.from("profiles").select("id, display_name").in("id", actorIds) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id, p.display_name ?? "Alguien"]));
  const list = (blocks ?? []) as BuilderBlock[];

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
        /
        <Link href={`/app/admin/cursos/${course.id}`} className="hover:underline">
          {course.title}
        </Link>
        / <span className="text-[#1B1830]">{lessonModule.title}</span>
      </nav>

      <LessonEditor
        courseId={course.id}
        lesson={lesson}
        blocks={list}
        ebooks={ebooks ?? []}
        initialPreview={<PreviewBlocks supabase={supabase} viewer={viewer} courseId={course.id} theme={themeForCourse(course)} blocks={list} />}
      />

      <section className="rounded-2xl border border-[#EFE6F2] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#5E5A73]">Historial de esta lección</h2>
        {(history ?? []).length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-[#6B6680]">Todavía no hay cambios registrados.</p>
        ) : (
          <ol className="mt-2 space-y-1 text-sm">
            {(history ?? []).map((h) => (
              <li key={h.id} className={h.undone_at ? "text-[#8A86A0] line-through" : "text-[#1B1830]"}>
                <time dateTime={h.at} className="font-semibold text-[#6B6680]">
                  {new Date(h.at).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" })}
                </time>{" "}
                · <strong>{name.get(h.actor ?? "") ?? "Alguien"}</strong> {ACTION[h.action] ?? h.action} {TABLE[h.table_name] ?? h.table_name}
                {h.undone_at ? " (deshecho)" : ""}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
