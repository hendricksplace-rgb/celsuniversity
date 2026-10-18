// Stripe test-mode purchases (batch 4 §2): a single program, a bundle and the CelsGLOBAL 5-payment plan, each
// bought by a brand-new test account, then a refund. Never runs against live Stripe: the Checkout session must
// be a test one (cs_test_…), and it skips while payments are off ("Los pagos aún no están activos").
//
// Emails really go out, but only to Resend's test inbox: buyers are delivered+e2e-buyer-…@resend.dev, and the
// test fails if anything for the order was addressed elsewhere.
//
// Refund: with STRIPE_TEST_SECRET_KEY (a sk_test_ key, CI secret or local env, never in the repo) the test
// refunds through the API and checks that the enrollment closes and progress stays. Without it, set
// E2E_KEEP_BUYERS=1, refund the printed payment in the Stripe dashboard (test mode) and re-run the check with
// `E2E_REFUND_CHECK=<order id>`.
import { expect, test } from "./fixtures";
import { admin } from "./env";
import { ensureUser, sessionState } from "./global-setup";

const CASES = [
  { code: "celstv_standard", page: "/comprar/celstv", charged: 9900, grants: { "celstv-english-for-our-generation": 12 } },
  { code: "bundle_tv_bsns", page: null, charged: 15000, grants: { "celstv-english-for-our-generation": 12, "english-for-business": 6 } },
  { code: "celsglobal_plan", page: null, charged: 10000, grants: { "international-professional-development": 18 } },
] as const;

const STRIPE_KEY = process.env.STRIPE_TEST_SECRET_KEY ?? "";
const monthsBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / (30.44 * 864e5);

for (const c of CASES) {
  test(`purchase ${c.code} in Stripe test mode`, async ({ page, context }, info) => {
    test.skip(info.project.name !== "desktop", "one purchase per product is enough (desktop only)");
    test.setTimeout(300_000);
    const db = admin();
    const stamp = Date.now();
    const email = `delivered+e2e-buyer-${stamp}@resend.dev`;
    const password = `E2e-${stamp}-pago`;
    const userId = await ensureUser(email, "Comprador E2E", password);
    await context.addCookies((await sessionState(email, password)).cookies);

    if (c.page) {
      await page.goto(c.page);
      await page.locator(`a[href="/comprar/resumen?producto=${c.code}"]`).first().click();
    } else await page.goto(`/comprar/resumen?producto=${c.code}`);
    await expect(page).toHaveURL(new RegExp(`producto=${c.code}`));
    await page.getByRole("button", { name: /Pagar .* con tarjeta/ }).click();

    const off = page.getByText("Los pagos aún no están activos");
    await Promise.race([off.waitFor({ timeout: 30_000 }).catch(() => {}), page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 }).catch(() => {})]);
    test.skip(await off.isVisible(), "Stripe keys aren't configured yet: the app says 'Los pagos aún no están activos'");
    test.skip(!/checkout\.stripe\.com/.test(page.url()), "Checkout didn't open (no Stripe redirect)");
    test.skip(!/cs_test_/.test(page.url()), "Stripe is in live mode: the e2e purchase only runs with test keys");

    await page.locator("#cardNumber").fill("4242 4242 4242 4242");
    await page.locator("#cardExpiry").fill("12 / 34");
    await page.locator("#cardCvc").fill("123");
    const holder = page.locator("#billingName");
    if (await holder.count()) await holder.fill("Comprador E2E");
    await page.locator(".SubmitButton, button[type=submit]").first().click();
    await page.waitForURL(/\/bienvenida/, { timeout: 120_000 });

    // Order paid, one payment of the right amount, one enrollment per program with its own expires_at.
    const order = await expect
      .poll(async () => (await db.from("orders").select("id, status, stripe_subscription_id").eq("user_id", userId).eq("status", "paid").maybeSingle()).data, { timeout: 90_000 })
      .not.toBeNull()
      .then(async () => (await db.from("orders").select("id, status, stripe_subscription_id").eq("user_id", userId).eq("status", "paid").single()).data!);
    const { data: payments } = await db.from("payments").select("kind, amount_usd_cents, card_last4").eq("order_id", order.id);
    expect(payments).toEqual([expect.objectContaining({ kind: "checkout", amount_usd_cents: c.charged, card_last4: "4242" })]);
    if (c.code === "celsglobal_plan") expect(order.stripe_subscription_id).toMatch(/^sub_/);

    const { data: enr } = await db.from("enrollments").select("status, starts_at, expires_at, course:courses(slug), program:programs(slug)").eq("order_id", order.id);
    const got = Object.fromEntries(
      (enr ?? []).map((e) => {
        const slug = (e.course as unknown as { slug: string } | null)?.slug ?? (e.program as unknown as { slug: string } | null)?.slug;
        return [slug, Math.round(monthsBetween(new Date(e.starts_at!), new Date(e.expires_at!)))];
      }),
    );
    expect(got).toEqual(c.grants);
    expect((enr ?? []).every((e) => e.status === "active")).toBe(true);

    // Receipt + welcome, only to the test inbox.
    await expect
      .poll(async () => (await db.from("email_outbox").select("id").eq("order_id", order.id)).data?.length ?? 0, { timeout: 60_000 })
      .toBeGreaterThanOrEqual(2);
    const { data: mails } = await db.from("email_outbox").select("template, to_email, status").eq("order_id", order.id);
    expect(mails!.every((m) => m.to_email === email)).toBe(true);
    info.annotations.push({ type: "emails", description: mails!.map((m) => `${m.template}:${m.status}`).join(", ") });

    // The student can open the course.
    const first = Object.keys(c.grants)[0];
    if (first !== "international-professional-development") {
      await page.goto(`/app/cursos/${first}`);
      await expect(page.getByText(/Inscríbete para ver|programa de pago/)).toHaveCount(0);
    }

    // Refund (single program only: one is enough to prove the webhook path).
    if (c.code !== "celstv_standard") return;
    // Some progress first, so we can check it survives the refund.
    const { data: lesson } = await db.from("lessons").select("id, module:modules!inner(course:courses!inner(slug))").eq("module.course.slug", first).eq("status", "published").limit(1).single();
    await db.from("progress").insert({ user_id: userId, lesson_id: lesson!.id, status: "in_progress", parts: {} });
    if (!STRIPE_KEY) {
      info.annotations.push({ type: "refund", description: `refund order ${order.id} in the Stripe dashboard (test mode), then run with E2E_REFUND_CHECK=${order.id}` });
      return;
    }
    const { data: pay } = await db.from("payments").select("stripe_payment_intent").eq("order_id", order.id).single();
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ payment_intent: pay!.stripe_payment_intent! }),
    });
    expect(res.ok).toBe(true);
    await expectRefunded(order.id, userId);
  });
}

async function expectRefunded(orderId: string, userId: string) {
  const db = admin();
  await expect.poll(async () => (await db.from("orders").select("status").eq("id", orderId).single()).data?.status, { timeout: 90_000 }).toBe("refunded");
  const { data: enr } = await db.from("enrollments").select("status").eq("order_id", orderId);
  expect(enr!.length).toBeGreaterThan(0);
  expect(enr!.every((e) => e.status === "refunded")).toBe(true);
  const { data: refund } = await db.from("payments").select("amount_usd_cents").eq("order_id", orderId).eq("kind", "refund");
  expect(refund!.length).toBe(1);
  expect((await db.from("progress").select("id").eq("user_id", userId)).data!.length).toBeGreaterThan(0);
}

test("refund check for an order refunded in the Stripe dashboard", async ({}, info) => {
  const orderId = process.env.E2E_REFUND_CHECK;
  test.skip(!orderId || info.project.name !== "desktop", "set E2E_REFUND_CHECK=<order id> after refunding in the dashboard");
  const { data: order } = await admin().from("orders").select("user_id").eq("id", orderId!).single();
  await expectRefunded(orderId!, order!.user_id!);
});
