import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

export default async function StudentHome() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/app");

  const [{ data: profile }, { data: game }, { data: enrollments }] = await Promise.all([
    supabase.from("profiles").select("display_name, evaluation_level, starting_level").eq("id", user.id).maybeSingle(),
    supabase.from("gamification").select("total_xp, current_streak").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("enrollments")
      .select("id, course:courses(id, slug, title, accent_color), program:programs(id, title, accent_color)")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const level = profile?.evaluation_level ?? profile?.starting_level;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end gap-4">
        <h1 className="text-3xl font-extrabold">
          {t.app.welcome}, {profile?.display_name ?? user.email}
        </h1>
        <dl className="ml-auto flex gap-3 text-sm">
          {level && (
            <div className="card py-2">
              <dt className="text-white/50">{t.app.level}</dt>
              <dd className="font-bold">{level}</dd>
            </div>
          )}
          <div className="card py-2">
            <dt className="text-white/50">{t.app.xp}</dt>
            <dd className="font-bold">{game?.total_xp ?? 0}</dd>
          </div>
          <div className="card py-2">
            <dt className="text-white/50">{t.app.streak}</dt>
            <dd className="font-bold">
              {game?.current_streak ?? 0} {t.app.days}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t.app.enrolled}</h2>
        {!enrollments?.length ? (
          <div className="card space-y-3">
            <p className="text-white/70">{t.app.noEnrollments}</p>
            <Link href="/cursos" className="btn-primary">
              {t.app.browse}
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e) => {
              // Without generated DB types the embed is typed as an array; at runtime it is one row.
              const pick = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
              const item = pick(e.course) ?? pick(e.program);
              if (!item) return null;
              return (
                <li key={e.id} className="card relative" style={{ borderTop: `4px solid ${item.accent_color ?? "#F5178C"}` }}>
                  <h3 className="font-bold">
                    {"slug" in item ? (
                      <Link href={`/app/cursos/${item.slug}`} className="after:absolute after:inset-0">
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </h3>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
