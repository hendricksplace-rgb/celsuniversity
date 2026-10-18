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
    app/cursos/[slug]      course outline (modules → lessons)
    app/lecciones/[id]     lesson page: renders every content block
    app/libros/[slug]      interactive e-book reader
    app/admin/libros       staff review page: publish / send back to review (admins only)
  components/SiteHeader    nav, auth state, language toggle
  components/lesson/       one renderer per block type, styled only with theme tokens
  components/reader/       e-book reader (client): screens, narration, interactive blocks, quiz, autosave
  components/OfflineSync   renews offline downloads and sends queued answers whenever the app is online
public/sw.js               service worker: serves downloaded e-books offline until they expire
  lib/
    supabase/              browser, server and middleware clients (@supabase/ssr)
    i18n/                  es/en dictionaries; getDictionary() on the server
    actions.ts             server actions: sign in/up/out, Google, language
    access.ts              viewer + role, canAccessCourse() (mirrors private.has_course_access)
    storage.ts             storage://bucket/path → short-lived signed URL, after the access check
    themes.ts              course → program theme (celstv, celsbsns, celsus, celsglobal)
    ebook-format.ts        TypeScript types for the e-book format (screens, 20 block types, quiz)
    offline.ts             offline downloads: Cache Storage, manifest, offline_downloads, answer queue
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
| 20261017230234 | staging_teacher_guides | `private.teacher_guides_staging`: the 38 Gamma teacher guides converted to HTML (now copied into `content_blocks`; the table can be dropped) |
| 20261017235047 | enable_pg_net | `pg_net` extension |
| 20261017235906 | staging_ebook_text | `public.ebook_source_text`: temporary extracted text of the designrr PDFs for the CelsBook redesign |
| 20261018001216 | ebooks_reader_content | `public.ebooks`: interactive e-book content (from Cowork) |
| 20261018003317 | ebook_answers | `public.ebook_answers`: each student's own answers in an e-book. **Owner-only**: no staff or admin read |
| 20261018020242 | evaluations_archive_and_version | `evaluations.archived` + `test_version`; archives the three 2008-bank exams (Cowork) |
| 20261018021938 | audio_jobs_queue | `audio_jobs` queue and `job_tokens`, service role only (Cowork) |
| 20261018022042 | apply_audio_jobs_fn | `private.apply_audio_jobs()`: writes generated audio into exam questions and e-book narration (Cowork) |
| 20261018022948 | kick_audio_fn | `private.kick_audio()`: calls the `generate-audio` edge function (Cowork). **Differs from live in one value:** the anon key is replaced by a placeholder |
| 20261018025745 | tighten_eval_read | `private.evaluation_course()`; evaluations and their questions readable only by staff or students with course access; archived evaluations hidden from students (Cowork) |
| 20261018025752 | guard_profile_evaluation_fields | `guard_profile_update`: only staff change `evaluation_level` / `evaluation_skills` / `evaluation_date`; role and organization checks apply to signed-in users only, so server-side changes work (Cowork) |
| 20261018025809 | kick_audio_from_vault | `private.kick_audio()` reads the anon key from Vault secret `supabase_anon_key` (Cowork) |

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

### Lesson pages and files

Lesson content stores files as `storage://<bucket>/<path>`. Raw Storage URLs never appear in the database or the HTML. On each request, `src/lib/storage.ts` does the following:

1. Collects every `storage://` reference in the lesson's blocks.
2. Resolves them for the signed-in viewer:
   - `public-assets` → public URL.
   - `course-media` → only paths inside the lesson's `<course_id>/` folder, and only if `canAccessCourse()` passes (staff, an active enrollment in the course or its program, or an active class). Then it signs a 10-minute URL with the **viewer's own session**, so Storage RLS checks access a second time.
   - `user-uploads` → only the viewer's own `<user_id>/` folder.
3. Renders anything not resolved as "not available".

Block types: `text` (plain text, URLs and file links made clickable), `image`, `audio`, files/PDFs, e-books (`data.ebook_pdf` and CelsBook flipbooks: open/download buttons plus an inline viewer on desktop), `teacher_guide` (sanitized HTML, staff only; RLS already hides these from students), `video` (placeholder until a host is chosen; YouTube is embedded through youtube-nocookie), and the interactive types (`src/components/lesson/activities/`):

- `flashcard`: tap to flip, recorded audio, filter by words / verbs / phrases, shuffle.
- `quiz` and `celstv_quiz`: one question at a time with instant feedback, then a score. CelsTV questions can be text, listening, image or sound choices.
- `grammar`: a stepper through the exercises. Build the sentence (tap words in order), choose the sentence, fill the blanks, funics (tap a word to hear it), listen and read, and pick the recording.
- `flipbook`: CelsBook pages one at a time, with thumbnails; this works on phones, unlike inline PDFs.

Activities are practice only: answers aren't saved yet (`progress` has `quiz_score` for that). Each block gets only its own signed URLs. Media is loaded only from our Storage, or from inline `data:audio/` in the migrated content.

### Interactive e-books

`/app/libros/<slug>` renders a row of `public.ebooks` in its program's theme (`ebooks.program`).

- **Who sees what:** RLS shows published books to students with course access. Staff also see `draft` and `review` books, with a preview banner and the review notes.
- **Structure:** each book is a list of screens (`kicker`, `title`, `minutes`, `narration {script, audio}`, `blocks`), then the quiz, then a finish page with related books and the original PDF.
- **Block types:** `src/lib/ebook-format.ts` lists all 19 types, written from the content loaded on 18 Oct 2026.
  - Read-only: `para quote tip list keys steps expand whatif glossary phrases say activity`.
  - The student fills in: `checklist notes reflect fields plan practice myth`.
- **Pronunciation:** `phrases`, `glossary` and `say` have 🔊 buttons that use the device's own speech voices, so nothing leaves the browser.
- **Saving:** answers autosave about a second after each change, straight from the browser to `ebook_answers` (RLS: the student's own row only). Keys are `"<screen id>:<block index>"` and `"quiz:<n>"`, and `last_screen` lets the reader resume where the student stopped.
- **Lesson pages:** an e-book block whose PDF has an interactive version visible to the viewer gets a "Leer versión interactiva" button.
- **`compare` block:** shows the "Así no" text; the student taps to reveal "Mejor así".
- **Narration:** `narration.audio` plays in the screen header. When `narration.wt` (word start times) has one entry per word of the script, the script highlights each word as it's spoken.
- **Pronunciation:** glossary and phrases items play their recorded `audio` when present, and fall back to the device voice otherwise.

#### Review and publish

`/app/admin/libros` (linked in the header for staff) lists every book with its status, review notes, a preview link and Publish / Volver a revisión. All staff can open it. Only admins (super_admin, director, administrator) can change a status, and the `ebooks.admin_all` RLS policy enforces that in the database. Students only ever see `published` books.

#### Offline reading

"Descargar para leer sin conexión" in the reader stores the book's page, the app code it needs and its audio (never video, never the PDF) in Cache Storage. It also records the download in `offline_downloads` (per module and device, 7 days).

- `public/sw.js` serves the downloaded page only when the network fails, and only before `expiresAt`. After that it shows "Tu descarga venció".
- `OfflineSync` (root layout) runs on load, on `online` and when the tab becomes visible. It calls `renew_offline_downloads(device)`, which resets the 7 days and deletes any book the student has lost access to. It also sends answers saved on the device while offline.
- Signing out, or a different account on the same device, wipes the downloads on the next sync.

#### Narration audio

Audio is generated in Supabase, not in this repo: the `audio_jobs` queue, the `generate-audio` edge function (ElevenLabs key in the function secret `ELEVENLABS_API_KEY`), `private.kick_audio()` to run it and `private.apply_audio_jobs()` to write `audio` + `wt` into `ebooks.screens[].narration` and `evaluation_questions.data.audio`. Paths are `storage://course-media/...` and go through the signed-URL helper like any other file.

### CelsUS 2025 civics exams

- **Look:** the CelsUS theme is navy `#0E2A4F` / `#194876`, gold `#FFD24D` / `#B8901F`, ivory `#F4F1E8`, Source Serif 4 for headings and questions, Plus Jakarta Sans for the interface. Navy panels (`.cx-navy`) carry a faint guilloche; the exam pieces (`.cx-*`) are in `globals.css`.
- **Where:** a lesson's `evaluation` block (`data.evaluation_id`) links to `/app/examen-civico/<id>`. `/app/examen-civico` is the start screen: the three exams with their rules and last result, progress by section, and a card linking the official pages for the 8 questions whose answers change.
- **Which exams:** `evaluations` with `test_version = '2025'` and `archived = false`. English (mock interview) and Spanish: ask 20, pass 12. 65/20 (the 20 starred questions, large print): ask 10, pass 6. `evaluations` is readable by any signed-in user, so `src/lib/civics-server.ts` checks course access before sending questions or signing audio.
- **Mock interview (English):** the officer plays `data.audio.q` (gold waveform while speaking); the question text highlights each word with `q_wt` and can be hidden. Answers by voice (Web Speech, `en-US`) count when they contain `answers_en` (parentheses optional) or `keywords_en`; `multi` questions need `data.need` different answers. "Ver opciones" shows `options_en` shuffled (pick exactly `need`). After each question: accepted answers with ▶ `audio.a_en`, and "Para entenderlo" (`explain_es` + `hint_es`).
- **Spanish exam:** same rules, multiple choice with `options_es` shuffled, ▶ the Spanish question and "Escuchar en inglés".
- **Stop rule:** as USCIS, the exam ends as soon as the result is decided (12 right, or 9 wrong; 6 / 5 for 65/20). The end screen is a gold seal when passed. Each attempt goes to `evaluation_attempts` (the student's own history).
- **Study cards:** question in Spanish, ▶ "Escuchar en inglés" (`audio.q_en`), then the answer in ES + EN, the explanation and the hint, with "Lo sé / Repasar". Progress is per student, by question number, in `progress.flashcard_state` on every 2025 exam lesson (kept identical, so it is shared by the three exams).
- **`check_online` questions** (8; answers depend on the state or the date) are never graded: they show as a link card (`data.link`, note).
- Speech recognition works in Chrome, Edge and Safari; elsewhere the options are the way to answer.

### Program themes

Course and lesson pages wrap their content in `data-theme="…"`. Components use only the tokens defined in `globals.css` (`--t-bg`, `--t-surface`, `--t-text`, `--t-muted`, `--t-accent`, `--t-link`, `--t-border`, `--t-radius`, `--t-card-top`, `--t-font`, `--t-heading`, `--t-heading-weight`). Adding a brand means adding one token block.

| Theme | Courses | Look |
| --- | --- | --- |
| `celstv` | CelsTV | playful: dark, rainbow accent bar, Poppins, round corners |
| `celsbsns` | English For Business | professional navy on white, Inter, tight corners |
| `celsus` | CelsUS Para Ciudadanía | formal, low tones: parchment, serif headings, burgundy rule |
| `celsglobal` | CV, interviews, finances, Visa TN | muted sage and warm gray, for adult professionals |

The same themes are used on the course catalog (`/cursos`), the student dashboard (`/app`), course and lesson pages, the e-book reader (`ebooks.program`) and the review page.

The course → theme map lives in `src/lib/themes.ts`, keyed by slug. `themeForCourse()` already reads a `courses.theme` column first, so the map can move into the database later.

### TypeScript types

`src/lib/supabase/database.types.ts` is generated from the live schema, and all clients are typed with it (`Client` in `src/lib/supabase/types.ts`). Regenerate it after any schema change, with the Supabase MCP `generate_typescript_types` or:

```bash
npx supabase gen types typescript --project-id pbpnhsgygwqxnkklhyuz > src/lib/supabase/database.types.ts
```

(needs `npx supabase login`).

## Base44 → Supabase migration

See [`scripts/migrate-base44/README.md`](scripts/migrate-base44/README.md).
