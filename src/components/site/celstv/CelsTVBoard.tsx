/* eslint-disable */
// @ts-nocheck
"use client";
// Generated from the approved board CelsTV.dc.html by scripts/board-to-tsx.py, then wired by hand.
import { Component, Fragment } from "react";
import { css } from "@/components/site/css";
import { mxn as fmtMxn, plan as fmtPlan, price as fmtPrice, saving as fmtSaving, separately as fmtSeparately, type SitePrices } from "@/components/site/prices";
import "./celstv.css";

/** Testimonials stay hidden until Matt sends real ones (celsu-website-spec.md: never invent any). */
const SHOW_TESTIMONIALS = false;

export type Episode = { title: string; art: string | null };

export default class CelsTVBoard extends Component<{ episodes: Episode[]; prices: SitePrices }, any> {
  constructor(props) {
    super(props);
    this.state = { menuOpen: false, step: 0, block: 0, faq: 0 };
  }
  componentDidMount() {
    var self = this;
    this._auto = true;
    this._t = setInterval(function () { if (self._auto) self.setState({ step: (self.state.step + 1) % 6 }); }, 3400);
  }
  componentWillUnmount() { clearInterval(this._t); clearTimeout(this._resume); }
  renderVals() {
    var PR = this.props.prices;
    var self = this, s = this.state;
    var STAGE = { Observa: { c: '#D9578F', fg: '#FFFFFF' }, Participa: { c: '#43D6FE', fg: '#0F0D1E' }, Domina: { c: '#B3EC79', fg: '#0F0D1E' } };
    var STEPS = [
      { name: 'CelsVideo', stage: 'Observa', desc: 'El corazón del episodio: una historia corta con personajes reales en situaciones de todos los días. Ves, escuchas y entiendes por contexto.', example: 'En "Let’s eat", los personajes piden comida en un restaurante.' },
      { name: 'CelsCards', stage: 'Participa', desc: 'Flashcards interactivas con audio para fijar el vocabulario del episodio. Volteas, escuchas y repites.', example: 'menu · order · the check · tip' },
      { name: 'CelsBook', stage: 'Participa', desc: 'Un libro digital ilustrado que acompaña la historia, con el vocabulario y las frases clave para repasar a tu ritmo.', example: 'Las escenas del episodio, página por página.' },
      { name: 'CelsAudio', stage: 'Participa', desc: 'El episodio en audio para entrenar tu oído donde estés: en el camión, en el gimnasio o cocinando.', example: 'Escucha, pausa y repite en voz alta.' },
      { name: 'Grammar', stage: 'Domina', desc: 'Actividades interactivas con la gramática que acabas de ver en contexto, explicada en español cuando la necesitas.', example: 'I’m eating · She’s ordering · They’re paying' },
      { name: 'Quiz', stage: 'Domina', desc: 'Un quiz final para comprobar lo que aprendiste antes de pasar al siguiente episodio.', example: '¿Qué significa "Could we get the check, please?"' }
    ];
    var pickStep = function (i) {
      self._auto = false; self.setState({ step: i });
      clearTimeout(self._resume); self._resume = setTimeout(function () { self._auto = true; }, 10000);
    };
    var cur = STEPS[s.step], cs = STAGE[cur.stage];
    var steps = STEPS.map(function (st, i) {
      var on = i === s.step, c = STAGE[st.stage];
      return {
        num: '0' + (i + 1), name: st.name, stage: st.stage, selected: on ? 'true' : 'false', pick: function () { pickStep(i); },
        style: 'display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 16px; cursor: pointer; font-family: inherit; color: #FFFFFF; text-align: left; transition: all .3s ease; ' +
          (on ? 'background: linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.08)); border: 1px solid ' + c.c + '; box-shadow: 0 0 0 3px ' + c.c + '33, 0 18px 36px -16px rgba(0,0,0,.6); transform: translateY(-3px);'
              : 'background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.10);'),
        numStyle: 'flex: 0 0 auto; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; transition: all .3s; ' +
          (on ? 'background: ' + c.c + '; color: ' + c.fg + ';' : 'background: rgba(255,255,255,.12); color: #FFFFFF;')
      };
    });
    // The 32 real episode titles and their artwork (modules of the CelsTV course, from the page).
    var EPS = this.props.episodes || [];
    var TITLES = EPS.map(function (e) { return e.title; });
    var BK = [
      { label: 'Bloque 1', a: '#D98AAE', b: '#B04378', fg: '#FFFFFF' },
      { label: 'Bloque 2', a: '#7FE4FF', b: '#1FB8E8', fg: '#0F0D1E' },
      { label: 'Bloque 3', a: '#CDF39E', b: '#8FD15A', fg: '#0F0D1E' },
      { label: 'Bloque 4', a: '#FFE066', b: '#F6AC00', fg: '#0F0D1E' }
    ];
    var blocks = BK.map(function (b, i) {
      var on = i === s.block;
      return { label: b.label + ' · Ep. ' + (i * 8 + 1) + '–' + (i * 8 + 8), selected: on ? 'true' : 'false', pick: function () { self.setState({ block: i }); },
        style: 'min-height: 44px; padding: 10px 14px; border-radius: 9px; border: none; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 14px; transition: all .2s; ' +
          (on ? 'background: linear-gradient(180deg,#FFFFFF,#E9EEF6); color: #0F0D1E; box-shadow: inset 0 1px 0 #FFFFFF, 0 6px 14px -6px rgba(10,20,40,.4);' : 'background: transparent; color: #4A5A6E;') };
    });
    var bk = BK[s.block];
    var episodes = [];
    for (var k = 0; k < 8; k++) {
      var n = s.block * 8 + k, review = k === 7;
      if (n >= TITLES.length) break;
      episodes.push({
        num: (n + 1 < 10 ? '0' : '') + (n + 1), title: TITLES[n] || '', art: (EPS[n] && EPS[n].art) || null, kicker: review ? 'REPASO DEL BLOQUE' : 'EPISODIO',
        style: 'position: relative; min-height: 170px; display: flex; flex-direction: column; gap: 8px; padding: 20px; border-radius: 18px; animation-delay: ' + (k * 60) + 'ms; ' +
          (review ? 'background: linear-gradient(150deg, #2A2645, #0F0D1E); color: #FFFFFF; box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 0 0 2px ' + bk.b + ', 0 24px 44px -20px rgba(10,20,40,.6);'
                  : 'background: linear-gradient(150deg, ' + bk.a + ', ' + bk.b + '); color: ' + bk.fg + '; box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 24px 44px -20px rgba(10,20,40,.5);'),
        numStyle: 'font-weight: 800; font-size: 44px; line-height: 1; letter-spacing: -2px; opacity: .9;',
        kickerStyle: 'margin-top: auto; font-weight: 700; font-size: 11px; letter-spacing: 1.5px; opacity: .85;'
      });
    }
    var FAQ = [
      { q: '¿Necesito saber inglés para empezar?', a: 'No. CelsTV empieza desde cero en el Episodio 1. Si ya tienes bases, haz la evaluación gratis y te decimos desde qué episodio empezar.' },
      { q: '¿Cuánto tiempo tengo acceso?', a: 'Tu plan incluye un año de acceso desde tu inscripción, en cualquier dispositivo.' },
      { q: '¿Puedo verlo desde mi celular?', a: 'Sí. Funciona en celular, tableta, computadora y TV, y avanzas a tu propio ritmo.' },
      { q: '¿Qué diferencia hay entre Standard y Premium?', a: 'Premium agrega e-books y actividades descargables, clases en vivo cada semana, precio preferente en la Temporada 2 y acceso anticipado a nuevos productos.' },
      { q: '¿Cómo se paga?', a: 'Es un pago único con tarjeta, en dólares. El monto en pesos es solo de referencia; tu banco hace la conversión.' },
      { q: '¿Qué sigue después de los 32 episodios?', a: 'Puedes continuar con la Temporada 2 a precio preferente o, si tu meta es crecer en el trabajo, dar el salto a CelsBSNS: English for Business.' }
    ];
    var faqs = FAQ.map(function (f, i) {
      var open = s.faq === i;
      return { q: f.q, a: f.a, open: open, expanded: open ? 'true' : 'false', toggle: function () { self.setState({ faq: self.state.faq === i ? -1 : i }); },
        iconStyle: 'flex: 0 0 auto; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform .25s ease, background .25s; ' +
          (open ? 'background: #F20174; color: #FFFFFF; transform: rotate(45deg);' : 'background: #F6F5F9; color: #0F0D1E;') };
    });
    return {
      menuOpen: s.menuOpen,
      menuExpanded: s.menuOpen ? 'true' : 'false',
      toggleMenu: function () { self.setState({ menuOpen: !self.state.menuOpen }); },
      steps: steps,
      step: { name: cur.name, stage: cur.stage.toUpperCase(), desc: cur.desc, example: cur.example,
        tagStyle: 'align-self: flex-start; font-weight: 800; font-size: 12px; letter-spacing: 1.5px; padding: 6px 10px; border-radius: 8px; background: ' + cs.c + '; color: ' + cs.fg + ';',
        barStyle: 'height: 100%; width: ' + Math.round((s.step + 1) / 6 * 100) + '%; background: linear-gradient(90deg, #F20174, #43D6FE, #B3EC79); border-radius: 3px; transition: width .4s ease;' },
      blocks: blocks,
      episodes: episodes,
      faqs: faqs
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
<a href="#episodios" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Episodios</a>
<a href="#precios" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Precios</a>
<a href="#funciona" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Cómo funciona</a>
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
<a href="#episodios" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Episodios</a>
<a href="#precios" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Precios</a>
<a href="#funciona" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Cómo funciona</a>
<a href="#faq" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Preguntas</a>
<a href="/entrar" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Iniciar sesión</a>
</div>
</>) : null}
</header>

{/* HERO */}
<section id="inicio" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #CF6A96 0%, #B04378 50%, #8A2E62 100%)", color: "#FFFFFF", padding: "64px 20px 120px" }}>
<span className="cu-beam" aria-hidden="true"></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "-160px", right: "-120px", width: "620px", height: "620px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,214,120,.18) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px 48px", alignItems: "center" }}>
<div style={{ flex: "1 1 460px", minWidth: "0", display: "flex", flexDirection: "column", gap: "20px" }}>
<a href="/#programas" style={{ alignSelf: "flex-start", color: "#FFE3F0", fontWeight: "700", fontSize: "14px", textDecoration: "none" }}>← Todos los programas</a>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#FFE08A" }}>CELSTV · INGLÉS PARA LA VIDA</span>
<h1 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(40px, 5.8vw, 72px)", lineHeight: "1.02", letterSpacing: "-2px" }}>English for Our Generation.</h1>
<p style={{ margin: "0", fontSize: "19px", lineHeight: "1.6", color: "#FFE3F0", maxWidth: "540px" }}>Aprende inglés como ves tu serie favorita: historias reales, música y cultura en episodios cortos. Sin libros aburridos, sin memorizar reglas.</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
<a href="#precios" className="cu-btn cu-btn-dark">Ver planes y precios <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
<a href="/evaluacion" className="cu-btn cu-btn-light">Descubre tu nivel gratis</a>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.16)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }}>32 episodios · Temporada 1</span>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.16)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }}>6 actividades por episodio</span>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.16)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }}>Desde {fmtPrice(P, "celstv_standard")} USD</span>
</div>
</div>
<div aria-hidden="true" style={{ flex: "1 1 420px", minWidth: "0", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "12px 24px" }}>
<span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "200px", height: "200px", flex: "0 0 auto" }}>
<span style={{ position: "absolute", inset: "14px", borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 24px 50px -16px rgba(80,0,40,.55)" }}></span>
<span className="cu-ering" style={{ position: "absolute", width: "172px", height: "172px", borderRadius: "50%", border: "3px solid #FFFFFF" }}></span>
<span className="cu-ering2" style={{ position: "absolute", width: "172px", height: "172px", borderRadius: "50%", border: "3px solid #43D6FE" }}></span>
<span className="cu-ering3" style={{ position: "absolute", width: "172px", height: "172px", borderRadius: "50%", border: "3px solid #FFEF05" }}></span>
<img src="/site/celstv-e.webp" alt="" style={{ position: "relative", height: "136px", width: "auto" }} />
</span>
<img src="/site/celstv-episodes.webp" alt="" style={{ flex: "1 1 260px", minWidth: "0", maxWidth: "440px", height: "auto", filter: "drop-shadow(0 26px 30px rgba(80,0,40,.45))" }} />
</div>
</div>
</section>

{/* HOW EACH EPISODE WORKS */}
<section id="funciona" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #8A2E62 0px, #882E62 33px, #832D62 67px, #7B2B62 100px, #712961 133px, #662661 167px, #5A2260 200px, #4E205A 233px, #421D54 267px, #391B4F 300px, #31194B 333px, #2C1848 367px, #2A1747 400px, #1F1640 70%, #16183A 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "780px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#FF7DB8" }}>CÓMO FUNCIONA CADA EPISODIO</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Observa. Participa. Domina.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#E3D6F0" }}>Cada episodio es una mini temporada de aprendizaje: ves la historia, la practicas de seis formas distintas y la dominas antes de pasar al siguiente.</p>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "stretch" }}>
<div role="tablist" aria-label="Actividades del episodio" style={{ flex: "1 1 420px", minWidth: "0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "12px" }}>
{(v.steps ?? []).map((st: any, __i: number) => (<Fragment key={__i}>
<button type="button" role="tab" aria-selected={st.selected} className="cu-sheen" onClick={st.pick} style={css(st.style)}>
<span style={css(st.numStyle)}>{st.num}</span>
<span style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}><strong style={{ fontSize: "17px", fontWeight: "800" }}>{st.name}</strong><span style={{ fontSize: "13px", opacity: ".8" }}>{st.stage}</span></span>
</button>
</Fragment>))}
</div>
<div className="cu-raise-dark" style={{ flex: "1 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px", padding: "28px", borderRadius: "22px", background: "linear-gradient(135deg, rgba(255,255,255,.14), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.14)" }}>
<div aria-hidden="true" style={{ height: "5px", borderRadius: "3px", background: "rgba(255,255,255,.12)", overflow: "hidden" }}><div style={css(v.step.barStyle)}></div></div>
<span style={css(v.step.tagStyle)}>{v.step.stage}</span>
<h3 className="cu-drop" key={v.step.name} style={{ margin: "0", fontWeight: "800", fontSize: "30px", letterSpacing: "-0.5px" }}>{v.step.name}</h3>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#E3D6F0" }}>{v.step.desc}</p>
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.5", color: "#FFFFFF", background: "rgba(255,255,255,.08)", padding: "12px 14px", borderRadius: "12px" }}><strong>Ejemplo:</strong> {v.step.example}</p>
</div>
</div>
</div>
</section>

{/* EPISODES */}
<section id="episodios" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #16183A 0px, #191A3E 33px, #221F48 67px, #2F2859 100px, #41326E 133px, #564587 167px, #6D64A0 200px, #8584B9 233px, #9DA1CC 267px, #B3BADA 300px, #C5CEE4 333px, #D1DCEB 367px, #D5E1EE 400px, #C6D6E8 100%)" }}>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "200px", right: "-140px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "26px" }}>
<div className="cu-reveal" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#C8005F" }}>TEMPORADA 1</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>32 episodios. 4 bloques. Un repaso al final de cada uno.</h2>
</div>
<div role="tablist" aria-label="Bloques" style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "6px", borderRadius: "12px", background: "rgba(15,13,30,.08)", boxShadow: "inset 0 2px 4px rgba(10,20,40,.12)" }}>
{(v.blocks ?? []).map((bk: any, __i: number) => (<Fragment key={__i}>
<button type="button" role="tab" aria-selected={bk.selected} onClick={bk.pick} style={css(bk.style)}>{bk.label}</button>
</Fragment>))}
</div>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))", gap: "16px" }}>
{(v.episodes ?? []).map((ep: any, __i: number) => (<Fragment key={__i}>
<article className="cu-card cu-sheen cu-optin" style={css(ep.style)}>
{ep.art ? <img src={ep.art} alt="" loading="lazy" decoding="async" width={320} height={180} style={{ display: "block", width: "100%", height: "auto", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "12px", boxShadow: "0 10px 22px -12px rgba(10,20,40,.55)" }} /> : null}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
<span style={css(ep.numStyle)}>{ep.num}</span>
<img src="/site/celstv-e.webp" alt="" style={{ height: "30px", width: "auto" }} />
</div>
<span style={css(ep.kickerStyle)}>{ep.kicker}</span>
<strong style={{ fontWeight: "800", fontSize: "20px", lineHeight: "1.2" }}>{ep.title}</strong>
</article>
</Fragment>))}
</div>
<p style={{ margin: "0", fontSize: "15px", color: "#24384F" }}><strong>Temporada 2, próximamente.</strong> Los alumnos de CelsTV reciben precio preferente y acceso anticipado.</p>
</div>
</section>

{/* WHAT MAKES IT DIFFERENT */}
<section style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #C6D6E8 0px, #C4D6E8 33px, #BDD6E9 67px, #B2D5EB 100px, #A4D5EC 133px, #93D4EE 167px, #7FD3F0 200px, #6AC9EB 233px, #55BFE7 267px, #3FB6E2 300px, #29AFDF 333px, #11ABDD 367px, #00A9DC 400px, #0094C8 100%)" }}>
<span className="cu-beam" aria-hidden="true"></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#0F0D1E" }}>POR QUÉ FUNCIONA</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Nuestra generación aprende diferente.</h2>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "16px" }}>
<div className="cu-raise cu-tilt" style={{ background: "#FFFFFF", borderRadius: "18px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}><span style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#FDE4F0", color: "#C8005F", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="m10 9 4 2-4 2z" /><path d="M8 21h8" /></svg></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Se siente como una serie</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3F3B52" }}>Episodios estilo maratón que quieres seguir viendo, con personajes e historias.</p></div>
<div className="cu-raise cu-tilt-2" style={{ background: "#FFFFFF", borderRadius: "18px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}><span style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#DDF4FF", color: "#0A7FA8", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Inglés real y actual</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3F3B52" }}>Lo que la gente dice de verdad en la calle, el trabajo y las redes, no frases de libro.</p></div>
<div className="cu-raise cu-tilt-3" style={{ background: "#FFFFFF", borderRadius: "18px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}><span style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#EEFADF", color: "#2F6B16", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v10" /><path d="M8 7v6" /><path d="M16 7v6" /><path d="M4 10v3" /><path d="M20 10v3" /><path d="M9 21h6" /><path d="M12 17v4" /></svg></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Pronunciación con Funics</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3F3B52" }}>Nuestro método fonético para que suenes natural: ritmo, sonidos y entonación.</p></div>
<div className="cu-raise cu-tilt-4" style={{ background: "#FFFFFF", borderRadius: "18px", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}><span style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#FFF6C2", color: "#9A5F00", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>En cualquier pantalla</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3F3B52" }}>Celular, tableta, computadora o TV. Avanzas a tu ritmo, donde estés.</p></div>
</div>
</div>
</section>

{/* PLANS */}
<section id="precios" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #0094C8 0px, #0191C5 33px, #0489BD 67px, #087EB1 100px, #0C6FA2 133px, #0E5F91 167px, #0F4F80 200px, #16416E 233px, #18345D 267px, #18284F 300px, #172044 333px, #161A3D 367px, #16183A 400px, #0B1E3A 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "260px", left: "-140px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(242,1,116,.30) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#00CCFE" }}>PLANES Y PRECIOS</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Elige tu plan de CelsTV.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#C9D3E6" }}>Pago único, sin suscripciones. Precios en dólares; el monto en pesos es solo de referencia.</p>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "stretch" }}>
<article className="cu-sheen cu-tilt" style={{ position: "relative", flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "30px 28px 28px", borderRadius: "22px", color: "#FFFFFF", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#FF7DB8" }}>CELSTV</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>Standard</h3><div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}><span style={{ fontWeight: "800", fontSize: "48px", letterSpacing: "-1.5px", lineHeight: "1" }}>{fmtPrice(P, "celstv_standard")}</span><span style={{ fontWeight: "700", fontSize: "15px", color: "#C9D3E6" }}>USD · pago único</span></div><span style={{ fontSize: "14px", color: "#A9B4CC", fontWeight: "600" }}>{fmtMxn(P, "celstv_standard")}{fmtMxn(P, "celstv_standard") ? " · " : ""}se cobra en dólares</span><ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Los 32 episodios de la Temporada 1</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Práctica interactiva de gramática y vocabulario</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Flashcards, quizzes y entrenamiento Funics</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>CELS Audio</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>1 año de acceso en cualquier dispositivo</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Evaluaciones periódicas</span></li></ul><a href="/comprar/resumen?producto=celstv_standard" className="cu-btn cu-btn-light" style={{ marginTop: "auto", alignSelf: "stretch" }}>Inscríbete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a></article>
<article className="cu-sheen cu-tilt-2" style={{ position: "relative", flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "30px 28px 28px", borderRadius: "22px", color: "#FFFFFF", background: "linear-gradient(135deg, rgba(242,1,116,.22), rgba(255,255,255,.06))", border: "1px solid rgba(255,120,180,.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 0 44px -8px rgba(242,1,116,.55), 0 34px 70px -24px rgba(0,0,0,.7)" }}><span style={{ position: "absolute", right: "18px", top: "18px", fontWeight: "800", fontSize: "11px", letterSpacing: "1.2px", color: "#FFFFFF", background: "linear-gradient(180deg,#FF3D97,#D9006A)", padding: "6px 10px", borderRadius: "7px", boxShadow: "0 6px 14px -4px rgba(242,1,116,.6)" }}>RECOMENDADO</span><span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#FF7DB8" }}>CELSTV</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>Premium</h3><div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}><span style={{ fontWeight: "800", fontSize: "48px", letterSpacing: "-1.5px", lineHeight: "1" }}>{fmtPrice(P, "celstv_premium")}</span><span style={{ fontWeight: "700", fontSize: "15px", color: "#C9D3E6" }}>USD · pago único</span></div><span style={{ fontSize: "14px", color: "#A9B4CC", fontWeight: "600" }}>{fmtMxn(P, "celstv_premium")}{fmtMxn(P, "celstv_premium") ? " · " : ""}se cobra en dólares</span><ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Todo lo de Standard</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>E-books y actividades descargables</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Clases en vivo cada semana</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Precio preferente en la Temporada 2</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Acceso anticipado a nuevos productos</span></li></ul><a href="/comprar/resumen?producto=celstv_premium" className="cu-btn cu-btn-pink" style={{ marginTop: "auto", alignSelf: "stretch" }}>Inscríbete en Premium <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a></article>
</div>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "22px" }}>¿Quieres más? Combínalo y ahorra</h3>
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
<a href="/comprar/resumen?producto=bundle_tv_bsns" className="cu-btn cu-btn-light cu-btn-sm">Obtener paquete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</article>
<article className="cu-sheen" style={{ flex: "1 1 360px", minWidth: "0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 24px", padding: "22px 24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 24px 48px -24px rgba(0,0,0,.6)", border: "1px solid rgba(255,255,255,.12)" }}>
<div style={{ flex: "1 1 200px", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#7FB8FF" }}>CELSUS + CELSTV · PREMIUM</span>
<strong style={{ fontWeight: "800", fontSize: "20px" }}>Ciudadanía e inglés para tu vida en EE.UU.</strong>
<span style={{ fontSize: "14px", color: "#C9D3E6" }}>Cívica y entrevista, más inglés práctico para el trabajo, las compras y el doctor.</span>
</div>
<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
<span style={{ fontWeight: "800", fontSize: "32px", lineHeight: "1" }}>{fmtPrice(P, "bundle_us_tvpremium")} <span style={{ fontSize: "14px", color: "#C9D3E6" }}>USD</span> <s style={{ fontSize: "16px", color: "#8F8AA8", fontWeight: "600" }}>{fmtSeparately(P, ["celsus_completo", "celstv_premium"])}</s></span>
<span style={{ fontSize: "13px", fontWeight: "700", color: "#B3EC79" }}>Ahorras {fmtSaving(P, "bundle_us_tvpremium", ["celsus_completo", "celstv_premium"])} USD</span>
<a href="/comprar/resumen?producto=bundle_us_tvpremium" className="cu-btn cu-btn-light cu-btn-sm">Obtener paquete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</article>
</div>
</div>
</div>
</section>

{/* TESTIMONIALS (hidden until real ones arrive) */}
{SHOW_TESTIMONIALS ? (<>
<section style={{ position: "relative", overflowX: "clip", padding: "90px 20px 110px", background: "linear-gradient(180deg, #0B1E3A 0px, #0B1E3A 120px, #16183A 55%, #2A1747 100%)", color: "#FFFFFF" }}>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#F6AC00" }}>ALUMNOS DE CELSTV</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Historias reales.</h2>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
<figure className="cu-tilt cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsTV]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad]</figcaption></figure>
<figure className="cu-tilt-2 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsTV]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad]</figcaption></figure>
<figure className="cu-tilt-3 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsTV]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad]</figcaption></figure>
</div>
</div>
</section>
</>) : null}

{/* FAQ */}
<section id="faq" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #2A1747 0px, #2C194A 33px, #321E53 67px, #3A2760 100px, #463271 133px, #564587 167px, #6D64A0 200px, #8584B9 233px, #9DA1CC 267px, #B3BADA 300px, #C5CEE4 333px, #D1DCEB 367px, #D5E1EE 400px, #C6D6E8 100%)" }}>
<div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#1E4877" }}>PREGUNTAS FRECUENTES</span>
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
<section id="evaluacion" style={{ padding: "0 20px 96px", background: "#C6D6E8" }}>
<div style={{ position: "relative", overflow: "hidden", maxWidth: "1240px", margin: "0 auto", transform: "perspective(1200px) rotateX(4deg)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #8A2E62, 0 30px 60px -18px rgba(120,30,80,.4), 0 60px 90px -40px rgba(15,13,30,.45)", background: "linear-gradient(180deg, #CF6A96 0%, #B04378 50%, #8A2E62 100%)", color: "#FFFFFF", borderRadius: "20px", padding: "48px 28px", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between" }}>
<span className="cu-beam" aria-hidden="true"></span>
<img src="/site/celstv-e.webp" alt="" aria-hidden="true" style={{ position: "absolute", right: "30px", bottom: "-40px", height: "220px", width: "auto", opacity: ".22" }} />
<div style={{ position: "relative", flex: "1 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: "1.12", letterSpacing: "-0.8px" }}>¿No sabes por dónde empezar?</h2>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#FFE3F0" }}>Haz la evaluación gratis en 10 minutos y te decimos desde qué episodio empezar.</p>
</div>
<a href="/evaluacion" className="cu-btn cu-btn-dark">Empezar mi evaluación <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</section>

{/* FOOTER */}
<footer style={{ background: "linear-gradient(180deg, #C6D6E8 0px, #C1D2E5 35px, #B2C6DD 70px, #9CB4D2 105px, #829EC3 140px, #6583AC 175px, #48628A 210px, #2D4269 245px, #202E4F 280px, #19203B 315px, #14162B 350px, #100F21 385px, #0F0D1E 420px)", color: "#FFFFFF", padding: "330px 20px 36px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexWrap: "wrap", gap: "28px 64px" }}>
<div style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}><img src="/site/celsu-logo.png" alt="" style={{ width: "42px", height: "auto" }} /><span style={{ fontWeight: "800", fontSize: "18px" }}>CelsUniversity</span></div>
<div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#CFCBDB", fontWeight: "600" }}>Una empresa de <img src="/site/lam-logo.png" alt="Latin American Media" style={{ height: "22px", width: "auto" }} /></div>
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
