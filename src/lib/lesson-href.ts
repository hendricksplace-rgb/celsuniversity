// C-021: one resolver for every link to a lesson. /app/lecciones/<id> is the generic lesson page; most courses
// now open their lessons somewhere else (a CelsTV part screen, a CelsBSNS task, the CelsUS Tarjetas / CelsBook /
// quiz, a CelsGLOBAL step). The course page already knows each part's current route (Part.href), so this reads it
// from there. A lesson the course page doesn't list keeps the lesson page, which redirects what it can.
import type { createClient } from "@/lib/supabase/server";
import { loadCoursePage } from "@/lib/course-page";
import { themeForCourse } from "@/lib/themes";
import { one } from "@/lib/access";

type Client = Awaited<ReturnType<typeof createClient>>;

export const lessonPagePath = (id: string) => `/app/lecciones/${id}`;

/** lesson id → its current route, for a batch of lessons (one course page load per course involved). */
export async function lessonHrefs(supabase: Client, viewer: { userId: string; isStaff: boolean }, ids: (string | null | undefined)[]) {
  const wanted = [...new Set(ids.filter((x): x is string => !!x))];
  const out = new Map<string, string>(wanted.map((id) => [id, lessonPagePath(id)]));
  if (!wanted.length) return out;
  const { data: rows } = await supabase.from("lessons").select("id, module:modules(course:courses(slug))").in("id", wanted);
  const slugs = new Set((rows ?? []).map((r) => one(one(r.module)?.course)?.slug).filter((s): s is string => !!s));
  await Promise.all(
    [...slugs].map(async (slug) => {
      const page = await loadCoursePage(supabase, viewer.userId, slug, themeForCourse({ slug }), viewer.isStaff);
      if (!page) return;
      for (const p of [...page.episodes.flatMap((e) => [...e.parts, ...e.extra]), ...page.extras.flatMap((x) => x.parts)])
        if (out.has(p.id) && p.href && p.href !== "#") out.set(p.id, p.href);
    }),
  );
  return out;
}

export async function lessonHref(supabase: Client, viewer: { userId: string; isStaff: boolean }, id: string) {
  return (await lessonHrefs(supabase, viewer, [id])).get(id) ?? lessonPagePath(id);
}
