// Motor de pixel art por formas: elipses, retângulos, polígonos e traços numa grade pequena, com sombra e
// contorno automáticos. A grade depois é pintada num canvas e ampliada sem borrar (estilo 16 bits).

// Paleta comum a todos os desenhos do jogo (uma letra por cor).
export const COR = {
  k: '#2b2233', K: '#120f22', l: '#9b8cab', w: '#ffffff', s: '#e7e1f0', c: '#fdf5e8', C: '#ecdcc0', e: '#241b30',
  p: '#ff7eb6', P: '#d94f8f', b: '#ffc2d4', m: '#8c2d3c', t: '#ff8fa3', r: '#e04b3a', R: '#9c2b22', x: '#ff9f1c', y: '#ffd23f',
  g: '#f7c548', G: '#c98a12', Y: '#fff1b0', S: '#c9cfe0', a: '#8d93ab', A: '#5d6380', o: '#8b5a2b', O: '#c4843f',
  u: '#3b82d6', U: '#1f4f9a', V: '#173a78', n: '#3fa34d', N: '#237033', q: '#f6ead0', d: '#a77b4f', D: '#7a5533',
};

export const tela = (w, h) => ({ w, h, px: new Array(w * h).fill(null) });
export const pon = (r, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < r.w && y < r.h) r.px[y * r.w + x] = c; };
const pega = (r, x, y) => (x >= 0 && y >= 0 && x < r.w && y < r.h ? r.px[y * r.w + x] : null);

// Elipse com sombra no canto de baixo à direita e borda opcional (um pixel a mais em volta).
export function el(r, cx, cy, rx, ry, c, { sombra, borda } = {}) {
  const f = (rx2, ry2, cor, sh) => {
    for (let y = Math.floor(cy - ry2 - 1); y <= cy + ry2 + 1; y++) for (let x = Math.floor(cx - rx2 - 1); x <= cx + rx2 + 1; x++) {
      const dx = (x + 0.5 - cx) / rx2; const dy = (y + 0.5 - cy) / ry2;
      if (dx * dx + dy * dy <= 1) pon(r, x, y, sh && dx * 0.45 + dy > 0.5 ? sh : cor);
    }
  };
  if (borda) f(rx + 1, ry + 1, borda);
  f(rx, ry, c, sombra);
}

export const ret = (r, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pon(r, x + i, y + j, c); };

// Polígono; a cor pode ser uma função (x, y) para preencher em faixas ou quartos.
export function poli(r, pts, c) {
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
    let dentro = false; const px = x + 0.5; const py = y + 0.5;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    if (dentro) pon(r, x, y, typeof c === 'function' ? c(x, y) : c);
  }
}

export function traco(r, x0, y0, x1, y1, c, esp = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) ret(r, Math.round(x0 + ((x1 - x0) * i) / n - esp / 2), Math.round(y0 + ((y1 - y0) * i) / n - esp / 2), esp, esp, c);
}

// Contorno de um pixel em volta de tudo o que foi desenhado.
export function contorno(r, c) {
  const n = r.px.slice();
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (r.px[y * r.w + x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const v = pega(r, x + dx, y + dy); return v && v !== c; })) n[y * r.w + x] = c;
  }
  r.px = n;
}

// Desenho por linhas de texto: cada letra é um pixel da paleta, '.' é transparente.
export function linhas(r, rows, x0, y0) {
  rows.forEach((l, y) => { for (let x = 0; x < l.length; x++) if (l[x] !== '.') pon(r, x0 + x, y0 + y, l[x]); });
}

export function desenha(ctx, r, ox = 0, oy = 0, espelho = false) {
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const c = r.px[y * r.w + x];
    if (!c) continue;
    ctx.fillStyle = COR[c] ?? c;
    ctx.fillRect(Math.round(ox) + (espelho ? r.w - 1 - x : x), Math.round(oy) + y, 1, 1);
  }
}

// Grade -> canvas do tamanho real (para virar imagem, textura do Phaser ou ícone).
export function emCanvas(r, escala = 1) {
  const c = document.createElement('canvas');
  c.width = r.w * escala; c.height = r.h * escala;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (escala === 1) desenha(g, r);
  else { const base = emCanvas(r, 1); g.drawImage(base, 0, 0, c.width, c.height); }
  return c;
}
