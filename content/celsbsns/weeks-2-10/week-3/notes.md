# CelsBSNS Week 3: Management and Leadership (notes)

## Files and DB
| File | Table | lesson_id | md5(data::text) |
|---|---|---|---|
| reading.json | reading_content | ab5cc31e-c87b-45e6-a581-9c1fa3329265 | 907ee8e5… |
| writing.json | writing_content | 0cc20fba-cffc-4e2b-b2e0-79848e27b02b | 7a0892e5… |
| research.json | research_content | cb913b4a-4b22-4263-8ba0-a7563b057fec | 88126152… |
| video.json | video_task_content | 8bd86ae4-7645-4522-984b-54bbf3a01b70 | 60c6668f… |
| speaking.json | speaking_content | 2ce233ad-78a5-4128-91bf-70ec4d33e3ab | 2fb3b3b1… |
| feedback.json | feedback_content | f485f982-5b7c-4d64-b9cc-80dbec22f53b | 9ec86a85… |

All 6 upserted 2026-10-19. The md5 of each DB row is identical to the md5 of the local file in jsonb text form.
Cross-refs: video.script_source_lesson_id = week-3 Writing (0cc20fba…); speaking.vocab_from_lesson_id = week-3 Reading (ab5cc31e…).

## Sources (all checked 2026-10-19)
1. John P. Kotter, "What Leaders Really Do", Harvard Business Review, Dec 2001 (first published 1990). https://hbr.org/2001/12/what-leaders-really-do. Used for: management copes with complexity, leadership copes with change; the two are complementary.
2. Randall Beck and Jim Harter, "Managers Account for 70% of Variance in Employee Engagement", Gallup Business Journal, Apr 21, 2015. https://news.gallup.com/businessjournal/182792/managers-account-variance-employee-engagement.aspx. Used for: at least 70% of the variance; companies fail to pick the right manager talent 82% of the time.
3. Google re:Work, "Following the data: The research behind great managers" (Project Oxygen). https://rework.withgoogle.com/intl/en/guides/following-the-data-the-research-behind-great-managers. Used for: the list of manager behaviors (good coach, empower without micromanaging, productivity and results, clear vision and strategy, communicate, make strong decisions).
4. TED (main video): Roselinde Torres, "What it takes to be a great leader", TED@BCG San Francisco, Oct 2013, about 9 min. Slug `roselinde_torres_what_it_takes_to_be_a_great_leader`. Her three questions (anticipate change, network diversity, courage to abandon past practices) were checked against a secondary summary. They are only asked in the video prompts, not quoted.
5. TED (extra video): Simon Sinek, "Why good leaders make you feel safe", TED2014, 11:45. Slug `simon_sinek_why_good_leaders_make_you_feel_safe`.

The article is original CelsU text that paraphrases these sources. The only quoted phrase is the short phrase "coping with complexity / change", used as a paraphrase. Nothing is copied from the sources.

## Original lesson vs. what I used
- **Article:** the original cites "HBR – The Difference Between Managers and Leaders" (hbr.org/2020/02/…). I could not verify it: the fetch failed and search found no such HBR article. The Part 2 summary is also titled "The Balance of Management and Leadership (summarized)", which is not a real HBR title I could find. I replaced both with Kotter's verified HBR article, which says the same thing. The old refs are kept in `original.article_ref` and in `body_*`.
- **Video:** the original links Torres on YouTube (aUYSDEYdmzw). It is now the same talk on ted.com, so it plays in the TED embed.
- **Research sample postings:** the lesson attributes them to "Amazon, Operations Manager" and "Google, Project Lead". Those are illustrative texts, not verified real postings. In the visible model I label the sample as "Sample posting from the lesson" with no company name. The original wording is kept in `original`.
- **Reading cases:** the original has one case (Supervisor A vs. B) plus a "Your Task While Reading" section. I split it into 3 cases:
  - c1 (Supervisor A): rewrite;
  - c2 (Supervisor B): spot;
  - c3 (balanced message): choose.

  The messages inside the cases were written for the activities. The original discussion point and the three reading tasks became the case questions plus `takeaway_q` (the two-sentence summary).
- **Syllabus vs. original:** the syllabus says "Video Quiz: What makes a good leader?". The original Video lesson is "Speaking Like a Manager and Like a Leader" (2–3 min). I followed the original. The "what makes a good leader" idea is covered by the Torres prompts in Reading.

## Things Code must know
1. **Speaking has 4 exercises** (the original has 4 activities). The DB constraints currently assume 3:
   - `speaking_best_exercise_check` (exercise 1–3);
   - `speaking_progress_reps_check` (array_length(reps)=3).

   Relax these to the number of exercises before week 3 goes live, or the 4th exercise can't be saved. `partner_feedback` still has 3 items (bonus has 3 questions).
2. **Speaking extra keys:**
   - `exercises[].model`: the original scenario prompt. Show it as "Frase modelo".
   - `reflection` {intro, questions en/es, limit_s [60,120]}: the original 1–2 min self-reflection recording. It is optional. The same questions are also in Feedback.

   Scene kinds used are only zoom and meeting, so no new illustrations are needed.
3. **Writing asks for 2 emails** (Manager 120–150 + Leader 120–150 words):
   - `words` = 240–300 total, for the existing single composer.
   - Extra keys: `words_each` {120,150}, `emails` [{key, en, es, parts:[0,1,2] or [3,4,5], focus_en/es}] if you want 2 composers or 2 counters, and `after` (the read-aloud reflection).
   - The example has 2 label rows `[null, "MANAGER EMAIL (excerpt)"]` and `[null, "LEADER EMAIL (excerpt)"]`.
   - No coach chip: the chip says "Se guarda en tu semana". capstone_part=3.
4. **Research extra key:** `summary_q`, the overall 5–6 sentence comparison paragraph after the 2 postings. `sentences` is 5–6. `share_options` = management skills and `tone_options` = leadership skills, so relabel those two question chips accordingly (the question text already says it).
5. **Video extra key:** `must[].ex`, the original example line for each step. `seconds` 120–180, `auto_stop_s` 210.
6. **Feedback extra keys:**
   - `answer_hint` (5–6 sentences each);
   - `action_note` {growth_ex, goal_ex}, from original Step 4.

   There are 4 reflection questions (week 1 had 3). Statements map `auto` to writing, video and speaking; there is no vocab statement, because the original has none.
7. **Validator:** `validate.py` treats `vocab` keys as required and fails any week whose words differ from week 1. `check.py` in this folder remaps the reference vocab keys to this week's words, then runs the official validator. All 6 print OK.
8. **Capstone Part 3** (`capstone.json`) has 4 fields: traits (input, 20), story (textarea, 150), style (input, 40), and leader_msg (textarea, 120, fill_from "writing" = the Leader email).
