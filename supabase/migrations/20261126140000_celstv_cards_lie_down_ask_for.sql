-- CelsTV (Matt, Nov 26): "To lay down" -> "To lie down" (ep 9) and "ask for" -> "To ask for" (ep 15),
-- re-recorded with Brian (audio_jobs 1864, 1865). Apply only once both files are in course-media.

update public.content_blocks b
set data = jsonb_set(b.data, '{settings}', (
  select jsonb_agg(case
      when c->>'back' = 'To lay down' then c || jsonb_build_object('back', 'To lie down',
        'back_audio', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cards/fc_ep_09_verbs_toliedown.mp3')
      when c->>'back' = 'ask for' then c || jsonb_build_object('back', 'To ask for',
        'back_audio', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cards/fc_ep_15_verbs_toaskfor.mp3')
      else c end order by ord)
  from jsonb_array_elements(b.data->'settings') with ordinality x(c, ord)))
where b.id in ('96f13102-1d27-4091-8a79-109d36567acf', '9fb9801d-5246-40de-8e99-1f7b56d475f0')
  and b.block_type = 'flashcard';
