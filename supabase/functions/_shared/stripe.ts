// Stripe client and the product catalog (public.products) for checkout and stripe-webhook.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
import Stripe from "npm:stripe@16.12.0";

// Pinned: the webhook reads invoice.payment_intent and charge.payment_method_details.
export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export type Product = {
  id: string;
  code: string;
  name: string;
  price_usd_cents: number;
  program: string | null;
  tier: string | null;
  access_label: string | null;
  grants: { course?: string; program?: string; months: number }[];
  installments: number[] | null;
};

export const PRODUCT_COLUMNS = "id, code, name, price_usd_cents, program, tier, access_label, grants, installments";

export const siteUrl = () => (Deno.env.get("SITE_URL") ?? "https://celsuniversity.vercel.app").replace(/\/$/, "");
