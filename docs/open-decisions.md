# Open decisions

Items that need a decision from Matt or Cowork. Batch 3 (2026-10-18).

## Share images and error monitoring (batch 3 §3–4)

- **Share previews before the domain switch.** `metadataBase` is `https://celstv.com`, so every `og:image` URL points to celstv.com. That domain still serves the Gamma site until the DNS move, so links shared from nuevo.celstv.com show no image until then. The old static `/og/*.png` images had the same limitation. Options:
  - leave it, since it fixes itself at the switch;
  - or build the image URLs from `VERCEL_URL` / `NEXT_PUBLIC_SITE_URL` while keeping the canonical URLs on celstv.com.
- **Share image copy.** Each image uses the page's SEO title without the program prefix, plus one short line I wrote from the page description (for example "32 episodios con tarjetas, libro interactivo, audio y quiz. Desde $99 USD."). The prices on the images are fixed text, not read from `products`. They need updating by hand if a price changes. Cowork may want to review the lines.
- **`/privacidad`, `/terminos` and `/ayuda`** keep the static `/og/celsu.png`. The spec didn't list them.
- **Evaluation function not redeployed.** `logFunctionError` is wired into `checkout`, `stripe-webhook`, `send-email`, `ai-tools` and `delete-account`, and all five were redeployed. `evaluation` (56 KB of item bank) was left as deployed, so its failures still only go to the function logs. Wire it the next time that function is redeployed for another reason.
- **Retention.** Nothing deletes old rows from `client_errors` and `function_errors` yet. The admin page shows 7 days. Suggestion: a daily `pg_cron` delete of rows older than 30 days. Decide whether to add it.
- **Personal data in errors.** `client_errors` stores the route, the stack trace and the browser's user agent, and links the user id (set to null when the account is deleted). Consider mentioning error logs in the privacy notice.

## Database hardening (batch 3 §1)

- **Needs approval: merging the duplicate policies and dropping the leftover tables.** The Supabase connector asks a person to confirm any statement containing `DROP`. No one was there, so every attempt timed out and nothing was applied (each time it rolled back cleanly).
  - The SQL is ready in `supabase/manual/batch3-needs-approval.sql`:
    - one policy per action on 28 tables (fixes the 41 "multiple permissive policies" warnings);
    - drops `private.civics2025_staging`, `private.teacher_guides_staging` and `public.handoff_files`.
  - Each merged policy is the OR of the ones it replaces, so access doesn't change.
  - To apply it:
    1. run `supabase/tests/rls-visibility.sql`;
    2. apply the file and confirm the prompt;
    3. run the check again and compare;
    4. move the file into `supabase/migrations/`.
  - Code can do this in a session where Matt is present to confirm.
- **Edge Functions to delete in the dashboard:** `ebook-signed-url` and `import-designrr-ebooks`. The MCP can't delete functions, so they now return 410. Also `import-celsaudio`, `import-media` and `handoff-upload` (stubbed earlier). `secret-check` and `debug-ip-headers` look like leftover debug tools too; Matt to confirm.
- **Launch checklist:** turn on leaked-password protection (Auth settings). The full list is in `docs/security.md`.
