# Database security notes

Last review: 2026-10-18, batch 3 §1, from the Supabase advisors.

## Functions signed-in students can call

Each was checked for three things:
- it filters on the caller (`(select auth.uid())`);
- it never takes a user id as an argument;
- it has `set search_path = ''`.

| Function | Runs as | Note |
|---|---|---|
| `can_use_ai_tools()` | **invoker** (was definer) | Calls `private.is_staff()` and `private.has_course_access()`, which are definer helpers that check the caller. It needs nothing the student can't already read. |
| `my_evaluation_history()` | definer | Reads `eval_sessions`, which has no student policy (service-only). It filters `user_id = (select auth.uid())` and returns only the date and level. |
| `my_new_badges()` | definer | Awards badges (`private.award_badges`) and marks them seen in `gamification`, which students can't update. It uses only `(select auth.uid())`, never an argument. |
| `my_resume_reviews()` | definer | Students can't read `resume_reviews`. The function hides the result and the original text until `unlock_at`. It now uses `(select auth.uid())`. |
| `record_lesson_progress(p_lesson, p_part, p_finish)` | definer | Writes `progress` and the `gamification` XP and streak, which students must not set themselves. It checks the lesson is published, not teacher-only, and that the caller has access, and that the part belongs to the lesson. The user is always `(select auth.uid())`. |
| `renew_offline_downloads(p_device)` | **invoker** (was definer) | Only updates the caller's own `offline_downloads` rows, which the student's own RLS already allows. It re-checks course access. |

`log_client_error(...)` (added in batch 3 §4) is also definer and is callable by visitors on purpose, so any page can report a crash. It only inserts into `client_errors`, caps reports at 20 per browser session per day and 5,000 per hour overall, and truncates long fields. Nobody but staff can read the table.

The advisor will keep flagging the five that stay definer. That's expected, because they're meant to be called by students.

## Tables with RLS on and no policies (service-only, on purpose)

Only the service role (Edge Functions, cron) reads or writes these. With no policy, the browser can't reach them at all.

| Table | Used by |
|---|---|
| `audio_jobs` | Cowork's audio pipeline (`generate-audio`, `pg_net`). Don't touch. |
| `job_tokens` | One-time tokens for the import and audio jobs. Don't touch. |
| `stripe_events` | `stripe-webhook`: deduplicates Stripe events. |
| `eval_rate_limits` | `evaluation`: evaluations per IP per hour. |
| `eval_sessions` | `evaluation`: in-progress free evaluations. Students see their history only through `my_evaluation_history()`. |
| `ebook_source_text` | E-book import source text (staff tooling). |

`private.civics2025_staging`, `private.teacher_guides_staging` and `public.handoff_files` were leftovers and were dropped on 2026-10-18.

## Policies

- `auth.uid()` in policies is always wrapped as `(select auth.uid())`, so it is evaluated once per query.
- The goal is one permissive policy per table, action and role: staff or admin access is ORed with the owner or catalog rule.
- Done on 2026-10-18 for 28 tables (migration `20261018230415`). `leads` and `import_logs` keep their single `admin_all` policy, since there's nothing to merge.
- `supabase/tests/rls-visibility.sql` counts the rows a visitor, a student, an administrator and the super admin can see in each table. Run it before and after any policy change.

## Launch checklist (dashboard settings, for Matt)

- **Leaked-password protection:** Auth → Providers → Email → "Prevent use of leaked passwords".
- **Auth connection strategy:** the advisor suggests a percentage instead of a fixed 10 connections (Settings → Database → Connection pooling → Auth). Optional.
- **Edge Functions to delete** (no API for it here):
  - `ebook-signed-url` and `import-designrr-ebooks` (now return 410);
  - `import-celsaudio`, `import-media` and `handoff-upload` (already stubbed);
  - `secret-check` and `debug-ip-headers`. These look like one-off debug tools; check them before deleting.
- **`pg_net` in the `public` schema:** leave it. Cowork's audio and image pipelines depend on it.
