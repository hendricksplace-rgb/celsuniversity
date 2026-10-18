import { getDictionary } from "@/lib/i18n/server";
import { Evaluation } from "@/components/eval/Evaluation";

// Title and description: celsu-website-copy.md §2.
export const metadata = {
  title: "Evaluación de inglés gratis · CelsU",
  description: "Descubre tu nivel de inglés (A1 a C2) en unos 15 minutos, con resultados por habilidad y un plan recomendado. Gratis.",
  alternates: { canonical: "/evaluacion" },
  openGraph: { title: "Evaluación de inglés gratis · CelsU", description: "Descubre tu nivel de inglés (A1 a C2) en unos 15 minutos, con resultados por habilidad y un plan recomendado. Gratis.", locale: "es_MX", type: "website", images: [{ url: "/og/celsu.png", width: 1200, height: 630 }] },
};

/** Public: no account needed. A signed-in student's result is saved to their profile. */
export default async function EvaluacionPage() {
  const { t } = await getDictionary();
  return <Evaluation t={t.evaluation} />;
}
