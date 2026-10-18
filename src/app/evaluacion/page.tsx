import { getDictionary } from "@/lib/i18n/server";
import { Evaluation } from "@/components/eval/Evaluation";

export const metadata = { title: "Evaluación gratuita de inglés · CelsU" };

/** Public: no account needed. A signed-in student's result is saved to their profile. */
export default async function EvaluacionPage() {
  const { t } = await getDictionary();
  return <Evaluation t={t.evaluation} />;
}
