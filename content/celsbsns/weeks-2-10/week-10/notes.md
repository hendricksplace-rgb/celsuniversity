# CelsBSNS Week 10: Interview Prep & Career Goals (notes for Code)

## Lesson ids
| File | Table | lesson_id |
|---|---|---|
| reading.json | reading_content | a55cb3db-820c-41d2-9451-110bae1c8399 |
| writing.json | writing_content | 6d353a0e-7bb4-4bdd-a5db-56596d3ee785 |
| research.json | research_content | 348f9b55-ee8e-4afa-a07b-881c1d1d1e3d |
| video.json | video_task_content | c1a357c5-cad9-4748-90f2-1a519df9b234 |
| speaking.json | speaking_content | bd266cc9-9f1d-416f-9368-e87e86d6959e |
| feedback.json | feedback_content | ac05147d-7b95-4f7f-8760-8ef075bb74b1 |

Cross-references follow week 1's pattern: `video.script_source_lesson_id` points to the week-10 Writing lesson (6d353a0e…), and `speaking.vocab_from_lesson_id` points to the week-10 Reading lesson (a55cb3db…).

## Sources (reading article, all checked on 2026-10-19)
1. U.S. Bureau of Labor Statistics, *Career Outlook*, April 2016: "Employment interviewing: Seizing the opportunity and the job" by Olivia Crosby, updated by Elka Torpey. https://www.bls.gov/careeroutlook/2016/article/employment-interviewing.htm
2. University of Washington Career & Internship Center: "STAR Method of Interviewing" (2020, updated 2025). This is where the 20/10/60/10 split comes from. https://careers.uw.edu/resources/star-method-of-interviewing/
3. Indeed Career Guide: Hanne Keiling, "How To Answer 'Where Do You See Yourself in 5 Years?'" (updated June 15, 2026). https://www.indeed.com/career-advice/interviewing/interview-question-where-do-you-see-yourself-in-five-years
4. TED talk (main): Jason Shen, "Looking for a job? Highlight your ability, not your experience", TED Residency 2017, about 6 minutes. Slug `jason_shen_looking_for_a_job_highlight_your_ability_not_your_experience`
5. TED talk (extra): Carol Dweck, "The power of believing that you can improve", TEDxNorrkoping 2014, about 10 minutes. Slug `carol_dweck_the_power_of_believing_that_you_can_improve`

The first version used Regina Hartley as the main talk. She was removed because she is already week 4's main video. The video prompts and the closing paragraph (a4) were rewritten to fit the Shen talk.

The article contains no statistics. The before/after answer and Daniela's dialogue lines are made-up teaching examples (the original case gives only the plot). The model company in Research ("Brightline Logistics (example)") is fictional and labeled as an example. Week 1's model was also fictional.

## Original vs. syllabus, and choices made
- The original Reading has only one case, Daniela. I split it into 3 cases so it matches week 1's three-case layout:
  - c1 "The First Interview" (spot activity, outcome bad);
  - c2 "Practicing STAR" (rewrite activity);
  - c3 "The Second Interview" (choose activity, outcome good).
  - Each original question is attached to its case.
- The original Reading references (an Indeed list and a YouTube video) are kept only in `original`. The in-app video uses verified TED talks.
- The syllabus says "Speaking: 50-minute live mock interview". The original lesson is a 3-activity interview roleplay. I followed the original lesson. The live interview appears as the course "next" step in Feedback.
- `original.summary` / `original.instructions` (reading), `original.goal` (video, speaking, feedback) and `writing.original.submission` (empty string) are not in the originals. They are short derived lines, because week 1's schema needs these keys. The verbatim text is in `body_en` / `body_es`.
- Speaking rep counts aren't in the original. I chose 3 per exercise (9 total).
- Time limits per exercise:
  - Ex 1: 60–90 s (the original says 90 s);
  - Ex 2: 30–60 s;
  - Ex 3: 45–75 s;
  - `max_s` = 120.
- Ex 2 has `manual_ok` for partner reps.
- Video: 3–4 min, so `seconds` = 180–240 and `auto_stop_s` = 270.

## Things Code must know
- **Extra keys (validator INFO only):**
  - `video.challenge` `{en, es, prompt}`: the original "Optional Challenge" (ChatGPT voice). It is reworded to practice out loud, with no video upload.
  - `speaking.reflection` `{en[], es[]}`: the original's open reflection questions. The `bonus` block keeps the Yes / Kind of / Not yet format, with 3 questions adapted from that reflection.
  - `feedback.next.final: true`: this is the course close. `next.week` stays 10 (the number type is kept). `next` points to the live mock interview and the certificate, not to week 11. Render the close-of-course card when `final` is true.
- **Feedback has 5 statements** (the original self-check), not 6. `self_eval` must accept length 5 for week 10.
  - The `auto` mapping is: STAR goes to video, career goals to writing, roleplay to speaking.
  - "I prepared my Capstone for submission" has `auto: null`. It could be auto-checked from Capstone completion if Code wants.
  - The feedback brief's week 10 comparison (confidence and self_eval vs. week 1) still applies. The statements differ, so compare confidence only.
- **Speaking:** the brief's planned "Semana 1 vs. hoy" comparison can use `speaking_best` from week 1. `hero.priv_p` mentions it.
- **Validator:** `validate.py` treats `reading.vocab` (a word → entry map) as fixed keys. So reading.json was validated against week 1 with the vocab map re-keyed to week 10's words, and it prints OK. Every vocab key is used as `[[term]]` in the text, and every `[[term]]` is defined.
- **capstone.json:** 5 fields. `goals` fills from writing, `star` from video (the script), `about` from speaking, `targets` from research, and `resume` is a PDF upload (`type: "file"`, min 0, required).
