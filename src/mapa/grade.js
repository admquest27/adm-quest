// Terreno do mapa (folhas do Ninja Adventure), grade de passagem e busca de caminho.
// Funções puras, testáveis sem navegador.

import { CHAO, AGUA, COLUNAS } from './arte.js';

// Peça de um bloco 3x3 com borda (canto, lado e miolo) conforme os vizinhos do mesmo tipo.
export function pecaBloco({ x, y }, colunas, cima, baixo, esq, dir) {
  const col = !esq ? 0 : !dir ? 2 : 1;
  const lin = !cima ? 0 : !baixo ? 2 : 1;
  return (y + lin) * colunas + x + col;
}

const semente = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export const semente2 = (x, y) => semente(x, y);

// Chão (folha de chão), água (folha de água, -1 onde não há) e grade de passagem.
export function montarTerreno(planta) {
  const { LARG: W, ALT: H } = planta;
  const idx = (x, y) => y * W + x;
  const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const floresta = new Uint8Array(W * H); const agua = new Uint8Array(W * H); const areia = new Uint8Array(W * H);
  for (const a of planta.FLORESTA) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) if (dentro(x, y)) floresta[idx(x, y)] = 1;
  for (let y = 0; y < H; y++) for (let x = planta.RIO.x; x < planta.RIO.x + planta.RIO.w; x++) { agua[idx(x, y)] = 1; floresta[idx(x, y)] = 0; }
  for (const l of planta.LAGOS ?? []) for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) if (dentro(x, y)) { agua[idx(x, y)] = 1; floresta[idx(x, y)] = 0; }
  const d = planta.DESERTO;
  if (d?.w) for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) areia[idx(x, y)] = 1;
  const igual = (m, foraConta) => (x, y) => (dentro(x, y) ? m[idx(x, y)] === 1 : foraConta);
  const chao = new Array(W * H); const molhado = new Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    chao[i] = CHAO.grama[Math.floor(semente(x, y) * CHAO.grama.length)];
    if (areia[i]) { const m = igual(areia, false); chao[i] = pecaBloco(CHAO.areia, COLUNAS.chao, m(x, y - 1), m(x, y + 1), m(x - 1, y), m(x + 1, y)); }
    if (agua[i]) { const m = igual(agua, true); molhado[i] = pecaBloco(AGUA.bloco, COLUNAS.agua, m(x, y - 1), m(x, y + 1), m(x - 1, y), m(x + 1, y)); }
  }
  const p = planta.PONTE;
  for (let x = p.x0; x <= p.x1; x++) molhado[idx(x, p.y)] = AGUA.ponte;

  const passa = new Uint8Array(W * H).fill(1);
  for (let i = 0; i < W * H; i++) if (floresta[i] || agua[i]) passa[i] = 0;
  for (let x = p.x0; x <= p.x1; x++) passa[idx(x, p.y)] = 1;
  const bloquear = (x, y, w = 1, h = 1) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (dentro(xx, yy)) passa[idx(xx, yy)] = 0; };
  for (const f of planta.FASES) bloquear(f.x, f.y, f.w, f.h);
  for (const e of planta.ENFEITES) if (e.bloqueia) bloquear(e.bx ?? e.x, e.by ?? e.y, e.bw ?? 1, e.bh ?? 1);
  for (const o of planta.OBJETOS) if (o.bloqueia) bloquear(o.x, o.y, o.w ?? 1, o.h ?? 1);
  for (const m of planta.MUROS ?? []) bloquear(m.x, m.y, m.w, m.h);
  return { W, H, chao, molhado, passa, agua, floresta };
}

// Busca de caminho (A*) em 4 direções. Devolve a lista de peças do início ao fim, sem o início; [] se não há.
export function caminho(passa, W, H, [x0, y0], [x1, y1], limite = 4000) {
  if (x1 < 0 || y1 < 0 || x1 >= W || y1 >= H || !passa[y1 * W + x1]) return [];
  if (x0 === x1 && y0 === y1) return [];
  const chave = (x, y) => y * W + x;
  const h = (x, y) => Math.abs(x - x1) + Math.abs(y - y1);
  const aberto = [{ x: x0, y: y0, g: 0, f: h(x0, y0) }];
  const veio = new Map(); const custo = new Map([[chave(x0, y0), 0]]);
  let passos = 0;
  while (aberto.length && passos++ < limite) {
    let mi = 0; for (let i = 1; i < aberto.length; i++) if (aberto[i].f < aberto[mi].f) mi = i;
    const at = aberto.splice(mi, 1)[0];
    if (at.x === x1 && at.y === y1) {
      const rota = []; let k = chave(x1, y1);
      while (k !== chave(x0, y0)) { rota.push([k % W, Math.floor(k / W)]); k = veio.get(k); }
      return rota.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = at.x + dx; const ny = at.y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !passa[chave(nx, ny)]) continue;
      const g = at.g + 1; const k = chave(nx, ny);
      if (g >= (custo.get(k) ?? Infinity)) continue;
      custo.set(k, g); veio.set(k, chave(at.x, at.y)); aberto.push({ x: nx, y: ny, g, f: g + h(nx, ny) });
    }
  }
  return [];
}

// Peça livre mais próxima (para quando o toque cai numa árvore, num prédio ou na água).
export function livreMaisPerto(passa, W, H, [x, y], raio = 4) {
  if (passa[y * W + x]) return [x, y];
  let melhor = null; let dist = Infinity;
  for (let yy = y - raio; yy <= y + raio; yy++) for (let xx = x - raio; xx <= x + raio; xx++) {
    if (xx < 0 || yy < 0 || xx >= W || yy >= H || !passa[yy * W + xx]) continue;
    const d = Math.abs(xx - x) + Math.abs(yy - y);
    if (d < dist) { dist = d; melhor = [xx, yy]; }
  }
  return melhor;
}

// Sequência clássica de botões (cima, cima, baixo, baixo, esquerda, direita, esquerda, direita, B, A).
export const SEQUENCIA = ['cima', 'cima', 'baixo', 'baixo', 'esq', 'dir', 'esq', 'dir', 'B', 'A'];
export function conferirSequencia(historico) {
  const ult = historico.slice(-SEQUENCIA.length);
  return ult.length === SEQUENCIA.length && ult.every((b, i) => b === SEQUENCIA[i]);
}
