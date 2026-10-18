// Sends the app emails (emails/app) through Resend.
//
// POST JSON + header x-job-token ('send-email' row in public.job_tokens), for internal callers only:
//   { event: "order_paid", order_id }   receipt + program welcome. Fired by the orders trigger
//                                        (private.on_order_paid) when the Stripe webhook marks it paid.
//   { template, to, vars, dedupe_key }   any non-marketing template with ready-made variables.
// POST ?unsubscribe=<lead token>         RFC 8058 one-click unsubscribe from the List-Unsubscribe
//                                        header. Public: the token is the credential.
//
// Deployed with verify_jwt = false (pg_net and mail apps don't send a user JWT).
import { createClient } from "npm:@supabase/supabase-js@2";
import { firstName, hasTemplate, mxn, sendTemplate, siteUrl } from "../_shared/mailer.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// product code → short program name for the receipt subject
const SHORT: Record<string, string> = { celstv: "CelsTV", celsbsns: "CelsBSNS", bundle: "CelsTV + CelsBSNS", celsus: "CelsUS", celsglobal: "CelsGLOBAL" };

async function orderPaid(orderId: string) {
  const { data: order, error } = await admin
    .from("orders")
    .select("id, user_id, email, amount_usd_cents, status, card_last4, created_at, product:products(code, name, price_usd_cents)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order || order.status !== "paid") return json({ error: "order" }, 404);
  const product = order.product as unknown as { code: string; name: string; price_usd_cents: number } | null;
  const { data: profile } = order.user_id ? await admin.from("profiles").select("email, display_name").eq("id", order.user_id).maybeSingle() : { data: null };
  const to = (profile?.email ?? order.email ?? "").trim().toLowerCase();
  if (!to) return json({ error: "no email" }, 422);

  // The buyer leaves the evaluation follow-ups (D30 still goes out).
  const { data: leads } = await admin.from("leads").update({ converted_to_student: true, ...(order.user_id ? { student_id: order.user_id } : {}) }).eq("email", to).select("name");
  // The greeting needs a name: the account's, else the one typed in the evaluation.
  const nombre = firstName(profile?.display_name) || firstName(leads?.[0]?.name) || "estudiante";

  const code = product?.code ?? "";
  const usd = (order.amount_usd_cents ?? product?.price_usd_cents ?? 0) / 100;
  // Access length, from the enrollments the purchase created.
  const { data: enr } = order.user_id
    ? await admin.from("enrollments").select("starts_at, expires_at").eq("user_id", order.user_id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const months = enr?.expires_at ? Math.round((new Date(enr.expires_at).getTime() - new Date(enr.starts_at).getTime()) / (30.44 * 864e5)) : 12;
  const peso = await mxn(usd);
  const results: Record<string, string> = {};

  results.receipt = await sendTemplate(admin, {
    template: "receipt",
    to,
    vars: {
      programa: product?.name ?? "CelsU",
      programa_corto: SHORT[code] ?? product?.name ?? "CelsU",
      acceso: months > 0 ? `${months} meses` : "Sin vencimiento",
      total: `$${usd.toFixed(2)} USD`,
      total_mxn: peso ? `≈ ${peso} MXN (se cobra en dólares)` : "Se cobra en dólares",
      ultimos4: order.card_last4 ?? "····",
      fecha: new Date(order.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" }),
      folio: `CU-${new Date(order.created_at).getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`,
      boton_url: `${siteUrl()}/app`,
    },
    dedupeKey: `receipt:${order.id}`,
    orderId: order.id,
    userId: order.user_id,
  });

  const welcome = `welcome-${code}`;
  if (await hasTemplate(admin, welcome)) {
    results.welcome = await sendTemplate(admin, {
      template: welcome,
      to,
      vars: { nombre, boton_url: `${siteUrl()}/app` },
      dedupeKey: `${welcome}:${order.id}`,
      orderId: order.id,
      userId: order.user_id,
    });
  } else {
    console.warn("no welcome email for product", code);
  }
  return json({ ok: true, ...results });
}

async function unsubscribe(token: string) {
  if (/^[0-9a-f-]{36}$/i.test(token)) await admin.from("leads").update({ unsubscribed: true }).eq("unsubscribe_token", token);
  return new Response("Listo: ya no recibirás estos correos.", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const unsub = url.searchParams.get("unsubscribe");
  if (unsub !== null) return await unsubscribe(unsub);

  const { data: tok } = await admin.from("job_tokens").select("token").eq("name", "send-email").maybeSingle();
  const given = req.headers.get("x-job-token");
  if (!tok || !given || given !== tok.token) return json({ error: "forbidden" }, 403);

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.event === "order_paid" && typeof body.order_id === "string") return await orderPaid(body.order_id);
    if (typeof body.template === "string" && typeof body.to === "string" && typeof body.dedupe_key === "string") {
      if (body.template.startsWith("eval-d")) return json({ error: "marketing emails are sent by the follow-up job" }, 400);
      const vars = Object.fromEntries(Object.entries((body.vars ?? {}) as Record<string, unknown>).filter(([k]) => !k.endsWith("_html")).map(([k, v]) => [k, String(v ?? "")]));
      const status = await sendTemplate(admin, { template: body.template, to: body.to, vars, dedupeKey: body.dedupe_key });
      return json({ ok: true, status });
    }
    return json({ error: "body" }, 400);
  } catch (e) {
    console.error("send-email", e instanceof Error ? e.message : e);
    return json({ error: "send failed" }, 500);
  }
});
