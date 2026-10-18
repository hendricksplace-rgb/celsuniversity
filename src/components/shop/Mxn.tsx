import { mxnRate } from "@/components/sales/Sales";

/** "≈ $X MXN": display only, from the day's rate. The charge is always in USD. */
export async function Mxn({ cents, className = "" }: { cents: number; className?: string }) {
  const rate = await mxnRate();
  if (!rate) return null;
  return <span className={className}>≈ ${(Math.round(((cents / 100) * rate) / 10) * 10).toLocaleString("es-MX")} MXN</span>;
}
