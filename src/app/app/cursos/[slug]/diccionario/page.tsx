import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { canAccessCourse, getViewer } from "@/lib/access";
import { themeForCourse } from "@/lib/themes";
import { loadCoursePage } from "@/lib/course-page";
import { currentWeekOf, weekPath } from "@/lib/bsns";
import { DICTIONARY_LESSON_ID, dictionaryPath, parse } from "@/lib/glossary";
import { Dictionary } from "@/components/dictionary/Dictionary";

type Props = { params: Promise<{ slug: string }> };

/** CelsBSNS Course Dictionary (celsu-celsbsns-dictionary-brief.md, celsbsns-dictionary-mockup.html). The entries are
 *  the "Course Dictionary" lesson's text, parsed here on every request: editing the lesson updates the page. */
export default async function DictionaryPage({ params }: Props) {
  const { slug } = await params;
  const { lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=${dictionaryPath(slug)}`);
  if (themeForCourse({ slug }) !== "celsbsns") notFound();
  const page = await loadCoursePage(supabase, viewer.user.id, slug, "celsbsns", viewer.isStaff);
  if (!page) notFound();
  if (!(await canAccessCourse(supabase, viewer, page.course.id))) redirect(`/app/cursos/${slug}`);

  const [{ data: blocks }, { data: saves }] = await Promise.all([
    supabase.from("content_blocks").select("body, data").eq("lesson_id", DICTIONARY_LESSON_ID).eq("block_type", "text").eq("teacher_only", false).order("sort_order").limit(1),
    supabase.from("glossary_saves").select("term").eq("user_id", viewer.user.id).eq("course_id", page.course.id).order("created_at"),
  ]);
  const en = blocks?.[0]?.body ?? "";
  const esRaw = (blocks?.[0]?.data as Record<string, unknown> | null)?.text_es;
  const es = typeof esRaw === "string" ? esRaw : "";
  const parsed = parse(en);
  const parsedEs = es ? parse(es) : null;
  const current = currentWeekOf(page.episodes.map((e) => ({ n: e.n, done: e.parts.map((p) => p.done) })));

  return (
    <Dictionary
      items={parsed.items}
      head={{ en: { title: parsed.title, sub: parsed.sub }, es: { title: parsedEs?.title ?? "", sub: parsedEs?.sub ?? "" } }}
      raw={en}
      savedInit={(saves ?? []).map((r) => r.term)}
      courseId={page.course.id}
      userId={viewer.user.id}
      backHref={weekPath(slug, current)}
      defaultLang={lang === "en" ? "en" : "es"}
    />
  );
}
