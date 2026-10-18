create table if not exists public.ebook_source_text (path text not null, page int not null, text text, primary key (path, page));
alter table public.ebook_source_text enable row level security;
revoke all on public.ebook_source_text from anon, authenticated;
comment on table public.ebook_source_text is 'Temporary: extracted text of Designrr PDFs for the CelsBook redesign. Drop when redesign is done.';
