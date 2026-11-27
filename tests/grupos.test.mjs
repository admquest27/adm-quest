import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distribuir, limites, configDaFase, atividadeDaFase, grupoDe, convitesPara, ATV_GUILDA } from '../src/grupos.js';

test('sorteio: respeita mínimo e máximo, equilibra e separa quem sobra', () => {
  const uids = Array.from({ length: 11 }, (_, i) => 'a' + i);
  const tamanhos = (r) => r.grupos.map((g) => g.length).sort();
  const r = distribuir(uids, 3, 4);
  assert.deepEqual(tamanhos(r), [3, 4, 4]);
  assert.equal(r.sobra.length, 0);
  assert.equal(new Set(r.grupos.flat()).size, 11);
  const exato = distribuir(uids, 4, 4);
  assert.deepEqual(tamanhos(exato), [4, 4]);
  assert.equal(exato.sobra.length, 3);
  assert.deepEqual(tamanhos(distribuir(uids.slice(0, 5), 2, 2)), [2, 2]);
  assert.deepEqual(distribuir(['x'], 2, 4), { grupos: [], sobra: ['x'] });
  assert.deepEqual(distribuir([], 2, 4), { grupos: [], sobra: [] });
});

test('limites: o grupo com exceção usa o próprio máximo; o pequeno aceito deixa de ser incompleto', () => {
  const cfg = { tamanho: 3, minimo: 3 };
  assert.equal(limites(cfg).max, 3);
  const quatro = limites(cfg, { limite: 4, membros: ['a', 'b', 'c', 'd'] });
  assert.deepEqual([quatro.max, quatro.excecao, quatro.incompleto], [4, true, false]);
  assert.equal(limites(cfg, { membros: ['a'] }).incompleto, true);
  assert.equal(limites(cfg, { membros: ['a'], aceito: true }).incompleto, false);
  assert.equal(limites({ tamanho: 2, minimo: 5 }).min, 2);
});

test('configuração da fase: padrão do conteúdo, ajuste da turma e "sem grupos"', () => {
  const f = { id: 'm1f7', grupo: { tipo: 'fase', tamanho: 2 } };
  assert.deepEqual(configDaFase({}, f), { tipo: 'fase', tamanho: 2, modo: 'alunos', aberta: false });
  assert.equal(configDaFase({ atividades: { m1f7: { modo: 'sorteio', aberta: true } } }, f).modo, 'sorteio');
  assert.equal(configDaFase({ atividades: { m1f7: { tipo: 'nenhum' } } }, f), null);
  assert.equal(configDaFase({}, { id: 'm1f3' }), null);
  assert.equal(atividadeDaFase({ tipo: 'guilda' }, f), ATV_GUILDA);
  assert.equal(atividadeDaFase({ tipo: 'fase' }, f), 'm1f7');
});

test('grupo e convites de um aluno numa atividade', () => {
  const grupos = [
    { id: 'g1', atividade: 'm1f7', membros: ['a'], convites: ['b'] },
    { id: 'g2', atividade: 'm1f7', membros: ['c'], convites: ['b'] },
    { id: 'g3', atividade: ATV_GUILDA, membros: ['b'], convites: [] },
  ];
  assert.equal(grupoDe(grupos, 'm1f7', 'a').id, 'g1');
  assert.equal(grupoDe(grupos, 'm1f7', 'b'), null);
  assert.equal(convitesPara(grupos, 'm1f7', 'b').length, 2);
  assert.equal(grupoDe(grupos, ATV_GUILDA, 'b').id, 'g3');
});
