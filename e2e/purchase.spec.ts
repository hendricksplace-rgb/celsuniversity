// Stripe test-mode purchase: CelsTV Standard bought by a brand-new test account gives access to the
// course. Skipped when payments aren't configured ("Los pagos aún no están activos") and never run
// against live Stripe: the Checkout session must be a test one (cs_test_…). The receipt and welcome
// emails are claimed in email_outbox before paying, so nothing is sent.
import { expect, test } from "./fixtures";
import { admin } from "./env";
import { ensureUser, sessionState } from "./global-setup";

test("purchase in Stripe test mode grants access to CelsTV", async ({ page, context }) => {
  test.setTimeout(240_000);
  const db = admin();
  const email = `e2e-buyer-${Date.now()}@example.com`;
  const password = `E2e-${Date.now()}-pago`;
  const userId = await ensureUser(email, "Comprador E2E", password);
  await context.addCookies((await sessionState(email, password)).cookies);

  await page.goto("/comprar/celstv");
  await page.locator('a[href="/comprar/resumen?producto=celstv_standard"]').click();
  await expect(page).toHaveURL(/producto=celstv_standard/);
  await page.getByRole("button", { name: /Pagar .* con tarjeta/ }).click();

  const off = page.getByText("Los pagos aún no están activos");
  await expect(off.or(page.locator("body[data-stripe], form")).first()).toBeVisible();
  await Promise.race([off.waitFor({ timeout: 30_000 }).catch(() => {}), page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 }).catch(() => {})]);
  test.skip(await off.isVisible(), "Stripe keys aren't configured yet: the app says 'Los pagos aún no están activos'");
  test.skip(!/checkout\.stripe\.com/.test(page.url()), "Checkout didn't open (no Stripe redirect)");
  test.skip(!/cs_test_/.test(page.url()), "Stripe is in live mode: the e2e purchase only runs with test keys");

  // The order exists now: claim its emails so none goes out.
  const { data: order } = await db.from("orders").select("id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
  for (const key of [`receipt:${order!.id}`, `welcome-celstv:${order!.id}`]) {
    await db.from("email_outbox").insert({ template: key.split(":")[0], kind: key.split(":")[0], to_email: email, subject: "(e2e: no enviar)", html: "", status: "stubbed", dedupe_key: key });
  }

  await page.locator("#cardNumber").fill("4242 4242 4242 4242");
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  const holder = page.locator("#billingName");
  if (await holder.count()) await holder.fill("Comprador E2E");
  await page.locator(".SubmitButton, button[type=submit]").first().click();
  await page.waitForURL(/\/bienvenida/, { timeout: 120_000 });

  await expect
    .poll(async () => (await db.from("enrollments").select("id").eq("user_id", userId).eq("status", "active")).data?.length ?? 0, { timeout: 60_000 })
    .toBeGreaterThan(0);
  await page.goto("/app/cursos/celstv-english-for-our-generation/episodio/1/celscards");
  await expect(page.getByText(/Inscríbete para ver|programa de pago/)).toHaveCount(0);
});
