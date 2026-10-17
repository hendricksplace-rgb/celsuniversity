-- CelsU core schema (migrated from Base44 app 6a4cfadfe1f30bc41a96d740)
create extension if not exists pgcrypto;

create type public.user_role as enum ('super_admin','director','administrator','teacher','student','individual_student');
create type public.cefr_level as enum ('A1','A2','B1','B2','C1','C2');
create type public.pub_status as enum ('draft','published');
create type public.lang as enum ('es','en');

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  logo_url text,
  default_language public.lang not null default 'es',
  seat_limit int not null default 50,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_id text unique,
  email text,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'individual_student',
  organization_id uuid references public.organizations(id) on delete set null,
  preferred_language public.lang not null default 'es',
  starting_level public.cefr_level,
  evaluation_level public.cefr_level,
  evaluation_skills jsonb,
  evaluation_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('super_admin','director','administrator') from public.profiles where id = (select auth.uid())), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('super_admin','director','administrator','teacher') from public.profiles where id = (select auth.uid())), false)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  slug text unique,
  title text not null,
  description text,
  accent_color text default '#F5178C',
  cover_art_url text,
  status public.pub_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  slug text unique,
  title text not null,
  description text,
  accent_color text default '#F5178C',
  cover_art_url text,
  status public.pub_status not null default 'draft',
  sort_order int not null default 0,
  layout text not null default 'standard' check (layout in ('standard','playlist_sections')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_courses (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  program_id uuid not null references public.programs(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  sort_order int not null default 0,
  is_launcher boolean not null default false,
  launcher_label text,
  icon_url text,
  unique (program_id, course_id)
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  artwork_url text,
  kind text not null default 'lesson_week' check (kind in ('lesson_week','resources','evaluation')),
  status public.pub_status not null default 'draft',
  sort_order int not null default 0,
  offline_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  lesson_type text not null default 'text',
  icon text,
  accent_color text,
  xp_reward int not null default 50,
  status public.pub_status not null default 'draft',
  teacher_only boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_type text not null,
  title text,
  body text,
  data jsonb not null default '{}'::jsonb,
  teacher_only boolean not null default false,
  offline boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  module_id uuid not null references public.modules(id) on delete cascade,
  label text not null,
  label_es text,
  description text,
  resource_type text not null default 'file' check (resource_type in ('pdf','link','file')),
  file_path text,
  url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'course-media',
  path text not null,
  course_id uuid references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  mime_type text,
  bytes bigint,
  source_url text,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);
create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null check (member_role in ('teacher','student')),
  primary key (class_id, user_id)
);
create table public.class_courses (
  class_id uuid not null references public.classes(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  primary key (class_id, course_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  enrollment_type text not null default 'individual' check (enrollment_type in ('individual','class')),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  plan text,
  source text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (course_id is not null or program_id is not null)
);

create or replace function public.has_course_access(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff()
  or exists (
    select 1 from public.enrollments e
    where e.user_id = (select auth.uid()) and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
      and (e.course_id = p_course
           or e.program_id in (select pc.program_id from public.program_courses pc where pc.course_id = p_course))
  )
  or exists (
    select 1 from public.class_members m
    join public.class_courses cc on cc.class_id = m.class_id
    join public.classes c on c.id = m.class_id and c.status = 'active'
    where m.user_id = (select auth.uid()) and cc.course_id = p_course
  )
$$;

create or replace function public.lesson_course(p_lesson uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.course_id from public.lessons l join public.modules m on m.id = l.module_id where l.id = p_lesson
$$;

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  quiz_score numeric,
  quiz_max_score numeric,
  xp_earned int not null default 0,
  video_position numeric not null default 0,
  flashcard_state jsonb,
  last_activity timestamptz not null default now(),
  client_updated_at timestamptz,
  unique (user_id, lesson_id)
);

create table public.gamification (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  legacy_id text unique,
  total_xp int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_activity_date date,
  streak_freezes int not null default 1,
  badges jsonb not null default '[]'::jsonb,
  weekly_xp int not null default 0,
  weekly_reset_date date
);

create table public.offline_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  device_id text not null,
  bytes bigint,
  downloaded_at timestamptz not null default now(),
  last_validated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  removed_at timestamptz,
  unique (user_id, module_id, device_id)
);

create or replace function public.renew_offline_downloads(p_device text)
returns table (module_id uuid, expires_at timestamptz, allowed boolean)
language plpgsql security definer set search_path = '' as $$
begin
  update public.offline_downloads d
     set last_validated_at = now(), expires_at = now() + interval '7 days'
   where d.user_id = (select auth.uid()) and d.device_id = p_device and d.removed_at is null
     and public.has_course_access((select m.course_id from public.modules m where m.id = d.module_id));
  return query
    select d.module_id, d.expires_at,
           public.has_course_access((select m.course_id from public.modules m where m.id = d.module_id))
      from public.offline_downloads d
     where d.user_id = (select auth.uid()) and d.device_id = p_device and d.removed_at is null;
end $$;

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  module_id uuid references public.modules(id) on delete cascade,
  title text not null,
  language public.lang not null default 'en',
  bank_size int not null default 128,
  exam_question_count int not null default 20,
  pass_count int not null default 12,
  has_audio boolean not null default false,
  large_text boolean not null default false,
  source_subset_of uuid references public.evaluations(id) on delete set null,
  sort_order int not null default 0
);

create table public.evaluation_questions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  question_type text,
  question_text text not null,
  data jsonb not null default '{}'::jsonb,
  answer_text text,
  explanation text,
  is_asterisked boolean not null default false,
  sort_order int not null default 0
);

create table public.evaluation_attempts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  score int not null default 0,
  total int not null default 0,
  passed boolean not null default false,
  answers jsonb,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  email text not null,
  native_language text default 'Español',
  goal text default 'general',
  cefr_level public.cefr_level,
  skill_levels jsonb,
  writing_sample text,
  writing_feedback text,
  recommended_product text,
  evaluated_at timestamptz,
  converted_to_student boolean not null default false,
  student_id uuid references public.profiles(id) on delete set null,
  unsubscribed boolean not null default false,
  followup_stage int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  price_usd_cents int not null,
  stripe_price_id text,
  grants jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  product_id uuid references public.products(id),
  stripe_session_id text unique,
  amount_usd_cents int,
  status text not null default 'pending' check (status in ('pending','paid','refunded','failed')),
  created_at timestamptz not null default now()
);

create table public.resume_submissions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_text text,
  file_path text,
  result jsonb,
  status text not null default 'evaluating' check (status in ('evaluating','ready','invalid')),
  submitted_at timestamptz not null default now(),
  unlock_at timestamptz not null
);

create table public.settings (
  key text primary key,
  value jsonb not null
);

create table public.import_logs (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  admin_id uuid references public.profiles(id) on delete set null,
  total_rows int default 0, created int default 0, skipped int default 0, failed int default 0,
  details jsonb,
  created_at timestamptz not null default now()
);

create index on public.program_courses (course_id);
create index on public.modules (course_id, sort_order);
create index on public.lessons (module_id, sort_order);
create index on public.content_blocks (lesson_id, sort_order);
create index on public.resources (module_id);
create index on public.media_files (module_id);
create index on public.media_files (course_id);
create index on public.profiles (organization_id);
create index on public.classes (organization_id);
create index on public.class_members (user_id);
create index on public.class_courses (course_id);
create index on public.enrollments (user_id);
create index on public.enrollments (course_id);
create index on public.enrollments (program_id);
create index on public.enrollments (class_id);
create index on public.progress (lesson_id);
create index on public.offline_downloads (module_id);
create index on public.evaluations (module_id);
create index on public.evaluations (source_subset_of);
create index on public.evaluation_questions (evaluation_id, sort_order);
create index on public.evaluation_attempts (user_id);
create index on public.evaluation_attempts (evaluation_id);
create index on public.leads (email);
create index on public.leads (student_id);
create index on public.orders (user_id);
create index on public.orders (product_id);
create index on public.resume_submissions (user_id);
create index on public.import_logs (admin_id);

create trigger t_org before update on public.organizations for each row execute function public.touch_updated_at();
create trigger t_prof before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_prog before update on public.programs for each row execute function public.touch_updated_at();
create trigger t_course before update on public.courses for each row execute function public.touch_updated_at();
create trigger t_mod before update on public.modules for each row execute function public.touch_updated_at();
create trigger t_les before update on public.lessons for each row execute function public.touch_updated_at();
create trigger t_blk before update on public.content_blocks for each row execute function public.touch_updated_at();
