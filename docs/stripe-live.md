# Stripe: switching from test mode to live

Switch day, October 19, 2026. Matt (or Cowork) does every step here in the Stripe and Supabase dashboards. Code changes nothing, because nothing about Stripe lives in the repo.

## How the integration works (why the list is short)

- **No price IDs.** The `checkout` Edge Function builds each Checkout line from the `products` table at the moment of purchase (`price_data` with the name and amount in USD). Stripe creates the product on the fly.
  - There's nothing to create or copy into live mode.
  - To change a price, edit `products.price_usd_cents` (and `installments` for the CelsGLOBAL plan).
- **No publishable key.** Buyers pay on Stripe's hosted Checkout page and the app only redirects there.
  - Nothing in the app reads `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
  - It's harmless to set in Vercel, but it isn't needed in test or live mode.
- **Only two Edge Functions talk to Stripe:**
  - `checkout` starts the payment;
  - `stripe-webhook` records it, opens the access and sends the emails.

  `delete-account` also uses the secret key, to cancel a remaining installment plan.
- **Return addresses come from the `SITE_URL` Supabase secret:**
  - success: `SITE_URL/bienvenida?session_id=…`
  - cancel: `SITE_URL/pago-fallido?producto=…`

## 1. Keys and secrets that change

| Where | Name | Test value (now) | Live value (switch day) |
|---|---|---|---|
| Supabase → Edge Functions → Secrets | `STRIPE_SECRET_KEY` | `sk_test_…` | `sk_live_…` (Stripe → Developers → API keys, live mode). A restricted key also works if it can write Checkout Sessions, Subscriptions and Subscription Schedules, and read PaymentIntents, Charges and Invoices. |
| Supabase → Edge Functions → Secrets | `STRIPE_WEBHOOK_SECRET` | `whsec_…` of the test endpoint | `whsec_…` of the **live** endpoint created in step 2. Each endpoint has its own secret. |
| Supabase → Edge Functions → Secrets | `SITE_URL` | `https://nuevo.celstv.com` | `https://celstv.com` |
| Vercel → Project → Environment Variables (Production) | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional | optional (not used) |

- Supabase secrets apply to the Edge Functions right away. No redeploy is needed.
- Don't put any of these keys in the repo or in a `NEXT_PUBLIC_*` variable (except the publishable key).

## 2. Live webhook

Stripe → Developers → Webhooks → **Add endpoint**, with the dashboard in **live** mode:

- **URL:** `https://pbpnhsgygwqxnkklhyuz.supabase.co/functions/v1/stripe-webhook`
- **API version:** `2024-06-20`. The code is pinned to it; if Stripe offers only newer versions, pick the newest and tell Code so it can check the fields used.
- **Events:** select exactly these four.

| Event | What the app does |
|---|---|
| `checkout.session.completed` | Finds or creates the buyer's account, creates one enrollment per program with its own `expires_at`, logs the payment, and marks the order paid. That sends the receipt and welcome emails. For the CelsGLOBAL plan, it also sets the subscription to end after the 5th payment. |
| `invoice.paid` | Logs each later CelsGLOBAL installment, and reactivates access if it was paused. |
| `invoice.payment_failed` | Keeps access while Stripe retries; after the last retry, pauses it. |
| `charge.refunded` | On a full refund, closes the access (enrollments → `refunded`), marks the order refunded and cancels any remaining plan. Progress is kept. |

Copy the endpoint's signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` (step 1). Keep the test endpoint as it is; it only receives test events.

## 3. Stripe account settings (live mode)

- **Account activated** for live payments (business details, bank account).
- **Statement descriptor:** something buyers recognize, e.g. `CELSU`.
- **Customer emails** (Settings → Customer emails): CelsU sends its own Spanish receipt.
  - Turn off "Successful payments" if you don't want buyers to get both.
  - Keep "Refunds" if you want Stripe's refund notice.
- **Subscriptions → retries** (Smart Retries): this sets how long a failed CelsGLOBAL installment keeps access before it's paused.
- **Promotion codes:** Checkout accepts them (`allow_promotion_codes`). Test-mode coupons don't carry over; create the live ones you want.

## 4. Check after switching (one real, small purchase)

1. Buy the cheapest product with a real card, using your own email.
2. Check:
   - you land on `/bienvenida` and it says the access is active;
   - `/app` shows the course;
   - both emails arrive.
3. Check in Supabase:
   - `orders` (status `paid`);
   - `payments` (`checkout` row, last 4 digits);
   - `enrollments` (`expires_at` = today + the program's months).
4. Check the webhook endpoint in Stripe (live): `checkout.session.completed` delivered with 200.
5. Refund it in Stripe and check that the enrollment shows `refunded` and the course disappears from `/app`.
6. Check `/app/admin/errores` for any `stripe-webhook` errors.

## Rollback

Put the test values back in `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Checkout then creates test sessions again. Live orders already paid stay as they are.
