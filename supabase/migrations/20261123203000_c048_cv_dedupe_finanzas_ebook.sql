-- C-048 (Cowork, Matt approved 2026-11-23). Applied to celsu-lam from Cowork.
-- 1) CV to Resume: remove 8 duplicate blocks (identical data to the block kept in the same lesson). Archived first.
create table if not exists private.deleted_blocks_archive (like public.content_blocks including defaults);
alter table private.deleted_blocks_archive add column if not exists archived_at timestamptz default now(), add column if not exists reason text;

insert into private.deleted_blocks_archive select cb.*, now(), 'C-048 CV to Resume duplicate'
from public.content_blocks cb
where cb.id in ('fe55d1e2-1af7-41a6-b731-18d8992e5236','fa118f8a-7783-45fa-9cbb-77712cc37db8','f8d93d48-f365-4d58-bd44-a210483dbcb2','9437e606-ffcc-4ec0-9bcf-fe7a81b421ba','681d09ed-9ff6-41bc-9ac4-3d01e7d99ca5','ebf6ad3d-6486-47e1-a02a-615f7599fca0','e1923e8b-aed6-492e-a5e3-28fe9ec0fda3','ac1f0d96-7f25-48e9-b4da-6b8189b4ec20')
on conflict do nothing;

delete from public.content_blocks
where id in ('fe55d1e2-1af7-41a6-b731-18d8992e5236','fa118f8a-7783-45fa-9cbb-77712cc37db8','f8d93d48-f365-4d58-bd44-a210483dbcb2','9437e606-ffcc-4ec0-9bcf-fe7a81b421ba','681d09ed-9ff6-41bc-9ac4-3d01e7d99ca5','ebf6ad3d-6486-47e1-a02a-615f7599fca0','e1923e8b-aed6-492e-a5e3-28fe9ec0fda3','ac1f0d96-7f25-48e9-b4da-6b8189b4ec20');

-- 2) Finanzas: E-Book lessons point to the published interactive e-book (same screen ids m1-m10), not the draft.
update public.content_blocks cb
set data = jsonb_set(cb.data, '{ebook_slug}', '"tu-dinero-tu-camino-guia-financiera"'), updated_at = now()
from public.lessons l, public.modules m, public.courses c
where l.id = cb.lesson_id and m.id = l.module_id and c.id = m.course_id
  and c.slug = 'finanzas-personales-en-estados-unidos'
  and cb.data->>'ebook_slug' = 'tu-dinero-tu-camino';
