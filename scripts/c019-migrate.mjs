// C-019 Part B: move every lesson video still served by Kajabi/Wistia or the old Base44 app into Supabase storage.
//
//   node --env-file=.env.local scripts/c019-migrate.mjs [--only=base44|wistia|all] [--batch=N] [--dry]
//   (behind the cloud proxy: NODE_USE_ENV_PROXY=1)
//
// For each distinct source URL found in content_blocks or guided_course_steps:
//   download (curl, retries) → keep H.264/AAC as is (remux with faststart), transcode anything else, mp3 as is
//   → upload to course-media (TUS, resumable) → check the stored size matches → only then rewrite every row that
//   uses the URL to storage://course-media/<path>, keeping the old URL as media_url_legacy / wistia_legacy.
// Paths (the app signs course-media only under <course_id>/):
//   CelsBSNS videos: <course_id>/celsbsns/week-NN/video-0V.mp4 (from the lesson title "Week N | Video V")
//   everything else: <course_id>/videos/<wistia delivery hash | base44 file name>.mp4|.mp3
//
// Resumable: scripts/c019/state.json records each finished URL; a re-run skips it. A failure is logged and the
// run moves on. Local copies are deleted after the upload is checked (and after a failure).
// Before rewriting anything the affected rows were backed up to private.wistia_migration_backup_20261027.
import fs from "fs";
import path from "path";
import { execFileSync, spawnSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const HERE = path.join(path.dirname(new URL(import.meta.url).pathname), "c019");
const WORK = path.join(HERE, "work");
const LOG = path.join(HERE, "run.log");
const STATE = path.join(HERE, "state.json");
fs.mkdirSync(WORK, { recursive: true });

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split("=")[1];
const ONLY = arg("only", "all");
const BATCH = Number(arg("batch", "9999"));
const DRY = process.argv.includes("--dry");
const MATCH = arg("match", "");

const clean = (s) => (s ?? "").replace(/[​-‍﻿]/g, "").trim();
const URL_ = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const KEY = clean(process.env.SUPABASE_SECRET_KEY);
const db = createClient(URL_, KEY, { auth: { persistSession: false } });
const BSNS = "2bde8b07-a6a2-4709-989e-a32467ee26a7";
const BUCKET = "course-media";
const SOURCE_RE = /https:\/\/(?:embed-ssl\.wistia\.com\/deliveries|base44\.app\/api\/apps)\/[^"\\\s]+/g;

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + "\n");
const log = (...a) => {
  const line = `${new Date().toISOString()} ${a.join(" ")}`;
  fs.appendFileSync(LOG, line + "\n");
  console.log(line);
};
const kindOf = (url) => (url.includes("wistia.com") ? "wistia" : "base44");

// ---------- media ----------
function probe(file) {
  const j = JSON.parse(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name:format=duration", "-of", "json", file]).toString(),
  );
  return {
    v: j.streams.find((s) => s.codec_type === "video")?.codec_name ?? null,
    a: j.streams.find((s) => s.codec_type === "audio")?.codec_name ?? null,
    duration: Math.round(Number(j.format?.duration ?? 0)),
  };
}
function ff(args) {
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) throw new Error("ffmpeg: " + r.stderr.toString().slice(-400));
}
const X264 = (crf, scale) => [
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-crf",
  crf,
  "-vf",
  scale,
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-movflags",
  "+faststart",
];

// ---------- storage: TUS (resumable) without extra dependencies ----------
const b64 = (s) => Buffer.from(s).toString("base64");
async function tusUpload(objectPath, file, contentType) {
  const size = fs.statSync(file).size;
  const auth = { authorization: `Bearer ${KEY}`, apikey: KEY, "tus-resumable": "1.0.0" };
  const create = await fetch(`${URL_}/storage/v1/upload/resumable`, {
    method: "POST",
    headers: {
      ...auth,
      "upload-length": String(size),
      "x-upsert": "true",
      "upload-metadata": [
        `bucketName ${b64(BUCKET)}`,
        `objectName ${b64(objectPath)}`,
        `contentType ${b64(contentType)}`,
        `cacheControl ${b64("31536000")}`,
      ].join(","),
    },
  });
  if (create.status !== 201) throw new Error(`upload create ${create.status}: ${(await create.text()).slice(0, 200)}`);
  let loc = create.headers.get("location");
  if (!loc) throw new Error("upload create: no location");
  if (loc.startsWith("/")) loc = new URL(loc, URL_).toString();
  // Supabase may answer with its storage subdomain; the main host serves the same upload.
  loc = loc.replace(/^https:\/\/([a-z0-9]+)\.storage\.supabase\.co/, URL_);
  const CHUNK = 6 * 1024 * 1024; // Supabase requires 6 MB chunks
  const fd = fs.openSync(file, "r");
  try {
    let offset = 0;
    let tries = 0;
    while (offset < size) {
      const len = Math.min(CHUNK, size - offset);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, offset);
      try {
        const r = await fetch(loc, {
          method: "PATCH",
          headers: { ...auth, "upload-offset": String(offset), "content-type": "application/offset+octet-stream" },
          body: buf,
        });
        if (r.status !== 204) throw new Error(`PATCH ${r.status}: ${(await r.text()).slice(0, 200)}`);
        offset = Number(r.headers.get("upload-offset"));
        tries = 0;
      } catch (e) {
        if (++tries > 6) throw new Error("upload: " + e.message);
        await new Promise((res) => setTimeout(res, 5000 * tries));
        // Ask the server where to resume.
        const h = await fetch(loc, { method: "HEAD", headers: auth }).catch(() => null);
        if (h?.ok) offset = Number(h.headers.get("upload-offset"));
      }
    }
  } finally {
    fs.closeSync(fd);
  }
  return size;
}
async function remoteSize(objectPath) {
  const { data, error } = await db.storage.from(BUCKET).list(path.posix.dirname(objectPath), { search: path.posix.basename(objectPath), limit: 10 });
  if (error) throw new Error("verify: " + error.message);
  const o = (data ?? []).find((x) => x.name === path.posix.basename(objectPath));
  return o ? Number(o.metadata?.size ?? -1) : null;
}

// ---------- work list ----------
async function all(table, select) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select(select)
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

/** Every source URL → the rows that use it, each with the course it belongs to and where its copy goes. */
async function workList() {
  const blocks = await all(
    "content_blocks",
    "id, block_type, data, lesson:lessons!inner(title, module:modules!inner(sort_order, course_id, course:courses!inner(title)))",
  );
  const steps = await all("guided_course_steps", "module_id, data, module:modules!inner(course_id, course:courses!inner(title))");
  const byUrl = new Map();
  const add = (url, use) => {
    if (!byUrl.has(url)) byUrl.set(url, { url, kind: kindOf(url), uses: [] });
    byUrl.get(url).uses.push(use);
  };
  for (const b of blocks) {
    const text = JSON.stringify(b.data ?? {});
    for (const url of new Set(text.match(SOURCE_RE) ?? [])) {
      const courseId = b.lesson.module.course_id;
      add(url, {
        table: "content_blocks",
        id: b.id,
        courseId,
        course: b.lesson.module.course.title,
        title: b.lesson.title,
        week: b.lesson.module.sort_order + 1,
        video: b.block_type === "video" && b.data?.media_url === url,
      });
    }
  }
  for (const s of steps) {
    const text = JSON.stringify(s.data ?? {});
    for (const url of new Set(text.match(SOURCE_RE) ?? []))
      add(url, {
        table: "guided_course_steps",
        id: s.module_id,
        courseId: s.module.course_id,
        course: s.module.course.title,
        title: "guided step",
        video: false,
      });
  }
  for (const w of byUrl.values()) {
    const ext = /\.mp3(\?|$)/i.test(w.url) ? "mp3" : "mp4";
    const name = w.kind === "wistia" ? /deliveries\/([0-9a-f]+)/.exec(w.url)?.[1] : path.basename(new URL(w.url).pathname).replace(/\.[a-z0-9]+$/i, "");
    w.ext = ext;
    w.dest = {}; // courseId → object path
    for (const u of w.uses) {
      if (w.dest[u.courseId]) continue;
      if (u.courseId === BSNS && u.video) {
        // "Week 4 | Video 06", or Week 2's "Week 2: 02 | …" / "Week 02:06 | …"
        const v = Number((/video\s*0?(\d+)/i.exec(u.title) ?? /week\s*0?\d+\s*:\s*0?(\d+)/i.exec(u.title))?.[1] ?? 0);
        if (!v) w.error = `no video number in "${u.title}"`;
        w.dest[u.courseId] = `${u.courseId}/celsbsns/week-${String(u.week).padStart(2, "0")}/video-${String(v).padStart(2, "0")}.mp4`;
      } else w.dest[u.courseId] = `${u.courseId}/videos/${name}.${ext}`;
    }
    w.course = [...new Set(w.uses.map((u) => u.course))].join(" + ");
  }
  return [...byUrl.values()];
}

// ---------- one URL ----------
async function rewrite(w, refs, meta) {
  for (const u of w.uses) {
    const ref = refs[u.courseId];
    if (u.table === "content_blocks") {
      const { data: row, error } = await db.from("content_blocks").select("data").eq("id", u.id).single();
      if (error) throw new Error("rewrite read: " + error.message);
      const next = JSON.parse(JSON.stringify(row.data).split(w.url).join(ref));
      if (u.video) {
        next.media_url_legacy = w.url;
        if (w.kind === "wistia") next.wistia_legacy = w.url;
        next.provider = "storage";
        next.mime = w.ext === "mp3" ? "audio/mpeg" : "video/mp4";
        if (meta.duration) next.duration_s = meta.duration;
        if (u.courseId === BSNS) next.video_status = "ready";
        if (meta.poster && !next.thumbnail_url) next.thumbnail_url = meta.poster;
      } else {
        next.wistia_legacy = [...new Set([...(Array.isArray(next.wistia_legacy) ? next.wistia_legacy : []), w.url])];
      }
      const { error: e2 } = await db.from("content_blocks").update({ data: next }).eq("id", u.id);
      if (e2) throw new Error("rewrite: " + e2.message);
    } else {
      const { data: row, error } = await db.from("guided_course_steps").select("data").eq("module_id", u.id).single();
      if (error) throw new Error("rewrite read: " + error.message);
      const next = JSON.parse(JSON.stringify(row.data).split(w.url).join(ref));
      next.wistia_legacy = [...new Set([...(Array.isArray(next.wistia_legacy) ? next.wistia_legacy : []), w.url])];
      const { error: e2 } = await db.from("guided_course_steps").update({ data: next }).eq("module_id", u.id);
      if (e2) throw new Error("rewrite: " + e2.message);
    }
  }
}

async function processOne(w, key) {
  const src = path.join(WORK, `${key}.src`);
  const out = path.join(WORK, `${key}.out.${w.ext}`);
  log("START", w.kind, w.course, "|", w.uses.map((u) => u.title).join(", "), "→", Object.values(w.dest).join(", "));
  fs.rmSync(src, { force: true });
  const dl = spawnSync("curl", ["-sSfL", "--retry", "5", "--retry-delay", "10", "--retry-all-errors", "-o", src, w.url], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  if (dl.status !== 0) throw new Error("download: " + dl.stderr.toString().trim());
  const inBytes = fs.statSync(src).size;
  let p = probe(src);
  let action = "copy";
  if (w.ext === "mp3" || (!p.v && p.a)) fs.copyFileSync(src, out);
  else if (p.v === "h264" && (p.a === "aac" || p.a === null)) {
    action = "remux";
    ff(["-i", src, "-c", "copy", "-movflags", "+faststart", out]);
  }
  if (!fs.existsSync(out) || (w.ext === "mp4" && fs.statSync(out).size > 400 * 1024 * 1024)) {
    // Not H.264/AAC, or too heavy to stream on a phone (e.g. the 900 MB TN intro): re-encode.
    action = fs.existsSync(out) ? "transcode (over 400 MB)" : `transcode ${p.v}/${p.a}`;
    ff(["-i", src, ...X264("22", "scale='min(1920,iw)':-2"), out]);
    if (fs.statSync(out).size > 400 * 1024 * 1024) {
      action += " (crf 24, 720p)";
      ff(["-i", src, ...X264("24", "scale=-2:'min(720,ih)'"), out]);
    }
  }
  p = probe(out);
  const refs = {};
  let bytes = 0;
  for (const [courseId, dest] of Object.entries(w.dest)) {
    bytes = await tusUpload(dest, out, w.ext === "mp3" ? "audio/mpeg" : "video/mp4");
    const remote = await remoteSize(dest);
    if (remote !== bytes) throw new Error(`verify ${dest}: stored ${remote} ≠ local ${bytes}`);
    refs[courseId] = `storage://${BUCKET}/${dest}`;
  }
  // A poster for CelsBSNS videos that have none (frame at ~5 s).
  let poster = null;
  if (w.ext === "mp4" && w.dest[BSNS] && p.v) {
    const jpg = path.join(WORK, `${key}.jpg`);
    ff(["-ss", String(Math.min(5, Math.max(0, p.duration - 1))), "-i", out, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "3", jpg]);
    const dest = w.dest[BSNS].replace(/\.mp4$/, ".jpg");
    const size = await tusUpload(dest, jpg, "image/jpeg");
    if ((await remoteSize(dest)) === size) poster = `storage://${BUCKET}/${dest}`;
  }
  await rewrite(w, refs, { duration: p.duration, poster });
  state[w.url] = {
    ok: true,
    kind: w.kind,
    course: w.course,
    uses: w.uses.length,
    dest: Object.values(w.dest),
    action,
    inBytes,
    bytes,
    duration: p.duration,
    at: new Date().toISOString(),
  };
  save();
  log("DONE ", w.kind, `${(bytes / 1048576).toFixed(1)} MB`, `${p.duration}s`, action, `${w.uses.length} row(s) rewritten`);
}

// ---------- run ----------
if (process.argv.includes("--selftest")) {
  // Uploads a 13 MB throwaway file (3 chunks), checks its stored size, then removes it. Touches no lesson data.
  const f = path.join(WORK, "selftest.bin");
  fs.writeFileSync(f, Buffer.alloc(13 * 1024 * 1024, 7));
  const dest = "zz-c019-selftest/selftest.bin";
  const size = await tusUpload(dest, f, "application/octet-stream");
  const remote = await remoteSize(dest);
  await db.storage.from(BUCKET).remove([dest]);
  fs.rmSync(f, { force: true });
  log(`SELFTEST upload ${size} bytes, stored ${remote}: ${remote === size ? "OK" : "MISMATCH"}`);
  process.exit(remote === size ? 0 : 1);
}
const list = (await workList()).filter((w) => ONLY === "all" || w.kind === ONLY);
const pending = list.filter((w) => !state[w.url]?.ok && (!MATCH || w.url.includes(MATCH)));
log(`RUN only=${ONLY} batch=${BATCH}${DRY ? " (dry)" : ""}: ${list.length} source URLs, ${pending.length} to do`);
if (DRY) {
  for (const w of pending) log("  ", w.kind, w.course, "|", w.uses.length, "use(s) →", Object.values(w.dest).join(", "), w.error ?? "");
  process.exit(0);
}
let n = 0;
for (const w of pending) {
  if (n++ >= BATCH) break;
  const key = Buffer.from(w.url).toString("base64url").slice(-24);
  try {
    if (w.error) throw new Error(w.error);
    await processOne(w, key);
  } catch (e) {
    const msg = String(e?.message ?? e).slice(0, 500);
    log("FAIL ", w.kind, w.course, "|", w.url, "-", msg);
    state[w.url] = { ok: false, kind: w.kind, course: w.course, error: msg, at: new Date().toISOString() };
    save();
  } finally {
    for (const f of fs.readdirSync(WORK)) if (f.startsWith(key)) fs.rmSync(path.join(WORK, f), { force: true });
  }
}
const left = (await workList()).filter((w) => ONLY === "all" || w.kind === ONLY).filter((w) => !state[w.url]?.ok).length;
log(`END batch: ${left} source URL(s) still to do`);
