"use client";

// The money sections of the guided template (first used by "Finanzas Personales en Estados Unidos"): budgets, the
// calculations that read the master budget (step 2), the comparisons and choices that write back to it, the savings
// plan, the spending log and the 30/60/90 plan. Everything autosaves into financial_plans.data[section.key].
import Link from "next/link";
import { useState } from "react";
import { obj, str, stepPath, strs, type GuidedStep, type ResumeData, type Section } from "@/lib/guided";
import {
  budgetOf,
  budgetTotals,
  calcValue,
  catColor,
  donut,
  evalFormula,
  budgetVars,
  masterBudget,
  money,
  monthsTo,
  num,
  writeBack,
  type BudgetSec,
  type BudgetVal,
} from "@/lib/guided-finance";
import { Ico } from "./ui";
import type { BuildCtx } from "./Build";
import s from "./guided.module.css";

type Sec<K extends Section["type"]> = Extract<Section, { type: K }>;
export const FINANCE_TYPES = ["budget", "budget_6m", "calc", "compare_options", "choice", "checklist_amounts", "savings_plan", "spend_log", "plan"] as const;
export const isFinanceSection = (sec: Section) => (FINANCE_TYPES as readonly string[]).includes(sec.type);

export function FinanceSection({ sec, ctx }: { sec: Section; ctx: BuildCtx }) {
  switch (sec.type) {
    case "budget":
      return sec.is_master ? <MasterBudget sec={sec} ctx={ctx} /> : <SimpleBudget sec={sec} ctx={ctx} />;
    case "budget_6m":
      return <Budget6m sec={sec} ctx={ctx} />;
    case "calc":
      return <Calc sec={sec} ctx={ctx} />;
    case "compare_options":
      return <CompareOptions sec={sec} ctx={ctx} />;
    case "choice":
      return <Choice sec={sec} ctx={ctx} />;
    case "checklist_amounts":
      return <ChecklistAmounts sec={sec} ctx={ctx} />;
    case "savings_plan":
      return <SavingsPlan sec={sec} ctx={ctx} />;
    case "spend_log":
      return <SpendLog sec={sec} ctx={ctx} />;
    case "plan":
      return <Plan sec={sec} ctx={ctx} />;
    default:
      return null;
  }
}

/** A money field: "$" (or "MX$") in front, digits only, right-aligned, numeric keyboard. */
export function MoneyInput({ value, onChange, label, mxn, placeholder = "0", disabled, id }: { value: string; onChange: (v: string) => void; label: string; mxn?: boolean; placeholder?: string; disabled?: boolean; id?: string }) {
  return (
    <div className={`${s.minp} ${mxn ? s.minpMx : ""}`}>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
        data-money
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
      />
    </div>
  );
}

/** "Paso 4" (the category's refined step in the data) → "Se afina en el paso 4". */
const refinedText = (r: string | null | undefined) => (r ? `Se afina en el ${r.toLowerCase()}` : null);
const pctOf = (v: number, net: number) => (net > 0 ? Math.round((v / net) * 100) : 0);
const signed = (n: number) => `${n < 0 ? "" : "+"}${money(n)}`;

// ---------- budget: the master (step 2) ----------

/** Which category a rule reads: the first category for housing, the "savings" key for savings. */
function ruleState(rule: NonNullable<BudgetSec["rules"]>[number], t: NonNullable<ReturnType<typeof budgetTotals>>) {
  if (rule.k === "balance_positive") return { ok: t.balance >= 0, pct: null as number | null };
  const cat = rule.k === "savings_min" ? t.cats.find((c) => c.k === "savings") : rule.k === "housing_max" ? (t.cats.find((c) => c.k === "rent") ?? t.cats[0]) : null;
  const p = cat ? pctOf(cat.v, t.net) : 0;
  return { ok: rule.k === "savings_min" ? p >= (rule.pct ?? 10) : p <= (rule.pct ?? 30), pct: p };
}

function MasterBudget({ sec, ctx }: { sec: BudgetSec; ctx: BuildCtx }) {
  const b = budgetOf(ctx.data, sec.key);
  const t = budgetTotals(ctx.data, ctx.steps)!;
  const rule = sec.income?.annual_to_net;
  const put = (patch: Partial<BudgetVal>) => ctx.set(sec.key, { ...b, ...patch });
  const neg = t.balance < 0;
  return (
    <>
      {rule && (
        <div className={s.inc}>
          <div className={s.fld}>
            <label htmlFor={`a-${sec.key}`}>Sueldo anual antes de impuestos</label>
            <MoneyInput id={`a-${sec.key}`} label="Sueldo anual antes de impuestos" value={str(b.annual)} onChange={(v) => put({ annual: v, netManual: false })} />
          </div>
          <span className={s.eqs}>
            ÷ {rule.divide} − {rule.tax_pct}% ≈
          </span>
          <div className={s.net} data-net>
            <small>INGRESO NETO POR MES</small>
            <b>{t.net > 0 ? money(t.net) : "—"}</b>
          </div>
        </div>
      )}
      {rule?.note && <p className={s.fiNote}>{rule.note}</p>}
      <details className={s.netManual} open={!!b.netManual}>
        <summary>Ya sé mi ingreso neto (lo que llega a mi cuenta)</summary>
        <div className={s.fld} style={{ maxWidth: 260, marginTop: 10 }}>
          <MoneyInput label="Ingreso neto por mes" value={b.netManual ? str(b.net) : ""} placeholder={t.net ? String(t.net) : "0"} onChange={(v) => put({ net: v, netManual: !!v })} />
        </div>
      </details>
      <div className={s.cats}>
        {t.cats.map((c) => (
          <div className={s.cat} key={c.k} data-cat={c.k}>
            <em style={{ background: c.color }} />
            <b>
              {c.label}
              {refinedText(c.refined) && <small>{refinedText(c.refined)}</small>}
            </b>
            <MoneyInput label={c.label} value={str(b.cats?.[c.k])} onChange={(v) => put({ cats: { ...(b.cats ?? {}), [c.k]: v } })} />
            <span className={s.pct}>{pctOf(c.v, t.net)}%</span>
          </div>
        ))}
      </div>
      <div className={s.sumg} data-budget-summary>
        <Donut cats={t.cats} net={t.net} balance={t.balance} />
        <div style={{ minWidth: 0, width: "100%" }}>
          <div className={s.kp}>
            <div>
              <small>INGRESO</small>
              <b>{money(t.net)}</b>
            </div>
            <div>
              <small>GASTOS</small>
              <b>{money(t.spent)}</b>
            </div>
            <div className={neg ? s.neg : s.pos}>
              <small>SALDO</small>
              <b data-balance>{signed(t.balance)}</b>
            </div>
          </div>
          {sec.rules?.length ? (
            <ul className={`${s.ck} ${s.rules}`} data-rules>
              {sec.rules.map((r) => {
                const st = ruleState(r, t);
                const empty = t.net <= 0;
                return (
                  <li key={r.k} className={empty ? "" : st.ok ? s.ckOk : s.ckWa} data-rule={r.k} data-ok={empty ? undefined : st.ok}>
                    <i>{!empty && <Ico n={st.ok ? "check" : "alert"} />}</i>
                    <div>
                      {r.text}
                      <small>{empty ? "Escribe tu ingreso para revisarlo." : st.pct !== null ? `Ahora: ${st.pct}% de tu ingreso.` : st.ok ? `Te quedan ${money(t.balance)} al mes.` : (r.fail ?? `Te faltan ${money(-t.balance)} al mes.`)}</small>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function Donut({ cats, net, balance, small }: { cats: { v: number; color: string }[]; net: number; balance: number; small?: boolean }) {
  const neg = balance < 0;
  return (
    <div className={`${s.donut} ${small ? s.donutSm : ""} ${neg ? s.neg : ""}`} style={{ background: donut(cats, net) }} role="img" aria-label={`${neg ? "Te falta" : "Te queda"} ${money(Math.abs(balance))} al mes`} data-donut={neg ? "neg" : "pos"}>
      <div>
        <div>
          <b>{signed(balance)}</b>
          <span>{neg ? "TE FALTA" : "TE QUEDA"}</span>
        </div>
      </div>
    </div>
  );
}

/** Step 2's "Usar este ejemplo": the book's example loaded into the master budget. */
export function BudgetExample({ ex, ctx }: { ex: NonNullable<GuidedStep["example"]>; ctx: BuildCtx }) {
  const m = masterBudget(ctx.steps);
  if (!m) return null;
  const cats = m.sec.categories.map(([k, label], i) => ({ k, label, color: catColor(i) }));
  const vals = exampleCats(ex.items, cats.map((c) => c.k));
  const spent = Object.values(vals).reduce((a, b) => a + b, 0);
  const bal = ex.balance ?? ex.net - spent;
  const use = () => {
    const cur = budgetOf(ctx.data, m.sec.key);
    const filled = Object.values(cur.cats ?? {}).some((v) => num(v) > 0);
    if (filled && !window.confirm("Esto cambia los números de tu presupuesto por los del ejemplo. ¿Continuar?")) return;
    ctx.set(m.sec.key, { ...cur, net: String(ex.net), netManual: true, cats: Object.fromEntries(cats.map((c) => [c.k, vals[c.k] ? String(vals[c.k]) : ""])) }, true);
    document.querySelector(`[data-section="${m.sec.key}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className={s.card} data-example style={{ marginTop: 16 }}>
      <h3>{ex.title}</h3>
      <p className={s.sub}>Toca «{ex.button ?? "Usar este ejemplo"}» para cargarlo en tu presupuesto y cambiarlo con tus números.</p>
      <div className={s.fiBar} style={{ height: 22, borderRadius: 11 }}>
        {cats.map((c) => (vals[c.k] ? <i key={c.k} title={c.label} style={{ width: `${(vals[c.k]! / ex.net) * 100}%`, background: c.color }} /> : null))}
        {bal > 0 && <i style={{ width: `${(bal / ex.net) * 100}%`, background: "repeating-linear-gradient(45deg,#E4F7EE 0 6px,#C6EEDB 6px 12px)" }} />}
      </div>
      <div className={s.fiLeg} style={{ fontSize: 12.5, gap: "8px 14px", marginTop: 12 }}>
        {cats.map((c) =>
          vals[c.k] ? (
            <span key={c.k}>
              <em style={{ background: c.color }} />
              {c.label} {money(vals[c.k]!)}
            </span>
          ) : null,
        )}
        <span>
          <em style={{ background: "#C6EEDB" }} />
          <b style={{ color: "var(--mid)" }}>Saldo {money(bal)}</b>
        </span>
      </div>
      <button type="button" className={`${s.btn} ${s.btnT}`} style={{ marginTop: 16 }} onClick={use} data-action="use-example">
        <Ico n="down" />
        {ex.button ?? "Usar este ejemplo"}
      </button>
    </div>
  );
}

/** The example's keys are the book's lines; a line that is not a category (car payment, car insurance, gas) adds to
 *  the category it belongs to, or to "other". */
const EXAMPLE_ALIAS: Record<string, string> = { car_payment: "transport", car_insurance: "transport", gas: "transport", gasoline: "transport", internet: "utilities", save: "savings" };
function exampleCats(items: Record<string, number>, keys: string[]) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(items)) {
    const to = keys.includes(k) ? k : EXAMPLE_ALIAS[k] && keys.includes(EXAMPLE_ALIAS[k]!) ? EXAMPLE_ALIAS[k]! : keys.includes("other") ? "other" : null;
    if (to) out[to] = (out[to] ?? 0) + num(v);
  }
  return out;
}

// ---------- budget: a simple one (step 1, in MXN) ----------

function SimpleBudget({ sec, ctx }: { sec: BudgetSec; ctx: BuildCtx }) {
  const b = budgetOf(ctx.data, sec.key);
  const mx = sec.currency === "MXN";
  const inc = num(b.net);
  const tot = sec.categories.reduce((a, [k]) => a + num(b.cats?.[k]), 0);
  const bal = inc - tot;
  const put = (patch: Partial<BudgetVal>) => ctx.set(sec.key, { ...b, ...patch });
  return (
    <>
      {mx && <p className={s.sub}>Anota cuánto gastas hoy, en pesos. Así comparas tu realidad de hoy con tu presupuesto en EE.UU.</p>}
      <div className={s.mtbl}>
        <div className={`${s.mrw} ${s.mrw2}`} style={{ background: "var(--acc3)" }}>
          <b>{sec.income_label ?? "Ingreso mensual"}</b>
          <MoneyInput mxn={mx} label={sec.income_label ?? "Ingreso mensual"} value={str(b.net)} onChange={(v) => put({ net: v })} />
        </div>
        {sec.categories.map(([k, label]) => (
          <div className={`${s.mrw} ${s.mrw2}`} key={k}>
            <b>{label}</b>
            <MoneyInput mxn={mx} label={label} value={str(b.cats?.[k])} onChange={(v) => put({ cats: { ...(b.cats ?? {}), [k]: v } })} />
          </div>
        ))}
        {sec.show_balance && (
          <div className={`${s.mrw} ${s.mrwTot} ${s.mrw2}`} data-balance={bal}>
            <b>{bal < 0 ? "Te falta" : "Te queda"}</b>
            <b className={s.big}>{inc ? money(bal, mx ? "MXN" : "USD") : "—"}</b>
          </div>
        )}
      </div>
    </>
  );
}

// ---------- budget_6m: the e-book's 6-month activity, starting from the master budget ----------

function Budget6m({ sec, ctx }: { sec: Sec<"budget_6m">; ctx: BuildCtx }) {
  const m = masterBudget(ctx.steps);
  const t = budgetTotals(ctx.data, ctx.steps);
  const o = obj(ctx.data[sec.key]) as { net?: string; cats?: Record<string, string> };
  const rows = (t?.cats ?? []).map((c) => ({ ...c, v: o.cats?.[c.k] !== undefined && o.cats[c.k] !== "" ? num(o.cats[c.k]) : c.v, raw: o.cats?.[c.k] }));
  const net = o.net !== undefined && o.net !== "" ? num(o.net) : (t?.net ?? 0);
  const tot = rows.reduce((a, r) => a + r.v, 0);
  const put = (patch: Partial<typeof o>) => ctx.set(sec.key, { ...o, ...patch });
  const left = (net - tot) * 6;
  return (
    <>
      <div className={s.mtbl}>
        <div className={`${s.mrw} ${s.mrwHd}`}>
          <span>CONCEPTO</span>
          <span style={{ textAlign: "right" }}>AL MES</span>
          <span style={{ textAlign: "right" }}>× 6 MESES</span>
        </div>
        <div className={s.mrw} style={{ background: "var(--acc3)" }}>
          <b>Ingreso neto</b>
          <MoneyInput label="Ingreso neto" value={o.net ?? ""} placeholder={String(t?.net || 0)} onChange={(v) => put({ net: v })} />
          <span className={s.x6}>{money(net * 6)}</span>
        </div>
        {rows.map((r) => (
          <div className={s.mrw} key={r.k}>
            <b>{r.label}</b>
            <MoneyInput label={r.label} value={r.raw ?? ""} placeholder={String(t?.cats.find((c) => c.k === r.k)?.v || 0)} onChange={(v) => put({ cats: { ...(o.cats ?? {}), [r.k]: v } })} />
            <span className={s.x6}>{money(r.v * 6)}</span>
          </div>
        ))}
        <div className={`${s.mrw} ${s.mrwTot}`}>
          <b>{left < 0 ? "Te falta en 6 meses" : "Te queda en 6 meses"}</b>
          <span />
          <span className={s.x6} data-six={left}>
            {money(left)}
          </span>
        </div>
      </div>
      <p className={s.sub} style={{ margin: "12px 0 0", fontSize: 13.5 }}>
        Empieza con los números de tu presupuesto{m ? ` (paso ${m.step})` : ""}. Cámbialos aquí sin afectar tu presupuesto.
      </p>
    </>
  );
}

// ---------- calc: a formula over the master budget ----------

const formulaEs = (f: string) => f.replace(/net_income/g, "ingreso neto").replace(/\brent\b/g, "renta").replace(/\bfood\b/g, "comida").replace(/\butilities\b/g, "servicios").replace(/\btransport\b/g, "transporte").replace(/\bhealth\b/g, "seguro médico").replace(/\*/g, "×");

function NeedBudget({ ctx }: { ctx: BuildCtx }) {
  const m = masterBudget(ctx.steps);
  if (!m || m.step === ctx.step.step) return null;
  return (
    <p className={s.fiNote} data-need-budget>
      Primero llena tu presupuesto en el <Link href={stepPath(ctx.slug, m.step)}>paso {m.step}</Link>: este cálculo usa tus números.
    </p>
  );
}

function Calc({ sec, ctx }: { sec: Sec<"calc">; ctx: BuildCtx }) {
  const auto = Math.round(evalFormula(sec.formula, budgetVars(ctx.data, ctx.steps)));
  const ov = str(obj(ctx.data[sec.key]).value);
  const val = ov.trim() ? num(ov) : auto;
  return (
    <>
      <div className={s.bigres} data-calc={sec.key}>
        <div>
          <small>{sec.label.toUpperCase()}</small>
          <b data-calc-value={val}>{val > 0 ? money(val) : "—"}</b>
        </div>
        <p>
          Calculado con tu presupuesto: <span className={s.mono}>{formulaEs(sec.formula)}</span>
          {sec.editable ? " · puedes ajustarlo" : ""}
        </p>
        {sec.editable && <MoneyInput label={`Ajustar: ${sec.label}`} value={ov} placeholder={String(auto || 0)} onChange={(v) => ctx.set(sec.key, { value: v })} />}
      </div>
      {auto <= 0 && <NeedBudget ctx={ctx} />}
    </>
  );
}

// ---------- compare_options and choice ----------

type Opts = Record<string, Record<string, string>>;
const moneyField = (sec: Sec<"compare_options">) => sec.fields.find((f) => f.money)?.k;
/** "rent <= max_rent": the money field must stay under a calc of this step. */
function checkLimit(sec: Sec<"compare_options">, ctx: BuildCtx) {
  const m = /^\s*(\w+)\s*<=\s*(\w+)\s*$/.exec(sec.check ?? "");
  if (!m) return null;
  const max = calcValue(ctx.data, ctx.steps, m[2]!);
  const calc = ctx.step.build.sections.find((x) => x.key === m[2]);
  return { field: m[1]!, max, label: calc && "label" in calc ? String(calc.label) : "" };
}

function CompareOptions({ sec, ctx }: { sec: Sec<"compare_options">; ctx: BuildCtx }) {
  const [tab, setTab] = useState(0);
  const o = obj(ctx.data[sec.key]) as Opts;
  const lim = checkLimit(sec, ctx);
  // The option already chosen below ("choice") keeps the budget in step with its cost.
  const choice = ctx.step.build.sections.find((x): x is Sec<"choice"> => x.type === "choice");
  const mk = moneyField(sec);
  const put = (i: number, k: string, v: string) =>
    ctx.update((d) => {
      const next = { ...d, [sec.key]: { ...o, [i]: { ...(o[i] ?? {}), [k]: v } } } as ResumeData;
      const sel = choice ? obj(d[choice.key]).sel : undefined;
      return choice?.writes_to && k === mk && sel === i && num(v) > 0 ? writeBack(next, choice.writes_to, num(v)) : next;
    });
  return (
    <>
      <p className={s.sub}>Llena lo que encuentres en anuncios reales de tu ciudad.</p>
      <div className={`${s.tabs} ${s.ctabs}`} role="tablist">
        {sec.options.map((x, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === tab} className={i === tab ? s.on : ""} onClick={() => setTab(i)}>
            {x}
          </button>
        ))}
      </div>
      <div className={`${s.copt} ${s.coptTabbed}`} style={{ ["--n" as string]: sec.options.length }}>
        {sec.options.map((x, i) => {
          const v = o[i] ?? {};
          const amt = lim ? num(v[lim.field]) : 0;
          return (
            <div key={i} className={i === tab ? s.on : ""} data-option={i}>
              <h4>{x}</h4>
              {sec.fields.map((f) => {
                const id = `c-${sec.key}-${i}-${f.k}`;
                return (
                  <div key={f.k} className={s.fld}>
                    <label htmlFor={id}>{f.label}</label>
                    {f.money ? (
                      <MoneyInput id={id} label={f.label} value={str(v[f.k])} onChange={(val) => put(i, f.k, val)} />
                    ) : f.input === "select" ? (
                      <select id={id} value={str(v[f.k])} onChange={(e) => put(i, f.k, e.target.value)}>
                        <option value="">—</option>
                        {(f.options ?? []).map((op) => (
                          <option key={op}>{op}</option>
                        ))}
                      </select>
                    ) : (
                      <input id={id} value={str(v[f.k])} onChange={(e) => put(i, f.k, e.target.value)} />
                    )}
                  </div>
                );
              })}
              {lim && amt > 0 && lim.max > 0 &&
                (amt > lim.max ? (
                  <div className={s.warn} data-limit="over">
                    <Ico n="alert" />
                    <span>
                      {money(amt)} es más del 30% de tu ingreso (máximo {money(lim.max)}).
                    </span>
                  </div>
                ) : (
                  <div className={s.okm} data-limit="ok">
                    <Ico n="check" />
                    Dentro de tu máximo ({money(lim.max)})
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** "budget.rent" → the master budget category's own label ("Renta"). */
function targetLabel(ctx: BuildCtx, target: string) {
  const m = masterBudget(ctx.steps);
  const cat = target.split(".")[1] ?? "";
  return m?.sec.categories.find(([k]) => k === cat)?.[1] ?? cat;
}

function Choice({ sec, ctx }: { sec: Sec<"choice">; ctx: BuildCtx }) {
  const co = ctx.step.build.sections.find((x): x is Sec<"compare_options"> => x.type === "compare_options");
  const opts = co?.options ?? [];
  const mk = co ? moneyField(co) : undefined;
  const co0 = co ? (obj(ctx.data[co.key]) as Opts) : {};
  const v = obj(ctx.data[sec.key]) as { sel?: number; why?: string };
  const amtOf = (i: number) => (mk ? num(co0[i]?.[mk]) : 0);
  const pick = (i: number) =>
    ctx.update((d) => {
      const next = { ...d, [sec.key]: { ...v, sel: i } } as ResumeData;
      return sec.writes_to && amtOf(i) > 0 ? writeBack(next, sec.writes_to, amtOf(i)) : next;
    });
  const sel = typeof v.sel === "number" ? v.sel : undefined;
  return (
    <>
      <div className={s.choice} role="radiogroup" aria-label={sec.title}>
        {opts.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={sel === i} className={sel === i ? s.on : ""} onClick={() => pick(i)} data-choice={i}>
            <i />
            <div>
              {o}
              {amtOf(i) > 0 && <span>{money(amtOf(i))} al mes</span>}
            </div>
          </button>
        ))}
      </div>
      <div className={s.fld}>
        <label htmlFor={`w-${sec.key}`}>¿Por qué?</label>
        <textarea id={`w-${sec.key}`} rows={3} value={str(v.why)} onChange={(e) => ctx.set(sec.key, { ...v, why: e.target.value })} />
      </div>
      {sel !== undefined && sec.writes_to && (
        <div className={s.wb} data-writes={sec.writes_to}>
          <Ico n="check" />
          {amtOf(sel) > 0 ? `Se actualizó en tu presupuesto: ${targetLabel(ctx, sec.writes_to).toLowerCase()} = ${money(amtOf(sel))}` : `Escribe el costo mensual de esta opción arriba para actualizar tu presupuesto (${targetLabel(ctx, sec.writes_to).toLowerCase()}).`}
        </div>
      )}
    </>
  );
}

// ---------- checklist_amounts ----------

/** Each item goes to the write-back target whose budget label it names ("Plan de celular" → "Celular"), else the first. */
function itemTarget(ctx: BuildCtx, targets: string[], item: string) {
  const low = item.toLowerCase();
  return targets.find((tg) => targets.length > 1 && low.includes(targetLabel(ctx, tg).toLowerCase())) ?? targets[0]!;
}

function ChecklistAmounts({ sec, ctx }: { sec: Sec<"checklist_amounts">; ctx: BuildCtx }) {
  const v = obj(ctx.data[sec.key]) as { on?: Record<string, boolean>; amt?: Record<string, string> };
  const on = v.on ?? {};
  const amt = v.amt ?? {};
  const targets = sec.writes_to ?? [];
  const write = (nv: typeof v) =>
    ctx.update((d) => {
      let next = { ...d, [sec.key]: nv } as ResumeData;
      if (targets.length) {
        const sums: Record<string, number> = Object.fromEntries(targets.map((tg) => [tg, 0]));
        sec.items.forEach((x, i) => {
          if (nv.on?.[i]) sums[itemTarget(ctx, targets, x)]! += num(nv.amt?.[i]);
        });
        for (const tg of targets) next = writeBack(next, tg, sums[tg]!);
      }
      return next;
    });
  const tot = sec.items.reduce((a, _, i) => a + (on[i] ? num(amt[i]) : 0), 0);
  return (
    <>
      <div className={s.mtbl}>
        {sec.items.map((x, i) => (
          <div className={`${s.mrw} ${s.mrwCk}`} key={i} data-item={i}>
            <button type="button" className={s.ckb} role="checkbox" aria-checked={!!on[i]} aria-label={x} onClick={() => write({ ...v, on: { ...on, [i]: !on[i] } })}>
              <span>{on[i] && <Ico n="check" />}</span>
            </button>
            <b style={on[i] ? undefined : { color: "var(--mut)" }}>{x}</b>
            <MoneyInput label={`Costo al mes: ${x}`} value={str(amt[i])} disabled={!on[i]} onChange={(val) => write({ ...v, amt: { ...amt, [i]: val } })} />
          </div>
        ))}
        <div className={`${s.mrw} ${s.mrwTot} ${s.mrw2}`}>
          <b>Total al mes</b>
          <b className={s.big} data-total={tot}>
            {money(tot)}
          </b>
        </div>
      </div>
      {targets.length > 0 && (
        <div className={s.wb}>
          <Ico n="check" />
          Se guarda en tu presupuesto: {targets.map((tg) => targetLabel(ctx, tg).toLowerCase()).join(" y ")}
        </div>
      )}
    </>
  );
}

// ---------- savings_plan ----------

function SavingsPlan({ sec, ctx }: { sec: Sec<"savings_plan">; ctx: BuildCtx }) {
  const v = obj(ctx.data[sec.key]) as Record<string, string>;
  const calc = ctx.step.build.sections.find((x) => x.type === "calc") ?? ctx.steps.flatMap((x) => x.build.sections).find((x) => x.type === "calc" && x.editable);
  const goal = calc ? calcValue(ctx.data, ctx.steps, calc.key) : 0;
  const pq = num(v.per_quincena);
  const saved = num(v.saved);
  const months = monthsTo(goal, saved, pq);
  const put = (k: string, val: string) =>
    ctx.update((d) => {
      const nv = { ...v, [k]: val };
      const next = { ...d, [sec.key]: nv } as ResumeData;
      return sec.writes_to && k === "per_quincena" ? writeBack(next, sec.writes_to, num(val) * 2) : next;
    });
  return (
    <>
      <div className={s.grid2}>
        {sec.fields.map((f) => (
          <div className={s.fld} key={f.k}>
            <label htmlFor={`sp-${f.k}`}>{f.label}</label>
            <MoneyInput id={`sp-${f.k}`} label={f.label} value={str(v[f.k])} onChange={(val) => put(f.k, val)} />
          </div>
        ))}
      </div>
      <div className={s.bigres} style={{ marginTop: 14 }} data-months={months ?? ""}>
        <div>
          <small>LLEGAS A TU META EN</small>
          <b>{pq && goal ? `${months} ${months === 1 ? "mes" : "meses"}` : "—"}</b>
        </div>
        <p>
          {goal ? `Meta: ${money(goal)}. ` : "Primero calcula tu meta. "}
          {pq ? `Apartas ${money(pq * 2)} al mes; ya tienes ${money(saved)}.` : "Escribe cuánto puedes apartar cada quincena."}
        </p>
      </div>
      {goal > 0 && (
        <div className={s.goal} style={{ marginTop: 14 }} role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(saved, goal)} aria-label="Avance hacia tu meta">
          <i style={{ width: `${Math.min(100, (saved / goal) * 100)}%` }} />
        </div>
      )}
      {sec.writes_to && pq > 0 && (
        <div className={s.wb}>
          <Ico n="check" />
          Se actualizó en tu presupuesto: {targetLabel(ctx, sec.writes_to).toLowerCase()} = {money(pq * 2)} al mes
        </div>
      )}
    </>
  );
}

// ---------- spend_log ----------

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
type LogRow = { t?: string; a?: string; r?: boolean };
export function spendTotals(v: Record<string, unknown>, days: number) {
  const day = (k: number) => ((v[k] as LogRow[] | undefined) ?? []).reduce((a, r) => a + num(r?.a), 0);
  const red = Array.from({ length: days }, (_, k) => ((v[k] as LogRow[] | undefined) ?? []).reduce((a, r) => a + (r?.r ? num(r.a) : 0), 0)).reduce((a, x) => a + x, 0);
  const week = Array.from({ length: days }, (_, k) => day(k)).reduce((a, x) => a + x, 0);
  return { day, red, week };
}

function SpendLog({ sec, ctx }: { sec: Sec<"spend_log">; ctx: BuildCtx }) {
  const [d, setD] = useState(0);
  const v = obj(ctx.data[sec.key]);
  const rows: LogRow[] = [0, 1, 2].map((r) => ((v[d] as LogRow[] | undefined) ?? [])[r] ?? {});
  const tt = spendTotals(v, sec.days);
  const put = (r: number, patch: LogRow) => ctx.set(sec.key, { ...v, [d]: rows.map((x, i) => (i === r ? { ...x, ...patch } : x)) });
  return (
    <>
      <div className={s.days} role="tablist" aria-label="Días">
        {Array.from({ length: sec.days }, (_, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === d} className={k === d ? s.on : ""} onClick={() => setD(k)}>
            {DAYS[k] ?? `Día ${k + 1}`}
            <b>{tt.day(k) ? money(tt.day(k)) : "·"}</b>
          </button>
        ))}
      </div>
      <div className={s.slog}>
        {rows.map((r, i) => (
          <div className={s.srow} key={`${d}-${i}`}>
            <div className={s.fld}>
              <input aria-label={`Gasto ${i + 1}`} value={str(r.t)} placeholder={i === 0 ? "Ej. Café" : ""} onChange={(e) => put(i, { t: e.target.value })} />
            </div>
            <MoneyInput label={`Cantidad ${i + 1}`} value={str(r.a)} onChange={(val) => put(i, { a: val })} />
            {sec.mark_reducible !== false && (
              <button type="button" className={`${s.rd} ${r.r ? s.on : ""}`} aria-pressed={!!r.r} onClick={() => put(i, { r: !r.r })}>
                {r.r ? "✓ " : ""}Lo podría reducir
              </button>
            )}
          </div>
        ))}
      </div>
      <div className={s.mini2} data-spend>
        <div>
          <small>ESTA SEMANA</small>
          <b>{money(tt.week)}</b>
        </div>
        <div className={s.hl}>
          <small>REDUCIBLE AL MES</small>
          <b>{money(tt.red * 4.33)}</b>
        </div>
        <div className={s.hl}>
          <small>REDUCIBLE AL AÑO</small>
          <b>{money(tt.red * 52)}</b>
        </div>
      </div>
    </>
  );
}

// ---------- plan: 30/60/90 ----------

function Plan({ sec, ctx }: { sec: Sec<"plan">; ctx: BuildCtx }) {
  const [tab, setTab] = useState(0);
  const [draft, setDraft] = useState("");
  const v = obj(ctx.data[sec.key]);
  const tb = sec.tabs[tab] ?? sec.tabs[0]!;
  const items = strs(v[tab]);
  const write = (list: string[]) => ctx.set(sec.key, { ...v, [tab]: list });
  const add = (x: string) => {
    const t = x.trim();
    if (!t || items.includes(t) || items.length >= sec.per_tab) return;
    write([...items, t]);
  };
  return (
    <>
      <p className={s.sub}>Hasta {sec.per_tab} acciones por etapa. Toca una sugerencia o escribe la tuya.</p>
      <div className={s.tabs} role="tablist">
        {sec.tabs.map((x, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === tab} className={i === tab ? s.on : ""} onClick={() => setTab(i)}>
            {x.label} · {strs(v[i]).length}
          </button>
        ))}
      </div>
      <div className={s.planSug}>
        {tb.suggest.map((x) => {
          const on = items.includes(x);
          return (
            <button key={x} type="button" aria-pressed={on} className={on ? s.on : ""} disabled={!on && items.length >= sec.per_tab} onClick={() => (on ? write(items.filter((y) => y !== x)) : add(x))}>
              <Ico n={on ? "check" : "plus"} />
              {x}
            </button>
          );
        })}
      </div>
      <div className={s.planItems}>
        {items.map((x, i) => (
          <div key={x}>
            <span>{x}</span>
            <button type="button" aria-label={`Quitar: ${x}`} onClick={() => write(items.filter((_, j) => j !== i))}>
              <Ico n="x" />
            </button>
          </div>
        ))}
      </div>
      {items.length < sec.per_tab && (
        <div className={s.fld} style={{ marginTop: 10 }}>
          <input
            aria-label={`Tu propia acción: ${tb.label}`}
            value={draft}
            placeholder="Escribe tu propia acción y presiona Enter"
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
                setDraft("");
              }
            }}
            onBlur={() => {
              add(draft);
              setDraft("");
            }}
          />
        </div>
      )}
    </>
  );
}

