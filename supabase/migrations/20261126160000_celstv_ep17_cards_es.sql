-- CelsTV ep 17 (approved by Matt, Nov 26): card Spanish in Mexican Spanish, and the title in title case.
-- The English and the card audio stay. Reading = Leer, Painting = Pintar and the other gerund cards stay as infinitives on purpose.
update public.modules set title = 'Episode 17: Hobbies Are Us'
where course_id = '0928ee68-d20b-4cdf-8e4b-5489ce16b4a3' and sort_order = 16;

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'Stamps' then jsonb_set(c, '{front}', to_jsonb('Estampillas'::text))
      when c->>'back' = 'Cards' then jsonb_set(c, '{front}', to_jsonb('Cartas coleccionables'::text))
      when c->>'back' = 'I am collecting coins.' then jsonb_set(c, '{front}', to_jsonb('Estoy coleccionando monedas.'::text))
      when c->>'back' = 'I love to watch TV.' then jsonb_set(c, '{front}', to_jsonb('Me encanta ver la tele.'::text))
      when c->>'back' = 'I enjoy traveling.' then jsonb_set(c, '{front}', to_jsonb('Disfruto viajar.'::text))
      when c->>'back' = 'I am bowling with my friends.' then jsonb_set(c, '{front}', to_jsonb('Estoy jugando boliche con mis amigos.'::text))
      when c->>'back' = 'Taking photography lessons helps me learn more about photography.' then jsonb_set(c, '{front}', to_jsonb('Tomar clases de fotografía me ayuda a aprender más sobre fotografía.'::text))
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l join public.modules m on m.id = l.module_id
where l.id = b.lesson_id and m.course_id = '0928ee68-d20b-4cdf-8e4b-5489ce16b4a3' and m.sort_order = 16 and b.block_type = 'flashcard';
