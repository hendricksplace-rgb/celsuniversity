alter table public.courses drop constraint courses_layout_check;
alter table public.courses add constraint courses_layout_check
  check (layout in ('standard', 'playlist_sections', 'ipd_sections', 'citizenship_modules'));
