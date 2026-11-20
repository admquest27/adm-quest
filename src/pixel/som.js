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
function liberar() {
  if (liberado) return;
  liberado = true;
  try { contexto(); } catch { /* aparelho sem som */ }
  if (musicaPendente) { musicaPendente = false; tocarMusica(); }
  for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) window.removeEventListener(ev, liberar, true);
}
if (typeof window !== 'undefined') for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) window.addEventListener(ev, liberar, true);
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
  g.gain.setValueAtTime(0.22, ini); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.16);
  o.connect(g).connect(gMusica); o.start(ini); o.stop(ini + 0.17);
}

// ---------- tema da abertura (composição própria, dó maior, 138 bpm) ----------
const A = [['E5', 1], ['G5', 1], ['C6', 2], ['B5', 1], ['A5', 1], ['G5', 2], ['A5', 1], ['F5', 1], ['A5', 2], ['G5', 1], ['E5', 1], ['C5', 2], ['D5', 1], ['E5', 1], ['F5', 1], ['G5', 1], ['A5', 2], ['G5', 2], ['E5', 1], ['D5', 1], ['C5', 2], ['D5', 2], [null, 2]];
const B = [['E5', 1], ['G5', 1], ['C6', 2], ['B5', 1], ['A5', 1], ['G5', 2], ['A5', 1], ['C6', 1], ['D6', 2], ['C6', 1], ['A5', 1], ['G5', 2], ['F5', 1], ['A5', 1], ['G5', 1], ['E5', 1], ['D5', 2], ['G5', 2], ['C5', 4], [null, 4]];
const ACORDES = { C: ['C4', 'E4', 'G4'], F: ['F3', 'A3', 'C4'], G: ['G3', 'B3', 'D4'] };
const BAIXO = { C: ['C2', 'G2'], F: ['F2', 'C3'], G: ['G2', 'D3'] };
const COMPASSOS = ['C', 'F', 'G', 'C', 'C', 'F', 'G', 'C'];
const PASSOS = [];
for (const [secao, base] of [[A, 0], [B, 32]]) { let i = base; for (const [n, d] of secao) { PASSOS[i] = { n, d }; i += d; } }
const TOTAL = 64; const COLCHEIA = 60 / 138 / 2;

let tocando = false; let proximo = 0; let passo = 0; let relogio = null;
function agendar() {
  while (proximo < ac.currentTime + 0.15) {
    const p = PASSOS[passo]; const comp = COMPASSOS[Math.floor(passo / 8) % 8]; const noComp = passo % 8;
    if (p?.n) {
      const dur = p.d * COLCHEIA * 0.95;
      tom(freq(p.n), proximo, dur, { vol: 0.05, vibrato: p.d >= 2 ? 0.006 : 0, musica: true });
      tom(freq(tercaAbaixo(p.n)), proximo, dur, { tipo: 'triangle', vol: 0.03, corte: 2400, musica: true });
    }
    if (noComp === 0) for (const n of ACORDES[comp]) tom(freq(n), proximo, COLCHEIA * 7.6, { tipo: 'sawtooth', vol: 0.012, corte: 900, ataque: 0.08, musica: true });
    if (noComp % 2 === 0) tom(freq(BAIXO[comp][noComp % 4 === 0 ? 0 : 1]), proximo, COLCHEIA * 1.7, { tipo: 'triangle', vol: 0.16, corte: 1200, comEco: false, musica: true });
    if (noComp === 0 || noComp === 4) bumbo(proximo);
    if (noComp === 2 || noComp === 6) chiado(proximo, 0.12, 0.07, { tipo: 'bandpass', corte: 1800, musica: true });
    if (noComp % 2 === 1) chiado(proximo, 0.035, 0.025, { musica: true });
    proximo += COLCHEIA; passo = (passo + 1) % TOTAL;
  }
}

export function tocarMusica() {
  if (tocando || !somLigado()) return;
  if (!liberado) { musicaPendente = true; return; }
  try { contexto(); tocando = true; proximo = ac.currentTime + 0.06; passo = 0; relogio = setInterval(agendar, 25); } catch { tocando = false; }
}
export function pararMusica() { tocando = false; musicaPendente = false; clearInterval(relogio); }
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
export const ganido = () => seSom((a) => { const o = a.createOscillator(); const g = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1300, a.currentTime); o.frequency.exponentialRampToValueAtTime(700, a.currentTime + 0.35); g.gain.setValueAtTime(0.05, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.38); o.connect(g).connect(gEfeitos); o.start(); o.stop(a.currentTime + 0.4); });

export const efeitoSegredo = () => seSom((a) => ['G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, i) => tom(freq(n), a.currentTime + i * 0.06, 0.2, { vol: 0.05 })));
export const efeitoPoof = () => seSom((a) => chiado(a.currentTime, 0.25, 0.08, { tipo: 'bandpass', corte: 900 }));
export const croac = () => seSom((a) => { tom(freq('C3'), a.currentTime, 0.09, { tipo: 'square', vol: 0.05, corte: 900, comEco: false }); tom(freq('G2'), a.currentTime + 0.1, 0.12, { tipo: 'square', vol: 0.05, corte: 800, comEco: false }); });
export const cocorico = () => seSom((a) => ['E6', 'G6', 'E6', 'C7'].forEach((n, i) => tom(freq(n), a.currentTime + i * 0.07, 0.07, { tipo: 'square', vol: 0.025, corte: 2600, comEco: false })));
// Para diagnóstico: estado do áudio (suspenso, rodando) e se a música está tocando.
export const estadoSom = () => ({ estado: ac?.state ?? 'sem contexto', tocando, ligado: somLigado() });
