"use client";

// Mi plan financiero (finanzas-mockup.html ?v=plan): the Finanzas course's product. 4 KPIs from the master budget, the
// donut by category, the emergency fund, the credit plan, the habits, the 90-day plan (tap an action when it's done)
// and the course's disclaimer, always visible. Owner only (financial_plans); "Descargar en PDF" prints it.
import Link from "next/link";
import { obj, str, stepPath, strs, type GuidedStep, type Lang, type ResumeData, type Section } from "@/lib/guided";
import { budgetTotals, emergencyOf, money, num } from "@/lib/guided-finance";
import { Donut } from "./BuildFinance";
import { PrintPortal, printPdf } from "./ResumeDoc";
import { Ico, TopBar, UI, useLang, useResume } from "./ui";
import s from "./guided.module.css";

type Sec<K extends Section["type"]> = Extract<Section, { type: K }>;
type Found<K extends Section["type"]> = { step: GuidedStep; sec: Sec<K> } | null;
function find<K extends Section["type"]>(steps: GuidedStep[], type: K, test: (x: Sec<K>) => boolean = () => true): Found<K> {
  for (const st of steps) for (const x of st.build.sections) if (x.type === type && test(x as Sec<K>)) return { step: st, sec: x as Sec<K> };
  return null;
}
const pickVal = (d: ResumeData, key: string) => obj(d[key]) as { chosen?: string[]; why?: Record<string, string>; start?: Record<string, string> };
const fmtDate = (iso: string, lang: Lang) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { day: "numeric", month: "long" });
};

export function MiPlanView({ userId, slug, steps, plan, name, defaultLang, disclaimer }: { userId: string; slug: string; steps: GuidedStep[]; plan: ResumeData; name: string; defaultLang: Lang; disclaimer: string | null }) {
  const [lang, setLang] = useLang(defaultLang);
  const t = UI[lang];
  const { data, set } = useResume(userId, plan, "financial_plans");
  const tot = budgetTotals(data, steps);
  const ef = emergencyOf(data, steps);
  const es = lang === "es";
  const net = tot?.net ?? 0;
  const savingsCat = tot?.cats.find((c) => c.k === "savings");
  const pct = (v: number) => (net > 0 ? Math.round((v / net) * 100) : 0);
  const neg = (tot?.balance ?? 0) < 0;

  // The parts of the plan, found by what they are (not by course): credit = options with a "why"; habits = options
  // with a start date; the 90-day plan; the decisions (choice) that wrote back to the budget.
  const credit = find(steps, "pick_many", (x) => !!x.why_each);
  const creditRules = credit ? credit.step.build.sections.find((x): x is Sec<"list"> => x.type === "list") : undefined;
  const creditFields = credit ? credit.step.build.sections.find((x): x is Sec<"fields"> => x.type === "fields") : undefined;
  const habits = find(steps, "pick_many", (x) => !!x.with_start_date);
  const p90 = find(steps, "plan");
  const choices = steps.flatMap((st) => st.build.sections.filter((x): x is Sec<"choice"> => x.type === "choice").map((sec) => ({ step: st, sec })));
  const decisions = choices.flatMap(({ step, sec }) => {
    const co = step.build.sections.find((x): x is Sec<"compare_options"> => x.type === "compare_options");
    const sel = obj(data[sec.key]).sel;
    if (!co || typeof sel !== "number" || !co.options[sel]) return [];
    const mk = co.fields.find((f) => f.money)?.k;
    const amt = mk ? num(obj(obj(data[co.key])[sel])[mk]) : 0;
    return [{ step, label: co.options[sel]!, amt, why: str(obj(data[sec.key]).why) }];
  });
  const commit = p90 ? p90.step.build.sections.find((x) => x.type === "textarea" && !x.optional) : undefined;
  const planDone = p90 ? (obj(obj(data[p90.sec.key]).done) as Record<string, boolean>) : {};
  const togglePlan = (item: string) => {
    if (!p90) return;
    const v = obj(data[p90.sec.key]);
    set(p90.sec.key, { ...v, done: { ...planDone, [item]: !planDone[item] } }, true);
  };
  const budgetStep = tot?.step ?? 2;
  const fileName = `${(name || "Mi").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "") || "Mi"}_Plan_financiero.pdf`;
  const title = es ? "Mi plan financiero" : "My financial plan";

  return (
    <div className={`${s.page} ${s.thFinanzas}`} lang={lang}>
      <TopBar kicker={es ? "CELSGLOBAL · FINANZAS PERSONALES" : "CELSGLOBAL · PERSONAL FINANCE"} title={title} backHref={`/app/cursos/${slug}`} progress={1} lang={lang} onLang={setLang} t={t} />
      <div className={s.wrap} style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <div className={s.main}>
          {!net && (
            <div className={s.card} style={{ marginBottom: 16 }} data-empty>
              <h3>{es ? "Tu plan empieza con tu presupuesto" : "Your plan starts with your budget"}</h3>
              <p className={s.sub}>{es ? "Escribe tu ingreso y tus gastos y aquí verás a dónde va tu dinero." : "Enter your income and spending and you'll see where your money goes."}</p>
              <Link href={stepPath(slug, budgetStep)} className={`${s.btn} ${s.btnG}`}>
                {es ? `Ir al paso ${budgetStep}` : `Go to step ${budgetStep}`}
                <Ico n="right" />
              </Link>
            </div>
          )}
          <div className={s.kp4} data-kpis>
            <div>
              <small>{es ? "INGRESO NETO" : "NET INCOME"}</small>
              <b>{net ? money(net) : "—"}</b>
              <span>{es ? `al mes · paso ${budgetStep}` : `a month · step ${budgetStep}`}</span>
            </div>
            <div>
              <small>{es ? "GASTOS" : "SPENDING"}</small>
              <b>{money(tot?.spent ?? 0)}</b>
              <span>{es ? `${pct(tot?.spent ?? 0)}% de tu ingreso` : `${pct(tot?.spent ?? 0)}% of your income`}</span>
            </div>
            <div className={neg ? s.neg : s.pos}>
              <small>{neg ? (es ? "TE FALTA" : "SHORT BY") : es ? "TE QUEDA" : "LEFT OVER"}</small>
              <b>{net ? `${neg ? "" : "+"}${money(tot!.balance)}` : "—"}</b>
              <span>{es ? "al mes" : "a month"}</span>
            </div>
            <div className={pct(savingsCat?.v ?? 0) >= 10 ? s.pos : ""}>
              <small>{es ? "AHORRO" : "SAVINGS"}</small>
              <b>{pct(savingsCat?.v ?? 0)}%</b>
              <span>{es ? "meta: 10–20%" : "goal: 10–20%"}</span>
            </div>
          </div>

          <div className={s.g2}>
            <div className={s.card}>
              <h3>{es ? "A dónde va tu dinero" : "Where your money goes"}</h3>
              {tot && (
                <div className={`${s.sumg} ${s.sumgSm}`}>
                  <Donut cats={tot.cats} net={tot.net} balance={tot.balance} small />
                  <div className={s.fiLeg} style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    {tot.cats.map((c) => (
                      <span key={c.k}>
                        <em style={{ background: c.color }} />
                        {c.label} · <b>{money(c.v)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {neg && <p className={s.fiNote} style={{ color: "var(--red)", fontWeight: 800 }}>{tot?.sec.rules?.find((r) => r.k === "balance_positive")?.fail ?? (es ? "Elige dos gastos que puedas bajar." : "Pick two expenses you can lower.")}</p>}
            </div>
            <div className={s.card} data-emergency>
              <h3>
                {ef ? steps.find((x) => x.step === ef.step)?.builds : es ? "Fondo de emergencia" : "Emergency fund"}
                {ef ? ` · ${es ? "paso" : "step"} ${ef.step}` : ""}
              </h3>
              {ef && ef.goal > 0 ? (
                <>
                  <p className={s.sub}>{es ? "Meta mínima: 3 meses de gastos básicos." : "Minimum goal: 3 months of basic expenses."}</p>
                  <b style={{ fontFamily: "var(--serif)", fontSize: 26 }}>
                    {money(ef.saved)} <span style={{ fontSize: 16, color: "var(--mut)" }}>{es ? `de ${money(ef.goal)}` : `of ${money(ef.goal)}`}</span>
                  </b>
                  <div className={s.goal}>
                    <i style={{ width: `${Math.min(100, (ef.saved / ef.goal) * 100)}%` }} />
                  </div>
                  <p className={s.sub} style={{ margin: 0 }}>
                    {ef.perQ
                      ? es
                        ? `Apartas ${money(ef.perQ)} cada quincena → llegas a tu meta en ${ef.months} ${ef.months === 1 ? "mes" : "meses"}.`
                        : `You set aside ${money(ef.perQ)} every two weeks → you reach your goal in ${ef.months} month${ef.months === 1 ? "" : "s"}.`
                      : es
                        ? "Escribe cuánto puedes apartar cada quincena."
                        : "Enter how much you can set aside every two weeks."}
                    {(() => {
                      const w = steps.find((x) => x.step === ef.step)?.build.sections.find((x) => x.type === "fields");
                      const where = w ? str(obj(data[w.key]).where) : "";
                      return where ? ` ${es ? "Lo guardas en" : "You keep it in"}: ${where}.` : "";
                    })()}
                  </p>
                </>
              ) : (
                <EmptyPart slug={slug} step={ef?.step ?? 7} es={es} />
              )}
            </div>
          </div>

          <div className={s.g2}>
            <div className={s.card} data-credit>
              <h3>
                {credit?.step.builds ?? (es ? "Plan de crédito" : "Credit plan")}
                {credit ? ` · ${es ? "paso" : "step"} ${credit.step.step}` : ""}
              </h3>
              {credit && (pickVal(data, credit.sec.key).chosen?.length || (creditRules && strs(data[creditRules.key]).some((x) => x.trim()))) ? (
                <ul className={s.ck}>
                  {strs(pickVal(data, credit.sec.key).chosen).map((x) => (
                    <li key={x} className={s.ckOk}>
                      <i>
                        <Ico n="check" />
                      </i>
                      <div>
                        {x}
                        {str(pickVal(data, credit.sec.key).why?.[x]) && <small>{str(pickVal(data, credit.sec.key).why?.[x])}</small>}
                      </div>
                    </li>
                  ))}
                  {creditRules &&
                    strs(data[creditRules.key])
                      .filter((x) => x.trim())
                      .map((x) => (
                        <li key={`r-${x}`} className={s.ckOk}>
                          <i>
                            <Ico n="check" />
                          </i>
                          <div>{x}</div>
                        </li>
                      ))}
                  {creditFields &&
                    creditFields.fields.map((f) => {
                      const v = str(obj(data[creditFields.key])[f.k]);
                      return v ? (
                        <li key={f.k} className={s.ckWa}>
                          <i>
                            <Ico n="alert" />
                          </i>
                          <div>
                            {f.input === "day" ? (es ? `Revisar mi cuenta y mi puntaje el día ${v} de cada mes` : `Check my account and score on day ${v} of each month`) : v}
                            <small>{f.label}</small>
                          </div>
                        </li>
                      ) : null;
                    })}
                </ul>
              ) : (
                <EmptyPart slug={slug} step={credit?.step.step ?? 3} es={es} />
              )}
            </div>
            <div className={s.card} data-habits>
              <h3>
                {habits?.step.builds ?? (es ? "Mis hábitos" : "My habits")}
                {habits ? ` · ${es ? "paso" : "step"} ${habits.step.step}` : ""}
              </h3>
              {habits && strs(pickVal(data, habits.sec.key).chosen).length ? (
                <ul className={s.ck}>
                  {strs(pickVal(data, habits.sec.key).chosen).map((x) => {
                    const d = str(pickVal(data, habits.sec.key).start?.[x]);
                    return (
                      <li key={x} className={s.ckOk}>
                        <i>
                          <Ico n="check" />
                        </i>
                        <div>
                          {x}
                          {d && <small>{es ? `Empiezo el ${fmtDate(d, lang)}.` : `Starting ${fmtDate(d, lang)}.`}</small>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyPart slug={slug} step={habits?.step.step ?? 8} es={es} />
              )}
            </div>
          </div>

          {decisions.length > 0 && (
            <div className={s.card} style={{ marginTop: 16 }} data-decisions>
              <h3>{es ? "Mis decisiones" : "My decisions"}</h3>
              <ul className={s.ck}>
                {decisions.map((x) => (
                  <li key={x.step.step} className={s.ckOk}>
                    <i>
                      <Ico n="check" />
                    </i>
                    <div>
                      {x.step.title}: {x.label}
                      {x.amt > 0 ? ` · ${money(x.amt)} ${es ? "al mes" : "a month"}` : ""}
                      {x.why && <small>{x.why}</small>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p90 && (
            <div className={s.card} style={{ marginTop: 16 }} data-plan90>
              <h3>
                {p90.step.builds} · {es ? "paso" : "step"} {p90.step.step}
              </h3>
              <p className={s.sub}>{es ? "Toca una acción cuando la cumplas." : "Tap an action when you've done it."}</p>
              <div className={s.tl}>
                {p90.sec.tabs.map((tb, i) => {
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
                        <p className={s.sub} style={{ margin: 0, fontSize: 13.5 }}>
                          <Link href={stepPath(slug, p90.step.step)} style={{ color: "var(--acc)", fontWeight: 800 }}>
                            {es ? "Agrega tus acciones" : "Add your actions"}
                          </Link>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {commit && str(data[commit.key]).trim() && <div className={s.gquote} style={{ marginTop: 14 }}>{str(data[commit.key])}</div>}
            </div>
          )}

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
                <small>{es ? "MI PLAN" : "MY PLAN"}</small>
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
          <h6>{es ? "Presupuesto mensual" : "Monthly budget"}</h6>
          <table className={s.planTbl}>
            <tbody>
              <tr>
                <td>
                  <b>{es ? "Ingreso neto" : "Net income"}</b>
                </td>
                <td>{money(net)}</td>
                <td />
              </tr>
              {tot?.cats.map((c) => (
                <tr key={c.k}>
                  <td>{c.label}</td>
                  <td>{money(c.v)}</td>
                  <td>{pct(c.v)}%</td>
                </tr>
              ))}
              <tr>
                <td>
                  <b>{neg ? (es ? "Te falta" : "Short by") : es ? "Te queda" : "Left over"}</b>
                </td>
                <td>
                  <b>{money(tot?.balance ?? 0)}</b>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          {ef && ef.goal > 0 && (
            <>
              <h6>{es ? "Fondo de emergencia" : "Emergency fund"}</h6>
              <p>
                {es ? `Meta ${money(ef.goal)} · ahorrado ${money(ef.saved)}` : `Goal ${money(ef.goal)} · saved ${money(ef.saved)}`}
                {ef.perQ ? (es ? ` · ${money(ef.perQ)} por quincena · ${ef.months} meses` : ` · ${money(ef.perQ)} every two weeks · ${ef.months} months`) : ""}
              </p>
            </>
          )}
          {credit && strs(pickVal(data, credit.sec.key).chosen).length > 0 && (
            <>
              <h6>{credit.step.builds}</h6>
              <ul style={{ paddingLeft: 18, listStyle: "disc" }}>
                {strs(pickVal(data, credit.sec.key).chosen).map((x) => (
                  <li key={x}>{x}</li>
                ))}
                {creditRules &&
                  strs(data[creditRules.key])
                    .filter((x) => x.trim())
                    .map((x) => <li key={`r-${x}`}>{x}</li>)}
              </ul>
            </>
          )}
          {decisions.length > 0 && (
            <>
              <h6>{es ? "Mis decisiones" : "My decisions"}</h6>
              <ul style={{ paddingLeft: 18, listStyle: "disc" }}>
                {decisions.map((x) => (
                  <li key={x.step.step}>
                    {x.step.title}: {x.label}
                    {x.amt > 0 ? ` · ${money(x.amt)}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
          {habits && strs(pickVal(data, habits.sec.key).chosen).length > 0 && (
            <>
              <h6>{habits.step.builds}</h6>
              <ul style={{ paddingLeft: 18, listStyle: "disc" }}>
                {strs(pickVal(data, habits.sec.key).chosen).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          )}
          {p90 && (
            <>
              <h6>{p90.step.builds}</h6>
              {p90.sec.tabs.map((tb, i) => (
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

function EmptyPart({ slug, step, es }: { slug: string; step: number; es: boolean }) {
  return (
    <p className={s.sub} style={{ margin: 0 }}>
      <Link href={stepPath(slug, step)} style={{ color: "var(--acc)", fontWeight: 800 }}>
        {es ? `Se completa en el paso ${step}` : `Completed in step ${step}`} →
      </Link>
    </p>
  );
}
