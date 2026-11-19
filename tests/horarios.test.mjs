import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempoUtil, encaixar, lerHorario, escreverHorario, horarioDoDia, hhmm } from '../src/horarios.js';

// Horários fictícios (o horário real das turmas fica só no banco).
const LONGA = lerHorario('08:00-09:40');
const COM_INTERVALO = lerHorario('09:40-10:27, 10:55-11:30');
const DIVIDIDA = lerHorario('09:40-10:27\n12:25-13:12 atenção até 12:55');
const DEPOIS_DO_INTERVALO = lerHorario('10:55-12:25');

test('tempo útil já desconta chamada e encerramento', () => {
  assert.deepEqual(tempoUtil(LONGA), [85]);
  assert.deepEqual(tempoUtil(COM_INTERVALO), [67]);
  assert.deepEqual(tempoUtil(DIVIDIDA), [32, 32]);
  assert.deepEqual(tempoUtil(DEPOIS_DO_INTERVALO), [75]);
});

test('bloco que passa do intervalo continua na volta', () => {
  const r = encaixar([{ min: 30, titulo: 'A' }, { min: 30, titulo: 'B' }], COM_INTERVALO);
  const b = r.pecas.filter((p) => p.bi === 1);
  assert.equal(b.length, 2);
  assert.equal(hhmm(b[0].ini), '10:20');
  assert.equal(hhmm(b[0].fim), '10:27');
  assert.equal(hhmm(b[1].ini), '10:55');
  assert.equal(hhmm(b[1].fim), '11:18');
  assert.equal(r.falta, 0);
});

test('quebra leva o bloco para o encontro seguinte e "pode cortar" sai primeiro', () => {
  const blocos = [
    { min: 10, titulo: 'Abertura' }, { min: 22, titulo: 'Parte 1' }, { min: 20, titulo: 'Parte 2', quebra: true },
    { min: 10, titulo: 'Diário' }, { min: 13, titulo: 'Conversa', corta: true },
  ];
  const a = encaixar(blocos, DIVIDIDA);
  assert.deepEqual(a.cortados.map((b) => b.titulo), ['Conversa']);
  assert.equal(a.falta, 0);
  const p2 = a.pecas.find((p) => a.blocos[p.bi].titulo === 'Parte 2');
  assert.equal(hhmm(p2.ini), '12:35');
  const diario = a.pecas.find((p) => a.blocos[p.bi].titulo === 'Diário');
  assert.equal(diario.cansado, true);
  const b = encaixar(blocos, DEPOIS_DO_INTERVALO);
  assert.equal(b.cortados.length, 0);
  assert.equal(b.falta, 0);
});

test('a linha da atenção não parte o bloco em dois', () => {
  const r = encaixar([{ min: 10, titulo: 'A' }, { min: 22, titulo: 'B' }, { min: 25, titulo: 'C', quebra: true }], DIVIDIDA);
  assert.equal(r.pecas.filter((p) => p.bi === 2).length, 1);
});

test('o que não cabe aparece como falta', () => {
  const r = encaixar([{ min: 80, titulo: 'Longo' }], COM_INTERVALO);
  assert.equal(r.falta, 13);
});

test('lê o horário escrito pelo professor', () => {
  const h = lerHorario('9h40-10:27, 10:55-11:30\n12:25 - 13:12 atenção até 12h55\nlixo');
  assert.deepEqual(h, [
    { trechos: [{ ini: '09:40', fim: '10:27' }, { ini: '10:55', fim: '11:30' }] },
    { trechos: [{ ini: '12:25', fim: '13:12' }], foco: '12:55' },
  ]);
  assert.equal(escreverHorario(h), '09:40-10:27, 10:55-11:30\n12:25-13:12 atenção até 12:55');
  assert.equal(horarioDoDia({ minutosDia: 90 }, 1).relativo, true);
  assert.equal(horarioDoDia({ horarios: { 1: h } }, 1).relativo, false);
});
