// Prices on the public site always come from public.products (never from the boards' copy). MXN is a
// reference at the day's rate; the charge is in USD.
export type SitePrices = { items: Record<string, { cents: number; installments: number[] | null }>; rate: number | null };

const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;
const cents = (p: SitePrices | undefined, code: string) => p?.items[code]?.cents;

/** "$150" for a product code; "" if the product isn't active. */
export const price = (p: SitePrices | undefined, code: string) => (cents(p, code) != null ? fmt(cents(p, code)!) : "");
/** Sum of products bought separately: "$348". */
export const separately = (p: SitePrices | undefined, parts: string[]) => (parts.some((c) => cents(p, c) == null) ? "" : fmt(parts.reduce((s, c) => s + cents(p, c)!, 0)));
/** What a bundle saves against its parts bought separately: "$49". */
export const saving = (p: SitePrices | undefined, bundle: string, parts: string[]) =>
  cents(p, bundle) == null || parts.some((c) => cents(p, c) == null) ? "" : fmt(parts.reduce((s, c) => s + cents(p, c)!, 0) - cents(p, bundle)!);
/** A monthly plan's payments: { first: "$100", last: "$99", count: 5 }. */
export const plan = (p: SitePrices | undefined, code: string) => {
  const list = p?.items[code]?.installments;
  return list?.length ? { first: fmt(list[0]), last: fmt(list[list.length - 1]), count: list.length } : null;
};
/** "≈ $1,850 MXN" (rounded to 50), or "" without a rate. */
export const mxn = (p: SitePrices | undefined, code: string) =>
  p?.rate && cents(p, code) != null ? `≈ $${(Math.round(((cents(p, code)! / 100) * p.rate) / 50) * 50).toLocaleString("en-US")} MXN` : "";
