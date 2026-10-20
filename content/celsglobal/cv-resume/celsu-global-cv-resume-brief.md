# CelsGLOBAL · From CV to U.S. Resume: build brief (approved by Matt on 2026-10-19)

**Workflow:** build it, compare it against the mockup at 360, 390, 900 and 1440 px, and **push it live** once it matches. Matt reviews it live as a student and sends any changes through Cowork.

**Source of truth:**
- **`cv-resume-mockup.html`** (clickable): `?v=home` is the course page, `?v=mod` is a full step (step 3), and `?v=resume` is Mi resume (`&lang=en` shows English). `&drill=1` fills in the practice; `&done=1` shows the step complete.
- **`cv-resume-steps.json`:** the content of all 7 steps. **It's the only content source.** It reuses the course's existing text word for word (the e-book, the downloads and the activities).
- **`celsu-global-cv-resume-plan.md`:** the reasons behind the decisions.

**What changes:** the course `from-cv-to-u-s-resume-a-step-by-step-guide` (id `512a5035…`) stops being 7 modules × 5 separate lessons (Video, E-Book, YouTube, Downloads, Activity) and becomes **7 steps, each one a single page**. In each step the student learns something and **builds part of their own resume**, which is saved in "Mi resume".

**This becomes the template for the other CelsGLOBAL courses**, so build it data-driven, like CelsBSNS. The next course will be new data.

## Look (CelsGLOBAL)
- **Colors:**
  - ivory background `#F4F1EA`;
  - night blue `#14182B` / `#1E2A48`;
  - teal `#2E6F86` / `#3F8FA6`;
  - gold `#C7A24E` / `#EBD08C`, and gold buttons `#E9D29A → #C9A24A` with text `#1C1505`.
- **Fonts:** titles in **Source Serif 4** (600/700, italic for the gold word); text in Plus Jakarta Sans.
- **Spacing and controls:** generous padding (22–28 px), radius 20–28, soft shadows. Every action is a button of at least 44 px (main buttons 52–60 px).
- **Nothing is locked** (the CelsGLOBAL rule): the order is a suggestion.

## 1. Course page (`/app/cursos/from-cv-to-u-s-resume…`)
- **Top bar:**
  - back button "‹" (round);
  - "CELSGLOBAL · ETAPA 2" and the title;
  - a gold "Mi resume" button;
  - a 4 px progress bar (teal → gold).
- **Hero** (night → teal gradient with a gold glow):
  - the kicker, the serif title "Del CV a un resume que *abre puertas*" (the italic words in gold), the text, and 3 chips;
  - "Continuar · Paso N" (gold) and "Ver mi resume";
  - **on the right, a little paper resume that fills in** with the sections the student has completed, plus a ring "N/5 SECCIONES".
- **"7 pasos, un resume":** a vertical timeline.
  - Nodes: done ✓ (teal), current (gold with a halo), and the rest numbered.
  - Each card: "PASO N DE 7", the title, the description, the chip "Construyes: …" (green "Listo: …" when done), the minutes, and the button Repasar / Continuar / Abrir.
- **"Herramientas para el siguiente paso":** two night-blue cards linking to the Resume Review and Interview Practice tools you already built.
- **Rail (desktop):**
  - "TU RESUME": the sections, with the step where each one is built;
  - "Ver mi resume";
  - "AL TERMINAR".
- **Tablet and phone:** the rail turns into a sticky row, "Paso N de 7 · N de 5 secciones", with a "Mi resume" button.

## 2. Step page (one template for all 7)
**Order:** the hero (kicker, title, `intro`, chips for the minutes and "Construyes: `builds`"), then 5 numbered sections, then Anterior / Siguiente.

1. **Mira el video:** the Wistia player (`video.media_url`, a direct MP4 for now) and 3 `keys` cards below it. Step 7 has no video: skip the section.
2. **Lo esencial:** render `essentials[]` with the **same block components as the e-book reader** (`keys`, `expand`, `steps`, `myth`, `compare`, `checklist`, `phrases`, `list`, `tip`, `quote`, `para`).
   - **There is one new block, `titles`** (step 3): a list of Spanish job titles on the left; tapping one shows a dark card on the right with the U.S. options, each with an 🔊 button (Web Speech, en-US) and the context note.
   - **`phrases`** shows English plus Spanish, and tapping plays the English.
   - **`more_video`** (optional) goes at the end as "Para ver más": a YouTube embed with the title, the channel and an ES/EN chip.
3. **Practica:** `practice.kind`:
   - **`sort`** (step 1): a card with each sentence and two big buttons, "CV" and "Resume". Show right/wrong with `why`, then "Siguiente", and a final score.
   - **`order`** (step 2): sections to tap in order; each tap adds it to the resume outline. The distractor ("Fotografía…") is shown as an error with its `why`.
   - **`pick`** (steps 3 and 6): see the mockup. The weak line, 3 options, then right/wrong with `why`, plus a "✓ N de M" score.
   - **`spot`** (step 4): a fake resume drawn as a document; each line is tappable. Lines with `err` light up red and show the explanation. There's an "N de 6 errores" counter and a "Ver los que faltan" button after 2 minutes.
   - **`highlight`** (step 5): the job ad in English with the "EJEMPLO FICTICIO" label. The student taps words or phrases; any match with `keywords` lights up gold. Counter "N de 6 mínimo"; "Ver todas" at the end.
   - Step 7 has no practice.
4. **Construye tu resume:** `build.sections[]`. **Everything autosaves** ("✓ Guardado en Mi resume") into the student's resume:
   - **`fields`:** labeled inputs. Checks: `email` (valid format) and `phone_cc` (starts with `+` and a country code).
   - **`textarea`** (optional), **`checklist`** (with `result` high/mid/low by percentage), **`notes2`** (two lists), **`reflect`** (private answers).
   - **`template`:** the summary template with its `slots` highlighted, a character counter (`min_chars`–`max_chars`, 3–4 lines), and "Ver ejemplo".
   - **`jobs`:** see the mockup. Puesto, empresa, ciudad y país, desde, hasta.
     - **2–4 achievements**, each with a verb picker (taking the verbs from `phrases`) and live checks: verb at the start, has a number, at most 170 characters.
     - "Agregar otro puesto".
     - Below "Puesto", the **U.S. equivalent** suggestion when the title is in `titles`.
   - **`education`:** título and institución, plus the suggested equivalent.
   - **`chips`:** skills (Enter adds one, × removes it). **`pick_many`:** pick 5 verbs. **`list`:** free lines.
   - **`postings`:** 2 job postings (role, company, URL, what they ask for) and the 2 reflection questions. They're reused in step 5.
   - **`autocheck`** (step 4): the checklist runs on the student's resume.
     - **Automatic rules:**
       - `no_personal_data`: no CURP, age, marital status or photo in any field;
       - `bullets_have_numbers`: at least 70% of the achievements have a number;
       - `jobs_within_15y`;
       - `fits_one_page`: the export template measures under 1 page;
       - `dates_consistent`: same format for all dates;
       - `bullets_start_with_verb`;
       - `always_true_template`: our template already meets it.
     - The rest the student ticks.
     - Every unchecked item has a **"Corregir"** button that opens the step where it's edited.
   - **`versions`** (step 5): 3 versions.
     - Company, role, the pasted ad, keywords (the app marks which ones already appear in the resume and which are missing), changes and date.
     - **Per version:** a custom summary, the skills order and rewritten achievements.
     - Suggested file name `Resume_{Empresa}.pdf`.
   - **`ai_translate`** (step 6): the button "Traducir mi resume al inglés" calls an **edge function** with the same LLM as Resume Review.
     - Translate section by section into U.S. resume English. **Keep institution names in Spanish** with the translation in parentheses.
     - Save the result as a draft in `resumes.data.en`.
     - The student reviews it with the 2 `review_questions` and approves each section ("Aprobar" / "Editar"). It can't be exported in English until every section is approved.
   - **`ai_suggest`** (optional): improvement suggestions that the student accepts or rejects one by one.
   - **`export`:** PDF (print stylesheet or server-side) and **.docx** (the `docx` package, as in Resume Review), plus **"Enviar a revisión con IA"**, which opens `/app/herramientas/resume` with the text already loaded.
   - **`card`** (step 7, Allcanza): an optional card with an external link. **Matt has to confirm it before it's shown** (`needs_matt_confirm`).
5. **Comprueba:** 3 questions (`check[]`) with `why`. When all are answered, show the night-blue card "¡Paso N completo!" and a toast. Step 7 has no questions: it ends with `finish` (the course completion card).

**Rail on the step page:** "EN ESTE PASO", the 5 parts (done / current / next, tap to scroll), plus "LO QUE CONSTRUYES" with "Ver mi resume". **Phone:** the sticky row "Parte N de 5 · {part}" with a "Mi resume" button.

## 3. Mi resume (`/app/cursos/…/mi-resume`)
- **The segmented control "Español" / "English · para enviar".** English shows only the parts the student has approved, plus a gold notice: "Traducción hecha con IA en el paso 6. Léela completa antes de enviarla."
- **The document** (white, a sheet with a shadow, Calibri/Arial): centered name, contact line, then section titles in caps with a rule (Professional Summary, Key Skills, Professional Experience, Education, Certifications).
  - Each job: puesto · empresa, ciudad, and the dates aligned right, then the bullets.
- **Side panel:**
  - **Revisión automática:** the same rules as `autocheck`.
  - **Descarga y envía:** the suggested file name `{Nombre}{Apellido}_Resume.pdf`, plus Descargar PDF, Descargar Word and Enviar a revisión con IA.
  - **Secciones:** each with "Editar · Paso N".
- An empty section shows a placeholder, "Se completa en el paso N".

## Data
- **`guided_course_steps`** (new; it's reused by the next CelsGLOBAL courses): `module_id` PK → modules, `data` jsonb (one element of `cv-resume-steps.json`), `updated_at`.
  - **Load the 7 elements** from the JSON (`module_id` is already in each one).
  - Students with access to the course can read.
- **`resumes`** (new): `user_id` PK, `data` jsonb, `updated_at`.
  - `data` holds: `{target, cv_text, diagnosis, contact, summary, jobs[], education[], certs[], skills[], verbs5[], titles3[], postings[], versions[], en:{…approved sections}, en_status}`.
  - **Row-level security: owner only** (Matt's rule: nobody else sees the student's resume or notes; it's sent to the AI only when the student taps "Enviar").
- **`guided_step_progress`:** `user_id`, `module_id`, `state` jsonb (practice answers, checks, checklist), `completed_at`.
  - A step is complete when the student answers the 3 `check` questions (step 7: when they open it).
  - XP works as it does in other lessons.
- **Old lessons:** hide the module lessons (Video, E-Book, YouTube, Downloads, Activity) from students, but **don't delete them**; their content now lives in the steps.
  - **Keep the e-books** (`from-cv-to-us-resume`, `cv-to-resume-descargas`) in "Mis libros" and the original PDFs as a download.
- **Progress / Mis cursos / CelsGLOBAL route:** progress for this course = steps completed out of 7.

## Check before you push
- The 7 steps open and show every section without blanks or errors.
- **The full flow as a student:** fill in steps 1–5 → the resume is complete in Spanish → translate (step 6) → approve → download PDF and .docx → send to Resume Review.
- **The checks work:** a bullet without a verb or a number shows a red check; adding CURP to a field flags `no_personal_data`.
- No sideways scroll at 360 px.
