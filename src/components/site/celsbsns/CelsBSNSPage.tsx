"use client";
// CelsBSNS public page, v3 design (celsu-programa-v3-mockup.html, 2026-11-02): shaped blocks (diagonal and curved
// edges), pricing as the 2nd section, the live hero with a looping conversation, the original 10-week path.
// - Prices and access come from public.products (the page), never from this file.
// - ?nivel=<A1..C2> (the evaluation results email links to /celsbsns?nivel=B1#planes; older emails sent ?level=)
//   shows the result and highlights the plan for that level (recommendedPlan: B2+ → Premium, below → bundle).
//   ?plan=<code> (the "ver los planes" link of /inscribirme) highlights the card the person chose.
// - Plan buttons go straight to the checkout (/comprar/resumen); while purchases are closed it sends people on
//   (src/lib/purchase-closed.ts).
// - The video button only shows once VSL_YOUTUBE_ID is set.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { checkoutHref, enrollHref, evalHref, recommendedPlan } from "@/lib/enroll";
import { mxn, price, saving, separately, type SitePrices } from "@/components/site/prices";
import "./celsbsns.css";
import "./celsbsns-v3.css";

/** Unlisted YouTube id of the CelsBSNS video; null hides the play button. */
const VSL_YOUTUBE_ID: string | null = null;

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Level = (typeof LEVELS)[number];
const LEVEL_NAME: Record<Level, string> = { A1: "Principiante", A2: "Básico", B1: "Intermedio", B2: "Intermedio alto", C1: "Avanzado", C2: "Dominio" };

type PlanKey = "celsbsns_standard" | "celsbsns_premium" | "bundle_tv_bsns";
const PLAN_KEYS: PlanKey[] = ["celsbsns_standard", "celsbsns_premium", "bundle_tv_bsns"];

const WEEKS = [
  { short: "Comunicación", en: "Professional Communication & Capstone Launch", es: "Comunicación profesional", desc: "Correos, llamadas y mensajes con el tono correcto. Además arrancas tu proyecto final, que irás construyendo todo el programa.", say: "Please find the report attached." },
  { short: "Etiqueta", en: "Business Etiquette & Workplace Culture", es: "Etiqueta y cultura laboral", desc: "Diferencias culturales, respeto en el trabajo y cómo manejar conversaciones difíciles con profesionalismo.", say: "I see your point, but let me explain." },
  { short: "Liderazgo", en: "Management and Leadership", es: "Gestión y liderazgo", desc: "Dar instrucciones, delegar y ofrecer retroalimentación a tu equipo en inglés.", say: "Let's delegate this to the design team." },
  { short: "RR. HH.", en: "Human Resources & Hiring", es: "Recursos humanos y contratación", desc: "Vacantes, perfiles de puesto, entrevistas y evaluación de candidatos.", say: "Tell me about a time you solved a problem." },
  { short: "Estructura", en: "Organizational Structures & Roles", es: "Estructuras y roles", desc: "Explicar quién hace qué en una empresa: áreas, jerarquías y responsabilidades.", say: "She reports directly to the CFO." },
  { short: "Ética", en: "Business Ethics & Conduct", es: "Ética y conducta", desc: "Políticas, dilemas y decisiones responsables, y cómo hablar de ellos con claridad.", say: "That would be a conflict of interest." },
  { short: "Finanzas", en: "Finance for Non-Finance Professionals", es: "Finanzas para no financieros", desc: "Leer y comentar reportes, KPIs, presupuestos y ROI sin ser contador.", say: "Our margins improved this quarter." },
  { short: "Marketing", en: "Marketing & Brand Communication", es: "Marketing y marca", desc: "Presentar productos, hablar de clientes y comunicar el valor de una marca.", say: "Our brand speaks to young professionals." },
  { short: "Proyectos", en: "Project Management & Productivity", es: "Gestión de proyectos", desc: "Planes, plazos, juntas de seguimiento y reportes de avance.", say: "We're on track to meet the deadline." },
  { short: "Entrevistas", en: "Interview Prep & Career Goals", es: "Entrevistas y metas profesionales", desc: "Respuestas difíciles, negociación de salario y tu marca personal. Cierras el programa con tu proyecto final.", say: "I'm looking for a role where I can grow." },
];

const TASKS = [
  { label: "Videos", bg: "#13284D", fg: "#fff" },
  { label: "Reading", bg: "#2F6FDB", fg: "#fff" },
  { label: "Writing", bg: "#C2306E", fg: "#fff" },
  { label: "Research", bg: "#35C3F0", fg: "#0E1730" },
  { label: "Video", bg: "#FFC531", fg: "#0E1730" },
  { label: "Speaking", bg: "#7CC855", fg: "#0E1730" },
  { label: "Feedback", bg: "#E3E8F1", fg: "#0E1730" },
];

const BARS = [
  { label: "Lecciones en video", time: "6 videos", w: 100, c: "#6FA3F5" },
  { label: "Reading", time: "1 h", w: 50, c: "#2F6FDB" },
  { label: "Writing", time: "1–2 h", w: 75, c: "#D6407E" },
  { label: "Research", time: "1–1.5 h", w: 62, c: "#35C3F0" },
  { label: "Video submission", time: "1 h", w: 50, c: "#FFC531" },
  { label: "Speaking practice", time: "2 h", w: 100, c: "#7CC855" },
  { label: "Feedback y progreso", time: "personalizada", w: 35, c: "#C9D3E3" },
];

const CHAT: ["a" | "b", string][] = [
  ["a", "Let's schedule a meeting for Monday."],
  ["b", "Sounds good. I'll send the agenda."],
  ["a", "Can you walk us through the Q3 numbers?"],
  ["b", "Sure. Revenue is up 12% this quarter."],
  ["a", "Great presentation. Let's move forward."],
  ["b", "Thank you! I'll follow up by email today."],
];

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/** The hero conversation: up to 4 bubbles, a "typing" dot before each, the 6 lines in a loop. */
function Chat() {
  const [shown, setShown] = useState<{ k: number; typing: boolean }[]>([]);
  useEffect(() => {
    if (reducedMotion()) {
      setShown([0, 1, 2, 3].map((k) => ({ k, typing: false })));
      return;
    }
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const add = () => {
      const k = i;
      setShown((s) => [...(k % CHAT.length === 0 && k > 0 ? [] : s), { k, typing: true }].slice(-4));
      t = setTimeout(() => {
        setShown((s) => s.map((m) => (m.k === k ? { ...m, typing: false } : m)));
        i++;
        t = setTimeout(add, i % CHAT.length === 0 ? 3200 : 1500);
      }, 900);
    };
    add();
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="bv3-chat" aria-hidden="true">
      {shown.map(({ k, typing }) => {
        const [who, text] = CHAT[k % CHAT.length];
        return typing ? (
          <div key={k} className={`bv3-msg ${who} typing`}>
            <i />
            <i />
            <i />
          </div>
        ) : (
          <div key={k} className={`bv3-msg ${who}`}>
            {text}
          </div>
        );
      })}
    </div>
  );
}

type Props = { weeks?: string[]; prices: SitePrices; access: Partial<Record<PlanKey, string>> };

export default function CelsBSNSPage({ weeks = [], prices: P, access }: Props) {
  const [menu, setMenu] = useState(false);
  const [week, setWeek] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [faq, setFaq] = useState(0);
  const [video, setVideo] = useState(false);
  const [level, setLevel] = useState<Level | null>(null);
  const [chosen, setChosen] = useState<PlanKey | null>(null);
  const [barsOn, setBarsOn] = useState(false);
  const routeRef = useRef<HTMLElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const visible = useRef(true);
  const resume = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ?nivel= / ?level= (results email) and ?plan= (/inscribirme).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const lv = (q.get("nivel") ?? q.get("level") ?? "").toUpperCase();
    if ((LEVELS as readonly string[]).includes(lv)) setLevel(lv as Level);
    const plan = q.get("plan");
    if (PLAN_KEYS.includes(plan as PlanKey)) setChosen(plan as PlanKey);
  }, []);

  // The 10-week path advances on its own while it's on screen (not with reduced motion).
  useEffect(() => {
    if (reducedMotion()) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      if (visible.current) setWeek((w) => (w + 1) % 10);
    }, 3600);
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => {
    const els = [routeRef.current, barsRef.current].filter(Boolean) as Element[];
    if (!("IntersectionObserver" in window)) {
      setBarsOn(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.target === routeRef.current) visible.current = e.isIntersecting;
          if (e.target === barsRef.current && e.isIntersecting) setBarsOn(true);
        }),
      { threshold: 0.3 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  useEffect(() => () => clearTimeout(resume.current), []);
  useEffect(() => {
    if (!video) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setVideo(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [video]);

  const pick = (i: number) => {
    setWeek(i);
    setPlaying(false);
    clearTimeout(resume.current);
    if (!reducedMotion()) resume.current = setTimeout(() => setPlaying(true), 10000);
  };

  const W = WEEKS.map((w, i) => (weeks[i] ? { ...w, en: weeks[i] } : w));
  const cur = W[week];

  // Which card stands out: the plan chosen on /inscribirme, else the plan for the evaluation level, else Premium.
  const g = level ? LEVELS.indexOf(level) : -1;
  const forLevel = level ? (recommendedPlan("celsbsns", g) as PlanKey) : null;
  const hot: PlanKey = chosen ?? forLevel ?? "celsbsns_premium";
  const ribbon = chosen ? "Elegiste" : forLevel ? (forLevel === "bundle_tv_bsns" ? "Recomendado para tu nivel" : "Recomendado para ti") : "Más elegido";
  const hotColor = hot === "bundle_tv_bsns" ? "#FFC531" : "#F20174";
  const result = level
    ? g >= 3
      ? "¡Estás listo para CelsBSNS! Premium te da revisión de CV y entrevista 1 a 1."
      : "Para CelsBSNS necesitas B2. Te recomendamos el paquete: llegas a B2 con CelsTV y sigues con CelsBSNS."
    : "";

  const accessOf = (k: PlanKey) => access[k] ?? "";
  const bundleWas = separately(P, ["celstv_standard", "celsbsns_standard"]);
  const bundleSaves = saving(P, "bundle_tv_bsns", ["celstv_standard", "celsbsns_standard"]);

  const card = (k: PlanKey) => {
    const on = hot === k;
    return {
      className: `bv3-pc${on ? " hot" : hot && (level || chosen) ? " dim" : ""}`,
      style: on ? ({ ["--hc" as string]: hotColor } as React.CSSProperties) : undefined,
      ribbon: on ? <div className={`bv3-ribbon${hot === "bundle_tv_bsns" ? " dark" : ""}`}>{ribbon}</div> : null,
    };
  };
  const amount = (k: PlanKey) => {
    const p = price(P, k);
    return p ? (
      <div className="bv3-amt">
        <sup>$</sup>
        {p.slice(1)}
        <small>USD</small>
      </div>
    ) : null;
  };

  const FAQ = [
    { q: "¿Qué nivel de inglés necesito?", a: "CelsBSNS es para nivel B2 en adelante. Si no estás seguro, haz la evaluación gratis; si aún no llegas a B2, el paquete CelsTV + CelsBSNS es tu mejor camino." },
    { q: "¿Cuánto tiempo a la semana necesito?", a: "Además de las lecciones en video, las tareas semanales suman aproximadamente de 6 a 7.5 horas: lectura, escritura, investigación, un video tuyo y práctica de conversación." },
    { q: "¿Qué es el proyecto final?", a: "Un proyecto profesional que inicias en la primera semana y desarrollas durante el programa, para que termines con algo concreto que puedas mostrar." },
    { q: "¿Recibo certificado?", a: "Sí. Al terminar recibes el certificado de CelsUniversity." },
    { q: "¿Qué incluye Premium?", a: "Todo lo de Standard, más la revisión de tu currículum estilo EE.UU. por un instructor, una entrevista de práctica individual con retroalimentación, el análisis de tu perfil profesional y acceso prioritario a recursos adicionales." },
    ...(accessOf("celsbsns_standard") ? [{ q: "¿Cuánto tiempo tengo acceso?", a: `${accessOf("celsbsns_standard")} desde tu compra. Puedes seguir el programa en 10 semanas o a tu propio ritmo.` }] : []),
  ];

  const navLinks = [
    { href: "/#programas", label: "Programas" },
    { href: "#ruta", label: "Las 10 semanas" },
    { href: "#planes", label: "Precios" },
    { href: "#quien", label: "Para quién es" },
    { href: "#faq", label: "Preguntas" },
  ];

  return (
    <div className="bv3">
      <header className="bv3-header">
        <nav aria-label="Principal" className="bv3-wrap bv3-nav">
          <Link href="/" className="bv3-logo">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src="/site/celsu-logo.png" alt="" width={44} height={36} />
            <span>
              <b>CelsUniversity</b>
              <small>
                BY {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
                <img src="/site/lam-logo.png" alt="LAM" height={13} />
              </small>
            </span>
          </Link>
          <div className="cu-desk bv3-links">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href}>
                {l.label}
              </a>
            ))}
            <a href="/entrar" className="strong">
              Iniciar sesión
            </a>
          </div>
          <a href={enrollHref("celsbsns")} className="cu-btn cu-btn-pink cu-btn-sm">
            Inscríbete
          </a>
          <button type="button" className="cu-mob bv3-burger" onClick={() => setMenu((m) => !m)} aria-label="Abrir menú" aria-expanded={menu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </nav>
        {menu && (
          <div className="bv3-menu">
            {[...navLinks, { href: "/entrar", label: "Iniciar sesión" }].map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMenu(false)}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main>
        {/* 1 · HERO */}
        <section className="bv3-blk bv3-dark bv3-dots bv3-hero" id="inicio">
          <div className="bv3-glow" style={{ width: 520, height: 520, background: "#2F6FDB", right: -120, top: -80 }} />
          <div className="bv3-glow" style={{ width: 360, height: 360, background: "#F20174", right: 180, bottom: -160, opacity: 0.22 }} />
          <div className="bv3-wrap bv3-hero-grid">
            <div>
              <Link className="bv3-back" href="/#programas">
                ← Todos los programas
              </Link>
              <div className="bv3-kick">CelsBSNS · Inglés de negocios</div>
              <h1>English for Business.</h1>
              <p className="bv3-sub">10 semanas para hablar con seguridad en juntas, entrevistas y presentaciones. Contenido real de empresas, tareas semanales y un proyecto final que puedes mostrar.</p>
              <div className="bv3-ctas">
                <a className="cu-btn cu-btn-light" href="#planes">
                  Ver planes y precios <Arrow />
                </a>
                <a className="cu-btn cu-btn-pink" href={evalHref("celsbsns")}>
                  Confirma tu nivel B2
                </a>
              </div>
              <div className="bv3-chips">
                <span>10 semanas</span>
                <span>Nivel B2 a B2+</span>
                <span>Proyecto final</span>
                <span>Certificado CelsUniversity</span>
              </div>
            </div>
            <div className="bv3-hcard">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
              <img className="bv3-hlogo" src="/site/celsbsns-logo.png" alt="CelsBSNS" />
              <Chat />
              {VSL_YOUTUBE_ID && (
                <button type="button" className="bv3-fplay" onClick={() => setVideo(true)} aria-label="Ver el video de CelsBSNS">
                  <span className="ring" />
                  <span className="ring r2" />
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 4.5l13 7.5-13 7.5z" />
                  </svg>
                  <em>Ver video</em>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 2 · PRECIOS (the results email lands here) */}
        <section className="bv3-blk bv3-pricing bv3-cut" id="planes">
          <span id="precios" aria-hidden="true" className="bv3-anchor" />
          <div className="bv3-aur a1" />
          <div className="bv3-aur a2" />
          <div className="bv3-aur a3" />
          <div className="bv3-wrap">
            {level && (
              <div className="bv3-res" role="status">
                <div className="bv3-lvb">{level}</div>
                <div>
                  <b>
                    Tu resultado: {level} · {LEVEL_NAME[level]}
                  </b>
                  <small>{result}</small>
                </div>
              </div>
            )}
            <div className="bv3-ph">
              <div className="bv3-kick center">Planes y precios</div>
              <h2>
                Empieza hoy. <span>Pago único.</span>
              </h2>
              <p>Sin suscripciones ni cargos sorpresa. Cobramos en dólares; el monto en pesos es referencia.</p>
            </div>
            <div className="bv3-cards">
              <article {...card("celsbsns_standard")}>
                {card("celsbsns_standard").ribbon}
                <div className="pn">CelsBSNS</div>
                <h3>Standard</h3>
                {amount("celsbsns_standard")}
                <div className="bv3-mx">{mxn(P, "celsbsns_standard") || " "}</div>
                <ul>
                  <li>Las 10 semanas en video</li>
                  <li>Tareas semanales y materiales descargables</li>
                  <li>PDF semanal de vocabulario</li>
                  <li>Quizzes con retroalimentación automática</li>
                  <li>Certificado CelsUniversity</li>
                  {accessOf("celsbsns_standard") && <li>{accessOf("celsbsns_standard")} de acceso</li>}
                </ul>
                <a className="cu-btn bv3-btn-white" href={checkoutHref("celsbsns_standard")}>
                  Elegir Standard
                </a>
              </article>
              <article {...card("celsbsns_premium")}>
                {card("celsbsns_premium").ribbon}
                <div className="pn">CelsBSNS</div>
                <h3>Premium</h3>
                {amount("celsbsns_premium")}
                <div className="bv3-mx">{mxn(P, "celsbsns_premium") || " "}</div>
                <ul>
                  <li>
                    <b>Todo lo de Standard</b>
                  </li>
                  <li>Revisión de tu currículum estilo EE.UU. por un instructor</li>
                  <li>Entrevista de práctica individual con retroalimentación</li>
                  <li>Análisis y estrategia de tu perfil profesional</li>
                  <li>Acceso prioritario a recursos adicionales</li>
                </ul>
                <a className="cu-btn cu-btn-pink" href={checkoutHref("celsbsns_premium")}>
                  Elegir Premium
                </a>
              </article>
              <article {...card("bundle_tv_bsns")}>
                {card("bundle_tv_bsns").ribbon}
                <div className="pn">CelsTV + CelsBSNS</div>
                <h3>Paquete</h3>
                {amount("bundle_tv_bsns")}
                <div className="bv3-mx">
                  {bundleWas && bundleSaves ? (
                    <>
                      <s>{bundleWas}</s> · <b>Ahorras {bundleSaves}</b>
                    </>
                  ) : (
                    " "
                  )}
                </div>
                <ul>
                  <li>Acceso completo a CelsTV y CelsBSNS</li>
                  <li>Inglés para la vida y los negocios</li>
                  <li>Guías de práctica</li>
                  <li>Doble certificado</li>
                  <li>Ideal desde nivel B1</li>
                </ul>
                <a className="cu-btn bv3-btn-yellow" href={checkoutHref("bundle_tv_bsns")}>
                  Elegir Paquete
                </a>
              </article>
            </div>
            <div className="bv3-assure">
              <div className="bv3-seal">
                <b>72 h</b>
                <small>reembolso</small>
              </div>
              <p>
                <b>Reembolso por cualquier motivo en las primeras 72 horas.</b> Acceso inmediato después de pagar. Pago seguro con Stripe: tarjeta de débito o crédito.{" "}
                <a href="/terminos">Ver términos</a>
              </p>
              <div className="bv3-cardsys" aria-label="Tarjetas aceptadas">
                <span>VISA</span>
                <span>Mastercard</span>
                <span>AMEX</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 · RUTA */}
        <section className="bv3-blk bv3-light bv3-lines bv3-cut" id="ruta" ref={routeRef}>
          <span id="programa" aria-hidden="true" className="bv3-anchor" />
          <div className="bv3-wrap">
            <div className="bv3-head">
              <div>
                <div className="bv3-kick">Tu ruta de 10 semanas</div>
                <h2>Una semana, un tema de negocios real.</h2>
              </div>
              <p className="bv3-sub">Desde tu primer correo profesional hasta tu entrevista de trabajo. Tu proyecto final avanza contigo desde la primera semana.</p>
            </div>
            <div className="bv3-path" role="tablist" aria-label="Las 10 semanas">
              <div className="bv3-rail">
                <i style={{ width: `${(week / 9) * 100}%` }} />
              </div>
              {W.map((w, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === week} aria-label={`Semana ${i + 1}: ${w.es}`} className={`bv3-wk${i === week ? " on" : i < week ? " done" : ""}`} onClick={() => pick(i)}>
                  <b>{i + 1}</b>
                  <small>{w.short}</small>
                </button>
              ))}
            </div>
            <div className="bv3-capline">
              <span>Proyecto final: avanza las 10 semanas</span>
            </div>
            <div className="bv3-wcard" role="tabpanel" aria-live="polite">
              <div className="num">
                <small>SEMANA</small>
                <b>{week + 1}</b>
                <small className="of">de 10</small>
              </div>
              <div className="body">
                <div className="en">
                  Week {week + 1} · {cur.en}
                </div>
                <h3>{cur.es}</h3>
                <p>{cur.desc}</p>
                <div className="bv3-quote" lang="en">
                  &ldquo;{cur.say}&rdquo;
                </div>
                <div className="bv3-tags">
                  Esta semana:
                  {TASKS.map((t) => (
                    <span key={t.label} style={{ background: t.bg, color: t.fg }}>
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ctrl">
                <button type="button" onClick={() => setPlaying((p) => !p)}>
                  {playing ? "Pausar" : "Reproducir"}
                </button>
                Toca una semana
              </div>
            </div>
          </div>
        </section>

        {/* 4 · CÓMO ES UNA SEMANA */}
        <section className="bv3-blk bv3-dark bv3-dots">
          <div className="bv3-curve" aria-hidden="true">
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none">
              <path d="M0 0h1440v20C1080 70 360 70 0 20z" fill="#E8F0F9" />
            </svg>
          </div>
          <div className="bv3-glow" style={{ width: 460, height: 460, background: "#35C3F0", right: "4%", top: "20%", opacity: 0.28 }} />
          <div className="bv3-glow" style={{ width: 300, height: 300, background: "#FFC531", right: "28%", bottom: -120, opacity: 0.18 }} />
          <div className="bv3-wrap bv3-two">
            <div>
              <div className="bv3-kick">Cómo es una semana</div>
              <h2>Aprendes, practicas y lo demuestras.</h2>
              <p className="bv3-sub">Cada semana combina lecciones en video con cinco tareas prácticas y retroalimentación personalizada. Unas 6 a 7.5 horas de práctica a la semana, a tu ritmo.</p>
              <div className="bv3-mini">
                <div>
                  <b>6</b>
                  <small>videos por semana</small>
                </div>
                <div>
                  <b>5</b>
                  <small>tareas prácticas</small>
                </div>
                <div>
                  <b>6–7.5 h</b>
                  <small>a tu ritmo</small>
                </div>
              </div>
            </div>
            <div className="bv3-bars" ref={barsRef}>
              {BARS.map((b, k) => (
                <div className="bar" key={b.label}>
                  <div className="row">
                    {b.label}
                    <span>{b.time}</span>
                  </div>
                  <div className="track">
                    <i style={{ width: barsOn ? `${b.w}%` : 0, background: b.c, transitionDelay: `${k * 110}ms` }} />
                  </div>
                </div>
              ))}
              <div className="note">Tiempos aproximados por semana, según tu ritmo.</div>
            </div>
          </div>
        </section>

        {/* 5 · PARA QUIÉN ES */}
        <section className="bv3-blk bv3-light bv3-lines bv3-cut-r" id="quien">
          <div className="bv3-wrap">
            <div className="bv3-head">
              <div>
                <div className="bv3-kick">Para quién es</div>
                <h2>Para quien ya habla inglés y quiere usarlo para crecer.</h2>
              </div>
            </div>
            <div className="bv3-who">
              <article style={{ ["--c" as string]: "#2F6FDB" } as React.CSSProperties}>
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M15 7h6v6" />
                  </svg>
                </div>
                <h3>Profesionales en crecimiento</h3>
                <p>Buscas un ascenso o un puesto internacional y necesitas desenvolverte en inglés con soltura.</p>
              </article>
              <article style={{ ["--c" as string]: "#1FA9D6" } as React.CSSProperties}>
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 9l9-5 9 5-9 5z" />
                    <path d="M7 11v5c3 2 7 2 10 0v-5" />
                  </svg>
                </div>
                <h3>Recién egresados</h3>
                <p>Quieres destacar en el mercado laboral y llegar a tus entrevistas con un inglés profesional.</p>
              </article>
              <article style={{ ["--c" as string]: "#5FAE3E" } as React.CSSProperties}>
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 20V10l8-6 8 6v10" />
                    <path d="M10 20v-6h4v6" />
                  </svg>
                </div>
                <h3>Emprendedores</h3>
                <p>Quieres presentar tu negocio a clientes o inversionistas internacionales con confianza.</p>
              </article>
            </div>
            <div className="bv3-strip">
              <div className="bv3-glow" style={{ width: 260, height: 260, background: "#F20174", right: -60, top: -120, opacity: 0.35 }} />
              <p>
                <b>CelsBSNS requiere nivel B2.</b> ¿Aún no llegas? El paquete CelsTV + CelsBSNS te lleva desde lo cotidiano hasta los negocios.
              </p>
              <div className="btns">
                <a className="cu-btn cu-btn-light cu-btn-sm" href={evalHref("celsbsns")}>
                  Confirma tu nivel gratis
                </a>
                <a className="cu-btn bv3-btn-ghost cu-btn-sm" href="#planes">
                  Ver el paquete
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 6 · FAQ */}
        <section className="bv3-blk bv3-dark bv3-dots" id="faq">
          <div className="bv3-curve" aria-hidden="true">
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none">
              <path d="M0 0h1440v26C1100 66 340 66 0 26z" fill="#E8F0F9" />
            </svg>
          </div>
          <div className="bv3-wrap">
            <div className="bv3-head center">
              <div className="bv3-kick center">Preguntas frecuentes</div>
              <h2>Antes de inscribirte.</h2>
            </div>
            <div className="bv3-faq">
              {FAQ.map((f, i) => {
                const open = faq === i;
                return (
                  <div key={f.q} className={`q${open ? " open" : ""}`}>
                    <button type="button" aria-expanded={open} aria-controls={`faq-${i}`} onClick={() => setFaq(open ? -1 : i)}>
                      {f.q}
                      <i aria-hidden="true">+</i>
                    </button>
                    <div className="a" id={`faq-${i}`} hidden={!open}>
                      {f.a}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7 · CTA FINAL */}
        <section className="bv3-blk bv3-dark bv3-dots bv3-final bv3-cut-r" id="evaluacion">
          <div className="bv3-glow" style={{ width: 420, height: 420, background: "#F20174", right: 0, top: -80, opacity: 0.3 }} />
          <div className="bv3-wrap">
            <div>
              <h2>¿Tienes nivel B2? Compruébalo en 10 minutos.</h2>
              <p>Evaluación gratuita, sin tarjeta. Te decimos si estás listo para CelsBSNS o por dónde empezar.</p>
            </div>
            <a className="cu-btn cu-btn-pink" href={evalHref("celsbsns")}>
              Empezar mi evaluación <Arrow />
            </a>
          </div>
        </section>
      </main>

      <footer className="bv3-footer">
        <div className="bv3-wrap">
          <div className="cols">
            <div className="brand">
              <div className="row">
                {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
                <img loading="lazy" src="/site/celsu-logo.png" alt="" width={42} height={34} />
                <b>CelsUniversity</b>
              </div>
              <div className="row small">
                Una empresa de {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
                <img loading="lazy" src="/site/lam-logo.png" alt="Latin American Media" height={22} />
              </div>
            </div>
            <div>
              <strong>Programas</strong>
              <a href="/celstv">CelsTV</a>
              <a href="/celsbsns">CelsBSNS</a>
              <a href="/celsus">CelsUS</a>
              <a href="/celsglobal">CelsGLOBAL</a>
            </div>
            <div>
              <strong>Contacto</strong>
              <a href="mailto:hola@celstv.com">hola@celstv.com</a>
              <a href="https://wa.link/n5kdfs">WhatsApp 449 497 5359</a>
              <span>Lun–Vie, 9:00–18:00 (CDMX)</span>
            </div>
            <div>
              <strong>Legal</strong>
              <a href="/privacidad">Política de privacidad</a>
              <a href="/terminos">Términos</a>
            </div>
          </div>
          <p className="legal">© 2026 CelsUniversity by Latin American Media (LAM). CelsUS es un proveedor educativo independiente y no está afiliado con USCIS ni con ninguna agencia gubernamental.</p>
        </div>
      </footer>

      {video && VSL_YOUTUBE_ID && (
        <div className="bv3-modal" role="dialog" aria-modal="true" aria-label="Video de CelsBSNS" onClick={(e) => e.target === e.currentTarget && setVideo(false)}>
          <div className="box">
            <button type="button" className="x" onClick={() => setVideo(false)}>
              Cerrar ✕
            </button>
            <iframe src={`https://www.youtube-nocookie.com/embed/${VSL_YOUTUBE_ID}?autoplay=1&rel=0`} title="Video de CelsBSNS" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        </div>
      )}
    </div>
  );
}
