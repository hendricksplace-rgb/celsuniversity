import { getDictionary } from "@/lib/i18n/server";
import { GuidePage } from "@/components/celsus/GuidePage";

type Props = { params: Promise<{ slug: string }> };

export default async function EvaluationGuidePage({ params }: Props) {
  const { slug } = await params;
  return <GuidePage slug={slug} place="evaluacion" />;
}

export async function generateMetadata() {
  const { t } = await getDictionary();
  return { title: `${t.guide.title} · ${t.guide.crumbEval} · CelsU` };
}
