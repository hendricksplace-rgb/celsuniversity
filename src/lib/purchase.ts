// Purchase flow (celsu-purchase-spec.md): the products and how each program presents itself.
// Prices and access periods live in public.products; Stripe runs in the checkout and stripe-webhook
// edge functions.
import { createClient } from "@/lib/supabase/server";
import { PROGRAMS, type ProgramKey } from "@/lib/purchase-programs";

export { PROGRAMS, type ProgramKey };

export type ShopProduct = {
  code: string;
  name: string;
  price_usd_cents: number;
  program: string;
  tier: string;
  access_label: string;
  features: string[];
  installments: number[] | null;
};

export const isProgram = (p: string): p is ProgramKey => p in PROGRAMS;

/** Bundles open with their main program's look. */
export const programOf = (product: { code: string; program: string }): ProgramKey =>
  isProgram(product.program) ? product.program : product.code === "bundle_us_tvpremium" ? "celsus" : "celstv";

export const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

export async function productsFor(filter: { program?: string; code?: string }) {
  const supabase = await createClient();
  let q = supabase.from("products").select("code, name, price_usd_cents, program, tier, access_label, features, installments").eq("active", true).order("sort_order");
  if (filter.program) q = q.eq("program", filter.program);
  if (filter.code) q = q.eq("code", filter.code);
  const { data } = await q;
  return (data ?? []).map((p) => ({
    ...p,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    installments: Array.isArray(p.installments) ? (p.installments as number[]) : null,
  })) as ShopProduct[];
}

/** The 5 charge dates of the CelsGLOBAL plan: today, then the same day each month. */
export function planDates(count: number, from = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setMonth(d.getMonth() + i);
    return d;
  });
}
