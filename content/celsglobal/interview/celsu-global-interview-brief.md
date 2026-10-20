# CelsGLOBAL · Crack the U.S. Interview Code: build brief (2026-10-19)

**Workflow:** build it, compare it against the mockup at 360, 390, 900 and 1440 px, and **push it live** once it matches. Matt reviews it live as a student and sends any changes through Cowork.

**This uses the same template as From CV to U.S. Resume** (`claude/celsu-global-cv-resume-brief.md`): course page, a 7-step template with the 5 parts (Mira el video · Lo esencial · Practica · Construye · Comprueba), "nothing is locked", the `guided_course_steps` and `guided_step_progress` tables, and hiding the old lessons. **Only what's different is described here.**

**Source of truth:**
- **`interview-mockup.html`** (clickable): `?v=home` is the course page, `?v=mod` is step 4 (`&demo=1` fills the practice), `?v=bank` is "Mi banco de respuestas", and `?v=sim` is the mock interview (`&rec=1` shows it recording).
- **`interview-steps.json`:** the 7 steps, loaded into `guided_course_steps` (keyed by `module_id`). It reuses the course's existing content: the e-book "Crack the Interview Code", the 5 activities and the YouTube descriptions.

**Matt asked for the same design as Resume, with the cover's colors.** The course stays the same; only the design changes.


## Every step is now in the mockup (2026-10-19)
- **`?v=mod&n=N`** opens step N (1–7). On the course page, each step's button opens its own step; Anterior/Siguiente move between steps. `&demo=1` fills in the practice and the check.
- Step 4 stays the hand-built example. **All other steps are drawn by one data-driven component** that reads that step's JSON (`guided_course_steps.data`), so what you see is the real content of each step.
- **Build it the same way:** one `<GuidedStep>` component with a renderer per type: essentials blocks (`para, keys, expand, steps, myth, compare, checklist, phrases, list, tip, quote, titles, glossary, say, whatif, activity`), practice `kind`s and build `type`s. The reference is `celsu-global-guided-renderer/guided.js` + `guided.css` (plain JS; port it to React components, don't copy it in).
  - Nothing should be hard-coded per course: the course only supplies its theme colors (`--acc`, `--acc3`, `--accb`, `--lab`) and its "product" button.
- **Rules the renderer follows:**
  - A step with `video: null` shows "En pocas palabras" (the 3 keys) instead of the video.
  - A step with `check: null` (the last step) ends with "Terminar el curso" and then shows the `finish` card.
  - `more_video` / `more_videos` → "Para ver más" (YouTube thumbnail; it plays inline with youtube-nocookie).
  - The Wistia video plays inline (`video.media_url`).
  - `essentials_from` (Finanzas): skip the blocks in `skip`, and also skip the e-book block the practice already uses (`practice.from_ebook`, e.g. `m5 myth`), so it isn't shown twice.

## Look: the cover theme
- **Base:** CelsGLOBAL (ivory `#F4F1EA`, night `#14182B`, Source Serif 4 for section titles, Plus Jakarta Sans for text).
- **Course accent:** the cover's **mustard yellow**: `--am #E9B735`, `--am2 #F4CF5E`, `--am3 #FFF4D2` (soft background), `--amd #8A6200` (labels on light backgrounds).
  - **Gold buttons:** `#F6D46A → #E3A92A`, with text `#1C1505`.
  - **Labels** ("PASO N DE 7", section kickers) in `--amd`.
- **Hero = the cover:**
  - mustard gradient `#F3C94E → #E8B232 → #DFA22A`;
  - **diagonal white stripes** at 115° in the corners (as on the cover);
  - the title in **Plus Jakarta Sans 800 italic, uppercase, white** with a soft shadow: "CRACK / *the United States* / INTERVIEW CODE" (the middle line is smaller and dark);
  - text and chips in dark `#1C1505` on translucent white;
  - main button night blue, secondary translucent white.
  - Step pages use the same hero, smaller.
- **Section icons:** mustard tiles with dark text. The current node and card on the route get a mustard halo and border; finished nodes are night blue.
- **Theme key:** `courses.theme = 'interview'` (the Resume one is `'resume'`), so the next courses only need new data plus a color.

## The course "product": Mi banco de respuestas (`/app/cursos/crack-…/mi-banco`)
Just as the Resume course builds "Mi resume", this one builds the student's **answer bank**. It's the same "Mis respuestas" button in the top bar.
- **Frase de valor** (step 1): a cream card with serif text.
- **The 8 answers** (step 4): status Lista / Pendiente, plus the estimated speaking time.
- **Company card** (step 2) and **my 3 questions** (step 5), each with an English 🔊 button.
- **Rail:** "Listo para la entrevista" (checks for each part), "Descargar mi banco (PDF)", and "Privado".
- **Phone:** a sticky row "N de 8 respuestas listas" + "Simulacro".
- **Data:** `answer_banks` (`user_id` PK, `data` jsonb `{value, improved[], company{…}, prep[], rubric{…}, answers[8]{text|star{S,T,A,R}|parts, ready}, questions[], sim_runs[]}`, `updated_at`).
  - **Row-level security: owner only** (Matt's rule: private notes and answers).

## New pieces of the template (they don't exist in Resume)
**Practica:**
- **`label`** (step 4): each sentence with S / T / A / R buttons (46 px). Right turns green; wrong turns red and shows the right letter. Once all 4 are done, show the `done` message.
- **`myth` as practice** (steps 3 and 5): the same component as the e-book's `myth`, with the button labels from `labels` (Ayuda / Perjudica, Sí / Mejor no).
- **`spot`** (step 2): the same component as Resume step 4, with lines describing a video call.
- **`listen_pick`** (step 6): a situation in Spanish and 3 English phrases, each with 🔊. Tapping one gives the answer.

**Construye:**
- **`normal_vs_better`** (step 1): for each question, two text areas: "Respuesta normal" and "Respuesta mejorada (demuestra tu valor)".
- **`answers`** (step 4): see the mockup.
  - **An accordion of the 8 questions** (EN title, ES subtitle, status).
  - **The fields depend on `form`:**
    - `star`: 4 fields S/T/A/R, each with its color: S `#2E6F86`, T `#7A4FD6`, A `#D99A1F`, R `#2F7D57`;
    - `present_past_future`: 3 fields;
    - `strength_weakness`: strength + example, then the 3-part weakness script;
    - `five_years`: present / near future / 5-year goal;
    - `free`: 1 text area.
  - **`prefill_from`** fills the field in when it's still empty (the value statement, the "why" from the company card).
  - **Live meter:** `words ÷ 130 × 60` = seconds. Bar plus chips: "Menos de 2 min" (≤ 120 s) and "Buen nivel de detalle" (≥ 40 s; below that: "Agrega un poco más de detalle").
  - **Buttons:** "Escuchar mi respuesta" (TTS en-US), "Practicar en voz alta" (opens the mock interview on that question) and "Marcar como lista".
- **`self_video`** (step 3): the camera with a countdown (2–3 min), the question on screen, and the "Pon atención a" list.
  - **The video is NEVER uploaded** (`upload:false`): it's kept in memory so the student can watch it back. When they leave, it's discarded.
  - Then the **`rubric`**: 5 groups × 3 questions, each with Sí / Más o menos / No, and comments per group.
- **`simulator`** (step 6): see `?v=sim`.
  - **The interview room** (night blue): "PREGUNTA N DE 7", 7 progress segments, the Solo / Con un amigo o familiar switch, and the interviewer **Sarah** (role and company from the company card).
  - **The question:** large serif text, the Spanish below it, "Escuchar otra vez" and «Can you repeat the question?».
  - **Audio:** the recorded mp3s at `course-media/f7d7f4e4…/interview/` (`q-about-yourself`, `q-why-this-job`, `q-strengths-weaknesses`, `q-challenge-at-work`). The others use TTS until Cowork records them with the same voice.
  - **Microphone:** a large button inside a 2:00 ring (it turns red and pulses while recording). The live transcript comes from Web Speech `en-US`; use the transcription Edge Function from CelsBSNS Speaking as the fallback.
  - **Evaluation:** 4 rows (Tiempo · Actitud · Claridad · Uso de STAR) with the course's original options, plus comments.
    - **"Con un amigo"** mode: the friend fills it in on the same device.
    - **Question 7 is a surprise:** in friend mode the friend types it in; in solo mode the app picks a question the student hasn't practiced.
  - **Privacy:** "Tu voz no se guarda: solo el texto de tu respuesta y tu evaluación" (the same rule as CelsBSNS Speaking).
  - **Each run saves** `sim_runs[]` (date, mode, transcript per question, evaluation, comments). The final reflection (`reflect6`) comes after the last question.
- **`pick_many` with `audio`** (step 5): the cards play the English when tapped.
- **`more_videos[]`:** this course has **one or two** YouTube videos per step, each with a description in Spanish. They show in "Para ver más".

## Steps (summary; the content is in the JSON)
| # | Step | Practica | Construye |
|---|---|---|---|
| 1 | Tu valor, no solo tus respuestas | pick (3) | Value statement + normal → better answers (5 questions) |
| 2 | Antes de la entrevista | spot: the video call (5 problems) | Company card + preparation checklist |
| 3 | Lenguaje corporal y presencia | myth: helps or hurts | Recording (not uploaded) + 15-point rubric + strengths and areas to improve |
| 4 | Preguntas clásicas con STAR | label STAR | **The 8 answers** + review guide + reflection |
| 5 | Tus preguntas para el entrevistador | myth: would you ask it? | 2 questions from the list + 1 of your own |
| 6 | La entrevista en inglés | listen_pick | **Full mock interview** (7 questions, solo or with a friend) + reflection |
| 7 | Tus siguientes pasos | — | Practice plan → course close and "Ir a English for Business" |

**Activities that were empty** (modules 2 and 5 had no activity in Kajabi) are now built from the e-book content for that same module.

## Check before you push
- All 7 steps open with no blanks or errors; no sideways scroll at 360 px.
- **Full flow:** fill in the value statement → the company card → answer 4 → simulator in both modes → the bank shows everything → PDF.
- **Camera and microphone:** test with the fake devices; confirm nothing is sent to storage (look at the network tab).
