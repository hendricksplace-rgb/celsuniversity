# Week 6: Business Ethics & Conduct (notes for Code and Matt)

## Lesson ids → tables
- reading_content: 8fb32000-4c00-46c0-bcaa-818f936a1b97
- writing_content: 17856e08-9b63-4e00-ac26-b40e9ff6876e
- research_content: 6fd75bbd-da43-4d8d-a7ae-df915aac549d
- video_task_content: 55ead69b-8a6d-4b52-803a-e7a9cb8e3fc2
- speaking_content: deab977b-d0ef-4d05-9a27-e91ea391df12
- feedback_content: 3a128df8-9467-4141-8fd9-9984ebcbdcee
- Cross references, mapped from week 1: speaking.vocab_from_lesson_id → week-6 Reading; video.script_source_lesson_id → week-6 Writing.

## Sources (all checked on 2026-10-19)
1. ECI, 2023 Global Business Ethics Survey: https://ethics.org/gbes-2023. Global medians: 65% observed misconduct, 72% of those reported it, 46% of reporters perceived retaliation. Data covers 42 countries, collected Aug 2022 – Jan 2023.
2. SHRM, Paul Falcone, "Educate Entry-Level Workers on Workplace Ethics" (Dec 6, 2018): https://www.shrm.org/topics-tools/news/employee-relations/educate-entry-level-workers-workplace-ethics. Covers progressive discipline, first-offense termination for timecard fraud and theft, and "be honest and reliable".
3. Google Code of Conduct (updated July 16, 2026): https://abc.xyz/investor/board-and-governance/google-code-of-conduct/. Covers speak-up channels, non-retaliation and confidentiality sections.
4. Walmart Ethics, "Gifts & Entertainment" FAQ: https://www.walmartethics.com/content/walmartethics/en_us/faqs/conflicts-of-interest/gifts-and-entertainment.html. Employees may not accept supplier gifts, T-shirts or tickets; coffee or snacks in meetings are OK.
5. TED: Margaret Heffernan, "Dare to disagree" (TEDGlobal 2012, about 13 min): https://www.ted.com/talks/margaret_heffernan_dare_to_disagree. This is the main video.
6. TED: Dan Ariely, "Our buggy moral code" (TED2009, about 16 min): https://www.ted.com/talks/dan_ariely_our_buggy_moral_code. This is the extra video.

The original video reference is a YouTube link: "The Psychology of Ethics in the Workplace", Christopher Adkins. I could not find it on ted.com, so it can't be embedded under the TED-only rule. It stays only in `original.video_ref`. The original article reference ("SHRM – Why Ethics Matter in the Workplace") has no URL, and I couldn't find a SHRM page with that exact title. I used a real SHRM ethics article instead (source 2).

## Where the original and the syllabus disagree, and what I followed
- **Writing:** the syllabus says "Ethics statement / a time you made a difficult decision". The original lesson is "an email to your manager about a mistake in a client report (120–150 words)". **I followed the original.** The syllabus items moved to:
  - the ethics statement → Feedback `action_note` and Capstone field `ethics_statement`;
  - the difficult decision → Capstone field `difficult_decision`.
- **Reading:** the original has one case (Angela) with 3 questions. To match week 1's 3-case UI, I split it into 3 steps (c1 choose, c2 rewrite, c3 spot), with one original question per step. The story is the original's, plus invented supporting details (the coworker "Kevin", the dates, and HR's reply).
- **Research:** the original gives no sentence count. I kept week 1's 5–7 sentences per company analysis.
- **Speaking:** the original gives no rep counts. I set 3 + 3 + 3 = 9 tries.
  - Scene kinds reuse the existing UI kinds: elevator for the layoff gossip, zoom for the HR call, meeting for the client gift.
  - `manual_ok` is on exercise 2, so a partner or ChatGPT roleplay counts.

## Things Code must know (extra keys; the validator reports them as INFO)
- **reading.vocab:** content-keyed dict with week-6 terms. The validator flags week 1's 8 words as "missing". That's expected for every week, since vocab keys are content, not schema. Every other part is structurally OK; I checked with vocab normalized.
- **research:**
  - `field_label` {en:"Company", es:"Empresa"}: the step-1 input asks for a company, not "Tu campo o puesto";
  - `field_examples` ["Google","Walmart","Deloitte"] and `default_field` "Walmart";
  - `compare` (the original's 3 comparison questions): show them in "Paso 5 · Lo que aprendí";
  - the sample "Northbridge Logistics" is fictional, so keep the "EJEMPLO FICTICIO" label.
- **video:**
  - `script_starter` is an English template. The week-6 Writing email is about a reported mistake, not a self-introduction. Pre-fill "Mi guion" with the template, or show the email as a reference, not as the script.
  - `ai_challenge`: the original's optional ChatGPT voice challenge.
  - `seconds` 120–180; `auto_stop_s` 210.
- **speaking.reflection:** the original's 2 open reflection questions. Show them as optional private notes in "Cierre". The `bonus` chips are adapted self-checks.
- **feedback.action_note:** the original's Step 3, "personal ethics statement" (one or two sentences, min 60 chars). It should also pre-fill Capstone Part 6 `ethics_statement`. `fill_from` only allows writing/speaking/research/video, so that field is `null`. Code can pre-fill it from the feedback action note.
- **No coach** anywhere. The Writing chip is "Saved to your week" / "Se guarda en tu semana".
