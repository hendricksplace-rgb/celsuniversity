-- C-007 (P-006): CelsTV Grammar, Sección 2 (exercise id 2, choose_text_from_audio) of Episodes 1-4.
-- Row audio + word timings (audio_jobs kind 'grammar_table', matched by path) into content.table_audio = [{row, audio, wt}],
-- the question audio into audioFile, one "why" line into content.explanation, and Episode 1 options "Is." → "is".
-- Backup of the 4 blocks before this change: docs/backups/2026-10-27-celstv-grammar-blocks-before-C-007.json
with eps as (
  select cb.id, cb.data, (regexp_match(m.title, '^Episode (\d+):'))[1]::int as ep
  from content_blocks cb
  join lessons l on l.id = cb.lesson_id
  join modules m on m.id = l.module_id
  where cb.block_type = 'grammar'
    and m.course_id = '0928ee68-d20b-4cdf-8e4b-5489ce16b4a3'
),
target as (
  select e.id, e.ep, (x.ord - 1) as idx, x.ex,
         '0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/grammar-tables/ep-' || lpad(e.ep::text, 2, '0') || '/' as dir
  from eps e
  cross join lateral jsonb_array_elements(e.data -> 'settings' -> 'exercises') with ordinality as x(ex, ord)
  where e.ep between 1 and 4
    and x.ex ->> 'id' = '2'
    and x.ex ->> 'type' = 'choose_text_from_audio'
    and x.ex -> 'content' ->> 'description' like '%|%'
),
rows as (
  select t.id,
         jsonb_agg(
           jsonb_build_object('row', r.n, 'audio', 'storage://course-media/' || j.path, 'wt', j.wt::jsonb)
           order by r.n
         ) as table_audio
  from target t
  join audio_jobs j on j.kind = 'grammar_table' and j.status = 'done' and j.path like t.dir || 'r%.mp3'
  cross join lateral (select (regexp_match(j.path, '/r(\d+)\.mp3$'))[1]::int as n) r
  group by t.id
),
q as (
  select t.id, 'storage://course-media/' || j.path as audio
  from target t
  join audio_jobs j on j.kind = 'grammar_table' and j.status = 'done' and j.path = t.dir || 'q.mp3'
),
newex as (
  select t.id, t.idx,
         jsonb_set(t.ex, '{audioFile}', to_jsonb(q.audio))
         || jsonb_build_object(
              'content',
              (t.ex -> 'content')
              || jsonb_build_object(
                   'table_audio', rows.table_audio,
                   'explanation', case t.ep
                     when 1 then 'They → are.'
                     when 2 then 'You → are.'
                     when 3 then 'He / she / it → add -s: eats.'
                     when 4 then 'One person (this) → is.'
                   end,
                   'options', case when t.ep = 1 then (
                     select jsonb_agg(o || jsonb_build_object('text', lower(rtrim(o ->> 'text', '.'))) order by k)
                     from jsonb_array_elements(t.ex -> 'content' -> 'options') with ordinality as oo(o, k)
                   ) else t.ex -> 'content' -> 'options' end
                 )
            ) as ex
  from target t
  join rows on rows.id = t.id
  join q on q.id = t.id
)
update content_blocks cb
set data = jsonb_set(cb.data, array['settings', 'exercises', n.idx::text], n.ex),
    updated_at = now()
from newex n
where cb.id = n.id;
