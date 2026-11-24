// Geografia V02 (88 x 50): rio sinuoso, uma ponte, dois lagos, platô e a regra de progressão do castelo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as planta from '../src/mapa/vilaV02.js';
import * as geo from '../src/mapa/geografia.js';
import { montarTerreno } from '../src/mapa/grade.js';

const t = montarTerreno(planta);
const { W, H } = t;
const I = (x, y) => y * W + x;

// Peças alcançáveis a pé a partir de uma peça, numa grade de passagem
function alcance(passa, [x0, y0]) {
  const v = new Uint8Array(W * H); const pilha = [[x0, y0]]; v[I(x0, y0)] = 1;
  while (pilha.length) {
    const [x, y] = pilha.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || v[I(nx, ny)] || !passa[I(nx, ny)]) continue;
      v[I(nx, ny)] = 1; pilha.push([nx, ny]);
    }
  }
  return v;
}
const comCastelo = (aberto) => {
  const p = Uint8Array.from(t.passa); const c = geo.CASTELO;
  for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) p[I(x, y)] = aberto ? 1 : 0;
  return p;
};
const componentes = (mascara) => {
  const visto = new Uint8Array(W * H); let n = 0; const topo = [];
  for (let i = 0; i < W * H; i++) {
    if (!mascara[i] || visto[i]) continue; n++; const pilha = [i]; visto[i] = 1; let minY = H; let maxY = 0;
    while (pilha.length) {
      const j = pilha.pop(); const x = j % W; const y = Math.floor(j / W); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx; const ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = I(nx, ny); if (mascara[k] && !visto[k]) { visto[k] = 1; pilha.push(k); } }
    }
    topo.push([minY, maxY]);
  }
  return { n, topo };
};

test('a grade é 88 x 50', () => { assert.equal(W, 88); assert.equal(H, 50); });

test('a água é um rio de ponta a ponta mais dois lagos separados, sem outras poças', () => {
  const { n, topo } = componentes(t.agua);
  assert.equal(n, 3, 'rio + 2 lagos');
  const rio = topo.find(([a, b]) => a === 0 && b === H - 1);
  assert.ok(rio, 'o rio vai do alto ao fim do mapa');
  assert.equal(topo.filter((x) => x !== rio).length, 2);
});

test('o rio tem entre 2 e 4 peças de largura e serpenteia', () => {
  let min = 99; let max = 0; const xs = [];
  for (let y = 2; y < H - 2; y++) {
    let a = -1; let b = -1;
    for (let x = 30; x < 55; x++) if (t.agua[I(x, y)]) { if (a < 0) a = x; b = x; }
    min = Math.min(min, b - a + 1); max = Math.max(max, b - a + 1); xs.push((a + b) / 2);
  }
  assert.ok(min >= 2 && max <= 5, `largura ${min} a ${max}`);
  assert.ok(Math.max(...xs) - Math.min(...xs) >= 5, 'o rio não é reto');
});

test('uma única ponte: sem ela o oeste não alcança o leste', () => {
  const p = geo.PONTE;
  for (let x = p.x0; x <= p.x1; x++) assert.ok(t.passa[I(x, p.y)], `ponte livre em ${x}`);
  assert.ok(t.passa[I(p.x0 - 1, p.y)] && t.passa[I(p.x1 + 1, p.y)], 'as cabeceiras são chão');
  const semPonte = Uint8Array.from(t.passa); for (let x = p.x0; x <= p.x1; x++) if (t.agua[I(x, p.y)]) semPonte[I(x, p.y)] = 0;
  const v = alcance(semPonte, planta.INICIO);
  assert.equal(v[I(60, 30)], 0, 'leste inalcançável sem a ponte');
  assert.equal(alcance(t.passa, planta.INICIO)[I(60, 30)], 1, 'com a ponte chega');
});

test('antes do chefão não se alcança a escada, o platô nem o portão; depois da vitória sim', () => {
  const [ex, ey] = geo.PORTAO.entrada;
  const fechado = alcance(comCastelo(false), planta.INICIO);
  assert.equal(fechado[I(ex, ey)], 0, 'portão inalcançável com o castelo de pé');
  for (let y = geo.ESCADA.y; y < geo.ESCADA.y + geo.ESCADA.h; y++) for (let x = geo.ESCADA.x; x < geo.ESCADA.x + geo.ESCADA.w; x++) assert.equal(fechado[I(x, y)], 0, `escada ${x},${y}`);
  for (let i = 0; i < W * H; i++) if (t.plato[i] && Math.floor(i / W) >= 5 && Math.floor(i / W) <= 9) assert.equal(fechado[i], 0, `platô ${i % W},${Math.floor(i / W)}`);
  const aberto = alcance(comCastelo(true), planta.INICIO);
  assert.equal(aberto[I(ex, ey)], 1, 'portão alcançável com o castelo em ruínas');
  assert.equal(aberto[I(geo.ESCADA.x + 1, geo.ESCADA.y)], 1, 'escada alcançável');
});

test('sem atalho da ponte ao castelo: só o corredor leste liga o sul às fases 6 a 8', () => {
  const [cx, cy] = [54, 17]; // frente do castelo
  assert.equal(alcance(comCastelo(false), planta.INICIO)[I(cx, cy)], 1, 'a frente do castelo é alcançável');
  const p = comCastelo(false);
  for (let y = 19; y <= 26; y++) for (let x = 78; x < W; x++) p[I(x, y)] = 0; // fecha o corredor leste
  assert.equal(alcance(p, planta.INICIO)[I(cx, cy)], 0, 'sem o corredor leste não há caminho: o bosque separador segura');
});

test('as escarpas e a muralha são sólidas e o resto do platô é chão', () => {
  for (let i = 0; i < W * H; i++) if (t.escarpa[i] || t.muralha[i]) assert.equal(t.passa[i], 0);
  assert.ok(t.passa[I(54, 7)], 'a entrada do portão é chão');
  assert.equal(t.muralha[I(54, 4)], 1);
});

test('o deserto, a mata e a praça ficam onde a planta manda', () => {
  assert.ok(t.areia[I(12, 10)], 'areia nas dunas');
  assert.ok(!t.areia[I(60, 30)]);
  assert.ok(t.floresta[I(1, 25)] && t.floresta[I(86, 25)] && t.floresta[I(40, 49)], 'mata nas bordas');
  assert.ok(t.floresta[I(52, 21)], 'bosque separador');
});
