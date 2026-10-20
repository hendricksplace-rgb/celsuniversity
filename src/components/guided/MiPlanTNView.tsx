"use client";

// Mi plan TN (visa-tn-mockup.html ?v=plan): the Visa TN course's product. KPIs (path, profile, courses, English), my
// why, my IG and appointment, my TN folder by document group, the consulate interview, the 30/60/90 plan, the
// countdown to my target date and my phrase; the disclaimer is always visible. Owner only (tn_plans); prints to PDF.
import Link from "next/link";
import { obj, str, stepPath, strs, type GuidedStep, type Lang, type ResumeData, type Section } from "@/lib/guided";
import { PrintPortal, printPdf } from "./ResumeDoc";
import { Ico, TopBar, UI, useLang, useResume } from "./ui";
import s from "./guided.module.css";

type Sec<K extends Section["type"]> = Extract<Section, { type: K }>;
type Found<K extends Section["type"]> = { step: number; sec: Sec<K> } | null;
function byKey<K extends Section["type"]>(steps: GuidedStep[], key: string, type: K): Found<K> {
  for (const st of steps) for (const x of st.build.sections) if (x.key === key && x.type === type) return { step: st.step, sec: x as Sec<K> };
  return null;
}
const bools = (v: unknown) => (Array.isArray(v) ? v.map((x) => x === true) : []);
const groupsCount = (d: ResumeData, f: Found<"groups">) => {
  if (!f) return null;
  const v = bools(d[f.sec.key]);
  let k = 0;
  const per = f.sec.groups.map((g) => {
    const n = g.items.filter(() => v[k++] === true).length;
    return { title: g.title, n, of: g.items.length };
  });
  return { per, n: per.reduce((a, x) => a + x.n, 0), of: per.reduce((a, x) => a + x.of, 0) };
};
const checkCount = (d: ResumeData, f: Found<"checklist">) => (f ? { n: bools(d[f.sec.key]).filter(Boolean).length, of: f.sec.items?.length ?? 0 } : null);
const fmtDate = (iso: string, lang: Lang, time = false) => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { weekday: time ? "long" : undefined, day: "numeric", month: "long", year: time ? undefined : "numeric", ...(time ? { hour: "numeric", minute: "2-digit" } : {}) });
};

export function MiPlanTNView({ userId, slug, steps, plan, name, defaultLang, disclaimer }: { userId: string; slug: string; steps: GuidedStep[]; plan: ResumeData; name: string; defaultLang: Lang; disclaimer: string | null }) {
  const [lang, setLang] = useLang(defaultLang);
  const t = UI[lang];
  const es = lang === "es";
  const { data, set } = useResume(userId, plan, "tn_plans");
  const path = checkCount(data, byKey(steps, "where", "checklist"));
  const pathF = byKey(steps, "where", "checklist");
  const profF = byKey(steps, "profile", "groups");
  const prof = groupsCount(data, profF);
  const takenF = byKey(steps, "taken", "checklist");
  const taken = checkCount(data, takenF);
  const levelF = byKey(steps, "level", "fields");
  const level = obj(data.level);
  const whyF = byKey(steps, "why", "reflect");
  const why = strs(data.why).filter((x) => x.trim());
  const igF = byKey(steps, "ig", "fields");
  const ig = obj(data.ig);
  const talkF = byKey(steps, "talk", "fields");
  const talk = obj(data.talk);
  const threeF = byKey(steps, "three", "list");
  const three = strs(data.three).filter((x) => x.trim());
  const docsF = byKey(steps, "docs", "groups");
  const docs = groupsCount(data, docsF);
  const offerF = byKey(steps, "offer", "groups");
  const offer = groupsCount(data, offerF);
  const consulF = byKey(steps, "consul", "reflect");
  const consul = consulF ? strs(data.consul).filter((x) => x.trim()).length : 0;
  const questions = strs(data.questions).filter((x) => x.trim());
  const p90 = steps.flatMap((st) => st.build.sections.filter((x): x is Sec<"plan"> => x.type === "plan").map((sec) => ({ step: st.step, sec })))[0] ?? null;
  const planDone = p90 ? (obj(obj(data[p90.sec.key]).done) as Record<string, boolean>) : {};
  const togglePlan = (item: string) => p90 && set(p90.sec.key, { ...obj(data[p90.sec.key]), done: { ...planDone, [item]: !planDone[item] } }, true);
  const dateF = byKey(steps, "date", "fields");
  const target = str(obj(data.date).ready);
  const days = target ? Math.ceil((new Date(`${target}T12:00:00`).getTime() - Date.now()) / 86400000) : null;
  const phrase = str(data.phrase).trim();
  const title = es ? "Mi plan TN" : "My TN plan";
  const fileName = `${(name || "Mi").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "") || "Mi"}_Plan_TN.pdf`;
  const stepWord = es ? "paso" : "step";
  const Empty = ({ n }: { n: number }) => (
    <p className={s.sub} style={{ margin: 0 }}>
      <Link href={stepPath(slug, n)} style={{ color: "var(--acc)", fontWeight: 800 }}>
        {es ? `Se completa en el paso ${n}` : `Completed in step ${n}`} →
      </Link>
    </p>
  );
  const kpi = (label: string, v: { n: number; of: number } | null, sub: string, k: string) => (
    <div data-kpi={k}>
      <small>{label}</small>
      <b>{v ? `${v.n} / ${v.of}` : "—"}</b>
      <span>{sub}</span>
      <span className={s.bar2}>
        <i style={{ width: `${v && v.of ? (v.n / v.of) * 100 : 0}%` }} />
      </span>
    </div>
  );

  return (
    <div className={`${s.page} ${s.thTn}`} lang={lang}>
      <TopBar kicker={es ? "CELSGLOBAL · TU CAMINO CON LA VISA TN" : "CELSGLOBAL · YOUR TN VISA PATH"} title={title} backHref={`/app/cursos/${slug}`} progress={1} lang={lang} onLang={setLang} t={t} />
      <div className={s.wrap} style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <div className={s.main}>
          <div className={s.kp4} data-kpis>
            {kpi(es ? "TU CAMINO" : "YOUR PATH", path, `${stepWord} ${pathF?.step ?? 1}`, "path")}
            {kpi(es ? "TU PERFIL" : "YOUR PROFILE", prof, es ? `datos en allcanzatn.com · paso ${profF?.step ?? 2}` : `items on allcanzatn.com · step ${profF?.step ?? 2}`, "profile")}
            {kpi(es ? "TUS CURSOS" : "YOUR COURSES", taken, `${stepWord} ${takenF?.step ?? 3}`, "courses")}
            <div data-kpi="english">
              <small>{es ? "TU INGLÉS" : "YOUR ENGLISH"}</small>
              <b style={{ fontSize: str(level.level).length > 12 ? 20 : undefined }}>{str(level.level) || "—"}</b>
              <span>
                {str(level.eval_date) ? `${es ? "evaluación" : "assessment"}: ${fmtDate(str(level.eval_date), lang)} · ` : ""}
                {stepWord} {levelF?.step ?? 4}
              </span>
            </div>
          </div>

          <div className={s.g2}>
            <div className={s.why} data-why>
              <small>
                {es ? "MI POR QUÉ" : "MY WHY"} · {stepWord.toUpperCase()} {whyF?.step ?? 5}
              </small>
              {why.length ? <p>“{why[0]}”</p> : <Empty n={whyF?.step ?? 5} />}
            </div>
            <div className={s.card} data-ig>
              <h3>
                {es ? "Mi IG y mi cita" : "My IG and my appointment"} · {stepWord} {igF?.step ?? 1}
              </h3>
              {str(ig.name) || str(ig.when) ? (
                <p className={s.sub} style={{ margin: 0 }}>
                  {[str(ig.name), str(ig.when) ? fmtDate(str(ig.when), lang, true) : ""].filter(Boolean).join(" · ")}
                </p>
              ) : (
                <Empty n={igF?.step ?? 1} />
              )}
              <ul className={s.ck} style={{ marginTop: 12 }}>
                <li className={str(talk.when) || str(talk.who) ? s.ckOk : s.ckWa}>
                  <i>
                    <Ico n={str(talk.when) || str(talk.who) ? "check" : "alert"} />
                  </i>
                  <div>
                    {es ? "Conversación en familia" : "Family conversation"} · {stepWord} {talkF?.step ?? 5}
                    <small>{[str(talk.when) ? fmtDate(str(talk.when), lang) : "", str(talk.where), str(talk.who)].filter(Boolean).join(" · ") || (es ? "Todavía sin fecha." : "No date yet.")}</small>
                  </div>
                </li>
                <li className={three.length ? s.ckOk : s.ckWa}>
                  <i>
                    <Ico n={three.length ? "check" : "alert"} />
                  </i>
                  <div>
                    {es ? "Mis 3 hábitos" : "My 3 habits"} · {stepWord} {threeF?.step ?? 6}
                    <small>{three.join(" · ") || (es ? "Elígelos en el paso 6." : "Choose them in step 6.")}</small>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className={s.g2}>
            <div className={s.card} data-folder>
              <h3>
                {es ? "Mi carpeta TN" : "My TN folder"} · {stepWord} {docsF?.step ?? 7}
              </h3>
              <p className={s.sub}>{es ? "Tu IG te ayuda a confirmar que todo esté completo." : "Your IG helps you confirm everything is complete."}</p>
              <div className={s.dg}>
                {(docs?.per ?? []).map((g) => (
                  <div key={g.title}>
                    <span>{g.title}</span>
                    <span className={s.bar2}>
                      <i style={{ width: `${g.of ? (g.n / g.of) * 100 : 0}%` }} />
                    </span>
                    <b>
                      {g.n}/{g.of}
                    </b>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.card} data-consulate>
              <h3>
                {es ? "Mi entrevista en el consulado" : "My consulate interview"} · {stepWord} {consulF?.step ?? 7}
              </h3>
              <ul className={s.ck}>
                <li className={consul === (consulF?.sec.prompts.length ?? 5) ? s.ckOk : s.ckWa}>
                  <i>
                    <Ico n={consul === (consulF?.sec.prompts.length ?? 5) ? "check" : "alert"} />
                  </i>
                  <div>{es ? `${consul} de ${consulF?.sec.prompts.length ?? 5} respuestas preparadas` : `${consul} of ${consulF?.sec.prompts.length ?? 5} answers ready`}</div>
                </li>
                <li className={offer && offer.n === offer.of ? s.ckOk : s.ckWa}>
                  <i>
                    <Ico n={offer && offer.n === offer.of ? "check" : "alert"} />
                  </i>
                  <div>{es ? `Oferta revisada: ${offer?.n ?? 0} de ${offer?.of ?? 0} puntos` : `Offer checked: ${offer?.n ?? 0} of ${offer?.of ?? 0} points`}</div>
                </li>
                <li className={questions.length ? s.ckOk : s.ckWa}>
                  <i>
                    <Ico n={questions.length ? "check" : "alert"} />
                  </i>
                  <div>
                    {es ? `${questions.length} preguntas para mi asesor de Allcanza` : `${questions.length} questions for my Allcanza advisor`}
                    <small>{es ? "Compártelas antes del trámite oficial." : "Share them before the official process."}</small>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {p90 && (
            <div className={s.card} style={{ marginTop: 16 }} data-plan90>
              <h3>
                {es ? "Mi plan de 30, 60 y 90 días" : "My 30, 60 and 90-day plan"} · {stepWord} {p90.step}
              </h3>
              <p className={s.sub}>{es ? "Toca una acción cuando la cumplas." : "Tap an action when you've done it."}</p>
              <div className={s.tl}>
                {(p90.sec.tabs ?? []).map((tb, i) => {
                  const items = strs(obj(data[p90.sec.key])[i]);
                  return (
                    <div key={i}>
                      <b>{tb.label}</b>
                      {items.length ? (
                        <ul className={s.planDone}>
                          {items.map((x) => (
                            <li key={x}>
                              <button type="button" aria-pressed={!!planDone[x]} onClick={() => togglePlan(x)}>
                                <i>{planDone[x] && <Ico n="check" />}</i>
                                {x}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Empty n={p90.step} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={s.g2}>
            <div className={s.count} data-countdown={days ?? ""}>
              <b>{days !== null ? Math.max(0, days) : "—"}</b>
              <span>
                {es ? "días para tu fecha objetivo" : "days to your target date"}
                <br />
                {target ? `${fmtDate(target, lang)} · ` : ""}
                {stepWord} {dateF?.step ?? 8}
              </span>
            </div>
            <div className={s.why} style={{ background: "#fff" }} data-phrase>
              <small>{es ? "MI FRASE" : "MY PHRASE"}</small>
              {phrase ? <p style={{ fontSize: 19 }}>“{phrase}”</p> : <Empty n={8} />}
            </div>
          </div>

          {disclaimer && (
            <div className={s.gdisc} data-disclaimer>
              <Ico n="shield" />
              <div>{disclaimer}</div>
            </div>
          )}

          <nav className={s.nav}>
            <Link href={`/app/cursos/${slug}`} className={`${s.btn} ${s.btnO}`}>
              <Ico n="left" />
              <div>
                <small>{es ? "REGRESAR" : "BACK"}</small>
                <span>{t.toCourse}</span>
              </div>
            </Link>
            <button type="button" className={`${s.btn} ${s.btnG} ${s.navNext}`} onClick={() => printPdf(fileName)} data-action="pdf">
              <Ico n="down" />
              <div>
                <small>{title.toUpperCase()}</small>
                <span>{es ? "Descargar en PDF" : "Download as PDF"}</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      <PrintPortal>
        <div className={s.bankDoc}>
          <h2>{name || title}</h2>
          <p>{title}</p>
          <h6>{es ? "Dónde voy" : "Where I am"}</h6>
          <p>
            {es ? "Mi camino" : "My path"}: {path ? `${path.n}/${path.of}` : "—"} · {es ? "Mi perfil" : "My profile"}: {prof ? `${prof.n}/${prof.of}` : "—"} · {es ? "Mis cursos" : "My courses"}: {taken ? `${taken.n}/${taken.of}` : "—"} · {es ? "Mi inglés" : "My English"}: {str(level.level) || "—"}
            {str(level.eval_date) ? ` (${fmtDate(str(level.eval_date), lang)})` : ""}
          </p>
          {why.length > 0 && (
            <>
              <h6>{es ? "Mi por qué" : "My why"}</h6>
              {why.map((x, i) => (
                <p key={i}>{x}</p>
              ))}
            </>
          )}
          <h6>{es ? "Mi IG, mi familia y mis hábitos" : "My IG, my family and my habits"}</h6>
          <p>{[str(ig.name), str(ig.when) ? fmtDate(str(ig.when), lang, true) : ""].filter(Boolean).join(" · ") || "—"}</p>
          {(str(talk.when) || str(talk.who)) && <p>{[es ? "Conversación en familia" : "Family conversation", str(talk.when) ? fmtDate(str(talk.when), lang) : "", str(talk.where), str(talk.who)].filter(Boolean).join(" · ")}</p>}
          {three.length > 0 && <p>{three.join(" · ")}</p>}
          {docs && (
            <>
              <h6>{es ? "Mi carpeta TN" : "My TN folder"}</h6>
              {docs.per.map((g) => (
                <p key={g.title}>
                  {g.title}: {g.n}/{g.of}
                </p>
              ))}
            </>
          )}
          <h6>{es ? "Mi entrevista en el consulado" : "My consulate interview"}</h6>
          <p>
            {es ? `${consul} de ${consulF?.sec.prompts.length ?? 5} respuestas · oferta revisada ${offer?.n ?? 0}/${offer?.of ?? 0}` : `${consul} of ${consulF?.sec.prompts.length ?? 5} answers · offer checked ${offer?.n ?? 0}/${offer?.of ?? 0}`}
          </p>
          {questions.length > 0 && (
            <ul style={{ paddingLeft: 18, listStyle: "disc" }}>
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          )}
          {p90 && (
            <>
              <h6>{es ? "Mi plan de 30, 60 y 90 días" : "My 30, 60 and 90-day plan"}</h6>
              {(p90.sec.tabs ?? []).map((tb, i) => (
                <div key={i}>
                  <p>
                    <b>{tb.label}</b>
                  </p>
                  <ul style={{ paddingLeft: 18, listStyle: "disc" }}>
                    {strs(obj(data[p90.sec.key])[i]).map((x) => (
                      <li key={x}>
                        {x}
                        {planDone[x] ? " ✓" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
          {target && (
            <p>
              <b>{es ? "Mi fecha objetivo" : "My target date"}:</b> {fmtDate(target, lang)}
            </p>
          )}
          {phrase && (
            <p>
              <i>“{phrase}”</i>
            </p>
          )}
          {disclaimer && (
            <p style={{ marginTop: "14pt", fontSize: "9pt", color: "#555" }}>
              <i>{disclaimer}</i>
            </p>
          )}
        </div>
      </PrintPortal>
    </div>
  );
}
