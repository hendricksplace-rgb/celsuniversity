-- CelsTV ep 18 (approved by Matt, Nov 26): card Spanish in Mexican Spanish. English and card audio unchanged.
update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'Farmers market' then jsonb_set(c, '{front}', to_jsonb('Mercado de productores (tianguis)'::text))
      when c->>'back' = 'To look' then jsonb_set(c, '{front}', to_jsonb('Ver / Mirar'::text))
      when c->>'back' = 'To shop' then jsonb_set(c, '{front}', to_jsonb('Ir de compras'::text))
      when c->>'back' = 'I am driving on the wrong side of the road.' then jsonb_set(c, '{front}', to_jsonb('Estoy manejando en el lado equivocado de la calle.'::text))
      when c->>'back' = 'I am buying at the mall.' then jsonb_set(c, '{front}', to_jsonb('Estoy comprando en el centro comercial.'::text))
      when c->>'back' = 'I am looking for the theater.' then jsonb_set(c, '{front}', to_jsonb('Estoy buscando el teatro.'::text))
      when c->>'back' = 'I am going to the airport.' then jsonb_set(c, '{front}', to_jsonb('Voy al aeropuerto.'::text))
      when c->>'back' = 'I am walking in the park.' then jsonb_set(c, '{front}', to_jsonb('Estoy caminando en el parque.'::text))
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l join public.modules m on m.id = l.module_id
where l.id = b.lesson_id and m.course_id = '0928ee68-d20b-4cdf-8e4b-5489ce16b4a3' and m.sort_order = 17 and b.block_type = 'flashcard';
