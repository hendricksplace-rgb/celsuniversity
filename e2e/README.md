# End-to-end tests (Playwright)

Run against https://nuevo.celstv.com by default, on a phone (360 px) and a desktop (1440 px).

```bash
# all tests, both sizes (secrets from .env.local)
npm run e2e
# against the local dev server
E2E_BASE_URL=http://localhost:3123 npm run e2e
# one file / one size
npx playwright test e2e/episode.spec.ts --project=phone
```

## What runs

| File | Covers |
|---|---|
| `auth.spec.ts` | Sign-up form validation; sign in (wrong and right password); password reset up to the email step; expired link screen |
| `evaluation.spec.ts` | The free evaluation from the welcome screen to the results (real questions and AI writing grade) |
| `episode.spec.ts` | CelsTV episode 1 and its 6 parts: CelsVideo, CelsCards, CelsBook, CelsCast (tap a line → audio moves), Grammar, Quiz with Amy's audio |
| `student-tools.spec.ts` | Finanzas e-book card opening at `ebook_screen`; the answer box saving; Cuenta → Preferencias toggles saving |
| `purchase.spec.ts` | Stripe test-mode purchase of CelsTV Standard by a new account → access to the course |

## Emails

Nothing sends an email by default:

- sign-up and password reset fill the forms but don't submit them;
- the evaluation's last call (which emails the results) is answered in the browser with a fixture result;
- the purchase claims the receipt and welcome emails in `email_outbox` before paying.

Set `E2E_ALLOW_EMAIL=1` to submit sign-up/reset for real and let the evaluation send its results email (to `@example.com` addresses).

## Accounts

`global-setup.ts` creates or refreshes `e2e-student@example.com` (enrolled in CelsTV and Finanzas, password reset every run) with the service key, and stores its session in `e2e/.auth/` (git-ignored). The purchase test creates `e2e-buyer-<timestamp>@example.com`; `global-teardown.ts` deletes those and resets the student's answers and preferences. Real students are never touched.

## Skips

- `purchase.spec.ts` skips while Stripe keys aren't configured, and never pays when Checkout isn't in test mode.
- `evaluation.spec.ts` skips if the runner's IP already started 3 evaluations in the last hour (the app's rate limit).

## CI (`.github/workflows/e2e.yml`)

Runs on every push to `main` (after waiting for the new deploy), every day at 12:00 UTC and on demand. Repository secrets it needs:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://pbpnhsgygwqxnkklhyuz.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | the publishable key (same as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SECRET_KEY` | the service (secret) key, for the test accounts |
| `E2E_PASSWORD` | optional; a fixed password for the test student |

The HTML report is uploaded as the `playwright-report` artifact.
