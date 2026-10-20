import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/server";
import { fill } from "@/components/course/kit";
import { GuidePage } from "@/components/celsus/GuidePage";

type Props = { params: Promise<{ slug: string; n: string }> };

export default async function EpisodeGuidePage({ params }: Props) {
  const { slug, n } = await params;
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1) notFound();
  return <GuidePage slug={slug} place={num} />;
}

export async function generateMetadata({ params }: Props) {
  const { n } = await params;
  const { t } = await getDictionary();
  return { title: `${t.guide.title} · ${fill(t.guide.crumb, { n })} · CelsU` };
}
