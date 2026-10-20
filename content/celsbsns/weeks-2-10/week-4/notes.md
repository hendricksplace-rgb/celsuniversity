# CelsBSNS Week 4 – Human Resources & Hiring: notes

## Originals
All seven week-4 lessons were empty in Kajabi (the "Content pending" placeholder). The writing lesson only had a Google Classroom link. I built every activity from the syllabus Week 4 line (hiring process, onboarding, benefits; Capstone Part 4: work history in resume form; Reading: sample resumes and job ads; Writing: first draft of a U.S.-style resume; Speaking: 1-minute career-goals pitch) and used the week-1 structure.
Each `original` object is built from the syllabus line. Its `body_en`/`body_es` start with a "[Built by CelsU from the CelsBSNS syllabus…]" note and keep the Kajabi placeholder text. The writing original also keeps the Google Classroom link, but only inside `original.body_*`.

## Lesson ids → tables
- reading_content: 1ac74ef4-7317-4bd0-ab80-415582a6ae37
- writing_content: f813d3d7-6f33-4446-aca6-fdc9f42f6dfb
- research_content: defd0c41-7e78-412e-b3bf-fde86d7fbef3
- video_task_content: 52ecd2d3-9617-4c46-ac7c-003689afe0e7 (script_source_lesson_id = writing f813d3d7…)
- speaking_content: b11869fa-021f-4b08-8181-ac8260713ca6 (vocab_from_lesson_id = reading 1ac74ef4…, as week 1 points to its reading)
- feedback_content: 8474e85e-0696-4721-addb-642119c5b771

## For Code
- **Hide the duplicate lesson** "Writing Task (1–2 hours) (2)" `1ff56977-4646-4b32-ba44-534475ac6925`. It is an empty placeholder and has no content row.
- **The writing task is a resume, not an email.** Week 1's writing rules ("no bullets", "email format", "at least 3 paragraphs") must NOT apply to week 4. Bullets (•) are expected. The JSON uses the same keys:
  - `example.subject` = "Resume – Ana Pérez"
  - `to_label` = "Talent Acquisition Team"
  - the example `paragraphs` are resume sections, and `[null, "EXPERIENCE"]` etc. are unhighlighted section headings
  - words are 150–350
  - the hero chip is "Se guarda en tu semana" (no coach chip)
- **Video vs Speaking:** the syllabus "1-minute career pitch" is the Video task. It runs 50–70 s with auto-stop at 90 s, is Capstone Part 4, and uses the resume draft as its script source. Speaking exercise 3 (career fair, 5 tries) practices the same pitch, and Capstone field `pitch` fills from it.
- **Capstone part 4** fields are in capstone.json: jobs (60), achievements (120), education (30) fill from writing; pitch (80) fills from speaking. No file field this week. The PDF upload is in week 10.
- **Validator note:** `validate.py` checks the `vocab` term map by key name, so any week with different terms fails the raw check on `vocab.*` keys only. I validated reading with `vocab` converted to a list in both files (`w4_val.sh`), which checks every entry's {d, es, ex} shape. Result: OK. The other five files pass the raw check.
- The research model company "Mesa Logistics" and the people in the cases (Luis, Ana, Carlos, Laura, Maria) are fictional. The UI should keep the "EJEMPLO FICTICIO" label.

## Sources (all verified 2026-10-19)
1. HR Dive, Riia O'Donnell, Nov 8 2018, "Eye tracking study shows recruiters look at resumes for 7 seconds" (Ladders 2018 study, 7.4 s): https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582
2. Harvard FAS Mignone Center for Career Success, "HES: Create Impactful Resumes and Cover Letters" (2025). Covers reverse chronological order, action verbs, quantifying results, no pronouns, no photo/age/gender, and ATS: https://careerservices.fas.harvard.edu/resources/hes-create-impactful-resumes-and-cover-letters/
3. EEOC, "Prohibited Employment Policies/Practices". Says employers should not ask for a photograph and job ads must not discourage applicants by protected traits: https://www.eeoc.gov/prohibited-employment-policiespractices
4. BLS, Employer Costs for Employee Compensation, June 2025 (released Sep 12 2025). Benefits are 29.8% of private-industry compensation: https://www.bls.gov/news.release/archives/ecec_09122025.htm
5. USCIS I-9 Central, "Completing Form I-9". Employers complete Form I-9 for every person hired: https://www.uscis.gov/i-9-central/completing-form-i-9
6. Gallup, "Why the Onboarding Experience Is Key for Retention" (May 16 2018). Only 12% strongly agree their organization does a great job onboarding: https://www.gallup.com/workplace/235121/why-onboarding-experience-key-retention.aspx

## TED talks (pages verified on ted.com)
- Main: Regina Hartley, "Why the best hire might not have the perfect resume", TED@UPS 2015, ~10 min. Slug `regina_hartley_why_the_best_hire_might_not_have_the_perfect_resume`
- Extra: Larry Smith, "Why you will fail to have a great career", TEDxUW 2011, ~15 min. Slug `larry_smith_why_you_will_fail_to_have_a_great_career`

## Syllabus vs. week-1 structure
- The syllabus lists no Research or Video task for week 4.
- Research: I built it from "Reading: sample resumes and job ads". Students analyze 2 real U.S. job ads in their field and collect key words.
- Video: it is the syllabus "1-minute pitch about your career goals".
- Speaking: three hiring situations: phone screen, HR onboarding, career fair pitch.
