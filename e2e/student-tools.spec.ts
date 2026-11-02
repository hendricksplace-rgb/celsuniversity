// Finanzas: old lesson links open the e-book screen and the step's Construye (which saves); Cuenta → Preferencias.
import { expect, studentTest as test } from "./fixtures";

// Finanzas is a guided course (C-012): its old lesson pages never render and open their new place instead.
const EBOOK_LESSON = "/app/lecciones/2cc6401c-e908-4d1d-8dd0-7d2aa1562c90"; // E-Book, module 2 "Entendiendo el crédito" (step 3)
const ANSWER_LESSON = "/app/lecciones/8c7abe79-f914-4260-983f-1089cdbf9bba"; // Activity / Practice, same module

test("old e-book lesson opens the reader at its step's screen", async ({ page }) => {
  await page.goto(EBOOK_LESSON);
  // Step 3 reads screen m4 "Entendiendo el crédito en EE.UU." (guided_course_steps.essentials_from); the book has
  // one screen more than the course has steps, so it is not m<step>.
  await expect(page).toHaveURL(/\/app\/libros\/tu-dinero-tu-camino-guia-financiera\?screen=m4\b/);
  // The contents list marks screen 4 as the current one.
  await expect(page.locator("nav[aria-label=Contenido] button[aria-current]")).toContainText("4.");
});

test("old activity lesson opens the step's Construye; an answer saves on its own and survives a reload", async ({ page }) => {
  await page.goto(ANSWER_LESSON);
  await expect(page).toHaveURL(/\/app\/cursos\/finanzas-personales-en-estados-unidos\/paso\/3#build$/);
  const box = page.locator("#build textarea[aria-label^='Reflexiona']");
  const text = `Uso la tarjeta solo para el súper y la pago completa cada mes (${Date.now()})`;
  const saved = page.waitForResponse((r) => r.url().includes("/rest/v1/financial_plans") && r.request().method() === "POST" && r.ok());
  await box.fill(text);
  await saved;
  await page.reload();
  await expect(page.locator("#build textarea[aria-label^='Reflexiona']")).toHaveValue(text);
});

test("Preferencias: toggles save and survive a reload", async ({ page }) => {
  await page.goto("/app/cuenta/preferencias");
  const promos = page.getByRole("switch", { name: /Novedades y promociones/ });
  const before = await promos.getAttribute("aria-checked");
  await promos.click();
  await expect(page.getByText("✓ Guardado").first()).toBeVisible();
  await page.getByRole("radio", { name: "Grande" }).click();
  await expect(page.getByText("✓ Guardado").first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: /Novedades y promociones/ })).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
  await expect(page.getByRole("radio", { name: "Grande" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("[data-prefs]")).toHaveAttribute("data-text", "large");
  // Back to how it was.
  await page.getByRole("switch", { name: /Novedades y promociones/ }).click();
  await page.getByRole("radio", { name: "Normal" }).click();
  await expect(page.getByRole("radio", { name: "Normal" })).toHaveAttribute("aria-checked", "true");
});
