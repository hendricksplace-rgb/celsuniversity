# CelsBSNS week 10: AI interview practice replaces the live mock interview (Cowork, 2026-10-20)

**Matt's decision (2026-10-20):** week 10 no longer has a live 50-minute mock interview. Students do the AI interview practice: they answer out loud and the AI gives feedback.

## Done by Cowork (course content, live now)
I rewrote every "live mock interview / entrevista simulada en vivo / 50 minutos" mention so it now says "práctica de entrevista con IA". Original Kajabi text kept in `original.*` (not shown to students).

| Where | Field |
|---|---|
| Week 10 Feedback (`feedback_content` ac05147d…) | `hero.intro_*`, `hero.priv_p`, `questions.1`, `goal_suggestions.*.2`, `ai_practice.tip`, `next.title` → "Your AI Interview Practice & Certificate", `next.bullets` 0–1 |
| Week 9 Feedback (2c01b992…) | `next.bullets.*.2` → "Your final interview practice with AI" |
| Week 10 Reading (a55cb3db…) | `warmup.intro_*` |
| Week 10 Video (c1a357c5…) | `hero.intro_*` ("dress rehearsal for your AI interview practice") |
| Syllabus block (`content_blocks` c7fe5ebf…, `text_es`) | 5 lines: objectives, requirements, week 10 speaking, certificate |

Left as is: Week 10 Speaking scene label "Zoom · Entrevista final" (it's a role-play scene, not the course close).

## For Code
1. **Access (blocker).** The AI tool is `/app/herramientas/entrevista` (Práctica de entrevista: Whisper + STAR feedback). `can_use_ai_tools()` only allows staff and students of the CV and Interview courses, **so a CelsBSNS student today sees "no tienes acceso → ver planes"**.
   - Migration: also allow students with access to CelsBSNS (`english-for-business…` course).
   - Alternatively, scope it to the interview tool only (`can_use_interview_practice()`), if Matt wants the Resume tool kept for CelsGLOBAL.
2. **Week 10 Feedback `ai_practice` card.** It currently teaches ChatGPT voice mode with copy-paste prompts. Replace it with a card that links to `/app/herramientas/entrevista` ("Practicar mi entrevista"). Optionally show the student's best score per question, from `interview_answers`. Keep the ChatGPT prompts only as "Extra (opcional)", or drop them.
3. **Hardcoded copy still saying "live / 50-minute mock interview":**
   - `Capstone.tsx`: `sub`, `req[2]`, `finH`, `finP` and `fl[3]` (es and en) → "Tu práctica de entrevista con IA".
   - `BsnsSyllabus.tsx`: line 45 chip "Entrevista final en vivo" → "Práctica de entrevista con IA"; line 59; line 70 "Nos vemos en tu entrevista final".
   - `InteractiveFeedback.tsx`: `donePf` (lines 93 and 165) → "tu práctica de entrevista con IA y tu certificado".
   - The comments in `feedback.ts`, line 17, and `InteractiveFeedback.tsx`, line 743.
4. **Certificate checklist:** the last item was "marked done by staff". Make it data-driven instead.
   - **Default:** it counts as done when the student has a scored answer in `interview_answers` for all 4 questions.
   - Matt can change this rule. It's flagged for him.
