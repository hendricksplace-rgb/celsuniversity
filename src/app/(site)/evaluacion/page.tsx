import { unstable_cache } from "next/cache";
import { getDictionary } from "@/lib/i18n/server";
import { enrollCopy } from "@/lib/i18n/enroll-copy";
import { isEnrollProgram } from "@/lib/enroll";
import { publicClient } from "@/lib/supabase/public";
import { Evaluation } from "@/components/eval/Evaluation";
import type { OfferProducts } from "@/components/eval/Results";

// Title and description: celsu-website-copy.md §2.
export const metadata = {
  title: "Evaluación de inglés gratis · CelsU",
  description: "Descubre tu nivel de inglés (A1 a C2) en unos 15 minutos, con resultados por habilidad y un plan recomendado. Gratis.",
  alternates: { canonical: "/evaluacion" },
  openGraph: { title: "Evaluación de inglés gratis · CelsU", description: "Descubre tu nivel de inglés (A1 a C2) en unos 15 minutos, con resultados por habilidad y un plan recomendado. Gratis.", locale: "es_MX", type: "website" },
};

/** Names and prices for the result's offer: always from public.products (cached for an hour). */
const offerProducts = unstable_cache(
  async (): Promise<OfferProducts> => {
    const { data } = await publicClient().from("products").select("code, name, price_usd_cents, installments").eq("active", true);
    return Object.fromEntries(
      (data ?? []).map((p) => [p.code, { name: p.name, cents: p.price_usd_cents, installments: Array.isArray(p.installments) ? (p.installments as number[]) : null }]),
    );
  },
  ["eval-offer-products"],
  { revalidate: 3600, tags: ["products"] },
);

type Props = { searchParams: Promise<{ programa?: string }> };

/**
 * Public: no account needed. A signed-in student's result is saved to their profile.
 * ?programa=celstv|celsbsns|celsus|celsglobal (from /inscribirme) makes the result offer that program's
 * recommended plan. eval_sessions has no field for it, so it travels in the URL.
 * TODO(celsus-eval): CelsUS moves to /evaluacion/celsus when that evaluation ships (src/lib/enroll.ts evalHref).
 */
export default async function EvaluacionPage({ searchParams }: Props) {
  const { lang, t } = await getDictionary();
  const { programa } = await searchParams;
  return <Evaluation t={t.evaluation} programa={isEnrollProgram(programa) ? programa : null} products={await offerProducts()} enrollT={enrollCopy(lang)} />;
}
