/* eslint-disable */
// @ts-nocheck
"use client";
// Generated from the approved board CelsGLOBAL.dc.html by scripts/board-to-tsx.py, then wired by hand:
// real routes, enroll buttons to the purchase flow (/comprar/celsglobal), testimonials hidden until
// Matt sends real ones, no autoplay with prefers-reduced-motion, lazy images below the fold.
import { Component, Fragment } from "react";
import { css } from "@/components/site/css";
import { mxn as fmtMxn, plan as fmtPlan, price as fmtPrice, saving as fmtSaving, separately as fmtSeparately, type SitePrices } from "@/components/site/prices";
import "./celsglobal.css";

// Only real testimonials: the section stays hidden until Matt sends them (celsu-website-spec.md).
const SHOW_TESTIMONIALS = false;

export default class CelsGLOBALBoard extends Component<{ prices: SitePrices }, any> {
  constructor(props) {
    super(props);
    this.state = { menuOpen: false, month: 0, playing: true, faq: 0 };
  }
  componentDidMount() {
    var self = this;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.setState({ playing: false });
    this._t = setInterval(function () {
      if (self.state.playing && self._visible !== false) self.setState({ month: (self.state.month + 1) % 6 });
    }, 4200);
    try {
      this._io = new IntersectionObserver(function (es) { es.forEach(function (e) { self._visible = e.isIntersecting; }); }, { threshold: 0.25 });
      setTimeout(function () { var el = document.getElementById('ruta'); if (el) self._io.observe(el); }, 400);
    } catch (e) {}
  }
  componentWillUnmount() { clearInterval(this._t); if (this._io) this._io.disconnect(); }
  _tone(i) {
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this._ac = this._ac || new C(); var ac = this._ac, t = ac.currentTime;
      [[196, 0], [294 + i * 12, 0.09]].forEach(function (p) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = p[0];
        g.gain.setValueAtTime(0, t + p[1]); g.gain.linearRampToValueAtTime(0.12, t + p[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + p[1] + 0.7);
        o.connect(g); g.connect(ac.destination); o.start(t + p[1]); o.stop(t + p[1] + 0.75);
      });
    } catch (e) {}
  }
  renderVals() {
    var PR = this.props.prices;
    var self = this, s = this.state;
    var P = {
      tv: { name: 'CelsTV', c: '#B76F86' },
      bsns: { name: 'English for Business', c: '#3F8FA6' },
      cv: { name: 'CV to Resume', c: '#B08A38' },
      rr: { name: 'Resume Review', c: '#B08A38' },
      crack: { name: 'Crack the U.S. Interview Code', c: '#1D3352' },
      prep: { name: 'Interview Prep', c: '#1D3352' },
      fin: { name: 'Finanzas Personales', c: '#6F8A5F' },
      tn: { name: 'Tu Camino con la Visa TN', c: '#2E6F86' }
    };
    var M = [
      { short: 'Fundamentos', color: '#3F8FA6', title: 'Tu punto de partida', desc: 'Haces tu evaluación de nivel, empiezas CelsTV para reforzar tu inglés base y ordenas tu dinero con Finanzas Personales antes del gran cambio.', items: ['tv', 'fin'], goal: 'Conoces tu nivel de inglés y tienes un presupuesto y un plan de ahorro.' },
      { short: 'Inglés profesional', color: '#C7A24E', title: 'El inglés de tu trabajo', desc: 'Comienzas English for Business: correos, llamadas, reuniones y el vocabulario de tu industria, con práctica cada semana.', items: ['bsns', 'tv'], goal: 'Te comunicas por escrito y por teléfono con el tono profesional correcto.' },
      { short: 'Tu resume', color: '#B76F86', title: 'De CV a resume americano', desc: 'Con CV to Resume conviertes tu CV en un resume al estilo de Estados Unidos: logros medibles, formato correcto y palabras clave. Sigues avanzando en English for Business.', items: ['cv', 'bsns'], goal: 'Tienes un resume en inglés listo para enviar.' },
      { short: 'Revisión experta', color: '#8DA67B', title: 'Tu resume, revisado', desc: 'En Resume Review recibes retroalimentación personalizada sobre tu resume. Cierras English for Business con presentaciones y negociación.', items: ['rr', 'bsns'], goal: 'Tu resume está pulido y presentas con seguridad en inglés.' },
      { short: 'La entrevista', color: '#1D3352', title: 'Entrevistas que sí ganas', desc: 'Crack the U.S. Interview Code te enseña cómo evalúan los reclutadores en Estados Unidos. Con Interview Prep lo practicas en entrevistas simuladas.', items: ['crack', 'prep'], goal: 'Respondes las preguntas clave y cuentas tu historia con confianza.' },
      { short: 'Tu camino', color: '#2E6F86', title: 'Tu camino con la Visa TN', desc: 'Entiendes qué es la Visa TN, quién califica, qué documentos se piden y cómo preparar tu proceso. Cierras el programa con tu plan de siguientes pasos.', items: ['tn'], goal: 'Tienes claro tu camino profesional hacia Estados Unidos.' }
    ];
    var cm = M[s.month];
    var months = M.map(function (m, i) {
      var on = i === s.month, done = i < s.month;
      return {
        n: i + 1, short: m.short, selected: on ? 'true' : 'false',
        pick: function () { self._tone(i); self.setState({ month: i, playing: false }); },
        style: 'position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 16px 16px 20px; border-radius: 16px; cursor: pointer; font-family: inherit; text-align: left; transition: transform .3s ease, background .3s ease, box-shadow .3s ease, color .3s ease; ' +
          (on ? 'background: ' + m.color + '; color: #FFFFFF; border: 1px solid ' + m.color + '; transform: translateY(-4px); box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 18px 34px -14px ' + m.color + ';'
              : 'background: rgba(255,255,255,.75); color: #1D3352; border: 1px solid rgba(29,51,82,.12); box-shadow: 0 8px 20px -14px rgba(20,24,43,.4);'),
        barStyle: 'position: absolute; left: 0; bottom: 0; height: 4px; transition: width .6s ease; width: ' + (on || done ? '100%' : '0%') + '; background: ' + (on ? 'rgba(255,255,255,.75)' : m.color) + ';',
        dotStyle: 'height: 6px; flex: 1 1 0; border-radius: 3px; transition: background .4s; background: ' + (i <= s.month ? M[s.month].color : 'rgba(29,51,82,.15)') + ';'
      };
    });
    var FAQ = [
      { q: '¿Cuánto dura CelsGLOBAL?', a: 'El programa está diseñado para completarse en 6 meses, con un enfoque nuevo cada mes. Es un ritmo sugerido: puedes avanzar más rápido o repasar a tu propio paso.' },
      { q: '¿Qué nivel de inglés necesito?', a: 'Si tu inglés todavía es básico, CelsTV está incluido para que construyas la base mientras avanzas. English for Business está pensado para un nivel intermedio-alto (B2). Haz la evaluación gratis y te decimos desde dónde empiezas.' },
      { q: '¿Qué incluye exactamente?', a: 'CelsTV, English for Business (CelsBSNS), CV to Resume, Resume Review, Crack the U.S. Interview Code, Interview Prep, Finanzas Personales y Tu Camino con la Visa TN.' },
      { q: '¿El módulo de Visa TN es asesoría legal?', a: 'No. Es un curso educativo que te explica el proceso para que llegues preparado. Para revisar tu caso en particular, te recomendamos a nuestro aliado legal, Hendricks Law.' },
      { q: '¿Me sirve si ya vivo en Estados Unidos?', a: 'Sí. El inglés de negocios, el resume, las entrevistas y las finanzas personales te sirven para crecer en tu trabajo actual o cambiar a uno mejor.' },
      { q: '¿Cómo se paga?', a: (function () { var pl = fmtPlan(PR, 'celsglobal_plan'); return 'Un pago de ' + fmtPrice(PR, 'celsglobal') + ' USD' + (pl ? ', o ' + pl.count + ' pagos mensuales de ' + pl.first + ' USD' + (pl.last !== pl.first ? ' (el último de ' + pl.last + ')' : '') : '') + '. El cobro se hace en dólares.'; })() }
    ];
    return {
      menuOpen: s.menuOpen,
      menuExpanded: s.menuOpen ? 'true' : 'false',
      toggleMenu: function () { self.setState({ menuOpen: !self.state.menuOpen }); },
      heroTick: 'Mes ' + (s.month + 1) + ' · ' + cm.short,
      months: months,
      playLabel: s.playing ? 'Pausar recorrido' : 'Reproducir recorrido',
      togglePlay: function () { self.setState({ playing: !self.state.playing }); },
      cur: {
        n: s.month + 1, title: cm.title, desc: cm.desc, goal: cm.goal,
        edge: 'position: absolute; left: 0; top: 0; bottom: 0; width: 6px; transition: background .4s; background: ' + cm.color + ';',
        tagStyle: 'align-self: flex-start; font-weight: 800; font-size: 12px; letter-spacing: 1.5px; padding: 6px 10px; border-radius: 8px; color: #FFFFFF; transition: background .4s; background: ' + cm.color + ';',
        items: cm.items.map(function (k) { var p = P[k]; return { name: p.name, style: 'display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; padding: 8px 12px; border-radius: 10px; color: ' + p.c + '; background: #F4F1EA; border: 1px solid ' + p.c + '33;' }; })
      },
      faqs: FAQ.map(function (f, i) {
        var open = s.faq === i;
        return { q: f.q, a: f.a, open: open, expanded: open ? 'true' : 'false', toggle: function () { self.setState({ faq: self.state.faq === i ? -1 : i }); },
          iconStyle: 'flex: 0 0 auto; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform .25s ease, background .25s; ' +
            (open ? 'background: #1D3352; color: #FFFFFF; transform: rotate(45deg);' : 'background: #F4F1EA; color: #0F0D1E;') };
      })
    };
  }

  render() {
    const v = this.renderVals();
    // Prices from public.products (see the page), never the board's copy.
    const P = this.props.prices;
    return (
      <div style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif", color: "#0F0D1E", background: "#FFFFFF", minWidth: "0", overflowX: "hidden" }}>

{/* NAV */}
<header style={{ position: "relative", zIndex: "5", background: "#FFFFFF", borderBottom: "1px solid #ECEAF2" }}>
<nav aria-label="Principal" style={{ maxWidth: "1240px", margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: "20px" }}>
<a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#0F0D1E", marginRight: "auto" }}>
<img src="/site/celsu-logo.png" alt="" style={{ width: "44px", height: "auto", display: "block" }} />
<span style={{ display: "flex", flexDirection: "column", gap: "4px", lineHeight: "1" }}><span style={{ fontWeight: "800", fontSize: "19px", letterSpacing: "-0.3px" }}>CelsUniversity</span><span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", fontSize: "11px", letterSpacing: "1.5px", color: "#6B6680" }}>BY <img src="/site/lam-logo.png" alt="LAM" style={{ height: "13px", width: "auto", display: "block" }} /></span></span>
</a>
<div className="cu-desk" style={{ gap: "28px", fontWeight: "600", fontSize: "15px", alignItems: "center" }}>
<a href="/#programas" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Programas</a>
<a href="#ruta" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Ruta de 6 meses</a>
<a href="#precios" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Precios</a>
<a href="#incluye" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Qué incluye</a>
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
<a href="#ruta" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Ruta de 6 meses</a>
<a href="#precios" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Precios</a>
<a href="#incluye" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Qué incluye</a>
<a href="#faq" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Preguntas</a>
<a href="/entrar" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Iniciar sesión</a>
</div>
</>) : null}
</header>

{/* HERO */}
<section id="inicio" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #23395A 0%, #1D3352 45%, #14182B 100%)", color: "#FFFFFF", padding: "64px 20px 120px" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "-200px", right: "-160px", width: "640px", height: "640px", borderRadius: "50%", background: "radial-gradient(circle, rgba(199,162,78,.20) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", bottom: "-260px", left: "-200px", width: "640px", height: "640px", borderRadius: "50%", background: "radial-gradient(circle, rgba(63,143,166,.24) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px 56px", alignItems: "center" }}>
<div style={{ flex: "1 1 460px", minWidth: "0", display: "flex", flexDirection: "column", gap: "20px" }}>
<a href="/#programas" style={{ alignSelf: "flex-start", color: "#AFC3D6", fontWeight: "700", fontSize: "14px", textDecoration: "none" }}>← Todos los programas</a>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#DDBE72" }}>CELSGLOBAL · INTERNATIONAL BUSINESS DEVELOPMENT</span>
<h1 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(40px, 5.6vw, 68px)", lineHeight: "1.04", letterSpacing: "-2px" }}>Tu carrera,<br /><span style={{ background: "linear-gradient(90deg, #7CC4D6, #DDBE72 60%, #D79AB0)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>sin fronteras.</span></h1>
<p style={{ margin: "0", fontSize: "19px", lineHeight: "1.6", color: "#CBD6E2", maxWidth: "580px" }}>Un programa de 6 meses para profesionales que quieren crecer en Estados Unidos: inglés de negocios, un resume al estilo americano, entrevistas que sí ganas, tus finanzas en orden y tu camino con la Visa TN. Todo en un solo lugar.</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
<a href="#precios" className="cu-btn cu-btn-gold">Inscríbete por {fmtPrice(P, "celsglobal")} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
<a href="#ruta" className="cu-btn cu-btn-ghost">Ver la ruta de 6 meses</a>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<span className="cu-chip">6 meses</span>
<span className="cu-chip">8 programas y servicios</span>
<span className="cu-chip">Inglés con apoyo en español</span>
</div>
</div>
<div aria-hidden="true" style={{ flex: "1 1 420px", minWidth: "0", display: "flex", justifyContent: "center" }}>
<div className="cu-raise-dark" style={{ position: "relative", overflow: "hidden", width: "100%", maxWidth: "500px", aspectRatio: "1 / 1", borderRadius: "28px", background: "radial-gradient(circle at 50% 45%, #2A4568 0%, #1A2B47 55%, #111526 100%)", border: "1px solid rgba(255,255,255,.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
<svg className="cu-globe" viewBox="0 0 400 400" style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }}>
<g fill="none" stroke="#7CC4D6" strokeOpacity=".22" strokeWidth="1.2">
<circle cx="200" cy="200" r="160" />
<ellipse cx="200" cy="200" rx="160" ry="56" />
<ellipse cx="200" cy="200" rx="160" ry="112" />
<path d="M40 200 H360" />
<ellipse className="cu-mer" cx="200" cy="200" rx="160" ry="160" style={{ animationDelay: "0s" }} />
<ellipse className="cu-mer" cx="200" cy="200" rx="160" ry="160" style={{ animationDelay: "-3s" }} />
<ellipse className="cu-mer" cx="200" cy="200" rx="160" ry="160" style={{ animationDelay: "-6s" }} />
<ellipse className="cu-mer" cx="200" cy="200" rx="160" ry="160" style={{ animationDelay: "-9s" }} />
</g>
</svg>
<div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
<div className="cu-g-float"><svg viewBox="0 0 140 140" width="170" height="170" aria-hidden="true" style={{ display: "block", overflow: "visible" }}><defs><linearGradient id="gTGh" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#2E6F86" /><stop offset=".55" stopColor="#5FB3C8" /><stop offset="1" stopColor="#DDBE72" /></linearGradient><linearGradient id="gRhh" gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="134" y2="0"><stop offset="0" stopColor="#9A5470" /><stop offset="1" stopColor="#CC8AA0" /></linearGradient></defs><path pathLength="1" className="cu-draw cu-draw-1" d="M100 32 A 47 47 0 1 0 114 84" fill="none" stroke="url(#gTGh)" strokeWidth="24" strokeLinecap="round" /><path pathLength="1" className="cu-draw cu-draw-2" d="M74 78 H 124" fill="none" stroke="url(#gRhh)" strokeWidth="18" strokeLinecap="round" /><path pathLength="1" className="cu-draw cu-draw-3" d="M114 64 L 130 78 L 114 92" fill="none" stroke="url(#gRhh)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
<span style={{ fontWeight: "800", fontSize: "30px", letterSpacing: "1px" }}>CELS<span style={{ fontWeight: "300" }}>GLOBAL</span></span>
<span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "14px", color: "#DDBE72", padding: "8px 14px", borderRadius: "999px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(221,190,114,.35)" }}><span className="cu-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#DDBE72" }}></span>{v.heroTick}</span>
</div>
</div>
</div>
</div>
</section>

{/* 6-MONTH ROUTE */}
<section id="ruta" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #14182B 0px, #151A2E 33px, #192036 67px, #1F2A42 100px, #273652 133px, #394D6A 167px, #63778D 200px, #8FA3B1 233px, #B0BFC5 267px, #C9CFD0 300px, #DCDDD8 333px, #E9E6DD 367px, #EEE9DF 400px, #ECE6DA 100%)" }}>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexWrap: "wrap", gap: "16px 32px", alignItems: "flex-end", justifyContent: "space-between" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#2E6F86" }}>TU RUTA DE 6 MESES</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Un paso cada mes. Una carrera nueva al final.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#45506A" }}>CelsTV te acompaña todo el programa para reforzar tu inglés base. Cada mes suma un enfoque nuevo.</p>
</div>
<button type="button" onClick={v.togglePlay} className="cu-btn cu-btn-sm cu-btn-dark">{v.playLabel}</button>
</div>
<div role="tablist" aria-label="Meses del programa" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "10px" }}>
{(v.months ?? []).map((m: any, __i: number) => (<Fragment key={__i}>
<button type="button" role="tab" aria-selected={m.selected} onClick={m.pick} style={css(m.style)}>
<span style={{ fontWeight: "800", fontSize: "12px", letterSpacing: "1.5px", opacity: ".8" }}>MES {m.n}</span>
<span style={{ fontWeight: "800", fontSize: "17px", lineHeight: "1.2" }}>{m.short}</span>
<span style={css(m.barStyle)}></span>
</button>
</Fragment>))}
</div>
<div className="cu-raise" style={{ position: "relative", overflow: "hidden", background: "#FFFFFF", borderRadius: "22px", padding: "30px 28px", display: "flex", flexWrap: "wrap", gap: "24px 40px" }}>
<span style={css(v.cur.edge)}></span>
<div style={{ flex: "1 1 420px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
<span style={css(v.cur.tagStyle)}>MES {v.cur.n} DE 6</span>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(26px, 3vw, 34px)", lineHeight: "1.15", letterSpacing: "-0.6px" }}>{v.cur.title}</h3>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.65", color: "#3F3B52" }}>{v.cur.desc}</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
{(v.cur.items ?? []).map((c: any, __i: number) => (<Fragment key={__i}><span style={css(c.style)}>{c.name}</span></Fragment>))}
</div>
</div>
<div style={{ flex: "1 1 280px", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px", padding: "22px", borderRadius: "16px", background: "#F4F1EA" }}>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#6B6680" }}>AL TERMINAR EL MES</span>
<p style={{ margin: "0", fontWeight: "700", fontSize: "18px", lineHeight: "1.45", color: "#1D3352" }}>{v.cur.goal}</p>
<div aria-hidden="true" style={{ marginTop: "auto", display: "flex", gap: "6px" }}>{(v.months ?? []).map((m: any, __i: number) => (<Fragment key={__i}><span style={css(m.dotStyle)}></span></Fragment>))}</div>
</div>
</div>
<p style={{ margin: "0", fontSize: "13px", color: "#6B6680" }}>Ritmo sugerido. Puedes avanzar más rápido o repasar a tu propio paso.</p>
</div>
</section>

{/* WHAT'S INCLUDED */}
<section id="incluye" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #ECE6DA 0px, #E7E3D8 33px, #DBDBD4 67px, #C8CECD 100px, #B0BEC4 133px, #90A7B3 167px, #668595 200px, #3D6578 233px, #2A5168 267px, #25455F 300px, #213B58 333px, #1E3554 367px, #1D3352 400px, #1A2C48 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#DDBE72" }}>TODO LO QUE INCLUYE</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>8 programas y servicios. Una sola inscripción.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#C3D0DE" }}>Cursos para aprender, servicios personalizados para aplicar lo aprendido y acceso a inglés base mientras avanzas.</p>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: "16px" }}>
<div className="cu-sheen cu-tilt" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}><span style={{ fontWeight: "800", fontSize: "13px", color: "#5FB3C8" }}>01</span><span style={{ fontWeight: "800", fontSize: "10px", letterSpacing: "1.4px", padding: "4px 8px", borderRadius: "6px", color: "#5FB3C8", border: "1px solid #5FB3C8" }}>CURSO</span></div><span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#5FB3C8", boxShadow: "0 0 12px #5FB3C8" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>English for Business</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>CelsBSNS completo: 10 semanas de inglés profesional para correos, llamadas, reuniones, presentaciones y negociación.</p></div>
<div className="cu-sheen cu-tilt-2" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}><span style={{ fontWeight: "800", fontSize: "13px", color: "#DDBE72" }}>02</span><span style={{ fontWeight: "800", fontSize: "10px", letterSpacing: "1.4px", padding: "4px 8px", borderRadius: "6px", color: "#DDBE72", border: "1px solid #DDBE72" }}>CURSO</span></div><span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#DDBE72", boxShadow: "0 0 12px #DDBE72" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>CV to Resume</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>Convierte tu CV en un resume al estilo de Estados Unidos, con logros medibles y el formato que esperan los reclutadores.</p></div>
<div className="cu-sheen cu-tilt-3" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}><span style={{ fontWeight: "800", fontSize: "13px", color: "#DDBE72" }}>03</span><span style={{ fontWeight: "800", fontSize: "10px", letterSpacing: "1.4px", padding: "4px 8px", borderRadius: "6px", color: "#DDBE72", border: "1px solid #DDBE72" }}>SERVICIO</span></div><span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#DDBE72", boxShadow: "0 0 12px #DDBE72" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>Resume Review</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>Revisión de tu resume con retroalimentación personalizada antes de enviarlo.</p></div>
<div className="cu-sheen cu-tilt-4" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}><span style={{ fontWeight: "800", fontSize: "13px", color: "#CC8AA0" }}>04</span><span style={{ fontWeight: "800", fontSize: "10px", letterSpacing: "1.4px", padding: "4px 8px", borderRadius: "6px", color: "#CC8AA0", border: "1px solid #CC8AA0" }}>CURSO</span></div><span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#CC8AA0", boxShadow: "0 0 12px #CC8AA0" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>Crack the U.S. Interview Code</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>Cómo funcionan las entrevistas en Estados Unidos, qué preguntan y cómo contar tu historia profesional.</p></div>
<div className="cu-sheen cu-tilt" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}><span style={{ fontWeight: "800", fontSize: "13px", color: "#CC8AA0" }}>05</span><span style={{ fontWeight: "800", fontSize: "10px", letterSpacing: "1.4px", padding: "4px 8px", borderRadius: "6px", color: "#CC8AA0", border: "1px solid #CC8AA0" }}>SERVICIO</span></div><span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#CC8AA0", boxShadow: "0 0 12px #CC8AA0" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>Interview Prep</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>Entrevistas simuladas para practicar tus respuestas y llegar con confianza a la real.</p></div>
<div className="cu-sheen cu-tilt-2" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}><span style={{ fontWeight: "800", fontSize: "13px", color: "#A9C198" }}>06</span><span style={{ fontWeight: "800", fontSize: "10px", letterSpacing: "1.4px", padding: "4px 8px", borderRadius: "6px", color: "#A9C198", border: "1px solid #A9C198" }}>CURSO</span></div><span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#A9C198", boxShadow: "0 0 12px #A9C198" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>Finanzas Personales</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>Presupuesto, ahorro y crédito para tomar mejores decisiones con tu dinero.</p></div>
<div className="cu-sheen cu-tilt-3" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}><span style={{ fontWeight: "800", fontSize: "13px", color: "#7CC4D6" }}>07</span><span style={{ fontWeight: "800", fontSize: "10px", letterSpacing: "1.4px", padding: "4px 8px", borderRadius: "6px", color: "#7CC4D6", border: "1px solid #7CC4D6" }}>CURSO</span></div><span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#7CC4D6", boxShadow: "0 0 12px #7CC4D6" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>Tu Camino con la Visa TN</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>Qué es la Visa TN, quién califica y cómo preparar tu proceso paso a paso.</p></div>
<div className="cu-sheen cu-tilt-4" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}><span style={{ fontWeight: "800", fontSize: "13px", color: "#D79AB0" }}>08</span><span style={{ fontWeight: "800", fontSize: "10px", letterSpacing: "1.4px", padding: "4px 8px", borderRadius: "6px", color: "#D79AB0", border: "1px solid #D79AB0" }}>ACCESO</span></div><span style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#D79AB0", boxShadow: "0 0 12px #D79AB0" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>CelsTV</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>Inglés base con episodios, flashcards, audio y quizzes durante todo el programa.</p></div>

</div>
</div>
</section>

{/* WHO IT'S FOR */}
<section style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #1A2C48 0px, #1D304C 33px, #253A55 67px, #314A64 100px, #425F78 133px, #5B798F 167px, #8299A9 200px, #ABBAC3 233px, #C5CED0 267px, #D5D9D6 300px, #E2E1DB 333px, #EBE7DE 367px, #EEE9DF 400px, #ECE6DA 100%)" }}>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#2E6F86" }}>¿PARA QUIÉN ES?</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Para profesionales listos para el siguiente nivel.</h2>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
<div className="cu-raise cu-tilt" style={{ flex: "1 1 300px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "28px 26px", borderRadius: "18px", background: "#FFFFFF", borderTop: "5px solid #3F8FA6" }}><span style={{ width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: "#FFFFFF", background: "#3F8FA6" }}>1</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "21px" }}>Profesionistas en México</h3><p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#45506A" }}>Ingenieros, contadores, administradores y otras profesiones que buscan trabajar en Estados Unidos y quieren entender la Visa TN.</p></div>
<div className="cu-raise cu-tilt-2" style={{ flex: "1 1 300px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "28px 26px", borderRadius: "18px", background: "#FFFFFF", borderTop: "5px solid #C7A24E" }}><span style={{ width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: "#FFFFFF", background: "#C7A24E" }}>2</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "21px" }}>Profesionales en Estados Unidos</h3><p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#45506A" }}>Ya vives aquí y quieres un mejor puesto: necesitas el inglés, el resume y la entrevista a la altura de tu experiencia.</p></div>
<div className="cu-raise cu-tilt-3" style={{ flex: "1 1 300px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "28px 26px", borderRadius: "18px", background: "#FFFFFF", borderTop: "5px solid #B76F86" }}><span style={{ width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: "#FFFFFF", background: "#B76F86" }}>3</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "21px" }}>Emprendedores y líderes</h3><p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#45506A" }}>Haces negocios con clientes o socios en Estados Unidos y quieres comunicarte y presentarte como profesional internacional.</p></div>

</div>
</div>
</section>

{/* PRICING */}
<section id="precios" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #ECE6DA 0px, #E7E3D8 33px, #DBDBD4 67px, #C8CECD 100px, #B0BEC4 133px, #8FA3B1 167px, #63778D 200px, #394D6A 233px, #273652 267px, #1F2A42 300px, #192036 333px, #151A2E 367px, #14182B 400px, #14182B 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#DDBE72" }}>INVERSIÓN</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Un precio. Seis meses. Todo incluido.</h2>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "stretch" }}>
<article className="cu-sheen cu-tilt" style={{ position: "relative", flex: "1.2 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "32px 30px 30px", borderRadius: "22px", color: "#FFFFFF", background: "linear-gradient(135deg, rgba(199,162,78,.22), rgba(63,143,166,.10) 60%, rgba(255,255,255,.04))", border: "1px solid rgba(221,190,114,.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 0 48px -10px rgba(199,162,78,.5), 0 34px 70px -24px rgba(0,0,0,.7)" }}><span style={{ position: "absolute", right: "18px", top: "18px", fontWeight: "800", fontSize: "11px", letterSpacing: "1.2px", color: "#14182B", background: "linear-gradient(180deg,#EBD08C,#C7A24E)", padding: "6px 10px", borderRadius: "7px" }}>PROGRAMA COMPLETO</span><span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#DDBE72" }}>CELSGLOBAL</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>International Business Development</h3><div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}><span style={{ fontWeight: "800", fontSize: "56px", letterSpacing: "-1.5px", lineHeight: "1" }}>{fmtPrice(P, "celsglobal")}</span><span style={{ fontWeight: "700", fontSize: "15px", color: "#C9D3E6" }}>USD · pago único{fmtPlan(P, "celsglobal_plan") ? ` o ${fmtPlan(P, "celsglobal_plan").count} pagos de ${fmtPlan(P, "celsglobal_plan").first}` : ""}</span></div><span style={{ fontSize: "14px", color: "#A9B4CC", fontWeight: "600" }}>Programa de 6 meses · Se cobra en dólares</span><ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E6E9F0" }}><span style={{ display: "flex", color: "#DDBE72" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>English for Business (CelsBSNS) completo</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E6E9F0" }}><span style={{ display: "flex", color: "#DDBE72" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>CV to Resume + Resume Review personalizado</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E6E9F0" }}><span style={{ display: "flex", color: "#DDBE72" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Crack the U.S. Interview Code + Interview Prep</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E6E9F0" }}><span style={{ display: "flex", color: "#DDBE72" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Finanzas Personales</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E6E9F0" }}><span style={{ display: "flex", color: "#DDBE72" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Tu Camino con la Visa TN</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E6E9F0" }}><span style={{ display: "flex", color: "#DDBE72" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>CelsTV para tu inglés base</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E6E9F0" }}><span style={{ display: "flex", color: "#DDBE72" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Ruta guiada de 6 meses</span></li></ul><a href="/comprar/celsglobal" className="cu-btn cu-btn-gold" style={{ marginTop: "auto", alignSelf: "stretch" }}>Inscríbete en CelsGLOBAL <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a></article>
<div className="cu-tilt-2" style={{ flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px", padding: "30px 28px", borderRadius: "22px", background: "linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.03))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#9FB3BE" }}>SI LO COMPRARAS POR SEPARADO</span>
<div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,.12)" }}><span>CelsTV Standard</span><strong>{fmtPrice(P, "celstv_standard")}</strong></div>
<div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,.12)" }}><span>CelsBSNS · English for Business</span><strong>{fmtPrice(P, "celsbsns_standard")}</strong></div>
<div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,.12)" }}><span>+ 6 cursos y servicios profesionales</span><strong style={{ color: "#DDBE72" }}>Incluidos</strong></div>
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C3D0DE" }}>Solo los dos cursos de inglés ya suman {fmtSeparately(P, ["celstv_standard", "celsbsns_standard"])}. Con CelsGLOBAL recibes además tu resume, tu preparación para entrevistas, finanzas personales y la guía de la Visa TN.</p>
<div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "14px", background: "rgba(221,190,114,.10)", border: "1px solid rgba(221,190,114,.3)" }}>
<span style={{ flex: "0 0 auto" }}><svg viewBox="0 0 140 140" width="34" height="34" aria-hidden="true" style={{ display: "block", overflow: "visible" }}><defs><linearGradient id="gTGp" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#2E6F86" /><stop offset=".55" stopColor="#5FB3C8" /><stop offset="1" stopColor="#DDBE72" /></linearGradient><linearGradient id="gRhp" gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="134" y2="0"><stop offset="0" stopColor="#9A5470" /><stop offset="1" stopColor="#CC8AA0" /></linearGradient></defs><path d="M100 32 A 47 47 0 1 0 114 84" fill="none" stroke="url(#gTGp)" strokeWidth="24" strokeLinecap="round" /><path d="M74 78 H 124" fill="none" stroke="url(#gRhp)" strokeWidth="18" strokeLinecap="round" /><path d="M114 64 L 130 78 L 114 92" fill="none" stroke="url(#gRhp)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
<span style={{ fontSize: "14px", lineHeight: "1.5", color: "#E6DCC2" }}>¿Ya tienes CelsTV o CelsBSNS? Escríbenos antes de inscribirte.</span>
</div>
</div>
</div>
</div>
</section>

{/* TESTIMONIALS */}
{SHOW_TESTIMONIALS ? (
<section style={{ position: "relative", overflowX: "clip", padding: "90px 20px 110px", background: "linear-gradient(180deg, #14182B 0px, #14182B 120px, #192540 55%, #1D3352 100%)", color: "#FFFFFF" }}>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#DDBE72" }}>PROFESIONALES CELSGLOBAL</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Historias reales.</h2>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
<figure className="cu-tilt cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px", borderTop: "5px solid #3F8FA6" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsGLOBAL]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Profesión, Ciudad]</figcaption></figure>
<figure className="cu-tilt-2 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px", borderTop: "5px solid #C7A24E" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsGLOBAL]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Profesión, Ciudad]</figcaption></figure>
<figure className="cu-tilt-3 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px", borderTop: "5px solid #B76F86" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsGLOBAL]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Profesión, Ciudad]</figcaption></figure>
</div>
</div>
</section>
) : null}

{/* FAQ */}
<section id="faq" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: SHOW_TESTIMONIALS ? "linear-gradient(180deg, #1D3352 0px, #203655 33px, #27405D 67px, #334E6A 100px, #43607A 133px, #5B798F 167px, #8299A9 200px, #ABBAC3 233px, #C5CED0 267px, #D5D9D6 300px, #E2E1DB 333px, #EBE7DE 367px, #EEE9DF 400px, #ECE6DA 100%)" : "linear-gradient(180deg, #14182B 0px, rgba(29,51,82,0) 140px), linear-gradient(180deg, #1D3352 0px, #203655 33px, #27405D 67px, #334E6A 100px, #43607A 133px, #5B798F 167px, #8299A9 200px, #ABBAC3 233px, #C5CED0 267px, #D5D9D6 300px, #E2E1DB 333px, #EBE7DE 367px, #EEE9DF 400px, #ECE6DA 100%)" }}>
<div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#2E6F86" }}>PREGUNTAS FRECUENTES</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Antes de empezar.</h2>
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
<section id="evaluacion" style={{ padding: "0 20px 96px", background: "#ECE6DA" }}>
<div style={{ position: "relative", overflow: "hidden", maxWidth: "1240px", margin: "0 auto", transform: "perspective(1200px) rotateX(4deg)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 2px 0 #14182B, 0 30px 60px -18px rgba(20,24,43,.5), 0 60px 90px -40px rgba(15,13,30,.45)", background: "linear-gradient(160deg, #23395A 0%, #14182B 80%)", color: "#FFFFFF", borderRadius: "20px", padding: "48px 28px", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<div style={{ position: "relative", flex: "1 1 380px", minWidth: "0", display: "flex", alignItems: "center", gap: "22px" }}>
<span className="cu-g-float" style={{ flex: "0 0 auto" }}><svg viewBox="0 0 140 140" width="72" height="72" aria-hidden="true" style={{ display: "block", overflow: "visible" }}><defs><linearGradient id="gTGc" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#2E6F86" /><stop offset=".55" stopColor="#5FB3C8" /><stop offset="1" stopColor="#DDBE72" /></linearGradient><linearGradient id="gRhc" gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="134" y2="0"><stop offset="0" stopColor="#9A5470" /><stop offset="1" stopColor="#CC8AA0" /></linearGradient></defs><path d="M100 32 A 47 47 0 1 0 114 84" fill="none" stroke="url(#gTGc)" strokeWidth="24" strokeLinecap="round" /><path d="M74 78 H 124" fill="none" stroke="url(#gRhc)" strokeWidth="18" strokeLinecap="round" /><path d="M114 64 L 130 78 L 114 92" fill="none" stroke="url(#gRhc)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: "1.12", letterSpacing: "-0.8px" }}>En 6 meses, otra carrera.</h2>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#C3D0DE" }}>Inscríbete hoy o empieza con la evaluación gratis para saber desde dónde arrancas.</p>
</div>
</div>
<div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: "12px" }}>
<a href="/comprar/celsglobal" className="cu-btn cu-btn-gold">Inscríbete por {fmtPrice(P, "celsglobal")} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
<a href="/evaluacion" className="cu-btn cu-btn-ghost">Evaluación gratis</a>
</div>
</div>
</section>

{/* FOOTER */}
<footer style={{ background: "linear-gradient(180deg, #C6D6E8 0px, #C1D2E5 35px, #B2C6DD 70px, #9CB4D2 105px, #829EC3 140px, #6583AC 175px, #48628A 210px, #2D4269 245px, #202E4F 280px, #19203B 315px, #14162B 350px, #100F21 385px, #0F0D1E 420px)", color: "#FFFFFF", padding: "330px 20px 36px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexWrap: "wrap", gap: "28px 64px" }}>
<div style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}><img src="/site/celsu-logo.png" alt="" loading="lazy" style={{ width: "42px", height: "auto" }} /><span style={{ fontWeight: "800", fontSize: "18px" }}>CelsUniversity</span></div>
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
