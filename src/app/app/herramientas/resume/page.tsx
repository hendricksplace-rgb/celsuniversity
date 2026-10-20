import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/access";
import { appPlansHref } from "@/lib/enroll";
import type { ResumeReview } from "@/lib/ai-tools";
import { AiHeader, OptimizedResumeView, ResumeForm, ResumeHistory, ResumeResultView, ResumeWaiting, aiShell } from "@/components/ai/ResumeTool";

export const metadata = { title: "Revisión de resume · CelsU" };
type Props = { searchParams: Promise<{ id?: string; vista?: string; nuevo?: string }> };

/** Resume Review (celsu-ai-tools-spec.md §1): the form, the 48-hour wait, the result and the optimized resume. */
export default async function ResumePage({ searchParams }: Props) {
  const { id, vista, nuevo } = await searchParams;
  const { t, lang } = await getDictionary();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect("/entrar?next=/app/herramientas/resume");
  const back = "/app/programas/celsglobal";

  const { data: allowed } = await supabase.rpc("can_use_ai_tools");
  if (!allowed)
    return (
      <div className={aiShell}>
        <AiHeader t={t.ai} icon="resume" title={t.ai.resumeTitle} backHref={back} />
        <p className="mt-6 rounded-2xl bg-white p-5 shadow-[0_0_0_1px_#E3DDD0]">{t.ai.noAccess}</p>
        <Link
          href={appPlansHref("celsglobal")}
          className="kit-focus mt-4 block rounded-xl py-3.5 text-center font-extrabold"
          style={{ background: "linear-gradient(180deg, #EBD08C 0%, #C7A24E 100%)" }}
        >
          {t.ai.seePlans}
        </Link>
      </div>
    );

  const { data } = await supabase.rpc("my_resume_reviews");
  const reviews = (data ?? []) as unknown as ResumeReview[];
  const now = Date.now();
  const active = reviews.find((r) => r.status === "ready" && new Date(r.unlock_at).getTime() > now);
  // What to show: the review asked for; else the one on hold; else the latest (unless a new one is wanted).
  const chosen = (id && reviews.find((r) => r.id === id)) || active || (nuevo ? undefined : reviews.find((r) => r.status === "ready"));
  const latestInvalid = reviews[0]?.status === "invalid" && (!id || id === reviews[0].id);
  const locked = chosen && chosen.status === "ready" && new Date(chosen.unlock_at).getTime() > now;

  let body: React.ReactNode;
  let header = { kicker: t.ai.kicker, title: t.ai.resumeTitle };
  if (chosen && chosen.status === "ready" && !locked && chosen.result?.valid) {
    if (vista === "optimizado" && chosen.result.optimized_resume) {
      header = { kicker: t.ai.optimizedKicker, title: t.ai.optimizedTitle };
      body = <OptimizedResumeView t={t.ai} review={chosen} />;
    } else {
      header = { kicker: t.ai.resultKicker, title: t.ai.resultTitle };
      body = (
        <>
          <ResumeResultView t={t.ai} review={chosen} />
          {!active && (
            <Link href="/app/herramientas/resume?nuevo=1" className="kit-focus mt-4 block rounded-xl bg-white py-3.5 text-center font-extrabold shadow-[0_0_0_1px_#E3DDD0]">
              {t.ai.newReview}
            </Link>
          )}
        </>
      );
    }
  } else if (chosen && locked) {
    body = <ResumeWaiting t={t.ai} review={chosen} email={viewer.user.email ?? ""} locale={locale} />;
  } else {
    body = <ResumeForm t={t.ai} userId={viewer.user.id} invalid={latestInvalid} />;
  }

  return (
    <div className={aiShell}>
      <AiHeader t={t.ai} icon="resume" kicker={header.kicker} title={header.title} backHref={vista ? `/app/herramientas/resume?id=${chosen?.id ?? ""}` : back} />
      {body}
      {!vista && <ResumeHistory t={t.ai} reviews={reviews} current={chosen?.id ?? null} locale={locale} />}
    </div>
  );
}
