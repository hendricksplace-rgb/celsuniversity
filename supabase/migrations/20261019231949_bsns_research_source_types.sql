-- Weeks 2–10 Research use their own "where did you find it?" keys (careers, values, job, ind, gov, ar, pdf, features…);
-- week 1's list (in, yt, bio, web) rejected them. Any short lowercase key is accepted; the page offers only the week's.
alter table public.research_entries drop constraint research_entries_source_type_check,
  add constraint research_entries_source_type_check check (source_type is null or source_type ~ '^[a-z][a-z0-9_]{0,23}$');
