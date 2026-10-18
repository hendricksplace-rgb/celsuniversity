import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (e2e/README.md). Runs against nuevo.celstv.com unless E2E_BASE_URL says otherwise.
const baseURL = process.env.E2E_BASE_URL ?? "https://nuevo.celstv.com";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    locale: "es-MX",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // Amy's recordings play without a click; the interview tool records from a fake microphone.
      args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    },
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 780 }, browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
