-- C-035: the CelsTV CelsCards "tap to flip" guide shows once per student (any episode, any device).
alter table public.user_preferences add column if not exists celstv_cards_coach_done boolean not null default false;
-- C-036: CelsTV CelsBook v2, which episodes' books the student has opened (the cover shows only the first time) and
-- the page they were on: {"<episode>": {"page": <item index>}}.
alter table public.user_preferences add column if not exists celsbook_opened jsonb not null default '{}'::jsonb;
