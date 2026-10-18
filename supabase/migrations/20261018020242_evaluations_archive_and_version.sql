alter table public.evaluations add column if not exists archived boolean not null default false;
alter table public.evaluations add column if not exists test_version text;
update public.evaluations set archived = true, test_version = 'mixed-2008'
where id in ('51a08aff-5c64-4086-b546-0a575099c42d','8b8098bd-c338-4242-8a28-1c1557e1ff10','4dbcc92d-27a2-4c26-a7a9-7a51015dc7b1');
