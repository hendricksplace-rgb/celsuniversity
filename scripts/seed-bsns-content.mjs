// CelsBSNS interactive lessons: writes one week's JSON into public.reading_content (ReadingData, src/lib/reading.ts),
// public.writing_content (WritingData, src/lib/writing.ts), public.research_content (ResearchData,
// src/lib/research.ts) or public.video_task_content (VideoTaskData, src/lib/video-task.ts). The only tables it writes; lessons and
// content_blocks are not touched. Server-side only: needs SUPABASE_SECRET_KEY in the environment (never in client code).
//   node --env-file=.env.local scripts/seed-bsns-content.mjs reading <lesson-id> content/celsbsns/reading-semana1.json          (dry run)
//   node --env-file=.env.local scripts/seed-bsns-content.mjs writing <lesson-id> content/celsbsns/writing-semana1.json --write
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [kind, lessonId, file] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const write = process.argv.includes("--write");
const REQUIRED = {
  reading: ["week", "original", "hero", "warmup", "article", "vocab", "sources", "video", "cases", "checkpoint"],
  writing: ["week", "original", "hero", "scenario", "parts", "rules", "example", "words", "to_label", "capstone_part"],
  video_task: ["week", "original", "hero", "seconds", "must", "tips", "delivery", "script_source_lesson_id", "capstone_part"],
  research: ["week", "original", "hero", "sentences", "sources", "lenses", "types", "share_options", "tone_options", "model", "patterns"],
};
if (!REQUIRED[kind] || !/^[0-9a-f-]{36}$/.test(lessonId ?? "") || !file) throw new Error("usage: seed-bsns-content.mjs reading|writing|research|video_task <lesson-id> <file.json> [--write]");

const clean = (v) => (v ?? "").replace(/[​-‍⁠﻿]/g, "").trim();
const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = clean(process.env.SUPABASE_SECRET_KEY);
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const admin = createClient(url, key, { auth: { persistSession: false } });

const data = JSON.parse(readFileSync(file, "utf8"));
for (const k of REQUIRED[kind]) if (!(k in data)) throw new Error(`${file}: missing "${k}"`);
if (kind === "reading" && data.checkpoint.mcq.length !== 3) throw new Error("the checkpoint needs 3 questions");
if (kind === "writing" && data.parts.length < 1) throw new Error("the writing task needs its parts");

const { data: lesson, error } = await admin.from("lessons").select("id, title").eq("id", lessonId).single();
if (error || !lesson) throw new Error(`lesson ${lessonId} not found`);
console.log(`${kind} · week ${data.week} → "${lesson.title}" (${lesson.id})`);
if (!write) {
  console.log("Dry run. Add --write to save it.");
  process.exit(0);
}
const table = `${kind}_content`;
const { error: upErr } = await admin.from(table).upsert({ lesson_id: lessonId, data, updated_at: new Date().toISOString() }, { onConflict: "lesson_id" });
if (upErr) throw upErr;
console.log(`Saved to ${table}.`);
