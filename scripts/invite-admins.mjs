// Invites the CelsU administrators (celsu-admin-invites.md) and sets profiles.role = 'administrator'.
// Server-side only: needs SUPABASE_SECRET_KEY in the environment (never in client code).
// Before running: paste emails/supabase/invite.html into Supabase Auth → Email Templates → "Invite user",
// and add https://celsuniversity.vercel.app/auth/aceptar to Auth → URL Configuration → Redirect URLs.
//   node --env-file=.env.local scripts/invite-admins.mjs          (dry run: shows what it would do)
//   node --env-file=.env.local scripts/invite-admins.mjs --send   (sends the invites)
import { createClient } from "@supabase/supabase-js";

const ADMINS = [
  { email: "reneod93@gmail.com", name: "René" },
  { email: "ludomartinezavir@gmail.com", name: "Ludo" },
  { email: "michael@hendrickspilaw.com", name: "Michael" },
];
const REDIRECT = "https://celsuniversity.vercel.app/auth/aceptar";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY?.replace(/[​-‍⁠﻿]/g, "").trim();
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const admin = createClient(url, key, { auth: { persistSession: false } });
const send = process.argv.includes("--send");

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const a of ADMINS) {
  const existing = list.users.find((u) => u.email?.toLowerCase() === a.email);
  let id = existing?.id;
  if (existing) console.log(`${a.email}: already has an account (invited_at ${existing.invited_at ?? "—"}); not re-sending`);
  else if (!send) console.log(`${a.email}: would invite as ${a.name}`);
  else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(a.email, { redirectTo: REDIRECT, data: { display_name: a.name } });
    if (error) {
      console.error(`${a.email}: invite failed: ${error.message}`);
      continue;
    }
    id = data.user.id;
    console.log(`${a.email}: invited`);
  }
  if (!id || !send) continue;
  // The profile row comes from the on_auth_user_created trigger.
  const { error } = await admin.from("profiles").update({ role: "administrator", display_name: a.name }).eq("id", id);
  console.log(`${a.email}: role administrator ${error ? `FAILED (${error.message})` : "set"}`);
}
