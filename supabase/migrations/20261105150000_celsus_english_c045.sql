-- C-045: CelsUS in English mode must be 100% English. One pattern everywhere: an `_en` column next to each
-- student-facing text (title_en, description_en, body_en, label_en, subtitle_en) and a `language` track flag
-- ('es' | 'en' | 'both') on lessons, blocks and resources. English-mode students don't see 'es' items.
-- i18n_missing lists CelsUS text a student can see that still has no English.

alter table public.courses add column if not exists title_en text, add column if not exists description_en text;
alter table public.modules add column if not exists title_en text, add column if not exists description_en text;
alter table public.lessons add column if not exists title_en text,
  add column if not exists language text not null default 'both' check (language in ('es', 'en', 'both'));
alter table public.content_blocks add column if not exists title_en text, add column if not exists body_en text,
  add column if not exists language text not null default 'both' check (language in ('es', 'en', 'both'));
alter table public.resources add column if not exists label_en text, add column if not exists description_en text,
  add column if not exists language text not null default 'both' check (language in ('es', 'en', 'both'));
alter table public.ebooks add column if not exists subtitle_en text;

-- ---- course and modules ----
update public.courses set title_en = 'CelsUS Para Ciudadanía',
  description_en = 'Get ready for your U.S. citizenship test: practical English, culture and the civics test.'
  where slug = 'celsus-para-ciudadania';

update public.modules m set title_en = case
    when m.title = 'Resources / Recursos' then 'Resources'
    when m.title = 'Evaluation / Evaluación' then 'Evaluation'
    else m.title end
  from public.courses c where c.id = m.course_id and c.slug = 'celsus-para-ciudadania';

-- ---- lessons ----
with celsus as (
  select l.id, l.title from public.lessons l join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
  where c.slug = 'celsus-para-ciudadania'
)
update public.lessons l set title_en = case
    when s.title = 'Creacion del Gobierno de los EUA - Subtitulada' then 'Creation of the U.S. Government (subtitled)'
    when s.title ~* '^CelsUS L[iI]ve (\d) del Abogado Miguel$' then regexp_replace(s.title, '^CelsUS L[iI]ve (\d) del Abogado Miguel$', 'CelsUS Live \1 with Attorney Michael', 'i')
    when s.title ~ '^CelsUS Episodio (\d): Focus on Your Future$' then regexp_replace(s.title, '^CelsUS Episodio (\d)', 'CelsUS Episode \1')
    when s.title = 'CelsU Episode 1 : CelsBook' then 'CelsUS Episode 1: CelsBook'
    when s.title = 'Printable flashcards' then 'Printable Flashcards'
    when s.title = 'Examen Cívico 2025 — English (preguntas en inglés)' then 'Civics Test 2025 — English'
    when s.title = 'Examen Cívico 2025 — Español' then 'Examen Cívico 2025 — Español'
    when s.title = 'Examen 65/20 — 20 preguntas' then 'Examen 65/20 — 20 preguntas'
    when s.title = '20 Preguntas en Spanish' then '20 Preguntas en Spanish'
    when s.title = 'Examen de Educación Cívica – 128 Preguntas' then 'Examen de Educación Cívica – 128 Preguntas'
    when s.title = 'Evaluación Final Completa de 133 preguntas del Examen Civil' then 'Complete Final Evaluation: 133 Civics Questions'
    else s.title end
  from celsus s where s.id = l.id;

-- The Spanish track: hidden in English mode.
update public.lessons set language = 'es' where id in (
  'e03d4aed-1646-4fad-81d3-11f4ee8b0c7a', -- Examen Cívico 2025 — Español
  '2381ff13-e4be-47ed-bcd0-53b67c7fbdab', -- Examen 65/20 — 20 preguntas
  '6ac618c0-ac3c-4d0c-a38d-748ad109428b', -- 20 Preguntas en Spanish
  'f80a4007-479c-4513-b69e-9c0668064d99'  -- Examen de Educación Cívica – 128 Preguntas (Versión 2020)
);
update public.lessons set language = 'en' where id = '3ef39bff-75ce-4a79-8837-0e4f50efe725'; -- Civics Test 2025 — English

-- ---- blocks ----
with celsus as (
  select b.id, b.title from public.content_blocks b join public.lessons l on l.id = b.lesson_id join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id where c.slug = 'celsus-para-ciudadania'
)
update public.content_blocks b set title_en = case
    when s.title = 'El Abogado' then 'The Attorney'
    when s.title = 'Examen Cívico — Flashcards (English)' then 'Civics Test — Flashcards'
    when s.title = 'Creacion del Gobierno de los EUA - Subtitulada' then 'Creation of the U.S. Government (subtitled)'
    when s.title ~ '^⬇️ Descargar / Download — Semana (\d)$' then regexp_replace(s.title, '^⬇️ Descargar / Download — Semana (\d)$', '⬇️ Download — Week \1')
    when s.title = 'Preguntas de Referencia / Reference Questions' then 'Reference Questions'
    when s.title = 'Tarjetas Imprimibles / Printable Flashcards' then 'Printable Flashcards'
    when s.title = 'Examen Cívico 2025 — English (preguntas en inglés)' then 'Civics Test 2025 — English'
    else s.title end
  from celsus s where s.id = b.id and s.title is not null;

update public.content_blocks set language = 'es' where title in ('Examen Cívico — Tarjetas (Español)', 'Examen Cívico 2025 — Español', 'Examen 65/20 — 20 preguntas')
  and lesson_id in (select l.id from public.lessons l join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id where c.slug = 'celsus-para-ciudadania');
update public.content_blocks set language = 'en' where title = 'Examen Cívico — Flashcards (English)';

-- Bilingual "ES / EN" bodies: the English half only.
update public.content_blocks set body_en = E'📌 Questions that change over time\n\nThree civics test questions are NOT on these cards because the answer changes or depends on your state:\n\n• What is the name of the President of the United States now?\n• What is the capital of your state?\n• What is the political party of the President now?\n\nLook up the current answers here:\nuscis.gov/citizenship/find-study-materials-and-resources/check-for-test-updates\n\nUSCIS updates these answers. Check before your interview.'
  where title = 'Preguntas de Referencia / Reference Questions';

update public.content_blocks set body_en =
  E'⬇️ This week''s printable flashcards\n\nWeek ' || substring(title from 'Semana (\d)') || ' — ' || substring(body from '\n\(([^)\n]+)\)\n') ||
  E'\n\n• English: ' || substring(body from 'English: (storage://\S+\.pdf)') ||
  E'\n\n25 cards · 7 sheets · print double-sided on the LONG edge'
  where title ~ '^⬇️ Descargar / Download — Semana \d$';

update public.content_blocks set body_en = E'📄 Printable Flashcards\n\nDownload and print these cards to study for the civics test anywhere.\n\nFiles:\n• CelsUS_W_01.pdf\n• CelsUS_W_02.pdf\n• CelsUS_W_03.pdf\n• CelsUS_v_02.pdf'
  where body like '📄 Flashcards imprimibles / Printable Flashcards%';

update public.content_blocks set body_en = E'📄 Printable Flashcards\n\n125 civics questions split across 5 weeks — 25 cards per week.\n\nPrint double-sided flipping on the LONG edge. Each sheet makes 4 cards.\n\n───────────────\nWeek 1 — Principles of Democracy & Founding Documents\n• English: storage://course-media/299a56dc-e5cc-403b-8375-e6e414bc012f/e086cc7410_a8efecb7a_CelsUS_Week1_Flashcards_English.pdf\n\n───────────────\nWeek 2 — The Three Branches of Government\n• English: storage://course-media/299a56dc-e5cc-403b-8375-e6e414bc012f/8ae9deb11e_2b30f45ee_CelsUS_Week2_Flashcards_English.pdf\n\n───────────────\nWeek 3 — Elections, Rights & Citizenship\n• English: storage://course-media/299a56dc-e5cc-403b-8375-e6e414bc012f/982be7258d_aec9d36e5_CelsUS_Week3_Flashcards_English.pdf\n\n───────────────\nWeek 4 — Civic Duties & Early American History\n• English: storage://course-media/299a56dc-e5cc-403b-8375-e6e414bc012f/499d9909de_f9ec6866e_CelsUS_Week4_Flashcards_English.pdf\n\n───────────────\nWeek 5 — Recent History, Geography, Symbols & Holidays\n• English: storage://course-media/299a56dc-e5cc-403b-8375-e6e414bc012f/7b0a49ce76_5b7ee55cf_CelsUS_Week5_Flashcards_English.pdf\n'
  where id = 'e1fb8190-bea2-4a0d-84f2-1571adeb4830';

update public.content_blocks set body_en = replace(body,
  E'> *Nota: la presentación en PDF y el folleto descargable "Naturalization-Civics-Practice.pdf" de esta lección no pudieron migrarse en esta sesión (pendiente).*',
  E'> *Note: the PDF presentation and the downloadable handout "Naturalization-Civics-Practice.pdf" for this lesson are not available yet.*')
  where id = '4bf8dee2-905e-42a0-a5d3-0368cca3013c';

-- ---- resources (printable flashcard PDFs) ----
update public.resources set label_en = label, description_en = '25 printable flashcards — PDF, 7 double-sided sheets', language = 'en' where label ~ '^Week \d Flashcards \(English\)$';
update public.resources set label_en = label, description_en = '25 printable flashcards — PDF, 7 double-sided sheets', language = 'es' where label ~ '^Week \d Flashcards \(Spanish\)$';

-- ---- CelsBook topics (episode hero and course page) ----
update public.ebooks set subtitle_en = case slug
    when 'celsus-celsbook-episode-1' then 'Overcome your fears knowing who to trust · Principles of democracy and founding documents'
    when 'celsus-celsbook-episode-2' then 'Overcome your fears knowing who to trust · The President, the Cabinet and the Supreme Court'
    when 'celsus-celsbook-episode-3' then 'Overcome your fears knowing who to trust · Duties, history and rights'
    when 'celsus-celsbook-episode-4' then 'Overcome your fears knowing who to trust · Independence, the Civil War and the 20th century'
    when 'celsus-celsbook-episode-5' then 'Overcome your fears knowing who to trust · From the Great Depression to September 11'
  end where slug like 'celsus-celsbook-episode-_';

-- ---- what still has no English (student-facing CelsUS text) ----
create or replace view public.i18n_missing with (security_invoker = true) as
  select 'modules'::text as tbl, m.id, 'title'::text as field, m.title as value
    from public.modules m join public.courses c on c.id = m.course_id
    where c.slug = 'celsus-para-ciudadania' and m.title_en is null
  union all
  select 'lessons', l.id, 'title', l.title
    from public.lessons l join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
    where c.slug = 'celsus-para-ciudadania' and not l.teacher_only and l.language <> 'es' and l.title_en is null
  union all
  select 'content_blocks', b.id, 'title', b.title
    from public.content_blocks b join public.lessons l on l.id = b.lesson_id join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
    where c.slug = 'celsus-para-ciudadania' and not l.teacher_only and not b.teacher_only and b.language <> 'es' and l.language <> 'es'
      and b.title is not null and b.title_en is null
  union all
  select 'content_blocks', b.id, 'body', left(b.body, 120)
    from public.content_blocks b join public.lessons l on l.id = b.lesson_id join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
    where c.slug = 'celsus-para-ciudadania' and not l.teacher_only and not b.teacher_only and b.language <> 'es' and l.language <> 'es'
      and b.block_type = 'text' and b.body is not null and b.body_en is null
      and b.body ~ '[áéíóúñ¿¡]';

revoke all on public.i18n_missing from anon;
grant select on public.i18n_missing to authenticated;
