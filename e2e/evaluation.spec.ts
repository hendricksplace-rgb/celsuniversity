// The free English evaluation, start to results. The questions, the AI-graded writing and the
// session are real. The last call ("finish") emails the results to the address typed in, so it is
// answered in the browser with a fixture unless E2E_ALLOW_EMAIL=1. Speaking is skipped (the
// "Omitir" button), as a visitor without a microphone would.
import { expect, test } from "./fixtures";
import { ALLOW_EMAIL } from "./env";

const RESULT = {
  g: 3,
  band: "B1",
  writing: null,
  skillLevels: { L: "B1", R: "B1", S: "A2", V: "B1", W: "B1" },
  writingText: null,
  recommendation: {
    hex: "#F5178C",
    why: "Con tu nivel B1 te conviene reforzar tu inglés del día a día con CelsTV.",
    name: "CelsTV",
    path: null,
    emoji: "📺",
    product: "celstv",
  },
};

test("evaluation: welcome → questions → writing → results", async ({ page }) => {
  test.setTimeout(240_000);
  let finishCalls = 0;
  if (!ALLOW_EMAIL) {
    await page.route("**/functions/v1/evaluation", async (route) => {
      let action = "";
      try {
        action = (route.request().postDataJSON() as { action?: string })?.action ?? "";
      } catch {
        /* multipart (speaking): pass through */
      }
      if (action !== "finish") return route.continue();
      finishCalls++;
      await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ result: RESULT }) });
    });
  }

  await page.goto("/evaluacion");
  await page.fill("#eval-name", "Ana Prueba");
  await page.getByRole("button", { name: /Comenzar mi evaluación/ }).click();
  const goal = page.getByRole("button", { name: /Para mi trabajo/ });
  const limited = page.getByText("Vuelve a intentarlo en un rato");
  await expect(goal.or(limited)).toBeVisible();
  test.skip(await limited.isVisible(), "This IP already started 3 evaluations in the last hour (rate limit)");
  await goal.click();

  // Every screen of the test is one of these; wait for one before deciding (the AI grade takes a moment).
  const anyStep = page
    .locator('input[type="email"], textarea, button[aria-pressed], div.leading-loose > button')
    .or(page.getByRole("button", { name: /Empezar sección|^Continuar|Omitir \(sin/ }))
    .or(page.getByText("Toca las palabras en orden"));
  let answered = 0;
  for (let guard = 0; guard < 90; guard++) {
    await expect(anyStep.first()).toBeVisible({ timeout: 60_000 });
    if (await page.locator('input[type="email"]').count()) break;
    if (await page.getByRole("button", { name: /Empezar sección/ }).count()) {
      await page.getByRole("button", { name: /Empezar sección/ }).click();
      continue;
    }
    if (await page.getByRole("button", { name: /^Continuar/ }).count()) {
      await page.getByRole("button", { name: /^Continuar/ }).click();
      continue;
    }
    if (await page.locator("textarea").count()) {
      await page.fill("textarea", "Last summer I visited Oaxaca with my family. We ate mole and walked around the city. I want to go back next year.");
      await page.getByRole("button", { name: /Enviar a la IA/ }).click();
      await expect(page.locator("textarea")).toHaveCount(0, { timeout: 60_000 });
      continue;
    }
    if (await page.getByRole("button", { name: /Omitir \(sin/ }).count()) {
      await page.getByRole("button", { name: /Omitir \(sin/ }).click();
      continue;
    }
    // The pool of words still to place (the dashed row above holds the placed ones).
    const tiles = page.locator("div.mt-3.flex.flex-wrap.gap-2:not(.border-dashed) > button");
    if (await page.getByText("Toca las palabras en orden").count()) {
      while (await tiles.count()) await tiles.first().click();
    } else if (await page.getByText("Toca la palabra incorrecta").count()) {
      await page.locator("div.leading-loose > button").nth(1).click();
    } else {
      await page.locator("button[aria-pressed]").first().click();
    }
    await page.getByRole("button", { name: "Confirmar" }).click();
    answered++;
  }
  expect(answered, "questions answered").toBeGreaterThan(10);

  await page.fill('input[type="email"]', `e2e-eval-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /Ver mis resultados/ }).click();
  await expect(page.locator("div.text-6xl.font-extrabold").first()).toHaveText(/^(A1|A2|B1|B2|C1|C2)$/);
  if (!ALLOW_EMAIL) {
    expect(finishCalls).toBe(1);
    await expect(page.locator("div.text-6xl.font-extrabold").first()).toHaveText("B1");
  }
  await expect(page.getByText(/CelsTV|CelsBSNS|CelsUS|CelsGLOBAL/).first()).toBeVisible();
});
