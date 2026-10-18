-- Recreated from the live migration with one change: the live function embeds the project's
-- anon JWT in `anon`. Keys stay out of the repo, so it is replaced by <SUPABASE_ANON_KEY> here.
-- This file is a record (migrations are not re-applied); to rebuild, read the key from Vault instead.
create or replace function private.kick_audio(p_shards int default 3, p_limit int default 40) returns bigint[] language plpgsql security definer set search_path = '' as $$
declare ids bigint[] := '{}'; k int; anon text := '<SUPABASE_ANON_KEY>';
begin
  for k in 0..p_shards-1 loop
    ids := ids || net.http_post(url := 'https://pbpnhsgygwqxnkklhyuz.supabase.co/functions/v1/generate-audio',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon,'x-job-token',(select token::text from public.job_tokens where name='audio')),
      body := jsonb_build_object('limit',p_limit,'shard',k,'shards',p_shards), timeout_milliseconds := 150000);
  end loop;
  return ids;
end $$;
revoke all on function private.kick_audio(int,int) from public, anon, authenticated;
