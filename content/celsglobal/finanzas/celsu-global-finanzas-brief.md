# CelsGLOBAL · Finanzas Personales en Estados Unidos: build brief (2026-10-19)

**Workflow:** build it, compare it against the mockup at 360, 390, 900 and 1440 px, and **push it live** once it matches. Matt reviews it live as a student and sends any changes through Cowork.

**This is the same template as From CV to U.S. Resume and Crack the Interview Code** (`claude/celsu-global-cv-resume-brief.md`, `claude/celsu-global-interview-brief.md`): course page, step template with 5 parts, nothing locked, `guided_course_steps` / `guided_step_progress`, old lessons hidden. **Only what's different is described here.**

**Source of truth:**
- **`finanzas-mockup.html`** (clickable): `?v=home` is the course page, `?v=mod` is step 2 (the budget; `&demo=1` fills in the practice), and `?v=plan` is "Mi plan financiero".
- **`finanzas-steps.json`:** the 9 steps, loaded into `guided_course_steps`.

**The course content stays the same** (Matt). It's reorganized into **9 steps = the 9 modules**. The course had no YouTube videos, so `more_videos` is empty.


## Every step is now in the mockup (2026-10-19)
- **`?v=mod&n=N`** opens step N (1–9). On the course page, each step's button opens its own step; Anterior/Siguiente move between steps. `&demo=1` fills in the practice and the check.
- Step 2 stays the hand-built example. **All other steps are drawn by one data-driven component** that reads that step's JSON (`guided_course_steps.data`), so what you see is the real content of each step.
- **Build it the same way:** one `<GuidedStep>` component with a renderer per type: essentials blocks (`para, keys, expand, steps, myth, compare, checklist, phrases, list, tip, quote, titles, glossary, say, whatif, activity`), practice `kind`s and build `type`s. The reference is `celsu-global-guided-renderer/guided.js` + `guided.css` (plain JS; port it to React components, don't copy it in).
  - Nothing should be hard-coded per course: the course only supplies its theme colors (`--acc`, `--acc3`, `--accb`, `--lab`) and its "product" button.
- **Rules the renderer follows:**
  - A step with `video: null` shows "En pocas palabras" (the 3 keys) instead of the video.
  - A step with `check: null` (the last step) ends with "Terminar el curso" and then shows the `finish` card.
  - `more_video` / `more_videos` → "Para ver más" (YouTube thumbnail; it plays inline with youtube-nocookie).
  - The Wistia video plays inline (`video.media_url`).
  - `essentials_from` (Finanzas): skip the blocks in `skip`, and also skip the e-book block the practice already uses (`practice.from_ebook`, e.g. `m5 myth`), so it isn't shown twice.

## Look: the cover theme
- **Base:** CelsGLOBAL (ivory, Source Serif 4 for section titles, Plus Jakarta Sans for text).
- **Cover color:** deep indigo `--in #2B2547`, `--in2 #3A3166`, `--in3 #EEEBF7` (soft background), labels `#5B4FA0`.
- **Accent: money green** `--mi #2FC38A`, `--mi2 #8BE3BE`, `--mi3 #E4F7EE`, `--mid #12754C`.
  - Main buttons: `#4FD9A0 → #22A874`, with text `#062A1B`.
- **Hero = the cover:**
  - indigo gradient with **faint diagonal facets** (3 lightly translucent linear gradients) and a green glow in the corner;
  - title in **Plus Jakarta Sans 800 italic, uppercase, white**: "FINANZAS PERSONALES", with "en Estados Unidos" smaller underneath (500 italic).
- **Theme key:** `courses.theme = 'finanzas'`.

## "Lo esencial" comes from the e-book (no copied content)
- Each step has **`essentials_from`**: `{ebook:"tu-dinero-tu-camino-guia-financiera", screens:[…], skip:{types:["fields","reflect","notes"], title_prefix:"Actividad"}}`.
- **Render those screens' blocks with the e-book reader's components**, leaving out the activity blocks: they're now the "Construye" tools.
  - This way the book and the course are always the same text.
  - The e-book's narration (`narration.audio`) can be shown as "▶ Escuchar" at the top of "Lo esencial".
- **E-book:** use `tu-dinero-tu-camino-guia-financiera`. The other copy (`tu-dinero-tu-camino`) has the same text; leave it out of "Mis libros" (Cowork's earlier recommendation).

## The course "product": Mi plan financiero (`/app/cursos/finanzas-…/mi-plan`)
It's the same "Mi plan" button in the top bar.
- **4 KPIs:** ingreso neto · gastos (% of income) · te queda · ahorro (% against the 10–20% target).
- **"A dónde va tu dinero":** a donut chart (`conic-gradient`) with the balance in the center, plus a legend by category.
- **Cards:**
  - Fondo de emergencia: progress toward the target, the amount per quincena (twice a month) and the months to reach it;
  - Plan de crédito;
  - Mis 3 hábitos;
  - **Plan de 90 días:** 3 columns, with completed actions in green.
- **The disclaimer is always visible:** "Los números de este curso son ejemplos y promedios que varían según tu ciudad. Esto es educación financiera, no asesoría financiera personalizada."
- "Descargar en PDF".
- **Data:** `financial_plans` (`user_id` PK, `data` jsonb `{mx_budget, budget{annual, net, cats{…}}, credit{…}, housing{…}, utilities{…}, transport{…}, emergency{goal, saved, per_quincena}, habits[], week_log[], plan90{…}, commit}`, `updated_at`).
  - **Row-level security: owner only.** Nobody else sees the student's numbers.

## The budget is the "master" (step 2, `is_master:true`)
See `?v=mod#build`.
- **Income:**
  - "Sueldo anual antes de impuestos" → **net per month = annual ÷ 12 × 0.80** (rounded), shown in a green card.
  - The student can also type the net amount directly.
- **11 categories:** each with a color, a money field (`$`, right-aligned, tabular figures) and the % of income.
  - If a later step refines a category, the subtitle reads "Se afina en el paso N".
- **Live totals** (as they type, about 350 ms):
  - the donut with "+$970 TE QUEDA" (red "TE FALTA" if negative);
  - Ingreso / Gastos / Saldo;
  - **3 rules:** housing ≤ 30%, savings ≥ 10%, positive balance, each with ✓ or ⚠ and the course's text.
- **"Usar este ejemplo"** loads the book's $4,000 example (`example.items`).
- **Steps 4–7 write back to this budget** (`writes_to`): the chosen housing → `rent`; services → `utilities` and `phone`; transport → `transport`; the savings plan → `savings`. The donut and the KPIs update everywhere.

## New pieces of the template
**Practica:**
- **`guess`** (step 1): a slider from $0 to $30,000; "Ver la respuesta" reveals the book's table and how far off the student was.
- **`sort`** with labels Fijo / Variable (step 2).
- **`order`** (step 3): the credit factors from highest to lowest weight. The two 10% factors can go in either order.
- **`myth`** from the e-book (step 4): the scams block from `m5`.
- **`estimate`** (step 5): pick the right price range for each service.
- **`sum`** (step 6): a car's monthly cost, with the rows appearing one by one → choose the total.
- **`whatif`** from the e-book (step 7).
- **`multiply`** (step 8): a small expense × days → month and year, with the numbers counting up.

**Construye:**
- **`budget`** (steps 1 and 2): step 1 in MXN for "your budget in Mexico" (6 categories, no rules).
- **`budget_6m`** (step 1): the e-book's 6-month activity. Net income × 6 against each expense × 6.
- **`calc`:** formulas using the budget (steps 4 and 7). The result is shown large, with an option to edit it.
- **`compare_options`:** 2 or 3 columns of options with their fields. On phone they turn into tabs. It flags with ⚠ if the rent is above the 30% maximum.
- **`choice`:** pick one of the compared options, plus "why". It writes to the budget.
- **`checklist_amounts`:** a list with checkboxes and an amount for each one.
- **`savings_plan`:** per quincena + saved today → "llegas a tu meta en N meses".
- **`spend_log`:** 7 days × expenses (description + amount + a "lo podría reducir" toggle), with month and year totals for what can be reduced.
- **`plan`:** the e-book's 30/60/90 component, with `suggest` as tappable chips and room for writing your own.

## Check before you push
- **Full flow:** step 1 → step 2 (change the annual salary and the categories; the donut and the rules react) → step 4 (choose roommates; the rent changes in the budget) → step 7 (the target is calculated from the budget) → Mi plan shows everything → PDF.
- **Negative balance:** red donut plus the "Elige dos gastos que puedas bajar" message.
- No sideways scroll at 360 px. The money fields use `inputmode="numeric"`.
