import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, one } from "@/lib/access";
import { setEbookStatus } from "./actions";

type Props = { searchParams: Promise<{ status?: string; error?: string; ok?: string }> };

const ADMIN_ROLES = ["super_admin", "director", "administrator"];

type Screen = { narration?: { audio?: string | null } | null };

export default async function BookReviewPage({ searchParams }: Props) {
  const { status: filter, error, ok } = await searchParams;
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/admin/libros");
  if (!viewer.isStaff) {
    return <p className="card">{t.admin.staffOnly}</p>;
  }
  const isAdmin = ADMIN_ROLES.includes(viewer.role);

  // Staff can read every book (ebooks_read policy), whatever its status.
  let query = supabase
    .from("ebooks")
    .select("id, slug, title, subtitle, program, status, review_notes, screens, quiz, updated_at, course:courses(title)")
    .order("status")
    .order("title");
  if (filter && ["draft", "review", "published"].includes(filter)) query = query.eq("status", filter);
  const { data: books } = await query;

  const label = (s: string) => (s === "published" ? t.admin.published : s === "review" ? t.admin.review : t.admin.draft);
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold">{t.admin.booksTitle}</h1>
        <p className="text-white/70">{t.admin.booksSub}</p>
        {!isAdmin && <p className="text-sm text-amber-300">⚠️ {t.admin.adminOnly}</p>}
        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{t.admin.notAllowed}</p>}
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        {[undefined, "review", "published", "draft"].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/app/admin/libros?status=${s}` : "/app/admin/libros"}
            className={filter === s ? "btn-primary !py-1" : "btn-ghost !py-1"}
          >
            {s ? label(s) : t.admin.filterAll}
          </Link>
        ))}
      </nav>

      <ul className="space-y-4">
        {(books ?? []).map((b) => {
          const screens = (b.screens ?? []) as Screen[];
          const narrated = screens.filter((s) => s.narration?.audio).length;
          const course = one(b.course);
          return (
            <li key={b.id} data-theme={b.program} className={`t-card t-card-accent ${ok === b.id ? "ring-2 ring-green-500" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="t-heading text-lg">{b.title}</h2>
                  <p className="t-muted text-sm">
                    {course?.title} · {screens.length} {t.admin.screens} · {(b.quiz ?? []).length} {t.admin.quiz} ·{" "}
                    {narrated}/{screens.length} {t.admin.narrated}
                  </p>
                  <p className="t-muted text-xs">
                    {t.admin.updated}: {fmt.format(new Date(b.updated_at))}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    b.status === "published" ? "bg-green-700 text-white" : b.status === "review" ? "bg-amber-500 text-black" : "bg-gray-500 text-white"
                  }`}
                >
                  {label(b.status)}
                </span>
              </div>

              {b.review_notes &&
                (b.review_notes.length > 240 ? (
                  // Long notes collapse so the list stays scannable.
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer">
                      <strong>{t.admin.notes}:</strong> <span className="t-muted">{b.review_notes.slice(0, 200)}…</span>
                    </summary>
                    <p className="t-muted mt-2 whitespace-pre-line">{b.review_notes}</p>
                  </details>
                ) : (
                  <p className="mt-3 text-sm">
                    <strong>{t.admin.notes}:</strong> <span className="t-muted">{b.review_notes}</span>
                  </p>
                ))}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/app/libros/${b.slug}`} target="_blank" className="t-btn-ghost">
                  👁 {t.admin.preview}
                </Link>
                {isAdmin && (
                  <form action={setEbookStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value={b.status === "published" ? "review" : "published"} />
                    {b.status === "published" ? (
                      <button className="t-btn-ghost">↩ {t.admin.sendBack}</button>
                    ) : (
                      <button className="t-btn">✓ {t.admin.publish}</button>
                    )}
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
