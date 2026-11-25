// Chão da vila: calçamento de pedras irregulares com bordas orgânicas (praça e caminhos), canteiros, sebes e bancos.
// Arte do projeto, desenhada direto no canvas do chão. Q é o tamanho de um quadrado em pixels.
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const PEDRAS = [[194, 181, 157], [187, 174, 152], [199, 187, 163], [182, 170, 150]];

export function desenharCalcamento(g, t, planta, Q) {
  // retângulo (em pixels) que contém praça, pátios e caminhos, com folga
  const pts0 = [...(planta.TRILHAS ?? []).flat(), [planta.PRACA.cx - planta.PRACA.rx, planta.PRACA.cy - planta.PRACA.ry], [planta.PRACA.cx + planta.PRACA.rx, planta.PRACA.cy + planta.PRACA.ry], ...(planta.PATIOS ?? []).flatMap(([x, y, rx, ry]) => [[x - rx, y - ry], [x + rx, y + ry]])];
  const X0 = Math.max(0, Math.floor((Math.min(...pts0.map((p) => p[0])) - 2) * Q)); const Y0 = Math.max(0, Math.floor((Math.min(...pts0.map((p) => p[1])) - 2) * Q));
  const W = Math.min(t.W * Q, Math.ceil((Math.max(...pts0.map((p) => p[0])) + 2) * Q)) - X0; const H = Math.min(t.H * Q, Math.ceil((Math.max(...pts0.map((p) => p[1])) + 2) * Q)) - Y0;
  const m = document.createElement('canvas'); m.width = W; m.height = H; const gm = m.getContext('2d', { willReadFrequently: true }); gm.translate(-X0, -Y0);
  gm.fillStyle = gm.strokeStyle = '#000'; gm.lineCap = 'round'; gm.lineJoin = 'round';
  // praça: elipse de borda levemente irregular
  const pr = planta.PRACA; gm.beginPath();
  for (let k = 0; k <= 90; k++) { const a = (k / 90) * Math.PI * 2; const r = 1 + 0.035 * Math.sin(a * 5 + 1) + 0.025 * Math.sin(a * 9 + 2); const x = (pr.cx + Math.cos(a) * pr.rx * r) * Q; const y = (pr.cy + Math.sin(a) * pr.ry * r) * Q; if (k) gm.lineTo(x, y); else gm.moveTo(x, y); }
  gm.fill();
  for (const [cx, cy, rx, ry] of planta.PATIOS ?? []) { gm.beginPath(); gm.ellipse(cx * Q, cy * Q, rx * Q, ry * Q, 0, 0, Math.PI * 2); gm.fill(); }
  for (const pts of planta.TRILHAS ?? []) {
    gm.lineWidth = 2.2 * Q; gm.beginPath(); gm.moveTo(pts[0][0] * Q, pts[0][1] * Q);
    for (let i = 1; i < pts.length - 1; i++) gm.quadraticCurveTo(pts[i][0] * Q, pts[i][1] * Q, ((pts[i][0] + pts[i + 1][0]) / 2) * Q, ((pts[i][1] + pts[i + 1][1]) / 2) * Q);
    const u = pts[pts.length - 1]; gm.lineTo(u[0] * Q, u[1] * Q); gm.stroke();
  }
  const a = gm.getImageData(0, 0, W, H).data;
  const dentro = (x, y) => { const lx = x - X0; const ly = y - Y0; return lx >= 0 && ly >= 0 && lx < W && ly < H && a[(ly * W + lx) * 4 + 3] > 127; };
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const gc = cv.getContext('2d');
  const img = gc.createImageData(W, H); const o = img.data;
  const C = 15; // tamanho médio de uma pedra
  // os centros das pedras são calculados uma vez e guardados
  const guardados = new Map();
  const centro = (i, j) => { const k = i * 4096 + j; let v = guardados.get(k); if (!v) { v = [(i + 0.15 + 0.7 * hash(i, j)) * C + (j % 2) * C * 0.5, (j + 0.15 + 0.7 * hash(j + 7, i)) * C * 0.82, hash(i * 3, j * 5)]; guardados.set(k, v); } return v; };
  for (let y = Y0; y < Y0 + H; y++) for (let x = X0; x < X0 + W; x++) {
    if (a[((y - Y0) * W + x - X0) * 4 + 3] <= 127) continue;
    const j0 = Math.floor(y / (C * 0.82)); let d1 = 1e9, d2 = 1e9, quem = 0, px = 0, py = 0;
    for (let j = j0 - 1; j <= j0 + 1; j++) { const i0 = Math.floor((x - (j % 2) * C * 0.5) / C); for (let i = i0 - 1; i <= i0 + 1; i++) { const [cx, cy, h] = centro(i, j); const ex = x - cx; const ey = (y - cy) * 1.2; const d = Math.sqrt(ex * ex + ey * ey); if (d < d1) { d2 = d1; d1 = d; quem = h; px = cx; py = cy; } else if (d < d2) d2 = d; } }
    let c = PEDRAS[Math.floor(quem * PEDRAS.length)]; let k = 1;
    if (d2 - d1 < 1.6) c = [152, 138, 118]; else { if (x - px + (y - py) < -5) k = 1.06; else if (x - px + (y - py) > 6) k = 0.94; }
    // aro de pedras escuras em volta da praça e dos caminhos, com mato nas frestas da beirada
    const borda = !dentro(x - 5, y) || !dentro(x + 5, y) || !dentro(x, y - 5) || !dentro(x, y + 5);
    if (borda) { k *= 0.78; if (!dentro(x - 2, y) || !dentro(x + 2, y) || !dentro(x, y - 2) || !dentro(x, y + 2)) c = hash(x >> 1, y >> 1) < 0.35 ? [61, 143, 58] : [96, 86, 80]; }
    const p = ((y - Y0) * W + x - X0) * 4; o[p] = Math.min(255, c[0] * k); o[p + 1] = Math.min(255, c[1] * k); o[p + 2] = Math.min(255, c[2] * k); o[p + 3] = 255;
  }
  gc.putImageData(img, 0, 0); g.drawImage(cv, X0, Y0);
  const r = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  // rosácea em volta da fonte
  g.strokeStyle = 'rgba(122,72,60,0.55)'; for (const [k, l] of [[0.34, 5], [0.62, 3]]) { g.lineWidth = l; g.beginPath(); g.ellipse(pr.cx * Q, pr.cy * Q, pr.rx * k * Q, pr.ry * k * Q, 0, 0, Math.PI * 2); g.stroke(); }
  // tanque de pedra em volta da fonte
  const fo = planta.TANQUE; if (fo) {
    const [tx, ty, rx, ry] = fo; const el = (cor, k, dy = 0) => { g.fillStyle = cor; g.beginPath(); g.ellipse(tx * Q, ty * Q + dy, rx * Q - k, ry * Q - k * 0.7, 0, 0, Math.PI * 2); g.fill(); };
    el('rgba(15,12,30,0.3)', -4, 8); el('#3a3244', -2, 3); el('#a89d89', 0, 3); el('#ded4bd', 1, -3); el('#8a8070', 9, -3); el('#1c6d98', 11, -2); el('#2c96c2', 15, 1);
    for (let i = 0; i < 40; i++) r(i % 3 ? '#8fdcee' : '#e8fbff', tx * Q + Math.cos(i * 2.4) * (rx * Q - 22) * hash(i, 3), ty * Q + Math.sin(i * 2.4) * (ry * Q - 18) * hash(i, 4), 5, 2);
    for (let a = 0; a < 16; a++) r('#8a8070', tx * Q + Math.cos((a / 16) * Math.PI * 2) * (rx * Q - 5), ty * Q - 4 + Math.sin((a / 16) * Math.PI * 2) * (ry * Q - 4), 2, 6);
  }
  // jardim [x, y, raioX, raioY]: gramado mais claro, anel de flores aberto na entrada e sebe baixa em arco
  const jd = planta.JARDIM; if (jd) {
    const [jx, jy, rx, ry, entrada] = jd; const pt = (a, k) => [jx * Q + Math.cos(a) * rx * k * Q, jy * Q + Math.sin(a) * ry * k * Q];
    const aberto = (a) => Math.abs(Math.atan2(Math.sin(a - entrada), Math.cos(a - entrada))) < 0.5;
    const moita = (x, y, raio, tom) => { const bola = (cx, cy, rr, cor) => { for (let dy = -rr; dy <= rr; dy++) { const m = Math.round(Math.sqrt(rr * rr - dy * dy) * 1.15); r(cor, cx - m, cy + dy, m * 2 + 1, 1); } };
      bola(x + 4, y + 6, raio, 'rgba(8,20,10,0.4)'); bola(x, y, raio + 2, '#0c2414'); bola(x, y, raio, tom ? '#14502c' : '#1c6030'); bola(x - 2, y - 2, Math.max(2, raio - 3), tom ? '#2f8a3a' : '#48a438'); bola(x - 3, y - 4, Math.max(1, raio - 6), '#a4dc5c');
      for (let i = 0; i < raio; i++) r(i % 2 ? '#8fd460' : '#245c2a', x - raio + hash(x, i) * raio * 2, y - raio + hash(i, y) * raio * 1.8, 2, 2); };
    // moitas em grupos, com falhas, para parecer um jardim cuidado e não um muro
    for (let a = 0, n = 0; a < Math.PI * 2; n++) { const passo = 0.17 + hash(n, 31) * 0.13; a += passo; if (aberto(a) || hash(n, 32) < 0.14) continue; const [x, y] = pt(a, 1.08 + hash(n, 33) * 0.14); const raio = 6 + Math.floor(hash(n, 34) * 6);
      if ([[0, 0], [raio + 4, 0], [-raio - 4, 0], [0, raio + 4], [0, -raio - 4]].some(([dx, dy]) => dentro(Math.round(x + dx), Math.round(y + dy)))) continue;
      moita(Math.round(x), Math.round(y), raio, n % 3 === 0); if (hash(n, 35) < 0.35) for (let i = 0; i < 4; i++) r(['#ff9ac0', '#fff3c4', '#ffd23c'][n % 3], x - 6 + hash(n, i) * 12, y - 7 + hash(i, n) * 10, 3, 3); }
    for (let i = 0; i < 260; i++) { const a = hash(i, 11) * Math.PI * 2; if (aberto(a)) continue; const [x, y] = pt(a, 0.68 + hash(i, 12) * 0.3); const grupo = Math.floor(((a + 6.3) * 2.2) % 5); r('#2c7a31', x - 2, y + 2, 8, 5); r(['#e8588a', '#ffd23c', '#fff3c4', '#9a6cf0', '#ff7a4a'][grupo], x, y, 5, 5); r('#fff8dc', x + 1, y + 1, 2, 2); }
  }
  // sebes [x, y, comprimento]
  for (const [x, y, w] of planta.SEBES ?? []) { const x0 = x * Q; const y0 = y * Q; r('rgba(10,25,10,0.3)', x0 + 4, y0 + 8, w * Q, 8); r('#14401c', x0, y0 - 14, w * Q, 26); r('#2c7a31', x0 + 2, y0 - 12, w * Q - 4, 21); for (let i = 0; i < w * 26; i++) r(hash(i, x) < 0.5 ? '#55a844' : '#1f5c28', x0 + 3 + hash(i, y) * (w * Q - 8), y0 - 12 + hash(y, i) * 19, 3, 3); }
  // canteiros [x, y, largura] com borda de madeira e flores
  for (const [x, y, w] of planta.CANTEIROS ?? []) {
    const x0 = x * Q; const y0 = y * Q; const lw = w * Q;
    r('rgba(10,25,10,0.3)', x0 + 4, y0 + 8, lw, 10); r('#3a2210', x0, y0 - 8, lw, 22); r('#8a5a2e', x0 + 2, y0 - 6, lw - 4, 18); r('#4a2c16', x0 + 4, y0 - 4, lw - 8, 12);
    for (let i = 0; i < w * 11; i++) { const fx = x0 + 5 + hash(i, x + y) * (lw - 14); const fy = y0 - 10 + hash(x - i, y) * 15; r('#2c7a31', fx - 1, fy + 3, 8, 5); r(['#e8588a', '#ffd23c', '#fff3c4', '#9a6cf0', '#ff7a4a'][(i + x) % 5], fx, fy, 6, 5); r('#fff8dc', fx + 2, fy + 1, 2, 2); }
  }
  // bancos de praça [x, y]
  for (const [x, y] of planta.BANCOS ?? []) {
    const x0 = x * Q; const y0 = y * Q;
    r('rgba(10,15,30,0.3)', x0 + 3, y0 + 6, 44, 6); for (const px of [x0 + 2, x0 + 38]) r('#2b2538', px, y0 - 4, 4, 14);
    for (const [yy, h] of [[-20, 6], [-12, 6], [-3, 7]]) { r('#3a2210', x0, y0 + yy - 1, 44, h + 2); r('#a8743f', x0 + 1, y0 + yy, 42, h); r('#d0a064', x0 + 1, y0 + yy, 42, 2); }
  }
}
