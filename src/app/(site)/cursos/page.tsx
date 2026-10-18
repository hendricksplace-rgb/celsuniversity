import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { THEMES, themeForCourse } from "@/lib/themes";

export default async function CoursesPage() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  // RLS: anonymous visitors only see published courses and modules.
  const { data: courses } = await supabase
    .from("courses")
    .select("id, slug, title, description, accent_color, cover_art_url, modules(count)")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold">{t.courses.title}</h1>
        <p className="text-white/70">{t.courses.sub}</p>
      </header>
      {!courses?.length ? (
        <p className="card text-white/70">{t.courses.empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <li key={c.id} data-theme={themeForCourse(c)} className="t-card t-card-accent relative transition hover:-translate-y-0.5">
              <p className="t-muted text-xs font-semibold uppercase tracking-wide">{THEMES[themeForCourse(c)].label}</p>
              <h2 className="t-heading mt-1 text-lg">
                <Link href={`/app/cursos/${c.slug}`} className="after:absolute after:inset-0">
                  {c.title}
                </Link>
              </h2>
              {c.description && <p className="t-muted mt-1 line-clamp-3 text-sm">{c.description}</p>}
              <p className="t-muted mt-3 text-xs">
                {c.modules?.[0]?.count ?? 0} {t.courses.modules}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
