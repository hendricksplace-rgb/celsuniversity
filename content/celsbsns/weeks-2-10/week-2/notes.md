# CelsBSNS Week 2 · Business Etiquette & Workplace Culture: content notes

## Lesson ids (all six upserted)
| Lesson | id | table |
|---|---|---|
| Reading | a4ae1301-e25c-4be4-a19d-f1cfd0c294e8 | reading_content |
| Writing | 77630354-b8a4-4bc2-827a-5ba44fcf0b41 | writing_content |
| Research | c1fd5abd-81b7-4eb2-b01f-43788445e753 | research_content |
| Video | b00eda44-bafa-46e8-acf6-44520dec421d | video_task_content |
| Speaking | 6ab34e35-da35-4ade-b0e2-7401e28e85c9 | speaking_content |
| Feedback | d32cf75c-4098-4e7a-97e5-afe55e133fc7 | feedback_content |

Cross references: `video.script_source_lesson_id` points to the Week 2 Writing id, and `speaking.vocab_from_lesson_id` points to the Week 2 Reading id. This follows the Week 1 mapping.

## Sources (checked 2026-10-19)
1. Jennifer Shappley, "LinkedIn research reveals the value of soft skills", Fast Company, Jan 31, 2019: https://www.fastcompany.com/90298828/linkedin-research-reveals-the-value-of-soft-skills
   - 92% say soft skills are just as important as hard skills; 89% say bad hires lack soft skills.
2. LinkedIn Newsroom, "LinkedIn Releases 2019 Global Talent Trends Report", Jan 28, 2019: https://news.linkedin.com/2019/January/linkedin-releases-2019-global-talent-trends-report
   - The 89% "bad hires" figure.
3. Erin Meyer, "Being the Boss in Brussels, Boston, and Beijing", HBR, July–Aug 2017: https://hbr.org/2017/07/being-the-boss-in-brussels-boston-and-beijing
   - American bosses are "outwardly egalitarian" (first names, speaking up), and decisions are still top-down.
4. Erin Meyer, *The Culture Map*, PublicAffairs, 2014: https://erinmeyer.com/books/the-culture-map/
   - The U.S. is linear-time, sits in the middle of the feedback scale (a soft start helps), and builds trust through tasks.
   - **Caveat:** the U.S. placement on the scheduling (linear-time) scale is from the book. I could not confirm it on a free web page. The feedback and trust placements were confirmed through a published summary of the book.
5. Google re:Work, "Understand team effectiveness": https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness
   - 180 teams; psychological safety was the #1 dynamic; Edmondson's definition.
6. TED talk (main): Margaret Heffernan, "Forget the pecking order at work", TEDWomen 2015, about 16 min. Slug `margaret_heffernan_forget_the_pecking_order_at_work`.
7. TED talk (optional): Amy C. Edmondson, "How to turn a group of strangers into a team", TED Salon: Brightline Initiative 2017, about 13 min. Slug `amy_edmondson_how_to_turn_a_group_of_strangers_into_a_team`.

**Not used:**
- "SHRM – Understanding Workplace Culture": I couldn't find an article with this exact title. SHRM's culture toolkits are behind member walls.
- The original YouTube video (`KkE-4tLMCXw`).

Both stay in `original.*_ref`. The dress-code paragraph is general advice with no statistic, so it has no citation.

## Original vs. syllabus
- **Writing:** the syllabus says "Describe a conflict and how you resolved it", but the original lesson is a clarification email to the manager, Alex Johnson (100–150 words). **I followed the original.** The conflict story moved to the Capstone Part 2 field `experience`.
- **Speaking:** the syllabus says "Discuss adapting to a new work environment", and the original has 4 roleplays. I followed the original. "Adapting" is in Capstone field `adapt` and in the feedback questions.
- **Reading:** the original has one case (four signals) plus an article summary with three tasks. I made 3 activities:
  - c1 is a spot activity for the 4 signals;
  - c2 is a choose activity (Candidate A vs. B), built from the summary's culture-fit bullet;
  - c3 is a rewrite activity, "3 cultural differences".

  The one-sentence summary task became `checkpoint.takeaway_q`. The original 92% figure was kept but re-sourced to LinkedIn and Fast Company.

## For Code
- **Validator quirk:** `validate.py` treats `reading.vocab` word keys as required. To get OK, the 8 Week 1 words had to be included (hedges, on track, setbacks, bottom line, low-context, at face value, follow-through, take ownership). They are woven into the article as Week 1 review, so every vocab word is used in the text. **Weeks 3–10 will hit the same issue.** Consider making `vocab` keys free-form in the validator.
- **Extra keys (optional; render if you can):**
  - `writing.why_note`
  - `research.compare_q`, `research.share_next`: research Q2 "similar or different" and the "share one takeaway" line
  - `video.example_line`, `video.extra_challenge`: the optional ChatGPT voice prompt
  - `speaking.exercises[0].prompts`: the 3 small-talk prompt lines
  - `speaking.exercises[1–3].avoid_say{dont,do}`: the original ❌ / ✅ pairs
  - `speaking.reflection`: the 3 self-reflection questions
  - `feedback.answer_hint`: "5–6 sentences each"
- **Speaking has 4 exercises** (Week 1 had 3), 2 reps each, 8 total. All have `manual_ok: true` because they are partner roleplays.
  - Scene kinds reuse the existing three: elevator for small talk, meeting for clarification, zoom for feedback and for the difficult conversation.
  - The rail and step labels must come from the data, not be hardcoded to 3.
- **Video:** 2–3 min (`seconds` 120–180), `auto_stop_s` 210. There are 6 tips: the 5 originals plus "Dress for day one", which uses the shirt icon.
  - The script prefill source is the Writing email (a clarification email), which is not a great base for this video. You may prefer to start the script empty with the 4 "must" points as placeholders.
- **Research:**
  - The examples are 2 companies, not people.
  - The `model` is a fictional company (Brightwater Health) and must show "EJEMPLO FICTICIO".
  - The analysis is 3–6 sentences, and the chips say "2–3 sentences each" to match the original's copy task.
- **Feedback:** 6 statements (the 5 originals plus the standard vocab statement). `auto` is `speaking` for small talk and `writing` for clarification. There are 4 reflection questions, as in the original. The coach step is removed.
- **Capstone Part 2** fields:
  - `values`: input, 15 chars, `fill_from` research
  - `experience`: 150 chars
  - `adapt`: 100 chars
  - `culture_fit`: 80 chars, `fill_from` video
