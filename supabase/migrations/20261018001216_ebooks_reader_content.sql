create table public.ebooks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null unique,
  title text not null,
  subtitle text,
  program text not null check (program in ('celstv','celsbsns','celsus','celsglobal')),
  pdf_path text,
  cover_path text,
  est_minutes int,
  screens jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  review_notes text,
  status text not null default 'draft' check (status in ('draft','review','published')),
  format_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ebooks is 'Interactive e-book reader content (replaces flat Designrr PDFs). screens = typed blocks; see project doc claude/celsu-ebook-reader-format.md. pdf_path is the original PDF (storage://course-media/...) kept as download.';
create index ebooks_course_idx on public.ebooks(course_id);
alter table public.ebooks enable row level security;
create policy admin_all on public.ebooks for all using ((select private.is_admin())) with check ((select private.is_admin()));
create policy ebooks_read on public.ebooks for select using ((select private.is_staff()) or (status = 'published' and private.has_course_access(course_id)));
grant select on public.ebooks to authenticated;
create or replace function public.ebooks_touch() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger ebooks_touch before update on public.ebooks for each row execute function public.ebooks_touch();
