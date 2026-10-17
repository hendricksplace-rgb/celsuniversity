import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

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
            <li key={c.id} className="card" style={{ borderTop: `4px solid ${c.accent_color ?? "#F5178C"}` }}>
              <h2 className="text-lg font-bold">{c.title}</h2>
              {c.description && <p className="mt-1 line-clamp-3 text-sm text-white/70">{c.description}</p>}
              <p className="mt-3 text-xs text-white/50">
                {c.modules?.[0]?.count ?? 0} {t.courses.modules}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
