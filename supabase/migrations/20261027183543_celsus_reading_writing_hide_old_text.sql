-- C-006: the Reading and Writing lesson is now the uscis_reading_writing block; the old text block stays (staff
-- only) instead of being deleted. Backup: docs/backups/2026-10-27-celsus-reading-writing-lesson-before-C-006.json
update public.content_blocks set teacher_only = true
where id = '792f57cf-81dc-428d-9219-9b3d84d5bc9d' and lesson_id = '213b8bbe-e1b7-4cef-866c-d8d934a649c9' and block_type = 'text';
