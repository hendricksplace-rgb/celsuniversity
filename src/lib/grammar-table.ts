// C-007: a Markdown pipe table inside a Grammar exercise description ("**Subject** | **Verb** | **Example**\nI | am | I am Alex.").
// The lines with "|" are the table (first row = header, "---" separator rows skipped); the text before them is the intro.

export type PipeTable = { intro: string; after: string; header: string[]; rows: string[][] };

const unbold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").trim();

function cells(line: string) {
  const parts = line.split("|").map((c) => c.trim());
  if (parts.length && parts[0] === "") parts.shift();
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts.map(unbold);
}

export function parsePipeTable(text: unknown): PipeTable | null {
  if (typeof text !== "string" || !text.includes("|")) return null;
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.includes("|"));
  let end = start;
  while (end < lines.length && lines[end].includes("|")) end++;
  const table = lines
    .slice(start, end)
    .filter((l) => !/^[\s|:-]+$/.test(l))
    .map(cells);
  const width = table[0]?.length ?? 0;
  if (width < 2 || table.length < 2) return null;
  return {
    intro: lines.slice(0, start).join("\n").trim(),
    after: lines.slice(end).join("\n").trim(),
    header: table[0],
    rows: table.slice(1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? "")),
  };
}

/** The description without its table (for places that show plain text, like the rule screen). */
export function withoutPipeTable(text: string) {
  const t = parsePipeTable(text);
  return t ? [t.intro, t.after].filter(Boolean).join("\n\n") : text;
}
