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

- **Done:** the policy merge and the staging-table drops. Matt approved them and ran them in the SQL editor on 2026-10-18; see `supabase/migrations/20261018230415_rls_one_policy_per_action_and_cleanup.sql`.
- **Edge Functions to delete in the dashboard:** `ebook-signed-url` and `import-designrr-ebooks`. The MCP can't delete functions, so they now return 410. Also `import-celsaudio`, `import-media` and `handoff-upload` (stubbed earlier). `secret-check` and `debug-ip-headers` look like leftover debug tools too; Matt to confirm.
- **Launch checklist:** turn on leaked-password protection (Auth settings). The full list is in `docs/security.md`.

## Constructor de cursos

- **Who can edit.** The builder opens for super_admin, administrator and director. That's who the existing content policies (`admin_all` → `private.is_admin()`) let write. Teachers can't edit courses.
  - Should coaches or teachers be able to edit their own courses? That would need new policies.
- **File size cap.** The `course-media` bucket has no `file_size_limit` of its own. The builder caps uploads at 50 MB, which is Supabase's default global limit.
  - Large lesson videos should go to Vimeo, YouTube or Mux/Bunny instead.
  - If Matt wants a different cap, set it on the bucket and in `MAX_UPLOAD_MB` (`src/lib/builder.ts`).
- **Deleting content.** Deleting a module or lesson is refused once any student has progress in it, because the delete would cascade and erase that progress. Unpublish it instead.
  - Courses can only be deleted while they're drafts with no enrollments.
- **Undo scope.** "Deshacer último cambio" works per lesson: block edits, block adds/deletes/reorders, and the lesson's own title, status and teacher-only flag.
  - Module and course changes are recorded in `admin_audit_log` but have no undo button.
- **MP4 links.** Video blocks now also play a direct `https://….mp4` link (for videos hosted outside, e.g. on Bunny or Mux). Previously only YouTube, Vimeo, Storage and Wistia played.
