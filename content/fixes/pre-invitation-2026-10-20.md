CelsU, next after week 10 and /inscribirme (Cowork audit 2026-10-20). Goal: invite the CelsGLOBAL students (program `international-professional-development`) TODAY and the CelsUS buyers tomorrow.

## A. Logged-in test pass (BLOCKER for today's invitations, do it next)
Create three test students (example.com addresses):
- **A** = Dar acceso to the **program** `international-professional-development`;
- **B** = Dar acceso to the **course** `celsus-para-ciudadania` only;
- **C** = no access.

Test at 360 px and on desktop.

1. **Mis cursos:**
   - A sees CelsBSNS, CelsTV, CV, Interview, Finanzas and Visa TN (not the drafts Resume Review or Interview Prep);
   - B sees only CelsUS;
   - no "Comprar" for courses they already own.
2. **CelsTV episodes 1–8** (9–40 being visible is fine, Matt OK'd it):
   - episode 1: video, CelsCards, CelsBook + flipbook, CelsAudio + transcript, Grammar, Quiz with audio;
   - episode 3: no empty video player;
   - progress goes up.
3. **CelsBSNS weeks 1 and 2:**
   - Reading: highlighted vocabulary and its card (weeks 2, 8 and 9 got new words today; spot-check week 9);
   - Writing saves;
   - Research;
   - Video task;
   - Speaking: record/stop 5× on Safari; completes with 1 try;
   - Feedback closes the week;
   - Capstone parts 1–2;
   - Diccionario: 1 client error, "Cannot read properties of null (reading 'parentNode')";
   - Progreso shows the right week.
4. **CV, Interview, Finanzas and Visa TN:** steps 1, 3 and the last step of each.
   - **Finanzas step 3:** 16 × "Cannot read properties of undefined (reading 'flatMap')" at 01:09 UTC, before the 01:45 deploy, none since. Confirm it opens and its build sections work.
   - Practice and check work.
   - The product pages save and download the PDF: Mi resume, Mi banco, Mi plan financiero, Mi plan TN.
   - CV step 7 still renders (the Allcanza card was removed from the data).
5. **CelsUS (B):**
   - episode 1, all 6 parts;
   - Tarjetas;
   - a Week 2 flashcard PDF opens;
   - final exam;
   - Progreso.
6. **AI tools (A):** Resume and Práctica de entrevista work.
7. **Access (C):** opening any course URL directly shows "no tienes acceso", never the content.

Report what's broken and fix the blockers first. Save the report so Cowork can read it.

## B. Student import, ready for Matt's list (today)
Matt will send a CSV of the active CelsGLOBAL students: name, email, program, end date if any.
- Run `scripts/migrate-students.mjs` as a **dry run** only and report:
  - counts;
  - unknown offers;
  - students with no email;
  - estimated end dates.
- **Do NOT run `--apply` until Matt approves it in chat.**
- The plan file has personal data: keep it out of the repo.

## Change to the brief you already have
**The CelsUS English + civics evaluation is ON HOLD** (Matt). CelsUS uses `/evaluacion` for now; nothing to build.
