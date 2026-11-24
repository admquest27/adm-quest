// Escarpas do platô, muralha de tijolos do limite norte e escada de pedra atrás do castelo. Tudo desenhado direto no
// canvas do chão (arte original do projeto, em pixel art): a escarpa é um penhasco de pedra em camadas, com capa de
// grama, juntas, fendas, pé com pedregulhos e sombra projetada no chão.
import { Q } from './chao.js';
import { semente2 } from './grade.js';

const hash = (x, y) => semente2(x * 1.7 + 11, y * 2.3 + 5);
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
// ruído suave em uma dimensão (interpola valores sorteados a cada 'passo' pixels)
const ruido = (x, passo, sem) => { const a = Math.floor(x / passo); const f = x / passo - a; const u = f * f * (3 - 2 * f); return hash(a, sem) * (1 - u) + hash(a + 1, sem) * u; };

const PEDRA = ['#8d8779', '#7b7568', '#98917f', '#847e70', '#928b7c'].map(rgb);
const GRAMA = { contorno: rgb('#1d5a27'), escura: rgb('#2c7a31'), media: rgb('#3d8f3a'), clara: rgb('#62b04c') };

// Faixas de escarpa a partir da máscara: colunas vizinhas com o mesmo trecho vertical viram uma faixa
function faixas(t) {
  const { W, H, escarpa } = t; const out = [];
  let atual = null;
  for (let x = 0; x < W; x++) {
    let y0 = -1; let y1 = -1;
    for (let y = 0; y < H; y++) if (escarpa[y * W + x]) { if (y0 < 0) y0 = y; y1 = y; }
    if (y0 < 0) { atual = null; continue; }
    if (atual && atual.y0 === y0 && atual.y1 === y1) atual.x1 = x; else { atual = { x0: x, x1: x, y0, y1 }; out.push(atual); }
  }
  return out;
}

function desenharFaixa(g, f, W) {
  const X0 = f.x0 * Q; const Y0 = f.y0 * Q; const PW = (f.x1 - f.x0 + 1) * Q; const PH = (f.y1 - f.y0 + 1) * Q;
  const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH + 14; const gc = cv.getContext('2d');
  const img = gc.createImageData(PW, PH + 14); const o = img.data;
  const pintar = (x, y, c, a = 255) => { if (x < 0 || y < 0 || x >= PW || y >= PH + 14) return; const p = (y * PW + x) * 4; o[p] = c[0]; o[p + 1] = c[1]; o[p + 2] = c[2]; o[p + 3] = a; };
  const fimDir = f.x1 < W - 1; // no limite do mapa a mata esconde o fim
  const cap = 9; // largura da ponta arredondada
  // faixas de rocha: alturas e tons sorteados, levemente onduladas
  const estratos = []; { let y = 0; let k = 0; while (y < PH + 20) { const h = 8 + Math.floor(hash(k, 3) * 6); estratos.push({ y, h, tom: PEDRA[Math.floor(hash(k, 9) * PEDRA.length)], junta: 13 + Math.floor(hash(k, 4) * 9), desloc: Math.floor(hash(k, 5) * 20) }); y += h; k++; } }
  const fendas = []; for (let k = 0; k < PW / 46; k++) fendas.push({ x: Math.floor(hash(k, 31) * PW), y: Math.floor(hash(k, 32) * PH * 0.6) + 14, h: 12 + Math.floor(hash(k, 33) * 26) });
  for (let x = 0; x < PW; x++) {
    let ponta = 0;
    if (x < cap) ponta = Math.max(ponta, cap - x);
    if (fimDir && x >= PW - cap) ponta = Math.max(ponta, x - (PW - cap) + 1);
    const lip = 9 + Math.round(ruido(x, 9, 7) * 5) + Math.round(ponta * 0.9); // borda de baixo da capa de grama
    const pe = PH - 12 + Math.round(ruido(x, 11, 8) * 5) - Math.round(ponta * 1.6); // onde a rocha acaba e começa o pé
    // capa de grama que sobra por cima da parede
    for (let y = Math.max(0, lip - 7); y < lip; y++) {
      const dd = lip - y; const r = hash(x >> 1, y);
      pintar(x, y, dd === 1 ? GRAMA.contorno : dd <= 3 ? (r < 0.5 ? GRAMA.escura : GRAMA.media) : (r < 0.3 ? GRAMA.clara : GRAMA.media));
    }
    // face de pedra
    for (let y = lip; y < pe; y++) {
      const yy = y + Math.round(2 * Math.sin(x * 0.045 + 1));
      let e = estratos[0]; for (const s of estratos) if (yy >= s.y && yy < s.y + s.h) { e = s; break; }
      const dentroE = yy - e.y; const c = e.tom; let luz = 1;
      if (dentroE === 0) luz = 1.28; else if (dentroE === e.h - 1) luz = 0.62; else if (dentroE === e.h - 2) luz = 0.82;
      // juntas verticais entre blocos
      const jx = (x + e.desloc) % e.junta; if (jx === 0 && dentroE > 0 && dentroE < e.h - 1) luz *= 0.78; else if (jx === 1 && dentroE > 1 && dentroE < e.h - 1) luz *= 1.1;
      // manchas e lascas
      const r = hash(x, y); if (r < 0.03) luz *= 1.1; else if (r > 0.97) luz *= 0.9;
      // luz de cima: escurece com a profundidade; sombra logo abaixo da capa de grama
      const prof = (y - lip) / Math.max(1, pe - lip); luz *= 1 - 0.34 * prof; if (y - lip < 4) luz *= 0.72 + 0.07 * (y - lip);
      // lados da ponta arredondada ficam no escuro
      if (ponta) luz *= 1 - Math.min(0.45, ponta * 0.05);
      pintar(x, y, [Math.min(255, c[0] * luz), Math.min(255, c[1] * luz), Math.min(255, c[2] * luz)].map(Math.round));
    }
    // pé da parede: base escura com pedregulhos e capim
    for (let y = pe; y < Math.min(PH + 10, pe + 8); y++) {
      const dd = y - pe; const r = hash(x >> 1, y + 40);
      if (dd < 2) pintar(x, y, [58, 53, 48]); else if (r < 0.25 && dd < 6) pintar(x, y, rgb('#a29c8c')); else if (dd < 5) pintar(x, y, rgb(r < 0.6 ? '#4a463f' : '#5c574e')); else if (r < 0.5 && dd < 7) pintar(x, y, GRAMA.escura);
    }
  }
  // fendas verticais que cortam as camadas
  for (const fe of fendas) for (let k = 0; k < fe.h; k++) {
    const xx = fe.x + Math.round(Math.sin(k * 0.5 + fe.x) * 1.2); const yy = fe.y + k;
    pintar(xx, yy, [52, 46, 42]); if (k % 3 === 0) pintar(xx + 1, yy, rgb('#b6af9c'), 170);
  }
  // capim solto na base
  for (let k = 0; k < PW / 5; k++) { const x = Math.floor(hash(k, 51) * PW); const pe = PH - 12 + Math.round(ruido(x, 11, 8) * 5); for (let a = 0; a < 3; a++) pintar(x + (a % 2), pe + 1 - a, a ? GRAMA.clara : GRAMA.media); }
  gc.putImageData(img, 0, 0);
  g.drawImage(cv, X0, Y0);
  // sombra projetada no chão, abaixo do pé
  g.fillStyle = 'rgba(15,12,30,0.26)'; g.fillRect(X0 + 4, Y0 + PH - 3, PW - 8, 7);
  g.fillStyle = 'rgba(15,12,30,0.12)'; g.fillRect(X0 + 8, Y0 + PH + 4, PW - 16, 5);
}

export function desenharEscarpas(g, t) {
  for (const f of faixas(t)) desenharFaixa(g, f, t.W);
}

// Muralha de tijolos (uma peça de altura): face de pedra, ameias em cima e sombra embaixo.
export function desenharMuralha(g, t) {
  const { W, H, muralha } = t;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!muralha[y * W + x]) continue;
    const x0 = x * Q; const y0 = y * Q;
    g.fillStyle = '#4a4658'; g.fillRect(x0, y0 + 4, Q, Q - 4);
    g.fillStyle = '#8f8c9c'; g.fillRect(x0, y0 + 7, Q, Q - 10);
    for (let fila = 0; fila < 3; fila++) {
      const yy = y0 + 8 + fila * 7; const desloc = fila % 2 ? 8 : 0;
      g.fillStyle = '#6c6a7a'; g.fillRect(x0, yy + 6, Q, 1);
      for (let b = -1; b < 3; b++) { const bx = x0 + desloc + b * 16; if (bx >= x0 && bx < x0 + Q) { g.fillRect(bx, yy, 1, 6); } }
      for (let b = 0; b < 3; b++) { const tom = semente2(x * 3 + b, y * 5 + fila); g.fillStyle = tom < 0.5 ? '#a3a0b0' : '#7f7c8d'; g.fillRect(x0 + ((desloc + b * 16 + 2) % Q), yy + 1, 10, 1); }
    }
    g.fillStyle = '#4a4658'; g.fillRect(x0, y0, Q, 8);
    g.fillStyle = '#a3a0b0'; g.fillRect(x0 + 1, y0 + 1, 10, 7); g.fillRect(x0 + 17, y0 + 1, 10, 7);
    g.fillStyle = '#c9c6d4'; g.fillRect(x0 + 1, y0 + 1, 10, 1); g.fillRect(x0 + 17, y0 + 1, 10, 1);
    g.fillStyle = '#6c6a7a'; g.fillRect(x0 + 11, y0 + 4, 6, 4);
    g.fillStyle = 'rgba(20,16,40,0.25)'; g.fillRect(x0, y0 + Q, Q, 4);
  }
}

// Escada de pedra: degraus largos, cada um com a quina de cima clara e a de baixo escura.
export function desenharEscada(g, e) {
  for (let i = 0; i < e.h; i++) {
    const y0 = (e.y + i) * Q;
    g.fillStyle = '#4a4658'; g.fillRect(e.x * Q - 3, y0, e.w * Q + 6, Q);
    g.fillStyle = '#9a97a8'; g.fillRect(e.x * Q, y0 + 2, e.w * Q, Q - 8);
    g.fillStyle = '#c3c0cd'; g.fillRect(e.x * Q, y0 + 2, e.w * Q, 2);
    g.fillStyle = '#6c6a7a'; g.fillRect(e.x * Q, y0 + Q - 6, e.w * Q, 4);
    g.fillStyle = '#4a4658'; g.fillRect(e.x * Q, y0 + Q - 2, e.w * Q, 2);
  }
}
