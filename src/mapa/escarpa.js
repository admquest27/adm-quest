// Escarpas do platô (paredes de 4 peças de altura, do pacote LPC Mountains, terreno "Cliff_Grass"),
// muralha de tijolos do limite norte e a escada de pedra atrás do castelo. Desenha direto no canvas do chão.
import { Q } from './chao.js';
import { semente2 } from './grade.js';

// Folha da escarpa (96x160): 3 colunas (ponta esquerda, meio, ponta direita) e 5 linhas.
// Linhas 2, 3 e 4 são a parede: borda de grama, miolo e pé.
const COL = [0, 32, 64];

export function desenharEscarpas(g, img, t) {
  const { W, H, escarpa } = t;
  const tem = (x, y) => x >= 0 && y >= 0 && x < W && y < H && escarpa[y * W + x] === 1;
  const tmp = document.createElement('canvas'); tmp.width = Q; tmp.height = Q; const gt = tmp.getContext('2d'); gt.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!tem(x, y)) continue;
    const lin = !tem(x, y - 1) ? 2 : !tem(x, y + 1) ? 4 : 3;
    // pontas redondas só onde a parede acaba de verdade dentro do mapa (no limite do mapa a mata esconde o fim)
    const esq = !tem(x - 1, y) && x > 0; const dir = !tem(x + 1, y) && x < W - 1;
    const col = esq ? 0 : dir ? 2 : 1;
    if (lin >= 3) { gt.clearRect(0, 0, Q, Q); gt.drawImage(img, COL[col], 32 * lin, 32, 32, 0, 0, 32, 32); volume(gt, x, y, lin); g.drawImage(tmp, x * Q, y * Q); }
    else g.drawImage(img, COL[col], 32 * lin, 32, 32, x * Q, y * Q, 32, 32);
    if (lin === 4) { g.fillStyle = 'rgba(20,16,40,0.24)'; g.fillRect(x * Q, y * Q + 13, Q, 6); g.fillStyle = 'rgba(20,16,40,0.10)'; g.fillRect(x * Q, y * Q + 19, Q, 5); }
  }
}

// Dá volume à parede: luz de cima, estratos de rocha, fendas verticais e lascas claras (a arte original é lisa)
function volume(g, x, y, lin) {
  const x0 = 0; const y0 = 0; const topo = 0;
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,230,190,0.10)'; g.fillRect(x0, y0 + topo, Q, 6);
  g.fillStyle = 'rgba(30,18,10,0.16)'; g.fillRect(x0, y0 + 20, Q, 12);
  // estratos: faixas horizontais mais escuras, um pouco tortas
  for (let k = 0; k < 3; k++) {
    const yy = y0 + 4 + Math.floor(semente2(x * 7 + k, y * 3 + lin) * 24); const a = Math.floor(semente2(x + k * 5, y * 11) * 10);
    g.fillStyle = 'rgba(40,24,12,0.22)'; g.fillRect(x0 + a, yy, 14 + Math.floor(semente2(x * 2 + k, y) * 14), 2);
    g.fillStyle = 'rgba(255,225,180,0.14)'; g.fillRect(x0 + a, yy + 2, 10, 1);
  }
  // fendas verticais
  for (let k = 0; k < 2; k++) {
    const cx = x0 + 3 + Math.floor(semente2(x * 13 + k, y * 17 + 5) * 26); const h = 6 + Math.floor(semente2(x + k, y * 3) * 12); const cy = y0 + Math.floor(semente2(x * 3, y * 5 + k) * 14);
    g.fillStyle = 'rgba(30,16,8,0.45)'; g.fillRect(cx, cy, 1, h); g.fillRect(cx + 1, cy + 3, 1, Math.max(2, h - 6));
    g.fillStyle = 'rgba(255,225,180,0.2)'; g.fillRect(cx - 1, cy + 1, 1, h - 2);
  }
  g.restore();
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
    // ameias: blocos que sobem acima do topo, de dois em dois
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
