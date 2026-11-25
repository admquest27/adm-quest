// Chão da Vila com a arte LPC (quadrados de 32 px): grama, água, areia e estradas de terra com bordas
// arredondadas (autotile do LPC: cada quadrado vira quatro pedaços de 16 escolhidos pelos vizinhos).
// A cena desenha o resultado na metade do tamanho, então cada quadrado LPC ocupa uma peça da planta.
import { semente2 } from './grade.js';
import { desenharAguas } from './agua.js';
import { desenharEscarpas, desenharEscada } from './escarpa.js';
import { desenharCalcamento } from './calcamento.js';

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

// Uma peça de calçada de pedra (paralelepípedos em fileiras desencontradas) com beirada escura onde a praça acaba
function calcada(g, tx, ty, viz) {
  const x0 = tx * Q; const y0 = ty * Q;
  g.fillStyle = '#5f5b6e'; g.fillRect(x0, y0, Q, Q);
  const tons = [['#a8a5b3', '#c3c0cd', '#85828f'], ['#9b98a8', '#b6b3c2', '#7a7786'], ['#b0adb8', '#cac7d3', '#8c8996'], ['#a29faf', '#bdbacb', '#807d8d']];
  for (let fila = 0; fila < 4; fila++) {
    let x = -((fila % 2) * 6 + Math.floor(semente2(tx * 3 + fila, ty) * 4)); let k = 0;
    while (x < Q) {
      const w = 10 + Math.floor(semente2(tx * 7 + fila * 5 + k, ty * 3 + 1) * 7); const [base, luz, sombra] = tons[Math.floor(semente2(tx + k * 11, ty * 5 + fila) * 4)];
      const ax = Math.max(0, x + 1); const bx = Math.min(Q, x + w); const y = fila * 8;
      if (bx > ax) { g.fillStyle = base; g.fillRect(x0 + ax, y0 + y + 1, bx - ax, 6); g.fillStyle = luz; g.fillRect(x0 + ax, y0 + y + 1, bx - ax, 1); g.fillStyle = sombra; g.fillRect(x0 + ax, y0 + y + 6, bx - ax, 1); }
      x += w + 1; k++;
    }
  }
  // beirada: sombra escura e um fio de terra onde vizinho não é calçada
  g.fillStyle = '#4a4658';
  if (!viz(0, -1)) g.fillRect(x0, y0, Q, 2);
  if (!viz(0, 1)) g.fillRect(x0, y0 + Q - 2, Q, 2);
  if (!viz(-1, 0)) g.fillRect(x0, y0, 2, Q);
  if (!viz(1, 0)) g.fillRect(x0 + Q - 2, y0, 2, Q);
}

// Chão inteiro: grama (com flores de vez em quando), areia do deserto e água de rio e lagos.
export function desenharChao(img, frames, t, planta, evitar = new Set(), extras = {}) {
  const { W, H } = t; const [c, g] = tela(W * Q, H * Q);
  const grama = quadro(frames, 't-grama'); const flor = quadro(frames, 'grama-flor');
  const agua = quadro(frames, 't-agua'); const areia = quadro(frames, 't-areia');
  const d = planta.DESERTO;
  const naAreia = new Uint8Array(W * H);
  if (t.areia) naAreia.set(t.areia);
  else if (d?.rx) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = Math.atan2(y + 0.5 - d.cy, x + 0.5 - d.cx); const r = 1 + 0.1 * Math.sin(a * 3 + 0.6) + 0.06 * Math.sin(a * 7 + 1.3);
    if (((x + 0.5 - d.cx) / (d.rx * r)) ** 2 + ((y + 0.5 - d.cy) / (d.ry * r)) ** 2 < 1) naAreia[y * W + x] = 1;
  }
  const pr = planta.PRACA; const naPraca = new Uint8Array(W * H);
  if (pr && !planta.TRILHAS) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = Math.atan2(y + 0.5 - pr.cy, x + 0.5 - pr.cx); const r = 1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5 + 2);
    if (((x + 0.5 - pr.cx) / (pr.rx * r)) ** 2 + ((y + 0.5 - pr.cy) / (pr.ry * r)) ** 2 < 1 && !t.agua[y * W + x]) naPraca[y * W + x] = 1;
  }
  const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const temAgua = (x, y) => (dentro(x, y) ? t.agua[y * W + x] === 1 : true);
  const temAreia = (x, y) => (dentro(x, y) ? naAreia[y * W + x] === 1 : false);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = semente2(x * 5 + 3, y * 9 + 1);
    const i = y * W + x;
    if (s < 0.05 && !evitar.has(i) && !t.floresta[i] && !naPraca[i]) g.drawImage(img, flor.x + 32 * Math.floor(s * 60 % 3), flor.y, 32, 32, x * Q, y * Q, 32, 32);
    else g.drawImage(img, grama.x + 32 * Math.floor(s * 3), grama.y + 160, 32, 32, x * Q, y * Q, 32, 32);
    if (naPraca[i]) calcada(g, x, y, (dx, dy) => (dentro(x + dx, y + dy) ? naPraca[(y + dy) * W + x + dx] === 1 : false));
    if (naAreia[i]) autotile(g, img, areia, temAreia, x, y, 0, 0, Math.floor(s * 7) % 2);
    if (t.agua[i] && !t.aguaPx) autotile(g, img, agua, temAgua, x, y, 0, 0, Math.floor(s * 11) % 3);
  }
  if (planta.TRILHAS) desenharCalcamento(g, t, planta, Q);
  if (t.aguaPx) desenharAguas(g, t);
  if (t.escarpa) desenharEscarpas(g, t, extras.rochas);
    if (planta.ESCADA) desenharEscada(g, planta.ESCADA);
  return { canvas: c, naAreia };
}

// Uma estrada de terra batida num canvas do tamanho só do trecho dela. O traçado vira uma faixa de cantos
// arredondados (largura de pouco mais de um quadrado e meio), com a borda mais escura, tufos de grama nas beiradas
// e pedrinhas. Onde o traçado passa por cima da água, a terra some (quem cobre ali é a ponte).
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
export function desenharEstradas(segmentos, t, largura = 46, semTerra = [], textura = null, transicao = null) {
  const { W, H } = t; const PW = W * Q; const PH = H * Q; const N = PW * PH;
  const dono = new Int8Array(N).fill(-1);
  segmentos.forEach((pontos, n) => {
    const pts = pontos.map(([x, y]) => [(x + 0.5) * Q, (y + 0.5) * Q]);
    const R = largura / 2 + 2; const bx0 = Math.max(0, Math.floor(Math.min(...pts.map((q) => q[0])) - R)); const by0 = Math.max(0, Math.floor(Math.min(...pts.map((q) => q[1])) - R));
    const bx1 = Math.min(PW, Math.ceil(Math.max(...pts.map((q) => q[0])) + R)); const by1 = Math.min(PH, Math.ceil(Math.max(...pts.map((q) => q[1])) + R));
    const bw = bx1 - bx0; const bh = by1 - by0; const [, gm] = tela(bw, bh); gm.fillStyle = '#000';
    // refaz o traçado em passos de 3 px, com a largura variando de leve (estrada de verdade não é um tubo)
    let k = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i]; const [bx, by] = pts[i + 1]; const m = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
      for (let q = 0; q < m; q++, k++) {
        const r = (largura / 2) * (0.9 + 0.1 * Math.sin(k * 0.045 + n * 2.1) + 0.06 * Math.sin(k * 0.13 + n));
        gm.beginPath(); gm.arc(ax + ((bx - ax) * q) / m - bx0, ay + ((by - ay) * q) / m - by0, r, 0, Math.PI * 2); gm.fill();
      }
    }
    const d = gm.getImageData(0, 0, bw, bh).data;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      if (d[(y * bw + x) * 4 + 3] < 128) continue;
      if (semTerra.some(([ax, ay, bx2, by2]) => x + bx0 >= ax * Q && x + bx0 < bx2 * Q && y + by0 >= ay * Q && y + by0 < by2 * Q)) continue;
      const i = (by0 + y) * PW + bx0 + x; if (dono[i] >= 0) continue;
      if (t.agua[Math.floor((by0 + y) / Q) * W + Math.floor((bx0 + x) / Q)]) continue;
      dono[i] = n;
    }
  });
  const dist = new Uint8Array(N).fill(255);
  for (let i = 0; i < N; i++) if (dono[i] >= 0) dist[i] = 99;
  const viz = (x, y) => (x < 0 || y < 0 || x >= PW || y >= PH ? -1 : dono[y * PW + x]);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (dono[y * PW + x] >= 0 && (viz(x - 1, y) < 0 || viz(x + 1, y) < 0 || viz(x, y - 1) < 0 || viz(x, y + 1) < 0)) dist[y * PW + x] = 0;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x; if (dist[i] === 255) continue; const a = Math.min(x ? dist[i - 1] + 1 : 99, y ? dist[i - PW] + 1 : 99); if (a < dist[i]) dist[i] = a; }
  for (let y = PH - 1; y >= 0; y--) for (let x = PW - 1; x >= 0; x--) { const i = y * PW + x; if (dist[i] === 255) continue; const a = Math.min(x < PW - 1 ? dist[i + 1] + 1 : 99, y < PH - 1 ? dist[i + PW] + 1 : 99); if (a < dist[i]) dist[i] = a; }
  const cores = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const box = segmentos.map(() => [PW, PH, -1, -1]); const cor = new Array(N); const dn = new Int8Array(N).fill(-1);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x; let c = null; let o = dono[i];
    if (o >= 0) {
      const dd = dist[i]; const r = hash(x >> 1, y >> 1);
      // luz vinda de cima: a borda de cima é mais clara, a de baixo mais escura
      const claro = viz(x, y - 3) < 0;
      c = dd <= 1 ? (claro ? '#8a6038' : '#5e3d22') : dd <= 3 ? (claro ? '#bb8a52' : (r < 0.5 ? '#9a6b3b' : '#8f6335')) : dd <= 6 ? (r < 0.5 ? '#c4935a' : '#bb8a52') : (r < 0.14 ? '#b98650' : r < 0.28 ? '#d6ab72' : r < 0.34 ? '#a9784a' : '#c99a5f');
    } else {
      o = Math.max(viz(x - 1, y), viz(x + 1, y), viz(x, y - 1), viz(x, y + 1));
      if (o >= 0 && hash(x, y) < 0.45) c = hash(x + 3, y) < 0.5 ? '#2d6a2f' : '#3d8a38';
    }
    if (c) { cor[i] = cores(c); dn[i] = o; const b = box[o]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
  }
  // com a textura do pacote: o miolo repete o desenho de terra; a beirada escurece e esfarela em torrões
  if (textura) {
    const [, gt] = tela(textura.width, textura.height); gt.drawImage(textura, 0, 0); const tx = gt.getImageData(0, 0, textura.width, textura.height).data;
    const amostra = (sx, sy) => { const p = (sy * textura.width + sx) * 4; return [tx[p], tx[p + 1], tx[p + 2]]; };
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const i = y * PW + x; const o = dono[i]; if (o < 0) continue;
      // quadros lisos e com pedrinhas da última fileira da folha, sorteados por quadrado
      const v = hash(Math.floor(x / 32) + 7, Math.floor(y / 32) + 3) < 0.78 ? 64 : 32;
      let c = amostra(v + (x % 32), 160 + (y % 32)); const dd = dist[i];
      const claro = viz(x, y - 3) < 0;
      if (dd <= 1) c = claro ? [150, 108, 62] : [96, 62, 36]; else if (dd <= 4) c = c.map((q) => Math.round(q * (claro ? 1.06 : 0.82))); else if (dd <= 8) c = c.map((q) => Math.round(q * 0.93));
      cor[i] = c; dn[i] = o;
    }
    // torrões e pedrinhas escapando pela beirada, sobre a grama
    for (let y = 3; y < PH - 3; y += 3) for (let x = 3; x < PW - 3; x += 3) {
      const i = y * PW + x; if (dono[i] >= 0 || hash(x, y) > 0.2) continue;
      const o = Math.max(viz(x - 5, y), viz(x + 5, y), viz(x, y - 5), viz(x, y + 5)); if (o < 0) continue;
      if (t.agua[Math.floor(y / Q) * W + Math.floor(x / Q)]) continue;
      if (semTerra.some(([ax, ay, bx2, by2]) => x >= ax * Q && x < bx2 * Q && y >= ay * Q && y < by2 * Q)) continue;
      const w = 3 + Math.floor(hash(y, x) * 4);
      for (let dy = 0; dy < 3; dy++) for (let dx = dy ? 0 : 1; dx < w - (dy ? 0 : 1); dx++) { const k = (y + dy) * PW + x + dx; cor[k] = dy === 0 ? [214, 170, 108] : dy === 1 ? [172, 126, 76] : [100, 70, 44]; dn[k] = o; const b = box[o]; b[0] = Math.min(b[0], x + dx); b[1] = Math.min(b[1], y + dy); b[2] = Math.max(b[2], x + dx); b[3] = Math.max(b[3], y + dy); }
    }
  }
  // passagem para o calçamento: pedras soltas cada vez mais juntas, e a terra esfarelando até sumir
  if (transicao) {
    const [ax, ay, bx2, by2] = transicao; const cores2 = [[194, 181, 157], [187, 174, 152], [199, 187, 163], [182, 170, 150]];
    for (let gy = Math.floor(ay * Q); gy < by2 * Q + 12; gy += 11) for (let gx = Math.floor(ax * Q); gx < bx2 * Q; gx += 13) {
      const avanco = Math.max(0, Math.min(1, (gy - ay * Q) / ((by2 - ay) * Q))); if (hash(gx, gy) > avanco * avanco * 1.25) continue;
      const cx = gx + Math.floor(hash(gy, gx) * 7) + ((gy / 11) % 2) * 6; const cy = gy + Math.floor(hash(gx + 5, gy) * 5); const rx = 4 + Math.floor(avanco * 3 + hash(cy, cx) * 2); const ry = Math.max(3, rx - 2);
      const o = viz(cx, cy); if (o < 0) continue; const cor3 = cores2[Math.floor(hash(cx, cy) * 4)];
      for (let dy = -ry - 1; dy <= ry + 1; dy++) for (let dx = -rx - 1; dx <= rx + 1; dx++) {
        const dentro = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry); const borda = (dx * dx) / ((rx + 1.4) ** 2) + (dy * dy) / ((ry + 1.4) ** 2); if (borda > 1) continue;
        const k = (cy + dy) * PW + cx + dx; if (dono[k] !== o) continue; cor[k] = dentro > 1 ? [120, 92, 66] : dy < -ry * 0.3 ? cor3.map((v) => Math.min(255, v + 14)) : dy > ry * 0.4 ? cor3.map((v) => v - 22) : cor3; dn[k] = o;
      }
    }
    // a faixa final da terra se desfaz em torrões, revelando as pedras de baixo
    for (let y = Math.floor((by2 - 1.6) * Q); y < by2 * Q + 14; y++) for (let x = Math.floor(ax * Q); x < bx2 * Q; x++) {
      const k = y * PW + x; if (!cor[k]) continue; const some = Math.max(0, Math.min(1, (y - (by2 - 1.6) * Q) / (1.6 * Q))); const grao = hash(x >> 2, y >> 2);
      if (grao < some && !(cor[k][2] > 130)) cor[k] = null;
    }
  }
  // pedrinhas soltas
  for (let k = 0; k < N / 900; k++) { const x = Math.floor(hash(k, 1) * PW); const y = Math.floor(hash(k, 2) * PH); const i = y * PW + x; if (dono[i] >= 0 && dist[i] > 7 && dono[i + 1] >= 0) { cor[i] = cores('#8b6a45'); cor[i + 1] = cores('#e6c995'); } }
  return segmentos.map((_, n) => {
    const [bx0, by0, bx1, by1] = box[n]; if (bx1 < 0) return null;
    const w = bx1 - bx0 + 1; const h = by1 - by0 + 1; const [c, g] = tela(w, h); const out = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (by0 + y) * PW + bx0 + x; if (!cor[i] || dn[i] !== n) continue; const p = (y * w + x) * 4; [out.data[p], out.data[p + 1], out.data[p + 2]] = cor[i]; out.data[p + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    return { canvas: c, x: bx0, y: by0 };
  });
}
