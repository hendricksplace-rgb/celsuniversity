-- CelsTV Section 2, Ep 9 (approved by Matt 2026-11-26): the module title, and the CelsCards' Spanish in Mexican
-- Spanish. The English (and its audio) stays as in the video. "To lay down" → "To lie down" waits for its new
-- card audio (fc_ep_09_verbs_toliedown.mp3), so text and recording never disagree.
update public.modules set title = 'Episode 9: Time to Relax' where id = '43bdaee9-b1b7-455f-b28b-927034ba24e7';

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(
    case
      when c->>'back' = 'TV' then jsonb_set(c, '{front}', '"Televisión"')
      when c->>'back' = 'Snacks' then jsonb_set(c, '{front}', '"Botanas"')
      when c->>'back' = 'Pool' then jsonb_set(c, '{front}', '"Alberca"')
      when c->>'back' = 'Milkshake' then jsonb_set(c, '{front}', '"Malteada"')
      when c->>'back' = 'Movies' then jsonb_set(c, '{front}', '"Películas"')
      when c->>'back' = 'Couch' then jsonb_set(c, '{front}', '"Sillón"')
      when c->>'back' = 'Bath' then jsonb_set(c, '{front}', '"Baño de tina"')
      when c->>'back' = 'To watch' then jsonb_set(c, '{front}', '"Ver"')
      when c->>'back' = 'To take a break' then jsonb_set(c, '{front}', '"Tomar un descanso"')
      when c->>'back' = 'To order' then jsonb_set(c, '{front}', '"Pedir"')
      when c->>'back' = 'I am getting a massage.' then jsonb_set(c, '{front}', '"Me están dando un masaje."')
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
from public.lessons l
where l.id = b.lesson_id and l.module_id = '43bdaee9-b1b7-455f-b28b-927034ba24e7' and b.block_type = 'flashcard';
