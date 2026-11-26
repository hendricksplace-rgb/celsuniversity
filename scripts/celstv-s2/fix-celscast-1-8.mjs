import { get, patch } from "./db.mjs";
import { cleanLine } from "./clean.mjs";
import fs from "fs";
const write = process.argv[2] === "write";
const n = (s) => s.replace(/\s+/g, " ").trim();
const backup = {};
for (let ep = 1; ep <= 8; ep++) {
  const [b] = await get(`content_blocks?block_type=eq.celscast&data->>title=eq.${encodeURIComponent(`CelsCast · Episodio ${ep}`)}&select=id,data`);
  const jobs = (await get(`audio_jobs?kind=eq.celscast&ref->>ep=eq.${ep}&select=text,wt,ref`)).sort((a, b) => a.ref.n - b.ref.n);
  if (jobs.length !== b.data.lines.length) { console.log(ep, "job count differs", jobs.length, b.data.lines.length); continue; }
  let fixed = 0; const problems = [];
  const lines = b.data.lines.map((l, i) => {
    const words = n(l.text).split(" ").length;
    if (l.wt.length === words) return l;
    const j = jobs[i]; const c = cleanLine(j.text, j.wt);
    if (n(c.text) !== n(l.text)) { problems.push(`line ${i}: "${c.text}" vs "${l.text}"`); return l; }
    if (Math.abs(l.wt[0] - (j.wt[0] + l.start)) > 0.002) { problems.push(`line ${i}: offset`); return l; }
    fixed++;
    return { ...l, wt: c.wt.map((w) => Math.round((w + l.start) * 1000) / 1000) };
  });
  const bad = lines.filter((l) => l.wt.length !== n(l.text).split(" ").length).length;
  console.log(`ep ${ep}: fixed ${fixed}, still off ${bad}`, problems.join(" ; "));
  backup[b.id] = b.data.lines;
  if (write && fixed) await patch(`content_blocks?id=eq.${b.id}`, { data: { ...b.data, lines } });
}
if (write) fs.writeFileSync("celscast-1-8-lines-before.json", JSON.stringify(backup));
