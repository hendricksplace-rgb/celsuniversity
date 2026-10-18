import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer, one } from "@/lib/access";
import { collectStorageRefs, signStorageRefs } from "@/lib/storage";
import type { Ebook } from "@/lib/ebook-format";
import { EbookReader } from "@/components/reader/EbookReader";

type Props = { params: Promise<{ slug: string }> };

export default async function EbookPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/libros/${slug}`);

  // RLS: students see published books in courses they can access; staff also see drafts and books in review.
  const { data: ebook } = await supabase
    .from("ebooks")
    .select(
      "id, course_id, slug, title, subtitle, program, pdf_path, cover_path, est_minutes, screens, quiz, resources, review_notes, status, course:courses(slug, title)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!ebook) notFound();
  const course = one(ebook.course);

  const resourceSlugs = (ebook.resources ?? []).map((r: { ebook: string }) => r.ebook);
  const [{ data: saved }, { data: related }, signed, { data: host }] = await Promise.all([
    // Owner-only table: this returns the viewer's own row and nothing else.
    supabase
      .from("ebook_answers")
      .select("answers, last_screen, completed_at, updated_at")
      .eq("ebook_id", ebook.id)
      .eq("user_id", viewer.user.id)
      .maybeSingle(),
    resourceSlugs.length
      ? supabase.from("ebooks").select("slug, title").in("slug", resourceSlugs)
      : Promise.resolve({ data: [] as { slug: string; title: string }[] }),
    signStorageRefs(
      supabase,
      collectStorageRefs([ebook.pdf_path, ebook.cover_path, ebook.screens]),
      { courseId: ebook.course_id, viewer },
    ),
    // The module whose lesson shows this book's PDF: offline_downloads tracks the download per module.
    ebook.pdf_path
      ? supabase
          .from("content_blocks")
          .select("lesson:lessons(module_id)")
          .eq("data->>ebook_pdf", ebook.pdf_path)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const moduleId = (one(host?.lesson) as { module_id?: string } | null)?.module_id ?? null;

  return (
    <div data-theme={ebook.program} className="t-panel space-y-6">
      <header className="space-y-2">
        {course && (
          <Link href={`/app/cursos/${course.slug}`} className="t-muted text-sm hover:underline">
            ← {course.title}
          </Link>
        )}
        <h1 className="t-heading text-3xl">{ebook.title}</h1>
        <p className="t-muted">
          {ebook.subtitle}
          {ebook.est_minutes ? ` · ${ebook.est_minutes} ${t.reader.minutes}` : ""}
        </p>
      </header>

      {ebook.status !== "published" && (
        <div className="t-card border-l-4 !border-l-amber-500 text-sm">
          <p className="font-semibold">⚠️ {t.reader.preview}</p>
          {ebook.review_notes && (
            <p className="t-muted mt-1">
              <strong>{t.reader.reviewNotes}:</strong> {ebook.review_notes}
            </p>
          )}
        </div>
      )}

      <EbookReader
        ebook={ebook as unknown as Ebook}
        userId={viewer.user.id}
        initial={saved ?? null}
        moduleId={moduleId}
        signed={Object.fromEntries(signed)}
        resourceTitles={Object.fromEntries((related ?? []).map((r) => [r.slug, r.title]))}
        t={t.reader}
      />
    </div>
  );
}
