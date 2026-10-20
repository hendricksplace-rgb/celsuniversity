# CelsGLOBAL · From CV to U.S. Resume: full course redesign (proposal for Matt)

**Status:** APPROVED by Matt on 2026-10-19 (design only; the course content stays the same, reorganized by step). Build brief: `claude/celsu-global-cv-resume-brief.md`.
**Mockup:** `cv-resume-mockup.html`. It's clickable, with three screens: course home `?v=home`, a full step `?v=mod` (step 3), and "Mi resume" `?v=resume` (`&lang=en` shows the English version).

## What the course is today
- **7 modules, each with the same 5 lessons:** Video · E-Book · YouTube · Downloads · Activity.
  - The "E-Book" lesson in every module opens **the same whole book**, and "Downloads" opens the same downloads book.
  - **3 modules have no YouTube video**, and module 7 has no video, downloads or activity.
- **The activities are good, but they happen outside the app:** "take out your CV", "write it on a sheet", "use ChatGPT", "send it by email". Students leave the app, and nothing is saved.

## The new idea: the course *is* the resume builder
Each step teaches one part of the resume and **the student builds that part in the app right away**. It all saves to **"Mi resume"**, a live document.
- **At the end (step 6) the student has:**
  - the resume in Spanish and in English;
  - a download as PDF and Word;
  - a direct send to the **Resume Review AI** tool that's already in CelsGLOBAL.
- **Same idea as the Capstone in CelsBSNS:** the course produces something real.
- **Look:** CelsGLOBAL palette (ivory, night blue, gold, teal), serif titles (Source Serif 4), Plus Jakarta Sans text, everything is a button, with phone, tablet and desktop versions.
- **Nothing is locked** (the CelsGLOBAL rule): the steps have a suggested order, but the student can open any of them.

## Every step uses the same 5 parts
1. **Mira el video:** the module's Wistia video, plus 3 key ideas.
2. **Lo esencial:** the e-book content for *this* module only, made interactive (tap to reveal, before/after, verbs you can hear in English, myth or reality).
3. **Practica:** a short game with instant feedback (pick the stronger line, find the mistake, highlight the keywords).
4. **Construye tu resume:** fields that save to "Mi resume", with automatic checks (starts with a verb, has a number, max 2 lines).
5. **Comprueba:** 3 questions, then "Paso N completo".

**The YouTube videos** go inside "Lo esencial" as "Para ver más" (optional), only where one exists.
**"Downloads" disappears as a lesson:** its templates and checklists become the "Construye" and "Practica" tools, and the original PDFs stay as an optional download.

## The 7 steps
| # | Step | Practica (game) | Construye (saved to Mi resume) | Existing source |
|---|---|---|---|---|
| 1 | **Del CV al resume** | "¿CV o resume?": sort 8 statements | **Your diagnosis:** the 11-point checklist, with a result; the target role; optional: paste your current CV for reference | Book m1 + downloads s1–s2 · Activity 1 · YouTube Evan Edinger (EN) |
| 2 | **The structure recruiters read** | "Arma el resume": tap the parts of Carlos's resume in the right order; myth or reality | **Contact + professional summary:** contact form; summary with a guided template (profession, years, specialty, value) and a 3–4 line counter | m2 + s3 · Activity 2 (the rubric becomes automatic checks) · YouTube TRAIN PD (ES) |
| 3 | **Your experience in U.S. language** *(in the mockup)* | "Fortalece la línea": 4 weak lines | **Experience** (2–4 achievements per job, verb picker), **Education** (with the U.S. equivalent), **Skills** (chips), **2 real job postings** | m3 · Activity 3 |
| 4 | **Mistakes that cost interviews** | "Encuentra los 6 errores": a resume with photo, age, passive phrases, 3 pages… you tap each mistake | **Your review:** the 14-point checklist runs on *your* resume; whatever can be checked automatically gets ticked (length, personal data, verbs, numbers, dates); the rest you tick yourself | m4 + s4 · Activity 4 · YouTube Michelle Engelmann (ES) |
| 5 | **One version for each job** | "Marca las palabras clave": highlight a real-style job posting | **3 versions:** paste a posting, mark its keywords, and the app shows which ones your resume is missing; adjust the summary and skills; tracking table (company, keywords, changes, date) | m5 + s5 (15-minute clock) · Activity 5 |
| 6 | **Translate, export, send** | "¿Listo para enviar?": the format checklist | **The English version:** a "Traducir con IA" button (the same AI service as Resume Review) → the student reviews it line by line and approves it; professional file name; **PDF and Word**; "Enviar a revisión con IA" | m6 + s6 (Carlos's example) · Activity 6 · YouTube Andrea Pilan (EN) |
| 7 | **Your next steps** | — | **Your search plan:** job postings and dates, interview practice, next course (Crack the Interview Code) | m7 · completion screen |

## Decisions I made (Matt can change them)
1. **The student writes in Spanish (steps 1–5) and translates in step 6.** That's the original order, and it's easier for B1–B2 learners. The English version is what gets sent.
2. **Translation with AI inside the app** replaces "copy it into ChatGPT". The student has to review and approve each section; it's never sent without that review.
3. **The Allcanza email and Job Board** (activity 6): kept as an optional "Bolsa de trabajo de Allcanza" card in step 7, as Matt decided on 2026-10-18 (CelsGLOBAL refers students to Allcanza). The email `allcanzaresumetn@gmail.com` is **replaced** by the in-app review. **Confirm.**
4. **Wistia videos:** played directly until the video host is decided (already pending for all of CelsGLOBAL).
5. **The demo person is Mariana López**, a fictional industrial engineer (the book already uses that name for the file example). Carlos Mendoza from the downloads book stays as the "full example" in step 6.
6. **Privacy:** the resume belongs to the student; only the student sees it (same rule as notes and the Capstone). It's sent to the AI tool only when the student taps "Enviar".

## What Code would build (after approval)
- **The course page, a step template and Mi resume:** one component; the content for each step is data, like CelsBSNS.
- **New tables:** `resumes` (one per student: `data` jsonb with contact, summary, jobs[], education, skills[], `en` version, `updated_at`), `resume_targets` (job postings and keywords), plus the progress of each step.
- **PDF export** (print stylesheet or server-side) and **.docx** (the `docx` package, already planned for Resume Review).
- **"Traducir con IA":** an edge function using the same LLM as Resume Review; the answer goes into `resumes.data.en` as a draft.
- **Then Cowork writes the content for the 7 steps** in the agreed data format, the same way as CelsBSNS weeks 2–10.

## Next courses with this same method
Crack the U.S. Interview Code → Finanzas Personales → Tu Camino TN → Interview Prep. Each course gets its own "product" (e.g. Interview Code → your answer bank with STAR stories; Finanzas → your budget and plan).
