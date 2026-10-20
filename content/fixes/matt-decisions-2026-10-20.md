# CelsU: Matt's decisions of 2026-10-20 — item 1 (Cowork)

## 1. Enrollment: "Quiero inscribirme" → free evaluation → offer
Matt: every buy or enroll button leads to the free evaluation first. The student can skip it.

- New page `/inscribirme?programa=celstv|celsus|celsbsns|celsglobal`. Every "Comprar / Inscríbete / Obtener paquete" button on the site points here, including the boards for Home, CelsTV, CelsUS, CelsBSNS and CelsGLOBAL, and `Sales.tsx`.
  - Primary button: "Empieza con tu evaluación gratis (15 min)". It opens the program's evaluation (below) and carries `programa`.
  - Secondary link: "Prefiero ver los planes directamente", to the program's plans section (`/celsus#planes`, etc.), so the student isn't forced to take the evaluation.
- After the evaluation, the result screen shows the offer: the recommended plan for that program (`Results.tsx` already has "Recomendado" + "Empieza hoy").
- While Stripe is off (`PURCHASES_OPEN=false`), the plan buttons and "Empieza hoy" go to `/registro?plan=<product>`: create a free account and reserve the spot. Staff then give access with "Dar acceso". When Stripe is live, flip the switch and they go to `/comprar/resumen?producto=…` again.
- Evaluation per program:
  - CelsTV, CelsBSNS and CelsGLOBAL: the existing English evaluation `/evaluacion`. Matt wants to improve it later, after launch.
  - CelsUS: a new evaluation with basic English plus civics, with a score. It reuses the civics question bank and the runner behind `/app/examen-civico` (ExamRunner): a short public version with no account, about 10 civics questions plus a few English items, a score out of 100 and the recommended CelsUS plan. Cowork writes the spec and the question set next. **Until it ships, CelsUS uses `/evaluacion`.**
