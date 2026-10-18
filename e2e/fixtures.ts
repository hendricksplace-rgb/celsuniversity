import { test as base, expect, type Page } from "@playwright/test";
import { AUTH_FILE } from "./env";

/** Fails the test on any uncaught error in the page (console noise from third parties is ignored). */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await use(errors);
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});

/** Tests that run as the signed-in test student. */
export const studentTest = test.extend({ storageState: AUTH_FILE });

export { expect };

/** The text of the page's main area, whitespace collapsed. */
export const mainText = async (page: Page) => (await page.locator("main").innerText()).replace(/\s+/g, " ");
