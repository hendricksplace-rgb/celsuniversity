# CelsBSNS Week 5: Organizational Structures & Roles (notes)

## Lesson ids
| File | Table | lesson_id |
|---|---|---|
| reading.json | reading_content | cf1c7dc6-5e8c-46eb-b98f-606039d0f6bd |
| writing.json | writing_content | 5b219653-cc82-4ae9-9b46-0867481ffc26 |
| research.json | research_content | 46678f0b-e5c0-4ffe-b4fd-f0687799e2ee |
| video.json | video_task_content | 1284b488-a33c-4373-8192-26a054e1dffe |
| speaking.json | speaking_content | 6d4e8eda-7177-4f29-a1c3-b64b8717ef7e |
| feedback.json | feedback_content | 1f81ea69-2878-4f89-ab24-dfd0761c45fd |

Cross-references: `video.script_source_lesson_id` = week-5 Writing (5b219653…); `speaking.vocab_from_lesson_id` = week-5 Reading (cf1c7dc6…). This matches week 1, where they point to the Writing and Reading lessons.

## Sources for the reading article (all checked on 2026-10-19)
1. Cathy Bussewitz, AP, in Fortune (Mar 20, 2025): "It's not just Gen Z: Half of employees feel lost at work…": https://www.fortune.com/2025/03/20/half-of-employees-feel-lost-at-work-layoffs/. It reports Gallup data: just under half of U.S. employees strongly agreed they knew what was expected of them (Nov 2024 survey), compared with 56% in Jan 2020.
2. OpenStax, *Introduction to Business 2e*, 7.1 Building Organizational Structures: https://openstax.org/books/introduction-business-2e/pages/7-1-building-organizational-structures (org chart, departmentalization).
3. OpenStax, *Introduction to Business 2e*, 7.4 Authority: https://openstax.org/books/introduction-business-2e/pages/7-4-authority-establishing-organizational-relationships (chain of command, unity of command, span of control).
4. OpenStax, *Introduction to Business 2e*, 7.2 Contemporary Structures: https://openstax.org/books/introduction-business-2e/pages/7-2-contemporary-structures (matrix: two supervisors; pros and cons).
5. Indeed, "10 Types of Organizational Structures for Businesses" (updated Jul 31, 2023): https://www.indeed.com/career-advice/career-development/types-of-organizational-structures (functional, divisional, flat). This is the original lesson's article reference.

The article is original CelsU text. It quotes no sentences from these sources. "Dotted line" appears only as a vocabulary term and carries no citation.

## TED talks (both talk pages verified on ted.com)
- Main: Yves Morieux, "As work gets more complex, 6 rules to simplify" (TED@BCG San Francisco, 2013, ~12 min). Slug: `yves_morieux_as_work_gets_more_complex_6_rules_to_simplify`.
- Extra: Ricardo Semler, "How to run a company with (almost) no rules" (TEDGlobal 2014, ~22 min), a real example of a flat company. Slug: `ricardo_semler_how_to_run_a_company_with_almost_no_rules`. (It replaced Heffernan, who is week 2's main video.)
- The sandbox could not reach embed.ted.com (proxy). The slugs match the ted.com talk URLs exactly.
- These replace the original YouTube reference ("Organizational Structures Explained"). That reference is still kept in `original.video_ref`.

## Where the original and the syllabus differ, and what I followed
- **Writing.** The syllabus says "Describe your ideal job and department." The original lesson is an email asking your manager to clarify reporting lines (120–150 words). I followed the original. The syllabus topic (ideal role and department) moved to the Capstone Part 5 fields.
- **Speaking.** The syllabus says "Explain an org chart." The original has 3 roleplays (reporting line, another department, cross-functional). I followed the original. Explaining the structure and your place in it is covered by the Video task and the Capstone `orgplace` field.
- **Research.** It matches the original: compare two U.S. companies. The syllabus also says "Org chart of a U.S. company."

## Things Code must know
- **validate.py and `reading.vocab`.** validate.py treats `reading.vocab` keys as fixed schema keys. Because of that, any week whose vocabulary differs from week 1 reports "missing key hedges…". Every vocab entry has the week-1 shape `{d, es, ex}`. With vocab swapped to week 1's map, reading.json prints OK. All other files print OK as they are.
- **Extra keys (optional, safe to ignore):**
  - `research.field_label` (`{en, es}`): the search input on this page is a company name, not a professional field. `default_field` = "Starbucks".
  - `speaking.bonus.reflect` (`{en, es}`): the original reflection question "Which scenario required you to adjust your tone or approach?". The three yes / kind of / not yet questions ask whether each activity felt natural.
- **Reading habits block:** it has **4 items** (functional, divisional, matrix, flat), because the lesson teaches "four main types". The icons are target, mega, shield and **star**. star is used in week-1 Writing rules but not yet in Reading habits; map it or fall back if needed.
- **Reading cases:** the original has one case (Luis) and 3 questions. I split it into 3 parts (c1 rewrite, c2 spot, c3 choose), with one original question in each part plus one added question. Karen, Mr. Collins, Jasmine and Priya are illustrative names.
- **Research model:** "Brightway Foods" is fictional, to match the UI's "EJEMPLO FICTICIO" label. `share_options` holds the department chips and `tone_options` holds the structure chips (same keys, new meaning).
- **Feedback:** 6 statements (the 5 original self-checks plus "I recorded my video…", auto video), so `self_eval int[6]` still fits. The two original action-note examples are the first two `goal_suggestions`. The original has no AI step; `ai_practice` was adapted from the original speaking line "use ChatGPT if you don't have a partner".
- **writing.original.submission** is "" because the original lesson has no submission step. The Google Classroom link exists only in `video.original.body_*`.
- **Video:** 2–3 min (`seconds` 120–180, `auto_stop_s` 210).
- **Capstone Part 5 fields:** role (input, 10), skills (textarea, 40), orgplace (textarea, 100), connect (textarea, 80, `fill_from` "speaking": the best try from Activity 2).
