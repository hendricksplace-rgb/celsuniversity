# CelsBSNS Week 9 — Project Management & Productivity: notes

## Lesson ids
- reading `459cd207-b273-40a9-9855-d286974a76c9`
- writing `7f0e80c7-0b18-444d-8ce6-6b27f06accc9`
- research `221d71c2-e06e-4326-88ff-e543dcbd9175`
- video `cd407a64-fc57-46c2-8a7f-e1640009ab0b` (script_source_lesson_id → writing)
- speaking `f917d406-56b7-4929-b65d-f9c7202af3b2` (vocab_from_lesson_id → reading)
- feedback `2c01b992-0c4e-46cd-9f1f-42b215bf07df`

## Sources (all verified 2026-10-19)
1. PMI, Pulse of the Profession 2020, "Ahead of the Curve: Forging a Future-Focused Culture": 11.4% of investment wasted due to poor project performance. https://www.pmi.org/learning/thought-leadership/pulse/pulse-of-the-profession-2020
2. TechRepublic (Esther Shein, June 10, 2021) on PMI's Talent Gap report: 25 million new project professionals needed by 2030. https://www.techrepublic.com/article/25-million-new-project-professionals-are-needed-by-2030/
3. BLS Occupational Outlook Handbook, Project Management Specialists: 1,094,300 jobs (2025), growth "much faster than average" (2025–35); short quoted job description. https://www.bls.gov/ooh/business-and-financial/project-management-specialists.htm
4. PMI, "What Is Project Management" (definition; defining project scope). https://www.pmi.org/about/what-is-project-management
5. Asana, "Project management phases: 5 steps…" (Jan 14, 2026): initiation, planning, execution, monitoring, closure, attributed to PMI's PMBOK. https://asana.com/resources/project-management-phases
6. TED: Tom Wujec, "Build a tower, build a team" (TED2010, 6:34). Main video. Slug `tom_wujec_build_a_tower_build_a_team`. https://www.ted.com/talks/tom_wujec_build_a_tower_build_a_team
7. TED: Bruce Feiler, "Agile programming -- for your family" (TEDSalon NY2013, 17:43). Extra video. Slug `bruce_feiler_agile_programming_for_your_family`.
- Research model card uses Trello's own features page (trello.com/tour, by Atlassian): boards/cards, due dates with reminders, checklists with progress bar, automation, Power-Ups (Slack, Teams, Gmail), free plan. Asana feature descriptions on the source card come from asana.com/features.

## Original vs. syllabus
- Syllabus Writing = "How you would manage a 2-week project"; the original lesson = a 150–200-word mini-project plan for an office move. I kept the original task and set the move two weeks out (scenario), so it covers both. The Capstone part ("How you would plan a 2-week project") pulls from Writing.
- Syllabus Research says "a project management tool (e.g. Trello, Asana)"; the original says two tools. Kept two (min_examples 2).
- The original reading is one case study (Javier + the second team) with 3 questions. I split it into 3 cases (c1 Javier's team, c2 the second team, c3 trust), one original question each. The kickoff/status messages in the cases are illustrative and written by CelsU.
- The original research has no sentence count; the UI needs one, so it stays 5–7 sentences per tool.
- The original YouTube link and "PMI – Why Project Management Matters" are kept only inside `original`.

## For Code
- **Validator quirk:** the validator treats `reading.vocab` as fixed keys, so week 9 vocab also has the 8 Week 1 terms. I worked them into the article as a Week 1 review (habit 3, the "Your goal this week" paragraph, case 3). Every `[[term]]` has a vocab entry, and every vocab entry is used in the text.
- **Research:**
  - This week's model card is a REAL tool (Trello), not a made-up profile. I added `model_is_real: true`, so the "EJEMPLO FICTICIO" badge should be hidden or read "EJEMPLO".
  - The lenses and options are reused for tools: `share_options` = features, `tone_options` = "Best for". The source type is `types` (web/features/help/yt).
  - The source cards search the official sites: `site:trello.com {field}`. `default_field` = "project management".
  - Extra `compare_q` holds the original's two comparison questions. Use them in Step 5 in place of the hard-coded "¿Qué vas a cambiar en tu propia presentación?".
- **Video:** extra `challenge` holds the original's optional ChatGPT voice challenge. The timing is 120–180 s, with an auto-stop at 210 s.
- **Speaking:** `bonus` is the original Reflection. The options are the 3 situations, not Yes/Kind of/Not yet. Exercises 1 and 3 use the `zoom` scene, exercise 2 `meeting`.
- **Feedback:**
  - The `goal_suggestions` are the original Action Note commitment sentences.
  - Extra `action_note` holds the original Step 3 prompt.
  - The statements are auto-checked: "I practiced using productivity tools" could be auto from `research` if the UI supports that value. It is null for now.
- No coach anywhere. Writing chip: "Se guarda en tu semana".
