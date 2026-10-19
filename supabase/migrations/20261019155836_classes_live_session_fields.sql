-- Mis clases: live-session fields on classes (all optional; the next-class card hides while next_session_at is empty).
alter table public.classes
  add column if not exists next_session_at timestamptz,
  add column if not exists duration_min integer check (duration_min is null or duration_min between 5 and 600),
  add column if not exists meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  add column if not exists schedule_label text;
