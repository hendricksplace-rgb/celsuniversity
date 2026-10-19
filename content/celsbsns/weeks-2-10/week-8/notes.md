# CelsBSNS Week 8 – Marketing & Brand Communication · notes

## Sources (all verified Oct 19, 2026; reading cites 1–5)
1. Edelman, "Edelman Trust Barometer Special Report: In Brands We Trust?" (June 18, 2019): https://www.edelman.com/insights/trust-barometer-special-report-in-brands-we-trust. Used: 81% must be able to trust a brand to do what is right; about one-third trust most brands they buy.
2. Kate Moran, Nielsen Norman Group, "The Four Dimensions of Tone of Voice" (July 17, 2016): https://www.nngroup.com/articles/tone-of-voice-dimensions/. Used: the 4 dimensions, and that small tone changes shifted perceived friendliness and formality.
3. Mailchimp Content Style Guide, "Voice and Tone": https://styleguide.mailchimp.com/voice-and-tone/. Used: voice stays the same, tone changes.
4. Almquist, Senior & Bloch, "The Elements of Value", HBR (Sept 2016): https://hbr.org/2016/09/the-elements-of-value. Used: value pyramid, with functional needs at the base and emotional ones above.
5. Annette Chacko, Sprout Social, "Why you need to speed up your social media response time (and how)" (June 13, 2024): https://sproutsocial.com/insights/social-media-response-time/. Used: most consumers expect a brand reply within 24 hours or sooner. No percentage is given, so none is quoted.
- Research model example: Patagonia's mission line "We're in business to save our home planet" (official site: https://patagonia.com.hk/pages/our-mission).

## TED talks (talk pages verified on ted.com)
- Main: Simon Sinek, "How great leaders inspire action", TEDxPuget Sound 2009, ~18 min. Slug `simon_sinek_how_great_leaders_inspire_action`.
- Extra: Seth Godin, "How to get your ideas to spread", TED2003, ~17 min. Slug `seth_godin_how_to_get_your_ideas_to_spread`.
- Overlap risk: Sinek's talk is also a natural pick for Week 3 (leadership). If Week 3 uses it, swap the main and extra talks here.

## Where I adapted the original, and why
- Reading: the original has one case (Sofia) with 3 questions. I split it into 3 moments (c1 rewrite, c2 spot, c3 choose), one original question per case. The dialogue lines are illustrations written by CelsU; the original case text has no quotes.
- The original's Forbes article and YouTube video ("Branding Basics", JKIAOZZritk) appear only inside `original`. The visible flow uses the CelsU article and the TED talks.
- Research: the original sets no sentence count, so I added `sentences` {min 4, max 7} as guidance. Extra key `compare` {q_en,q_es} holds the original's final question, "Which brand voice feels more effective to you?".
- Writing: the brand name "LeafLine Office Supplies" is fictional. The example is 130 words, inside the original's 120–150 range.
- The original and the syllabus agree on all tasks. The syllabus says "Speaking: Promote a brand you admire"; in the original that is the Video task, and I followed the original.

## For Code
- reading.vocab: validate.py checks that the vocab map contains the week-1 keys, so I added the 8 week-1 terms as review words (`"review": true`). Each one, except "take ownership", is used with [[ ]] in the article or cases. The 8 new Week 8 terms have no `review` flag. Either hide `review` items in the week's vocab list, or show them as "Repaso".
- speaking: the extra key `reflection` {en[],es[]} holds the 2 reflection questions from the original. Exercise 2 (social media complaint) reuses scene kind "meeting", and exercise 3 (networking event) reuses "elevator". A "social" scene kind would fit exercise 2 better.
- feedback: there are 5 statements, not 6, matching the original (`self_eval` must accept 5). The extra key `action_note` {q_en,q_es,example_en,example_es} holds the original's Step 3, which asks for one sentence about your personal communication brand. It could prefill capstone field `statement`.
- video.script_source_lesson_id points to the Week 8 Writing lesson (83990641…), following the week-1 mapping. In practice, the student's Research notes are the better script base. The hero intro mentions both.
- speaking.vocab_from_lesson_id points to the Week 8 Reading lesson (0812f079…).
- capstone.json: 4 fields (headline 25, words 12, statement 80, pitch 100). `pitch` uses fill_from "speaking" (the best elevator-pitch try).
