create table public.audio_jobs (
  id bigserial primary key,
  kind text not null,              -- 'exam_q_en','exam_a_en','exam_q_es','ebook_narration', ...
  ref jsonb not null default '{}', -- pointers used to write results back
  text text not null,
  voice_id text not null,
  model_id text not null default 'eleven_multilingual_v2',
  path text not null unique,       -- object path in course-media
  status text not null default 'pending' check (status in ('pending','working','done','error')),
  attempts int not null default 0,
  error text,
  wt jsonb,
  duration numeric,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table public.audio_jobs enable row level security;
revoke all on public.audio_jobs from anon, authenticated;
create table public.job_tokens (name text primary key, token uuid not null default gen_random_uuid());
alter table public.job_tokens enable row level security;
revoke all on public.job_tokens from anon, authenticated;
insert into public.job_tokens(name) values ('audio');
comment on table public.audio_jobs is 'Queue for ElevenLabs audio generation (edge function generate-audio, key from secret ELEVENLABS_API_KEY). Service role only.';
