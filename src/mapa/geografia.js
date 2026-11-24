// Geografia da Vila dos Planos na planta V02: 88 x 50 peças. Só dados e funções puras (testáveis sem navegador).
// Todas as coordenadas são em peças, com a origem no canto noroeste (x para leste, y para sul).
// A planta é um esquema de ocupação: aqui cada forma vira uma máscara de peças (centro da peça dentro da forma).

export const LARG = 88;
export const ALT = 50;

// Rio sinuoso de norte a sul, com largura entre 2,5 e 4 peças
export const RIO_EIXO = [
  [42, -1, 3], [39, 4, 3.4], [39.5, 8, 3], [42, 12, 3.6], [45, 16, 3.2], [46, 19, 3.8], [45, 22, 3], [43.5, 24, 3.4],
  [41, 28, 3.6], [39, 32, 3], [39.5, 35, 3.5], [42, 39, 3.2], [44, 43, 3.8], [44, 47, 3], [43, 51, 3],
];
// Única travessia: uma fileira de peças (y) entre x0 e x1
export const PONTE = { y: 24, x0: 40, x1: 46 };

export const LAGOS = [
  [[4, 42], [6, 41], [8.5, 41.2], [9.5, 43], [9, 45], [7, 46.2], [4.8, 45.5], [3.7, 44]],
  [[70.4, 13.3], [72.5, 12.7], [74.5, 13.7], [74.5, 16.1], [72.6, 16.8], [70.6, 15.9]],
];

export const DESERTO = [[4, 7], [9, 4.8], [17, 4.5], [25, 5], [29, 7], [30, 11], [28, 15], [24, 18], [17, 18.5], [11, 17], [5, 15]];

// Praça de pedra no sudoeste
export const PRACA_POLIGONO = [[12.5, 30], [16, 28], [21, 28], [25, 29], [29, 30], [29.5, 35.5], [27, 38.5], [22, 39.5], [17, 38.5], [13, 36.5]];

// Limite interno do mundo: fora dele é mata
export const LIMITE = [
  [3, 8], [7, 5], [15, 3], [22, 4], [29, 3], [38, 4], [44, 3], [49, 3], [55, 0], [60, 3], [70, 3], [77, 4], [86, 4], [84, 10], [85, 17], [84, 23],
  [85, 32], [84, 38], [82, 46], [73, 47], [66, 46], [56, 47], [46, 48], [36, 47], [28, 48], [20, 47], [13, 48], [5, 47], [2, 44], [4, 37], [2, 31],
  [4, 25], [2, 20], [4, 14],
];

// Bosque que separa o corredor que sai da ponte do caminho das fases 6 a 8 (impede o atalho ponte-castelo)
export const BOSQUE_SEPARADOR = [
  [46.8, 13], [49, 13], [49, 17], [50.5, 20], [55.8, 21], [59, 22], [60, 26.6], [68, 26.6], [70, 23], [70, 21.4], [81.5, 21.4], [81.5, 22.5], [72, 23.2],
  [70, 27.7], [60, 27.7], [56, 26.5], [54, 24], [50, 22], [47, 20],
];

// Platô superior do norte (Mundo 2 fica além da muralha) e as escarpas (paredes de 4 peças de altura)
export const PLATO = [[41, 0], [88, 0], [88, 10], [84, 10.4], [78, 9.5], [72, 10.2], [66, 9.3], [60, 10], [49, 10], [45, 9.4], [41, 10.2]];
export const ESCARPAS = [{ x: 41, y: 8, w: 8, h: 4 }, { x: 60, y: 8, w: 28, h: 4 }];
export const MURALHA = { x: 41, y: 4, w: 47, h: 1 };
export const ESCADA = { x: 53, y: 6, w: 3, h: 4 };
// Castelo (o corpo de pedra que fecha a única subida) e portão do Mundo 2 na muralha
export const CASTELO = { x: 49, y: 10, w: 11, h: 6 };
export const PORTAO = { x: 51, y: 3, w: 6, h: 3, entrada: [54, 7] };

// ---------- máscaras ----------
export function dentroDoPoligono(px, py, pol) {
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i]; const [xj, yj] = pol[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function mascaraPoligono(pol, W = LARG, H = ALT) {
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dentroDoPoligono(x + 0.5, y + 0.5, pol)) m[y * W + x] = 1;
  return m;
}

const retangulo = (m, r, v = 1, W = LARG, H = ALT) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x >= 0 && y >= 0 && x < W && y < H) m[y * W + x] = v; };

// Afasta os pontos do centro: a margem do autotile come meia peça de água, então lagos pequenos precisam de folga
function ampliar(pol, k) {
  const cx = pol.reduce((s, p) => s + p[0], 0) / pol.length; const cy = pol.reduce((s, p) => s + p[1], 0) / pol.length;
  return pol.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

// Curva suave (Catmull-Rom) pelos pontos do eixo do rio, com a largura acompanhando
function eixoSuave(pts, passo = 0.25) {
  const p = [pts[0], ...pts, pts[pts.length - 1]]; const out = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / passo));
    for (let k = 0; k < n; k++) {
      const t = k / n; const t2 = t * t; const t3 = t2 * t;
      out.push([0, 1, 2].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]); return out;
}

function mascaraRio(W = LARG, H = ALT) {
  const m = new Uint8Array(W * H); const eixo = eixoSuave(RIO_EIXO);
  for (const [cx, cy, w] of eixo) {
    const r = w / 2;
    for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(H - 1, Math.ceil(cy + r + 1)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(W - 1, Math.ceil(cx + r + 1)); x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) m[y * W + x] = 1;
    }
  }
  return m;
}

// Tira peças soltas (sem vizinho igual em pelo menos duas direções) para o autotile não ficar com pontas
function limpar(m, W = LARG, H = ALT) {
  const g = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? m[y * W + x] : 0);
  for (let volta = 0; volta < 2; volta++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m[y * W + x]) continue;
    const h = g(x - 1, y) + g(x + 1, y); const v = g(x, y - 1) + g(x, y + 1);
    if (h === 0 || v === 0) m[y * W + x] = 0;
  }
  return m;
}

// Tudo que o terreno precisa: águas, areia, mata, platô e paredes. Devolve máscaras de W x H (1 = sim).
export function montarGeografia(W = LARG, H = ALT) {
  const agua = mascaraRio(W, H);
  for (const l of LAGOS) { const m = mascaraPoligono(ampliar(l, 1.35), W, H); for (let i = 0; i < m.length; i++) if (m[i]) agua[i] = 1; }
  limpar(agua, W, H);
  const areia = limpar(mascaraPoligono(DESERTO, W, H), W, H);
  const dentro = mascaraPoligono(LIMITE, W, H);
  const floresta = new Uint8Array(W * H);
  for (let i = 0; i < floresta.length; i++) if (!dentro[i]) floresta[i] = 1;
  const bosque = mascaraPoligono(BOSQUE_SEPARADOR, W, H); for (let i = 0; i < bosque.length; i++) if (bosque[i]) floresta[i] = 1;
  for (let i = 0; i < floresta.length; i++) if (agua[i]) floresta[i] = 0;
  const plato = mascaraPoligono(PLATO, W, H);
  const escarpa = new Uint8Array(W * H); for (const r of ESCARPAS) retangulo(escarpa, r, 1, W, H);
  const muralha = new Uint8Array(W * H); retangulo(muralha, MURALHA, 1, W, H);
  return { W, H, agua, areia, floresta, plato, escarpa, muralha };
}
