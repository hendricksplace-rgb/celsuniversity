# Pre-invitation logged-in test pass — 2026-10-20

Checklist: `content/fixes/pre-invitation-2026-10-20.md`, section A. Branch `invite-qa` (tested on main b59c8b2 + cd9a526; main 1eaeb32 merged before push, no overlap with these fixes, tsc/lint/build re-run).

**How it was tested.** I ran a local production build (`next build` + `next start -p 3600`) against the live database. Three throwaway students were created through the admin API, with access granted the same way "Dar acceso" grants it: an `enrollments` row (source `manual`, status `active`, `individual`, length from the products' grants) plus an `admin_audit_log` insert.

- **A:** program `international-professional-development` (18 months).
- **B:** course `celsus-para-ciudadania` (9 months).
- **C:** no access.

Playwright drove Chromium 141 at 360 and 1440 px. On every page I recorded console errors, failed requests (YouTube, Vimeo, Wistia and TED ignored; the sandbox blocks them), HTTP status, horizontal overflow and blank sections.

- **Speaking.** The Safari recording path (MediaRecorder + `transcribe-speech`) was forced with the built-in test hook `localStorage["celsu:rec-engine"]="webkit"`, using Chrome's fake mic and camera. Only **1** real `transcribe-speech` call was made; the other 6 recordings got a mocked reply.
- **AI tools.** `ai-tools` was called twice: `resume_submit` once and `interview_answer` once. `interview_finish`, which sends the summary email, was never called; the test also blocked it at the network level.

The final sweep on the fixed build loaded A's pages 180 times, B's 24 times and C's 204 times, with **0 console errors, 0 failed requests, 0 overflow**.

Cleanup:
- The 3 users and every row they created are deleted: progress, guided/reading/speaking/research/capstone rows, financial plan, enrollments, the 2 audit rows, the resume review (still inside its 48 h hold, so no email went out), the interview session, and the 2 storage files.
- `email_outbox` has nothing for them.
- The 19 imported CelsGLOBAL students were not touched.

## Results

| # | Checklist item | 360 px | 1440 px | Note |
|---|---|---|---|---|
| 1 | Mis cursos, A (program) | pass | pass | 6 courses: Visa TN, CV, Interview, Finanzas (route) + CelsBSNS, CelsTV (included). The draft courses Resume Review and Interview Prep are not listed; the only cards with those names are the AI tools linking to `/app/herramientas/*`. The draft course URLs return "No encontramos esta página". **This is what the 19 imported CelsGLOBAL students will see.** |
| 1 | Mis cursos, B (CelsUS) | pass | pass | Only CelsUS + its 5 CelsBooks. |
| 1 | No "Comprar" on owned courses | pass | pass | No "Comprar" for A or B. |
| 2 | CelsTV ep. 1: video, CelsCards, CelsBook + flipbook, CelsAudio + transcript, Grammar, Quiz with audio | pass | pass | Flipbook ("Ver el libro original") opens. The quiz has "Leer la pregunta". |
| 2 | CelsTV ep. 3: no empty player | pass | pass | Shows "Video próximamente". |
| 2 | CelsTV progress goes up | pass | pass | 0/6 → 1/6, 0 → 100 XP; Mis cursos shows 1 %. Episodes 2–8 all open. |
| 3 | BSNS Reading: highlights + cards | pass | pass | Clicked every highlighted word: week 1 (8), week 2 (18), week 9 (16 + 1 in an answer option). Every card shows the term, its Spanish, a definition and an example. Data check: every highlighted term in weeks 2, 8 and 9 has a card, and every card is highlighted. **Fixed:** words inside the Case 3 answer options were nested buttons (see Broken). |
| 3 | Writing saves | pass | pass | The draft autosaves and survives a reload. "Guardar como terminado" completes it (needs 150–250 words + the 6 parts ticked). |
| 3 | Research | pass | pass | Both examples were completed and the task finished. |
| 3 | Video task | pass | pass | Record/stop with the fake camera; the thumbnail saved to `video-proofs`; marked completed. |
| 3 | Speaking: record/stop 5×, completes with 1 try | pass | pass | Safari path: 7 record/stop cycles, none froze. Reps were [1,1,5] against 3/2/5 needed, and the lesson completed. Real Safari was not available. |
| 3 | Feedback closes the week | pass | pass | "Cerrar mi semana 1" works. It requires the self-evaluation, a goal and the week's Capstone part. |
| 3 | Capstone parts 1–2 | pass | pass | Part 1 was completed in week 1; Part 2 opened once week 2 was current. 2/10 after a reload. |
| 3 | Diccionario parentNode error | not reproduced | not reproduced | See Broken → needs Matt / watch. |
| 3 | Progreso shows the right week | pass* | pass* | After week 1 reached 7/7, the course link, Mis cursos ("Semana 2 de 10") and Inicio all point to week 2. *For package students, Progreso shows no CelsBSNS road at all; see "needs Matt". |
| 4 | CV / Interview / Finanzas / Visa TN: steps 1, 3, last | pass | pass | All open without errors. Practice reacts to taps; the 3-question check answers and completes the step; the last step shows "Terminar el curso". |
| 4 | Finanzas step 3 | pass | pass | Used every build section: 3 concepts, pick-2 with the "why" fields, 3 rules, monthly expense + review day, reflection. Also the practice ordering and the 3-question check. Everything survived a reload and appears in Mi plan financiero. **Hardened** so no data shape can throw (see Broken). |
| 4 | Products save + PDF | pass | pass | Mi resume, Mi banco, Mi plan financiero, Mi plan TN. The PDF button opens the print dialog (verified `window.print()` is called) and the print layout renders: 7.6 / 18 / 32 / 30 KB PDFs. Mi resume also has Word (.docx). |
| 4 | CV step 7 renders | pass | pass | "Tus siguientes pasos" renders without the Allcanza card. |
| 5 | CelsUS ep. 1, all 6 parts | pass | pass | Video, Tarjetas, Audio, Live con el Abogado, Quiz (5 civics questions) and the extra lessons (Reading & Writing, Repaso). |
| 5 | Tarjetas | pass | pass | Exam choice (A/B/C) shown. |
| 5 | Week 2 flashcard PDF | pass | pass | `/app/archivo` returns 302 → signed URL → 200 `application/pdf`. |
| 5 | Final exam | pass | pass | Interview mode, answered with "ver opciones" (including a 2-answer question). It ends after 9 wrong, shows the result and saves it. |
| 5 | Progreso (B) | pass | pass | XP updates; CelsUS card shown. |
| 6 | AI Resume (A) | pass | pass | The pasted resume came back `ready` with a full review, held 48 h (row deleted before any email). |
| 6 | AI Práctica de entrevista (A) | pass | pass | "Tell me about yourself": record → upload → feedback screen. The fake mic is silent, so the result was 0/4 with a "revisa tu micrófono" note. |
| 7 | C: every course URL shows no access, never content | **fail → fixed** | **fail → fixed** | Before the fix, C (and B) could open every CelsBSNS week page. After the fix, all 102 URLs (courses, weeks, tasks, capstone, dictionary, steps, episodes, parts, lessons, products, books) show the access notice, a 404 or the CelsGLOBAL info page. No course content shows. |

## Broken

### Blockers fixed (commit ff30b4a)
1. **CelsBSNS weeks were open to anyone signed in.** `/app/cursos/english-for-business/semana/N` had no access check, and `/app/cursos/english-for-business` redirected everyone to a week page. So a CelsUS buyer (B), or an account with no access at all (C), saw every week: intro, task list, route, syllabus card. Task pages, capstone and dictionary were already gated.
   - Fix: the week page now redirects to the course page when the student has no access. The course page only redirects to the current week when the student has access; otherwise it shows the week list with the usual access notice.
   - Re-tested for A, B and C at both widths.
   - Failure screenshots (before the fix): `invite-qa-shots/C-1440-_app_cursos_english_for_business_*.png`.
2. **Finanzas step 3 `flatMap` crash: root cause and guard.** `client_errors` shows the 16 errors between 00:21 and 01:09 UTC. Step 3's `guided_course_steps` row (updated 00:10) uses `essentials_from` and has no `essentials`. The renderer deployed at that time called `step.essentials.flatMap(...)`. Commit 73c55f7 ("Finanzas on the guided template", deployed 01:45) already added `?? []`, which is why there are none since.
   - Extra guard added: `loadGuided` now normalizes every step row before it reaches the client. `build.sections`, `essentials`, `more_videos`, `check`, `keys` and the lists inside sections and blocks (`items`, `options`, `prompts`, `fields`, `tabs`, `questions`, `groups`, `rows`) are always arrays. Malformed entries are dropped and `practice` falls back to `null`.
   - The e-book screens and blocks used for "Lo esencial" get the same guard. A missing array in any course's step data can no longer crash a step, Mi plan, Mi banco, Mi resume or the simulacro.

### Non-blockers fixed (commit 86d5b8d)
3. **Reading, Case 3: buttons inside buttons.** Highlighted words inside an answer option (week 1: "setbacks", "on track") rendered a `<button>` inside the option `<button>`. That is invalid HTML, and tapping the word to see its card also picked that option as your answer. Inside options the word now stays highlighted as plain text; its card still opens from the article.
4. **Syllabus stayed "Pendiente" after signing.** Only the "Siguiente" link at the bottom finished the syllabus. A student who signed "Mi compromiso" and went back saw the syllabus as pending, and the week page kept saying "Lo siguiente es leer el syllabus" at 6/7. Signing now finishes the lesson (re-tested: the week goes to 7/7).

### Content for Cowork (no rows changed)
- **CelsBSNS week 6 Reading:** the vocab has cards for "red flag" and "conflict of interest", but the text never highlights them (`[[…]]`), so students can't open those two cards.
- Weeks 2, 8 and 9 (changed today) are consistent: 18, 17 and 16 highlighted terms, each with its card.

### Needs Matt
- **Diccionario "Cannot read properties of null (reading 'parentNode')".** I could not reproduce it.
  - It was logged once, at 2026-10-19 22:26 UTC, from `localhost:3600`. That was another agent's local build, 24 minutes before the dictionary was even committed (f3274bd, 22:50), not a student.
  - The stack is `$RS`, React's streaming script that moves the page into place. It fails when the hidden `S:1` segment is gone from the DOM, which happens when something outside React (a test harness, a browser extension, a root-level hydration mismatch) changes `<body>` while the page streams. It is not our scroll handler, letter jump or refs: those run only after the content is placed.
  - Tried: 20+ loads at 360 and 1440, throttled to 30/80/200 KB/s with a warm cache, navigating away mid-stream 4×, soft navigation in and out, `?go=M`, letter jumps, search and star. Zero errors on b59c8b2 or on this branch.
  - No code change. If it shows up again from a student, the stack and user agent in `/app/admin/errores` will tell us which case it is.
- **Progreso for package students has no CelsBSNS or CelsTV card.** For an IPD (CelsGLOBAL program) student, `progress-page.ts` deliberately shows only the CelsGLOBAL route (CV, Interview, Finanzas) and lists English For Business and CelsTV as "✓ incluido". So the week number appears on Mis cursos, Inicio and the course link (all correct), not on Progreso. The 19 students will see exactly this. Matt to confirm that's what he wants.
- **Wording:** C sees "Este curso es parte de un programa de pago. Inscríbete para ver las lecciones." plus "Ver planes". Lesson URLs say "No tienes acceso a esta lección". Both block content; only the copy differs.
- **Safari:** real Safari/iOS wasn't available. The Safari code path was exercised in Chromium. A 2-minute check on a real iPhone before tomorrow's CelsUS invitations is still worth it.

### Cosmetic, left as is
- C's empty Mis cursos has a 24 px empty course section above "Aún no tienes cursos" (`invite-qa-shots/C-360-_app_cursos.png`).
- Draft course URLs (`/app/cursos/resume-review`) render "No encontramos esta página" with HTTP 200, not 404, because the 404 comes after the loading shell has streamed.

## Checks
- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (only the existing warnings in `content/celsglobal/guided-renderer/guided.js` and `scripts/migrate-students.mjs`).
- `next build`: passes.
