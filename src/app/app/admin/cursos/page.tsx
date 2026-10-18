import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole, one } from "@/lib/access";
import { STATUS_LABEL } from "@/lib/builder";
import { NewCourse } from "@/components/builder/NewCourse";

export const metadata = { title: "Cursos · Admin · CelsU" };

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6006A]";

export default async function CourseListPage() {
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer || !(isAdminRole(viewer.role) || viewer.role === "director")) notFound();

  // Staff read every course, module, lesson and block (catalog_read / content_read policies).
  const [{ data: courses }, { data: modules }, { data: lessons }, { data: blocks }] = await Promise.all([
    supabase.from("courses").select("id, title, slug, status, sort_order, program_courses(program:programs(title))").order("sort_order"),
    supabase.from("modules").select("id, course_id"),
    supabase.from("lessons").select("id, module_id"),
    supabase.from("content_blocks").select("lesson_id"),
  ]);
  const courseOfModule = new Map((modules ?? []).map((m) => [m.id, m.course_id]));
  const courseOfLesson = new Map((lessons ?? []).map((l) => [l.id, courseOfModule.get(l.module_id)]));
  const count = (rows: (string | undefined)[]) => rows.reduce((m, c) => (c ? m.set(c, (m.get(c) ?? 0) + 1) : m), new Map<string, number>());
  const nModules = count((modules ?? []).map((m) => m.course_id));
  const nLessons = count([...courseOfLesson.values()]);
  const nBlocks = count((blocks ?? []).map((b) => courseOfLesson.get(b.lesson_id)));

  return (
    <div className="space-y-5">
      <nav className="text-sm font-semibold text-[#6B6680]">
        <Link href="/app/admin" className={`hover:underline ${focus}`}>
          Admin
        </Link>{" "}
        / Cursos
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Cursos</h1>
          <p className="mt-1 text-sm font-semibold text-[#6B6680]">Módulos, lecciones y bloques. Arrastra para ordenar; cada cambio queda en el historial.</p>
        </div>
        <NewCourse />
      </div>
      <ul className="grid gap-3">
        {(courses ?? []).map((c) => {
          const programs = (c.program_courses ?? []).map((pc) => one(pc.program)?.title).filter(Boolean);
          return (
            <li key={c.id}>
              <Link
                href={`/app/admin/cursos/${c.id}`}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#EFE6F2] bg-white p-4 shadow-sm transition hover:border-[#D6006A] ${focus}`}
              >
                <span className="min-w-0 flex-1">
                  <strong className="block text-lg font-extrabold leading-snug">{c.title}</strong>
                  <span className="block text-sm font-semibold text-[#6B6680]">{programs.length ? programs.join(" · ") : "Sin programa"}</span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${c.status === "published" ? "bg-[#E3F6E8] text-[#15803D]" : "bg-[#F1EDF5] text-[#5E5A73]"}`}
                >
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                <span className="text-sm font-bold text-[#4A4766]">
                  {nModules.get(c.id) ?? 0} módulos · {nLessons.get(c.id) ?? 0} lecciones · {nBlocks.get(c.id) ?? 0} bloques
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
