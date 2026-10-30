// Sign up, sign in and password reset (C-032 screens). Nothing here sends an email unless E2E_ALLOW_EMAIL=1:
// the sign-up and reset forms are filled and validated, then submitted only with that flag. The email-code
// sign-in (C-039) always emails, so only its "no account" answer is checked here (that one sends nothing).
import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
import { ALLOW_EMAIL, CREDS_FILE } from "./env";

const creds = () => JSON.parse(readFileSync(CREDS_FILE, "utf8")) as { email: string; password: string };

test("sign up: the checklist and errors guide the form, then it creates the account (email only with E2E_ALLOW_EMAIL)", async ({ page }) => {
  await page.goto("/registro");
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);
  await page.getByLabel("Tu nombre").fill("Prueba E2E");
  await page.getByLabel("Correo electrónico").fill(`e2e-signup-${Date.now()}@example.com`);
  await page.getByLabel("Crea una contraseña").fill("corta");
  await page.getByRole("button", { name: "Crear mi cuenta →" }).click();
  await expect(page.getByText("Tu contraseña necesita al menos 8 caracteres, con letras y números.")).toBeVisible();
  await expect(page).toHaveURL(/\/registro$/);

  test.skip(!ALLOW_EMAIL, "Submitting sends a confirmation email (set E2E_ALLOW_EMAIL=1 to include it)");
  const pw = `Prueba-${Date.now()}`;
  await page.getByLabel("Crea una contraseña").fill(pw);
  await page.getByLabel("Repite la contraseña").fill(pw);
  await page.getByRole("button", { name: "Crear mi cuenta →" }).click();
  await expect(page.getByText("Confirma tu correo").or(page.getByTestId("auth-ok"))).toBeVisible();
});

test("sign in: code first; no account says so; wrong password is refused, the right one opens the student area", async ({ page }) => {
  const { email, password } = creds();
  await page.goto("/entrar");
  await expect(page.getByRole("button", { name: "Enviarme un código →" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);

  await page.getByLabel("Correo electrónico").fill(`e2e-nadie-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Enviarme un código →" }).click();
  await expect(page.getByText("No encontramos una cuenta con ese correo.")).toBeVisible();

  await page.getByRole("button", { name: "Prefiero usar mi contraseña" }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("no-es-la-contraseña");
  await page.getByRole("button", { name: "Entrar →" }).click();
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar →" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });
});

test("password reset: link, email step, expired link screen", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Prefiero usar mi contraseña" }).click();
  await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page).toHaveURL(/\/recuperar$/);
  await expect(page.getByRole("heading", { name: "¿Olvidaste tu contraseña?" })).toBeVisible();
  await page.getByLabel("Correo electrónico").fill(creds().email);
  await expect(page.getByRole("button", { name: "Enviarme el enlace →" })).toBeEnabled();

  // A bad or expired link explains itself and offers another one.
  await page.goto("/nueva-contrasena?code=enlace-invalido");
  await expect(page.getByRole("heading", { name: "El enlace ya venció" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/recuperar");

  test.skip(!ALLOW_EMAIL, "Sending the reset link emails the test account (set E2E_ALLOW_EMAIL=1 to include it)");
  await page.goto("/recuperar");
  await page.getByLabel("Correo electrónico").fill(creds().email);
  await page.getByRole("button", { name: "Enviarme el enlace →" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
});
