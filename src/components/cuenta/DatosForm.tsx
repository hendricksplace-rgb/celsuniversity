"use client";

// Mis datos (spec §2): name, profile photo (cropped square to 256 px here, then avatars/<id>.jpg),
// email change through Supabase's confirmation link, and the app language.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setLanguage } from "@/lib/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { card, input, primary } from "./ui";
import { SITE_URL } from "@/lib/site";

type T = Dictionary["cuenta"];

/** Center-crops the image to a square and scales it to 256 px, as JPEG. */
async function squareJpeg(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
  return await new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("canvas"))), "image/jpeg", 0.88));
}

export function DatosForm({
  t,
  userId,
  email,
  pendingEmail,
  initial,
}: {
  t: T;
  userId: string;
  email: string;
  pendingEmail: string | null;
  initial: { name: string; avatar: string | null; lang: "es" | "en" };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [lang, setLang] = useState(initial.lang);
  const [avatar, setAvatar] = useState(initial.avatar);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(pendingEmail ? { ok: true, text: t.emailSent } : null);
  const nameOk = name.trim().length >= 2 && name.trim().length <= 60;

  const show = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3500);
  };

  const onPhoto = async (file: File) => {
    setPhotoBusy(true);
    try {
      const supabase = createClient();
      const path = `${userId}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, await squareJpeg(file), { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { error: pe } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (pe) throw pe;
      setAvatar(url);
      router.refresh();
    } catch {
      show(false, t.photoError);
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOk) return;
    setBusy(true);
    const { error } = await createClient().from("profiles").update({ display_name: name.trim(), preferred_language: lang }).eq("id", userId);
    if (!error && lang !== initial.lang) {
      const fd = new FormData();
      fd.set("lang", lang);
      await setLanguage(fd);
    }
    setBusy(false);
    show(!error, error ? t.saveError : t.saved);
    if (!error) router.refresh();
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await createClient().auth.updateUser({ email: newEmail.trim() }, { emailRedirectTo: `${SITE_URL}/auth/callback?next=/app/cuenta/datos` });
    setEmailMsg({ ok: !error, text: error ? t.emailError : t.emailSent });
    if (!error) setEditingEmail(false);
  };

  return (
    <div className="space-y-4">
      <section className={`${card} flex items-center gap-4`}>
        <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#F5178C] to-[#35C3F0] text-3xl font-extrabold text-white">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- public avatar
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            (name || email).trim().charAt(0).toUpperCase()
          )}
        </span>
        <div>
          <p className="font-extrabold">{t.photo}</p>
          <p className="text-sm text-[#6B6680]">{t.photoHint}</p>
          <label className="mt-2 inline-flex cursor-pointer rounded-full bg-[#F7F5FA] px-4 py-2 text-sm font-extrabold hover:bg-[#EFE6F2] focus-within:outline focus-within:outline-2 focus-within:outline-[#F5178C]">
            {photoBusy ? t.saving : t.changePhoto}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={photoBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPhoto(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <form onSubmit={save} className={`${card} space-y-4`}>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-extrabold">
            {t.name}
          </label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className={input} aria-describedby="name-hint" />
          <p id="name-hint" className={`mt-1 text-xs ${nameOk || !name ? "text-[#6B6680]" : "font-semibold text-[#C0262D]"}`}>
            {nameOk || !name ? t.nameHint : t.nameError}
          </p>
        </div>
        <div>
          <label htmlFor="lang" className="mb-1 block text-sm font-extrabold">
            {t.language}
          </label>
          <select id="lang" value={lang} onChange={(e) => setLang(e.target.value === "en" ? "en" : "es")} className={input}>
            <option value="es">{t.languages.es}</option>
            <option value="en">{t.languages.en}</option>
          </select>
        </div>
        <button className={primary} disabled={busy || !nameOk}>
          {busy ? t.saving : t.save}
        </button>
      </form>

      <section className={`${card} space-y-2`}>
        <p className="text-sm font-extrabold">{t.email}</p>
        <p className="break-all text-[15px]">{email}</p>
        {editingEmail ? (
          <form onSubmit={changeEmail} className="space-y-2">
            <label htmlFor="new-email" className="sr-only">
              {t.newEmail}
            </label>
            <input id="new-email" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t.newEmail} className={input} />
            <div className="flex gap-2">
              <button className={primary}>{t.sendLink}</button>
              <button type="button" onClick={() => setEditingEmail(false)} className="rounded-full px-4 py-2 font-bold text-[#6B6680]">
                {t.cancel}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setEditingEmail(true)} className="rounded-full bg-[#F7F5FA] px-4 py-2 text-sm font-extrabold hover:bg-[#EFE6F2]">
            {t.changeEmail}
          </button>
        )}
        {emailMsg && (
          <p role="status" className={`text-sm font-semibold ${emailMsg.ok ? "text-[#1E7A3A]" : "text-[#C0262D]"}`}>
            {emailMsg.text}
          </p>
        )}
      </section>

      {toast && (
        <p
          role="status"
          className={`fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-2xl px-4 py-3 text-center font-bold text-white shadow-xl md:bottom-8 ${toast.ok ? "bg-[#1B1830]" : "bg-[#C0262D]"}`}
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}
