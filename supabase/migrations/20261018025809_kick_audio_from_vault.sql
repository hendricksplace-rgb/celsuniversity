-- The anon key lives in Vault as 'supabase_anon_key' (created once via vault.create_secret; not in this file).
create or replace function private.kick_audio(p_shards int default 3, p_limit int default 40) returns bigint[] language plpgsql security definer set search_path = '' as $$
declare ids bigint[] := '{}'; k int;
  anon text := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key');
begin
  if anon is null then raise exception 'Vault secret supabase_anon_key is missing'; end if;
  for k in 0..p_shards-1 loop
    ids := ids || net.http_post(url := 'https://pbpnhsgygwqxnkklhyuz.supabase.co/functions/v1/generate-audio',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon,'x-job-token',(select token::text from public.job_tokens where name='audio')),
      body := jsonb_build_object('limit',p_limit,'shard',k,'shards',p_shards), timeout_milliseconds := 150000);
  end loop;
  return ids;
end $$;
revoke all on function private.kick_audio(int,int) from public, anon, authenticated;
