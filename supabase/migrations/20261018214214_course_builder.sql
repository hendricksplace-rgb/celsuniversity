-- Course builder (/app/admin/cursos): change history and "Duplicar como plantilla".

-- Every save in the builder: who, what, before/after. lesson_id groups the changes a lesson's
-- "Deshacer último cambio" can undo (block edits, the lesson's own fields).
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references auth.users(id) on delete set null default auth.uid(),
  action text not null check (action in ('insert', 'update', 'delete', 'reorder', 'duplicate', 'undo')),
  table_name text not null check (table_name in ('courses', 'modules', 'lessons', 'content_blocks')),
  row_id uuid,
  course_id uuid,
  lesson_id uuid,
  before jsonb,
  after jsonb,
  undone_at timestamptz
);
create index admin_audit_log_lesson_idx on public.admin_audit_log (lesson_id, id desc) where lesson_id is not null;
create index admin_audit_log_course_idx on public.admin_audit_log (course_id, id desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor);

alter table public.admin_audit_log enable row level security;
-- Staff read the history; only admins (who can edit content) write it, as themselves.
create policy audit_read on public.admin_audit_log for select to authenticated using ((select private.is_staff()));
create policy audit_insert on public.admin_audit_log for insert to authenticated
  with check ((select private.is_admin()) and actor = (select auth.uid()));
create policy audit_mark_undone on public.admin_audit_log for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Copy a module with its lessons and blocks, as a draft at the end of its course. Runs with the
-- caller's rights: the inserts only pass RLS for admins (modules/lessons/content_blocks admin_all).
create or replace function public.admin_duplicate_module(p_module uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  m public.modules;
  new_module uuid;
  l record;
  new_lesson uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into m from public.modules where id = p_module;
  if not found then
    raise exception 'module not found' using errcode = 'P0002';
  end if;
  insert into public.modules (course_id, title, description, artwork_url, kind, status, sort_order, offline_enabled)
  values (m.course_id, m.title || ' (plantilla)', m.description, m.artwork_url, m.kind, 'draft',
          (select coalesce(max(sort_order), 0) + 1 from public.modules where course_id = m.course_id), m.offline_enabled)
  returning id into new_module;
  for l in select * from public.lessons where module_id = p_module order by sort_order loop
    insert into public.lessons (module_id, title, lesson_type, icon, accent_color, xp_reward, status, teacher_only, sort_order)
    values (new_module, l.title, l.lesson_type, l.icon, l.accent_color, l.xp_reward, 'draft', l.teacher_only, l.sort_order)
    returning id into new_lesson;
    insert into public.content_blocks (lesson_id, block_type, title, body, data, teacher_only, offline, sort_order)
    select new_lesson, block_type, title, body, data, teacher_only, offline, sort_order
      from public.content_blocks where lesson_id = l.id;
  end loop;
  insert into public.admin_audit_log (action, table_name, row_id, course_id, before, after)
  values ('duplicate', 'modules', new_module, m.course_id, jsonb_build_object('from', p_module), to_jsonb((select x from public.modules x where x.id = new_module)));
  return new_module;
end;
$$;
revoke execute on function public.admin_duplicate_module(uuid) from public, anon;
grant execute on function public.admin_duplicate_module(uuid) to authenticated;
