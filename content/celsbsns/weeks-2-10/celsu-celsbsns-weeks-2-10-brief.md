# CelsBSNS weeks 2–10: content is loaded, what Code needs to do

**Status (Cowork, 2026-10-19):** the content for **all 54 activity pages in weeks 2–10 is already in the database.** Each of the six `*_content` tables now has 10 rows (weeks 1–10), keyed by `lesson_id`. Week 1 was not touched. The pages Code built for week 1 are data-driven, so most of weeks 2–10 should just work. This brief lists what doesn't.

**Workflow:** make the changes below. Then open **every** week 2–10 activity (Reading, Writing, Research, Video, Speaking, Feedback) at 390 and 1440 px, confirm each renders with no blank sections or console errors, and **push it live**. Matt reviews it live.

**Files:** `celsu-celsbsns-weeks/week-N/` has the six JSON files (identical to the database rows), `capstone.json` and `notes.md` (sources, decisions, details for Code). All parts are in one file: `capstone-parts-2-10.json`.

## 1. Database constraints to relax (migration)
Some weeks have more items than week 1, and the current checks would reject saves:
- **`speaking_best_exercise_check`:** `exercise between 1 and 3` → **1–6** (weeks 2 and 3 have 4 exercises).
- **`speaking_progress_reps_check` and `speaking_progress_partner_feedback_check`:** `array_length(...)=3` → **between 1 and 6**, and size the arrays from `exercises.length`.
- **`weekly_reflections_answers_check`:** `cardinality(answers) <= 3` → **≤ 6** (Feedback in weeks 2 and 3 has 4 questions).
- **`submissions_status_check`:** add **`'finished'`**, since Writing now saves as finished with no coach (see the Writing brief update). If you already map "finished" to `submitted`, leave it and tell Cowork.

## 2. Make counts come from the data, not hard-coded
- **Speaking:** the number of exercises (3 or 4), reps per exercise (2–5) and the "N tries" labels.
- **Feedback:** `statements` has 5 or 6 items depending on the week, and `questions` has 3 or 4. **Comparing self-checks across weeks:** when counts differ, compare only the confidence score.
- **Writing:** the word range comes from `words.min/max` (for example 100–150 in week 2, 240–300 in week 3, 150–350 in week 4).

## 3. Week-specific behavior
- **Week 3 Writing has two emails.** `emails[]` plus `words_each` give data for two editors; the single editor also works with the total range of 240–300. Two editors are better if it's cheap.
- **Week 4 Writing is a resume draft, not an email.** Turn **off** the "no bullets / email format / paragraphs" checks when the week's `rules` don't include the email-format rule. The simplest way is a flag. Week 4 also has **no row for the duplicate lesson "Writing Task (1–2 hours) (2)" `1ff56977-4646-4b32-ba44-534475ac6925`. Hide that lesson** (set `status` to hidden or archived).
- **Week 10 Feedback is the course close.** `next.final: true` means: instead of a "Semana 11" card, show a close-of-course card pointing to the live mock interview and the certificate (the text is in `next`).
- **Research example company:** some weeks use a real company or tool (week 7 Starbucks with `model.source_url`; week 9 Trello with `model_is_real: true`). Show the badge **"EJEMPLO REAL"** for those and **"EJEMPLO FICTICIO"** otherwise.
- **Week 8 Reading:** vocab entries with `review: true` are week-1 review words. Label them "Repaso" on the vocabulary card.
- **Week 6 Video:** `script_starter` is a template that pre-fills the script editor when there is no Writing text to import (the week-6 email isn't a usable script).

## 4. New optional fields (render them where they fit; all are bilingual)
**These names are already standardized across all weeks:**
- **Research `compare_q`** `{en:[], es:[]}`: the final "compare your two examples" questions. Show them above the analysis box. Weeks 2, 3, 6, 7, 8 and 9.
- **Research `field_label`:** an alternative label for the search field (e.g. "Company name"). Weeks 5, 6 and 7. Week 6 also has `field_examples`; week 2 has `share_next`.
- **Video `ai_challenge`** `{intro_en, intro_es, prompts:[]}`: an optional "practice with ChatGPT voice mode" card below the tips. Weeks 2, 6, 7, 9 and 10.
- **Video `must[].ex`** (week 3) and `example_line` (week 2): an example sentence under a requirement.
- **Speaking:** `reflection` holds the original's reflection questions; show it after the last exercise (weeks 2, 3, 6, 8 and 10). Week 2 also has `exercises[].avoid_say` ("❌ don't say / ✅ say" pairs) and `exercises[].prompts`, week 3 has `exercises[].model` (a model answer), and week 5 has `bonus.reflect`.
- **Feedback:** `action_note` is the original's step 3 action note (weeks 3, 6, 8, 9 and 10); `answer_hint` is a hint under a question (weeks 2 and 3).
- **Writing:** `why_note` (week 2) and `after` (week 3).

## 5. Capstone parts 2–10
`capstone-parts-2-10.json` has one definition per part: `part`, `week`, `title_es/en`, `preview_es/en` (the locked-state bullets) and `fields[]` with `{k, label_*, hint_*, type: input|textarea|file, min, fill_from}`.
- **`fill_from` sources:** `writing` (the Writing submission body), `speaking` (best try text), `video` (the saved script) or `research` (the analysis).
  - Week 6 has an ethics statement written in Feedback, but its Capstone field doesn't pre-fill from Feedback. Leave it without a fill button.
- **Part 10** has `resume` with `type: "file"`: a PDF upload (the only file the course stores). It counts as complete once a file is uploaded.
- **This replaces the placeholder part definitions** on the Capstone page. The same rules apply from the Capstone brief: each part is required before closing its week.

| Part | Fields (min chars) |
|---|---|
| 2 | values 15 (research), experience 150, adapt 100, culture_fit 80 (video) |
| 3 | traits 20, story 150, style 40, leader_msg 120 (writing) |
| 4 | jobs 60 (writing), achievements 120 (writing), education 30 (writing), pitch 80 (speaking) |
| 5 | role 10, skills 40, orgplace 100, connect 80 (speaking) |
| 6 | values 15, ethics_statement 60, difficult_decision 200, accountability_email 120 (writing) |
| 7 | budget_invoice 120 (video), roi_example 100 (writing), budget_3_months 150, finance_commitment 40 |
| 8 | headline 25, words 12, statement 80, pitch 100 (speaking) |
| 9 | tools 80 (research), habit 30, plan 200 (writing), stage 60 (video) |
| 10 | goals 150 (writing), star 200 (video), about 150 (speaking), targets 20 (research), resume (PDF) |

## 6. Main TED talks (embed.ted.com; slugs are in `reading.video.slug`)
Cowork's sandbox couldn't load `embed.ted.com`, so **check that each embed plays**:
- W2 Heffernan, "Forget the pecking order at work"
- W3 Torres, "What it takes to be a great leader"
- W4 Hartley, "Why the best hire might not have the perfect resume"
- W5 Morieux, "As work gets more complex, 6 rules to simplify"
- W6 Heffernan, "Dare to disagree"
- W7 Lamba, "The Balancing Act: Fun and Finance" (TEDx)
- W8 Sinek, "How great leaders inspire action"
- W9 Wujec, "Build a tower, build a team"
- W10 Jason Shen, "Looking for a job? Highlight your ability, not your experience"

If an embed refuses to play, tell Cowork which one and it will pick a replacement.
