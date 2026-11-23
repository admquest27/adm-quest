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

// Peças cujo centro fica a até 1,3 peça do traçado de uma estrada (a mata e as flores não entram aí).
export function pecasDaEstrada(pontos, W, H) {
  const marcadas = new Set();
  for (let i = 0; i < pontos.length - 1; i++) {
    const [ax, ay] = pontos[i]; const [bx, by] = pontos[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n; const y = ay + ((by - ay) * k) / n;
      for (let cy = Math.floor(y) - 1; cy <= Math.floor(y) + 1; cy++) for (let cx = Math.floor(x) - 1; cx <= Math.floor(x) + 1; cx++) {
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
        if (Math.hypot(cx - x, cy - y) <= 1.3) marcadas.add(cy * W + cx);
      }
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

// Uma estrada de terra batida num canvas do tamanho só do trecho dela. O traçado vira uma faixa de cantos
// arredondados (largura de pouco mais de um quadrado e meio), com a borda mais escura, tufos de grama nas beiradas
// e pedrinhas. Onde o traçado passa por cima da água, a terra some (quem cobre ali é a ponte).
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
export function desenharEstrada(pontos, t, largura = 50) {
  const { W, H } = t; const R = largura / 2 + 2;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  const pts = pontos.map(([x, y]) => [(x + 0.5) * Q, (y + 0.5) * Q]);
  for (const [x, y] of pts) { x0 = Math.min(x0, x - R); y0 = Math.min(y0, y - R); x1 = Math.max(x1, x + R); y1 = Math.max(y1, y + R); }
  x0 = Math.max(0, Math.floor(x0 / Q) * Q - Q); y0 = Math.max(0, Math.floor(y0 / Q) * Q - Q);
  x1 = Math.min(W * Q, Math.ceil(x1 / Q) * Q + Q); y1 = Math.min(H * Q, Math.ceil(y1 / Q) * Q + Q);
  const w = x1 - x0; const h = y1 - y0;
  // máscara da faixa (sem suavização: o pixel é inteiro ou não é)
  const [, gm] = tela(w, h); gm.lineCap = 'round'; gm.lineJoin = 'round'; gm.lineWidth = largura; gm.strokeStyle = '#000';
  gm.beginPath(); pts.forEach(([x, y], i) => (i ? gm.lineTo(x - x0, y - y0) : gm.moveTo(x - x0, y - y0))); gm.stroke();
  const dm = gm.getImageData(0, 0, w, h).data; const dentro = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (dm[i * 4 + 3] < 128) continue;
    const px = x0 + (i % w); const py = y0 + Math.floor(i / w); const tx = Math.floor(px / Q); const ty = Math.floor(py / Q);
    if (tx >= 0 && ty >= 0 && tx < W && ty < H && t.agua[ty * W + tx]) continue; // sem terra sobre a água
    dentro[i] = 1;
  }
  // distância até a borda (duas passadas)
  const dist = new Uint8Array(w * h).fill(255);
  for (let i = 0; i < w * h; i++) if (dentro[i]) dist[i] = 99;
  const viz = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dentro[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dentro[y * w + x] && (!viz(x - 1, y) || !viz(x + 1, y) || !viz(x, y - 1) || !viz(x, y + 1))) dist[y * w + x] = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (dist[i] === 255) continue; const a = Math.min(x ? dist[i - 1] + 1 : 99, y ? dist[i - w] + 1 : 99); if (a < dist[i]) dist[i] = a; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (dist[i] === 255) continue; const a = Math.min(x < w - 1 ? dist[i + 1] + 1 : 99, y < h - 1 ? dist[i + w] + 1 : 99); if (a < dist[i]) dist[i] = a; }
  const [c, g] = tela(w, h); const out = g.createImageData(w, h);
  const pinta = (i, hex) => { out.data[i * 4] = parseInt(hex.slice(1, 3), 16); out.data[i * 4 + 1] = parseInt(hex.slice(3, 5), 16); out.data[i * 4 + 2] = parseInt(hex.slice(5, 7), 16); out.data[i * 4 + 3] = 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (dentro[i]) {
      const d = dist[i]; const r = hash(x >> 1, y >> 1);
      if (d <= 1) pinta(i, '#6f4a2a');
      else if (d <= 3) pinta(i, r < 0.5 ? '#a4713f' : '#98693a');
      else if (d <= 5) pinta(i, r < 0.5 ? '#c4935a' : '#bb8a52');
      else pinta(i, r < 0.16 ? '#b98650' : r < 0.3 ? '#d3a76d' : r < 0.36 ? '#a9784a' : '#c99a5f');
    } else if (viz(x - 1, y) || viz(x + 1, y) || viz(x, y - 1) || viz(x, y + 1) || viz(x - 1, y - 1) || viz(x + 1, y + 1)) {
      // beirada: tufos de grama mais escuros espalhados
      if (hash(x, y) < 0.42) pinta(i, hash(x + 3, y) < 0.5 ? '#2d6a2f' : '#3d8a38');
    }
  }
  // pedrinhas e um fio de rodas no meio
  for (let k = 0; k < (w * h) / 700; k++) { const x = Math.floor(hash(k, 1) * w); const y = Math.floor(hash(k, 2) * h); const i = y * w + x; if (dentro[i] && dist[i] > 6) { pinta(i, '#8b6a45'); if (dentro[i + 1]) pinta(i + 1, '#e0c08a'); } }
  g.putImageData(out, 0, 0);
  return { canvas: c, x: x0, y: y0 };
}
