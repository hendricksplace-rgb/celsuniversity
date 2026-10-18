"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LANG_COOKIE, isLang } from "@/lib/i18n/dictionaries";
import { safeNextPath } from "@/lib/safe-next";
import { SITE_URL } from "@/lib/site";

const safeNext = (value: FormDataEntryValue | null) => safeNextPath(value);

/** Auth email links and OAuth return to SITE_URL (src/lib/site.ts), whatever host the request came from. */
async function siteUrl() {
  return SITE_URL;
}

export async function setLanguage(formData: FormData) {
  const lang = formData.get("lang");
  if (isLang(lang)) {
    (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ preferred_language: lang }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
}

export async function signIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect(`/entrar?error=invalid&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/registro?error=weakPassword");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password,
    options: {
      data: { display_name: String(formData.get("name") ?? "") || undefined },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/app`,
    },
  });
  if (error) redirect("/registro?error=generic");
  // With email confirmation on, there is no session yet.
  if (!data.session) redirect("/registro?sent=1");
  redirect("/app");
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/entrar?error=generic");
  redirect(data.url);
}

/**
 * "¿Olvidaste tu contraseña?": always the same answer, so it never reveals whether the email has an
 * account. Called from the server so the PKCE verifier cookie lands in this browser; the link
 * returns to /nueva-contrasena with a code.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (email) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/nueva-contrasena` });
  }
  redirect("/recuperar?enviado=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
