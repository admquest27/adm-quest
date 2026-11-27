import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mundosLiberados, mundoAtual, fasesDoMundo, temMapa } from '../src/mundos.js';
import { atividadeGuilda, atividadeDaFase } from '../src/grupos.js';
import { calcularCarteira, itensDaLoja } from '../src/economia.js';

test('mundos: o primeiro vale sempre; os outros, quando liberados, em ordem', () => {
  assert.deepEqual(mundosLiberados(null), ['m1']);
  assert.deepEqual(mundosLiberados({ mundos: ['m3', 'm2', 'm2', 'xx'] }), ['m1', 'm2', 'm3']);
  assert.equal(mundoAtual({ mundos: ['m2'] }), 'm2');
  assert.equal(temMapa('m2'), false);
  assert.deepEqual(fasesDoMundo([{ id: 'b', mundo: 'm1', ordem: 2 }, { id: 'c', mundo: 'm2', ordem: 1 }, { id: 'a', mundo: 'm1', ordem: 1 }], 'm1').map((f) => f.id), ['a', 'b']);
});

test('mundos: cada um tem as suas guildas', () => {
  assert.equal(atividadeGuilda('m2'), 'guilda-m2');
  assert.equal(atividadeDaFase({ tipo: 'guilda' }, { id: 'm2f1', mundo: 'm2' }), 'guilda-m2');
});

test('mundos: o saldo soma o ano inteiro e "Vila completa" não se perde na virada', () => {
  const fases = [{ id: 'm1f1', mundo: 'm1', ordem: 1, codigo: '1-1' }, { id: 'm2f1', mundo: 'm2', ordem: 1, codigo: '2-1' }];
  const so1 = calcularCarteira({ fases, aval: { m1f1: { validada: true } } });
  assert.ok(so1.conquistas.includes('vila'));
  const dois = calcularCarteira({ fases, aval: { m1f1: { validada: true }, m2f1: { validada: true } } });
  assert.equal(dois.saldo - so1.saldo, dois.V.fase);
});

test('mundos: item de edição limitada sai da loja no mundo seguinte', () => {
  const eco = { loja: { a: { preco: 1, limitado: 'm1' }, b: { preco: 1 } } };
  assert.deepEqual(itensDaLoja(eco, 'm2').map((i) => i.id), ['b']);
});
