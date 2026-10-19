import { createClient } from 'npm:@supabase/supabase-js@2';

// Speaking Practice fallback (browsers without Web Speech API): one short recording in, {text} out.
// The audio lives only in this request's memory and is sent to OpenAI whisper-1. Nothing is written to Storage or any table.
// Requires a signed-in user. Body: multipart form with "audio" (≤ 3 MB, about 90 s).
const MAX = 3_000_000;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const auth = req.headers.get('Authorization') ?? '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: 'unauthorized' }, 401);
  const oa = Deno.env.get('OPENAI_API_KEY');
  if (!oa) return json({ error: 'unavailable' }, 503);
  let file: File | null = null;
  try { const f = (await req.formData()).get('audio'); if (f instanceof File) file = f; } catch { /* bad body */ }
  if (!file || file.size === 0) return json({ error: 'no audio' }, 400);
  if (file.size > MAX) return json({ error: 'too large' }, 413);
  if (!/^audio\//.test(file.type) && !/^video\/webm/.test(file.type)) return json({ error: 'type' }, 415);
  const ext = file.type.includes('mp4') ? 'mp4' : file.type.includes('ogg') ? 'ogg' : 'webm';
  const fd = new FormData();
  fd.append('model', 'whisper-1');
  fd.append('language', 'en');
  fd.append('response_format', 'json');
  fd.append('file', file, 'speech.' + ext);
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + oa }, body: fd });
  if (!r.ok) return json({ error: 'transcribe failed' }, 502);
  const out = await r.json();
  return json({ text: String(out.text ?? '').trim() });
});
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
