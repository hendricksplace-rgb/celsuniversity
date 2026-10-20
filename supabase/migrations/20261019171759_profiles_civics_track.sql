-- CelsUS flashcards: the student's exam track (A English, B Spanish 50/20 or 55/15, C 65/20 starred questions).
alter table public.profiles add column if not exists civics_track text check (civics_track in ('A','B','C'));
comment on column public.profiles.civics_track is 'CelsUS exam track: A English exam, B Spanish exam (50/20 or 55/15), C 20 starred questions in Spanish (65/20). Null = not chosen yet.';
