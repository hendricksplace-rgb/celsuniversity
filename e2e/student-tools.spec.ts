// Finanzas: an e-book card opening at its screen and the answer box; Cuenta → Preferencias.
import { expect, studentTest as test } from "./fixtures";

const EBOOK_LESSON = "/app/lecciones/2cc6401c-e908-4d1d-8dd0-7d2aa1562c90"; // E-Book, module 2 → screen m4
const ANSWER_LESSON = "/app/lecciones/8c7abe79-f914-4260-983f-1089cdbf9bba"; // Activity / Practice, module 2

test("e-book card opens the reader at its screen", async ({ page }) => {
  await page.goto(EBOOK_LESSON);
  const card = page.getByRole("link", { name: /Abrir e-book/ });
  await expect(card).toHaveAttribute("href", "/app/libros/tu-dinero-tu-camino?screen=m4");
  await card.click();
  await expect(page).toHaveURL(/\/app\/libros\/tu-dinero-tu-camino\?screen=m4/);
  // The contents list marks screen 4 as the current one.
  await expect(page.locator("nav[aria-label=Contenido] button[aria-current]")).toContainText("4.");
});

test("answer box saves on its own and survives a reload", async ({ page }) => {
  await page.goto(ANSWER_LESSON);
  const box = page.getByLabel("Tu respuesta");
  const text = `Renta 900, comida 300, transporte 120, ahorro 100 (${Date.now()})`;
  const saved = page.waitForResponse((r) => r.url().includes("/rest/v1/lesson_answers") && r.request().method() === "POST" && r.ok());
  await box.fill(text);
  await saved;
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Tu respuesta")).toHaveValue(text);
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
