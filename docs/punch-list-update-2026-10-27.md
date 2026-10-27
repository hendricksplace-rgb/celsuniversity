# CelsU · Punch list update from Code · 2026-10-27

Everything below marked **Live** was pushed to `main` and auto-deployed to nuevo.celstv.com (deploy status: success). Each item was tested locally as a throwaway `zz-*@example.com` student (created and deleted by script). Matt reviews live as a student.

## Completed (live)

| Item | What shipped | Notes for Cowork |
|---|---|---|
| **C-001** Tarjetas | Side arrows, swipe and keyboard, slide-in, labels follow the app language, logo on the card back. | |
| **C-002 + C-003** CelsUS English mode | Language choice in the app header, Cuenta › Mis datos and next to "¿Cuál es tu examen?" (saved to `profiles.preferred_language`; restored on sign-in on a new device). CelsBook reads `screens[i].en` with English labels; no Spanish, no per-item audio, no recorder in English mode. Repaso and the completion screen in both languages. **English narration: 52 of 52 screens** (Amy, same ElevenLabs voice and settings), word highlighting checked on every page. Section 4 string fixes and the Ep 5 final-exam link were done earlier. | Still Spanish-only (needs Cowork text, not machine translation): course title "CelsUS Para Ciudadanía", course description, lesson and resource titles, episode topics (from the CelsBook subtitle; hidden in English mode for now). |
| **C-004** CelsBook audio | Media signed per request (`/app/archivo`), so audio and images never expire mid-session. | |
| **C-005** CelsCast | CelsUS CelsAudio with EN + ES subtitles, Ep 1–5. | `private.celscast_us_staging` still exists (DROP hangs through the MCP); drop it from the dashboard. |
| **C-006** Reading and Writing | USCIS-style reading (20) and writing (15) lesson. | |
| **C-007** Grammar colored tables | Sección 2 tables, Ep 1–4. | |
| **C-008** CelsCast mp3 headers | 5 CelsUS + 8 CelsTV files remuxed (seek fixed), `concat-audio` fixed for future joins. | |
| **C-009 / C-010** CelsTV quiz | Pictures load; browser-voice fallback removed; new Brian clips. | |
| **C-012** Old guided lessons | Redirect to their current place for everyone. | |
| **C-013** CelsUS back buttons | "Curso" and "Regresar al Episodio N" buttons on every CelsUS page. | |
| **C-014** Tarjetas back | Navy card back, answer chips, no repeated Spanish box. | |
| **C-015** Tus programas cards | Whole logo + glass info panel. | |
| **C-016** CelsTV Ep 1–8 videos + thumbnails | youtube-nocookie embeds; Ludo's 8 thumbnails; the episode picture is used on Inicio and Mis cursos too. | |
| **C-017** CelsBSNS reading videos | Week 1 plays Julian Treasure (TED) as the main talk; Velazquez becomes a "Ver en YouTube" link (new id `2Yw6dFQBklA`; the old `v3XJ5mC2hWQ` is removed). Week 7 TEDx talks play from YouTube directly with an automatic "Ver en YouTube" card if they fail. | 7 of the 9 old YouTube ids return 404 (removed); none are used any more. No replacement talks needed now. |
| **C-020** CelsGLOBAL video thumbnails | Style **B (big number)**, chosen by Matt: 29 posters, real durations (2:27 to 22:49), course-colored play button, duration chip; TN step 2 parts 1 and 2. | No style A posters were made, so C-019 stills aren't needed for this. |
| **C-021** "Continuar" opened the old lesson page | One resolver for lesson links (Inicio, Mis cursos); `/app/lecciones/<id>` redirects to the current page for CelsTV, CelsBSNS and CelsGLOBAL. | Service worker was not the cause. Still linking through the redirect (works): Mis clases, Welcome, route card, class assignments, CelsGLOBAL "Empezar". CelsUS video/audio/class parts use the CelsUS lesson page by design. |
| **C-022** "¡Sección terminada!" | Shared celebration screen after every Grammar section (Ep 1–40). "Funics" → "Phonics" everywhere. | XP chip shows the part's XP split across its sections (XP is earned when the part is finished). |
| **Grammar v2** (mockup "grammar todas", no brief) | New Grammar for CelsTV Ep 1–8 built from the mockup's content and Cowork's audio: Amy on everything, word highlighting, EN \| ES, build / fill / listen-and-choose / choose with the why, distinct section names. | Section names used are listed below. Old exercises are kept in each block; removing `data.v2` reverts an episode. |

### Grammar section names (Ep 1–8)

| Ep | Sections |
|---|---|
| 1 | El verbo «to be» · Tabla: sujeto + «to be» · Contracciones · Lectura · Phonics |
| 2 | Pronombres + «to be» · Tabla: pronombre + verbo · Contracciones · Lectura · Phonics |
| 3 | Verbos de tu día · Tabla: rutinas · La -s con he, she, it · Lectura · Phonics |
| 4 | La familia y «to be» · Tabla: familia + «to be» · This is · These are · Lectura · Phonics |
| 5 | Ordena la frase: need to · Need to y -ing · Completa las frases · Escucha y elige · Lectura · Phonics |
| 6 | Ordena la frase: imperativo · El imperativo · Completa las frases · Escucha y elige · Lectura · Phonics |
| 7 | Ordena la frase: -ing · Presente progresivo · Completa las frases · Escucha y elige · Lectura · Phonics |
| 8 | Ordena la frase · Ahora o siempre · Completa las frases · Escucha y elige · Lectura · Phonics |

## Partial

| Item | Status | Needed |
|---|---|---|
| **C-003** | Everything done except the open item below. | Matt to confirm the 2025 USCIS wording for Ep 3 "What are three rights of everyone living in the United States?" |

## Pending, and what each one needs

| Item | Needed from | What |
|---|---|---|
| **Episode completed screen** (mockup `celstv-episodio-completado`) | Cowork / Matt | A brief: is it the screen at the end of every CelsTV episode, and what data it shows. |
| **Mis 5 minutos** prototype | Cowork / Matt | A brief (no brief came with the prototype). |
| **Laboratorio de sonidos** prototype | Cowork / Matt | A brief (no brief came with the prototype). |
| **C-019** | Matt / Cowork | The brief (C-019 Part B was referenced by C-020 but never received). |
| **C-011** (optional) | — | CelsGLOBAL "Los 4 errores" numbered cards. Not started; low priority. |
| **Batch 4.2** Stripe test purchases | Matt | `sk_test_` key and a test webhook secret. |
| **CelsUS English content** | Cowork | English for the course title/description, lesson titles and episode topics (see C-002 row). |

## Flags for Cowork

- Drop `private.celscast_us_staging` from the Supabase dashboard (the MCP can't run DROP).
- CelsUS Ep 30/31 quiz pictures repeat (duplicate images).
- CelsUS has no offline download.
- The browser voice is still used in: the Dictionary, the evaluation questions, the guided "Escuchar mi respuesta", the Interview tool, and Spanish-mode CelsBook words without a recording. Matt's rule says never; each needs recorded audio.
- Two staff-only Edge Functions were added for checks: `oembed-check` (YouTube/TED/Wistia lookups) and `celsbook-narrate-en` (English narration). Both refuse callers without a key; remove them from the dashboard if unwanted.
