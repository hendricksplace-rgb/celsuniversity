# Base44 → Supabase migration

One-off copy of CelsU's course content from the Base44 app `6a4cfadfe1f30bc41a96d740` into the `celsu-lam` Supabase project. It is safe to re-run: rows are upserted on `legacy_id` (the Base44 id), and files already listed in `media_files` are skipped.

## What it migrates

| Base44 entity | Supabase table | Base44 count (17 Oct 2026) |
| --- | --- | ---: |
| Program | programs | 1 |
| Course | courses | 9 |
| ProgramCourse | program_courses | 7 |
| Module | modules | 90 |
| Lesson | lessons | 610 |
| ContentBlock | content_blocks | 534 |
| Resource | resources | 21 |
| Evaluation | evaluations | 3 |
| EvaluationQuestion | evaluation_questions | 207 |

Not migrated: users, enrollments, progress, gamification, leads, resume submissions and the other student data (a separate step, because each user needs a Supabase Auth account first). The `Setting` records are skipped too. They hold only evaluation rate-limit and session entries.

## Field mapping

- `order` → `sort_order`. `Module.type` → `kind`. `Course.orbit_style` → `layout`.
- `Lesson.visibility = teacher_only` → `teacher_only = true`. `ContentBlock.block_type = teacher_only` → `teacher_only = true`.
- `ContentBlock.content` → `body`. `settings` (a JSON string in Base44) is parsed and stored as `data.settings`, with `media_url` and `thumbnail_url` next to it in `data`.
- `EvaluationQuestion.*_json` strings are parsed into `data` (`options`, `correct`, `left`, `right`, `items`, `buckets`, `audio`), plus `accepted_answers`, `need_count` and `audio_url`.
- `Evaluation.source_subset_of` becomes a foreign key only when it holds a real evaluation id. Base44 also uses the tag `128_asterisked` there, which is recorded in the report and left empty.

## Files

Every URL anywhere in a record (top-level fields, HTML/Markdown bodies, nested JSON) is checked:

| URL | What happens |
| --- | --- |
| Base44 file (`media.base44.com/…`, `base44.app/api/apps/…/files/…`) or Kajabi CDN, not a video | Downloaded and uploaded to Storage, and the URL is rewritten. Each file gets a row in `media_files`. |
| Course content (blocks, resources, questions) | Goes to the private `course-media/<course_id>/<hash>_<name>`. The URL becomes `storage://course-media/<path>`, which the app turns into a signed URL for students who have access. |
| Catalog art (course/program covers, module artwork, launcher icons) | Goes to the public `public-assets/{covers,modules,icons}/…`. The URL becomes the public Storage URL. |
| Wistia audio (`.mp3` and other non-video files) | Copied like any other file (only videos may live outside). |
| Video (`.mp4 .mov .m4v .webm`, Wistia video, Vimeo) | **Not copied**, by rule. Listed in the report. `--download-videos <dir>` saves the Base44-hosted ones locally so they can be uploaded to Mux/Bunny or YouTube. |
| YouTube | Left as is (allowed). |
| Gamma teacher guides (38) | Converted to HTML `teacher_guide` blocks in Supabase after the first import. |
| designrr.page e-books | Left as is and listed in the report. They break the self-contained rule and still need replacing (e.g. export to PDF → flipbook). |

## Run it

1. Make sure the migrations in `supabase/migrations/` are applied (they are on `celsu-lam`).
2. Put these in `.env.local` (never commit them):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://pbpnhsgygwqxnkklhyuz.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_…        # Supabase → Project Settings → API Keys
   BASE44_APP_ID=6a4cfadfe1f30bc41a96d740
   BASE44_API_KEY=b44u_…                   # Base44 personal access token
   ```
   The token is sent as `Authorization: Bearer …`. For a legacy API key, set `BASE44_AUTH_HEADER=api_key`.
   Behind an HTTP proxy (e.g. Claude Code cloud sessions), also set `NODE_USE_ENV_PROXY=1` so Node's `fetch` uses it.
3. Dry run (reads Base44, plans the file copies, writes nothing):
   ```bash
   npm run migrate:base44 -- --dry-run
   ```
4. Real run:
   ```bash
   npm run migrate:base44
   # optional: also save Base44-hosted videos for re-hosting
   npm run migrate:base44 -- --download-videos ./videos
   ```
5. Read `scripts/migrate-base44/out/report.md`. Every row of the count table should show ✅. "Legacy URLs left" should be 0, and "Failed" should be 0. If not, re-run: finished files are skipped.

`--from-dir <dir>` reads `<Entity>.json` exports instead of calling the Base44 API (useful for testing). `--concurrency <n>` sets parallel downloads (default 6).

## Run log

**17 Oct 2026, production import into `celsu-lam`**

- Test (`--dry-run`) against the live Base44 API: every count matched, 0 skipped.
- Real run: all 9 tables match Base44 (1 / 9 / 7 / 90 / 610 / 534 / 21 / 3 / 207).
- Files: 2,977 / 2,977 in Storage (112 MB). One flashcard mp3 failed with a network error on the first pass and was picked up by a re-run. 0 old Base44/Kajabi file links remain.
- `apply-teacher-guides.sql`: 38 blocks are now `teacher_guide` (teacher-only HTML). No Gamma embeds remain.
- Still external: 69 videos (41 Wistia, 26 Base44-hosted, 2 Vimeo). The 56 designrr.page e-books were converted to PDFs in Storage (`data.ebook_pdf`).

**18 Oct 2026, re-run**

- Re-runs are now safe for blocks changed in Supabase after the import. `teacher_guide` blocks are left untouched, and blocks with `data.ebook_pdf` keep their PDF fields.
- Wistia `.mp3` audio (39 files) is now treated as a file to copy, not as video. All 39 failed: the session's network policy blocks `embed-ssl.wistia.com`. They will copy on the next run once that host is allowed.
