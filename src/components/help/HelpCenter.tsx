"use client";

import { useMemo, useState } from "react";
import { CONTACT_EMAIL, HELP } from "./content";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5178C]";

function Answer({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={`l${out.length}`} className="ml-5 list-disc space-y-1">{list.map((l) => <li key={l}>{l}</li>)}</ul>);
    list = [];
  };
  for (const l of lines) {
    if (l.startsWith("- ")) list.push(l.slice(2));
    else {
      flush();
      out.push(<p key={`p${out.length}`}>{l}</p>);
    }
  }
  flush();
  return <div className="space-y-2 text-[15px] leading-relaxed text-[#4A4766]">{out}</div>;
}

/** Questions grouped by topic; the search box filters them as the student types (accents ignored). */
export function HelpCenter() {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return HELP;
    return HELP.map((g) => ({ ...g, items: g.items.filter((f) => norm(`${f.q} ${f.a}`).includes(q)) })).filter((g) => g.items.length);
  }, [query]);

  return (
    <div className="space-y-8">
      <label className="block">
        <span className="sr-only">Buscar en la ayuda</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca tu pregunta: contraseña, reembolso, sin internet…"
          className={`w-full rounded-2xl border border-[#E4DEEA] bg-white px-4 py-3.5 text-base font-semibold text-[#1B1830] shadow-sm placeholder:text-[#8A86A0] ${focus}`}
        />
      </label>

      {groups.length ? (
        groups.map((g) => (
          <section key={g.title} aria-labelledby={`h-${g.title}`}>
            <h2 id={`h-${g.title}`} className="text-xl font-extrabold">
              {g.title}
            </h2>
            <div className="mt-3 space-y-2.5">
              {g.items.map((f) => (
                <details key={f.q} open={!!query.trim()} className="group rounded-2xl border border-[#EFE6F2] bg-white p-4 shadow-sm">
                  <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg font-extrabold ${focus} [&::-webkit-details-marker]:hidden`}>
                    {f.q}
                    <span className="text-[#F5178C] transition group-open:rotate-45 motion-reduce:transition-none" aria-hidden>
                      +
                    </span>
                  </summary>
                  <div className="mt-3">
                    <Answer text={f.a} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="rounded-2xl bg-white p-5 text-center font-semibold text-[#4A4766]">No encontramos esa pregunta. Escríbenos y te ayudamos.</p>
      )}

      <section className="rounded-3xl p-6 text-white" style={{ background: "linear-gradient(135deg,#F20174 0%,#B5007E 55%,#13284D 100%)" }}>
        <h2 className="text-xl font-extrabold">Contacto</h2>
        <p className="mt-1 text-sm font-semibold text-white/90">
          Correo: {CONTACT_EMAIL} (respondemos de lunes a viernes)
        </p>
        <a href={`mailto:${CONTACT_EMAIL}`} className={`mt-4 inline-flex rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#B5007E] ${focus}`}>
          Escríbenos
        </a>
      </section>
    </div>
  );
}
