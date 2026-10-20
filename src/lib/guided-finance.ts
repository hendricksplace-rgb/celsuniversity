// Money helpers of the guided template (first used by "Finanzas Personales en Estados Unidos"): the master budget
// (a `budget` section with is_master), the formulas of `calc` sections, and the write-backs (`writes_to`) of later
// steps. All values live in the product (financial_plans.data), keyed by section key.
import { obj, str, type GuidedStep, type ResumeData, type Section } from "@/lib/guided";

export type BudgetSec = Extract<Section, { type: "budget" }>;

/** Category colors, in budget order (the data has none); a key keeps its color everywhere. */
const PALETTE = ["#5B4FA0", "#7FA7E8", "#F2A541", "#E07A5F", "#9AA6C9", "#E06C9F", "#B9A6E8", "#C9705A", "#F4C95D", "#2FC38A", "#A8A29E", "#6CB4C9", "#B5654F"];
export const catColor = (i: number) => PALETTE[i % PALETTE.length]!;

export const num = (v: unknown) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
export const money = (n: number, cur: "USD" | "MXN" = "USD") => `${n < 0 ? "−" : ""}${cur === "MXN" ? "MX" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;

/** The master budget section (step 2) and its step number. */
export function masterBudget(steps: GuidedStep[]) {
  for (const st of steps) for (const x of st.build.sections) if (x.type === "budget" && x.is_master) return { step: st.step, sec: x };
  return null;
}

export type BudgetVal = { annual?: string; net?: string; netManual?: boolean; cats?: Record<string, string> };
export const budgetOf = (d: ResumeData, key: string): BudgetVal => obj(d[key]) as BudgetVal;

/** Net per month: typed, else annual ÷ divide × (1 − tax). */
export function netOf(b: BudgetVal, sec?: BudgetSec) {
  if (b.netManual && b.net) return num(b.net);
  const a = num(b.annual);
  const rule = sec?.income?.annual_to_net;
  if (a > 0 && rule) return Math.round((a / (rule.divide || 12)) * (1 - (rule.tax_pct ?? 20) / 100));
  return num(b.net);
}

export function budgetTotals(d: ResumeData, steps: GuidedStep[]) {
  const m = masterBudget(steps);
  if (!m) return null;
  const b = budgetOf(d, m.sec.key);
  const net = netOf(b, m.sec);
  const cats = m.sec.categories.map(([k, label, refined], i) => ({ k, label, refined: refined ?? null, color: catColor(i), v: num(b.cats?.[k]) }));
  const spent = cats.reduce((n, c) => n + c.v, 0);
  return { key: m.sec.key, step: m.step, sec: m.sec, net, cats, spent, balance: net - spent };
}

/** The donut: one conic-gradient slice per category over max(income, spending); the rest is the balance. */
export function donut(cats: { v: number; color: string }[], net: number) {
  const total = Math.max(cats.reduce((n, c) => n + c.v, 0), net, 1);
  let at = 0;
  const parts = cats
    .filter((c) => c.v > 0)
    .map((c) => {
      const p = (c.v / total) * 100;
      const seg = `${c.color} ${at.toFixed(2)}% ${(at + p).toFixed(2)}%`;
      at += p;
      return seg;
    });
  return `conic-gradient(${[...parts, `#E7E1D3 ${at.toFixed(2)}% 100%`].join(",")})`;
}

/** Variables a `calc` formula can use: net_income and every master-budget category. */
export function budgetVars(d: ResumeData, steps: GuidedStep[]) {
  const t = budgetTotals(d, steps);
  const vars: Record<string, number> = { net_income: t?.net ?? 0 };
  for (const c of t?.cats ?? []) vars[c.k] = c.v;
  return vars;
}
/** "(rent + food) * 3" with the student's numbers. Only names, numbers and + − × ÷ ( ) are allowed. */
export function evalFormula(formula: string, vars: Record<string, number>) {
  const expr = formula.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (n) => String(vars[n] ?? 0));
  if (!/^[\d\s.+\-*/()]+$/.test(expr)) return 0;
  try {
    const v = Function(`"use strict";return (${expr});`)() as unknown;
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

/** "budget.rent" → ["budget", "rent"]: write a number into the master budget's categories. */
export function writeBack(d: ResumeData, target: string, value: number): ResumeData {
  const [key, cat] = target.split(".");
  if (!key || !cat) return d;
  const b = budgetOf(d, key);
  return { ...d, [key]: { ...b, cats: { ...(b.cats ?? {}), [cat]: String(Math.round(value)) } } };
}

/** Step 7's goal: its `calc` (editable) override, else the formula. */
export function calcValue(d: ResumeData, steps: GuidedStep[], key: string) {
  for (const st of steps)
    for (const x of st.build.sections)
      if (x.key === key && x.type === "calc") {
        const ov = str(obj(d[key]).value);
        return ov.trim() ? num(ov) : evalFormula(x.formula, budgetVars(d, steps));
      }
  return 0;
}
export const monthsTo = (goal: number, saved: number, perQuincena: number) => (perQuincena > 0 ? Math.ceil(Math.max(0, goal - saved) / (perQuincena * 2)) : null);

/** The emergency fund: the goal (a `calc` that feeds a `savings_plan`), what is saved and the pace. */
export function emergencyOf(d: ResumeData, steps: GuidedStep[]) {
  for (const st of steps) {
    const sp = st.build.sections.find((x) => x.type === "savings_plan");
    if (!sp) continue;
    const calc = st.build.sections.find((x) => x.type === "calc");
    const goal = calc ? Math.round(calcValue(d, steps, calc.key)) : 0;
    const v = obj(d[sp.key]);
    const saved = num(v.saved);
    const perQ = num(v.per_quincena);
    return { step: st.step, goal, saved, perQ, months: monthsTo(goal, saved, perQ) };
  }
  return null;
}
