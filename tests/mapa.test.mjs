import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as planta from '../src/mapa/vila.js';
import { montarTerreno, caminho, livreMaisPerto, pecaBloco, conferirSequencia, SEQUENCIA } from '../src/mapa/grade.js';

const t = montarTerreno(planta);
const livre = (x, y) => t.passa[y * t.W + x] === 1;

test('borda dos blocos 3x3 do tileset', () => {
  assert.equal(pecaBloco({ x: 0, y: 6 }, 28, false, true, false, true), 6 * 28 + 0); // canto de cima à esquerda
  assert.equal(pecaBloco({ x: 0, y: 6 }, 28, true, true, true, true), 7 * 28 + 1); // miolo
  assert.equal(pecaBloco({ x: 0, y: 6 }, 28, true, true, true, false), 7 * 28 + 2); // margem direita
});

test('o início, as entradas das fases e a ponte são caminháveis; rio e floresta não', () => {
  assert.ok(livre(...planta.INICIO));
  for (const f of planta.FASES) assert.ok(livre(...f.entrada), `entrada de ${f.id}`);
  for (let x = planta.PONTE.x0; x <= planta.PONTE.x1; x++) assert.ok(livre(x, planta.PONTE.y));
  assert.ok(!livre(planta.RIO.x + 1, 5)); // rio
  assert.ok(!livre(10, 0)); // floresta
  for (const f of planta.FASES) assert.ok(!livre(f.x, f.y), `prédio de ${f.id} bloqueia`);
});

test('dá para chegar a todas as fases a partir do início (só pela ponte)', () => {
  for (const f of planta.FASES) {
    const rota = caminho(t.passa, t.W, t.H, planta.INICIO, f.entrada);
    assert.ok(rota.length > 0, `sem caminho até ${f.id}`);
  }
  const leste = caminho(t.passa, t.W, t.H, planta.INICIO, planta.FASES.find((f) => f.id === 'm1f4').entrada);
  assert.ok(leste.some(([x, y]) => y === planta.PONTE.y && x === planta.RIO.x + 1), 'atravessa pela ponte');
});

test('os terrenos vazios têm entrada livre, chegam a pé e não pisam em nada', () => {
  const ocupa = (l) => { for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) if (!livre(x, y)) return `${x},${y}`; return null; };
  for (const l of planta.LOTES) {
    assert.ok(livre(...l.entrada), `entrada do lote ${l.id}`);
    assert.equal(ocupa(l), null, `o lote ${l.id} está livre (sem árvore, casa ou água)`);
    assert.ok(caminho(t.passa, t.W, t.H, planta.INICIO, l.entrada).length > 0, `sem caminho até o lote ${l.id}`);
  }
});

test('o curral da fazenda é fechado por cerca, com uma abertura por onde se entra', () => {
  const c = planta.CURRAL;
  assert.ok(c.abertura.x >= c.x && c.abertura.x + 1 < c.x + c.w, 'abertura dentro da largura do curral');
  for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) assert.ok(livre(x, y), `dentro do curral ${x},${y}`);
});

test('toque num lugar bloqueado vai para a peça livre mais próxima', () => {
  const f = planta.FASES[0];
  const p = livreMaisPerto(t.passa, t.W, t.H, [f.x, f.y]);
  assert.ok(p && livre(...p));
});

test('sequência clássica de botões', () => {
  assert.equal(conferirSequencia(['A', ...SEQUENCIA]), true);
  assert.equal(conferirSequencia(SEQUENCIA.slice(1)), false);
});
