-- NOT YET APPLIED. Needed before the Base44 import: Base44 courses use two more
-- "orbit" layouts than core_schema allows (ipd_sections, citizenship_modules).
alter table public.courses drop constraint courses_layout_check;
alter table public.courses add constraint courses_layout_check
  check (layout in ('standard', 'playlist_sections', 'ipd_sections', 'citizenship_modules'));
