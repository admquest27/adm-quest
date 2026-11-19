import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortear, configDaFase, atividadeDaFase, grupoDe, convitesPara, ATV_GUILDA } from '../src/grupos.js';

test('sorteio: grupos do tamanho pedido, sem grupo de uma pessoa só', () => {
  const uids = Array.from({ length: 10 }, (_, i) => `a${i}`);
  const g4 = sortear(uids, 4);
  assert.equal(g4.length, 2);
  assert.deepEqual(g4.map((g) => g.length).sort(), [5, 5]);
  assert.deepEqual(g4.flat().sort(), [...uids].sort());
  const g2 = sortear(uids.slice(0, 5), 2);
  assert.deepEqual(g2.map((g) => g.length).sort(), [2, 3]);
  assert.deepEqual(sortear(['x'], 4), [['x']]);
  assert.deepEqual(sortear([], 4), []);
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
