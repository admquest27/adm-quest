// Escarpas do platô, muralha de tijolos do limite norte e escada de pedra atrás do castelo. Tudo desenhado direto no
// canvas do chão. A escarpa é arte original do projeto (penhasco de colunas de rocha, luz vinda da esquerda, capa de
// grama e pé escuro); a muralha usa o tijolo do castelo (theidiotmachine, CC-BY-SA 3.0) com ameias recortadas.
import { Q } from './chao.js';
import { semente2 } from './grade.js';

const hash = (x, y) => semente2(x * 1.7 + 11, y * 2.3 + 5);
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
// ruído suave em uma dimensão (interpola valores sorteados a cada 'passo' pixels)
const ruido = (x, passo, sem) => { const a = Math.floor(x / passo); const f = x / passo - a; const u = f * f * (3 - 2 * f); return hash(a, sem) * (1 - u) + hash(a + 1, sem) * u; };

const TONS = ['#a29b8d', '#8f897c', '#7f796d'].map(rgb);
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
  const lum = (c, k) => [Math.min(255, Math.round(c[0] * k)), Math.min(255, Math.round(c[1] * k)), Math.min(255, Math.round(c[2] * k))];
  const fimDir = f.x1 < W - 1; // no limite do mapa a mata esconde o fim
  const cap = 10; // largura da ponta arredondada
  // colunas de rocha: larguras e tons sorteados; cada uma tem as suas fraturas horizontais
  const colunas = []; const colDe = new Int16Array(PW);
  { let x = 0; let k = 0; while (x < PW) { const w = 15 + Math.floor(hash(k, 3) * 17); const quebras = [0.2 + hash(k, 5) * 0.25, 0.55 + hash(k, 6) * 0.3].map((q) => Math.floor(q * PH)); colunas.push({ x0: x, w, tom: TONS[Math.floor(hash(k, 9) * 3)], quebras, folga: Math.floor(hash(k, 7) * 4) }); for (let i = x; i < Math.min(PW, x + w); i++) colDe[i] = k; x += w; k++; } }
  for (let x = 0; x < PW; x++) {
    let ponta = 0;
    if (x < cap) ponta = Math.max(ponta, cap - x);
    if (fimDir && x >= PW - cap) ponta = Math.max(ponta, x - (PW - cap) + 1);
    const lip = 9 + Math.round(ruido(x, 10, 7) * 4) + Math.round(ponta * 0.9); // borda de baixo da capa de grama
    const pe = PH - 14 + Math.round(ruido(x, 13, 8) * 4) - Math.round(ponta * 1.6); // onde a rocha acaba e começa o pé
    const col = colunas[colDe[x]]; const dx = x - col.x0;
    // capa de grama que sobra por cima da parede, com tufos pendurados
    for (let y = Math.max(0, lip - 7); y < lip + (hash(x >> 1, 77) < 0.25 ? 2 : 0); y++) {
      const dd = lip - y; const r = hash(x >> 1, y);
      pintar(x, y, dd <= 0 ? GRAMA.escura : dd === 1 ? GRAMA.contorno : dd <= 3 ? (r < 0.5 ? GRAMA.escura : GRAMA.media) : (r < 0.3 ? GRAMA.clara : GRAMA.media));
    }
    // face de pedra: luz da esquerda em cada coluna, fraturas horizontais, sombra sob a grama e escuro no fundo
    for (let y = lip; y < pe; y++) {
      let k = 1;
      if (dx === 0) k = 0.5; else if (dx === 1) k = 1.22; else if (dx === 2) k = 1.1; else if (dx >= col.w - 3) k = 0.74; else k = 1 - 0.18 * (dx / col.w);
      const prof = (y - lip) / Math.max(1, pe - lip);
      k *= 1 - 0.32 * prof * prof - 0.06 * prof; if (y - lip < 5) k *= 0.62 + 0.076 * (y - lip);
      for (const q of col.quebras) { if (y === q + col.folga && dx > 0 && dx < col.w - 1) k *= 0.5; else if (y === q + col.folga + 1 && dx > 1) k *= 1.16; }
      const r = hash(x, y); if (r < 0.012) k *= 1.14; else if (r > 0.992) k *= 0.88;
      if (ponta) k *= 1 - Math.min(0.5, ponta * 0.055);
      pintar(x, y, lum(col.tom, k));
    }
    // pé da parede: base escura com pedregulhos e capim
    for (let y = pe; y < Math.min(PH + 10, pe + 8); y++) {
      const dd = y - pe; const r = hash(x >> 1, y + 40);
      if (dd < 2) pintar(x, y, [52, 48, 44]); else if (r < 0.22 && dd < 6) pintar(x, y, rgb('#9d9788')); else if (dd < 5) pintar(x, y, rgb(r < 0.6 ? '#4a463f' : '#5c574e')); else if (r < 0.5 && dd < 7) pintar(x, y, GRAMA.escura);
    }
  }
  // capim solto na base
  for (let k = 0; k < PW / 6; k++) { const x = Math.floor(hash(k, 51) * PW); const pe = PH - 14 + Math.round(ruido(x, 13, 8) * 4); for (let a = 0; a < 3; a++) pintar(x + (a % 2), pe + 1 - a, a ? GRAMA.clara : GRAMA.media); }
  gc.putImageData(img, 0, 0);
  g.drawImage(cv, X0, Y0);
  // sombra projetada no chão, abaixo do pé
  g.fillStyle = 'rgba(15,12,30,0.26)'; g.fillRect(X0 + 4, Y0 + PH - 4, PW - 8, 7);
  g.fillStyle = 'rgba(15,12,30,0.12)'; g.fillRect(X0 + 8, Y0 + PH + 3, PW - 16, 5);
}

export function desenharEscarpas(g, t) {
  for (const f of faixas(t)) desenharFaixa(g, f, t.W);
}

// Muralha: três fileiras de tijolo do castelo (a de baixo é a que bloqueia). A de cima ganha ameias recortadas,
// a de baixo, uma sombra no chão. Sem desenho em volta: o tijolo já tem o contorno.
export function desenharMuralha(g, t, tijolo) {
  const { W, H, muralha } = t;
  const tmp = document.createElement('canvas'); tmp.width = Q; tmp.height = Q; const gt = tmp.getContext('2d'); gt.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!muralha[y * W + x]) continue;
    const x0 = x * Q; const y0 = y * Q;
    // fileira de baixo: tijolo com um beiral de pedra clara no alto e sombra no pé
    g.drawImage(tijolo, 0, 0, Q, Q, x0, y0, Q, Q);
    g.fillStyle = 'rgba(52,44,70,0.20)'; g.fillRect(x0, y0, Q, Q);
    g.fillStyle = 'rgba(20,16,40,0.18)'; g.fillRect(x0, y0 + Q - 8, Q, 8);
    // fileira do meio: só tijolo, com um pouco menos de luz que a de baixo
    g.drawImage(tijolo, 0, 0, Q, Q, x0, y0 - Q, Q, Q);
    g.fillStyle = 'rgba(52,44,70,0.12)'; g.fillRect(x0, y0 - Q, Q, Q);
    // fileira de cima: tijolo com ameias (blocos de 10 px, vãos de 6 px)
    gt.clearRect(0, 0, Q, Q); gt.drawImage(tijolo, 0, 0, Q, Q, 0, 0, Q, Q);
    for (let k = 0; k < 2; k++) gt.clearRect(k * 16 + 10, 0, 6, 11);
    gt.fillStyle = '#d6cdb8'; for (let k = 0; k < 2; k++) gt.fillRect(k * 16, 11, 10, 2);
    gt.fillStyle = '#4a4658'; for (let k = 0; k < 2; k++) { gt.fillRect(k * 16 + 10, 11, 6, 1); }
    gt.fillStyle = 'rgba(20,16,40,0.12)'; gt.fillRect(0, 13, Q, 3);
    g.fillStyle = 'rgba(52,44,70,0.06)'; g.drawImage(tmp, x0, y0 - 2 * Q); g.fillRect(x0, y0 - 2 * Q + 11, Q, 21);
    // sombra projetada no chão, ao sul
    g.fillStyle = 'rgba(15,12,30,0.24)'; g.fillRect(x0, y0 + Q, Q, 6); g.fillStyle = 'rgba(15,12,30,0.1)'; g.fillRect(x0, y0 + Q + 6, Q, 4);
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
