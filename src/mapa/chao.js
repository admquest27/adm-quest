// Chão da Vila com a arte LPC (quadrados de 32 px): grama, água, areia e estradas de terra com bordas
// arredondadas (autotile do LPC: cada quadrado vira quatro pedaços de 16 escolhidos pelos vizinhos).
// A cena desenha o resultado na metade do tamanho, então cada quadrado LPC ocupa uma peça da planta.
import { semente2 } from './grade.js';

export const Q = 32; // pixels da arte por peça da planta

function tela(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }

// Bloco de terreno (96x192): no alto, os cantos de dentro; no meio, a borda 3x3; embaixo, três miolos.
function autotile(g, img, b, tem, x, y, ox, oy, variante) {
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const h = tem(x + dx, y); const v = tem(x, y + dy); const d = tem(x + dx, y + dy);
    const qx = dx > 0 ? 16 : 0; const qy = dy > 0 ? 16 : 0; let sx; let sy;
    if (h && v && d) { sx = b.x + 32 * variante + qx; sy = b.y + 160 + qy; }
    else if (h && v) { sx = b.x + 32 + (dx < 0 ? 32 : 0) + qx; sy = b.y + (dy < 0 ? 32 : 0) + qy; }
    else if (!h && !v) { sx = b.x + (dx < 0 ? 0 : 64) + qx; sy = b.y + 64 + (dy < 0 ? 0 : 64) + qy; }
    else if (h) { sx = b.x + 32 + qx; sy = b.y + 64 + (dy < 0 ? 0 : 64) + qy; }
    else { sx = b.x + (dx < 0 ? 0 : 64) + qx; sy = b.y + 96 + qy; }
    g.drawImage(img, sx, sy, 16, 16, (x - ox) * Q + qx, (y - oy) * Q + qy, 16, 16);
  }
}

const quadro = (frames, nome) => frames[nome].frame;

// Peças cobertas por uma estrada (polilinha em peças), um pouco grossa nas diagonais para não virar escadinha fina.
export function pecasDaEstrada(pontos, W, H) {
  const marcadas = new Set();
  for (let i = 0; i < pontos.length - 1; i++) {
    const [ax, ay] = pontos[i]; const [bx, by] = pontos[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n; const y = ay + ((by - ay) * k) / n;
      // faixa de dois quadrados de largura, centrada no traçado (um traço fino sumia no meio do mato)
      for (const dx of [0, 1]) for (const dy of [0, 1]) { const cx = Math.floor(x) + dx; const cy = Math.floor(y) + dy; if (cx >= 0 && cy >= 0 && cx < W && cy < H) marcadas.add(cy * W + cx); }
    }
  }
  return marcadas;
}

// Chão inteiro: grama (com flores de vez em quando), areia do deserto e água de rio e lagos.
export function desenharChao(img, frames, t, planta, evitar = new Set()) {
  const { W, H } = t; const [c, g] = tela(W * Q, H * Q);
  const grama = quadro(frames, 't-grama'); const flor = quadro(frames, 'grama-flor');
  const agua = quadro(frames, 't-agua'); const areia = quadro(frames, 't-areia');
  const d = planta.DESERTO;
  const naAreia = new Uint8Array(W * H);
  if (d?.rx) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = Math.atan2(y + 0.5 - d.cy, x + 0.5 - d.cx); const r = 1 + 0.1 * Math.sin(a * 3 + 0.6) + 0.06 * Math.sin(a * 7 + 1.3);
    if (((x + 0.5 - d.cx) / (d.rx * r)) ** 2 + ((y + 0.5 - d.cy) / (d.ry * r)) ** 2 < 1) naAreia[y * W + x] = 1;
  }
  const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const temAgua = (x, y) => (dentro(x, y) ? t.agua[y * W + x] === 1 : true);
  const temAreia = (x, y) => (dentro(x, y) ? naAreia[y * W + x] === 1 : false);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = semente2(x * 5 + 3, y * 9 + 1);
    const i = y * W + x;
    if (s < 0.05 && !evitar.has(i) && !t.floresta[i]) g.drawImage(img, flor.x + 32 * Math.floor(s * 60 % 3), flor.y, 32, 32, x * Q, y * Q, 32, 32);
    else g.drawImage(img, grama.x + 32 * Math.floor(s * 3), grama.y + 160, 32, 32, x * Q, y * Q, 32, 32);
    if (naAreia[i]) autotile(g, img, areia, temAreia, x, y, 0, 0, Math.floor(s * 7) % 2);
    if (t.agua[i]) autotile(g, img, agua, temAgua, x, y, 0, 0, Math.floor(s * 11) % 3);
  }
  return { canvas: c, naAreia };
}

// Uma estrada de terra num canvas do tamanho só do trecho dela (economiza memória no celular).
export function desenharEstrada(img, frames, marcadas, W) {
  const terra = quadro(frames, 't-terra');
  let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1;
  for (const i of marcadas) { const x = i % W; const y = Math.floor(i / W); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < 0) return null;
  const [c, g] = tela((x1 - x0 + 1) * Q, (y1 - y0 + 1) * Q);
  const tem = (x, y) => marcadas.has(y * W + x);
  for (const i of marcadas) { const x = i % W; const y = Math.floor(i / W); autotile(g, img, terra, tem, x, y, x0, y0, Math.floor(semente2(x, y) * 3)); }
  return { canvas: c, x: x0, y: y0 };
}
