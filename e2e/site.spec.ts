// The public address (C-042): the old celstv.com (Gamma) paths 308 to their pages, unknown paths keep the friendly
// 404, and on celstv.com itself robots.txt and sitemap.xml are the real, indexable ones. No sign-in, no page errors.
import { expect, test } from "@playwright/test";
import { BASE_URL } from "./env";

const PRODUCTION = new URL(BASE_URL).hostname === "celstv.com";

// next.config.ts OLD_SITE
const OLD_GAMMA: [string, string][] = [
  ["/programa-pro-tn", "/celsglobal"],
  ["/politica-de-privacidad", "/privacidad"],
  ["/guia-de-progreso", "/evaluacion"],
  ["/app-download", "/app?instalar=1"],
];

test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "HTTP checks: one project is enough"));

for (const [from, to] of OLD_GAMMA) {
  test(`old Gamma path ${from} → 308 ${to}`, async ({ request }) => {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    const location = new URL(res.headers()["location"] ?? "", BASE_URL);
    expect(location.pathname + location.search).toBe(to);
    expect(location.host).toBe(new URL(BASE_URL).host);
  });
}

test("unknown paths keep the friendly 404", async ({ page }) => {
  const res = await page.goto("/esta-pagina-no-existe-c042");
  expect(res?.status()).toBe(404);
  expect((await page.locator("body").innerText()).length).toBeGreaterThan(20);
});

test("celstv.com serves the real robots.txt and sitemap.xml", async ({ request }) => {
  test.skip(!PRODUCTION, "only celstv.com is indexable (SITE_URL host + SITE_INDEXABLE=true)");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Allow: /");
  expect(robots).not.toMatch(/Disallow: \/\s*$/m);
  expect(robots).toContain("Sitemap: https://celstv.com/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBeGreaterThan(3);
  for (const l of locs) expect(l).toMatch(/^https:\/\/celstv\.com(\/|$)/);

  const home = await request.get("/");
  expect(home.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
});

test("www and nuevo.celstv.com 308 to celstv.com", async ({ request }) => {
  test.skip(!PRODUCTION, "the old hosts only matter for production");
  for (const host of ["https://www.celstv.com", "https://nuevo.celstv.com"]) {
    const res = await request.get(`${host}/celstv`, { maxRedirects: 0 });
    expect(res.status(), host).toBe(308);
    expect(res.headers()["location"], host).toMatch(/^https:\/\/celstv\.com\/celstv\/?$/);
  }
});
