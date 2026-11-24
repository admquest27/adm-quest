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
  [[70.4, 14.1], [72.5, 13.5], [74.5, 14.5], [74.5, 16.9], [72.6, 17.6], [70.6, 16.7]],
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
// A escarpa não é uma linha reta: a borda de cima ondula (entra e sai até uns dois quadrados) e a parede tem altura própria.
// Ela corre de x0 a x1 (em quadrados); onde toca o rio, a água manda e a pedra é cortada. No vão do castelo (49 a 60) fica a escada.
export const ESCARPA_ALTURA = 4.2;
export const ESCARPA_TRECHOS = [{ x0: 41, x1: 49 }, { x0: 60, x1: 88 }];
export const bordaEscarpa = (x) => 8 + 0.85 * Math.sin(x * 0.31 + 0.4) + 0.5 * Math.sin(x * 0.83 + 2.1) + 0.25 * Math.sin(x * 1.9);
export const MURALHA = { x: 41, y: 4, w: 47, h: 1 };
export const ESCADA = { x: 53, y: 6, w: 3, h: 4 };
// Castelo (o corpo de pedra que fecha a única subida) e portão do Mundo 2 na muralha
export const CASTELO = { x: 49, y: 10, w: 11, h: 8 }; // o corpo (y 12 a 17) mais o trecho coberto pelas alas, até a escada
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

// ---------- água em pixels (forma contínua e suave) ----------
// A água não usa peças de autotile: é uma forma desenhada pixel a pixel (rio com largura que oscila, lagos arredondados).
// Daí saem duas máscaras de peças: 'agua' (a peça é mais da metade água) e 'aguaBloqueio' (qualquer pedaço relevante de água).
export const Q = 32;

function desenharDisco(px, PW, PH, cx, cy, r) {
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(PH - 1, Math.ceil(cy + r)); y++) {
    const dy = y - cy; const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    for (let x = Math.max(0, Math.floor(cx - w)); x <= Math.min(PW - 1, Math.ceil(cx + w)); x++) px[y * PW + x] = 1;
  }
}

// Borrão de caixa em duas passadas (separável), usado para arredondar as margens dos lagos
function borrar(src, w, h, raio) {
  const tmp = new Float32Array(w * h); const out = new Float32Array(w * h); const n = raio * 2 + 1;
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -raio; x <= raio; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[y * w + x] = s / n; s += src[y * w + Math.min(w - 1, x + raio + 1)] - src[y * w + Math.max(0, x - raio)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -raio; y <= raio; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s / n; s += tmp[Math.min(h - 1, y + raio + 1) * w + x] - tmp[Math.max(0, y - raio) * w + x]; } }
  return out;
}

export function aguaEmPixels(W = LARG, H = ALT) {
  const PW = W * Q; const PH = H * Q; const px = new Uint8Array(PW * PH);
  const eixo = eixoSuave(RIO_EIXO, 0.2);
  eixo.forEach(([cx, cy, w], i) => {
    const osc = 1 + 0.07 * Math.sin(i * 0.06) + 0.04 * Math.sin(i * 0.17 + 1.2);
    desenharDisco(px, PW, PH, cx * Q, cy * Q, (w / 2) * Q * osc);
  });
  for (const lago of LAGOS) {
    const pol = ampliar(lago, 1.2).map(([x, y]) => [x * Q, y * Q]);
    const x0 = Math.max(0, Math.floor(Math.min(...pol.map((p) => p[0])) - 24)); const y0 = Math.max(0, Math.floor(Math.min(...pol.map((p) => p[1])) - 24));
    const x1 = Math.min(PW, Math.ceil(Math.max(...pol.map((p) => p[0])) + 24)); const y1 = Math.min(PH, Math.ceil(Math.max(...pol.map((p) => p[1])) + 24));
    const w = x1 - x0; const h = y1 - y0; const cru = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dentroDoPoligono(x0 + x + 0.5, y0 + y + 0.5, pol)) cru[y * w + x] = 1;
    const suave = borrar(borrar(cru, w, h, 10), w, h, 8);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const lim = 0.5 + 0.07 * Math.sin((x0 + x) * 0.07 + (y0 + y) * 0.05); if (suave[y * w + x] > lim) px[(y0 + y) * PW + x0 + x] = 1; }
  }
  return { px, PW, PH };
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
  const { px, PW } = aguaEmPixels(W, H);
  const agua = new Uint8Array(W * H); const aguaBloqueio = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let n = 0; for (let yy = 0; yy < Q; yy++) { const base = (y * Q + yy) * PW + x * Q; for (let xx = 0; xx < Q; xx++) n += px[base + xx]; }
    const cob = n / (Q * Q); if (cob >= 0.5) agua[y * W + x] = 1; if (cob >= 0.12) aguaBloqueio[y * W + x] = 1;
  }
  const areia = limpar(mascaraPoligono(DESERTO, W, H), W, H);
  const dentro = mascaraPoligono(LIMITE, W, H);
  const floresta = new Uint8Array(W * H);
  for (let i = 0; i < floresta.length; i++) if (!dentro[i]) floresta[i] = 1;
  const bosque = mascaraPoligono(BOSQUE_SEPARADOR, W, H); for (let i = 0; i < bosque.length; i++) if (bosque[i]) floresta[i] = 1;
  for (let i = 0; i < floresta.length; i++) if (agua[i]) floresta[i] = 0;
  const plato = mascaraPoligono(PLATO, W, H);
  const escarpa = new Uint8Array(W * H);
  for (const tr of ESCARPA_TRECHOS) for (let x = tr.x0; x < Math.min(W, tr.x1); x++) {
    const topo = bordaEscarpa(x + 0.5);
    for (let y = 0; y < H; y++) if (y + 0.5 >= topo && y + 0.5 <= topo + ESCARPA_ALTURA) escarpa[y * W + x] = 1;
  }
  const muralha = new Uint8Array(W * H); retangulo(muralha, MURALHA, 1, W, H);
  return { W, H, agua, aguaBloqueio, aguaPx: px, areia, floresta, plato, escarpa, muralha };
}

// ---------- rota principal (etapa 2) ----------
// Entradas das fases (onde o aluno para na frente de cada construção) e as estradas que ligam uma à outra.
// 1-1 → 1-2 → 1-3 → ponte → 1-4 → 1-5 → 1-6 → 1-7 → Castelo → portão. Não há estrada da ponte para o castelo.
export const ENTRADAS = {
  m1f1: [10, 33], m1f2: [15, 14], m1f3: [34, 16], m1f4: [57, 34], m1f5: [76, 30], m1f6: [79, 18], m1f7: [67, 18], m1chefao: [54, 18],
};
export const ROTA = [
  { para: 'm1f2', pontos: [[10, 33], [7, 33], [6, 30], [6, 24], [7, 20], [10, 17], [15, 14]] },
  { para: 'm1f3', pontos: [[15, 14], [19, 15], [23, 16], [28, 16], [34, 16]] },
  { para: 'm1f4', pontos: [[34, 16], [36, 19], [38, 23], [40, 24], [48, 24], [51, 26], [52, 30], [52, 34], [57, 34]] },
  { para: 'm1f5', pontos: [[57, 34], [63, 34], [69, 33], [76, 30]] },
  { para: 'm1f6', pontos: [[76, 30], [81, 29], [83, 26], [83, 21], [81, 18], [79, 18]] },
  { para: 'm1f7', pontos: [[79, 18], [73, 18], [67, 18]] },
  { para: 'm1chefao', pontos: [[67, 18], [62, 18], [57, 18], [54, 18]] },
  // a estrada para no pé da escada (a escada é o caminho dali em diante); a saída para o Mundo 2 vem depois do portão
  { para: 'mundo2', pontos: [[54, 18], [54, 15], [54, 12], [54, 10], [54, 9]] },
];
// Três terrenos vazios para fases extras, com acesso por uma trilha curta
export const LOTES = [
  { id: 'l1', x: 25, y: 18, w: 7, h: 4, entrada: [28, 17] },
  { id: 'l2', x: 31, y: 42, w: 6, h: 4, entrada: [34, 40] },
  { id: 'l3', x: 61, y: 22, w: 6, h: 4, entrada: [64, 21] },
];
