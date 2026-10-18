import "server-only";
import { productsFor } from "@/lib/purchase";
import { mxnRate } from "@/components/sales/Sales";
import type { SitePrices } from "./prices";

export async function sitePrices(): Promise<SitePrices> {
  const [rows, rate] = await Promise.all([productsFor({}), mxnRate()]);
  return { items: Object.fromEntries(rows.map((r) => [r.code, { cents: r.price_usd_cents, installments: r.installments }])), rate };
}
