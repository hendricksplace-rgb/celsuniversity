-- C-023: the 8 CelsTV grammar blocks (episodes 1-8) as they were before Grammar v2 was added (2026-10-27). Grammar v2
-- only added data.v2, so data minus v2 is the original; it matches docs/backups/2026-10-27-celstv-grammar-blocks-before-v2.json.
create table if not exists private.grammar_backup_20261027 as
  select id, lesson_id, data - 'v2' as data, now() as taken_at
    from public.content_blocks
   where id in ('4c198149-195a-436c-89d4-df8736149d29','204ed923-33f6-4c07-96c8-794da97e7735','15fb75b3-ec26-440d-b032-60b7cf1fc8d5','277cec75-9a71-487e-a8ba-808e581ce66a','1c52db00-c08f-43a9-837c-0cbbe87f23e1','b9dd138e-1614-42d3-ad7b-ce314b88b019','b55e8a53-57ba-4050-9404-a236c8784e78','04b9ec25-01d1-432a-8bf0-1ce3db2e0312');
revoke all on private.grammar_backup_20261027 from public, anon, authenticated;
