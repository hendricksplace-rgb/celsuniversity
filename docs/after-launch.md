# After launch

Not needed for the October 19, 2026 switch. The order is roughly by value.

## Current students
- **No Kajabi import (Matt, 2026-10-18).** There's no Kajabi access, so current students sign up themselves with their usual email, and staff give them their program in **Admin → Estudiantes → Dar acceso** (`source = 'manual'`, logged in `admin_audit_log`).
- `scripts/migrate-students.mjs` is parked. It still works (dry run by default; `--apply` needs `MIGRATION_APPROVED=yes`) if a Kajabi export ever turns up.

## Product and content
- **CelsTV episodes 3–8 have no CelsVideo.** It's a content gap for Cowork; the part shows "llega muy pronto".
- **Testimonials.** The section stays hidden until Matt sends real ones (`celsu-website-spec.md`).
- **Hendricks Law button (CelsUS).** It's a mailto to hola@celstv.com until Matt sends the URL.
- **Share-image copy.** The prices and short lines on the share images are fixed text in `src/components/site/og.tsx`. Update them if `products` prices change.
- **Legal review.** The bracketed `[LAWYER…]` and `[MATT…]` notes in `/privacidad` and `/terminos` are hidden on the site but still open.

## Course builder
- Should teachers edit their own courses? That needs new database permissions; today only admins can.
- Undo works per lesson. Module and course changes are logged, but there's no undo button for them.
- Set an explicit file-size limit on the `course-media` bucket. Today it's Supabase's default of 50 MB.

## Performance
- **Course page and episode screen** score 84–87 on mobile Lighthouse. Most of the cost is server time from several Supabase queries; merge them into one RPC (`src/lib/course-page.ts`).
- **Marketing pages render on every request** because the root layout reads the language cookie. Making them static (for example, with `/en` routes) would cut first-byte time further. Prices and the episode list are already cached for an hour.
- **Unused indexes (19).** Review them with the advisor after a month of real traffic.

## Operations
- **`evaluation` Edge Function.** Wire it to `logFunctionError` the next time it's redeployed for another reason.
- **Delete retired Edge Functions** in the dashboard:
  - `ebook-signed-url`, `import-designrr-ebooks`, `import-celsaudio`, `import-media`, `handoff-upload`;
  - after checking, `secret-check` and `debug-ip-headers`.
- **Auth connection strategy:** switch to percentage (advisor INFO, Settings → Database).
- **CI end-to-end tests:** add the GitHub secrets `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and optionally `E2E_PASSWORD` and `STRIPE_TEST_SECRET_KEY`. CI then runs the suite after each deploy and daily.
- **Test accounts to remove** once nobody needs them:
  - `celsu-smoke-coach@example.com`;
  - `celsu-smoke-kit@example.com`'s Finanzas enrollment;
  - `delivered@resend.dev`, which holds a resume review.
