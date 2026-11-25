// Música e efeitos sintetizados no navegador, em clima de 16 bits (sem gravações, sem direitos de terceiros).
// O som só começa depois de um toque do jogador, como exigem os navegadores. A escolha de som ligado ou
// desligado fica guardada no aparelho.

let ac = null; let saida = null; let eco = null; let ruido = null; let gMusica = null; let gEfeitos = null;
const CHAVE_VOL = 'admq-volumes';
export function volumes() { try { return { musica: 0.8, efeitos: 0.9, ...JSON.parse(localStorage.getItem(CHAVE_VOL) || '{}') }; } catch { return { musica: 0.8, efeitos: 0.9 }; } }
export function definirVolume(qual, v) {
  const atual = { ...volumes(), [qual]: v }; try { localStorage.setItem(CHAVE_VOL, JSON.stringify(atual)); } catch { /* segue */ }
  if (gMusica && qual === 'musica') gMusica.gain.value = v; if (gEfeitos && qual === 'efeitos') gEfeitos.gain.value = v;
}
// O áudio só nasce no primeiro toque, clique ou tecla do jogador (exigência dos navegadores, principalmente
// dentro de outras páginas e no celular). Antes disso, os efeitos são ignorados e a música fica esperando.
let liberado = false; let musicaPendente = false;
// Os ouvintes ficam ligados o tempo todo: se o navegador suspender o áudio (aba escondida, fone trocado,
// política de reprodução do computador), o próximo toque ou tecla retoma o som.
const GESTOS = ['pointerdown', 'pointerup', 'mousedown', 'keydown', 'touchend', 'click'];
let momentoLiberado = -1e9;
function liberar() {
  if (!liberado) { liberado = true; momentoLiberado = performance.now(); try { contexto(); } catch { /* aparelho sem som */ } }
  else if (ac && ac.state !== 'running') { momentoLiberado = performance.now(); try { ac.resume(); } catch { /* segue */ } }
  if (musicaPendente) { musicaPendente = false; tocarMusica(); }
}
// true quando o som acabou de nascer ou voltar neste mesmo toque (o botão de som não deve desligar nesse caso)
export const acabouDeLiberar = () => performance.now() - momentoLiberado < 700;
if (typeof window !== 'undefined') for (const ev of GESTOS) window.addEventListener(ev, liberar, true);
// Botão de som: chamado dentro de um clique, força o áudio a nascer ou voltar e começa a música.
export function garantirSom() {
  liberado = true; musicaPendente = false;
  try { const a = contexto(); if (a.state !== 'running') a.resume(); } catch { return; }
  if (somLigado()) tocarMusica();
}
export const somLiberado = () => liberado;

const CHAVE = 'admq-som';
export const somLigado = () => { try { return localStorage.getItem(CHAVE) !== '0'; } catch { return true; } };
const guardar = (v) => { try { localStorage.setItem(CHAVE, v ? '1' : '0'); } catch { /* sem armazenamento */ } };

function contexto() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    saida = ac.createGain(); saida.gain.value = 0.9;
    saida.connect(comp).connect(ac.destination);
    const v = volumes();
    gMusica = ac.createGain(); gMusica.gain.value = v.musica; gMusica.connect(saida);
    gEfeitos = ac.createGain(); gEfeitos.gain.value = v.efeitos; gEfeitos.connect(saida);
    // eco curto, de sala, que dá o "corpo" do som de 16 bits
    eco = ac.createDelay(1); eco.delayTime.value = 0.27;
    const volta = ac.createGain(); volta.gain.value = 0.28;
    const filtro = ac.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 2200;
    const molhado = ac.createGain(); molhado.gain.value = 0.22;
    eco.connect(filtro).connect(volta).connect(eco); filtro.connect(molhado).connect(saida);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

const NOTAS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const freq = (n) => { const m = n.match(/^([A-G])(#?)(\d)$/); return 440 * 2 ** ((12 * (Number(m[3]) + 1) + NOTAS[m[1]] + (m[2] ? 1 : 0) - 69) / 12); };
const ESCALA = 'CDEFGAB';
const tercaAbaixo = (n) => { const i = ESCALA.indexOf(n[0]); const o = Number(n.at(-1)); const j = i - 2; return j < 0 ? `${ESCALA[j + 7]}${o - 1}` : `${ESCALA[j]}${o}`; };

let pulso = null;
function onda(tipo) {
  if (tipo !== 'pulso') return tipo;
  if (!pulso) { // onda de pulso de 25%, o timbre clássico da melodia
    const n = 32; const re = new Float32Array(n); const im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    pulso = ac.createPeriodicWave(re, im);
  }
  return pulso;
}

function tom(f, ini, dur, { tipo = 'pulso', vol = 0.05, corte = 3800, vibrato = 0, comEco = true, ataque = 0.008, musica = false } = {}) {
  const a = contexto();
  const o = a.createOscillator(); const g = a.createGain(); const fl = a.createBiquadFilter();
  const w = onda(tipo); if (typeof w === 'string') o.type = w; else o.setPeriodicWave(w);
  o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = corte;
  if (vibrato) { const l = a.createOscillator(); const lg = a.createGain(); l.frequency.value = 5.5; lg.gain.value = f * vibrato; l.connect(lg).connect(o.frequency); l.start(ini + 0.12); l.stop(ini + dur); }
  g.gain.setValueAtTime(0.0001, ini); g.gain.exponentialRampToValueAtTime(vol, ini + ataque);
  g.gain.setValueAtTime(vol, ini + dur * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  o.connect(fl).connect(g).connect(musica ? gMusica : gEfeitos); if (comEco) g.connect(eco);
  o.start(ini); o.stop(ini + dur + 0.03);
}

function chiado(ini, dur, vol, { tipo = 'highpass', corte = 7000, musica = false } = {}) {
  const a = contexto();
  if (!ruido) { ruido = a.createBuffer(1, a.sampleRate * 0.4, a.sampleRate); const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(); s.buffer = ruido;
  const f = a.createBiquadFilter(); f.type = tipo; f.frequency.value = corte;
  const g = a.createGain(); g.gain.setValueAtTime(vol, ini); g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  s.connect(f).connect(g).connect(musica ? gMusica : gEfeitos); s.start(ini); s.stop(ini + dur + 0.01);
}

function bumbo(ini) {
  const a = contexto(); const o = a.createOscillator(); const g = a.createGain();
  o.frequency.setValueAtTime(140, ini); o.frequency.exponentialRampToValueAtTime(45, ini + 0.12);
  g.gain.setValueAtTime(0.11, ini); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.16);
  o.connect(g).connect(gMusica); o.start(ini); o.stop(ini + 0.17);
}

// ---------- música da Vila (composição própria, dó maior, 92 bpm) ----------
// Oito partes de oito compassos, perto de três minutos antes de recomeçar. Cada parte muda a melodia, o instrumento e a
// percussão, para não enjoar. A cada volta completa a melodia troca de timbre. Cada compasso tem 8 colcheias.
// Melodia: "NOTA:duração" em colcheias; "-" é pausa.
const PARTES = [
  { nome: 'amanhecer', acordes: 'C Am F G C Am F G', bateria: 0, timbre: 'sine', arpejo: 1,
    melodia: '-:8 -:8 E5:4 C5:4 D5:6 -:2 G5:4 E5:4 C5:4 E5:4 F5:3 E5:1 D5:4 -:8' },
  { nome: 'passeio', acordes: 'C G Am Em F C Dm G', bateria: 1, timbre: 'pulso', arpejo: 0,
    melodia: 'E5:2 G5:1 E5:1 C5:4 D5:2 B4:2 G4:4 C5:2 E5:2 A5:3 G5:1 G5:4 E5:4 F5:2 A5:2 C6:2 A5:2 G5:4 E5:2 C5:2 D5:2 F5:2 A5:2 F5:2 G5:6 -:2' },
  { nome: 'feira', acordes: 'F G Em Am F G C C', bateria: 2, timbre: 'pulso', arpejo: 0,
    melodia: 'A5:1 A5:1 C6:2 A5:2 F5:2 B5:1 B5:1 D6:2 B5:2 G5:2 G5:2 E5:2 B5:2 G5:2 A5:4 E5:4 F5:2 G5:1 A5:1 C6:2 A5:2 B5:2 A5:1 G5:1 D5:4 E5:2 G5:2 C6:4 -:2 G5:2 E5:2 C5:2' },
  { nome: 'jardim', acordes: 'Am F C G Am F G G', bateria: 0, timbre: 'triangle', arpejo: 1,
    melodia: 'A4:3 B4:1 C5:4 A4:2 C5:2 F5:4 E5:3 D5:1 C5:4 D5:6 -:2 C5:3 D5:1 E5:4 F5:2 E5:2 C5:4 B4:4 D5:4 G5:6 -:2' },
  { nome: 'passeio2', acordes: 'C G Am Em F C Dm G', bateria: 1, timbre: 'triangle', arpejo: 0,
    melodia: 'G5:3 E5:1 C5:2 E5:2 D5:4 G5:4 E5:3 C5:1 A4:2 C5:2 B4:4 E5:4 A5:3 F5:1 C5:2 F5:2 E5:4 G5:4 F5:2 D5:2 A5:3 F5:1 D5:4 B4:2 -:2' },
  { nome: 'misterio', acordes: 'Dm Am Dm Am Bb F G G', bateria: 0, timbre: 'sine', arpejo: 1,
    melodia: 'D5:4 F5:4 E5:6 C5:2 D5:2 E5:2 F5:4 A5:8 A#5:4 F5:4 A5:6 F5:2 G5:4 B5:4 D6:6 -:2' },
  { nome: 'festa', acordes: 'F G C Am F G C G', bateria: 2, timbre: 'pulso', arpejo: 0,
    melodia: 'C6:2 A5:2 F5:2 A5:2 D6:2 B5:2 G5:2 B5:2 E6:3 D6:1 C6:2 G5:2 A5:2 C6:2 E6:4 F6:2 E6:1 D6:1 C6:2 A5:2 B5:2 G5:2 D6:4 C6:6 G5:2 B4:2 D5:2 G5:4' },
  { nome: 'descanso', acordes: 'C F C F Am F G C', bateria: 0, timbre: 'triangle', arpejo: 1,
    melodia: 'E5:8 F5:8 G5:4 E5:4 A5:6 -:2 C6:4 B5:4 A5:4 F5:4 G5:4 D5:4 C5:8' },
];
const ACORDES = { C: ['C4', 'E4', 'G4'], F: ['F3', 'A3', 'C4'], G: ['G3', 'B3', 'D4'], Am: ['A3', 'C4', 'E4'], Em: ['E3', 'G3', 'B3'], Dm: ['D3', 'F3', 'A3'], Bb: ['A#3', 'D4', 'F4'] };
const BAIXO = { C: ['C2', 'G2'], F: ['F2', 'C3'], G: ['G2', 'D3'], Am: ['A2', 'E3'], Em: ['E2', 'B2'], Dm: ['D2', 'A2'], Bb: ['A#2', 'F3'] };
const PASSOS = [];
PARTES.forEach((p, n) => {
  let q = n * 64; const fim = q + 64;
  for (const item of p.melodia.split(' ')) { const [nota, d] = item.split(':'); if (q >= fim) break; if (nota !== '-') PASSOS[q] = { n: nota, d: Math.min(Number(d), fim - q) }; q += Number(d); }
});
const TOTAL = PARTES.length * 64; const COLCHEIA = 60 / 92 / 2;

let tocando = false; let proximo = 0; let passo = 0; let relogio = null; let volta = 0;
function agendar() {
  while (proximo < ac.currentTime + 0.2) {
    const parte = PARTES[Math.floor(passo / 64)]; const acordes = parte.acordes.split(' ');
    const p = PASSOS[passo]; const comp = acordes[Math.floor((passo % 64) / 8)]; const noComp = passo % 8;
    if (p) {
      const dur = p.d * COLCHEIA * 0.96;
      const timbre = volta % 2 ? ({ pulso: 'triangle', triangle: 'sine', sine: 'triangle' })[parte.timbre] : parte.timbre;
      tom(freq(p.n), proximo, dur, { tipo: timbre, vol: timbre === 'pulso' ? 0.032 : 0.055, corte: 3000, vibrato: p.d >= 4 ? 0.005 : 0, ataque: timbre === 'pulso' ? 0.01 : 0.03, musica: true });
    }
    if (noComp === 0) for (const n of ACORDES[comp]) tom(freq(n), proximo, COLCHEIA * 7.8, { tipo: 'triangle', vol: 0.016, corte: 1100, ataque: 0.25, musica: true });
    if (parte.arpejo) { const a = ACORDES[comp]; const nota = a[[0, 1, 2, 1, 0, 2, 1, 2][noComp]]; tom(freq(nota.replace(/\d$/, (o) => String(Number(o) + 1))), proximo, COLCHEIA * 1.3, { tipo: 'sine', vol: 0.018, musica: true }); }
    if (noComp === 0 || noComp === 4 || (parte.bateria === 2 && noComp === 7)) tom(freq(BAIXO[comp][noComp === 4 ? 1 : 0]), proximo, COLCHEIA * (noComp === 7 ? 0.8 : 3.2), { tipo: 'triangle', vol: 0.12, corte: 900, comEco: false, musica: true });
    if (parte.bateria) {
      if (noComp === 0 || (parte.bateria === 2 && noComp === 4)) bumbo(proximo);
      if (noComp === 4 || noComp === 2 && parte.bateria === 2 || noComp === 6) chiado(proximo, 0.09, 0.028, { tipo: 'bandpass', corte: 1700, musica: true });
      if (noComp % 2 === 1) chiado(proximo, 0.03, 0.012, { musica: true });
    }
    proximo += COLCHEIA; passo = (passo + 1) % TOTAL; if (passo === 0) volta += 1;
  }
}

export function tocarMusica() {
  if (tocando || !somLigado()) return;
  if (!liberado) { musicaPendente = true; return; }
  try { contexto(); tocando = true; proximo = ac.currentTime + 0.06; passo = 0; relogio = setInterval(agendar, 25); } catch { tocando = false; }
}
export function pararMusica() { tocando = false; musicaPendente = false; clearInterval(relogio); calarAmbiente(); }
export const duracaoMusica = () => Math.round(TOTAL * COLCHEIA);
export const musicaTocando = () => tocando;
export function alternarSom() {
  const novo = !somLigado(); guardar(novo);
  if (novo) tocarMusica(); else pararMusica();
  return novo;
}

// ---------- efeitos ----------
const seSom = (fn) => { if (!somLigado() || !liberado) return; try { fn(contexto()); } catch { /* aparelho sem som */ } };
export const efeitoInicio = () => seSom((a) => ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => tom(freq(n), a.currentTime + i * 0.07, 0.18, { vol: 0.06 })));
export const efeitoMoeda = () => seSom((a) => { tom(freq('B5'), a.currentTime, 0.07, { vol: 0.05 }); tom(freq('E6'), a.currentTime + 0.07, 0.25, { vol: 0.05 }); });
export const efeitoToque = () => seSom((a) => tom(freq('A5'), a.currentTime, 0.05, { vol: 0.03, comEco: false }));
export const efeitoLetra = () => seSom((a) => tom(freq('C6'), a.currentTime, 0.025, { vol: 0.012, comEco: false }));
export const latido = (vezes = 1) => seSom((a) => {
  for (let i = 0; i < vezes; i++) {
    const ini = a.currentTime + i * 0.22;
    const o = a.createOscillator(); const g = a.createGain(); o.type = 'square';
    o.frequency.setValueAtTime(950, ini); o.frequency.exponentialRampToValueAtTime(520, ini + 0.09);
    g.gain.setValueAtTime(0.0001, ini); g.gain.exponentialRampToValueAtTime(0.07, ini + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.12);
    o.connect(g).connect(gEfeitos); g.connect(eco); o.start(ini); o.stop(ini + 0.13);
    chiado(ini, 0.06, 0.05, { corte: 2500 });
  }
});
export const piado = () => seSom((a) => { for (let i = 0; i < 3; i++) { const t = a.currentTime + i * 0.13; const o = a.createOscillator(); const g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(2600 + i * 300, t); o.frequency.exponentialRampToValueAtTime(3600, t + 0.06); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); o.connect(g).connect(gEfeitos); o.start(t); o.stop(t + 0.09); } });
export const ganido = () => seSom((a) => { const o = a.createOscillator(); const g = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1300, a.currentTime); o.frequency.exponentialRampToValueAtTime(700, a.currentTime + 0.35); g.gain.setValueAtTime(0.05, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.38); o.connect(g).connect(gEfeitos); o.start(); o.stop(a.currentTime + 0.4); });

export const efeitoSegredo = () => seSom((a) => ['G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, i) => tom(freq(n), a.currentTime + i * 0.06, 0.2, { vol: 0.05 })));
export const efeitoPoof = () => seSom((a) => chiado(a.currentTime, 0.25, 0.08, { tipo: 'bandpass', corte: 900 }));
export const efeitoPulo = () => seSom((a) => { const t = a.currentTime; const o = a.createOscillator(); const g = a.createGain(); o.type = 'square'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(780, t + 0.12); g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g).connect(gEfeitos); o.start(t); o.stop(t + 0.17); });
export const croac = () => seSom((a) => { tom(freq('C3'), a.currentTime, 0.09, { tipo: 'square', vol: 0.05, corte: 900, comEco: false }); tom(freq('G2'), a.currentTime + 0.1, 0.12, { tipo: 'square', vol: 0.05, corte: 800, comEco: false }); });
// mugido da vaca: dois tons graves e compridos
export const mugido = () => seSom((a) => { tom(freq('G2'), a.currentTime, 0.4, { tipo: 'sawtooth', vol: 0.045, corte: 520, comEco: false }); tom(freq('E2'), a.currentTime + 0.32, 0.5, { tipo: 'sawtooth', vol: 0.045, corte: 420, comEco: false }); });
export const cocorico = () => seSom((a) => ['E6', 'G6', 'E6', 'C7'].forEach((n, i) => tom(freq(n), a.currentTime + i * 0.07, 0.07, { tipo: 'square', vol: 0.025, corte: 2600, comEco: false })));
// ---------- som ambiente: água, forja e fogueira ficam mais fortes quando se chega perto; pássaros de dia, grilos à noite ----------
const fontes = {};
function fonteContinua(nome, tipo, corte, q) {
  if (!fontes[nome]) {
    const a = ac; const n = a.sampleRate * 3; const buf = a.createBuffer(1, n, a.sampleRate); const d = buf.getChannelData(0); let ant = 0;
    for (let k = 0; k < n; k++) { ant = ant * 0.35 + (Math.random() * 2 - 1) * 0.65; d[k] = ant; }
    const o = a.createBufferSource(); o.buffer = buf; o.loop = true; const f = a.createBiquadFilter(); f.type = tipo; f.frequency.value = corte; f.Q.value = q;
    const g = a.createGain(); g.gain.value = 0; o.connect(f).connect(g).connect(gEfeitos); o.start(); fontes[nome] = g;
  }
  return fontes[nome];
}
const AGUAS = { cachoeira: ['lowpass', 1500, 0.4, 0.16], fonte: ['bandpass', 2600, 0.8, 0.07], rio: ['bandpass', 650, 0.7, 0.05] };
// niveis: 0 a 1 para cada fonte de som, conforme a distância; noite: true ou false
export function ambiente(niveis = {}, noite = false) {
  if (!ac || !liberado) return;
  const ativo = somLigado() && !(typeof document !== 'undefined' && document.hidden);
  for (const [nome, [tipo, corte, q, vol]] of Object.entries(AGUAS)) { const v = ativo ? (niveis[nome] ?? 0) * vol : 0; if (v > 0 || fontes[nome]) fonteContinua(nome, tipo, corte, q).gain.setTargetAtTime(v, ac.currentTime, 0.25); }
  if (!ativo) return;
  const t = ac.currentTime;
  for (const nome of ['forja', 'fogueira']) if ((niveis[nome] ?? 0) > 0.05 && Math.random() < 0.75) for (let k = 0; k < 3; k++) if (Math.random() < 0.6) chiado(t + Math.random() * 0.2, 0.012 + Math.random() * 0.02, 0.09 * niveis[nome] * Math.random(), { tipo: 'highpass', corte: 1800 + Math.random() * 3000 });
  if ((niveis.forja ?? 0) > 0.25 && Math.random() < 0.05) { tom(1760, t, 0.18, { tipo: 'triangle', vol: 0.035 * niveis.forja }); tom(2637, t, 0.12, { tipo: 'sine', vol: 0.025 * niveis.forja }); }
  if (!noite && Math.random() < 0.035) { const base = 2200 + Math.random() * 1500; const n = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) tom(base * (1 + (k % 2) * 0.18), t + k * 0.11, 0.07, { tipo: 'sine', vol: 0.012 }); }
  if (noite && Math.random() < 0.16) for (let k = 0; k < 4; k++) tom(4300, t + k * 0.045, 0.025, { tipo: 'sine', vol: 0.008, comEco: false });
}
// passos conforme o chão: 'grama', 'terra', 'pedra', 'areia' ou 'madeira'
const PISOS = { grama: ['lowpass', 900, 0.05], terra: ['lowpass', 620, 0.07], pedra: ['bandpass', 1900, 0.05], areia: ['highpass', 2600, 0.035], madeira: ['bandpass', 420, 0.12] };
export const efeitoPasso = (piso = 'grama') => seSom((a) => { const [tipo, corte, vol] = PISOS[piso] ?? PISOS.grama; chiado(a.currentTime, 0.06, vol * (0.75 + Math.random() * 0.4), { tipo, corte: corte * (0.9 + Math.random() * 0.25) }); });
export function calarAmbiente() { for (const g of Object.values(fontes)) g.gain.value = 0; }

// Para diagnóstico: estado do áudio (suspenso, rodando) e se a música está tocando.
export const estadoSom = () => ({ estado: ac?.state ?? 'sem contexto', tocando, ligado: somLigado() });
