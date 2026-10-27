import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLangChoice } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getViewer } from "@/lib/access";
import { episodePath } from "@/lib/course-page";
import { examLessons, loadCardState, loadExam, signExamAudio } from "@/lib/civics-server";
import { EXAM_6520_ID, twentyDeck } from "@/lib/celsus-cards";
import { Tarjetas } from "@/components/celsus/Tarjetas";
import { refreshExamAudio } from "@/app/app/examen-civico/actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ ep?: string }> };

/**
 * "Practicar mis 20 preguntas" (track C, 65/20): one deck of all 20 starred 2025 questions, from the
 * "Examen 65/20 (2025)" evaluation, so every question has its Spanish audio (only 14 of them have a card).
 * Results are shared with the civics exam's study cards (known / review question numbers).
 */
export default async function TwentyQuestions({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ep } = await searchParams;
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(`/entrar?next=/app/cursos/${slug}/mis-20-preguntas`);

  const loaded = await loadExam(supabase, viewer, EXAM_6520_ID);
  if (!loaded) notFound();
  const lessons = await examLessons(supabase);
  const [signed, cardState] = await Promise.all([signExamAudio(supabase, viewer, loaded.exam, loaded.courseId), loadCardState(supabase, viewer.user.id, lessons)]);

  const n = Number(ep);
  const courseSlug = loaded.course.slug ?? slug;
  const backEpisode = Number.isInteger(n) && n > 0 ? n : undefined;

  return (
    <Tarjetas
      texts={{ es: dictionaries.es.usCards, en: dictionaries.en.usCards }}
      langChoice={await getLangChoice()}
      backTexts={{ es: dictionaries.es.usBack, en: dictionaries.en.usBack }}
      course={{ href: `/app/cursos/${courseSlug}`, name: loaded.course.title }}
      userId={viewer.user.id}
      track="C"
      backHref={backEpisode ? episodePath(courseSlug, backEpisode) : `/app/cursos/${courseSlug}`}
      backEpisode={backEpisode}
      signed={signed}
      refreshAudio={refreshExamAudio.bind(null, EXAM_6520_ID)}
      mode={{ kind: "twenty", deck: twentyDeck(loaded.exam.questions), examLessons: lessons, cardState }}
    />
  );
}

export async function generateMetadata() {
  const { t } = await getDictionary();
  return { title: `${t.usCards.twentyTitle} · CelsU` };
}
