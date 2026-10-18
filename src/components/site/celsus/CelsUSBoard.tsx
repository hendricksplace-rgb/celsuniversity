/* eslint-disable */
// @ts-nocheck
"use client";
// Generated from the approved board CelsUS.dc.html by scripts/board-to-tsx.py, then wired by hand.
import { Component, Fragment } from "react";
import { css } from "@/components/site/css";
import "./celsus.css";

const SHOW_TESTIMONIALS = false;

export default class CelsUSBoard extends Component<Record<string, never>, any> {
  constructor(props) {
    super(props);
    this.state = { menuOpen: false, pathStep: 0, qi: 0, answer: null, score: 0, done: false, es: true, cStarted: false, cPhase: 'speak', cSpoken: 0, cSpeaking: false, faq: 0,
      simStep: 0, simMsgs: [], simTyping: false, simChoosing: false, simFinished: false, simScore: 0 };
    this._timers = [];
    this.Q = [
      { q: 'What is the supreme law of the land?', audio: '/site/celsus-civics-1.mp4', wt: [0.0, 0.313, 0.476, 0.592, 1.173, 1.544, 1.73, 1.858], qEs: '¿Cuál es la ley suprema del país?', opts: ['Federal court rulings', 'The Declaration of Independence', 'The Constitution', 'The Bill of Rights'], es: ['Fallos de las cortes federales', 'La Declaración de Independencia', 'La Constitución', 'La Carta de Derechos'], a: 2, why: 'La Constitución está por encima de cualquier otra ley. La Declaración anunció la independencia, pero no gobierna.' },
      { q: 'What is one right or freedom from the First Amendment?', audio: '/site/celsus-civics-2.mp4', wt: [0.0, 0.232, 0.395, 0.615, 0.871, 1.045, 1.486, 1.649, 1.753, 2.032], qEs: '¿Cuál es un derecho o libertad de la Primera Enmienda?', opts: ['The right to a job', 'The right to free housing', 'Freedom of speech', "The right to a driver's license"], es: ['El derecho a un empleo', 'El derecho a vivienda gratis', 'La libertad de expresión', 'El derecho a una licencia de manejo'], a: 2, why: 'La Primera Enmienda protege la libertad de expresión, religión, reunión, prensa y petición.' },
      { q: 'What is the "rule of law"?', audio: '/site/celsus-civics-3.mp4', wt: [0.0, 0.244, 0.383, 0.499, 0.789, 0.917], qEs: '¿Qué es el "Estado de derecho"?', opts: ['The President decides what the law means', 'The oldest law always wins', 'Laws apply only to citizens', 'Everyone must follow the law, including leaders and the government'], es: ['El Presidente decide qué significa la ley', 'La ley más antigua siempre gana', 'Las leyes solo aplican a los ciudadanos', 'Todos deben obedecer la ley, incluso los líderes y el gobierno'], a: 3, why: 'Nadie está por encima de la ley: ni los líderes ni el propio gobierno.' },
      { q: 'How are changes made to the U.S. Constitution?', audio: '/site/celsus-civics-4.mp4', wt: [0.0, 0.244, 0.406, 0.871, 1.08, 1.196, 1.3, 1.567], qEs: '¿Cómo se hacen cambios a la Constitución?', opts: ['By a national opinion poll', 'Through amendments', 'By a vote of the Supreme Court', 'By order of the President'], es: ['Con una encuesta nacional', 'Mediante enmiendas', 'Por voto de la Corte Suprema', 'Por orden del Presidente'], a: 1, why: 'Solo el proceso de enmienda puede cambiar la Constitución.' },
      { q: 'What is the economic system in the United States?', audio: '/site/celsus-civics-5.mp4', wt: [0.0, 0.255, 0.372, 0.511, 1.022, 1.614, 1.765, 1.892, 2.218], qEs: '¿Cuál es el sistema económico de Estados Unidos?', opts: ['A socialist economy', 'A barter economy', 'A capitalist or market economy', 'A command economy'], es: ['Una economía socialista', 'Una economía de trueque', 'Una economía capitalista o de mercado', 'Una economía planificada'], a: 2, why: 'Las empresas y las personas, no el gobierno, toman la mayoría de las decisiones económicas.' }
    ];
    this.SIM = [
      { audio: '/site/celsus-officer-1.mp4', wt: [0.0, 0.255, 1.08, 1.486, 1.753, 1.904, 2.113, 2.949, 3.111, 3.274, 3.634, 3.727, 3.901, 4.005], officer: 'Good morning. Please raise your right hand. Do you swear to tell the truth?', hint: '¿Jura decir la verdad?', choices: ['Yes, I do.', 'Yes, I am.'], a: 0, tip: 'Responde con el mismo verbo de la pregunta: "Do you…?" → "Yes, I do."' },
      { audio: '/site/celsus-officer-2.mp4', wt: [0.0, 0.29, 0.418, 0.476, 0.789, 0.975, 1.057, 1.219, 1.382, 1.649, 1.95, 2.043, 2.183], officer: 'Please have a seat. May I see your green card and your ID?', hint: '¿Me permite ver su green card e identificación?', choices: ['I see you.', 'Sure, here you are.'], a: 1, tip: '"Here you are" significa "aquí tiene". Úsalo al entregar documentos.' },
      { audio: '/site/celsus-officer-3.mp4', wt: [0.0, 0.221, 0.348, 0.697, 1.01, 1.115, 1.428, 1.962, 2.125, 2.229, 2.485, 2.728], officer: 'Have you traveled outside the United States in the last five years?', hint: '¿Ha viajado fuera de EE.UU. en los últimos cinco años?', choices: ['Yes, I went to Mexico last December to visit my family.', 'Yes, I have a country.'], a: 0, tip: 'Contesta con datos concretos: a dónde fuiste, cuándo y por qué.' },
      { audio: '/site/celsus-officer-4.mp4', wt: [0.0, 0.221, 0.313, 0.418, 0.546, 0.639, 1.068, 1.231, 1.556], officer: 'Why do you want to become a U.S. citizen?', hint: '¿Por qué quiere ser ciudadano estadounidense?', choices: ['Because yes.', 'I want to vote and be a full part of this country.'], a: 1, tip: 'Una respuesta corta y sincera es suficiente.' }
    ];
  }
  componentDidMount() {
    var self = this;
    // Sound only after the visitor interacts with the page (spec: design rules → sounds).
    this._onUser = function () { self._user = true; };
    window.addEventListener('pointerdown', this._onUser, { once: true, capture: true });
    window.addEventListener('keydown', this._onUser, { once: true, capture: true });
    this._pt = setInterval(function () { self.setState({ pathStep: (self.state.pathStep + 1) % 4 }); }, 3000);
    this._simStart();
    try {
      var choose = function () {
        var vs = window.speechSynthesis.getVoices().filter(function (v) { return /^en[-_]US/i.test(v.lang); });
        var prefs = [/natural/i, /neural/i, /online/i, /Google US English/i, /Samantha/i, /Aria/i, /Jenny/i, /Zira/i];
        var pick = null;
        for (var i = 0; i < prefs.length && !pick; i++) { pick = vs.filter(function (v) { return prefs[i].test(v.name); })[0] || null; }
        self._voice = pick || vs[0] || null;
      };
      choose(); window.speechSynthesis.onvoiceschanged = choose;
    } catch (e) {}
  }
  componentWillUnmount() { window.removeEventListener('pointerdown', this._onUser, true); window.removeEventListener('keydown', this._onUser, true); clearInterval(this._pt); this._timers.forEach(clearTimeout); this._cClear(); }
  _later(fn, ms) { this._timers.push(setTimeout(fn, ms)); }
  _ac_() { try { if (!this._ac) this._ac = new (window.AudioContext || window.webkitAudioContext)(); if (this._ac.state !== 'running') this._ac.resume(); } catch (e) {} return this._ac; }
  _bass(freq, at, dur, vol) {
    try {
      if (!this._user) return;
      var ac = this._ac_(); if (!ac) return; var t = ac.currentTime + (at || 0);
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(ac.destination);
      [[freq, 1, 'sine'], [freq * 2, .35, 'triangle'], [freq * 3, .12, 'sine']].forEach(function (h) {
        var o = ac.createOscillator(), g = ac.createGain(); o.type = h[2]; o.frequency.value = h[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((vol || .22) * h[1], t + .02); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || .4));
        o.connect(g); g.connect(lp); o.start(t); o.stop(t + (dur || .4) + .05);
      });
    } catch (e) {}
  }
  _cClear() { (this._cT || []).forEach(clearTimeout); this._cT = []; try { window.speechSynthesis.cancel(); } catch (e) {} if (this._cAudio) { try { this._cAudio.pause(); } catch (e) {} } }
  _cLater(fn, ms) { this._cT = this._cT || []; this._cT.push(setTimeout(fn, ms)); }
  _cSpeak(qi, onDone) {
    var self = this, q = this.Q[qi], words = q.q.split(' '), starts = [], c = 0, ended = false, got = false;
    words.forEach(function (w) { starts.push(c); c += w.length + 1; });
    this.setState({ cSpoken: 0, cSpeaking: true });
    var finish = function () { if (ended) return; ended = true; self.setState({ cSpoken: words.length, cSpeaking: false }); if (onDone) onDone(); };
    var timed = function (per) { words.forEach(function (w, i) { self._cLater(function () { if (!ended) self.setState({ cSpoken: i + 1 }); }, i * per); }); self._cLater(finish, words.length * per + 250); };
    var byChar = function (ci) { var n = 0; for (var i = 0; i < starts.length; i++) if (starts[i] <= ci) n = i + 1; if (n > self.state.cSpoken) self.setState({ cSpoken: n }); };
    try {
      if (q.audio) {
        var au = new Audio(q.audio); this._cAudio = au;
        au.ontimeupdate = function () { if (q.wt) { var n = 0; for (var i = 0; i < q.wt.length; i++) if (q.wt[i] <= au.currentTime + 0.04) n = i + 1; if (n > self.state.cSpoken) self.setState({ cSpoken: n }); } else if (au.duration) byChar(Math.floor(au.currentTime / au.duration * q.q.length)); };
        au.onended = finish; var pr = au.play(); if (pr && pr.catch) pr.catch(function () { timed(300); }); return;
      }
      var u = new SpeechSynthesisUtterance(q.q); u.lang = 'en-US'; u.rate = 0.9; if (this._voice) u.voice = this._voice;
      u.onboundary = function (e) { got = true; byChar(e.charIndex); };
      u.onend = function () { self._cLater(finish, 120); };
      u.onerror = function () { if (!got) timed(300); };
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
      this._cLater(function () { if (!got && self.state.cSpoken === 0) timed(280); }, 700);
      this._cLater(finish, words.length * 600 + 2500);
    } catch (e) { timed(300); }
  }
  _cPlay(qi) {
    var self = this;
    this._cClear();
    this.setState({ qi: qi, cStarted: true, done: false, cPhase: 'speak', answer: null });
    this._cSpeak(qi, function () {
      self._cLater(function () {
        self.setState({ cPhase: 'opts' });
        [98, 131, 165, 196].forEach(function (f, i) { self._bass(f, i * 0.12, .42, .24); });
      }, 250);
    });
  }
  _play(url) { try { if (this._simAudio) this._simAudio.pause(); if (!url || !this._user) return; var a = new Audio(url); this._simAudio = a; var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  _say(text) {
    try { var u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.9; if (this._voice) u.voice = this._voice; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) {}
  }
  _simOfficer(i) {
    var self = this, step = this.SIM[i];
    this.setState({ simTyping: true, simChoosing: false });
    this._later(function () {
      self.setState({ simTyping: false, simChoosing: true, simStep: i, simMsgs: self.state.simMsgs.concat([{ who: 'officer', text: step.officer, hint: step.hint }]) });
      self._play(step.audio);
    }, 1100);
  }
  _simStart() {
    this._timers.forEach(clearTimeout); this._timers = [];
    this.setState({ simStep: 0, simMsgs: [], simFinished: false, simScore: 0 });
    this._simOfficer(0);
  }
  renderVals() {
    var self = this, s = this.state;
    // fireworks (same system as the homepage)
    var burst = function (list) {
      return list.map(function (b) {
        var sparks = [];
        for (var k = 0; k < 14; k++) sparks.push({ style: '--a: ' + (k * 360 / 14) + 'deg; --d: ' + b.d + 's; --r: ' + (b.r * (k % 2 ? 0.82 : 1)) + 'px;' });
        return { style: 'left: ' + b.x + '%; top: ' + b.y + '%; color: ' + b.c + '; --d: ' + b.d + 's; opacity: ' + b.op + '; transform: scale(' + b.sc + ');', sparks: sparks };
      });
    };
    // path
    var P = [
      { t: 'Aprende la cívica', d: 'Las preguntas oficiales explicadas de forma sencilla, con audio y apoyo en español.' },
      { t: 'Domina el inglés de la entrevista', d: 'El vocabulario y las frases que usa el oficial, para entender y responder con calma.' },
      { t: 'Practica con simulacros', d: 'Ensaya la entrevista completa hasta que se sienta natural.' },
      { t: 'Preséntate con confianza', d: 'Llegas preparado, entiendes lo que te preguntan y respondes con seguridad.' }
    ];
    var COLORS = ['#194876', '#2C6BC4', '#B5232C', '#C9A227'];
    var path = P.map(function (p, i) {
      var on = i === s.pathStep, done = i < s.pathStep;
      return { num: i === 3 ? '★' : String(i + 1), title: p.t, desc: p.d,
        style: 'display: flex; flex-direction: column; gap: 10px; padding: 24px; border-radius: 18px; transition: all .4s ease; ' +
          (on ? 'background: linear-gradient(150deg, ' + COLORS[i] + ', #0E2A4F); color: #FFFFFF; transform: translateY(-6px); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 28px 50px -20px rgba(10,30,70,.6);'
              : 'background: #FFFFFF; color: #0F0D1E; box-shadow: inset 0 1px 0 #FFFFFF, 0 2px 4px rgba(10,20,40,.08), 0 18px 36px -18px rgba(10,20,40,.35);'),
        numStyle: 'width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px; ' +
          (on ? 'background: #FFFFFF; color: ' + COLORS[i] + ';' : (done ? 'background: ' + COLORS[i] + '; color: #FFFFFF;' : 'background: #E0EAF5; color: #194876;')) };
    });
    // civics practice
    var Q = this.Q, q = Q[Math.min(s.qi, Q.length - 1)];
    var base = 'display: flex; align-items: center; gap: 12px; text-align: left; min-height: 54px; padding: 10px 14px; border-radius: 12px; font-weight: 600; font-size: 15px; cursor: pointer; font-family: inherit; animation-delay: ';
    var options = q.opts.map(function (t, i) {
      var st, bs = 'flex: 0 0 auto; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; ';
      if (s.answer === null) { st = 'background: linear-gradient(180deg,#FFFFFF,#F4F6FA); color: #0F0D1E; border: 1px solid #CFD8E6;'; bs += 'background: #194876; color: #FFFFFF;'; }
      else if (i === q.a) { st = 'background: #EAF8DD; color: #1F4D0E; border: 1px solid #6FB43F; box-shadow: 0 0 0 3px rgba(111,180,63,.22);'; bs += 'background: #4E9A2A; color: #FFFFFF;'; }
      else if (i === s.answer) { st = 'background: #FBECEC; color: #8A1C22; border: 1px solid #B5232C;'; bs += 'background: #B5232C; color: #FFFFFF;'; }
      else { st = 'background: #FFFFFF; color: #8A8599; border: 1px solid #ECEAF2;'; bs += 'background: #ECEAF2; color: #8A8599;'; }
      return { text: t, es: q.es[i], letter: 'ABCD'[i], badgeStyle: bs, cls: 'cu-opt cu-optin' + (s.answer === null ? ' cu-opt-live' : ''),
        style: base + (i * 60) + 'ms; ' + st,
        pick: function () { if (self.state.answer !== null) return; var ok = i === q.a; if (ok) { self._bass(196, 0, .3, .2); self._bass(262, .14, .5, .2); } else { self._bass(87, 0, .55, .26); } self.setState({ answer: i, score: self.state.score + (ok ? 1 : 0) }); } };
    });
    var right = s.answer === q.a;
    var civ = {
      dots: Q.map(function (x, i) { return { style: 'flex: 1; height: 6px; border-radius: 3px; transition: background .3s; background: ' + (s.done || i < s.qi ? '#194876' : (i === s.qi ? '#C9A227' : '#E2E6EE')) + ';' }; }),
      intro: !s.cStarted, active: s.cStarted && !s.done, done: s.done, pos: (s.qi + 1) + ' DE ' + Q.length, q: q.q, qEs: q.qEs, showEs: s.es, showEsQ: s.es && s.cPhase === 'opts', showOpts: s.cPhase === 'opts', speaking: s.cSpeaking, notSpeaking: !s.cSpeaking, spkClass: 'cu-btn cu-btn-light' + (s.cSpeaking ? ' cu-pulse' : ''), start: function () { self.setState({ score: 0 }); self._cPlay(0); },
      words: q.q.split(' ').map(function (t, i) { var on = i < s.cSpoken, cur = s.cSpeaking && i === s.cSpoken - 1; return { t: t, cls: 'cu-wd ' + (on ? 'cu-wd-on' : 'cu-wd-off'), style: cur ? 'color: #FFD24D;' : 'color: #FFFFFF;' }; }),
      esPressed: s.es ? 'true' : 'false', esLabel: s.es ? 'Ocultar español' : 'Ver en español',
      esStyle: 'border: 1px solid #CFD8E6; background: #FFFFFF; color: #194876; font-family: inherit; font-weight: 700; font-size: 13px; padding: 8px 12px; border-radius: 8px; cursor: pointer; min-height: 36px;',
      toggleEs: function () { self.setState({ es: !self.state.es }); },
      speak: function () { if (!self.state.cSpeaking) self._cSpeak(self.state.qi, null); },
      options: options, answered: s.answer !== null,
      fbTitle: right ? 'Correcto' : 'La respuesta correcta es: ' + q.opts[q.a],
      why: q.why,
      fbStyle: 'display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; color: #0F0D1E; ' + (right ? 'background: #EAF8DD;' : 'background: #FBECEC;'),
      nextLabel: s.qi < Q.length - 1 ? 'Siguiente pregunta' : 'Ver mi resultado',
      next: function () { if (self.state.qi < Q.length - 1) self._cPlay(self.state.qi + 1); else { self._cClear(); self.setState({ done: true }); [131, 165, 196, 262].forEach(function (f, i) { self._bass(f, i * 0.14, .6, .2); }); } },
      restart: function () { self.setState({ score: 0 }); self._cPlay(0); },
      score: s.score,
      verdict: s.score >= 4 ? '¡Vas muy bien! Con práctica constante llegarás al examen con total seguridad.' : (s.score >= 2 ? 'Buen comienzo. Con el curso completo practicas todas las preguntas con audio y explicaciones.' : 'No te preocupes: para eso es el curso. Practicarás cada pregunta hasta dominarla.')
    };
    // interview simulator
    var step = this.SIM[s.simStep];
    var sim = {
      typing: s.simTyping, choosing: s.simChoosing && !s.simFinished, finished: s.simFinished,
      result: 'Entrevista de práctica completada: ' + s.simScore + ' de ' + this.SIM.length + ' respuestas ideales.',
      restart: function () { self._simStart(); },
      msgs: s.simMsgs.map(function (m) {
        var off = m.who === 'officer', tip = m.who === 'tip';
        return { text: m.text, hint: m.hint || '', hasHint: !!m.hint,
          wrap: 'display: flex; flex-direction: column; gap: 4px; max-width: 86%; align-self: ' + (off || tip ? 'flex-start' : 'flex-end') + ';',
          style: off ? 'background: #FFFFFF; color: #0F0D1E; font-weight: 600; font-size: 15px; line-height: 1.45; padding: 11px 14px; border-radius: 14px 14px 14px 4px; box-shadow: 0 6px 14px -8px rgba(10,20,40,.35);'
               : tip ? 'background: #FFF6D6; color: #5A4300; font-weight: 600; font-size: 13px; line-height: 1.45; padding: 9px 12px; border-radius: 12px; border: 1px solid #F0D98A;'
               : 'background: linear-gradient(180deg, #2C6BC4, #194876); color: #FFFFFF; font-weight: 700; font-size: 15px; line-height: 1.45; padding: 11px 14px; border-radius: 14px 14px 4px 14px;',
          hintStyle: 'font-size: 12px; color: #6B7A90; padding-left: 4px;' };
      }),
      choices: step.choices.map(function (c, i) {
        return { text: c, style: 'text-align: left; min-height: 48px; padding: 11px 14px; border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 15px; cursor: pointer; background: linear-gradient(180deg,#FFFFFF,#F4F6FA); color: #0F0D1E; border: 1px solid #CFD8E6; animation-delay: ' + (i * 150) + 'ms;',
          pick: function () {
            if (!self.state.simChoosing) return;
            var ok = i === step.a, msgs = self.state.simMsgs.concat([{ who: 'me', text: c }]);
            msgs = msgs.concat([{ who: 'tip', text: (ok ? 'Muy bien. ' : 'Mejor respuesta: "' + step.choices[step.a] + '". ') + step.tip }]);
            var sc = self.state.simScore + (ok ? 1 : 0);
            self.setState({ simMsgs: msgs, simChoosing: false, simScore: sc });
            if (self.state.simStep < self.SIM.length - 1) self._simOfficer(self.state.simStep + 1);
            else self._later(function () { self.setState({ simMsgs: self.state.simMsgs.concat([{ who: 'officer', text: 'Thank you. That is all for today. Congratulations!', hint: 'Gracias, es todo por hoy. ¡Felicidades!' }]), simFinished: true }); self._play('/site/celsus-officer-5.mp4'); }, 900);
          } };
      })
    };
    var FAQ = [
      { q: '¿Tengo que hablar inglés en la entrevista?', a: 'En la mayoría de los casos, sí: la entrevista y el examen se hacen en inglés. CelsUS te prepara para entender al oficial y responder con seguridad. Existen excepciones por edad y años de residencia: para revisar tu caso, te recomendamos a nuestro aliado legal, Hendricks Law.' },
      { q: '¿Cómo es el examen de cívica?', a: 'El oficial te puede hacer hasta 20 preguntas de la lista oficial y necesitas responder 12 correctamente. En CelsUS practicas con exámenes simulados del mismo formato.' },
      { q: '¿CelsUS es parte del gobierno o de USCIS?', a: 'No. CelsUS es un proveedor educativo independiente y no está afiliado con USCIS ni con ninguna agencia gubernamental.' },
      { q: '¿Viene en español?', a: 'Sí. Practicas en inglés, como en la entrevista real, con traducción y explicaciones en español. Además incluimos el examen completo en español y la versión 65/20 para quienes califican.' },
      { q: '¿Qué agrega el Paquete Completo?', a: 'Simulacros de entrevista con retroalimentación personalizada, un cuaderno de trabajo en PDF, certificado de finalización y soporte prioritario por correo.' },
      { q: '¿Cuánto tiempo tengo acceso?', a: '12 meses desde tu inscripción, desde tu celular, tableta o computadora.' }
    ];
    return {
      menuOpen: s.menuOpen,
      menuExpanded: s.menuOpen ? 'true' : 'false',
      toggleMenu: function () { self.setState({ menuOpen: !self.state.menuOpen }); },
      fwBack: burst([{ x: 22, y: 22, c: '#7FB8FF', d: 0, r: 34, sc: .7, op: .75 }, { x: 76, y: 18, c: '#FFE07A', d: 2.4, r: 30, sc: .65, op: .7 }]),
      fwFront: burst([{ x: 11, y: 62, c: '#FF5A5A', d: 1.2, r: 58, sc: 1, op: 1 }, { x: 90, y: 56, c: '#FFFFFF', d: 3.6, r: 54, sc: 1, op: 1 }]),
      fwCta: burst([{ x: 70, y: 30, c: '#FFE07A', d: 0.6, r: 40, sc: .8, op: .9 }, { x: 88, y: 60, c: '#FF5A5A', d: 3, r: 36, sc: .7, op: .9 }]),
      path: path, civ: civ, sim: sim,
      faqs: FAQ.map(function (f, i) {
        var open = s.faq === i;
        return { q: f.q, a: f.a, open: open, expanded: open ? 'true' : 'false', toggle: function () { self.setState({ faq: self.state.faq === i ? -1 : i }); },
          iconStyle: 'flex: 0 0 auto; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform .25s ease, background .25s; ' +
            (open ? 'background: #194876; color: #FFFFFF; transform: rotate(45deg);' : 'background: #F6F5F9; color: #0F0D1E;') };
      })
    };
  }

  render() {
    const v = this.renderVals();
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
<a href="#practica" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Practica</a>
<a href="#precios" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Precios</a>
<a href="#entrevista" style={{ color: "#3F3B52", textDecoration: "none", padding: "10px 0" }}>Entrevista</a>
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
<a href="#practica" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Practica</a>
<a href="#precios" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Precios</a>
<a href="#entrevista" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Entrevista</a>
<a href="#faq" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Preguntas</a>
<a href="/entrar" style={{ color: "#0F0D1E", textDecoration: "none", padding: "13px 0" }}>Iniciar sesión</a>
</div>
</>) : null}
</header>

{/* HERO */}
<section id="inicio" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #1E4A7E 0%, #153A66 50%, #0E2A4F 100%)", color: "#FFFFFF", padding: "64px 20px 120px" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "-180px", left: "-160px", width: "620px", height: "620px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,210,77,.20) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px 56px", alignItems: "center" }}>
<div style={{ flex: "1 1 460px", minWidth: "0", display: "flex", flexDirection: "column", gap: "20px" }}>
<a href="/#programas" style={{ alignSelf: "flex-start", color: "#B9D2F2", fontWeight: "700", fontSize: "14px", textDecoration: "none" }}>← Todos los programas</a>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#FFD24D" }}>CELSUS · CIUDADANÍA</span>
<h1 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(40px, 5.6vw, 68px)", lineHeight: "1.04", letterSpacing: "-2px" }}>English for Us.<br />Confidence for Life.</h1>
<p style={{ margin: "0", fontSize: "19px", lineHeight: "1.6", color: "#D3E2F5", maxWidth: "560px" }}>Prepárate para tu entrevista de ciudadanía: el inglés que vas a escuchar, las preguntas de cívica con audio y simulacros de la entrevista. Todo en inglés con apoyo en español.</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
<a href="#practica" className="cu-btn cu-btn-light">Practica una pregunta <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
<a href="#precios" className="cu-btn cu-btn-pink">Ver planes</a>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.14)" }}>Las 128 preguntas oficiales</span>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.14)" }}>Versión completa en español</span>
<span style={{ fontWeight: "700", fontSize: "14px", padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.14)" }}>Desde $139 USD</span>
</div>
<p style={{ margin: "0", fontSize: "12px", color: "#9DB7D8" }}>CelsUS es un proveedor educativo independiente y no está afiliado con USCIS ni con ninguna agencia gubernamental.</p>
</div>
<div aria-hidden="true" style={{ flex: "1 1 420px", minWidth: "0" }}>
<div className="cu-raise-dark" style={{ position: "relative", overflow: "hidden", borderRadius: "24px", aspectRatio: "16 / 10", background: "#0A2340" }}>
<img className="cu-pan" src="/site/celsus-us3d.jpg" alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} />
{(v.fwBack ?? []).map((f: any, __i: number) => (<Fragment key={__i}><span className="cu-fw" style={css(f.style)}><u></u><b></b>{(f.sparks ?? []).map((k: any, __i: number) => (<Fragment key={__i}><i style={css(k.style)}></i></Fragment>))}</span></Fragment>))}
{(v.fwFront ?? []).map((f: any, __i: number) => (<Fragment key={__i}><span className="cu-fw" style={css(f.style)}><u></u><b></b>{(f.sparks ?? []).map((k: any, __i: number) => (<Fragment key={__i}><i style={css(k.style)}></i></Fragment>))}</span></Fragment>))}
</div>
</div>
</div>
</section>

{/* PATH TO CITIZENSHIP */}
<section style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #0E2A4F 0px, #102D53 33px, #14345D 67px, #1C406E 100px, #254F83 133px, #3B669C 167px, #6488B6 200px, #8EABCF 233px, #A9C0DD 267px, #BBCDE4 300px, #C8D8E9 333px, #D2DEED 367px, #D5E1EE 400px, #C6D6E8 100%)" }}>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "220px", right: "-140px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#1E4877" }}>TU CAMINO</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Cuatro pasos hacia tu ciudadanía.</h2>
</div>
<ol style={{ listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: "14px" }}>
{(v.path ?? []).map((p: any, __i: number) => (<Fragment key={__i}>
<li style={css(p.style)}>
<span style={css(p.numStyle)}>{p.num}</span>
<strong style={{ fontWeight: "800", fontSize: "20px", lineHeight: "1.25" }}>{p.title}</strong>
<span style={{ fontSize: "15px", lineHeight: "1.55", opacity: ".85" }}>{p.desc}</span>
</li>
</Fragment>))}
</ol>
</div>
</section>

{/* CIVICS PRACTICE */}
<section id="practica" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #C6D6E8 0px, #C1D2E5 33px, #B2C6DD 67px, #9CB4D2 100px, #829EC3 133px, #6583AC 167px, #48628A 200px, #2D4269 233px, #1F355B 267px, #193156 300px, #132D52 333px, #0F2B50 367px, #0E2A4F 400px, #0B1E3A 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px 56px", alignItems: "center" }}>
<div className="cu-from-l" style={{ flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#FFD24D" }}>PRACTICA COMO EN EL EXAMEN</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Preguntas reales de cívica.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#C9D6EE" }}>En la entrevista te pueden hacer hasta 20 preguntas y necesitas 12 correctas. Pruébate con cinco preguntas de nuestro banco interactivo. En el curso practicas las 128 preguntas oficiales, con el examen completo también en español.</p>
</div>
<div className="cu-tilt cu-raise-dark" style={{ flex: "1 1 480px", minWidth: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "22px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
<div aria-hidden="true" style={{ display: "flex", gap: "6px" }}>{(v.civ.dots ?? []).map((d: any, __i: number) => (<Fragment key={__i}><span style={css(d.style)}></span></Fragment>))}</div>
{v.civ.intro ? (<>
<div style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "14px", padding: "28px 24px", borderRadius: "16px", background: "linear-gradient(150deg, #1E4A7E, #0E2A4F)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#FFD24D" }}>5 PREGUNTAS · COMO EN LA ENTREVISTA</span>
<p style={{ margin: "0", fontWeight: "800", fontSize: "24px", lineHeight: "1.3" }}>Escucha la pregunta en inglés y elige la respuesta correcta.</p>
<button type="button" className="cu-btn cu-btn-light" onClick={v.civ.start}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>Comenzar práctica</button>
</div>
</>) : null}
{v.civ.active ? (<>
<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
<span style={{ fontWeight: "800", fontSize: "12px", letterSpacing: "1.2px", color: "#194876", background: "#E0EAF5", padding: "6px 10px", borderRadius: "8px" }}>PREGUNTA {v.civ.pos}</span>
<button type="button" onClick={v.civ.toggleEs} aria-pressed={v.civ.esPressed} style={css(v.civ.esStyle)}>{v.civ.esLabel}</button>
</div>
<div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: "16px", padding: "20px", borderRadius: "16px", background: "linear-gradient(150deg, #1E4A7E, #0E2A4F)", color: "#FFFFFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<button type="button" className={v.civ.spkClass} onClick={v.civ.speak} aria-label="Escuchar la pregunta" style={{ position: "relative", width: "52px", height: "52px", padding: "0", borderRadius: "50%", flex: "0 0 auto" }}>
{v.civ.speaking ? (<><span className="cu-eq" style={{ display: "flex", alignItems: "center", gap: "3px", height: "20px" }}><span style={{ background: "#194876" }}></span><span style={{ background: "#194876" }}></span><span style={{ background: "#194876" }}></span><span style={{ background: "#194876" }}></span></span></>) : null}
{v.civ.notSpeaking ? (<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></svg></>) : null}
</button>
<div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 auto", minWidth: "0" }}>
<p aria-label={v.civ.q} style={{ margin: "0", fontWeight: "800", fontSize: "clamp(19px, 2.2vw, 24px)", lineHeight: "1.3" }}>{(v.civ.words ?? []).map((w: any, __i: number) => (<Fragment key={__i}><span className={w.cls} style={css(w.style)}>{w.t}</span></Fragment>))}</p>
{v.civ.showEsQ ? (<><p className="cu-drop" style={{ margin: "0", fontSize: "15px", color: "#B9D2F2" }}>{v.civ.qEs}</p></>) : null}
</div>
</div>
{v.civ.showOpts ? (<>
<div className="cu-open" style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
{(v.civ.options ?? []).map((o: any, __i: number) => (<Fragment key={__i}>
<button type="button" className={o.cls} onClick={o.pick} style={css(o.style)}><span style={css(o.badgeStyle)}>{o.letter}</span><span style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span>{o.text}</span>{v.civ.showEs ? (<><span style={{ fontSize: "13px", fontWeight: "500", color: "#6B6680" }}>{o.es}</span></>) : null}</span></button>
</Fragment>))}
</div>
</>) : null}
{v.civ.answered ? (<>
<div className="cu-drop" style={css(v.civ.fbStyle)}>
<div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 220px" }}>
<p style={{ margin: "0", fontWeight: "800", fontSize: "16px" }}>{v.civ.fbTitle}</p>
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.5" }}>{v.civ.why}</p>
</div>
<button type="button" className="cu-btn cu-btn-dark cu-btn-sm" onClick={v.civ.next}>{v.civ.nextLabel}</button>
</div>
</>) : null}
</div>
</>) : null}
{v.civ.done ? (<>
<div className="cu-drop" style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "1.5px", color: "#6B6680" }}>TU RESULTADO</span>
<p style={{ margin: "0", fontWeight: "800", fontSize: "48px", lineHeight: "1" }}>{v.civ.score} <span style={{ fontSize: "22px", color: "#6B6680" }}>de 5</span></p>
<p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#3F3B52" }}>{v.civ.verdict}</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<a href="#precios" className="cu-btn cu-btn-pink cu-btn-sm">Practica todas las preguntas</a>
<button type="button" className="cu-btn cu-btn-light cu-btn-sm" onClick={v.civ.restart}>Repetir</button>
</div>
</div>
</>) : null}

</div>
</div>
</section>

{/* INTERVIEW SIMULATOR */}
<section id="entrevista" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #0B1E3A 0px, #0D213F 33px, #122A4D 67px, #1A3962 100px, #244C7E 133px, #3B669C 167px, #6488B6 200px, #8EABCF 233px, #A9C0DD 267px, #BBCDE4 300px, #C8D8E9 333px, #D2DEED 367px, #D5E1EE 400px, #C6D6E8 100%)" }}>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", bottom: "-160px", left: "-140px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.6) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px 56px", alignItems: "flex-start" }}>
<div className="cu-from-l" style={{ flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#B5232C" }}>SIMULADOR DE ENTREVISTA</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Siéntate frente al oficial.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#24384F" }}>La entrevista no es solo cívica: el oficial te habla en inglés desde que entras. Elige tu respuesta y practica la conversación real.</p>
<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
<span style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "15px", color: "#24384F" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#194876" }}></span>El oficial te habla en inglés</span>
<span style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "15px", color: "#24384F" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#B5232C" }}></span>Tú eliges la mejor respuesta</span>
<span style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "15px", color: "#24384F" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#C9A227" }}></span>Recibes un consejo en español</span>
</div>
</div>
<div className="cu-tilt cu-raise" style={{ flex: "1 1 480px", minWidth: "0", display: "flex", flexDirection: "column", borderRadius: "22px", overflow: "hidden", background: "#FFFFFF" }}>
<div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", background: "linear-gradient(180deg, #1E4A7E, #153A66)", color: "#FFFFFF" }}>
<span aria-hidden="true" style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#FFFFFF", color: "#194876", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg></span>
<span style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}><strong style={{ fontSize: "15px" }}>Oficial de inmigración</strong><span style={{ fontSize: "12px", color: "#B9D2F2" }}>Simulación de práctica · con audio</span></span>
<button type="button" onClick={v.sim.restart} style={{ marginLeft: "auto", border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "#FFFFFF", fontFamily: "inherit", fontWeight: "700", fontSize: "13px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>Reiniciar</button>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "18px", minHeight: "360px", background: "#F4F7FB" }}>
{(v.sim.msgs ?? []).map((m: any, __i: number) => (<Fragment key={__i}>
<div className="cu-drop" style={css(m.wrap)}>
<span style={css(m.style)}>{m.text}</span>
{m.hasHint ? (<><span style={css(m.hintStyle)}>{m.hint}</span></>) : null}
</div>
</Fragment>))}
{v.sim.typing ? (<>
<span aria-label="El oficial est\u00e1 escribiendo" className="cu-eq" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "3px", height: "30px", padding: "0 14px", borderRadius: "14px", background: "#FFFFFF", boxShadow: "0 4px 10px -6px rgba(10,20,40,.3)" }}><span style={{ background: "#9DB7D8", height: "10px" }}></span><span style={{ background: "#9DB7D8", height: "10px" }}></span><span style={{ background: "#9DB7D8", height: "10px" }}></span></span>
</>) : null}
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "14px 18px 18px", borderTop: "1px solid #E6ECF4" }}>
{v.sim.choosing ? (<>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "1px", color: "#6B6680" }}>ELIGE TU RESPUESTA</span>
{(v.sim.choices ?? []).map((c: any, __i: number) => (<Fragment key={__i}>
<button type="button" className="cu-opt cu-optin cu-opt-live" onClick={c.pick} style={css(c.style)}>{c.text}</button>
</Fragment>))}
</>) : null}
{v.sim.finished ? (<>
<div className="cu-drop" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
<span style={{ fontWeight: "800", fontSize: "16px", color: "#0F0D1E" }}>{v.sim.result}</span>
<a href="#precios" className="cu-btn cu-btn-pink cu-btn-sm">Practica simulacros completos</a>
</div>
</>) : null}
</div>
</div>
</div>
</section>

{/* LEGAL PARTNER */}
<section style={{ padding: "0 20px 110px", background: "#C6D6E8" }}>
<div className="cu-reveal cu-raise" style={{ position: "relative", overflow: "hidden", maxWidth: "1240px", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px 32px", padding: "28px", borderRadius: "22px", background: "linear-gradient(135deg, #FFFFFF 0%, #F2F6FB 100%)" }}>
<span aria-hidden="true" style={{ flex: "0 0 auto", width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(160deg, #1E4A7E, #0E2A4F)", color: "#FFD24D", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 28px -12px rgba(14,42,79,.6)" }}>
<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M5 21h14" /><path d="M5 7h14" /><path d="m5 7-3 7a4 4 0 0 0 6 0z" /><path d="m19 7-3 7a4 4 0 0 0 6 0z" /></svg>
</span>
<div style={{ flex: "1 1 420px", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#B5232C" }}>NUESTRO ALIADO LEGAL</span>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "24px", color: "#0F0D1E" }}>¿Dudas sobre tu caso? Habla con Hendricks Law.</h3>
<p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#3F3B52" }}>CelsUS te prepara para la entrevista; las preguntas legales (elegibilidad, excepciones por edad y residencia, documentos) las resuelve un abogado. Trabajamos de la mano con Hendricks Law, firma de inmigración del abogado Michael Hendricks.</p>
<p style={{ margin: "0", fontSize: "12px", color: "#6B6680" }}>CelsUS no ofrece asesoría legal. Hendricks Law es una firma independiente.</p>
</div>
<a href="mailto:hola@celstv.com?subject=Consulta%20con%20Hendricks%20Law" className="cu-btn cu-btn-dark">Contactar a Hendricks Law <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</section>

{/* WHAT'S INCLUDED */}
<section style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #C6D6E8 0px, #C1D2E5 33px, #B2C6DD 67px, #9CB4D2 100px, #829EC3 133px, #6583AC 167px, #48628A 200px, #2D4269 233px, #213860 267px, #1D3962 300px, #193A64 333px, #163A66 367px, #153A66 400px, #0E2A4F 100%)", color: "#FFFFFF" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#FFD24D" }}>QUÉ INCLUYE</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Todo lo que necesitas para el día de tu entrevista.</h2>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "14px" }}>
<div className="cu-sheen cu-tilt" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ width: "40px", height: "6px", borderRadius: "3px", background: "#7FB8FF", boxShadow: "0 0 12px #7FB8FF" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Inglés para la entrevista</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C9D6EE" }}>El vocabulario y las frases que usan los oficiales, para entender cada pregunta.</p></div>
<div className="cu-sheen cu-tilt-2" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ width: "40px", height: "6px", borderRadius: "3px", background: "#FFD24D", boxShadow: "0 0 12px #FFD24D" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Cívica simplificada</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C9D6EE" }}>Las preguntas oficiales con audio, imágenes y quizzes, en inglés con referencia en español.</p></div>
<div className="cu-sheen cu-tilt-3" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ width: "40px", height: "6px", borderRadius: "3px", background: "#8FD15A", boxShadow: "0 0 12px #8FD15A" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Escucha y pronunciación</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C9D6EE" }}>Entrena tu oído y practica cómo suenan tus respuestas.</p></div>
<div className="cu-sheen cu-tilt" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ width: "40px", height: "6px", borderRadius: "3px", background: "#FF7A7A", boxShadow: "0 0 12px #FF7A7A" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Entrevistas simuladas</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C9D6EE" }}>Ensaya la conversación completa con el oficial, paso a paso.</p></div>
<div className="cu-sheen cu-tilt-2" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ width: "40px", height: "6px", borderRadius: "3px", background: "#43D6FE", boxShadow: "0 0 12px #43D6FE" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Situaciones de conversación</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C9D6EE" }}>Preguntas personales e informales que también aparecen en la entrevista.</p></div>
<div className="cu-sheen cu-tilt-3" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ width: "40px", height: "6px", borderRadius: "3px", background: "#C9D3E6", boxShadow: "0 0 12px #C9D3E6" }}></span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "20px" }}>Estudia donde estés</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#C9D6EE" }}>Desde tu celular, tableta o computadora, a tu ritmo.</p></div>

</div>
</div>
</section>

{/* PLANS */}
<section id="precios" style={{ position: "relative", overflowX: "clip", padding: "90px 20px 110px", background: SHOW_TESTIMONIALS ? "linear-gradient(180deg, #0E2A4F 0%, #0B1E3A 100%)" : "linear-gradient(180deg, #0E2A4F 0%, #0B1E3A 70%, #10274A 88%, #153A66 100%)", color: "#FFFFFF" }}>
<span className="cu-orb" aria-hidden="true" style={{ position: "absolute", top: "160px", right: "-140px", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,210,77,.18) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }}></span>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#7FB8FF" }}>PLANES Y PRECIOS</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Elige tu plan de CelsUS.</h2>
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.6", color: "#C9D3E6" }}>Pago único en dólares, sin suscripciones.</p>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "stretch" }}>
<article className="cu-sheen cu-tilt" style={{ position: "relative", flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "30px 28px 28px", borderRadius: "22px", color: "#FFFFFF", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 24px 48px -24px rgba(0,0,0,.6)" }}><span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#FFD24D" }}>CELSUS</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>Acceso Estándar</h3><div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}><span style={{ fontWeight: "800", fontSize: "48px", letterSpacing: "-1.5px", lineHeight: "1" }}>$139</span><span style={{ fontWeight: "700", fontSize: "15px", color: "#C9D3E6" }}>USD · pago único</span></div><span style={{ fontSize: "14px", color: "#A9B4CC", fontWeight: "600" }}>Se cobra en dólares</span><ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Curso completo con lecciones de cívica</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Las preguntas oficiales, en inglés con referencia en español</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Actividades de escucha, habla y comprensión</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Hojas de estudio y flashcards imprimibles</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#B3EC79" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>12 meses de acceso</span></li></ul><a href="/comprar/resumen?producto=celsus_estandar" className="cu-btn cu-btn-light" style={{ marginTop: "auto", alignSelf: "stretch" }}>Inscríbete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a></article>
<article className="cu-sheen cu-tilt-2" style={{ position: "relative", flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px", padding: "30px 28px 28px", borderRadius: "22px", color: "#FFFFFF", background: "linear-gradient(135deg, rgba(242,1,116,.22), rgba(255,255,255,.06))", border: "1px solid rgba(255,120,180,.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 0 44px -8px rgba(242,1,116,.55), 0 34px 70px -24px rgba(0,0,0,.7)" }}><span style={{ position: "absolute", right: "18px", top: "18px", fontWeight: "800", fontSize: "11px", letterSpacing: "1.2px", color: "#FFFFFF", background: "linear-gradient(180deg,#FF3D97,#D9006A)", padding: "6px 10px", borderRadius: "7px", boxShadow: "0 6px 14px -4px rgba(242,1,116,.6)" }}>RECOMENDADO</span><span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#FFD24D" }}>CELSUS</span><h3 style={{ margin: "0", fontWeight: "800", fontSize: "26px", letterSpacing: "-0.4px" }}>Paquete Completo</h3><div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}><span style={{ fontWeight: "800", fontSize: "48px", letterSpacing: "-1.5px", lineHeight: "1" }}>$199</span><span style={{ fontWeight: "700", fontSize: "15px", color: "#C9D3E6" }}>USD · pago único</span></div><span style={{ fontSize: "14px", color: "#A9B4CC", fontWeight: "600" }}>Se cobra en dólares</span><ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Todo lo del Acceso Estándar</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Simulacros de entrevista con retroalimentación personalizada</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Cuaderno de trabajo en PDF</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Certificado de finalización</span></li><li style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.45", color: "#E3E8F2" }}><span style={{ display: "flex", color: "#FF7DB8" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: "2px" }}><path d="M20 6 9 17l-5-5" /></svg></span><span>Soporte prioritario por correo</span></li></ul><a href="/comprar/resumen?producto=celsus_completo" className="cu-btn cu-btn-pink" style={{ marginTop: "auto", alignSelf: "stretch" }}>Inscríbete en Paquete Completo <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a></article>
</div>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
<h3 style={{ margin: "0", fontWeight: "800", fontSize: "22px" }}>Suma el inglés para tu vida diaria</h3>
<div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
<article className="cu-sheen" style={{ flex: "1 1 360px", minWidth: "0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 24px", padding: "22px 24px", borderRadius: "18px", background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 24px 48px -24px rgba(0,0,0,.6)", border: "1px solid rgba(255,255,255,.12)" }}>
<div style={{ flex: "1 1 200px", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
<span style={{ fontWeight: "700", fontSize: "12px", letterSpacing: "1.5px", color: "#7FB8FF" }}>CELSUS + CELSTV · PREMIUM</span>
<strong style={{ fontWeight: "800", fontSize: "20px" }}>Ciudadanía e inglés para tu vida en EE.UU.</strong>
<span style={{ fontSize: "14px", color: "#C9D3E6" }}>Cívica y entrevista, más inglés práctico para el trabajo, las compras y el doctor.</span>
</div>
<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
<span style={{ fontWeight: "800", fontSize: "32px", lineHeight: "1" }}>$299 <span style={{ fontSize: "14px", color: "#C9D3E6" }}>USD</span> <s style={{ fontSize: "16px", color: "#8F8AA8", fontWeight: "600" }}>$348</s></span>
<span style={{ fontSize: "13px", fontWeight: "700", color: "#B3EC79" }}>Ahorras $49 USD</span>
<a href="/comprar/resumen?producto=bundle_us_tvpremium" className="cu-btn cu-btn-light cu-btn-sm">Obtener paquete <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
</div>
</article>
</div>
</div>
</div>
</section>

{/* TESTIMONIALS: hidden until Matt sends real ones (never invent any). */}
{SHOW_TESTIMONIALS ? (
<section style={{ position: "relative", overflowX: "clip", padding: "90px 20px 110px", background: "linear-gradient(180deg, #0B1E3A 0px, #0B1E3A 120px, #10274A 55%, #153A66 100%)", color: "#FFFFFF" }}>
<div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
<div className="cu-reveal" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
<span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "2px", color: "#FFD24D" }}>NUEVOS CIUDADANOS</span>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: "1.1", letterSpacing: "-1px" }}>Historias reales.</h2>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
<figure className="cu-tilt cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsUS]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad, Estado]</figcaption></figure>
<figure className="cu-tilt-2 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsUS]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad, Estado]</figcaption></figure>
<figure className="cu-tilt-3 cu-raise-dark" style={{ flex: "1 1 280px", minWidth: "0", margin: "0", background: "#FFFFFF", color: "#0F0D1E", borderRadius: "16px", padding: "26px", display: "flex", flexDirection: "column", gap: "16px" }}><blockquote style={{ margin: "0", fontSize: "17px", lineHeight: "1.6" }}>"[Testimonio real de un alumno de CelsUS]"</blockquote><figcaption style={{ fontWeight: "600", fontSize: "14px", color: "#6B6680" }}>[Nombre], [Ciudad, Estado]</figcaption></figure>
</div>
</div>
</section>
) : null}

{/* FAQ */}
<section id="faq" style={{ position: "relative", overflowX: "clip", padding: "230px 20px 110px", background: "linear-gradient(180deg, #153A66 0px, #163C69 33px, #1A4170 67px, #20497B 100px, #275389 133px, #3B669C 167px, #6488B6 200px, #8EABCF 233px, #A9C0DD 267px, #BBCDE4 300px, #C8D8E9 333px, #D2DEED 367px, #D5E1EE 400px, #C6D6E8 100%)" }}>
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
<div style={{ position: "relative", overflow: "hidden", maxWidth: "1240px", margin: "0 auto", transform: "perspective(1200px) rotateX(4deg)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 2px 0 #0E2A4F, 0 30px 60px -18px rgba(10,30,70,.5), 0 60px 90px -40px rgba(15,13,30,.45)", background: "linear-gradient(160deg, #1E4A7E 0%, #0E2A4F 75%)", color: "#FFFFFF", borderRadius: "20px", padding: "48px 28px", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between" }}>
<span className="cu-beam cu-beam-soft" aria-hidden="true"></span>
{(v.fwCta ?? []).map((f: any, __i: number) => (<Fragment key={__i}><span className="cu-fw" style={css(f.style)}><u></u><b></b>{(f.sparks ?? []).map((k: any, __i: number) => (<Fragment key={__i}><i style={css(k.style)}></i></Fragment>))}</span></Fragment>))}
<div style={{ position: "relative", flex: "1 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
<h2 style={{ margin: "0", fontWeight: "800", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: "1.12", letterSpacing: "-0.8px" }}>Tu entrevista, con confianza.</h2>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#C9D6EE" }}>Empieza hoy. Haz la evaluación gratis y te decimos cuánto inglés necesitas reforzar para tu entrevista.</p>
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
