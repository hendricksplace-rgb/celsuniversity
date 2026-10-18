// Stripe webhook: opens, pauses and closes access. Every event is handled at most once
// (public.stripe_events) and every handler is safe to run twice.
//
//   checkout.session.completed  find or create the buyer, create the enrollments (one per program
//                               the product grants, each with its own expires_at), log the payment,
//                               mark the order paid (the orders trigger sends receipt + welcome).
//                               CelsGLOBAL plan: schedule 4 × $100 + 1 × $99, then cancel.
//   invoice.paid                plan installment: log it; a paused enrollment becomes active again.
//   invoice.payment_failed      keep access while Stripe retries; after the last retry, pause.
//   charge.refunded             close access (enrollments → refunded) and cancel a plan.
// Progress is never deleted.
//
// Deployed with verify_jwt = false: Stripe signs the request instead (STRIPE_WEBHOOK_SECRET).
import { createClient } from "npm:@supabase/supabase-js@2";
import type Stripe from "npm:stripe@16.12.0";
import { cryptoProvider, PRODUCT_COLUMNS, stripe, type Product } from "../_shared/stripe.ts";
import { logFunctionError } from "../_shared/errors.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const text = (body: string, status = 200) => new Response(body, { status });
const id = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

async function cardLast4(paymentIntent: string | null) {
  if (!paymentIntent) return null;
  const pi = await stripe.paymentIntents.retrieve(paymentIntent, { expand: ["latest_charge"] });
  const charge = pi.latest_charge as Stripe.Charge | null;
  return charge?.payment_method_details?.card?.last4 ?? null;
}

/** The buyer's account: the order's user, else the profile with that email, else a new account. */
async function buyerId(order: { user_id: string | null; email: string | null; buyer_name: string | null }) {
  if (order.user_id) return order.user_id;
  const email = (order.email ?? "").toLowerCase();
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name: order.buyer_name ?? "" } });
  if (error) throw error;
  if (order.buyer_name) await admin.from("profiles").update({ display_name: order.buyer_name }).eq("id", data.user.id);
  return data.user.id;
}

async function checkoutCompleted(s: Stripe.Checkout.Session) {
  const orderId = s.metadata?.order_id;
  if (!orderId || s.payment_status === "unpaid") return; // only cards and wallets: paid on completion
  const { data: order } = await admin.from("orders").select("id, status, user_id, email, buyer_name, product_id").eq("id", orderId).maybeSingle();
  if (!order || order.status === "paid") return;
  const { data: product } = await admin.from("products").select(PRODUCT_COLUMNS).eq("id", order.product_id).single<Product>();
  if (!product) throw new Error(`order ${order.id}: product missing`);
  const userId = await buyerId(order);

  // Enrollments: access starts today; each program has its own end date.
  const { count } = await admin.from("enrollments").select("id", { count: "exact", head: true }).eq("order_id", order.id);
  if (!count) {
    const now = new Date();
    const rows = [];
    for (const g of product.grants) {
      const until = new Date(now);
      until.setMonth(until.getMonth() + g.months);
      const target = g.course
        ? { course_id: (await admin.from("courses").select("id").eq("slug", g.course).single()).data!.id }
        : { program_id: (await admin.from("programs").select("id").eq("slug", g.program!).single()).data!.id };
      rows.push({ user_id: userId, ...target, status: "active", plan: product.code, source: "stripe", starts_at: now.toISOString(), expires_at: until.toISOString(), order_id: order.id });
    }
    const { error } = await admin.from("enrollments").insert(rows);
    if (error) throw error;
  }

  // The payment and the card it came from.
  const subscription = id(s.subscription);
  let paymentIntent = id(s.payment_intent);
  let invoiceId: string | null = null;
  if (subscription && s.invoice) {
    const inv = await stripe.invoices.retrieve(id(s.invoice)!);
    invoiceId = inv.id;
    paymentIntent = id(inv.payment_intent);
  }
  const last4 = await cardLast4(paymentIntent);
  const { count: logged } = await admin.from("payments").select("id", { count: "exact", head: true }).eq("order_id", order.id).eq("kind", "checkout");
  if (!logged) await admin.from("payments").insert({
    order_id: order.id,
    user_id: userId,
    kind: "checkout",
    amount_usd_cents: s.amount_total ?? 0,
    card_last4: last4,
    stripe_payment_intent: paymentIntent,
    stripe_invoice_id: invoiceId,
  });

  // CelsGLOBAL plan: 4 × $100, then 1 × $99, then the subscription ends ($499 in total).
  if (subscription && product.installments?.length) {
    const sub = await stripe.subscriptions.retrieve(subscription);
    if (!sub.schedule) {
      const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription });
      const item = sub.items.data[0];
      const plan = product.installments;
      const first = plan[0];
      const firstRun = plan.findIndex((c) => c !== first);
      const n = firstRun === -1 ? plan.length : firstRun;
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "cancel",
        phases: [
          { items: [{ price: item.price.id, quantity: 1 }], start_date: schedule.phases[0].start_date, iterations: n },
          ...plan.slice(n).map((cents) => ({
            items: [{ price_data: { currency: "usd", product: id(item.price.product)!, unit_amount: cents, recurring: { interval: "month" as const } }, quantity: 1 }],
            iterations: 1,
          })),
        ],
      });
    }
  }

  // Paid: the orders trigger (private.on_order_paid) sends the receipt and the welcome email.
  await admin
    .from("orders")
    .update({
      status: "paid",
      user_id: userId,
      card_last4: last4,
      paid_at: new Date().toISOString(),
      amount_usd_cents: s.amount_total ?? undefined,
      stripe_customer_id: id(s.customer),
      stripe_subscription_id: subscription,
    })
    .eq("id", order.id);
  await admin.from("leads").update({ converted_to_student: true, student_id: userId }).eq("email", (order.email ?? "").toLowerCase());
}

const orderForSubscription = async (sub: string | null) =>
  sub ? (await admin.from("orders").select("id, user_id").eq("stripe_subscription_id", sub).maybeSingle()).data : null;

async function invoicePaid(inv: Stripe.Invoice) {
  if (inv.billing_reason === "subscription_create") return; // the first payment is logged at checkout
  const order = await orderForSubscription(id(inv.subscription));
  if (!order) return;
  const { count } = await admin.from("payments").select("id", { count: "exact", head: true }).eq("stripe_invoice_id", inv.id);
  if (!count) {
    await admin.from("payments").insert({
      order_id: order.id,
      user_id: order.user_id,
      kind: "installment",
      amount_usd_cents: inv.amount_paid,
      card_last4: await cardLast4(id(inv.payment_intent)),
      stripe_payment_intent: id(inv.payment_intent),
      stripe_invoice_id: inv.id,
    });
  }
  await admin.from("enrollments").update({ status: "active" }).eq("order_id", order.id).eq("status", "paused");
}

async function invoiceFailed(inv: Stripe.Invoice) {
  // While Stripe still plans another attempt, access stays open.
  if (inv.next_payment_attempt) return;
  const order = await orderForSubscription(id(inv.subscription));
  if (order) await admin.from("enrollments").update({ status: "paused" }).eq("order_id", order.id).eq("status", "active");
}

async function chargeRefunded(ch: Stripe.Charge) {
  if (!ch.refunded) return; // partial refunds keep access
  const pi = id(ch.payment_intent);
  const { data: pay } = pi ? await admin.from("payments").select("order_id, user_id").eq("stripe_payment_intent", pi).not("order_id", "is", null).limit(1).maybeSingle() : { data: null };
  if (!pay?.order_id) return;
  const { count } = await admin.from("payments").select("id", { count: "exact", head: true }).eq("stripe_charge_id", ch.id).eq("kind", "refund");
  if (!count) {
    await admin.from("payments").insert({ order_id: pay.order_id, user_id: pay.user_id, kind: "refund", amount_usd_cents: -ch.amount_refunded, stripe_payment_intent: pi, stripe_charge_id: ch.id });
  }
  await admin.from("enrollments").update({ status: "refunded" }).eq("order_id", pay.order_id);
  const { data: order } = await admin.from("orders").update({ status: "refunded" }).eq("id", pay.order_id).select("stripe_subscription_id").single();
  // A refunded plan stops charging.
  if (order?.stripe_subscription_id) {
    const sub = await stripe.subscriptions.retrieve(order.stripe_subscription_id);
    if (sub.schedule) await stripe.subscriptionSchedules.release(id(sub.schedule)!).catch(() => undefined);
    if (sub.status !== "canceled") await stripe.subscriptions.cancel(sub.id);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return text("method", 405);
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return text("unsigned", 400);
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
  } catch {
    return text("bad signature", 400);
  }

  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return text("duplicate");
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await checkoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await invoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await invoiceFailed(event.data.object as Stripe.Invoice);
        break;
      case "charge.refunded":
        await chargeRefunded(event.data.object as Stripe.Charge);
        break;
    }
  } catch (e) {
    // Not recorded: Stripe retries the event, and the handlers are safe to run again.
    await logFunctionError(`stripe-webhook:${event.type}`, 500, e);
    return text("error", 500);
  }
  await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  return text("ok");
});
