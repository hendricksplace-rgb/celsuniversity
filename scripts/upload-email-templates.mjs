// Uploads emails/manifest.json and emails/app/*.html to the private bucket 'email-templates',
// where the send-email and evaluation functions read them (cached 10 minutes per instance).
// Run after changing a template:  node --env-file=.env.local scripts/upload-email-templates.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY?.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim();
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const admin = createClient(url, key, { auth: { persistSession: false } });

const root = new URL("../emails/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
const files = ["manifest.json", ...manifest.emails.map((e) => e.file).filter((f) => f.startsWith("app/"))];

for (const file of files) {
  const body = readFileSync(new URL(file, root));
  const type = file.endsWith(".json") ? "application/json" : "text/html; charset=utf-8";
  const { error } = await admin.storage.from("email-templates").upload(file, body, { contentType: type, upsert: true });
  if (error) throw new Error(`${file}: ${error.message}`);
  console.log("uploaded", file);
}
