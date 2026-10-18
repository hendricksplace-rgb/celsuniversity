-- Follow-ups run inside the `evaluation` edge function (action "followups").
create or replace function private.kick_followups() returns bigint language plpgsql security definer set search_path = '' as $$
declare anon text := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key');
begin
  if anon is null then raise exception 'Vault secret supabase_anon_key is missing'; end if;
  return net.http_post(url := 'https://pbpnhsgygwqxnkklhyuz.supabase.co/functions/v1/evaluation',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon,'x-job-token',(select token::text from public.job_tokens where name='followups')),
    body := '{"action":"followups"}'::jsonb, timeout_milliseconds := 60000);
end $$;
revoke all on function private.kick_followups() from public, anon, authenticated;
