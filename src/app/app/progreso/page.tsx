import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { loadProgress } from "@/lib/progress-page";
import { Progreso } from "@/components/progreso/Progreso";
import { FreshOnReturn } from "@/components/progreso/FreshOnReturn";
import Link from "next/link";
import "@/components/leaderboard/tabla.css";

// Always the latest numbers (never a cached render).
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getDictionary();
  return { title: `${t.progreso.title} · CelsU` };
}

export default async function ProgresoPage() {
  const { t, lang } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const d = await loadProgress(supabase, user!.id); // the /app shell already sent signed-out visitors to /entrar
  return (
    <>
      <FreshOnReturn renderedAt={Date.now()} />
      <Progreso t={t.progreso} tpc={t.pc} d={d} lang={lang} />
      {/* C-026: the leaderboard lives under Progreso. */}
      <Link href="/app/progreso/tabla" className="lb-card mx-auto mt-8 max-w-xl">
        <span className="tro" aria-hidden>
          🏆
        </span>
        <span className="min-w-0 flex-1">
          <b>{t.lb.title}</b>
          <small>{t.lb.card.open}</small>
        </span>
        <span aria-hidden className="text-2xl">
          ›
        </span>
      </Link>
    </>
  );
}
