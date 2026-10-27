-- C-005: CelsUS CelsAudio gets the CelsCast podcast (English, Amy + Brian, Spanish subtitles) as its first block.
-- Data comes from Cowork's private.celscast_us_staging (dropped after go-live); the original audio block stays.
insert into public.content_blocks (lesson_id, block_type, sort_order, data)
select v.lesson_id, 'celscast', -1, s.data
from (values
  (1, 'ee3cb4c3-4f76-4a01-b3e7-4b4701ae06fd'::uuid),
  (2, 'ed98f398-e2af-4812-aeb5-ef3650a49b70'::uuid),
  (3, 'c59e75f9-a702-43eb-be01-f841642c25c1'::uuid),
  (4, '0c36cd23-371e-4396-9302-2dbfd6455f72'::uuid),
  (5, 'a3d5dc4d-081a-4905-84d6-628f686cc55b'::uuid)
) as v(ep, lesson_id)
join private.celscast_us_staging s on s.ep = v.ep
where not exists (select 1 from public.content_blocks b where b.lesson_id = v.lesson_id and b.block_type = 'celscast');
