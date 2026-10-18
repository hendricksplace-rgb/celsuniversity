// CelsTV episode 1 and its 6 parts, as an enrolled student.
import { expect, mainText, studentTest as test } from "./fixtures";

const EP = "/app/cursos/celstv-english-for-our-generation/episodio/1";

test("episode screen lists the 6 parts", async ({ page }) => {
  await page.goto(EP);
  for (const key of ["celsvideo", "celscards", "celsbook", "celsaudio", "grammar", "quiz"]) {
    await expect(page.locator(`a[href="${EP}/${key}"]`).first()).toBeAttached();
  }
});

test("CelsVideo opens and can be finished", async ({ page }) => {
  await page.goto(`${EP}/celsvideo`);
  const player = page.locator("main iframe, main video");
  if (!(await player.count())) {
    // Episodes 3–8 have no video yet (Unidad 1 check, 2026-10-18): the part says so.
    test.info().annotations.push({ type: "content", description: "No video yet: the part shows 'llega muy pronto'" });
    await expect(page.getByText(/llega muy pronto/)).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /Terminar CelsVideo/ })).toBeVisible();
});

test("CelsCards shows the deck", async ({ page }) => {
  await page.goto(`${EP}/celscards`);
  expect((await mainText(page)).length).toBeGreaterThan(40);
  await expect(page.getByText(/Español|🇲🇽/).first()).toBeAttached();
});

test("CelsBook is the interactive book and turns pages", async ({ page }) => {
  await page.goto(`${EP}/celsbook`);
  await expect(page.getByRole("button", { name: /Página 1 de \d+/ })).toBeVisible();
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.getByRole("button", { name: /Léeme todo/i })).toBeVisible();
});

test("CelsCast: transcript tap moves the audio; the original recording has its transcript", async ({ page }) => {
  await page.goto(`${EP}/celsaudio`);
  const tabs = page.getByRole("tab");
  await expect(tabs.filter({ hasText: /CelsCast/i })).toBeVisible();
  const lines = page.locator("ol li button");
  await expect.poll(() => lines.count()).toBeGreaterThan(3);
  await lines.nth(3).click();
  await expect.poll(async () => Number(await page.locator('input[type="range"]').first().inputValue()), { timeout: 15_000 }).toBeGreaterThan(0);
  await tabs.filter({ hasText: /original/i }).click();
  await expect.poll(() => lines.count()).toBeGreaterThan(3);
});

test("Grammar renders its rule and practice", async ({ page }) => {
  await page.goto(`${EP}/grammar`);
  expect((await mainText(page)).length).toBeGreaterThan(60);
});

test("Quiz reads the question with Amy's recording", async ({ page }) => {
  await page.goto(`${EP}/quiz`);
  const start = page.getByRole("button", { name: /Empezar|Comenzar/ });
  if (await start.count()) await start.first().click();
  await expect
    .poll(() => page.evaluate(() => performance.getEntriesByType("resource").some((e) => /quiz\/ep-01\//.test(e.name))), { timeout: 15_000 })
    .toBe(true);
});
