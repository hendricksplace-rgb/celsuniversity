# CelsU — Latin American Media

The CelsU website and student app in one Next.js project, backed by Supabase. It replaces the Base44 app (`6a4cfadfe1f30bc41a96d740`).

- **Hosting:** Vercel project `celsuniversity` (team F2F). Every push to `main` deploys to production.
- **Backend:** Supabase project `celsu-lam` (ref `pbpnhsgygwqxnkklhyuz`): Postgres with row-level security, Auth, Storage.
- **Language:** Spanish is the default UI. English is a toggle (the `EN`/`ES` button), stored in the `celsu_lang` cookie and in `profiles.preferred_language`.

## House rules

1. **Self-contained.** Everything the app needs (files, images, PDFs, audio, fonts) lives in this repo or in Supabase Storage. No third-party CDNs. Fonts are self-hosted by `next/font`.
2. **Videos are the only exception.** Public videos go on YouTube. Paid-only videos will go on Mux or Bunny (not chosen yet).
3. **No keys in code.** All configuration comes from environment variables. See `.env.example`.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                  # http://localhost:3000
```

Checks to run before pushing:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

## Environment variables

| Name | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | `https://pbpnhsgygwqxnkklhyuz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel + `.env.local` | Browser-safe `sb_publishable_…` key; RLS protects the data |
| `NEXT_PUBLIC_SITE_URL` | optional | Base URL for auth email links. If unset, it comes from the request host |
| `SUPABASE_SECRET_KEY` | **local only**, migration script | Bypasses RLS. Never add it to the app or to `NEXT_PUBLIC_*` |
| `BASE44_APP_ID`, `BASE44_API_KEY` | **local only**, migration script | Read access to the old Base44 app |

## Project layout

```
src/
  app/
    page.tsx               marketing home (/)
    cursos/                public course catalog (/cursos)
    (auth)/entrar          sign in (/entrar)
    (auth)/registro        sign up (/registro)
    auth/callback          email-confirmation + OAuth code exchange
    app/                   student area (/app), needs a signed-in user
  components/SiteHeader    nav, auth state, language toggle
  lib/
    supabase/              browser, server and middleware clients (@supabase/ssr)
    i18n/                  es/en dictionaries; getDictionary() on the server
    actions.ts             server actions: sign in/up/out, Google, language
  middleware.ts            refreshes the session; guards /app
supabase/migrations/       schema history, recreated from the live database
scripts/migrate-base44/    one-off Base44 → Supabase data + file migration
```

## Auth

Supabase Auth with email + password and Google. Sign-up creates a row in `profiles` through the `on_auth_user_created` trigger. New users get the role `individual_student`. Only admins can change `role` or `organization_id` (`guard_profile_update` trigger).

In the Supabase dashboard (Authentication → URL Configuration), set:

- **Site URL:** the production domain
- **Redirect URLs:** `https://<domain>/auth/callback`, `https://*-f2-f1.vercel.app/auth/callback` (previews), `http://localhost:3000/auth/callback`

Google sign-in also needs the Google provider turned on under Authentication → Providers.

## Database

`supabase/migrations/` matches what is applied to `celsu-lam` (checked against `supabase_migrations.schema_migrations`):

| Version | Name | What it does |
| --- | --- | --- |
| 20261017194309 | core_schema | 26 tables, enums, indexes, `updated_at` triggers, `renew_offline_downloads` |
| 20261017194328 | security | RLS + policies on every table, storage buckets and storage policies |
| 20261017194346 | move_helpers_to_private_schema | moves `is_admin`, `is_staff`, `has_course_access`, … to the `private` schema |
| 20261017225042 | course_layouts | allows the `ipd_sections` and `citizenship_modules` layouts that Base44 courses use |
| 20261017230234 | staging_teacher_guides | `private.teacher_guides_staging`: the 38 Gamma teacher guides converted to HTML |

Make schema changes as **new** migration files. Don't edit the ones already applied.

Access model in short: anyone can read published programs, courses and modules. Lesson content (`content_blocks`, `resources`, `media_files`, `course-media` storage) needs `private.has_course_access(course_id)`: an active enrollment in the course or its program, or membership in an active class that has the course. Staff (teacher and up) see everything; admins can write everything.

### Storage

| Bucket | Public | Path convention |
| --- | --- | --- |
| `course-media` | no | `<course_id>/…`. Access is checked from the first path segment |
| `public-assets` | yes | marketing images, course covers |
| `user-uploads` | no | `<user_id>/…`. Each user can access only their own folder |

### Offline downloads

`offline_downloads` records which modules each device has saved. The client calls `rpc('renew_offline_downloads', { p_device })` when it comes online. That renews every download for 7 days and returns `allowed = false` for any module the user has lost access to, so the client can delete it.

### TypeScript types

Generate the database types after any schema change:

```bash
npx supabase gen types typescript --project-id pbpnhsgygwqxnkklhyuz > src/lib/supabase/database.types.ts
```

(needs `npx supabase login`). Then pass `Database` to `createBrowserClient<Database>` / `createServerClient<Database>`.

## Base44 → Supabase migration

See [`scripts/migrate-base44/README.md`](scripts/migrate-base44/README.md).
