// Sign up, sign in and password reset. Nothing here sends an email unless E2E_ALLOW_EMAIL=1:
// the sign-up and reset forms are filled and validated, then submitted only with that flag.
import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
import { ALLOW_EMAIL, CREDS_FILE } from "./env";

const creds = () => JSON.parse(readFileSync(CREDS_FILE, "utf8")) as { email: string; password: string };

test("sign up: the form validates, then creates the account (email only with E2E_ALLOW_EMAIL)", async ({ page }) => {
  await page.goto("/registro");
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
  await page.getByLabel("Nombre").fill("Prueba E2E");
  await page.getByLabel("Correo").fill(`e2e-signup-${Date.now()}@example.com`);
  const password = page.getByLabel("Contraseña");
  await password.fill("corta");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  // The browser blocks the submit: at least 8 characters.
  expect(await password.evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true);
  await expect(page).toHaveURL(/\/registro$/);
  await page.goto("/registro?error=weakPassword");
  await expect(page.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeVisible();

  test.skip(!ALLOW_EMAIL, "Submitting sends a confirmation email (set E2E_ALLOW_EMAIL=1 to include it)");
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Prueba E2E");
  await page.getByLabel("Correo").fill(`e2e-signup-${Date.now()}@example.com`);
  await page.getByLabel("Contraseña").fill(`Prueba-${Date.now()}`);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/registro\?sent=1|\/app/);
});

test("sign in: wrong password is refused, the right one opens the student area", async ({ page }) => {
  const { email, password } = creds();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("no-es-la-contraseña");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/error=invalid/);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test("password reset: link, email step, expired link screen", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page).toHaveURL(/\/recuperar$/);
  await expect(page.getByRole("heading", { name: "Recupera tu contraseña" })).toBeVisible();
  await page.getByLabel("Correo").fill(creds().email);
  await expect(page.getByRole("button", { name: "Enviar enlace" })).toBeEnabled();

  // A bad or expired link explains itself and offers another one.
  await page.goto("/nueva-contrasena?code=enlace-invalido");
  await expect(page.getByRole("heading", { name: "Este enlace ya venció" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir otro enlace" })).toHaveAttribute("href", "/recuperar");

  test.skip(!ALLOW_EMAIL, "Sending the reset link emails the test account (set E2E_ALLOW_EMAIL=1 to include it)");
  await page.goto("/recuperar");
  await page.getByLabel("Correo").fill(creds().email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText(/Si tu correo está registrado, te enviamos un enlace/)).toBeVisible();
});
