import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { examLessons, loadCardState, loadExam, signExamAudio } from "@/lib/civics-server";
import { themeForCourse } from "@/lib/themes";
import { CivicsApp } from "@/components/civics/CivicsApp";

type Props = { params: Promise<{ id: string }> };

export default async function CivicsExamPage({ params }: Props) {
  const { id } = await params;
  const { t } = await getDictionary();
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/examen-civico/${id}`);

  const loaded = await loadExam(supabase, viewer, id);
  if (!loaded) {
    return (
      <div data-theme="celsus" className="t-panel space-y-4">
        <p className="t-card">{t.civics.noAccess}</p>
        <Link href="/app/examen-civico" className="t-btn-ghost">
          ← {t.civics.back}
        </Link>
      </div>
    );
  }
  const { exam, course, courseId } = loaded;
  const lessons = await examLessons(supabase);
  const [urls, cards] = await Promise.all([
    signExamAudio(supabase, viewer, exam, courseId),
    loadCardState(supabase, viewer.user.id, lessons),
  ]);
  const heading = exam.kind === "interview" ? t.civics.kindInterview : exam.kind === "6520" ? t.civics.kind6520 : t.civics.kindSpanish;

  return (
    <div data-theme={themeForCourse(course)} className="t-panel space-y-6">
      <header className="cx-navy -mx-5 -mt-5 space-y-2 rounded-t-[calc(var(--t-radius)*1.5)] px-5 py-7 sm:-mx-8 sm:-mt-8 sm:px-8">
        <Link href="/app/examen-civico" className="text-sm text-white/75 hover:underline">
          ← {t.civics.title}
        </Link>
        <h1 className="cx-serif text-3xl font-semibold sm:text-4xl">{heading}</h1>
        <p className="text-sm text-white/70">{exam.title}</p>
      </header>
      <CivicsApp exam={exam} urls={urls} userId={viewer.user.id} lessonIds={lessons} cards={cards} t={t.civics} />
    </div>
  );
}
