# CelsGLOBAL · Tu Camino con la Visa TN: build brief (2026-10-19)

**Workflow:** build it, compare it against the mockup at 360, 390, 900 and 1440 px, and **push it live** once it matches. Matt reviews it live as a student and sends any changes through Cowork.

**Same template as the other three CelsGLOBAL courses** (`claude/celsu-global-cv-resume-brief.md`, `-interview-brief.md`, `-finanzas-brief.md`):
- course page;
- step page with 5 parts (Mira el video · Lo esencial · Practica · Construye · Comprueba);
- nothing locked;
- `guided_course_steps` / `guided_step_progress`;
- old lessons hidden.

**Only what's different is described here.** Every step is drawn by the shared `<GuidedStep>` renderer; the reference is `celsu-global-guided-renderer/guided.js` + `guided.css` (updated today, see "Renderer additions").

## Source of truth
- **`visa-tn-mockup.html`** (clickable):
  - `?v=home` is the course page;
  - `?v=mod&n=1…8` opens each step (`&demo=1` fills in the practice and the check);
  - `?v=plan` is "Mi plan TN".
- **`visa-tn-steps.json`:** the 8 steps (one per module), loaded into `guided_course_steps` by `module_id`.
- **`visa-tn-ebook-screens.json`:** a copy of the screens of the e-book `ebook-tu-camino-visa-tn` that the mockup uses (narration left out). **Read the live e-book from `ebooks`**; this file is only for the mockup.

**The course content stays the same** (Matt). The 8 modules become 8 steps:
- **Lo esencial:** the e-book's screen `mN`.
- **Videos:** the module's Wistia video, plus that module's YouTube videos (titles taken from YouTube).
- **Construye:** the module's "Descargas" guides. These are already interactive e-books in `ebooks`: `el-camino-empieza-aqui`, `tutorial-perfil-plataforma-tn`, `mini-diccionario-tn`, `guia-conversaciones-en-familia-tn`, `mercado-laboral-expectativas-y-derechos`, `la-oferta-y-visita-al-consulado`, `guia-plan-de-accion-personal`.
  - Each tool says where its items come from in **`source`**. The guides themselves stay in "Mis libros".
- **Activities:** the empty "Actividad" lessons are replaced by each step's "Construye". The e-book's `activity` text becomes the intro of "Construye".

## Look: the cover theme
- **Base:** CelsGLOBAL (ivory, Source Serif 4 for section titles, Plus Jakarta Sans for text).
- **Cover color: coral red.**
  - `--co #EB4752`, `--co2 #F26A73`, `--co3 #FDECEE` (soft background), `--cod #B42C3A` (labels).
  - Main buttons: `#F2646E → #D93744`, white text.
- **Hero = the cover:**
  - coral gradient with **lighter facets** (3 translucent linear gradients) and **white diagonal stripes** in the corners, at 112°, like the cover;
  - title in **Plus Jakarta Sans 800 italic, uppercase, white**: "TU CAMINO CON LA VISA TN:", with "Empieza aquí" smaller underneath (500 italic);
  - on the hero, the main button is night blue and the secondary is translucent white.
- **Guided-renderer accent tokens:** `--acc var(--cod)`, `--acc3 var(--co3)`, `--accb var(--co)`, `--lab var(--cod)`.
- **Theme key:** `courses.theme = 'visa_tn'`.
- **"ETAPA 1 · TU VISA":** it's month 1 of the route (`ROUTE_CARDS[0]`). The Finanzas mockup said "ETAPA 5" in its tools card; it's fixed to "ETAPA 1".

## The course "product": Mi plan TN (`/app/cursos/tu-camino-…/mi-plan`)
It's the same top-bar button as the other courses' products ("Mi plan TN").
- **4 KPIs:**
  - Tu camino: x/11 from step 1, "¿Dónde vas en tu camino?";
  - Tu perfil: x/27 from step 2;
  - Tus cursos: x/7 from step 3;
  - Tu inglés: the level and the evaluation date from step 4.
- **Cards:**
  - Mi por qué (step 5);
  - Mi IG y mi cita (step 1), plus the family conversation (step 5) and my 3 habits (step 6);
  - **Mi carpeta TN:** one bar per document group (step 7);
  - Mi entrevista en el consulado: answers prepared x/5, offer reviewed x/18, questions for my advisor (step 7);
  - **Plan 30/60/90** (step 8);
  - a countdown to **my target date** (step 8);
  - my phrase (step 8).
- **The disclaimer is always visible:** "Esta guía es informativa y no sustituye asesoría legal. Tu IG y el equipo de Allcanza revisan tu caso en particular." It also appears at the end of every step's "Construye".
- "Descargar en PDF".
- **Data:** `tn_plans` (`user_id` PK, `data` jsonb with one key per step `key`, `updated_at`). **Row-level security: owner only.**
- The hero mini card on the course page: "Listo para tu TN" = the share of the 8 parts completed.

## Renderer additions (already in `guided.js`, they also serve the other courses)
- **`from_ebook` on build sections:** `checklist`, `reflect` and `plan` can take their items from an e-book block: `"m5 checklist 1"` = the 2nd checklist on screen m5.
  - **Any block a practice or build section takes is left out of "Lo esencial"**, so it isn't shown twice.
- **`groups`** (new build type): titled groups of tap-to-check items, two columns on desktop, with an x/N counter.
  - With `goals: true`, the items left unchecked become "metas para mejorar" (step 6 habits).
- **`rights`** (new build type): an expand list plus a tip (step 6, "Tus derechos como trabajador TN").
- **`more_videos[]` with `provider: "wistia"`:** plays inline. The step 2 tutorial video is a Wistia file, not YouTube. The card title becomes "Más videos del paso".
- **`audio` on a step:** a "Resumen del curso TN (audio)" player at the top of "Lo esencial" (steps 5 and 8).
  - Play from `audio.storage` (Supabase storage). `media_url` is the old Wistia mp3, used only in the mockup.
- **The e-book name** in "Del e-book «…»" now comes from the course: `ebookTitle`.

## Steps
| # | Step | Practica | Construye |
|---|---|---|---|
| 1 | Bienvenida: tu camino empieza aquí | myth: true or false about the TN visa | Where you are on your path (11, with result) · your IG appointment · "I started my profile" |
| 2 | Tu perfil en AllcanzaTN | order: the steps of the tutorial | What you need (e-book) · **your profile, section by section** (6 groups, 27 items) · a link to allcanzatn.com |
| 3 | Prepárate con nuestros cursos | sort: which course helps (3 labels) | Which ones you've taken (e-book) · your weekly plan · where you start |
| 4 | Mejora tu inglés | listen_pick: phrases from the Mini Diccionario | Level and evaluation date · option (Intro / Business / tutoring) · **your 5 phrases** with audio · Mini Diccionario card |
| 5 | Preparación profesional y familiar | pick: answers for your family | **Your why** (e-book) · questions for you · 2 checklists (e-book) · your conversation · how it went |
| 6 | Mercado laboral y expectativas | myth from the e-book (m6) | México vs EE.UU. · **habits** (groups with goals) · your 3 habits · **your rights** |
| 7 | Cuando recibes una oferta | spot: an example offer with 4 points to clarify | **What to check in your offer** (6 groups, 18) · **your TN folder** (5 groups, 16) · answers for the consulate (5) · the day of your appointment · questions for your Allcanza advisor |
| 8 | Cierre y próximos pasos | — | Personal and professional goals · 30/60/90 plan (e-book) · next steps (e-book) · who supports me · my date · my phrase → **finish card** "Ver mi plan TN" |

## Open points for Matt / content
- **Module 1 lesson "Un mensaje del fundador de Allcanza — Michael Hendricks" has no video uploaded** (no `content_blocks`). The step shows a note; add the video when you have it.
- **The intro video "Empezamos aquí":** it's stored on the old Base44 host (`base44.app/.../C1_-_M1_-_Intro.mp4`). Move it to Supabase storage or Wistia before Base44 goes away. The step uses the "¡WELCOME!" Wistia video as its main video.
- **Practice content:** the step 7 example offer ("Midwest Parts LLC") and the family answers (step 5) are new exercises. They are built only from the course's own guides; no new immigration rules were added.
- **Progreso:** the TN course stays out of Progreso's route (Matt, 2026-10-19). Nothing changes there.

## Check before you push
- All 8 steps open with no blanks or errors, with no sideways scroll at 360 px.
- "Lo esencial" doesn't repeat what the practice or "Construye" uses (for example, step 6's myth only appears in Practica).
- **Full flow:** step 1 (path + IG) → step 2 (profile 27/27) → step 5 (your why) → step 7 (folder + consulate answers) → step 8 (plan + date) → Mi plan TN shows everything → PDF.
- The plan, the answers and the folder are visible only to their owner (check with a second account).
