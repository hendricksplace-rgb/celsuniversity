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
| Video (`.mp4 .mov .m4v .webm`, Wistia, Vimeo) | **Not copied**, by rule. Listed in the report. `--download-videos <dir>` saves the Base44-hosted ones locally so they can be uploaded to Mux/Bunny or YouTube. |
| YouTube | Left as is (allowed). |
| Gamma teacher guides (38) | Imported as embeds, then replaced with converted HTML by `apply-teacher-guides.sql` (step 5). |
| designrr.page e-books | Left as is and listed in the report. They break the self-contained rule and still need replacing (e.g. export to PDF → flipbook). |

## Run it

1. Make sure `20261017225042_course_layouts` and `20261017230234_staging_teacher_guides` are applied (both are on `celsu-lam`).
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
5. Swap the Gamma teacher-guide embeds for the converted HTML guides staged in `private.teacher_guides_staging`. Run `apply-teacher-guides.sql` in the Supabase SQL editor. **Repeat this after every re-run of step 4**, because the import restores the original embeds.
6. Read `scripts/migrate-base44/out/report.md`. Every row of the count table should show ✅. "Legacy URLs left" should be 0, and "Failed" should be 0. If not, re-run: finished files are skipped.

`--from-dir <dir>` reads `<Entity>.json` exports instead of calling the Base44 API (useful for testing). `--concurrency <n>` sets parallel downloads (default 6).

## Dry run, 17 Oct 2026 (partial export)

Run from exports of 500/610 lessons and 500/534 blocks (everything else complete):

- All entity mappings succeeded. No broken links apart from the 126 blocks whose lessons were outside the partial export.
- **2,770 unique files** to copy, and no Base44/Kajabi URL left in the rewritten rows.
- Videos needing a host: 69 Wistia, 2 Vimeo, 6+ Base44-hosted (more in the blocks not exported).
- External embeds to replace: 41 designrr.page (e-books), 32 gamma.app (teacher guides).
