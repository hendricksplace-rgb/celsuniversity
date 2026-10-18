import "server-only";
import { unstable_cache } from "next/cache";
import { mxnRate } from "@/components/sales/Sales";
import { publicClient } from "@/lib/supabase/public";
import type { SitePrices } from "./prices";

// The site renders on every request (the root layout reads the language cookie), so the prices are
// cached here for an hour instead of being read from the database on each visit.
const activeProducts = unstable_cache(
  async () => {
    const { data } = await publicClient().from("products").select("code, price_usd_cents, installments").eq("active", true);
    return data ?? [];
  },
  ["site-prices"],
  { revalidate: 3600, tags: ["products"] },
);

export async function sitePrices(): Promise<SitePrices> {
  const [rows, rate] = await Promise.all([activeProducts(), mxnRate()]);
  return {
    items: Object.fromEntries(rows.map((r) => [r.code, { cents: r.price_usd_cents, installments: Array.isArray(r.installments) ? (r.installments as number[]) : null }])),
    rate,
  };
}
