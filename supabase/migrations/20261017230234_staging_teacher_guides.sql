-- Staging for the 38 Gamma teacher guides converted to native HTML (Base44 import step).
-- Lives in the private schema (not exposed through the API). After the Base44 import,
-- content_blocks with these legacy_ids become teacher-only 'teacher_guide' blocks.
create table if not exists private.teacher_guides_staging (
  legacy_block_id text primary key,
  title text not null,
  html text not null,
  source_url text,
  created_at timestamptz not null default now()
);
revoke all on private.teacher_guides_staging from anon, authenticated;
