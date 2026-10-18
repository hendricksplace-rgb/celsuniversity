/* eslint-disable */
// @ts-nocheck
"use client";
// Generated from the approved board CelsBSNS.dc.html by scripts/board-to-tsx.py, then wired by hand:
// real week titles (props.weeks), purchase-flow links, testimonials hidden, reduced motion respected.
import { Component, Fragment } from "react";
import { css } from "@/components/site/css";
import { mxn as fmtMxn, plan as fmtPlan, price as fmtPrice, saving as fmtSaving, separately as fmtSeparately, type SitePrices } from "@/components/site/prices";
import "./celsbsns.css";

// Testimonials stay hidden until Matt sends real ones (celsu-website-spec.md: never invent any).
const SHOW_TESTIMONIALS = false;
const BUY = {
  standard: "/comprar/resumen?producto=celsbsns_standard",
  premium: "/comprar/resumen?producto=celsbsns_premium",
  bundle: "/comprar/resumen?producto=bundle_tv_bsns",
};

export default class CelsBSNSBoard extends Component<{ weeks?: string[]; prices: SitePrices }, any> {
  constructor(props) {
    super(props);
    this.state = { menuOpen: false, week: 0, playing: true, faq: 0 };
  }
  componentDidMount() {
    var self = this;
    // The roadmap doesn't advance on its own for people who prefer reduced motion.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.setState({ playing: false });
    this._t = setInterval(function () {
      if (self.state.playing && self._visible !== false) self.setState({ week: (self.state.week + 1) % 10 });
    }, 3600);
    try {
      this._io = new IntersectionObserver(function (es) { es.forEach(function (e) { self._visible = e.isIntersecting; }); }, { threshold: 0.3 });
      setTimeout(function () { if (self._sec) self._io.observe(self._sec); }, 300);
    } catch (e) {}
  }
  componentWillUnmount() { clearInterval(this._t); clearTimeout(this._resume); if (this._io) this._io.disconnect(); }
  renderVals() {
    var PR = this.props.prices;
    var self = this, s = this.state;
    var W = [
      { short: 'Comunicación', en: 'Professional Communication & Capstone Launch', es: 'Comunicación profesional', desc: 'Correos, llamadas y mensajes con el tono correcto. Además arrancas tu proyecto final, que irás construyendo todo el programa.', say: 'Please find the report attached.' },
      { short: 'Etiqueta', en: 'Business Etiquette & Workplace Culture', es: 'Etiqueta y cultura laboral', desc: 'Diferencias culturales, respeto en el trabajo y cómo manejar conversaciones difíciles con profesionalismo.', say: 'I see your point, but let me explain.' },
      { short: 'Liderazgo', en: 'Management and Leadership', es: 'Gestión y liderazgo', desc: 'Dar instrucciones, delegar y ofrecer retroalimentación a tu equipo en inglés.', say: "Let's delegate this to the design team." },
      { short: 'RR. HH.', en: 'Human Resources & Hiring', es: 'Recursos humanos y contratación', desc: 'Vacantes, perfiles de puesto, entrevistas y evaluación de candidatos.', say: 'Tell me about a time you solved a problem.' },
      { short: 'Estructura', en: 'Organizational Structures & Roles', es: 'Estructuras y roles', desc: 'Explicar quién hace qué en una empresa: áreas, jerarquías y responsabilidades.', say: 'She reports directly to the CFO.' },
      { short: 'Ética', en: 'Business Ethics & Conduct', es: 'Ética y conducta', desc: 'Políticas, dilemas y decisiones responsables, y cómo hablar de ellos con claridad.', say: 'That would be a conflict of interest.' },
      { short: 'Finanzas', en: 'Finance for Non-Finance Professionals', es: 'Finanzas para no financieros', desc: 'Leer y comentar reportes, KPIs, presupuestos y ROI sin ser contador.', say: 'Our margins improved this quarter.' },
      { short: 'Marketing', en: 'Marketing & Brand Communication', es: 'Marketing y marca', desc: 'Presentar productos, hablar de clientes y comunicar el valor de una marca.', say: 'Our brand speaks to young professionals.' },
      { short: 'Proyectos', en: 'Project Management & Productivity', es: 'Gestión de proyectos', desc: 'Planes, plazos, juntas de seguimiento y reportes de avance.', say: "We're on track to meet the deadline." },
      { short: 'Entrevistas', en: 'Interview Prep & Career Goals', es: 'Entrevistas y metas profesionales', desc: 'Respuestas difíciles, negociación de salario y tu marca personal. Cierras el programa con tu proyecto final.', say: "I'm looking for a role where I can grow." }
    ];
    var TASKS = [
      { label: 'Videos', c: '#13284D', fg: '#FFFFFF' }, { label: 'Reading', c: '#5B8DEF', fg: '#FFFFFF' }, { label: 'Writing', c: '#D9578F', fg: '#FFFFFF' },
      { label: 'Research', c: '#43D6FE', fg: '#0F0D1E' }, { label: 'Video', c: '#FFC800', fg: '#0F0D1E' }, { label: 'Speaking', c: '#8FD15A', fg: '#0F0D1E' }, { label: 'Feedback', c: '#E2E6EE', fg: '#0F0D1E' }
    ];
    // English week titles come from the course itself (modules of english-for-business).
    var real = this.props.weeks || [];
    W = W.map(function (w, i) { return real[i] ? Object.assign({}, w, { en: real[i] }) : w; });
    var cur = W[s.week];
    var go = function (i) {
      self.setState({ week: i, playing: false });
      clearTimeout(self._resume); self._resume = setTimeout(function () { self.setState({ playing: true }); }, 10000);
    };
    var FAQ = [
      { q: '¿Qué nivel de inglés necesito?', a: 'CelsBSNS es para nivel B2 en adelante. Si no estás seguro, haz la evaluación gratis; si aún no llegas a B2, el paquete CelsTV + CelsBSNS es tu mejor camino.' },
      { q: '¿Cuánto tiempo a la semana necesito?', a: 'Además de las lecciones en video, las tareas semanales suman aproximadamente de 6 a 7.5 horas: lectura, escritura, investigación, un video tuyo y práctica de conversación.' },
      { q: '¿Qué es el proyecto final?', a: 'Un proyecto profesional que inicias en la primera semana y desarrollas durante el programa, para que termines con algo concreto que puedas mostrar.' },
      { q: '¿Recibo certificado?', a: 'Sí. Al terminar recibes el certificado de CelsUniversity.' },
      { q: '¿Qué incluye Premium?', a: 'Todo lo de Standard, más la revisión de tu currículum estilo EE.UU. por un instructor, una entrevista de práctica individual con retroalimentación, el análisis de tu perfil profesional y acceso prioritario a recursos adicionales.' },
      { q: '¿Cuánto tiempo tengo acceso?', a: '12 meses. Puedes seguir el programa en 10 semanas o a tu propio ritmo.' }
    ];
    return {
      menuOpen: s.menuOpen,
      menuExpanded: s.menuOpen ? 'true' : 'false',
      toggleMenu: function () { self.setState({ menuOpen: !self.state.menuOpen }); },
      road: {
        sectionRef: function (el) { self._sec = el; },
        n: s.week + 1, en: 'Week ' + (s.week + 1) + ' · ' + cur.en, es: cur.es, desc: cur.desc, say: cur.say,
        fillStyle: 'position: absolute; left: 0; top: 30px; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #43D6FE, #2C6BC4); box-shadow: 0 0 12px rgba(44,107,196,.5); transition: width .6s ease; width: ' + (s.week / 9 * 100) + '%;',
        toggleLabel: s.playing ? 'Pausar' : 'Reproducir',
        toggle: function () { self.setState({ playing: !self.state.playing }); },
        weeks: W.map(function (w, i) {
          var on = i === s.week, done = i < s.week;
          return { n: i + 1, short: w.short, selected: on ? 'true' : 'false', aria: 'Semana ' + (i + 1) + ': ' + w.es, pick: function () { go(i); },
            dotStyle: 'width: clamp(34px, 4.6vw, 52px); height: clamp(34px, 4.6vw, 52px); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: clamp(13px, 1.4vw, 17px); transition: all .3s ease; ' +
              (on ? 'background: linear-gradient(180deg, #3D7FE0, #13284D); color: #FFFFFF; transform: scale(1.15); box-shadow: 0 0 0 4px rgba(44,107,196,.25), 0 12px 24px -8px rgba(19,40,77,.6);'
                  : done ? 'background: #2C6BC4; color: #FFFFFF; box-shadow: inset 0 1px 0 rgba(255,255,255,.3);' : 'background: #FFFFFF; color: #24384F; box-shadow: inset 0 1px 0 #FFFFFF, 0 4px 10px -4px rgba(10,20,40,.3);'),
            labelStyle: 'font-weight: 700; font-size: 12px; color: ' + (on ? '#0F0D1E' : '#4A5A6E') + '; text-align: center; line-height: 1.2;' };
        }),
        tasks: TASKS.map(function (t) { return { label: t.label, style: 'font-weight: 700; font-size: 13px; padding: 6px 10px; border-radius: 8px; background: ' + t.c + '; color: ' + t.fg + ';' }; })
      },
      faqs: FAQ.map(function (f, i) {
        var open = s.faq === i;
        return { q: f.q, a: f.a, open: open, expanded: open ? 'true' : 'false', toggle: function () { self.setState({ faq: self.state.faq === i ? -1 : i }); },
          iconStyle: 'flex: 0 0 auto; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform .25s ease, background .25s; ' +
            (open ? 'background: #2C6BC4; color: #FFFFFF; transform: rotate(45deg);' : 'background: #F6F5F9; color: #0F0D1E;') };
      })
    };
  }

  render() {
    const v = this.renderVals();
    // Prices from public.products (see the page), never the board's copy.
    const P = this.props.prices;
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#0F0D1E", background: "#FFFFFF", minWidth: "0", overflowX: "hidden" }}>

{/* NAV */}
<header style={{ position: "relative", zIndex: "5", background: "#FFFFFF", borderBottom: "1px solid #ECEAF2" }}>
<nav aria-label="Principal" style={{ maxWidth: "1240px", margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: "20px" }}>
<a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#0F0D1E", marginRight: "auto" }}>
<img src="/site/celsu-logo.png" alt="" style={{ width: "44px", height: "auto", display: "block" }} />
<span style={{ display: "flex", flexDirection: "column", gap: "4px", lineHeight: "1" }}><span style={{ fontWeight: "800", fontSize: "19px", letterSpacing: "-0.3px" }}>CelsUniversity</span><span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", fontSize: "11px", letterSpacing: "1.5px", color: "#6B6680" }}>BY <img src="/site/lam-logo.png" alt="LAM" style={{ height: "13px", width: "auto", display: "block" }} /></span></span>
</a>
<div className="cu-desk" style={{ gap: "28px", fontWeight: "600", fontSize: "15px", alignItems: "center" }}>
<a href="/#programas" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Programas</a>
<a href="#programa" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Las 10 semanas</a>
<a href="#precios" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Precios</a>
<a href="#programa" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Para quién es</a>
<a href="#faq" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Preguntas</a>
<a href="/entrar" style={{ color: "#0F0D1E", textDecoration: "none", padding: "10px 0", fontWeight: "700" }}>Iniciar sesión</a>
</div>
<a href="/evaluacion" className="cu-btn cu-btn-pink cu-btn-sm">Evaluación gratis</a>
<button type="button" className="cu-mob" onClick={v.toggleMenu} aria-label="Abrir men\u00fa" aria-expanded={v.menuExpanded} style={{ width: "46px", height: "46px", borderRadius: "10px", border: "1px solid #E2DFEA", background: "#FFFFFF", color: "#0F0D1E", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
</button>
</nav>
{v.menuOpen ? (<>
<div style={{ display: "flex", flexDirection: "column", padding: "4px 20px 16px", fontWeight: "600", fontSize: "17px", borderTop: "1px solid #ECEAF2" }}>
<a href="/#programas" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Programas</a>
<a href="#programa" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Las 10 semanas</a>
<a href="#precios" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Precios</a>
<a href="#programa" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Para quién es</a>
<a href="#faq" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Preguntas</a>
<a href="/entrar" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Iniciar sesión</a>
</div>
</>) : null}
</header>

{/* HERO */}
<section id="inicio" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #13284D 0%, #0F1F3D 55%, #0B1830 100%)", color: "#FFFFFF", padding: "64px 20px 120px" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "-180px", right: "-160px", width: "680px", height: "680px", borderRadius: "50%", background: "radial-gradient(circle, rgba(91,141,239,.35) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", bottom: "-220px", left: "-160px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(67,214,254,.18) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px 56px", alignItems: "center" }}>
<div style={{ flex: "1 1 480px", minWidth: "0", display: "flex", flexDirection: "column", gap: "20px" }}>
<a href="/#programas" style={{ alignSelf: "flex-start", color: "#A9C4F5", fontWeight: "700", fontSize: "14px", textDecoration: "none" }}>← Todos los programas</a>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#7FB8FF" }}>CELSBSNS · INGLÉS DE NEGOCIOS</span>
<h1 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(40px, 5.6vw, 70px)", lineHeight: "1.03", letterSpacing: "-2px" }}>English for Business.</h1>
<p style={{ margin: "0", fontSize: "19px", lineHeight: "1.6", color: "#C9D6EE", maxWidth: "560px" }}>10 semanas para hablar con seguridad en juntas, entrevistas y presentaciones. Contenido real de empresas, tareas semanales y un proyecto final que puedes mostrar.</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
<a href="#precios" className="cu-btn cu-btn-light">Ver planes y precios <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
<a href="/evaluacion" className="cu-btn cu-btn-pink">Confirma tu nivel B2</a>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)" }}>10 semanas</span>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)" }}>Nivel B2 a B2+</span>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)" }}>Proyecto final</span>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)" }}>Certificado CelsUniversity</span>
</div>
</div>
<div aria-hidden="true" style={{ flex: "1 1 400px", minWidth: "0", display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
<div className="cu-raise-dark" style={{ position: "relative", width: "100%", maxWidth: "480px", padding: "34px 28px", borderRadius: "24px", background: "linear-gradient(150deg, rgba(255,255,255,.10), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
<img className="cu-breathe" src="/site/celsbsns-logo.png" alt="" style={{ width: "86%", height: "auto" }} />
<div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
<span className="cu-reveal" style={{ alignSelf: "flex-start", maxWidth: "80%", background: "#FFFFFF", color: "#0F0D1E", fontWeight: "700", fontSize: "14px", padding: "10px 14px", borderRadius: "14px 14px 14px 4px" }}>Let's schedule a meeting for Monday.</span>
<span className="cu-reveal-2" style={{ alignSelf: "flex-end", maxWidth: "80%", background: "#2C6BC4", color: "#FFFFFF", fontWeight: "700", fontSize: "14px", padding: "10px 14px", borderRadius: "14px 14px 4px 14px" }}>Sounds good. I'll send the agenda.</span>
</div>
</div>
</div>
</div>
</section>

{/* 10-WEEK ROADMAP */}
<section id="programa" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #0B1830 0px, #0D1C35 33px, #122544 67px, #1A355C 100px, #244A7B 133px, #3B669C 167px, #6488B6 200px, #8EABCF 233px, #A9C0DD 267px, #BBCDE4 300px, #C8D8E9 333px, #D2DEED 367px, #D5E1EE 400px, #C6D6E8 100%)" }}>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "240px", right: "-140px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div ref={v.road.sectionRef} style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "26px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "780px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#2C6BC4" }}>TU RUTA DE 10 SEMANAS</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Una semana, un tema de negocios real.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#24384F" }}>Desde tu primer correo profesional hasta tu entrevista de trabajo. Tu proyecto final avanza contigo desde la primera semana.</p>
</div>

<div style={{ position: "relative", paddingTop: "6px" }}>
<div aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", top: "30px", height: "6px", borderRadius: "3px", background: "rgba(15,13,30,.12)" }}></div>
<div aria-hidden="true" style={css(v.road.fillStyle)}></div>
<div role="tablist" aria-label="Semanas" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: "4px" }}>
{(v.road.weeks ?? []).map((w: any, __i: number) => (<Fragment key={__i}>
<button type="button" role="tab" aria-selected={w.selected} aria-label={w.aria} onClick={w.pick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "0", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
<span style={css(w.dotStyle)}>{w.n}</span>
<span style={css(w.labelStyle)}>{w.short}</span>
</button>
</Fragment>))}
</div>
<div aria-hidden="true" style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "13px", color: "#24384F" }}>
<span style={{ flex: "1", height: "2px", background: "repeating-linear-gradient(90deg, #2C6BC4 0 8px, transparent 8px 14px)" }}></span>
<span style={{ whiteSpace: "nowrap" }}>Proyecto final: avanza las 10 semanas</span>
<span style={{ flex: "1", height: "2px", background: "repeating-linear-gradient(90deg, #2C6BC4 0 8px, transparent 8px 14px)" }}></span>
</div>
</div>

<div className="cu-raise" style={{ display: "flex", flexWrap: "wrap", borderRadius: "22px", overflow: "hidden", background: "#FFFFFF" }}>
<div style={{ flex: "0 0 200px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px", padding: "26px", background: "linear-gradient(160deg, #2C6BC4, #13284D)", color: "#FFFFFF" }}>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", opacity: ".8" }}>SEMANA</span>
<span className="cu-drop" key={v.road.n} style={{ fontWeight: "800", fontSize: "72px", lineHeight: "1", letterSpacing: "-3px" }}>{v.road.n}</span>
<span style={{ fontWeight: "700", fontSize: "13px", opacity: ".85" }}>de 10</span>
</div>
<div style={{ flex: "1 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "26px 28px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", color: "#2C6BC4" }}>{v.road.en}</span>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>{v.road.es}</h3>
<p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#3F3B52" }}>{v.road.desc}</p>
<p className="cu-drop" key={v.road.say} style={{ margin: "0", alignSelf: "flex-start", fontWeight: "800", fontSize: "17px", color: "#0F0D1E", background: "#E1ECFB", padding: "10px 14px", borderRadius: "14px 14px 14px 4px" }}>"{v.road.say}"</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
<span style={{ fontSize: "13px", fontWeight: "700", color: "#6B6680", marginRight: "4px", alignSelf: "center" }}>Esta semana:</span>
{(v.road.tasks ?? []).map((t: any, __i: number) => (<Fragment key={__i}><span style={css(t.style)}>{t.label}</span></Fragment>))}
</div>
</div>
<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px", padding: "20px 22px", background: "#F6F5F9", minWidth: "150px" }}>
<button type="button" onClick={v.road.toggle} className="cu-btn cu-btn-light cu-btn-sm">{v.road.toggleLabel}</button>
<span style={{ fontSize: "12px", color: "#6B6680", textAlign: "center" }}>Toca una semana</span>
</div>
</div>
</div>
</section>

{/* A TYPICAL WEEK */}
<section style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #C6D6E8 0px, #C1D2E5 33px, #B2C6DD 67px, #9CB4D2 100px, #829EC3 133px, #6583AC 167px, #48628A 200px, #2D4269 233px, #20345A 267px, #1B2F55 300px, #172C51 333px, #14294E 367px, #13284D 400px, #0F1F3D 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px 64px", alignItems: "center" }}>
<div className="cu-from-l" style={{ flex: "1 1 360px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#7FB8FF" }}>CÓMO ES UNA SEMANA</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Aprendes, practicas y lo demuestras.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#C9D6EE" }}>Cada semana combina lecciones en video con cinco tareas prácticas y retroalimentación personalizada. Unas 6 a 7.5 horas de práctica a la semana, a tu ritmo.</p>
</div>
<div className="cu-from-r cu-raise-dark" style={{ flex: "1 1 480px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px", padding: "28px", borderRadius: "22px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "15px" }}><strong style={{ fontWeight: "700" }}>Lecciones en video</strong><span style={{ color: "#C9D6EE", fontWeight: "600" }}>6 videos</span></div><div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div className="cu-grow" style={{ height: "100%", width: "100%", borderRadius: "5px", background: "linear-gradient(90deg, #7FB8FF, #7FB8FFCC)", boxShadow: "0 0 12px #7FB8FF88", animationDelay: "0ms" }}></div></div></div>
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "15px" }}><strong style={{ fontWeight: "700" }}>Reading</strong><span style={{ color: "#C9D6EE", fontWeight: "600" }}>1 h</span></div><div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div className="cu-grow" style={{ height: "100%", width: "50%", borderRadius: "5px", background: "linear-gradient(90deg, #5B8DEF, #5B8DEFCC)", boxShadow: "0 0 12px #5B8DEF88", animationDelay: "80ms" }}></div></div></div>
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "15px" }}><strong style={{ fontWeight: "700" }}>Writing</strong><span style={{ color: "#C9D6EE", fontWeight: "600" }}>1–2 h</span></div><div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div className="cu-grow" style={{ height: "100%", width: "75%", borderRadius: "5px", background: "linear-gradient(90deg, #D9578F, #D9578FCC)", boxShadow: "0 0 12px #D9578F88", animationDelay: "160ms" }}></div></div></div>
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "15px" }}><strong style={{ fontWeight: "700" }}>Research</strong><span style={{ color: "#C9D6EE", fontWeight: "600" }}>1–1.5 h</span></div><div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div className="cu-grow" style={{ height: "100%", width: "62%", borderRadius: "5px", background: "linear-gradient(90deg, #43D6FE, #43D6FECC)", boxShadow: "0 0 12px #43D6FE88", animationDelay: "240ms" }}></div></div></div>
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "15px" }}><strong style={{ fontWeight: "700" }}>Video submission</strong><span style={{ color: "#C9D6EE", fontWeight: "600" }}>1 h</span></div><div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div className="cu-grow" style={{ height: "100%", width: "50%", borderRadius: "5px", background: "linear-gradient(90deg, #FFC800, #FFC800CC)", boxShadow: "0 0 12px #FFC80088", animationDelay: "320ms" }}></div></div></div>
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "15px" }}><strong style={{ fontWeight: "700" }}>Speaking practice</strong><span style={{ color: "#C9D6EE", fontWeight: "600" }}>2 h</span></div><div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div className="cu-grow" style={{ height: "100%", width: "100%", borderRadius: "5px", background: "linear-gradient(90deg, #8FD15A, #8FD15ACC)", boxShadow: "0 0 12px #8FD15A88", animationDelay: "400ms" }}></div></div></div>
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "15px" }}><strong style={{ fontWeight: "700" }}>Feedback y progreso</strong><span style={{ color: "#C9D6EE", fontWeight: "600" }}>personalizada</span></div><div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div className="cu-grow" style={{ height: "100%", width: "30%", borderRadius: "5px", background: "linear-gradient(90deg, #C9D3E6, #C9D3E6CC)", boxShadow: "0 0 12px #C9D3E688", animationDelay: "480ms" }}></div></div></div>

<p style={{ margin: "6px 0 0", fontSize: "13px", color: "#A9B4CC" }}>Tiempos aproximados por semana, según tu ritmo.</p>
</div>
</div>
</section>

{/* WHO IT'S FOR */}
<section style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #0F1F3D 0px, #112242 33px, #152B4F 67px, #1C3964 100px, #254C7F 133px, #3B669C 167px, #6488B6 200px, #8EABCF 233px, #A9C0DD 267px, #BBCDE4 300px, #C8D8E9 333px, #D2DEED 367px, #D5E1EE 400px, #C6D6E8 100%)" }}>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#1E4877" }}>PARA QUIÉN ES</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Para quien ya habla inglés y quiere usarlo para crecer.</h2>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "16px" }}>
<div className="cu-raise cu-tilt" style={{ background: "#FFFFFF", borderRadius: "18px", padding: "26px", display: "flex", flexDirection: "column", gap: "10px", borderTop: "4px solid #2C6BC4" }}><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Profesionales en crecimiento</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3F3B52" }}>Buscas un ascenso o un puesto internacional y necesitas desenvolverte en inglés con soltura.</p></div>
<div className="cu-raise cu-tilt-2" style={{ background: "#FFFFFF", borderRadius: "18px", padding: "26px", display: "flex", flexDirection: "column", gap: "10px", borderTop: "4px solid #43D6FE" }}><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Recién egresados</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3F3B52" }}>Quieres destacar en el mercado laboral y llegar a tus entrevistas con un inglés profesional.</p></div>
<div className="cu-raise cu-tilt-3" style={{ background: "#FFFFFF", borderRadius: "18px", padding: "26px", display: "flex", flexDirection: "column", gap: "10px", borderTop: "4px solid #B3EC79" }}><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Emprendedores</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3F3B52" }}>Quieres presentar tu negocio a clientes o inversionistas internacionales con confianza.</p></div>
</div>
<div className="cu-reveal cu-raise" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "22px 24px", borderRadius: "18px", background: "linear-gradient(135deg, #FFF6D6, #FFFFFF)" }}>
<p style={{ margin: "0", flex: "1 1 360px", fontSize: "16px", lineHeight: "1.55", color: "#0F0D1E" }}><strong>CelsBSNS requiere nivel B2.</strong> ¿Aún no llegas? El paquete CelsTV + CelsBSNS te lleva desde lo cotidiano hasta los negocios.</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<a href="/evaluacion" className="cu-btn cu-btn-pink cu-btn-sm">Confirma tu nivel gratis</a>
<a href="#precios" className="cu-btn cu-btn-light cu-btn-sm">Ver el paquete</a>
</div>
</div>
</div>
</section>

{/* PLANS */}
<section id="precios" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #C6D6E8 0px, #C1D2E5 33px, #B2C6DD 67px, #9CB4D2 100px, #829EC3 133px, #6583AC 167px, #48628A 200px, #2D4269 233px, #20345A 267px, #1B2F55 300px, #172C51 333px, #14294E 367px, #13284D 400px, #0B1E3A 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "260px", left: "-140px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(91,141,239,.30) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#7FB8FF" }}>PLANES Y PRECIOS</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Elige tu plan de CelsBSNS.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#C9D3E6" }}>Pago único, sin suscripciones. Precios en dólares; el monto en pesos es solo de referencia.</p>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "stretch" }}>
<article className="cu-sheen cu-tilt" style={{ position: "relative", flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "30px 28px 28px", borderRadius: "22px", color: "#FFFFFF", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#7FB8FF" }}>CELSBSNS</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>Standard</h3><div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}><span style={{ fontWeight: "800", fontSize: "48px", letterSpacing: "-1.5px", lineHeight: "1" }}>{fmtPrice(P, "celsbsns_standard")}</span><span style={{ fontWeight: "700", fontSize: "15px", color: "#C9D3E6" }}>USD · pago único</span></div><span style={{ fontSize: "14px", color: "#A9B4CC", fontWeight: "600" }}>{fmtMxn(P, "celsbsns_standard")}{fmtMxn(P, "celsbsns_standard") ? " · " : ""}se cobra en dólares</span><ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Las 10 semanas en video</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Tareas semanales y materiales descargables</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>PDF semanal de vocabulario</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Quizzes con retroalimentación automática</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Certificado CelsUniversity</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>12 meses de acceso</span></li></ul><a href={BUY.standard} className="cu-btn cu-btn-light" style={{ marginTop: "auto", alignSelf: "stretch" }}>Inscríbete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a></article>
<article className="cu-sheen cu-tilt-2" style={{ position: "relative", flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "30px 28px 28px", borderRadius: "22px", color: "#FFFFFF", background: "linear-gradient(135deg, rgba(242,1,116,.22), rgba(255,255,255,.06))", border: "1px solid rgba(255,120,180,.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 0 44px -8px rgba(242,1,116,.55), 0 34px 70px -24px rgba(0,0,0,.7)" }}><span style={{ position: "absolute", right: "18px", top: "18px", fontWeight: "800", fontSize: "11px", letterSpacing: "1.2px", color: "#FFFFFF", background: "linear-gradient(180deg,#FF3D97,#D9006A)", padding: "6px 10px", borderRadius: "7px", boxShadow: "0 6px 14px -4px rgba(242,1,116,.6)" }}>RECOMENDADO</span><span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#7FB8FF" }}>CELSBSNS</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>Premium</h3><div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}><span style={{ fontWeight: "800", fontSize: "48px", letterSpacing: "-1.5px", lineHeight: "1" }}>{fmtPrice(P, "celsbsns_premium")}</span><span style={{ fontWeight: "700", fontSize: "15px", color: "#C9D3E6" }}>USD · pago único</span></div><span style={{ fontSize: "14px", color: "#A9B4CC", fontWeight: "600" }}>{fmtMxn(P, "celsbsns_premium")}{fmtMxn(P, "celsbsns_premium") ? " · " : ""}se cobra en dólares</span><ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Todo lo de Standard</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Revisión de tu currículum estilo EE.UU. por un instructor</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Entrevista de práctica individual con retroalimentación</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Análisis y estrategia de tu perfil profesional</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Acceso prioritario a recursos adicionales</span></li></ul><a href={BUY.premium} className="cu-btn cu-btn-pink" style={{ marginTop: "auto", alignSelf: "stretch" }}>Inscríbete en Premium <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a></article>
</div>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "22px" }}>¿Aún no tienes B2? Empieza con el paquete</h3>
<div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
<article className="cu-sheen" style={{ flex: "1 1 360px", minWidth: "0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 24px", padding: "22px 24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 24px 48px -24px rgba(0,0,0,.6)", border: "1px solid rgba(255,255,255,.12)" }}>
<div style={{ flex: "1 1 200px", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#FF7DB8" }}>CELSTV + CELSBSNS</span>
<strong style={{ fontWeight: "800", fontSize: "20px" }}>Inglés para la vida y los negocios</strong>
<span style={{ fontSize: "14px", color: "#C9D3E6" }}>Acceso completo a ambos programas, guías de práctica y doble certificado. Ideal desde nivel B1.</span>
</div>
<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
<span style={{ fontWeight: "800", fontSize: "32px", lineHeight: "1" }}>{fmtPrice(P, "bundle_tv_bsns")} <span style={{ fontSize: "14px", color: "#C9D3E6" }}>USD</span></span>
<span style={{ fontSize: "13px", fontWeight: "700", color: "#B3EC79" }}>Ahorras {fmtSaving(P, "bundle_tv_bsns", ["celstv_standard", "celsbsns_standard"])} USD</span>
<a href={BUY.bundle} className="cu-btn cu-btn-light cu-btn-sm">Obtener paquete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</article>
</div>
</div>
</div>
</section>

{SHOW_TESTIMONIALS ? (<>{/* TESTIMONIALS */}
<section style={{ position: "relative", overflowX: "clip", padding: "90px 20px 110px", background: "linear-gradient(180deg, #0B1E3A 0px, #0B1E3A 120px, #10213F 55%, #13284D 100%)", color: "#FFFFFF" }}>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#F6AC00" }}>ALUMNOS DE CELSBSNS</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Historias reales.</h2>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
<figure className="cu-tilt cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsBSNS]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Puesto], [Ciudad]</figcaption></figure>
<figure className="cu-tilt-2 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsBSNS]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Puesto], [Ciudad]</figcaption></figure>
<figure className="cu-tilt-3 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsBSNS]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Puesto], [Ciudad]</figcaption></figure>
</div>
</div>
</section></>) : null}

{/* FAQ */}
<section id="faq" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #13284D 0px, #142B51 33px, #18335C 67px, #1E3F6D 100px, #264E83 133px, #3B669C 167px, #6488B6 200px, #8EABCF 233px, #A9C0DD 267px, #BBCDE4 300px, #C8D8E9 333px, #D2DEED 367px, #D5E1EE 400px, #C6D6E8 100%)" }}>
<div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#1E4877" }}>PREGUNTAS FRECUENTES</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Antes de inscribirte.</h2>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
{(v.faqs ?? []).map((q: any, __i: number) => (<Fragment key={__i}>
<div className="cu-raise" style={{ background: "#FFFFFF", borderRadius: "16px", overflow: "hidden" }}>
<button type="button" onClick={q.toggle} aria-expanded={q.expanded} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "20px 22px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "#0F0D1E" }}>
<span style={{ fontWeight: "800", fontSize: "18px" }}>{q.q}</span>
<span style={css(q.iconStyle)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span>
</button>
{q.open ? (<>
<p className="cu-drop" style={{ margin: "0", padding: "0 22px 22px", fontSize: "16px", lineHeight: "1.65", color: "#3F3B52" }}>{q.a}</p>
</>) : null}
</div>
</Fragment>))}
</div>
</div>
</section>

{/* FINAL CTA */}
<section id="evaluacion" style={{ padding: "0 20px 96px", background: "#C6D6E8" }}>
<div style={{ position: "relative", overflow: "hidden", maxWidth: "1240px", margin: "0 auto", transform: "perspective(1200px) rotateX(4deg)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 2px 0 #0B1830, 0 30px 60px -18px rgba(10,30,70,.5), 0 60px 90px -40px rgba(15,13,30,.45)", background: "linear-gradient(160deg, #2C6BC4 0%, #13284D 70%)", color: "#FFFFFF", borderRadius: "20px", padding: "48px 28px", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<div style={{ position: "relative", flex: "1 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: "1.12", letterSpacing: "-0.8px" }}>¿Tienes nivel B2? Compruébalo en 10 minutos.</h2>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#C9D6EE" }}>Evaluación gratuita, sin tarjeta. Te decimos si estás listo para CelsBSNS o por dónde empezar.</p>
</div>
<a href="/evaluacion" className="cu-btn cu-btn-pink">Empezar mi evaluación <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</section>

{/* FOOTER */}
<footer style={{ background: "linear-gradient(180deg, #C6D6E8 0px, #C1D2E5 35px, #B2C6DD 70px, #9CB4D2 105px, #829EC3 140px, #6583AC 175px, #48628A 210px, #2D4269 245px, #202E4F 280px, #19203B 315px, #14162B 350px, #100F21 385px, #0F0D1E 420px)", color: "#FFFFFF", padding: "330px 20px 36px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexWrap: "wrap", gap: "28px 64px" }}>
<div style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}><img loading="lazy" src="/site/celsu-logo.png" alt="" style={{ width: "42px", height: "auto" }} /><span style={{ fontWeight: "800", fontSize: "18px" }}>CelsUniversity</span></div>
<div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#CFCBDB", fontWeight: "600" }}>Una empresa de <img loading="lazy" src="/site/lam-logo.png" alt="Latin American Media" style={{ height: "22px", width: "auto" }} /></div>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
<strong style={{ fontWeight: "700" }}>Programas</strong>
<a href="/celstv" style={{ color: "#CFCBDB", textDecoration: "none" }}>CelsTV</a>
<a href="/celsbsns" style={{ color: "#CFCBDB", textDecoration: "none" }}>CelsBSNS</a>
<a href="/celsus" style={{ color: "#CFCBDB", textDecoration: "none" }}>CelsUS</a>
<a href="/celsglobal" style={{ color: "#CFCBDB", textDecoration: "none" }}>CelsGLOBAL</a>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
<strong style={{ fontWeight: "700" }}>Contacto</strong>
<a href="mailto:hola@celstv.com" style={{ color: "#CFCBDB", textDecoration: "none" }}>hola@celstv.com</a>
<a href="https://wa.link/n5kdfs" style={{ color: "#CFCBDB", textDecoration: "none" }}>WhatsApp 449 497 5359</a>
<span style={{ color: "#A9A4BA" }}>Lun–Vie, 9:00–18:00 (CDMX)</span>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
<strong style={{ fontWeight: "700" }}>Legal</strong>
<a href="/privacidad" style={{ color: "#CFCBDB", textDecoration: "none" }}>Política de privacidad</a>
<a href="/terminos" style={{ color: "#CFCBDB", textDecoration: "none" }}>Términos</a>
</div>
</div>
<p style={{ margin: "0", fontSize: "13px", lineHeight: "1.6", color: "#A9A4BA", borderTop: "1px solid #2A2640", paddingTop: "18px" }}>© 2026 CelsUniversity by Latin American Media (LAM). CelsUS es un proveedor educativo independiente y no está afiliado con USCIS ni con ninguna agencia gubernamental.</p>
</div>
</footer>

</div>
    );
  }
}
