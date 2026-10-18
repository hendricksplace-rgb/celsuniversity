// Renders the legal texts (src/content/legal/*.ts, Markdown from Cowork's docs) as page content. A small subset of
// Markdown is enough: ### headings, paragraphs, - lists (two-space nesting), 1. lists, | tables |,
// **bold** and [links](/path). Reviewer notes ([LAWYER: …], [MATT…], [Update…]) are never shown.
import Link from "next/link";
import { Fragment } from "react";
import privacidad from "@/content/legal/privacidad";
import terminos from "@/content/legal/terminos";

const NOTE = /\s*\[(?:LAWYER|MATT|Update)[^\]]*\]/g;

export function legalText(name: "privacidad" | "terminos") {
  return (name === "privacidad" ? privacidad : terminos).replace(NOTE, "");
}

/** **bold** and [text](href) inside a line. */
function inline(text: string) {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={m.index}>{m[1]}</strong>);
    else out.push(m[3].startsWith("/") ? <Link key={m.index} href={m[3]}>{m[2]}</Link> : <a key={m.index} href={m[3]}>{m[2]}</a>);
    last = re.lastIndex;
  }
  out.push(text.slice(last));
  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

type Item = { text: string; children: Item[] };

export function LegalMarkdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(<h2 key={i}>{inline(line.slice(4))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i].trim())) rows.push(lines[i].trim().slice(1, -1).split("|").map((c) => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={i} className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr>
                {head.map((c, k) => (
                  <th key={k} className="border-b border-[#E3DDEA] py-2 pr-4 font-extrabold text-[#0F0D1E]">
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k}>
                  {r.map((c, j) => (
                    <td key={j} className="border-b border-[#F1EDF5] py-2 pr-4">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*- /.test(line)) {
      const root: Item[] = [];
      while (i < lines.length && /^\s*- /.test(lines[i])) {
        const depth = lines[i].match(/^\s*/)![0].length >= 2 ? 1 : 0;
        const item = { text: lines[i].replace(/^\s*- /, ""), children: [] };
        if (depth && root.length) root[root.length - 1].children.push(item);
        else root.push(item);
        i++;
      }
      const list = (items: Item[], k: string): React.ReactNode => (
        <ul key={k}>
          {items.map((it, n) => (
            <li key={n}>
              {inline(it.text)}
              {it.children.length > 0 && list(it.children, `${k}-${n}`)}
            </li>
          ))}
        </ul>
      );
      blocks.push(list(root, String(i)));
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ""));
      blocks.push(
        <ol key={i} className="list-decimal space-y-1 pl-5">
          {items.map((t, n) => (
            <li key={n} className="!ml-0 !list-decimal">
              {inline(t)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }
    // Paragraph: consecutive plain lines.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(### |\||\s*- |\d+\. )/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={i}>
        {para.map((p, n) => (
          <Fragment key={n}>
            {n > 0 && <br />}
            {inline(p)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <>{blocks}</>;
}
