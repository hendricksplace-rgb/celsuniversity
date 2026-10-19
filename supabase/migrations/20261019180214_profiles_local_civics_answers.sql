-- CelsUS CelsBook "Mis respuestas locales": the student's own senator and representative, saved on their profile.
alter table public.profiles
  add column if not exists civics_senator text check (civics_senator is null or length(civics_senator) <= 120),
  add column if not exists civics_representative text check (civics_representative is null or length(civics_representative) <= 120);
comment on column public.profiles.civics_senator is 'CelsUS: one of the student''s U.S. senators (their own answer, "Mis respuestas locales").';
comment on column public.profiles.civics_representative is 'CelsUS: the student''s U.S. representative (their own answer).';
