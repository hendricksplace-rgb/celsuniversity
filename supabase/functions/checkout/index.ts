// Starts a purchase: creates the order and a Stripe Checkout session, and reports an order's state
// to the welcome page.
//
// POST { action: "start", product, name?, email? }  → { url }  (signed-in buyers send their JWT;
//      guests send name + email, and stripe-webhook creates their account when they pay)
// POST { action: "status", session_id }             → { state: "pending" | "active" | "failed", … }
//
// Deployed with verify_jwt = false: guests buy too. The session id is the credential for "status".
import { createClient } from "npm:@supabase/supabase-js@2";
import { PRODUCT_COLUMNS, siteUrl, stripe, type Product } from "../_shared/stripe.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function buyerFrom(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || jwt.startsWith("sb_")) return null;
  const { data } = await admin.auth.getUser(jwt);
  if (!data.user) return null;
  const { data: p } = await admin.from("profiles").select("id, email, display_name").eq("id", data.user.id).maybeSingle();
  return p ? { id: p.id, email: (p.email ?? data.user.email ?? "").toLowerCase(), name: p.display_name ?? "" } : null;
}

async function start(req: Request, body: Record<string, unknown>) {
  if (!Deno.env.get("STRIPE_SECRET_KEY")) return json({ error: "payments_off" }, 503);
  const code = typeof body.product === "string" ? body.product : "";
  const { data: product } = await admin.from("products").select(PRODUCT_COLUMNS).eq("code", code).eq("active", true).maybeSingle<Product>();
  if (!product) return json({ error: "product" }, 400);

  const buyer = await buyerFrom(req);
  const email = (buyer?.email ?? String(body.email ?? "")).trim().toLowerCase();
  const name = (buyer?.name || String(body.name ?? "")).trim().slice(0, 80);
  if (!EMAIL.test(email) || email.length > 200) return json({ error: "email" }, 400);
  if (!buyer && !name) return json({ error: "name" }, 400);

  const { data: order, error } = await admin
    .from("orders")
    .insert({ product_id: product.id, user_id: buyer?.id ?? null, email, buyer_name: name || null, amount_usd_cents: product.price_usd_cents, status: "pending" })
    .select("id")
    .single();
  if (error) throw error;

  const metadata = { order_id: order.id, product: product.code };
  const plan = product.installments?.length ? product.installments : null;
  const session = await stripe.checkout.sessions.create({
    mode: plan ? "subscription" : "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan ? plan[0] : product.price_usd_cents,
          product_data: { name: product.name },
          ...(plan ? { recurring: { interval: "month" as const } } : {}),
        },
      },
    ],
    customer_email: email,
    locale: "es-419",
    allow_promotion_codes: true,
    client_reference_id: order.id,
    metadata,
    ...(plan ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    success_url: `${siteUrl()}/bienvenida?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/pago-fallido?producto=${encodeURIComponent(product.code)}`,
  });
  await admin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  return json({ url: session.url });
}

/** The welcome page polls this until the webhook has opened the access. */
async function status(body: Record<string, unknown>) {
  const sid = typeof body.session_id === "string" && /^cs_[A-Za-z0-9_]+$/.test(body.session_id) ? body.session_id : null;
  if (!sid) return json({ error: "session" }, 400);
  const { data: order } = await admin
    .from("orders")
    .select("id, status, email, buyer_name, user_id, product:products(code, name, program, access_label)")
    .eq("stripe_session_id", sid)
    .maybeSingle();
  if (!order) return json({ state: "pending" });
  const product = order.product as unknown as { code: string; name: string; program: string; access_label: string } | null;
  if (order.status === "failed") return json({ state: "failed", product: product?.code });
  if (order.status !== "paid") return json({ state: "pending" });
  const { data: profile } = order.user_id ? await admin.from("profiles").select("display_name").eq("id", order.user_id).maybeSingle() : { data: null };
  // First lesson of the first course the purchase opened.
  const { data: enr } = await admin.from("enrollments").select("course_id, program_id").eq("order_id", order.id).limit(1).maybeSingle();
  let courseId = enr?.course_id ?? null;
  if (!courseId && enr?.program_id) {
    const { data: pc } = await admin.from("program_courses").select("course_id, sort_order, course:courses(status)").eq("program_id", enr.program_id).order("sort_order");
    courseId = (pc ?? []).find((x) => (x.course as unknown as { status: string } | null)?.status === "published")?.course_id ?? null;
  }
  const { data: first } = courseId
    ? await admin.from("lessons").select("id, sort_order, module:modules!inner(course_id, sort_order, status)").eq("module.course_id", courseId).eq("module.status", "published").eq("status", "published").eq("teacher_only", false)
    : { data: [] };
  const lesson = (first ?? []).sort((a, b) => {
    const ma = a.module as unknown as { sort_order: number };
    const mb = b.module as unknown as { sort_order: number };
    return ma.sort_order - mb.sort_order || a.sort_order - b.sort_order;
  })[0];
  return json({
    state: "active",
    product: product?.code,
    program: product?.program,
    name: (profile?.display_name ?? order.buyer_name ?? "").trim().split(/\s+/)[0] || null,
    email: order.email,
    access: product?.access_label,
    lessonId: lesson?.id ?? null,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.action === "start") return await start(req, body);
    if (body.action === "status") return await status(body);
    return json({ error: "action" }, 400);
  } catch (e) {
    console.error("checkout", e instanceof Error ? e.message : e);
    return json({ error: "server" }, 500);
  }
});
