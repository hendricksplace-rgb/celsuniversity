# C-047 · YouTube videos + content report

**Date:** 2026-11-23 · **Project:** `celsu-lam` · **Migration:** `supabase/migrations/20261123151933_c047_youtube_videos.sql` (applied) · **Backup:** `docs/backups/2026-11-23-before-C-047.json`

## Summary

- **60 links checked, 60 loaded** (the ticket says 54, but its tables list 60: CelsTV 32 + Visa TN 8 + Resume 6 + Interview 6 + Finanzas 8). None was rejected.
- **CelsTV 1–32** now all have a visible CelsVideo on YouTube. 1–8 were already correct and weren't touched; 9 replaced the old embed; 10–32 got a new block and `has_content=true`. 33–40 weren't touched.
- **CelsGLOBAL:** 30 lesson blocks and **27 guided steps** moved from Wistia to YouTube. The steps are what students actually see (the `ipd_sections` layout plays `guided_course_steps.data.video`, not the lesson block), so updating only the blocks would have changed nothing on screen.
- **Code:** the CelsGLOBAL step player (`GuidedStepView` → `StepVideo`) could only play a file (`<video>` with Wistia). It now plays YouTube inside the same box: the C-020 poster, play button and length show before the tap, then the `youtube-nocookie` player with `rel=0`, `playsinline` and `modestbranding`. The "Para ver más" videos (`Essentials.tsx`) were missing `rel=0`; they have it now. The shared helper is `src/lib/youtube.ts`.
- **Still on Wistia, on purpose (no new link):** Visa TN Módulo 1 "¡WELCOME!" and the Módulo 1 step video (which plays that same file), plus Visa TN Módulo 2 "YouTube Video" (shown in the step as "Tutorial en video: tu perfil paso a paso").
- **Not verified, and you need to know:** the YouTube oEmbed check couldn't run because this environment blocks `www.youtube.com`. I used vidIQ's YouTube lookup instead: every video exists on the **celstv** channel, the title matches, and each CelsGLOBAL video's length matches the old Wistia file's `duration_s` within ±1 s. What I **could not** check is whether **embedding is allowed** (a 401 in oEmbed). CelsTV 1–8 are on the same channel and already play in the app, so it's very likely allowed, but it's unconfirmed for the other 52. To verify from here next time, allow `www.youtube.com` and `www.youtube-nocookie.com` in the Claude environment.
- **Phone check as a student: not done.** I don't have the password for matthew@allcanza.com, YouTube is blocked here, and the CelsGLOBAL player change isn't deployed until this branch is merged. The steps for Matt are below.

### Check on your phone (after deploying)
Log in as matthew@allcanza.com:
1. CelsTV → Episodes **9, 10, 20, 32** → CelsVideo: the video plays inline, and at the end there's no "more videos" grid from other channels.
2. One video per CelsGLOBAL course (e.g. Visa TN Módulo 3, CV to Resume Paso 2, Interview Paso 4, Finanzas Paso 5). You should see the designed poster (number and length), and tapping it plays inside the same box.
3. Finish a CelsTV video (≥ 90 %): the part is marked done and the episode moves forward. This uses the same tracker as episodes 1–8.

---

## Part A · What C-047 loaded

oEmbed status: **"Verified (vidIQ)"** means the video exists, is on the celstv channel and the title matches. oEmbed itself (embed flag) wasn't checked because YouTube is blocked in this environment.

### CelsTV: English For Our Generation
| Ep | YouTube title | Length | Status | Loaded |
|---|---|---|---|---|
| 1 | Episode 01 - Introduction \| CELS TV | 19:43 | Verified (vidIQ) | Already there, not touched |
| 2 | Episode 2 - I am human \| Cels TV | 20:14 | Verified (vidIQ) | Already there, not touched |
| 3 | Episode 3 - My day \| Cels TV | 17:17 | Verified (vidIQ) | Already there, not touched |
| 4 | Episode 4 - Awesome family \| Cels TV | 16:39 | Verified (vidIQ) | Already there, not touched |
| 5 | Episode 05 - Basic needs | 21:54 | Verified (vidIQ) | Already there, not touched |
| 6 | Episode 6 - Let's Eat | 14:59 | Verified (vidIQ) | Already there, not touched |
| 7 | Episode 07 - My friends what we do | 19:19 | Verified (vidIQ) | Already there, not touched |
| 8 | Episode 08 - Review 1 | 21:37 | Verified (vidIQ) | Already there, not touched |
| 9 | Episode 9 - Time to Relax | 18:36 | Verified (vidIQ) | Yes (replaced the old `c9CL6JFSBDA` embed, kept in `media_url_legacy`) |
| 10 | Episode 10 - Let's Go Shopping | 17:58 | Verified (vidIQ) | Yes |
| 11 | Episode 11 - Let's Go to Work | 18:03 | Verified (vidIQ) | Yes |
| 12 | Episode 12 - Music and Me | 22:20 | Verified (vidIQ) | Yes |
| 13 | Episode 13 - Plants & Nature | 17:43 | Verified (vidIQ) | Yes |
| 14 | Episode 14 - Road Trip | 17:38 | Verified (vidIQ) | Yes |
| 15 | Episode 15 - Goals and Dreams | 25:20 | Verified (vidIQ) | Yes |
| 16 | Episode 16 - Review 2 | 23:58 | Verified (vidIQ) | Yes |
| 17 | Episode 17 - Hobbies Are Us | 21:42 | Verified (vidIQ) | Yes |
| 18 | Episode 18 - Life in the City | 25:47 | Verified (vidIQ) | Yes |
| 19 | Episode 19 - Transportation | 18:05 | Verified (vidIQ) | Yes |
| 20 | Episode 20 - Religions | 21:54 | Verified (vidIQ) | Yes |
| 21 | Episode 21 - SPORTS \| CelsTV | 18:58 | Verified (vidIQ) | Yes |
| 22 | Education - Episode 22 \| Cels TV | 20:27 | Verified (vidIQ) | Yes |
| 23 | Episode 23 - Going on Vacation \| Cels TV | 20:27 | Verified (vidIQ) | Yes |
| 24 | Episode 24 - Review 3 \| Cels TV | 22:10 | Verified (vidIQ) | Yes |
| 25 | Episode 25 - Fashion \| CelsTV | 20:01 | Verified (vidIQ) | Yes |
| 26 | Episode 26 - My Family Growing Together \| Cels TV | 20:20 | Verified (vidIQ) | Yes |
| 27 | Episode 27 - Social Media \| Cels TV | 23:24 | Verified (vidIQ) | Yes |
| 28 | Episode 28 - Going Out With My Friends \| Cels TV | 22:52 | Verified (vidIQ) | Yes |
| 29 | Episode 29 - Going to the beach (and other stuff) | 23:09 | Verified (vidIQ) | Yes |
| 30 | Episode 30 - My Home \| Cels TV | 21:34 | Verified (vidIQ) | Yes |
| 31 | Episode 31- Wild Animals | 24:26 | Verified (vidIQ) | Yes |
| 32 | Episode 32 - Review 4 \| Cels TV | 23:22 | Verified (vidIQ) | Yes |

### CelsGLOBAL · Tu Camino Con La Visa TN
| Módulo | YouTube title | Length (Wistia/storage) | Status | Loaded |
|---|---|---|---|---|
| 1 | Tu camino con la Visa TN - #01 - Introducción \| GLOBAL by Cels | 6:17 (377 s = storage 377 s ✓) | Verified (vidIQ) | Yes, block "Video: Empezamos Aquí". The **step** wasn't changed: it plays ¡WELCOME! (Wistia, 7:45), which has no YouTube link |
| 2 | … #02 - TU PERFIL DE USUARIO | 4:14 (254 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 3 | … #03 - PREPARATE CON NUESTROS CURSOS | 5:53 (353 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 4 | … #04 - MEJORA TU INGLES | 5:42 (341 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 5 | … #05 - PREPARACIO N PROFESIONAL Y FAMILIAR | 7:31 (451 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 6 | … #06 - MERCADO LABORAL Y EXPECTATIVAS EN EE.UU. | 8:45 (525 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 7 | … #07 - RECIBIR UNA OFERTA | 4:35 (275 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 8 | … #08 - Recapitulación | 2:28 (147 s ✓) | Verified (vidIQ) | Yes (block + step) |

### CelsGLOBAL · From CV to U.S. Resume
| Paso | YouTube title | Length (Wistia) | Status | Loaded |
|---|---|---|---|---|
| 1 | CV to Resume - #01 - Introducción | 10:42 (641 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 2 | … #02 - Estructura de un Resume | 16:41 (1001 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 3 | … #03 - Cómo adaptar tu experiencia al mercado de EEUU | 12:38 (758 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 4 | … #04 - ERRORES COMUNES Y CÓMO EVITARLOS | 9:19 (559 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 5 | … #05 - COMO ADAPTAR TU RESUME PARA CADA OFERTA | 8:09 (488 s ✓) | Verified (vidIQ) | Yes. **Both** duplicate blocks + step |
| 6 | … #06 - CÓMO EXPORTAR Y ENVIAR TU RESUME | 7:45 (465 s ✓) | Verified (vidIQ) | Yes. **Both** duplicate blocks + step |

### CelsGLOBAL · Crack the U.S. Interview Code
| Paso | YouTube title | Length (Wistia) | Status | Loaded |
|---|---|---|---|---|
| 1 | Crack the US interview - #1 - INTRODUCCIÓN AL CURSO | 7:32 (451 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 2 | … #02 - ANTES DE LA ENTREVISTA | 16:30 (990 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 3 | … #03 - LENGUAJE CORPORAL | 6:21 (381 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 4 | … #04 - PREGUNTAS CLÁSICAS Y CÓMO RESPONDER | 12:26 (745 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 5 | … #05 - PREGUNTAS AL ENTREVISTADOR | 17:31 (1050 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 6 | … #06 - ENTREVISTA EN INGLÉS | 8:59 (538 s ✓) | Verified (vidIQ) | Yes (block + step) |

### CelsGLOBAL · Finanzas Personales en Estados Unidos
| Paso | YouTube title | Length (Wistia) | Status | Loaded |
|---|---|---|---|---|
| 1 | Finanzas en U.S.A. - #01 | 15:45 (945 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 2 | … #02 | 11:53 (712 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 3 | … #03 | 22:49 (1369 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 4 | … #04 | 13:03 (782 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 5 | … #05 | 7:14 (434 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 6 | … #06 | 7:42 (461 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 7 | … #07 | 9:10 (550 s ✓) | Verified (vidIQ) | Yes (block + step) |
| 8 | … #08 | 8:28 (507 s ✓) | Verified (vidIQ) | Yes (block + step) |

---

## Part B · CelsTV episodes 1–40

**Standard (episodes 1–8):** artwork · CelsVideo (YouTube) · CelsCards with audio · CelsBook **interactive + flipbook** · CelsAudio **file + CelsCast transcript** · Grammar · Quiz with audio on **every** question · Teachersbook.

- **Card images:** no card has an image, and neither the data model nor the player (`Flashcards.tsx`) has an image field. It isn't part of the 1–8 standard, so it's not marked missing.
- **Thumbnail:** the episode's picture is `modules.artwork_url` (C-016), the same source for every image of the episode. It's already set for 1–32, and the files exist in `public-assets/episodes/celstv/`, so nothing was hard-coded and nothing needed extending. Inside the lesson, the YouTube player shows its own frame.
- **Storage:** I checked **3,003 `storage://` refs** in episodes 1–32 against the bucket: **0 missing**.
- The Teachersbook lesson has `has_content=false` in every episode, by design (teacher only); its content is in the `teacher_guide` block.

Cards = cards / with audio · Quiz = questions / with audio · Grammar = exercises

| Ep | Artwork | Video + thumb | Cards | CelsBook (interactive · flipbook) | CelsAudio (file · CelsCast) | Grammar | Quiz | Teachersbook | Flags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ✅ | ✅ | ✅ 22/22 | ✅ · ✅ 7 p | ✅ · ✅ | ✅ 5 | ✅ 9/9 | ✅ | |
| 2 | ✅ | ✅ | ✅ 28/28 | ✅ · ✅ 7 p | ✅ · ✅ | ✅ 5 | ✅ 9/9 | ✅ | |
| 3 | ✅ | ✅ | ✅ 38/38 | ✅ · ✅ 7 p | ✅ · ✅ | ✅ 5 | ✅ 9/9 | ✅ | |
| 4 | ✅ | ✅ | ✅ 46/46 | ✅ · ✅ 8 p | ✅ · ✅ | ✅ 5 | ✅ 9/9 | ✅ | |
| 5 | ✅ | ✅ | ✅ 42/42 | ✅ · ✅ 8 p | ✅ · ✅ | ✅ 6 | ✅ 9/9 | ✅ | |
| 6 | ✅ | ✅ | ⚠️ 38/37 | ✅ · ✅ 7 p | ✅ · ✅ | ✅ 6 | ✅ 10/10 | ✅ | 1 card without audio |
| 7 | ✅ | ✅ | ⚠️ 39/38 | ✅ · ✅ 8 p | ✅ · ✅ | ✅ 6 | ✅ 10/10 | ✅ | 1 card without audio |
| 8 | ✅ | ✅ | ✅ 50/50 | ✅ · ✅ 7 p | ✅ · ✅ | ✅ 6 | ✅ 10/10 (review `quiz`) | ✅ | |
| 9 | ✅ | ✅ new | ✅ 39/39 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 6 | ⚠️ 10/2 | ✅ | |
| 10 | ✅ | ✅ new | ✅ 43/43 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 11 | ✅ | ✅ new | ✅ 45/45 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 12 | ✅ | ✅ new | ✅ 38/38 | ❌ · ✅ 7 p | ❌ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | CelsAudio lesson empty (`has_content=false`) |
| 13 | ✅ | ✅ new | ✅ 42/42 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 14 | ✅ | ✅ new | ✅ 40/40 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 15 | ✅ | ✅ new | ✅ 44/44 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 16 | ✅ | ✅ new | ⚠️ 60/58 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ❌ none | ✅ | Quiz lesson empty · 2 cards without audio |
| 17 | ✅ | ✅ new | ✅ 33/33 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 18 | ✅ | ✅ new | ✅ 39/39 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 6 | ⚠️ 10/2 | ✅ | |
| 19 | ✅ | ✅ new | ✅ 35/35 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 20 | ✅ | ✅ new | ✅ 42/42 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 21 | ✅ | ✅ new | ✅ 38/38 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 22 | ✅ | ✅ new | ✅ 40/40 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 23 | ✅ | ✅ new | ⚠️ 39/38 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | 1 card without audio |
| 24 | ✅ | ✅ new | ✅ 37/37 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ❌ none | ✅ | Quiz lesson empty |
| 25 | ✅ | ✅ new | ✅ 42/42 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 26 | ✅ | ✅ new | ✅ 51/51 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 27 | ✅ | ✅ new | ✅ 37/37 | ❌ · ✅ 6 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 28 | ✅ | ✅ new | ✅ 36/36 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 29 | ✅ | ✅ new | ⚠️ 41/40 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | 1 card without audio |
| 30 | ✅ | ✅ new | ⚠️ 47/43 | ❌ · ✅ 7 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | 4 cards without audio |
| 31 | ✅ | ✅ new | ✅ 44/44 | ❌ · ✅ 8 p | ✅ · ❌ | ✅ 5 | ⚠️ 10/2 | ✅ | |
| 32 | ✅ | ✅ new | ✅ 72/72 | ❌ · ✅ 6 p | ✅ · ❌ | ✅ 5 | ❌ none | ✅ | Quiz lesson empty |
| 33–40 | ❌ | ❌ | ❌ | ❌ · ❌ | ❌ · ❌ | ❌ | ❌ | ❌ | All 6 student lessons are published but empty (hidden); no artwork; no teacher guide |

Notes:
- **Quiz 9–31 "10/2":** the quiz exists and works, but only the 2 listening questions have audio (`audioUrl`). In 1–8, every question also has a narration (`question_audio` with word timing). The narrations are missing; the questions aren't.
- **Episodes 10–32 complete again:** no student had finished every other part of an episode in 10–32, so turning on the CelsVideo didn't send any finished episode back to "in progress".

---

## Part C · CelsGLOBAL by course

Common to all 4 courses:
- Students see the **guided step** (`/app/cursos/<slug>/paso/N`). The lessons redirect there (`#vid` for video lessons).
- "E-Book" and "Downloads" lessons are `embed` blocks whose `settings.src` is still `designrr.page`. They **don't render it**: they show `ebook_pdf` (storage) or open the interactive e-book. Designrr is legacy only.
- I checked every `storage://` ref in the 4 courses (e-book PDFs, audio, C-020 posters): **0 missing**. The only "missing" hit is `…/interview/`, a folder prefix used by the simulator, not a file.
- Module videos: everything points to YouTube except the 3 Visa TN items above.

### Tu Camino Con La Visa TN (8 modules)
| Módulo | Main video (step) | Other lessons | Audio | External / issues |
|---|---|---|---|---|
| 1 · Bienvenida | ⚠️ Step: **¡WELCOME!** (Wistia). The "Empezamos Aquí" block is now YouTube #01 | E-Book ✅ · ¡WELCOME! ⚠️ Wistia · "Un Mensaje del Fundador de Allcanza" ❌ empty (published) · Descargas ✅ · Actividad ✅ | — | Wistia ×2 (block + step). The "Empezamos Aquí" block's title says "Introducción CV to Resume" (wrong label) |
| 2 · Perfil Allcanzatn | ✅ YouTube #02 | E-Book ✅ · "YouTube Video" ⚠️ **Wistia** (in the step: "Tutorial en video: tu perfil paso a paso") · Downloads ✅ | — | Wistia ×2 (block + `more_videos`) |
| 3 · Nuestros Cursos | ✅ YouTube #03 | E-Book ✅ · Downloads ✅ (text) | — | — |
| 4 · Mejora tu Inglés | ✅ YouTube #04 | E-Book ✅ · Downloads ✅ · YouTube Video ✅ (external, 1) · Actividades ✅ | — | — |
| 5 · Prep. Profesional y Familiar | ✅ YouTube #05 | E-Book ✅ · Downloads ✅ · YouTube 1/2/3 ✅ (external) · Actividades ✅ | ✅ 1 | — |
| 6 · Mercado Laboral | ✅ YouTube #06 | E-Book ✅ · Downloads ✅ · YouTube Video ✅ (external) | — | — |
| 7 · Recibes una Oferta | ✅ YouTube #07 | E-Book ✅ · Downloads ✅ · YouTube Video ✅ (external) | — | — |
| 8 · Cierre | ✅ YouTube #08 | E-Book ✅ · Downloads ✅ · Actividades ✅ | ✅ 1 | — |

E-books (`public.ebooks`), all **published**: `ebook-tu-camino-visa-tn` (8 screens), `el-camino-empieza-aqui`, `tutorial-perfil-plataforma-tn`, `guia-plan-de-accion-personal`, `guia-conversaciones-en-familia-tn`, `mercado-laboral-expectativas-y-derechos`, `la-oferta-y-visita-al-consulado`, `mini-diccionario-tn`. None in `review`.

### From CV to U.S. Resume (7 modules)
| Paso | Main video (step) | Other lessons | Audio | External / issues |
|---|---|---|---|---|
| 1 · Introducción | ✅ YouTube #01 | E-Book ✅ · YouTube Videos ✅ (external) · Downloads ✅ · Activity ✅ | — | — |
| 2 · Estructura | ✅ YouTube #02 | E-Book ✅ · YouTube Videos ✅ · Downloads ✅ · Activity ✅ | — | — |
| 3 · Adaptar experiencia | ✅ YouTube #03 | E-Book ✅ · YouTube Videos ❌ empty (published) · Downloads ✅ · Activity ✅ | — | — |
| 4 · Errores comunes | ✅ YouTube #04 | E-Book ✅ · YouTube Videos ⚠️ **2 identical blocks** · Downloads ✅ · Activity ✅ | — | Duplicate |
| 5 · Adaptar a cada oferta | ✅ YouTube #05 | Module Training Video ⚠️ **2 identical blocks** · E-Book ⚠️ ×2 · YouTube Videos ❌ empty · Downloads ⚠️ ×2 · Activity ✅ | — | Duplicates |
| 6 · Exportar y enviar | ✅ YouTube #06 | Module Training Video ⚠️ **×2** · E-Book ⚠️ ×2 · YouTube Videos ✅ · Downloads ⚠️ ×2 · Activity ✅ | — | Duplicates |
| 7 · Cierre | — (step with no video, "En pocas palabras") | Module Training Video ❌ · E-Book ⚠️ ×2 · YouTube Videos ❌ · Downloads ❌ · Activity ❌ (4 empty published lessons) | — | Duplicate |

E-books: `from-cv-to-us-resume` (published, 7 screens), `cv-to-resume-descargas` (published).

### Crack the U.S. Interview Code (7 modules)
| Paso | Main video (step) | Other lessons | Audio | External / issues |
|---|---|---|---|---|
| 1 · Bienvenida | ✅ YouTube #1 | E-Book ✅ · YouTube Videos ✅ (external) · Downloads ✅ · Activity ✅ | — | — |
| 2 · Antes de la Entrevista | ✅ YouTube #02 | E-Book ✅ · YouTube Videos ✅ · YouTube Videos 2 ✅ · Downloads ✅ · Activity ❌ empty (published) | — | — |
| 3 · Lenguaje Corporal | ✅ YouTube #03 | E-Book ✅ · YouTube Videos ✅ · Downloads ✅ · Activity ✅ | — | — |
| 4 · Preguntas Clásicas | ✅ YouTube #04 | E-Book ✅ · YouTube Videos ✅ · YouTube Videos 2 ✅ · Downloads ✅ · Activity ✅ | — | — |
| 5 · Preguntas al Entrevistador | ✅ YouTube #05 | E-Book ✅ · YouTube Videos ✅ · Downloads ✅ · Activity ❌ empty (published) | — | — |
| 6 · Entrevistas en Inglés | ✅ YouTube #06 | E-Book ✅ · YouTube Videos ✅ · Downloads ✅ · Activity ✅ | — | — |
| 7 · Cierre | — (no video) | Module Training Video ❌ · E-Book ✅ · YouTube Videos ❌ · Downloads ❌ · Final Activity ✅ | — | — |

E-book: `crack-the-interview-code` (published, 7 screens).

### Finanzas Personales en Estados Unidos (9 modules)
| Paso | Main video (step) | Other lessons | Audio | External / issues |
|---|---|---|---|---|
| 1 · Bienvenida | ✅ YouTube #01 | E-Book ⚠️ · Downloads ✅ · Activity ✅ | ✅ 1 | — |
| 2 · Presupuesto | ✅ YouTube #02 | E-Book ⚠️ · Downloads ✅ · Activity ✅ | — | — |
| 3 · Crédito | ✅ YouTube #03 | E-Book ⚠️ · Downloads ✅ · Activity ✅ | — | — |
| 4 · Vivienda | ✅ YouTube #04 | E-Book ⚠️ · Downloads ✅ · Activity ✅ | — | — |
| 5 · Servicios Básicos | ✅ YouTube #05 | E-Book ⚠️ · Downloads ✅ · Activity ✅ | — | — |
| 6 · Transporte | ✅ YouTube #06 | E-Book ⚠️ · Downloads ✅ · Activity ✅ | — | — |
| 7 · Ahorro | ✅ YouTube #07 | E-Book ⚠️ · Downloads ✅ · Activity ✅ | — | — |
| 8 · Consejos Prácticos | ✅ YouTube #08 | E-Book ⚠️ · Downloads ✅ · Activity ✅ | — | — |
| 9 · Cierre | — (no video) | Module Training Video ❌ empty (published) · E-Book ⚠️ · Downloads ✅ · Activity ✅ | — | — |

E-books: `tu-dinero-tu-camino-guia-financiera` (**published**, 10 screens). ⚠️ `tu-dinero-tu-camino` (10 screens) is still a **draft**, and the "E-Book" lesson in all 9 modules points to it (`ebook_slug`). Since it isn't published, students get the PDF instead of the interactive e-book. Decision: publish it, or point those lessons to the published one.

---

## Part D · Loose ends

### Wistia / Base44 / other hosts across the app
Counted on **live** fields only (what plays or opens). `*_legacy` fields are archive, not shown.

| Where | Host | Live | Detail |
|---|---|---|---|
| **CelsUS Para Ciudadanía** | Wistia | **13** | Episode videos 1–5, audio 3–5, Live 1–5 with Abogado Miguel. **The largest piece still on Wistia** |
| Visa TN | Wistia | 4 | ¡WELCOME! (block + Módulo 1 step), Módulo 2 "YouTube Video" (block + step `more_videos`) |
| CelsTV, CV to Resume, Interview, Finanzas | Wistia | **0** | (31 + 8 + 6 + 9 + their steps are now only in `media_url_legacy`) |
| CelsBSNS (English for Business) | Wistia | 0 | — |
| Any course | Base44 | **0** | 25 refs in CelsBSNS and 1 in Visa TN, all in `media_url_legacy[_prev]`. `media_files` keeps 2,972 Base44 `source_url`s as the migration inventory (not served) |
| CelsGLOBAL (4) + CelsUS | Designrr | 0 rendered | 64 `settings.src` + 4 in CelsUS: all have `ebook_pdf`/interactive e-book, so Designrr never loads |
| CelsBSNS | Google Classroom | 11 | Links inside lesson text (`text_es`) |
| CelsTV | Gamma | 0 rendered | 32 `source_url`s for the Teachersbook (archive; the content is in the block) |

### Duplicate blocks (identical data in the same lesson), all in From CV to U.S. Resume
- Paso 4 · YouTube Videos (×2)
- Paso 5 · Module Training Video (×2: `83fd303e…`, `fa118f8a…`), E-Book (×2), Downloads (×2)
- Paso 6 · Module Training Video (×2: `681d09ed…`, `feb0a4f7…`), E-Book (×2), Downloads (×2)
- Paso 7 · E-Book (×2)

None were deleted (C-047 only updated the video ones). Matt decides. The guided step shows the video only once; the duplication shows in the lesson view.

### Empty lessons that are still published (`has_content=false`, not teacher-only)
They don't show to students (they're hidden), but they're still published:
- **CelsTV:** 52 = ep 33–40 (6 each = 48) + ep 12 CelsAudio + ep 16/24/32 Quiz.
- **CelsBSNS (English for Business):** 39 "Week N · Video NN" (weeks 1, 3, 4, 6, 7, 8, 9, 10).
- **CV to Resume:** 6 (Paso 3 and 5 YouTube Videos; Paso 7 Training Video, YouTube Videos, Downloads, Activity).
- **Interview:** 5 (Paso 2 and 5 Activity; Paso 7 Training Video, YouTube Videos, Downloads).
- **Finanzas:** 1 (Paso 9 Training Video).
- **Visa TN:** 1 (Módulo 1 "Video: Un Mensaje del Fundador de Allcanza").

---

## Part E · Para Ludo

### Lo que Ludo tiene que producir o subir
**CelsTV**
- Ep 12: archivo de audio CelsAudio (mp3).
- Ep 33 a 40: todo el episodio. Video en YouTube, arte del episodio, CelsCards, CelsBook (PDF), audio CelsAudio, Grammar, Quiz y Teachersbook.
- Ep 16, 24 y 32: el quiz de repaso, **solo si Ludo tiene uno propio**. Si no, lo arma el equipo (ver abajo), igual que el del Ep 8.

**Tu Camino Con La Visa TN**
- Módulo 1: video "¡WELCOME!" en YouTube (hoy sigue en Wistia y es el video principal del paso 1).
- Módulo 1: video "Un Mensaje del Fundador de Allcanza" (la lección existe pero está vacía).
- Módulo 2: el tutorial "Tu perfil paso a paso" (lección "YouTube Video") en YouTube (hoy en Wistia).

**From CV to U.S. Resume**
- Paso 7 (Cierre): video del módulo, si se quiere que tenga uno.

**Crack the U.S. Interview Code**
- Paso 7 (Cierre): video del módulo, si se quiere que tenga uno.

**Finanzas Personales**
- Paso 9 (Cierre): video del módulo, si se quiere que tenga uno.

**CelsUS Para Ciudadanía** (fuera de este ticket, pero sigue en Wistia)
- Subir a YouTube (no listado): videos de los Episodios 1 a 5, audios de los Episodios 3 a 5 y los 5 Lives del Abogado Miguel. Mandar los links.

**Para todos los videos en YouTube**
- Confirmar que tengan activado "Permitir insertar" ("Allow embedding"). No se pudo comprobar desde aquí.

### Lo construye el equipo (no Ludo)
**CelsTV**
- CelsBook interactivo de los Ep 9 a 32, a partir del flipbook que ya existe.
- Transcripciones CelsCast (el repaso de Amy y Brian, con audio) de los Ep 9 a 32.
- Narración de cada pregunta del quiz (audio con marcas de tiempo) de los Ep 9 a 31. Hoy solo 2 de 10 preguntas tienen audio.
- Quiz de repaso de los Ep 16, 24 y 32, armado con las preguntas de los episodios anteriores, como el del Ep 8.
- Audio de las tarjetas que no lo tienen: Ep 6 (1), 7 (1), 16 (2), 23 (1), 29 (1), 30 (4).

**CelsGLOBAL**
- Finanzas: publicar el e-book interactivo `tu-dinero-tu-camino` (está en borrador) o apuntar las lecciones al publicado.
- CV to Resume: quitar los bloques duplicados de los Pasos 4, 5, 6 y 7 (cuando Matt lo apruebe).
- Visa TN Módulo 1: corregir el título del bloque de video, que dice "Introducción CV to Resume".
- Despublicar u ocultar las lecciones vacías listadas en la Parte D, o dejarlas así si se van a llenar pronto.
