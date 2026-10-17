-- Run after the Base44 import (and again after any re-run of it, which restores the embeds).
-- Swaps the 38 Gamma teacher-guide embeds for the converted HTML staged in
-- private.teacher_guides_staging (migration 20261017230234). Teacher-only, no external host.
update public.content_blocks b
   set block_type = 'teacher_guide',
       teacher_only = true,
       title = s.title,
       body = s.html,
       data = jsonb_build_object('source_url', s.source_url, 'converted_from', 'gamma')
  from private.teacher_guides_staging s
 where b.legacy_id = s.legacy_block_id;
