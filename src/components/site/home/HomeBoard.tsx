/* eslint-disable */
// @ts-nocheck
"use client";
// Generated from the approved board Main.dc.html by scripts/board-to-tsx.py, then wired by hand.
import { Component, Fragment, memo } from "react";
import { css } from "@/components/site/css";
import { enrollHref } from "@/lib/enroll";
import { mxn as fmtMxn, plan as fmtPlan, price as fmtPrice, saving as fmtSaving, separately as fmtSeparately, type SitePrices } from "@/components/site/prices";
import "./home.css";

// Everything below the hero only depends on the state it shows. The hero word turns every 2.6 s and
// the intro tags light up one by one; without this the whole page re-rendered each time (Lighthouse:
// total blocking time, and jank on phones).
const HERO_ONLY = ["wordIdx", "tagStep", "play", "menuOpen"];
const Keep = memo(
  ({ children }: { deps: Record<string, unknown>; children: React.ReactNode }) => <>{children}</>,
  (a, b) => Object.keys(b.deps).every((k) => HERO_ONLY.includes(k) || a.deps[k] === b.deps[k]) && a.prices === b.prices,
);

// Testimonials stay hidden until there are real ones (celsu-website-spec.md).
const SHOW_TESTIMONIALS = false;
// The home page isn't a program's #planes section: its plan and bundle buttons go through /inscribirme
// (Matt, 2026-10-20), carrying the plan's product code (&plan=). Bundles open with their main program
// (CelsTV + CelsBSNS → CelsBSNS, CelsUS + CelsTV → CelsUS).
const HOME_TAB_PROGRAM = { tv: 'celstv', bsns: 'celsbsns', us: 'celsus', ibd: 'celsglobal' };

export default class MainBoard extends Component<{ prices: SitePrices }, any> {
  constructor(props) {
    super(props);
    this.Q = [
      { prog: 'CelsTV', color: '#C8005F', bg: '#FDE4F0', ctx: 'Episodio 6 · Let\u2019s Eat!', say: "I'm looking forward to it!", prompt: '¿Qué significa?', opts: ['Lo espero con muchas ganas', 'Estoy mirando hacia adelante', 'Ya se me olvidó'], a: 0, why: '"Look forward to" = esperar algo con ilusión.', audio: '/site/home-quiz-1.mp4', wt: [0.0, 0.209, 0.476, 0.778, 0.929] },
      { prog: 'CelsTV', color: '#C8005F', bg: '#FDE4F0', ctx: 'Episodio 6 · Let\u2019s Eat!', say: 'Could we get the check, please?', prompt: '¿Qué está pidiendo?', opts: ['Un cheque del banco', 'La cuenta del restaurante', 'Revisar la comida'], a: 1, why: 'En un restaurante, "the check" es la cuenta.', audio: '/site/home-quiz-2.mp4', wt: [0.0, 0.244, 0.325, 0.453, 0.557, 0.824] },
      { prog: 'CelsBSNS', color: '#2C6BC4', bg: '#E1ECFB', ctx: 'Reuniones', say: "Let's touch base next week.", prompt: '¿Qué propone?', opts: ['Hablar de nuevo la próxima semana', 'Jugar béisbol la próxima semana', 'Cancelar el proyecto'], a: 0, why: '"Touch base" = ponerse en contacto brevemente.', audio: '/site/home-quiz-3.mp4', wt: [0.0, 0.325, 0.569, 0.824, 1.022] },
      { prog: 'CelsUS', color: '#194876', bg: '#E0EAF5', ctx: 'Entrevista de ciudadanía', say: 'Do you promise to tell the truth?', prompt: '¿Qué te pregunta el oficial?', opts: ['Si prometes decir la verdad', 'Si tienes prisa', 'Si traes tus documentos'], a: 0, why: 'El oficial te pide prometer que dirás la verdad.', audio: '/site/home-quiz-4.mp4', wt: [0.0, 0.197, 0.348, 0.72, 0.824, 1.01, 1.115] },
      { prog: 'CelsBSNS', color: '#2C6BC4', bg: '#E1ECFB', ctx: 'Correos', say: 'Please find the report attached.', prompt: '¿Qué significa?', opts: ['Por favor busca el reporte', 'Adjunto encontrarás el reporte', 'El reporte está perdido'], a: 1, why: 'Frase común en correos: "Adjunto encontrarás…".', audio: '/site/home-quiz-5.mp4', wt: [0.0, 0.418, 0.65, 0.766, 1.045] }
    ];
    this._timers = [];
    this.state = { goal: 'everyday', qi: 0, answer: null, score: 0, done: false, started: false, tagStep: -1, priceTab: 'tv', jStage: 0, jPlaying: true, phase: 'speak', spoken: 0, speaking: false, level: 'B1', wordIdx: 0, menuOpen: false, play: 0, voiceName: 'del navegador' };
  }
  componentDidMount() {
    // The board's setup (intro sequence, Ana's path, voices) waits until the page is idle, so it
    // doesn't compete with the first paint and hydration (Lighthouse: total blocking time).
    var self = this;
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
    idle(function () { if (!self._unmounted) self._mount(); }, { timeout: 1500 });
  }
  _mount() {
    var self = this;
    this._t = setInterval(function () { self.setState({ wordIdx: (self.state.wordIdx + 1) % 4 }); }, 2600);
    try { this._ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    var silent = !this._ac || this._ac.state !== 'running';
    this._intro();
    this._onResize = function () { if (self._jReady) self._jDraw(self._jPos); };
    window.addEventListener('resize', this._onResize);
    try {
      this._io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { var was = self._jVisible; self._jVisible = e.isIntersecting; if (e.isIntersecting && !was) { self._jSetup(); self._jLoop(); } });
      }, { threshold: 0.35 });
      setTimeout(function () { if (self._jSection) self._io.observe(self._jSection); }, 300);
    } catch (e) { this._jVisible = true; setTimeout(function () { self._jLoop(); }, 1200); }
    this._unlock = function () {
      window.removeEventListener('pointerdown', self._unlock, true);
      window.removeEventListener('keydown', self._unlock, true);
      try { if (self._ac && self._ac.state !== 'running') self._ac.resume(); } catch (e) {}
      if (silent) setTimeout(function () { self._intro(); }, 120);
    };
    window.addEventListener('pointerdown', this._unlock, true);
    window.addEventListener('keydown', this._unlock, true);
    try {
      var choose = function () {
        var vs = window.speechSynthesis.getVoices().filter(function (v) { return /^en[-_]US/i.test(v.lang); });
        var prefs = [/natural/i, /neural/i, /online/i, /Google US English/i, /\bAva\b/i, /Samantha/i, /Aria/i, /Jenny/i, /Allison/i];
        var pick = null;
        for (var i = 0; i < prefs.length && !pick; i++) { pick = vs.filter(function (v) { return prefs[i].test(v.name); })[0] || null; }
        self._voice = pick || vs[0] || null;
        if (self._voice) self.setState({ voiceName: self._voice.name });
      };
      choose();
      window.speechSynthesis.onvoiceschanged = choose;
    } catch (e) {}
  }
  _intro() {
    var self = this;
    (this._introT || []).forEach(clearTimeout);
    this._introT = [];
    this.setState({ tagStep: -1 });
    [784, 988, 1319].forEach(function (f, i) {
      self._introT.push(setTimeout(function () { self.setState({ tagStep: i }); self._tone(f, 0, .5, .11, 'triangle'); self._tone(f * 2, 0.02, .25, .03, 'sine'); }, 450 + i * 650));
    });
  }
  _jSetup() {
    var self = this;
    if (this._jReady || !this._trail || !this._box) return;
    try {
      var path = this._trail, L = path.getTotalLength(), P = [[80, 250], [270, 200], [460, 215], [650, 140], [840, 118], [1010, 60]];
      // Nearest point on the path for each level: sample the path once (coarse), then refine around each match.
      var pts = [];
      for (var l = 0; l <= L; l += 8) { var q = path.getPointAtLength(l); pts.push([l, q.x, q.y]); }
      var lens = P.map(function (p) {
        var best = 0, bd = 1e9;
        pts.forEach(function (s) { var d = (s[1] - p[0]) * (s[1] - p[0]) + (s[2] - p[1]) * (s[2] - p[1]); if (d < bd) { bd = d; best = s[0]; } });
        for (var k = Math.max(0, best - 8); k <= Math.min(L, best + 8); k += 1) { var q = path.getPointAtLength(k); var d = (q.x - p[0]) * (q.x - p[0]) + (q.y - p[1]) * (q.y - p[1]); if (d < bd) { bd = d; best = k; } }
        return best;
      });
      this._jL = L; this._jLens = lens; this._jPos = lens[0]; this._jReady = true;
      path.style.strokeDasharray = L + ' ' + L;
      this._jDraw(lens[0]);
    } catch (e) {}
  }
  _jDraw(l) {
    try {
      var p = this._trail.getPointAtLength(l), w = this._box.clientWidth, h = this._box.clientHeight;
      this._walker.style.transform = 'translate(' + (p.x / 1200 * w) + 'px,' + (p.y / 330 * h) + 'px)';
      this._trail.style.strokeDashoffset = (this._jL - l);
    } catch (e) {}
  }
  _jGo(stage, then) {
    var self = this;
    this._jSetup();
    if (!this._jReady) { this.setState({ jStage: stage }); if (then) then(); return; }
    if (this._jRaf) cancelAnimationFrame(this._jRaf);
    var from = this._jPos, to = this._jLens[stage], t0 = null, dur = Math.max(500, Math.min(1600, Math.abs(to - from) * 5));
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), l = from + (to - from) * ease(k);
      self._jPos = l; self._jDraw(l);
      if (k < 1) self._jRaf = requestAnimationFrame(step);
      else { self.setState({ jStage: stage }); try { if (self._ac && self._ac.state === 'running') self._tone([523, 587, 659, 784, 880, 1047][stage], 0, .35, .06, 'triangle'); } catch (e) {} if (then) then(); }
    };
    this._jRaf = requestAnimationFrame(step);
  }
  _jLoop() {
    var self = this;
    clearTimeout(this._jT);
    if (!this.state.jPlaying || !this._jVisible) return;
    var next = this.state.jStage >= 5 ? 0 : this.state.jStage + 1;
    var wait = this.state.jStage >= 5 ? 3800 : 2600;
    this._jT = setTimeout(function () {
      if (!self.state.jPlaying || !self._jVisible) return;
      if (next === 0) { self._jPos = self._jLens ? self._jLens[0] : 0; self._jDraw(self._jPos); self.setState({ jStage: 0 }); self._jLoop(); }
      else self._jGo(next, function () { self._jLoop(); });
    }, wait);
  }
  _later(fn, ms) { this._timers.push(setTimeout(fn, ms)); }
  _clear() { this._timers.forEach(clearTimeout); this._timers = []; try { window.speechSynthesis.cancel(); } catch (e) {} if (this._audio) { try { this._audio.pause(); } catch (e) {} } }
  _tone(freq, at, dur, vol, type) {
    try {
      if (!this._ac) this._ac = new (window.AudioContext || window.webkitAudioContext)();
      var ac = this._ac, t = ac.currentTime + (at || 0);
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + (dur || 0.25) + 0.05);
    } catch (e) {}
  }
  _speak(qi, onDone) {
    var self = this, q = this.Q[qi], words = q.say.split(' ');
    var starts = []; var c = 0; words.forEach(function (w) { starts.push(c); c += w.length + 1; });
    var total = q.say.length, gotBoundary = false, ended = false;
    this.setState({ spoken: 0, speaking: true });
    var finish = function () { if (ended) return; ended = true; self.setState({ spoken: words.length, speaking: false }); if (onDone) onDone(); };
    var timed = function (per) { words.forEach(function (w, i) { self._later(function () { if (!ended) self.setState({ spoken: i + 1 }); }, i * per); }); self._later(finish, words.length * per + 250); };
    var byChar = function (ci) { var n = 0; for (var i = 0; i < starts.length; i++) if (starts[i] <= ci) n = i + 1; if (n > self.state.spoken) self.setState({ spoken: n }); };
    try {
      if (q.audio) {
        var au = new Audio(q.audio); this._audio = au;
        au.ontimeupdate = function () { if (q.wt) { var n = 0; for (var i = 0; i < q.wt.length; i++) if (q.wt[i] <= au.currentTime + 0.04) n = i + 1; if (n > self.state.spoken) self.setState({ spoken: n }); } else if (au.duration) byChar(Math.floor((au.currentTime / au.duration) * total)); };
        au.onended = finish;
        var pr = au.play(); if (pr && pr.catch) pr.catch(function () { timed(380); });
        return;
      }
      var u = new SpeechSynthesisUtterance(q.say);
      u.lang = 'en-US'; u.rate = 0.92; u.pitch = 1.05;
      if (this._voice) u.voice = this._voice;
      u.onboundary = function (e) { gotBoundary = true; byChar(e.charIndex); };
      u.onend = function () { self._later(finish, 150); };
      u.onerror = function () { if (!gotBoundary) timed(380); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      this._later(function () { if (!gotBoundary && self.state.spoken === 0) timed(360); }, 700);
      this._later(finish, words.length * 650 + 2500);
    } catch (e) { timed(380); }
  }
  _play(qi) {
    var self = this;
    this._clear();
    this.setState({ qi: qi, started: true, done: false, phase: 'speak', answer: null });
    this._speak(qi, function () {
      self._later(function () { self.setState({ phase: 'ask' }); self._tone(523, 0, .18, .08); }, 300);
      self._later(function () {
        self.setState({ phase: 'opts' });
        [784, 988, 1175].forEach(function (f, i) { self._tone(f, i * 0.17, .22, .1, 'triangle'); });
      }, 850);
    });
  }
  componentWillUnmount() { this._unmounted = true; clearTimeout(this._jT); if (this._jRaf) cancelAnimationFrame(this._jRaf); if (this._io) this._io.disconnect(); window.removeEventListener('resize', this._onResize); (this._introT || []).forEach(clearTimeout); if (this._unlock) { window.removeEventListener('pointerdown', this._unlock, true); window.removeEventListener('keydown', this._unlock, true); } this._clear(); if (this._t) clearInterval(this._t); }
  renderVals() {
    var PR = this.props.prices;
    var self = this;
    var s = this.state;
    var burst = function (list) {
      return list.map(function (b) {
        var sparks = [];
        for (var k = 0; k < 14; k++) sparks.push({ style: '--a: ' + (k * 360 / 14) + 'deg; --d: ' + b.d + 's; --r: ' + (b.r * (k % 2 ? 0.82 : 1)) + 'px;' });
        return { style: 'left: ' + b.x + '%; top: ' + b.y + '%; color: ' + b.c + '; --d: ' + b.d + 's; opacity: ' + b.op + '; transform: scale(' + b.sc + ');', sparks: sparks };
      });
    };
    var heroWords = ['carrera.', 'negocio.', 'ciudadanía.', 'inglés.'];
    var recs = {
      everyday: { kind: 'tv', tag: 'CELSTV · INGLÉS PARA LA VIDA', text: '#C8005F', tint: '#FDF0F6', name: 'English for Our Generation', short: 'CelsTV', price: 'Desde ' + fmtPrice(PR, 'celstv_standard') + ' USD', blurb: 'Aprende inglés para tu día a día con una serie en video: historias, música y cultura, en episodios cortos.', note: '', href: '/celstv' },
      work: { kind: 'bsns', tag: 'CELSBSNS · INGLÉS DE NEGOCIOS', text: '#2C6BC4', tint: '#0F0D1E', name: 'English for Business', short: 'CelsBSNS', price: 'Desde ' + fmtPrice(PR, 'celsbsns_standard') + ' USD', blurb: '10 semanas para dominar juntas, correos, presentaciones y entrevistas en inglés.', note: 'Requiere nivel B2. Si aún no lo tienes, te recomendamos el paquete CelsTV + CelsBSNS.', href: '/celsbsns' },
      citizen: { kind: 'us', tag: 'CELSUS · CIUDADANÍA', text: '#1E4877', tint: '#0A2340', name: 'CelsUS Para Ciudadanía', short: 'CelsUS', price: 'Desde ' + fmtPrice(PR, 'celsus_estandar') + ' USD', blurb: 'Las 128 preguntas de cívica con audio, inglés para la entrevista y simulacros, en inglés y español.', note: '', href: '/celsus' },
      intl: { kind: 'ph', tag: 'CELSGLOBAL · DESARROLLO INTERNACIONAL', text: '#3F8FA6', tint: 'linear-gradient(160deg, #23395A, #14182B)', name: 'International Business Development', short: 'CelsGLOBAL', price: fmtPrice(PR, 'celsglobal') + ' USD · 6 meses', blurb: 'Inglés de negocios, resume al estilo americano, entrevistas, finanzas personales y tu camino con la Visa TN, en un programa guiado de 6 meses.', note: '', href: '/celsglobal' }
    };
    var tiles = [
      { id: 'everyday', label: 'Inglés para la vida', program: 'CelsTV · English for Our Generation', kind: 'tv', tint: '#FDE4F0', ring: '#F20174', featured: true },
      { id: 'work', label: 'Crecer en mi trabajo', program: 'CelsBSNS · English for Business', kind: 'bsns', tint: '#0F0D1E', ring: '#43D6FE', featured: false },
      { id: 'citizen', label: 'Mi ciudadanía', program: 'CelsUS · English for Us', kind: 'us', tint: '#194876', ring: '#B3EC79', featured: false },
      { id: 'intl', label: 'Negocios internacionales', program: 'CelsGLOBAL · International Business Development', kind: 'ibd', tint: 'linear-gradient(160deg, #23395A, #14182B)', ring: '#C7A24E', featured: false }
    ];
    var goals = tiles.map(function (t, i) {
      var on = t.id === s.goal;
      var dark = t.kind === 'bsns' || t.kind === 'us' || t.kind === 'ibd';
      return {
        label: t.label, program: t.program, num: '0' + (i + 1), featured: t.featured, usOn: on && t.kind === 'us',
        isTV: t.kind === 'tv', isBSNS: t.kind === 'bsns', isUS: t.kind === 'us', isIBD: t.kind === 'ibd',
        numColor: dark ? 'rgba(255,255,255,.75)' : '#4A5A6E',
        pressed: on ? 'true' : 'false',
        pick: function () { self.setState({ goal: t.id }); },
        tileStyle: 'display: flex; flex-direction: column; padding: 0; border: none; border-radius: 18px; overflow: hidden; cursor: pointer; text-align: left; background: #FFFFFF; font-family: inherit; ' +
          (on ? 'outline: 3px solid ' + t.ring + '; outline-offset: 3px; transform: translateY(-6px); box-shadow: inset 0 1px 0 #FFFFFF, 0 30px 50px -18px rgba(10,20,40,.5);'
              : 'box-shadow: inset 0 1px 0 #FFFFFF, 0 2px 4px rgba(10,20,40,.08), 0 18px 36px -18px rgba(10,20,40,.35);'),
        artStyle: 'position: relative; overflow: hidden; height: 130px; display: flex; align-items: center; justify-content: center; background: ' + t.tint + ';',
        checkStyle: 'position: absolute; right: 12px; top: 12px; z-index: 2; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; ' +
          (on ? 'background: ' + t.ring + '; color: ' + (t.kind === 'everyday' ? '#FFFFFF' : '#0F0D1E') + '; box-shadow: 0 4px 10px rgba(0,0,0,.25);' : 'background: rgba(255,255,255,.85); color: transparent; border: 2px solid rgba(15,13,30,.25);')
      };
    });
    var r = recs[s.goal];
    var rec = {
      tag: r.tag, name: r.name, short: r.short, price: r.price, blurb: r.blurb, note: r.note, hasNote: !!r.note, href: r.href,
      isTV: r.kind === 'tv', isBSNS: r.kind === 'bsns', isUS: r.kind === 'us', isPlaceholder: r.kind === 'ph',
      artStyle: 'position: relative; overflow: hidden; flex: 1 1 380px; min-height: 280px; border-radius: 14px; background: ' + r.tint + '; display: flex; align-items: center; justify-content: center; transition: background .3s;',
      tagStyle: 'font-weight: 700; font-size: 12px; letter-spacing: 1.5px; color: ' + r.text + ';'
    };
    var lv = [
      { code: 'A1', name: 'Principiante', can: 'Saludas, te presentas y entiendes frases muy simples.', course: 'CelsTV, desde el Episodio 1' },
      { code: 'A2', name: 'Básico', can: 'Hablas de tu rutina, haces compras y pides direcciones.', course: 'CelsTV' },
      { code: 'B1', name: 'Intermedio', can: 'Mantienes conversaciones cotidianas y cuentas experiencias.', course: 'Paquete CelsTV + CelsBSNS' },
      { code: 'B2', name: 'Intermedio alto', can: 'Participas en juntas, das opiniones y escribes correos profesionales.', course: 'CelsBSNS: English for Business' },
      { code: 'C1', name: 'Avanzado', can: 'Presentas, negocias y te expresas con fluidez y precisión.', course: 'CelsBSNS + CelsGLOBAL' },
      { code: 'C2', name: 'Maestría', can: 'Te comunicas con total dominio en cualquier contexto profesional.', course: 'CelsGLOBAL' }
    ];
    var idx = 0;
    lv.forEach(function (l, i) { if (l.code === s.level) idx = i; });
    var levels = lv.map(function (l, i) {
      var on = i === idx;
      return {
        code: l.code,
        pressed: on ? 'true' : 'false',
        pick: function () { self.setState({ level: l.code }); },
        style: 'flex: 1 1 0; min-width: 0; min-height: 52px; border-radius: 10px; cursor: pointer; font-weight: 800; font-size: 16px; transition: all .2s; ' +
          (on ? 'background: #0F0D1E; color: #FFFFFF; border: 1px solid #0F0D1E;' : (i < idx ? 'background: #E5F9FF; color: #0F0D1E; border: 1px solid #BFEFFC;' : 'background: #FFFFFF; color: #6B6680; border: 1px solid #ECEAF2;'))
      };
    });
    var cur = lv[idx];
    var pct = Math.round(((idx + 1) / 6) * 100);
    var Q = this.Q;
    var q = Q[Math.min(s.qi, Q.length - 1)];
    var base = 'display: flex; align-items: center; gap: 14px; text-align: left; min-height: 56px; padding: 12px 16px; border-radius: 14px; font-weight: 600; font-size: 16px; cursor: pointer; font-family: inherit; ';
    var letters = ['A', 'B', 'C'];
    var options = q.opts.map(function (t, i) {
      var st, bs = 'flex: 0 0 auto; width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; ';
      if (s.answer === null) { st = base + 'background: linear-gradient(180deg,#FFFFFF,#F4F6FA); color: #0F0D1E; border: 1px solid #CFCBDB; box-shadow: inset 0 1px 0 #FFFFFF, 0 8px 18px -12px rgba(10,20,40,.45);'; bs += 'background: #0F0D1E; color: #FFFFFF;'; }
      else if (i === q.a) { st = base + 'background: #EAF8DD; color: #1F4D0E; border: 1px solid #6FB43F; box-shadow: 0 0 0 3px rgba(111,180,63,.25);'; bs += 'background: #4E9A2A; color: #FFFFFF;'; }
      else if (i === s.answer) { st = base + 'background: #FDF0F6; color: #8F0044; border: 1px solid #F20174;'; bs += 'background: #F20174; color: #FFFFFF;'; }
      else { st = base + 'background: #FFFFFF; color: #8A8599; border: 1px solid #ECEAF2;'; bs += 'background: #ECEAF2; color: #8A8599;'; }
      return {
        text: t, letter: letters[i], badgeStyle: bs,
        cls: 'cu-opt cu-optin' + (s.answer === null ? ' cu-opt-live' : ''),
        style: st + ' animation-delay: ' + (i * 170) + 'ms;',
        pick: function () {
          if (self.state.answer !== null) return;
          var ok = i === q.a;
          if (ok) { self._tone(659, 0, .2, .1, 'triangle'); self._tone(988, .1, .35, .1, 'triangle'); } else { self._tone(196, 0, .35, .12, 'sawtooth'); }
          self.setState({ answer: i, score: self.state.score + (ok ? 1 : 0) });
        }
      };
    });
    var right = s.answer === q.a;
    var dots = Q.map(function (x, i) {
      var c = s.done || i < s.qi ? '#0F0D1E' : (i === s.qi && s.started ? '#00CCFE' : '#E2E6EE');
      return { style: 'flex: 1; height: 6px; border-radius: 3px; background: ' + c + '; transition: background .3s;' };
    });
    var wl = q.say.split(' ');
    var words = wl.map(function (t, i) {
      var on = i < s.spoken, cur = s.speaking && i === s.spoken - 1;
      return { t: t, cls: 'cu-wd ' + (on ? 'cu-wd-on' : 'cu-wd-off'), style: cur ? 'color: #FF4FA3;' : 'color: #FFFFFF;' };
    });
    var verdicts = ['Buen comienzo. CelsTV te da las bases desde el Episodio 1.', 'Buen comienzo. CelsTV te da las bases desde el Episodio 1.', 'Vas bien. Con CelsTV ganarás fluidez rápidamente.', '¡Muy bien! Tienes una base sólida; la evaluación te dirá tu nivel exacto.', '¡Excelente! Podrías estar listo para CelsBSNS.', '¡Perfecto! Haz la evaluación para confirmar tu nivel.'];
    var quiz = {
      dots: dots, intro: !s.started, active: s.started && !s.done, done: s.done,
      words: words, speaking: s.speaking, notSpeaking: !s.speaking,
      spkClass: 'cu-btn cu-btn-pink' + (s.speaking ? ' cu-pulse' : ''),
      showPrompt: s.phase !== 'speak', showOpts: s.phase === 'opts',
      prog: q.prog, ctx: q.ctx, pos: (s.qi + 1) + ' de ' + Q.length, say: q.say, prompt: q.prompt, why: q.why,
      progStyle: 'font-weight: 800; font-size: 12px; letter-spacing: 1.2px; color: ' + q.color + '; background: ' + q.bg + '; padding: 6px 10px; border-radius: 8px;',
      options: options, answered: s.answer !== null,
      fbTitle: right ? 'Correcto' : 'Casi',
      fbStyle: 'display: flex; flex-wrap: wrap; align-items: center; gap: 12px; border-radius: 12px; padding: 16px; color: #0F0D1E; ' + (right ? 'background: #F1FAE8;' : 'background: #FDF0F6;'),
      nextLabel: s.qi < Q.length - 1 ? 'Siguiente frase' : 'Ver mi resultado',
      score: s.score, verdict: verdicts[s.score]
    };
    return {
      menuOpen: s.menuOpen,
      menuExpanded: s.menuOpen ? 'true' : 'false',
      toggleMenu: function () { self.setState({ menuOpen: !self.state.menuOpen }); },
      playA: s.play % 2 === 0,
      playB: s.play % 2 === 1,
      replay: function () { self.setState({ play: self.state.play + 1 }); },
      tags: [
        { label: 'APRENDE', bg: '#D6006A', fg: '#FFFFFF', glow: 'rgba(242,1,116,.55)' },
        { label: 'CRECE', bg: '#B3EC79', fg: '#0F0D1E', glow: 'rgba(120,200,60,.55)' },
        { label: 'CONECTA', bg: '#FFEF05', fg: '#0F0D1E', glow: 'rgba(240,200,0,.55)' }
      ].map(function (t, i) {
        var on = i <= s.tagStep;
        return {
          label: t.label,
          cls: 'cu-tag' + (on ? ' cu-tag-on' : ''),
          style: on
            ? 'font-weight: 800; font-size: 16px; letter-spacing: 2px; padding: 9px 16px; border-radius: 10px; background: ' + t.bg + '; color: ' + t.fg + '; box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 10px 22px -8px ' + t.glow + ';'
            : 'font-weight: 700; font-size: 13px; letter-spacing: 2px; padding: 9px 4px; color: rgba(15,13,30,.35);'
        };
      }),
      fwBack: burst([{ x: 24, y: 24, c: '#7FB8FF', d: 0, r: 34, sc: .7, op: .75 }, { x: 74, y: 20, c: '#FFE07A', d: 2.4, r: 30, sc: .65, op: .7 }]),
      fwFront: burst([{ x: 12, y: 58, c: '#FF5A5A', d: 1.2, r: 58, sc: 1, op: 1 }, { x: 89, y: 52, c: '#FFFFFF', d: 3.6, r: 54, sc: 1, op: 1 }]),
      fwTile: burst([{ x: 18, y: 34, c: '#FF5A5A', d: 0, r: 30, sc: .7, op: 1 }, { x: 82, y: 30, c: '#FFE07A', d: 2.4, r: 28, sc: .7, op: 1 }]),
      journey: (function () {
        var J = [
          { code: 'A1', name: 'Principiante', say: 'Hi! My name is Ana.', es: '¡Hola! Me llamo Ana.', can: 'Saluda, se presenta y entiende frases muy sencillas.', program: 'CelsTV · desde el Episodio 1', color: '#43D6FE', fg: '#0F0D1E' },
          { code: 'A2', name: 'Básico', say: 'Can I get a coffee, please?', es: '¿Me da un café, por favor?', can: 'Se defiende en el día a día: compras, restaurantes y direcciones.', program: 'CelsTV', color: '#43D6FE', fg: '#0F0D1E' },
          { code: 'B1', name: 'Intermedio', say: 'Last summer I traveled to Texas.', es: 'El verano pasado viajé a Texas.', can: 'Conversa con confianza y cuenta sus experiencias. Si vive en EE.UU., puede prepararse para su ciudadanía.', program: 'Paquete CelsTV + CelsBSNS', color: '#B3EC79', fg: '#0F0D1E' },
          { code: 'B2', name: 'Intermedio alto', say: "I'd like to propose a new plan.", es: 'Me gustaría proponer un nuevo plan.', can: 'Participa en juntas, da su opinión y escribe correos profesionales.', program: 'CelsBSNS · English for Business', color: '#FFC800', fg: '#0F0D1E' },
          { code: 'C1', name: 'Avanzado', say: "Let's close the deal by Friday.", es: 'Cerremos el trato el viernes.', can: 'Presenta, negocia y lidera reuniones en inglés.', program: 'CelsBSNS + CelsGLOBAL', color: '#F6AC00', fg: '#0F0D1E' },
          { code: 'C2', name: 'Maestría', say: "We're expanding into three new markets.", es: 'Nos expandimos a tres mercados nuevos.', can: 'Lidera negocios internacionales con total dominio del idioma.', program: 'CelsGLOBAL · International Business Development', color: '#F20174', fg: '#FFFFFF' }
        ];
        var P = [[80, 250], [270, 200], [460, 215], [650, 140], [840, 118], [1010, 60]];
        var cur = J[s.jStage];
        var go = function (i) { self.setState({ jPlaying: false }); clearTimeout(self._jT); self._jGo(i); clearTimeout(self._jResume); self._jResume = setTimeout(function () { self.setState({ jPlaying: true }); self._jLoop(); }, 9000); };
        return {
          sectionRef: function (el) { self._jSection = el; },
          boxRef: function (el) { self._box = el; },
          trailRef: function (el) { self._trail = el; },
          walkerRef: function (el) { self._walker = el; },
          code: cur.code, name: cur.name, can: cur.can, program: cur.program, say: cur.say, es: cur.es,
          levelStyle: 'flex: 0 0 170px; display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 24px; background: ' + cur.color + '; color: ' + cur.fg + '; transition: background .4s ease;',
          progStyle: 'color: #0F0D1E; background: ' + cur.color + '33; padding: 4px 10px; border-radius: 8px;',
          toggleLabel: s.jPlaying ? 'Pausar' : 'Reproducir',
          toggle: function () { var p = !self.state.jPlaying; self.setState({ jPlaying: p }); clearTimeout(self._jT); if (p) setTimeout(function () { self._jLoop(); }, 50); },
          nodes: J.map(function (j, i) {
            var on = i <= s.jStage, act = i === s.jStage;
            return { code: j.code, active: act, aria: 'Nivel ' + j.code + ': ' + j.name, pick: function () { go(i); },
              style: 'position: absolute; left: ' + (P[i][0] / 12) + '%; top: ' + (P[i][1] / 3.3) + '%; transform: translate(-50%,-50%)' + (act ? ' scale(1.18)' : '') + '; z-index: 3; width: clamp(30px, 4.4vw, 52px); height: clamp(30px, 4.4vw, 52px); border-radius: 50%; border: 3px solid #FFFFFF; cursor: pointer; font-family: inherit; font-weight: 800; font-size: clamp(11px, 1.3vw, 15px); display: flex; align-items: center; justify-content: center; transition: all .35s ease; ' +
                (on ? 'background: ' + j.color + '; color: ' + j.fg + '; box-shadow: 0 0 0 5px rgba(255,255,255,.18), 0 10px 24px -6px rgba(0,0,0,.45);' : 'background: rgba(15,13,30,.35); color: rgba(255,255,255,.8); box-shadow: none;') };
          }),
          bubbles: J.map(function (j, i) {
            var right = i < 3, tx = i < 3 ? '-18%' : (i === 3 ? '-60%' : '-92%');
            return { show: i === s.jStage, say: j.say, es: j.es,
              style: 'position: absolute; z-index: 5; left: ' + (P[i][0] / 12) + '%; top: ' + (P[i][1] / 3.3) + '%; transform: translate(' + tx + ', ' + (i === 5 ? '36px' : 'calc(-100% - 36px)') + '); width: max-content; max-width: 280px; display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; background: #FFFFFF; border-radius: ' + (i === 5 ? '16px 4px 16px 16px' : (right ? '16px 16px 16px 4px' : '16px 16px 4px 16px')) + '; box-shadow: 0 18px 36px -12px rgba(0,0,0,.45), inset 0 1px 0 #FFFFFF;' };
          })
        };
      })(),
      price: (function () {
        var P = {
          tv: { label: 'CelsTV', accent: '#C8005F', accentDark: '#FF7DB8', note: '', plans: [
            { code: 'celstv_standard', name: 'Standard', price: fmtPrice(PR, 'celstv_standard'), mxn: (fmtMxn(PR, 'celstv_standard') ? fmtMxn(PR, 'celstv_standard') + ' · ' : '') + 'se cobra en dólares', features: ['Todos los episodios de la temporada', 'Práctica interactiva de gramática y vocabulario', 'Flashcards, quizzes y entrenamiento Funics', 'CELS Audio', '1 año de acceso en cualquier dispositivo', 'Evaluaciones periódicas'] },
            { code: 'celstv_premium', name: 'Premium', price: fmtPrice(PR, 'celstv_premium'), mxn: (fmtMxn(PR, 'celstv_premium') ? fmtMxn(PR, 'celstv_premium') + ' · ' : '') + 'se cobra en dólares', featured: true, features: ['Todo lo de Standard', 'E-books y actividades descargables', 'Clases en vivo cada semana', 'Precio preferente en la Temporada 2', 'Acceso anticipado a nuevos productos'] } ] },
          bsns: { label: 'CelsBSNS', accent: '#2C6BC4', accentDark: '#7FB8FF', note: 'Requiere nivel B2. Si aún no lo tienes, mira el paquete CelsTV + CelsBSNS.', plans: [
            { code: 'celsbsns_standard', name: 'Standard', price: fmtPrice(PR, 'celsbsns_standard'), mxn: (fmtMxn(PR, 'celsbsns_standard') ? fmtMxn(PR, 'celsbsns_standard') + ' · ' : '') + 'se cobra en dólares', features: ['10 módulos en video', 'Tareas semanales y materiales descargables', 'PDF semanal de vocabulario', 'Quizzes con retroalimentación automática', 'Certificado CelsUniversity', '12 meses de acceso'] },
            { code: 'celsbsns_premium', name: 'Premium', price: fmtPrice(PR, 'celsbsns_premium'), mxn: (fmtMxn(PR, 'celsbsns_premium') ? fmtMxn(PR, 'celsbsns_premium') + ' · ' : '') + 'se cobra en dólares', featured: true, features: ['Todo lo de Standard', 'Revisión de tu currículum estilo EE.UU. por un instructor', 'Entrevista de práctica individual con retroalimentación', 'Análisis y estrategia de tu perfil profesional', 'Acceso prioritario a recursos adicionales'] } ] },
          us: { label: 'CelsUS', accent: '#194876', accentDark: '#9CC7FF', note: '', plans: [
            { code: 'celsus_estandar', name: 'Acceso Estándar', price: fmtPrice(PR, 'celsus_estandar'), mxn: 'Se cobra en dólares', features: ['Curso completo con lecciones de cívica', 'Las 128 preguntas oficiales, en inglés con referencia en español', 'Actividades de escucha, habla y comprensión', 'Hojas de estudio y flashcards imprimibles', '12 meses de acceso'] },
            { code: 'celsus_completo', name: 'Paquete Completo', price: fmtPrice(PR, 'celsus_completo'), mxn: 'Se cobra en dólares', featured: true, features: ['Todo lo del Acceso Estándar', 'Simulacros de entrevista con retroalimentación personalizada', 'Cuaderno de trabajo en PDF', 'Certificado de finalización', 'Soporte prioritario por correo'] } ] },
          ibd: { label: 'CelsGLOBAL', accent: '#00708C', accentDark: '#5FE3FF', note: '', plans: [
            { code: 'celsglobal', name: 'Programa completo', price: fmtPrice(PR, 'celsglobal'), mxn: 'Programa de 6 meses · Se cobra en dólares', featured: true, features: ['English for Business (CelsBSNS) completo', 'CV to Resume + Resume Review', 'Crack the U.S. Interview Code + Interview Prep', 'Finanzas Personales y Tu Camino con la Visa TN', 'CelsTV para tu inglés base'] } ] }
        };
        var order = ['tv', 'bsns', 'us', 'ibd'];
        var cur = P[s.priceTab];
        return {
          note: cur.note, hasNote: !!cur.note,
          tabs: order.map(function (k) {
            var on = k === s.priceTab;
            return { label: P[k].label, selected: on ? 'true' : 'false', pick: function () { self.setState({ priceTab: k }); },
              style: 'min-height: 46px; padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 15px; transition: all .2s; ' +
                (on ? 'background: linear-gradient(180deg,#FFFFFF,#E9EEF6); color: #0F0D1E; box-shadow: inset 0 1px 0 #FFFFFF, 0 8px 18px -8px rgba(0,0,0,.6);' : 'background: transparent; color: #C9D3E6;') };
          }),
          plans: cur.plans.map(function (pl) {
            var f = !!pl.featured;
            return {
              program: cur.label.toUpperCase(), name: pl.name, href: enrollHref(HOME_TAB_PROGRAM[s.priceTab], pl.code), price: pl.price, unit: 'USD · pago único', mxn: pl.mxn, features: pl.features, featured: f,
              accent: cur.accentDark, check: f ? '#FF7DB8' : '#B3EC79',
              cta: f ? 'Inscríbete en ' + pl.name : 'Inscríbete',
              btnClass: 'cu-btn ' + (f ? 'cu-btn-pink' : 'cu-btn-light'),
              cardStyle: 'position: relative; flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 12px; padding: 30px 28px 28px; border-radius: 22px; color: #FFFFFF; ' +
                (f ? 'background: linear-gradient(135deg, rgba(242,1,116,.22), rgba(255,255,255,.06)); border: 1px solid rgba(255,120,180,.55); box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 0 44px -8px rgba(242,1,116,.55), 0 34px 70px -24px rgba(0,0,0,.7); transform: translateY(-8px);'
                   : 'background: linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04)); border: 1px solid rgba(255,255,255,.12); box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 24px 48px -24px rgba(0,0,0,.6);')
            };
          })
        };
      })(),
      replayIntro: function () { try { if (self._ac && self._ac.state !== 'running') self._ac.resume(); } catch (e) {} self._intro(); },
      word: { text: heroWords[s.wordIdx], cls: s.wordIdx % 2 === 0 ? 'cu-wa' : 'cu-wb' },
      goals: goals,
      rec: rec,
      levels: levels,
      lvl: { code: cur.code, name: cur.name, can: cur.can, course: cur.course, barStyle: 'height: 100%; width: ' + pct + '%; background: #00CCFE; border-radius: 3px; transition: width .3s;' },
      quiz: quiz,
      voiceName: s.voiceName,
      start: function () { self.setState({ score: 0 }); self._play(0); },
      replaySpeech: function () { if (!self.state.speaking) self._speak(self.state.qi, null); },
      next: function () { if (self.state.qi < Q.length - 1) self._play(self.state.qi + 1); else { self._clear(); self.setState({ done: true }); self._tone(523, 0, .2, .1, 'triangle'); self._tone(659, .12, .2, .1, 'triangle'); self._tone(784, .24, .4, .1, 'triangle'); } },
      restart: function () { self.setState({ score: 0 }); self._play(0); }
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
<a href="#inicio" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#0F0D1E", marginRight: "auto" }}>
<img src="/site/celsu-logo.png" alt="" style={{ width: "44px", height: "auto", display: "block" }} />
<span style={{ display: "flex", flexDirection: "column", gap: "4px", lineHeight: "1" }}><span style={{ fontWeight: "800", fontSize: "19px", letterSpacing: "-0.3px" }}>CelsUniversity</span><span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", fontSize: "11px", letterSpacing: "1.5px", color: "#6B6680" }}>BY <img src="/site/lam-logo.png" alt="LAM" style={{ height: "13px", width: "auto", display: "block" }} /></span></span>
</a>
<div className="cu-desk" style={{ gap: "28px", fontWeight: "600", fontSize: "15px", alignItems: "center" }}>
<a href="#programas" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Programas</a>
<a href="#nivel" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Tu nivel</a>
<a href="#precios" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Precios</a>
<a href="#metodo" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Metodología</a>
<a href="#sofia" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Sofia</a>
<a href="/entrar" style={{ color: "#0F0D1E", textDecoration: "none", padding: "10px 0", fontWeight: "700" }}>Iniciar sesión</a>
</div>
<a href="/evaluacion" className="cu-btn cu-btn-pink cu-btn-sm">Evaluación gratis</a>
<button type="button" className="cu-mob" onClick={v.toggleMenu} aria-label="Abrir men\u00fa" aria-expanded={v.menuExpanded} style={{ width: "46px", height: "46px", borderRadius: "10px", border: "1px solid #E2DFEA", background: "#FFFFFF", color: "#0F0D1E", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
</button>
</nav>
{v.menuOpen ? (<>
<div style={{ display: "flex", flexDirection: "column", padding: "4px 20px 16px", fontWeight: "600", fontSize: "17px", borderTop: "1px solid #ECEAF2" }}>
<a href="#programas" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Programas</a>
<a href="#nivel" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Tu nivel</a>
<a href="#precios" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Precios</a>
<a href="#metodo" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Metodología</a>
<a href="#sofia" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Habla con Sofia</a>
<a href="/entrar" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Iniciar sesión</a>
</div>
</>) : null}
</header>
<main>

{/* HERO on LAM blue */}
<section id="inicio" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #2BD8FF 0%, #00CCFE 45%, #00A9DC 100%)", padding: "64px 20px 88px" }}>
<span className="cu-beam" aria-hidden="true"></span>
<img className="cu-lam" src="/site/lam-white.png" alt="" aria-hidden="true" style={{ position: "absolute", left: "-2%", bottom: "-6%", width: "min(78%, 980px)", height: "auto", opacity: "0.22", pointerEvents: "none" }} />
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "24px 48px", alignItems: "center" }}>

<div style={{ position: "relative", zIndex: "2", flex: "1 1 460px", minWidth: "0", display: "flex", flexDirection: "column", gap: "22px" }}>
<button type="button" onClick={v.replayIntro} style={{ alignSelf: "flex-start", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", minHeight: "48px", padding: "0", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
{(v.tags ?? []).map((t: any, __i: number) => (<Fragment key={__i}><span className={t.cls} style={css(t.style)}>{t.label}</span></Fragment>))}
</button>
<h1 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(38px, 5.4vw, 66px)", lineHeight: "1.05", letterSpacing: "-1.8px", color: "#0F0D1E" }}>Formación que impulsa<br />tu <span className={v.word.cls} style={{ color: "#FFFFFF" }}>{v.word.text}</span></h1>
<p style={{ margin: "0", fontSize: "19px", lineHeight: "1.6", color: "#0E2A3A", maxWidth: "560px" }}>Programas en línea para latinoamericanos: inglés para la vida, inglés de negocios, preparación para la ciudadanía estadounidense y desarrollo de negocios internacionales.</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
<a href="/evaluacion" className="cu-btn cu-btn-pink">Descubre tu nivel gratis <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
<a href="#programas" className="cu-btn cu-btn-light">Ver programas</a>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", fontSize: "14px", color: "#0E2A3A", fontWeight: "600" }}>
<span>Evaluación de 10 minutos</span><span>Sin tarjeta</span><span>Resultado A1–C2</span>
</div>
</div>

{/* The U: four ribbons swoosh across the hero, loop back and untwist into place */}
<div aria-hidden="true" style={{ position: "relative", zIndex: "1", flex: "1 1 400px", minWidth: "0", display: "flex", justifyContent: "center" }}>
{/* LOTTIE SLOT: Ludo will deliver the final CelsU "U" swoosh as a Lottie file. Swap the CSS swoosh below
    (playA / playB layers) for the Lottie player here, keeping the same box and the reduced-motion fallback. */}
<div className="cu-par" style={{ position: "relative", width: "min(100%, 520px)", aspectRatio: "1 / 1", perspective: "1000px" }}>
{v.playA ? (<>
<div style={{ position: "absolute", left: "12%", top: "20%", width: "76%", aspectRatio: "900 / 594" }}>
<span className="cu-shadow" style={{ position: "absolute", left: "18%", right: "18%", bottom: "-14%", height: "16%", borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(0,50,80,.35) 0%, rgba(0,50,80,0) 70%)" }}></span>
<img className="cu-land" src="/site/celsu-logo.png" alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", filter: "drop-shadow(0 14px 22px rgba(0,50,80,.30)) drop-shadow(0 0 2px rgba(255,255,255,.6))" }} />
</div>
</>) : null}
{v.playB ? (<>
<div style={{ position: "absolute", left: "12%", top: "20%", width: "76%", aspectRatio: "900 / 594" }}>
<span className="cu-shadow" style={{ position: "absolute", left: "18%", right: "18%", bottom: "-14%", height: "16%", borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(0,50,80,.35) 0%, rgba(0,50,80,0) 70%)" }}></span>
<img className="cu-land" src="/site/celsu-logo.png" alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", filter: "drop-shadow(0 14px 22px rgba(0,50,80,.30)) drop-shadow(0 0 2px rgba(255,255,255,.6))" }} />
</div>
</>) : null}
</div>
</div>
</div>
<button type="button" onClick={v.replay} style={{ position: "absolute", right: "20px", bottom: "18px", border: "none", background: "rgba(255,255,255,.7)", color: "#0F0D1E", fontWeight: "700", fontSize: "13px", padding: "9px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>Repetir animación
</button>
</section>

<Keep deps={this.state} prices={P}>
{/* Program marquee */}
<div aria-hidden="true" style={{ position: "relative", zIndex: "3", margin: "-34px -40px -34px", transform: "rotate(-2deg)", background: "linear-gradient(180deg, #1C1934 0%, #0F0D1E 100%)", color: "#FFFFFF", overflow: "hidden", padding: "20px 0", boxShadow: "0 24px 50px -18px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.12)" }}>
<div className="cu-marquee" style={{ display: "flex", width: "max-content", gap: "40px", whiteSpace: "nowrap", fontWeight: "600", fontSize: "17px" }}>
<span>Inglés conversacional</span><span style={{ color: "#00CCFE" }}>●</span><span>Inglés de negocios</span><span style={{ color: "#B3EC79" }}>●</span><span>Ciudadanía estadounidense</span><span style={{ color: "#F6AC00" }}>●</span><span>Negocios internacionales</span><span style={{ color: "#F20174" }}>●</span><span>Currículum para EE.UU.</span><span style={{ color: "#00CCFE" }}>●</span><span>Entrevistas en inglés</span><span style={{ color: "#B3EC79" }}>●</span><span>Finanzas personales</span><span style={{ color: "#F6AC00" }}>●</span>
<span>Inglés conversacional</span><span style={{ color: "#00CCFE" }}>●</span><span>Inglés de negocios</span><span style={{ color: "#B3EC79" }}>●</span><span>Ciudadanía estadounidense</span><span style={{ color: "#F6AC00" }}>●</span><span>Negocios internacionales</span><span style={{ color: "#F20174" }}>●</span><span>Currículum para EE.UU.</span><span style={{ color: "#00CCFE" }}>●</span><span>Entrevistas en inglés</span><span style={{ color: "#B3EC79" }}>●</span><span>Finanzas personales</span><span style={{ color: "#F6AC00" }}>●</span>
</div>
</div>

{/* GOAL PICKER */}
<section id="programas" style={{ position: "relative", overflowX: "clip", padding: "200px 20px 110px", background: "linear-gradient(180deg, #00A9DC 0px, #1DABDD 42px, #3EB0DF 84px, #5DB8E1 127px, #7AC1E4 169px, #96CAE7 211px, #AED3EA 253px, #C2DAEC 296px, #D0DFEE 338px, #D5E1EE 380px, #BFD0E3 100%)" }}>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "-120px", right: "-80px", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#1E4877" }}>EMPIEZA AQUÍ</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>¿Cuál es tu meta?</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#24384F" }}>Elige una de estas <strong>4 opciones</strong> y te mostramos el programa ideal para ti.</p>
</div>
<div role="group" aria-label="Elige tu meta" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: "16px" }}>
{(v.goals ?? []).map((g: any, __i: number) => (<Fragment key={__i}>
<button type="button" className="cu-tile cu-sheen" onClick={g.pick} aria-pressed={g.pressed} style={css(g.tileStyle)}>
<span style={css(g.artStyle)}>
{g.isTV ? (<><span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", perspective: "600px" }}><span className="cu-ering" style={{ position: "absolute", width: "70px", height: "70px", borderRadius: "50%", border: "2px solid #F20174" }}></span><span className="cu-ering2" style={{ position: "absolute", width: "70px", height: "70px", borderRadius: "50%", border: "2px solid #43D6FE" }}></span><span className="cu-ering3" style={{ position: "absolute", width: "70px", height: "70px", borderRadius: "50%", border: "2px solid #FFC800" }}></span><img loading="lazy" decoding="async" src="/site/celstv-e.webp" alt="" style={{ position: "relative", height: "78px", width: "auto", filter: "drop-shadow(0 10px 14px rgba(120,0,60,.25))" }} /></span></>) : null}
{g.isBSNS ? (<><img loading="lazy" decoding="async" className="cu-breathe" src="/site/celsbsns-logo.png" alt="" style={{ width: "78%", height: "auto" }} /></>) : null}
{g.isUS ? (<><img loading="lazy" decoding="async" className="cu-pan" src="/site/celsus-us3d.jpg" alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} /></>) : null}
{g.usOn ? (<>{(v.fwTile ?? []).map((f: any, __i: number) => (<Fragment key={__i}><span className="cu-fw" style={css(f.style)}><u></u><b></b>{(f.sparks ?? []).map((k: any, __i: number) => (<Fragment key={__i}><i style={css(k.style)}></i></Fragment>))}</span></Fragment>))}</>) : null}
{g.isIBD ? (<><img loading="lazy" decoding="async" src="/site/celsglobal-mark.png" alt="" style={{ height: "84px", width: "auto" }} /></>) : null}
<span style={css(g.checkStyle)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></span>
<span style={css(`position: absolute; left: 12px; top: 10px; font-weight: 800; font-size: 13px; letter-spacing: 1px; color: ${g.numColor};`)}>{g.num}</span>
{g.featured ? (<><span style={{ position: "absolute", left: "12px", bottom: "10px", fontWeight: "800", fontSize: "11px", letterSpacing: "1px", color: "#FFFFFF", background: "linear-gradient(180deg,#FF3D97,#D9006A)", padding: "5px 9px", borderRadius: "6px", boxShadow: "0 6px 14px -4px rgba(242,1,116,.6)" }}>MÁS POPULAR</span></>) : null}
</span>
<span style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "18px 18px 20px", textAlign: "left" }}>
<span style={{ fontWeight: "800", fontSize: "19px", lineHeight: "1.25", color: "#0F0D1E" }}>{g.label}</span>
<span style={{ fontWeight: "600", fontSize: "14px", color: "#4A5A6E" }}>{g.program}</span>
</span>
</button>
</Fragment>))}
</div>
<div className="cu-tilt cu-raise" style={{ background: "#FFFFFF", borderRadius: "20px", padding: "12px", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "stretch" }}>
<div style={css(v.rec.artStyle)}>
{v.rec.isTV ? (<>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "12px 20px", width: "100%", padding: "24px 16px", boxSizing: "border-box" }}>
<span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "170px", height: "170px", perspective: "800px", flex: "0 0 auto" }}>
<span className="cu-ering" style={{ position: "absolute", width: "140px", height: "140px", borderRadius: "50%", border: "2px solid #F20174" }}></span>
<span className="cu-ering2" style={{ position: "absolute", width: "140px", height: "140px", borderRadius: "50%", border: "2px solid #43D6FE" }}></span>
<span className="cu-ering3" style={{ position: "absolute", width: "140px", height: "140px", borderRadius: "50%", border: "2px solid #FFC800" }}></span>
<img loading="lazy" decoding="async" src="/site/celstv-e.webp" alt="CelsTV" style={{ position: "relative", height: "150px", width: "auto", filter: "drop-shadow(0 18px 22px rgba(120,0,60,.28))" }} />
</span>
<img loading="lazy" decoding="async" src="/site/celstv-episodes.webp" alt="Episodios de CelsTV" style={{ flex: "1 1 240px", minWidth: "0", maxWidth: "360px", height: "auto" }} />
</div>
</>) : null}
{v.rec.isBSNS ? (<>
<img loading="lazy" decoding="async" className="cu-breathe" src="/site/celsbsns-logo.png" alt="CelsBSNS" style={{ width: "70%", height: "auto" }} />
</>) : null}
{v.rec.isUS ? (<>
<img loading="lazy" decoding="async" className="cu-pan" src="/site/celsus-us3d.jpg" alt="CelsUS" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} />
{(v.fwBack ?? []).map((f: any, __i: number) => (<Fragment key={__i}><span className="cu-fw" style={css(f.style)}><u></u><b></b>{(f.sparks ?? []).map((k: any, __i: number) => (<Fragment key={__i}><i style={css(k.style)}></i></Fragment>))}</span></Fragment>))}
{(v.fwFront ?? []).map((f: any, __i: number) => (<Fragment key={__i}><span className="cu-fw" style={css(f.style)}><u></u><b></b>{(f.sparks ?? []).map((k: any, __i: number) => (<Fragment key={__i}><i style={css(k.style)}></i></Fragment>))}</span></Fragment>))}
</>) : null}
{v.rec.isPlaceholder ? (<>
<img loading="lazy" decoding="async" src="/site/celsglobal-lockup-dark.png" alt="CelsGLOBAL, International Business Development" style={{ width: "84%", height: "auto" }} />
</>) : null}
</div>
<div style={{ flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px", padding: "16px 12px" }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
<span style={css(v.rec.tagStyle)}>{v.rec.tag}</span>
<span style={{ fontWeight: "700", fontSize: "15px", color: "#3F3B52" }}>{v.rec.price}</span>
</div>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(24px, 2.6vw, 32px)", lineHeight: "1.15", letterSpacing: "-0.5px" }}>{v.rec.name}</h3>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#3F3B52" }}>{v.rec.blurb}</p>
{v.rec.hasNote ? (<>
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.5", color: "#0F0D1E", fontWeight: "600", background: "#E5F9FF", padding: "12px 14px", borderRadius: "10px" }}>{v.rec.note}</p>
</>) : null}
<a href={v.rec.href} className="cu-btn cu-btn-dark" style={{ alignSelf: "flex-start", marginTop: "4px" }}>Conoce {v.rec.short} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</div>
</div>
</div>
</section>

{/* LEVEL: Ana's journey */}
<section id="nivel" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 120px", background: "linear-gradient(180deg, #BFD0E3 0px, #BDD0E4 35px, #B7D1E5 70px, #ADD1E7 105px, #A0D2EA 140px, #91D2ED 175px, #7FD3F0 210px, #6AC9EB 245px, #55BFE7 280px, #3FB6E2 315px, #29AFDF 350px, #11ABDD 385px, #00A9DC 420px, #006E9E 72%, #0F2A4D 100%)", color: "#FFFFFF" }}>
<span aria-hidden="true" style={{ position: "absolute", left: "-10%", right: "-10%", top: "110px", height: "200px", pointerEvents: "none", background: "radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,.10), rgba(255,255,255,0) 70%)" }}></span>
<span className="cu-beam" aria-hidden="true"></span>
<div ref={v.journey.sectionRef} style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "780px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#0F0D1E" }}>TU CAMINO</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>¿Dónde estás hoy? Así avanza Ana.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#E3F6FD" }}>De su primer "Hi!" a cerrar negocios internacionales. Cada nivel desbloquea algo nuevo, y cada etapa tiene su programa. ¿En qué punto del camino estás tú?</p>
</div>

<div style={{ position: "relative" }}>
<div ref={v.journey.boxRef} style={{ position: "relative", width: "100%", aspectRatio: "1200 / 330" }}>
<svg viewBox="0 0 1200 330" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", overflow: "visible" }}>
<defs>
<linearGradient id="cu-trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#43D6FE" /><stop offset=".35" stopColor="#B3EC79" /><stop offset=".65" stopColor="#FFC800" /><stop offset="1" stopColor="#F20174" /></linearGradient>
</defs>
<path d="M460,215 C490,250 510,280 560,300" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
<path d="M80,250 C170,250 180,200 270,200 S380,215 460,215 S560,140 650,140 S750,118 840,118 S940,60 1010,60" fill="none" stroke="rgba(15,13,30,.22)" strokeWidth="22" strokeLinecap="round" />
<path d="M80,250 C170,250 180,200 270,200 S380,215 460,215 S560,140 650,140 S750,118 840,118 S940,60 1010,60" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="12" strokeLinecap="round" />
<path ref={v.journey.trailRef} d="M80,250 C170,250 180,200 270,200 S380,215 460,215 S560,140 650,140 S750,118 840,118 S940,60 1010,60" fill="none" stroke="url(#cu-trail)" strokeWidth="12" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,.55))" }} />
</svg>

<span className="cu-jsign" style={{ position: "absolute", left: "46.7%", top: "90.9%", transform: "translate(0,-50%)", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", fontWeight: "700", fontSize: "13px", background: "#194876", color: "#FFFFFF", padding: "7px 12px", borderRadius: "10px", boxShadow: "0 10px 22px -10px rgba(0,0,0,.6)" }}>
<img loading="lazy" decoding="async" src="/site/celsus-logo.jpg" alt="" style={{ height: "20px", width: "auto", borderRadius: "3px" }} /> Salida: ciudadanía con CelsUS
</span>

{(v.journey.nodes ?? []).map((n: any, __i: number) => (<Fragment key={__i}>
<button type="button" onClick={n.pick} aria-label={n.aria} style={css(n.style)}>
{n.active ? (<><span className="cu-ering" style={{ position: "absolute", inset: "-8px", borderRadius: "50%", border: "2px solid #FFFFFF" }}></span></>) : null}
{n.code}
</button>
</Fragment>))}

<div ref={v.journey.walkerRef} aria-hidden="true" style={{ position: "absolute", left: "0", top: "0", width: "0", height: "0", zIndex: "4", pointerEvents: "none", willChange: "transform", transform: "translate(7.5%, 75%)" }}>
<span className="cu-jdot" style={{ position: "absolute", left: "-22px", top: "-22px", width: "44px", height: "44px", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #FFE680 30%, #F20174 100%)", boxShadow: "0 0 0 4px rgba(255,255,255,.55), 0 0 28px 6px rgba(255,255,255,.55)" }}></span>
<span className="cu-jdot cu-jname" style={{ position: "absolute", left: "-22px", top: "-22px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "14px", color: "#0F0D1E" }}>Ana</span>
</div>

{(v.journey.bubbles ?? []).map((b: any, __i: number) => (<Fragment key={__i}>
{b.show ? (<>
<div className="cu-drop cu-jbubble" style={css(b.style)}>
<span style={{ fontWeight: "800", fontSize: "17px", lineHeight: "1.3", color: "#0F0D1E" }}>"{b.say}"</span>
<span style={{ fontSize: "13px", color: "#4A4560" }}>{b.es}</span>
</div>
</>) : null}
</Fragment>))}
</div>
</div>

<div className="cu-raise" style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "0", borderRadius: "22px", overflow: "hidden", background: "#FFFFFF", color: "#0F0D1E" }}>
<div style={css(v.journey.levelStyle)}>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", opacity: ".85" }}>NIVEL</span>
<span key={v.journey.code} className="cu-drop" style={{ fontWeight: "800", fontSize: "64px", lineHeight: "1", letterSpacing: "-2px" }}>{v.journey.code}</span>
<span style={{ fontWeight: "700", fontSize: "15px" }}>{v.journey.name}</span>
</div>
<div style={{ flex: "1 1 360px", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px", padding: "24px 26px" }}>
<p className="cu-jquote" style={{ margin: "0", display: "none", flexDirection: "column", gap: "2px", padding: "12px 14px", borderRadius: "12px", background: "#F6F5F9" }}><strong style={{ fontSize: "17px" }}>"{v.journey.say}"</strong><span style={{ fontSize: "13px", color: "#4A4560" }}>{v.journey.es}</span></p>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#6B6680" }}>LO QUE ANA YA PUEDE HACER</span>
<p style={{ margin: "0", fontSize: "20px", lineHeight: "1.45", fontWeight: "700" }}>{v.journey.can}</p>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "auto", paddingTop: "14px", borderTop: "1px solid #ECEAF2" }}>
<span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px", color: "#3F3B52" }}>Su programa: <strong style={css(v.journey.progStyle)}>{v.journey.program}</strong></span>
<a href="/evaluacion" className="cu-btn cu-btn-pink cu-btn-sm">¿Estás aquí? Confirma tu nivel <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</div>
<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px", padding: "20px 22px", background: "#F6F5F9", minWidth: "150px" }}>
<button type="button" onClick={v.journey.toggle} className="cu-btn cu-btn-light cu-btn-sm">{v.journey.toggleLabel}</button>
<span style={{ fontSize: "12px", color: "#6B6680", textAlign: "center" }}>Toca un nivel en el camino</span>
</div>
</div>
</div>
</section>

{/* TRY IT */}
<section id="prueba" style={{ position: "relative", overflowX: "clip", padding: "110px 20px 110px", background: "linear-gradient(180deg, #0F2A4D 0px, #0F2A4D 120px, #0B1E3A 100%)", color: "#FFFFFF" }}>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "-140px", left: "30%", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(179,236,121,.22) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px 64px", alignItems: "center" }}>
<div className="cu-from-l" style={{ flex: "1 1 360px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#B3EC79" }}>PRUÉBALO</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Mini quiz: 5 frases reales.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#C9D3E6" }}>Frases de nuestros tres programas. Escucha cada una, elige su significado y mira tu resultado al final.</p>
</div>
<div className="cu-tilt cu-raise-dark" style={{ flex: "1 1 480px", minWidth: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "22px", padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
<div aria-hidden="true" style={{ display: "flex", gap: "6px" }}>
{(v.quiz.dots ?? []).map((d: any, __i: number) => (<Fragment key={__i}><span style={css(d.style)}></span></Fragment>))}
</div>

{v.quiz.intro ? (<>
<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px", padding: "28px 24px", borderRadius: "18px", background: "linear-gradient(150deg, #1C1934 0%, #0F0D1E 70%)", color: "#FFFFFF", position: "relative", overflow: "hidden" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "1.5px", color: "#00CCFE" }}>5 FRASES · 1 MINUTO</span>
<p style={{ margin: "0", fontWeight: "800", fontSize: "26px", lineHeight: "1.25" }}>Escucha inglés real y descubre cuánto entiendes.</p>
<button type="button" className="cu-btn cu-btn-pink cu-pulse" onClick={v.start}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>Empezar el quiz</button>
</div>
</>) : null}

{v.quiz.active ? (<>
<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
<span style={css(v.quiz.progStyle)}>{v.quiz.prog}</span>
<span style={{ fontWeight: "600", fontSize: "13px", color: "#6B6680" }}>{v.quiz.ctx} · {v.quiz.pos}</span>
</div>
<div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap", padding: "22px", borderRadius: "18px", background: "linear-gradient(150deg, #1C1934 0%, #0F0D1E 70%)", color: "#FFFFFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 18px 36px -18px rgba(15,13,30,.8)" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<button type="button" className={v.quiz.spkClass} onClick={v.replaySpeech} aria-label="Escuchar otra vez" style={{ position: "relative", width: "58px", height: "58px", padding: "0", borderRadius: "50%", flex: "0 0 auto" }}>
{v.quiz.speaking ? (<><span className="cu-eq" style={{ display: "flex", alignItems: "center", gap: "3px", height: "22px" }}><span></span><span></span><span></span><span></span></span></>) : null}
{v.quiz.notSpeaking ? (<><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></svg></>) : null}
</button>
<p aria-label={v.quiz.say} style={{ position: "relative", margin: "0", fontWeight: "800", fontSize: "clamp(22px, 2.6vw, 30px)", lineHeight: "1.3", flex: "1 1 220px", letterSpacing: "-0.3px" }}>
{(v.quiz.words ?? []).map((w: any, __i: number) => (<Fragment key={__i}><span className={w.cls} style={css(w.style)}>{w.t}</span></Fragment>))}
</p>
</div>
{v.quiz.showPrompt ? (<>
<p className="cu-drop" style={{ margin: "0", fontWeight: "800", fontSize: "19px" }}>{v.quiz.prompt}</p>
</>) : null}
{v.quiz.showOpts ? (<>
<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
{(v.quiz.options ?? []).map((o: any, __i: number) => (<Fragment key={__i}>
<button type="button" className={o.cls} onClick={o.pick} style={css(o.style)}><span style={css(o.badgeStyle)}>{o.letter}</span><span>{o.text}</span></button>
</Fragment>))}
</div>
</>) : null}
{v.quiz.answered ? (<>
<div className="cu-drop" style={css(v.quiz.fbStyle)}>
<div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 220px" }}>
<p style={{ margin: "0", fontWeight: "800", fontSize: "17px" }}>{v.quiz.fbTitle}</p>
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.5" }}>{v.quiz.why}</p>
</div>
<button type="button" className="cu-btn cu-btn-dark cu-btn-sm" onClick={v.next}>{v.quiz.nextLabel}</button>
</div>
</>) : null}
</div>
</>) : null}

{v.quiz.done ? (<>
<div className="cu-drop" style={{ display: "flex", flexDirection: "column", gap: "14px", alignItems: "flex-start", padding: "8px 0" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "1.5px", color: "#6B6680" }}>TU RESULTADO</span>
<p style={{ margin: "0", fontWeight: "800", fontSize: "48px", lineHeight: "1" }}>{v.quiz.score} <span style={{ fontSize: "22px", color: "#6B6680" }}>de 5</span></p>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#3F3B52" }}>{v.quiz.verdict}</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<a href="/evaluacion" className="cu-btn cu-btn-pink cu-btn-sm">Descubre tu nivel real</a>
<button type="button" className="cu-btn cu-btn-light cu-btn-sm" onClick={v.restart}>Repetir quiz</button>
</div>
</div>
</>) : null}
</div>
</div>
</div>
</section>

{/* METHOD */}
<section id="metodo" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #0B1E3A 0px, #112440 42px, #21334F 84px, #394B65 127px, #576981 169px, #79899F 211px, #9BAABC 253px, #B8C6D6 296px, #CDDAE7 338px, #D5E1EE 380px, #C6D6E8 100%)" }}>
<span aria-hidden="true" style={{ position: "absolute", left: "-10%", right: "-10%", top: "110px", height: "200px", pointerEvents: "none", background: "radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,.10), rgba(255,255,255,0) 70%)" }}></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", bottom: "-200px", left: "-120px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.6) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "36px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#1E4877" }}>METODOLOGÍA</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Observa. Participa. Domina.</h2>
</div>
<ol style={{ listStyle: "none", margin: "0", padding: "0", display: "flex", flexWrap: "wrap", gap: "28px" }}>
<li className="cu-tilt cu-raise cu-sheen" style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", background: "#FFFFFF", borderRadius: "18px", borderTop: "4px solid #00CCFE", padding: "26px" }}>
<span style={{ fontWeight: "800", fontSize: "14px", color: "#6B6680" }}>01</span>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "22px" }}>Observa</h3>
<p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#3F3B52" }}>Lecciones cortas y cinematográficas con personas reales y situaciones del mundo real.</p>
</li>
<li className="cu-tilt-2 cu-raise cu-sheen" style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", background: "#FFFFFF", borderRadius: "18px", borderTop: "4px solid #B3EC79", padding: "26px" }}>
<span style={{ fontWeight: "800", fontSize: "14px", color: "#6B6680" }}>02</span>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "22px" }}>Participa</h3>
<p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#3F3B52" }}>Ejercicios interactivos, flashcards y evaluaciones con retroalimentación inmediata.</p>
</li>
<li className="cu-tilt-3 cu-raise cu-sheen" style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", background: "#FFFFFF", borderRadius: "18px", borderTop: "4px solid #F20174", padding: "26px" }}>
<span style={{ fontWeight: "800", fontSize: "14px", color: "#6B6680" }}>03</span>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "22px" }}>Domina</h3>
<p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#3F3B52" }}>Practica conversación real, recibe evaluación de tu escritura y habla, y obtén tu certificado.</p>
</li>
</ol>
</div>
</div>
</section>

{/* PLANS & PRICING */}
<section id="precios" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #C6D6E8 0px, #C3D2E6 35px, #B9C6E0 70px, #ABB4D6 105px, #9A9FCB 140px, #8584B9 175px, #6D64A0 210px, #564587 245px, #463271 280px, #3A2760 315px, #321E53 350px, #2C194A 385px, #2A1747 420px, #16183A 60%, #0B1E3A 100%)", color: "#FFFFFF" }}>
<span aria-hidden="true" style={{ position: "absolute", left: "-10%", right: "-10%", top: "110px", height: "200px", pointerEvents: "none", background: "radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,.10), rgba(255,255,255,0) 70%)" }}></span>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "80px", left: "-140px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(242,1,116,.30) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", bottom: "-160px", right: "-140px", width: "620px", height: "620px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,204,254,.25) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#00CCFE" }}>PLANES Y PRECIOS</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Elige tu programa y tu plan.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#C9D3E6" }}>Pago único, sin suscripciones. Precios en dólares; el monto en pesos es solo de referencia.</p>
</div>

<div className="cu-reveal" role="tablist" aria-label="Programas" style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "6px", borderRadius: "14px", background: "rgba(255,255,255,.07)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)", alignSelf: "flex-start", maxWidth: "100%" }}>
{(v.price.tabs ?? []).map((t: any, __i: number) => (<Fragment key={__i}>
<button type="button" role="tab" aria-selected={t.selected} onClick={t.pick} style={css(t.style)}>{t.label}</button>
</Fragment>))}
</div>

{v.price.hasNote ? (<>
<p style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "#0F0D1E", background: "#FFE680", padding: "10px 14px", borderRadius: "10px", alignSelf: "flex-start" }}>{v.price.note}</p>
</>) : null}

<div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "stretch" }}>
{(v.price.plans ?? []).map((pl: any, __i: number) => (<Fragment key={__i}>
<article className="cu-sheen" style={css(pl.cardStyle)}>
{pl.featured ? (<><span style={{ position: "absolute", right: "18px", top: "18px", fontWeight: "800", fontSize: "11px", letterSpacing: "1.2px", color: "#FFFFFF", background: "linear-gradient(180deg,#FF3D97,#D9006A)", padding: "6px 10px", borderRadius: "7px", boxShadow: "0 6px 14px -4px rgba(242,1,116,.6)" }}>RECOMENDADO</span></>) : null}
<span style={css(`font-weight: 700; font-size: 12px; letter-spacing: 1.5px; color: ${pl.accent};`)}>{pl.program}</span>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>{pl.name}</h3>
<div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
<span style={{ fontWeight: "800", fontSize: "48px", letterSpacing: "-1.5px", lineHeight: "1" }}>{pl.price}</span>
<span style={{ fontWeight: "700", fontSize: "15px", color: "#C9D3E6" }}>{pl.unit}</span>
</div>
<span style={{ fontSize: "14px", color: "#A9B4CC", fontWeight: "600" }}>{pl.mxn}</span>
<ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
{(pl.features ?? []).map((f: any, __i: number) => (<Fragment key={__i}>
<li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={css(`display: flex; color: ${pl.check};`)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>{f}</span></li>
</Fragment>))}
</ul>
<a href={pl.href} className={pl.btnClass} style={{ marginTop: "auto", alignSelf: "stretch" }}>{pl.cta} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</article>
</Fragment>))}
</div>

<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px" }}>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "24px" }}>Paquetes: ahorra combinando programas</h3>
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
<a href={enrollHref("celsbsns", "bundle_tv_bsns")} className="cu-btn cu-btn-light cu-btn-sm">Obtener paquete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
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
<a href={enrollHref("celsus", "bundle_us_tvpremium")} className="cu-btn cu-btn-light cu-btn-sm">Obtener paquete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</article>
</div>
</div>
<p style={{ margin: "0", fontSize: "14px", color: "#A9B4CC" }}>¿No sabes cuál elegir? <a href="/evaluacion" style={{ color: "#00CCFE", fontWeight: "700" }}>Haz la evaluación gratis</a> y te recomendamos el programa y el plan.</p>
</div>
<p style={{ position: "relative", margin: "32px auto 0", maxWidth: "1240px", textAlign: "center", fontSize: "14px", fontWeight: "700", color: "#D5DCEA" }}>Reembolso por cualquier motivo en las primeras 72 horas. <a href="/terminos" style={{ color: "#FFFFFF", textDecoration: "underline" }}>Ver términos</a></p>
</section>

{/* TESTIMONIALS: hidden until Matt sends real ones (never invent any). */}
{SHOW_TESTIMONIALS ? (<>
<section style={{ position: "relative", overflowX: "clip", padding: "90px 20px 110px", background: "linear-gradient(180deg, #0B1E3A 0px, #0B1E3A 120px, #16183A 55%, #2A1747 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "-180px", right: "-100px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(246,172,0,.22) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#F6AC00" }}>NUESTROS ESTUDIANTES</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Historias reales.</h2>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
<figure className="cu-tilt cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}>
<blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real del estudiante]"</blockquote>
<figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad] · CelsTV</figcaption>
</figure>
<figure className="cu-tilt-2 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}>
<blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real del estudiante]"</blockquote>
<figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad] · CelsBSNS</figcaption>
</figure>
<figure className="cu-tilt-3 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}>
<blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real del estudiante]"</blockquote>
<figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad] · CelsUS</figcaption>
</figure>
</div>
</div>
</div>
</section>
</>) : null}

{/* SOFIA */}
<section id="sofia" style={{ padding: "230px 20px 40px", background: "linear-gradient(180deg, #2A1747 0px, #2C194A 35px, #321E53 70px, #3A2760 105px, #463271 140px, #564587 175px, #6D64A0 210px, #8584B9 245px, #9DA1CC 280px, #B3BADA 315px, #C5CEE4 350px, #D1DCEB 385px, #D5E1EE 420px, #C6D6E8 100%)" }}>
<span aria-hidden="true" style={{ position: "absolute", left: "-10%", right: "-10%", top: "110px", height: "200px", pointerEvents: "none", background: "radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,.10), rgba(255,255,255,0) 70%)" }}></span>
<div className="cu-tilt cu-raise-dark" style={{ position: "relative", overflow: "hidden", maxWidth: "1240px", margin: "0 auto", background: "linear-gradient(135deg, #1A1733 0%, #0F0D1E 100%)", color: "#FFFFFF", borderRadius: "20px", padding: "36px 28px", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center" }}>
<div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "#00CCFE", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F0D1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></svg>
</div>
<div style={{ flex: "1 1 320px", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "26px" }}>Habla con Sofia</h2>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#CFCBDB" }}>Tu asesora bilingüe, disponible 24/7. Pregúntale qué programa te conviene o practica una conversación en inglés.</p>
</div>
<a href="https://chatgpt.com/g/g-68a516cc49988191b31e11e754fdc3f9-sofia" target="_blank" rel="noopener noreferrer" className="cu-btn cu-btn-light">Hablar con Sofia <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</section>

{/* TEAM */}
<section style={{ position: "relative", overflowX: "clip", padding: "56px 20px 96px", background: "#C6D6E8" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#1E4877" }}>QUIÉNES SOMOS</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>La división educativa de Latin American Media.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#3F3B52" }}>Enseñanza de clase mundial, experiencia práctica y precios justos, para que más latinoamericanos accedan a oportunidades globales.</p>
</div>
<ul className="cu-reveal-2" style={{ listStyle: "none", margin: "0", padding: "0", display: "flex", flexWrap: "wrap", gap: "14px" }}>
<li style={{ flex: "1 1 220px", minWidth: "0", background: "#FFFFFF", borderRadius: "14px", padding: "18px", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9),0 18px 36px -16px rgba(10,20,40,.3)", display: "flex", alignItems: "center", gap: "14px" }}><span style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#E5F9FF", color: "#0F0D1E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "16px", flex: "0 0 auto" }}>MH</span><span style={{ display: "flex", flexDirection: "column" }}><strong style={{ fontWeight: "700", fontSize: "16px" }}>Matthew Hendricks</strong><span style={{ fontSize: "14px", color: "#6B6680" }}>Fundador y CEO, LAM</span></span></li>
<li style={{ flex: "1 1 220px", minWidth: "0", background: "#FFFFFF", borderRadius: "14px", padding: "18px", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9),0 18px 36px -16px rgba(10,20,40,.3)", display: "flex", alignItems: "center", gap: "14px" }}><span style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#E5F9FF", color: "#0F0D1E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "16px", flex: "0 0 auto" }}>LM</span><span style={{ display: "flex", flexDirection: "column" }}><strong style={{ fontWeight: "700", fontSize: "16px" }}>Ludo Martínez</strong><span style={{ fontSize: "14px", color: "#6B6680" }}>Director Creativo</span></span></li>
<li style={{ flex: "1 1 220px", minWidth: "0", background: "#FFFFFF", borderRadius: "14px", padding: "18px", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9),0 18px 36px -16px rgba(10,20,40,.3)", display: "flex", alignItems: "center", gap: "14px" }}><span style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#E5F9FF", color: "#0F0D1E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "16px", flex: "0 0 auto" }}>JC</span><span style={{ display: "flex", flexDirection: "column" }}><strong style={{ fontWeight: "700", fontSize: "16px" }}>Jake Caballero</strong><span style={{ fontSize: "14px", color: "#6B6680" }}>Design Developer</span></span></li>
<li style={{ flex: "1 1 220px", minWidth: "0", background: "#FFFFFF", borderRadius: "14px", padding: "18px", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9),0 18px 36px -16px rgba(10,20,40,.3)", display: "flex", alignItems: "center", gap: "14px" }}><span style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#E5F9FF", color: "#0F0D1E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "16px", flex: "0 0 auto" }}>RO</span><span style={{ display: "flex", flexDirection: "column" }}><strong style={{ fontWeight: "700", fontSize: "16px" }}>René Ornelas</strong><span style={{ fontSize: "14px", color: "#6B6680" }}>Marketing y Comunidad</span></span></li>
</ul>
</div>
</section>

{/* FINAL CTA on LAM blue */}
<section id="evaluacion" style={{ padding: "0 20px 96px", background: "#C6D6E8" }}>
<div className="cu-btnwrap" style={{ position: "relative", overflow: "hidden", maxWidth: "1240px", margin: "0 auto", transform: "perspective(1200px) rotateX(4deg)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 0 #0094C8, 0 30px 60px -18px rgba(0,80,120,.55), 0 60px 90px -40px rgba(15,13,30,.45)", background: "linear-gradient(180deg, #3FE0FF 0%, #00CCFE 45%, #00A9DC 100%)", color: "#0F0D1E", borderRadius: "20px", padding: "48px 28px", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between" }}>
<span className="cu-beam" aria-hidden="true"></span>
<img loading="lazy" decoding="async" src="/site/lam-white.png" alt="" aria-hidden="true" style={{ position: "absolute", right: "-20px", bottom: "-30px", width: "420px", height: "auto", opacity: ".25" }} />
<div style={{ position: "relative", flex: "1 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: "1.12", letterSpacing: "-0.8px" }}>Descubre tu nivel en 10 minutos.</h2>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#0E2A3A" }}>Evaluación gratuita, sin tarjeta. Recibe tu nivel y el programa ideal para tu meta.</p>
</div>
<a href="/evaluacion" className="cu-btn cu-btn-pink">Empezar mi evaluación <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</section>

</Keep>
{/* FOOTER */}
</main>
<footer style={{ background: "linear-gradient(180deg, #C6D6E8 0px, #C1D2E5 35px, #B2C6DD 70px, #9CB4D2 105px, #829EC3 140px, #6583AC 175px, #48628A 210px, #2D4269 245px, #202E4F 280px, #19203B 315px, #14162B 350px, #100F21 385px, #0F0D1E 420px)", color: "#FFFFFF", padding: "330px 20px 36px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexWrap: "wrap", gap: "28px 64px" }}>
<div style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}><img loading="lazy" decoding="async" src="/site/celsu-logo.png" alt="" style={{ width: "42px", height: "auto" }} /><span style={{ fontWeight: "800", fontSize: "18px" }}>CelsUniversity</span></div>
<div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#CFCBDB", fontWeight: "600" }}>Una empresa de <img loading="lazy" decoding="async" src="/site/lam-logo.png" alt="Latin American Media" style={{ height: "22px", width: "auto" }} /></div>
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
<p style={{ margin: "0", fontSize: "13px", lineHeight: "1.6", color: "#A9A4BA", borderTop: "1px solid #2A2640", paddingTop: "18px" }}>CelsU es un producto de Latin American Media · Aguascalientes, México. © 2026 CelsUniversity by Latin American Media (LAM). CelsUS es un proveedor educativo independiente y no está afiliado con USCIS ni con ninguna agencia gubernamental.</p>
</div>
</footer>

</div>
    );
  }
}
