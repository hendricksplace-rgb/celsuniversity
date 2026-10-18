/**
 * ElevenLabs narration for the interactive e-books (public.ebooks).
 *
 * 1. Spanish narration: every screens[].narration.script → narration.audio + narration.wt
 * 2. English pronunciation: every glossary / phrases item's `en` text → item.audio + item.wt
 *
 * Audio: /with-timestamps (MP3), transcoded to AAC .m4a with ffmpeg, uploaded to
 * course-media/<course_id>/ebooks/audio/<slug>-<screen>[...].m4a
 * wt = start time (seconds) of each whitespace-separated word of the text, from the character alignment.
 *
 * Re-runnable: anything that already has `audio` is skipped. Rows are re-read right before each write
 * and patched in place, so edits made meanwhile (e.g. by Cowork) are kept; if the text changed, the item is skipped.
 *
 *   npm run narration -- --dry-run           # count what would be generated, no API calls
 *   npm run narration                        # everything
 *   npm run narration -- --only <slug>       # one book
 *   npm run narration -- --skip-english      # narration only
 *
 * Env (never commit): ELEVENLABS_API_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL.
 * Optional: ELEVENLABS_EN_VOICE_ID (required for the English pass), ELEVENLABS_EN_MODEL.
 * Needs `ffmpeg` with the aac encoder on PATH.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
const SKIP_EN = args.includes("--skip-english");

try {
  process.loadEnvFile(".env.local");
} catch {
  // Use the real environment.
}
const env = (name: string, required = true) => {
  const v = process.env[name]?.replace(/[​-‍⁠﻿]/g, "").trim();
  if (required && !v) throw new Error(`Missing env var ${name}`);
  return v ?? "";
};

const ES = { voice: "OZxMHsGaBmV5pjMIDIn0", model: "eleven_multilingual_v2" };
const EN = { voice: env("ELEVENLABS_EN_VOICE_ID", false), model: env("ELEVENLABS_EN_MODEL", false) || "eleven_multilingual_v2" };

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), DRY_RUN ? env("SUPABASE_SECRET_KEY", false) || "dry" : env("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false },
});

type Narration = { script?: string; audio?: string | null; wt?: number[] };
type Item = { en?: string; es?: string; audio?: string | null; wt?: number[] };
type Block = { type: string; items?: Item[]; groups?: { name: string; items: Item[] }[] };
type Screen = { id: string; narration?: Narration | null; blocks: Block[] };
type Book = { id: string; slug: string; course_id: string; screens: Screen[] };

/** One unit of work: where it lives in the screens JSON, what to say, where to store it. */
type Job = {
  book: Book;
  kind: "narration" | "english";
  text: string;
  path: string;
  /** Finds the object to patch inside a freshly read screens array. */
  locate: (screens: Screen[]) => { target: Narration | Item; text: string | undefined } | null;
};

function jobsFor(book: Book): Job[] {
  const jobs: Job[] = [];
  const base = `${book.course_id}/ebooks/audio/${book.slug}`;
  for (const screen of book.screens ?? []) {
    const n = screen.narration;
    if (n?.script && !n.audio) {
      jobs.push({
        book,
        kind: "narration",
        text: n.script,
        path: `${base}-${screen.id}.m4a`,
        locate: (screens) => {
          const s = screens.find((x) => x.id === screen.id)?.narration;
          return s ? { target: s, text: s.script } : null;
        },
      });
    }
    if (SKIP_EN) continue;
    screen.blocks?.forEach((block, bi) => {
      const lists: { items: Item[]; key: string; pick: (b: Block) => Item[] | undefined }[] = [];
      if (block.type === "phrases" && block.items) lists.push({ items: block.items, key: `b${bi}`, pick: (b) => b.items });
      if (block.type === "glossary")
        block.groups?.forEach((g, gi) => lists.push({ items: g.items, key: `b${bi}-g${gi}`, pick: (b) => b.groups?.[gi]?.items }));
      for (const list of lists) {
        list.items.forEach((item, ii) => {
          if (!item.en || item.audio) return;
          jobs.push({
            book,
            kind: "english",
            text: item.en,
            path: `${base}-${screen.id}-${list.key}-i${ii}-en.m4a`,
            locate: (screens) => {
              const b = screens.find((x) => x.id === screen.id)?.blocks?.[bi];
              const it = b && list.pick(b)?.[ii];
              return it ? { target: it, text: it.en } : null;
            },
          });
        });
      }
    });
  }
  return jobs;
}

/** Start time of each whitespace-separated word, from ElevenLabs' character alignment. */
export function wordStarts(chars: string[], starts: number[]): number[] {
  const out: number[] = [];
  let inWord = false;
  chars.forEach((c, i) => {
    const space = /\s/.test(c);
    if (!space && !inWord) out.push(Math.round(starts[i] * 100) / 100);
    inWord = !space;
  });
  return out;
}

async function speak(text: string, voice: { voice: string; model: string }) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.voice}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": env("ELEVENLABS_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: voice.model }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as {
    audio_base64: string;
    alignment: { characters: string[]; character_start_times_seconds: number[] } | null;
  };
  const mp3 = Buffer.from(json.audio_base64, "base64");
  const wt = json.alignment ? wordStarts(json.alignment.characters, json.alignment.character_start_times_seconds) : [];
  return { mp3, wt };
}

function toM4a(mp3: Buffer): Buffer {
  const dir = mkdtempSync(join(tmpdir(), "narration-"));
  try {
    writeFileSync(join(dir, "in.mp3"), mp3);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", join(dir, "in.mp3"), "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", join(dir, "out.m4a")]);
    return readFileSync(join(dir, "out.m4a"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Re-read the row and patch just this item, so concurrent edits elsewhere survive. */
async function writeBack(job: Job, ref: string, wt: number[]) {
  const { data, error } = await supabase.from("ebooks").select("screens").eq("id", job.book.id).single();
  if (error) throw error;
  const screens = data.screens as Screen[];
  const found = job.locate(screens);
  if (!found || found.text !== job.text) return false; // text changed meanwhile: leave it for the next run
  Object.assign(found.target, { audio: ref, wt });
  const { error: upErr } = await supabase.from("ebooks").update({ screens }).eq("id", job.book.id);
  if (upErr) throw upErr;
  return true;
}

async function main() {
  let q = supabase.from("ebooks").select("id, slug, course_id, screens").order("slug");
  if (ONLY) q = q.eq("slug", ONLY);
  if (DRY_RUN && !process.env.SUPABASE_SECRET_KEY) throw new Error("--dry-run still needs SUPABASE_SECRET_KEY to read the books");
  const { data: books, error } = await q;
  if (error) throw error;

  const jobs = (books as Book[]).flatMap(jobsFor);
  const narr = jobs.filter((j) => j.kind === "narration");
  const eng = jobs.filter((j) => j.kind === "english");
  const chars = (js: Job[]) => js.reduce((n, j) => n + j.text.length, 0);
  console.log(`To generate: ${narr.length} narrations (${chars(narr)} chars), ${eng.length} English items (${chars(eng)} chars)`);
  if (DRY_RUN) return;

  if (!SKIP_EN && eng.length && !EN.voice) {
    throw new Error("Set ELEVENLABS_EN_VOICE_ID for the English pass, or run with --skip-english.");
  }
  execFileSync("ffmpeg", ["-hide_banner", "-encoders"], { stdio: "pipe" }); // fails early if ffmpeg is missing

  let done = 0;
  let skipped = 0;
  const failures: string[] = [];
  for (const job of jobs) {
    try {
      const { mp3, wt } = await speak(job.text, job.kind === "narration" ? ES : EN);
      const m4a = toM4a(mp3);
      const { error: upErr } = await supabase.storage
        .from("course-media")
        .upload(job.path, m4a, { contentType: "audio/mp4", upsert: true });
      if (upErr) throw upErr;
      await supabase.from("media_files").upsert(
        { bucket: "course-media", path: job.path, course_id: job.book.course_id, mime_type: "audio/mp4", bytes: m4a.length, source_url: "elevenlabs" },
        { onConflict: "bucket,path" },
      );
      if (await writeBack(job, `storage://course-media/${job.path}`, wt)) done++;
      else skipped++;
      process.stdout.write(`\r${done + skipped}/${jobs.length} ${job.book.slug}`.padEnd(70));
    } catch (e) {
      failures.push(`${job.path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`\nGenerated ${done}, skipped ${skipped} (text changed), failed ${failures.length}`);
  failures.slice(0, 20).forEach((f) => console.log("  " + f));
  if (failures.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
