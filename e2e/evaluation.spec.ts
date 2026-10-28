// The free English evaluation, start to results. The questions, the AI-graded writing and the
// session are real. The last call ("finish") emails the results to the address typed in, so it is
// answered in the browser with a fixture unless E2E_ALLOW_EMAIL=1. Speaking is skipped (the
// "Omitir esta parte" link), as a visitor without a microphone would.
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ result: RESULT }),
      });
    });
  }

  await page.goto("/evaluacion");
  await page.fill("#eval-name", "Ana Prueba");
  await page.getByRole("button", { name: /Comenzar mi evaluación/ }).click();
  const goal = page.getByTestId("ev-goal").first();
  const limited = page.getByText("Vuelve a intentarlo en un rato");
  await expect(goal.or(limited)).toBeVisible();
  test.skip(await limited.isVisible(), "This IP already started 3 evaluations in the last hour (rate limit)");
  await goal.click();
  await page.getByTestId("ev-continue").click();

  // Every screen of the test is one of these; wait for one before deciding (the AI grade takes a moment).
  const by = (id: string) => page.getByTestId(id);
  const anyStep = page
    .locator('input[type="email"], textarea:not([disabled])')
    .or(by("ev-start-section"))
    .or(by("ev-continue"))
    .or(by("ev-speak-skip"))
    .or(by("ev-opt"))
    .or(by("ev-tile"))
    .or(by("ev-word"));
  let answered = 0;
  for (let guard = 0; guard < 90; guard++) {
    await expect(anyStep.first()).toBeVisible({ timeout: 60_000 });
    if (await page.locator('input[type="email"]').count()) break;
    if (await by("ev-start-section").count()) {
      await by("ev-start-section").click();
      continue;
    }
    if (await by("ev-continue").count()) {
      await by("ev-continue").click();
      continue;
    }
    if (await page.locator("textarea").count()) {
      await page.fill("textarea", "Last summer I visited Oaxaca with my family. We ate mole and walked around the city. I want to go back next year.");
      await by("ev-write-send").click();
      await expect(page.locator("textarea")).toHaveCount(0, { timeout: 60_000 });
      continue;
    }
    if (await by("ev-speak-skip").count()) {
      await by("ev-speak-skip").click();
      continue;
    }
    if (await by("ev-tile").count()) {
      // Unscramble: place every word of the pool (the dashed row holds the placed ones).
      while (await by("ev-tile").count()) await by("ev-tile").first().click();
    } else if (await by("ev-word").count()) {
      await by("ev-word").nth(1).click();
    } else {
      await by("ev-opt").first().click();
    }
    await by("ev-next").click();
    answered++;
  }
  expect(answered, "questions answered").toBeGreaterThan(10);

  await page.fill('input[type="email"]', `e2e-eval-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /Ver mis resultados/ }).click();
  const level = page.locator('[data-testid="ev-level"] b');
  await expect(level).toHaveText(/^(A1|A2|B1|B2|C1|C2)$/);
  if (!ALLOW_EMAIL) {
    expect(finishCalls).toBe(1);
    await expect(level).toHaveText("B1");
  }
  await expect(page.getByText(/CelsTV|CelsBSNS|CelsUS|CelsGLOBAL/).first()).toBeVisible();
});
