// Shared settings for the end-to-end tests. Secrets come from the environment (CI secrets or
// .env.local), never from the code.
import { createClient } from "@supabase/supabase-js";

const clean = (v: string | undefined) => (v ?? "").replace(/[​-‍⁠﻿]/g, "").trim();

export const BASE_URL = process.env.E2E_BASE_URL ?? "https://nuevo.celstv.com";
export const SUPABASE_URL = clean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
export const PUBLISHABLE_KEY = clean(process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const SECRET_KEY = clean(process.env.SUPABASE_SECRET_KEY);
/** Real emails (sign-up confirmation, reset link, evaluation results, receipts) only when this is "1". */
export const ALLOW_EMAIL = process.env.E2E_ALLOW_EMAIL === "1";

/** Dedicated test accounts: never real students. */
export const STUDENT_EMAIL = "e2e-student@example.com";
export const COURSES = ["celstv-english-for-our-generation", "finanzas-personales-en-estados-unidos"];
export const AUTH_FILE = "e2e/.auth/student.json";
export const CREDS_FILE = "e2e/.auth/creds.json";

export function admin() {
  if (!SUPABASE_URL || !SECRET_KEY) throw new Error("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY are required for the e2e tests");
  return createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });
}
