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
  const [cx, cy] = geo.ENTRADAS.m1chefao; // frente do castelo
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

// ---------- etapa 2: estradas, entradas e terrenos vazios ----------
const ordem = ['m1f1', 'm1f2', 'm1f3', 'm1f4', 'm1f5', 'm1f6', 'm1f7', 'm1chefao'];

test('as oito entradas existem, são chão e a estrada principal segue a ordem das fases', () => {
  for (const id of ordem) { const [x, y] = geo.ENTRADAS[id]; assert.ok(t.passa[I(x, y)], `entrada de ${id}`); }
  assert.deepEqual(geo.ROTA.map((e) => e.para), ['m1f2', 'm1f3', 'm1f4', 'm1f5', 'm1f6', 'm1f7', 'm1chefao', 'mundo2']);
  geo.ROTA.slice(0, 7).forEach((e, k) => {
    assert.deepEqual(e.pontos[0], geo.ENTRADAS[ordem[k]], `o trecho ${e.para} começa na fase anterior`);
    assert.deepEqual(e.pontos.at(-1), geo.ENTRADAS[ordem[k + 1]], `o trecho ${e.para} termina na entrada dela`);
  });
});

test('a estrada só pisa em chão livre e só cruza a água pela ponte', () => {
  for (const e of planta.ESTRADAS.slice(0, 7)) {
    for (const [x, y] of e.pontos) {
      const cx = Math.floor(x + 0.5); const cy = Math.floor(y + 0.5);
      const naPonte = cy === geo.PONTE.y && cx >= geo.PONTE.x0 && cx <= geo.PONTE.x1;
      assert.ok(t.passa[I(cx, cy)] || naPonte, `${e.para}: ponto ${x.toFixed(1)},${y.toFixed(1)} em chão bloqueado`);
      if (t.agua[I(cx, cy)]) assert.ok(naPonte, `${e.para}: cruza água fora da ponte em ${cx},${cy}`);
    }
  }
});

test('dá para ir de fase em fase, na ordem, a pé (com o castelo de pé até a frente dele)', () => {
  const p = comCastelo(false);
  ordem.slice(0, -1).forEach((id, k) => {
    assert.equal(alcance(p, geo.ENTRADAS[id])[I(...geo.ENTRADAS[ordem[k + 1]])], 1, `de ${id} até ${ordem[k + 1]}`);
  });
});

test('depois do chefão a estrada leva à escada; o portão no fim continua fechado', () => {
  const aberto = alcance(comCastelo(true), geo.ENTRADAS.m1chefao);
  assert.equal(aberto[I(...geo.PORTAO.entrada)], 1, 'chega diante do portão');
  assert.equal(t.muralha[I(54, 4)], 1, 'a muralha fecha o portão');
  for (let x = geo.MURALHA.x; x < geo.MURALHA.x + geo.MURALHA.w; x++) assert.equal(aberto[I(x, 3)], 0, `nada além da muralha em ${x},3`);
});

test('os três terrenos vazios têm entrada livre, chão livre e chegam a pé', () => {
  assert.equal(geo.LOTES.length, 3);
  const p = comCastelo(false); const v = alcance(p, planta.INICIO);
  for (const l of geo.LOTES) {
    assert.ok(t.passa[I(...l.entrada)], `entrada do lote ${l.id}`);
    assert.equal(v[I(...l.entrada)], 1, `o lote ${l.id} chega a pé`);
    for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) assert.ok(t.passa[I(x, y)], `lote ${l.id} livre em ${x},${y}`);
  }
});

// ---------- etapa 3: construções, objetos e segredos nos lugares da planta ----------
import { readFileSync } from 'node:fs';
import { LPC_PECAS } from '../src/mapa/arte.js';

const atlas = JSON.parse(readFileSync(new URL('../public/mapa/lpc/atlas.json', import.meta.url), 'utf8'));
const quadros = Array.isArray(atlas.frames) ? Object.fromEntries(atlas.frames.map((f) => [f.filename, f])) : atlas.frames;
const retangulosBloqueados = () => {
  const r = [];
  for (const f of planta.FASES) { const b = f.bloqueio ?? f; r.push({ nome: f.id, x: b.x, y: b.y, w: b.w, h: b.h }); }
  for (const e of planta.ENFEITES) if (e.bloqueia) r.push({ nome: e.peca, x: e.bx, y: e.by, w: e.bw, h: e.bh });
  for (const o of planta.OBJETOS) if (o.bloqueia) r.push({ nome: o.id, x: o.x, y: o.y, w: o.w ?? 1, h: o.h ?? 1 });
  return r;
};

test('construções e objetos não se sobrepõem nem pisam na água, na mata ou na escarpa', () => {
  const rs = retangulosBloqueados();
  rs.forEach((a, i) => {
    const doTerreno = a.nome === 'ilha' || a.nome === 'portao' || a.nome === 'm1chefao'; // a ilhota fica na água, o portão faz parte da muralha e o castelo se encaixa na rocha, de propósito
    if (!doTerreno) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) {
      assert.ok(!t.agua[I(x, y)] && !t.floresta[I(x, y)] && !t.escarpa[I(x, y)] && !t.muralha[I(x, y)], `${a.nome} em ${x},${y} pisa em água, mata ou pedra`);
    }
    for (const b of rs.slice(i + 1)) {
      const sobre = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!sobre, `${a.nome} sobrepõe ${b.nome}`);
    }
  });
});

test('a estrada principal continua livre com as construções no lugar', () => {
  for (const e of planta.ESTRADAS.slice(0, 7)) for (const [x, y] of e.pontos) {
    const cx = Math.floor(x + 0.5); const cy = Math.floor(y + 0.5);
    const naPonte = cy === geo.PONTE.y && cx >= geo.PONTE.x0 && cx <= geo.PONTE.x1;
    assert.ok(t.passa[I(cx, cy)] || naPonte, `${e.para}: ${cx},${cy} bloqueado por construção`);
  }
});

test('cada fase e cada casa tem a porta alcançável a pé', () => {
  const v = alcance(comCastelo(false), planta.INICIO);
  for (const f of planta.FASES) assert.equal(v[I(...f.entrada)], 1, `entrada de ${f.id}`);
  for (const e of planta.ENFEITES) {
    const lpc = LPC_PECAS[e.peca]; if (!lpc || e.peca.startsWith('arvore')) continue;
    const q = quadros[lpc.quadro]; if (!q) continue;
    const larg = (q.frame?.w ?? q.sourceSize.w) * 0.5; const esq = (e.x + e.w / 2) * 16 - larg / 2;
    const alvo = [Math.floor((esq + lpc.porta[0] * 0.5) / 16), e.y + e.h];
    assert.equal(v[I(...alvo)], 1, `porta de ${e.peca} (${e.x},${e.y}) em ${alvo}`);
  }
});

test('os objetos com segredo ou conversa têm uma peça livre alcançável ao lado', () => {
  const fechado = alcance(comCastelo(false), planta.INICIO); const aberto = alcance(comCastelo(true), planta.INICIO);
  for (const o of planta.OBJETOS) {
    if (!o.segredo && !o.conversa && o.id !== 'casinha') continue;
    const v = o.id === 'portao' ? aberto : fechado; // o portão só se alcança depois do chefão
    const w = o.w ?? 1; const h = o.h ?? 1; const r = Math.ceil(o.alcance ?? 1.2); let achou = false;
    for (let y = o.y - r; y <= o.y + h + r && !achou; y++) for (let x = o.x - r; x <= o.x + w + r; x++) if (x >= 0 && y >= 0 && x < W && y < H && v[I(x, y)]) { achou = true; break; }
    assert.ok(achou, `ninguém chega perto de ${o.id}`);
  }
});

test('os 12 segredos estão no mapa, e personagens e bichos nascem em chão livre', () => {
  const ids = new Set(planta.OBJETOS.map((o) => o.segredo).filter(Boolean));
  for (const s of ['pombo', 'galinhas', 'konami', 'vaca']) ids.add(s); // pombo e galinhas passeiam; konami é a sequência de botões; a vaca mora no curral
  assert.deepEqual([...ids].sort(), [...planta.SEGREDOS].sort());
  const v = alcance(comCastelo(false), planta.INICIO);
  for (const [nome, [x, y]] of [['rosalina', planta.PERSONAGENS.rosalina.casa], ['consultor', planta.PERSONAGENS.consultor.pos], ['barao', planta.PERSONAGENS.barao.pos], ['sapo', planta.SAPO]]) assert.equal(v[I(x, y)], 1, `${nome} em ${x},${y}`);
  const c = planta.CURRAL;
  for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) assert.ok(t.passa[I(x, y)], `dentro do curral ${x},${y}`);
  assert.equal(v[I(c.abertura.x, c.y - 1)], 1, 'a abertura do curral chega a pé');
});

test('as fases ficam na frente da estrada: a entrada é a peça logo abaixo da construção', () => {
  for (const f of planta.FASES) assert.equal(f.entrada[1], f.y + f.h, `${f.id}: entrada colada na base`);
});
