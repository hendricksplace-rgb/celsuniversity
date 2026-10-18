import { getDictionary } from "@/lib/i18n/server";
import { Unsubscribe } from "@/components/eval/Unsubscribe";

type Props = { searchParams: Promise<{ t?: string }> };

/** Link at the bottom of every evaluation email (per-lead token, never the address). */
export default async function DesuscribirPage({ searchParams }: Props) {
  const { t: token } = await searchParams;
  const { t } = await getDictionary();
  return <Unsubscribe token={token ?? ""} t={t.evaluation} />;
}
