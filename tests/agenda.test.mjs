// Testes da lógica do calendário, com as datas oficiais de 2027 (não precisam do emulador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDias, segundaDa, diaSemana, bloqueadosDe, limiteDoBimestre, gerarAgenda, diferencas, bimestreDe, formatar, montarDias } from '../src/agenda.js';

const cal = {
  bimestres: [
    { id: 1, inicio: '2027-01-26', fim: '2027-04-16', fechamento: '2027-04-16' },
    { id: 2, inicio: '2027-04-19', fim: '2027-06-30', fechamento: '2027-06-18' },
  ],
  semAula: [
    { inicio: '2027-01-01', fim: '2027-01-25', motivo: 'Recesso' },
    { inicio: '2027-02-08', fim: '2027-02-10', motivo: 'Carnaval' },
    { inicio: '2027-03-26', motivo: 'Paixão de Cristo' },
  ],
  eventos: { integracao: { data: '2027-01-26', titulo: 'Integração', bloqueia: 'dia' } },
};

const fases = [
  { id: 'f1' }, { id: 'f2' }, { id: 'f3' }, { id: 'f4' }, { id: 'f5' }, { id: 'f6' },
  { id: 'f7', folgaAntes: 1 }, { id: 'castelo', tipo: 'chefao' },
];

test('datas: dias da semana e segunda-feira da semana', () => {
  assert.equal(diaSemana('2027-02-02'), 2); // terça
  assert.equal(segundaDa('2027-02-02'), '2027-02-01');
  assert.equal(segundaDa('2027-04-16'), '2027-04-12');
  assert.equal(addDias('2027-02-28', 1), '2027-03-01');
  assert.equal(formatar('2027-02-02'), 'ter 02/02');
});

test('limite do bimestre: o dia antes da semana da reunião de fechamento', () => {
  assert.equal(limiteDoBimestre(cal.bimestres[0]), '2027-04-11');
  assert.equal(limiteDoBimestre(cal.bimestres[1]), '2027-06-13'); // fechamento 18/06: semana de 14/06
});

test('o plano do Mundo 1 reproduz as datas do conteúdo (carnaval, coringa e castelo)', () => {
  const bloq = bloqueadosDe(cal, '1A');
  const { itens, limite } = gerarAgenda({ fases, bimestre: cal.bimestres[0], bloqueados: bloq });
  const din = Object.fromEntries(itens.map((i) => [i.faseId, i.din]));
  const cons = Object.fromEntries(itens.map((i) => [i.faseId, i.cons]));
  assert.deepEqual(din, {
    f1: '2027-02-02', f2: '2027-02-16', f3: '2027-02-23', f4: '2027-03-02', f5: '2027-03-09', f6: '2027-03-16',
    f7: '2027-03-30', castelo: '2027-04-06',
  });
  assert.equal(cons.f1, '2027-02-15'); // a segunda 08/02 é carnaval
  assert.equal(cons.f2, '2027-02-22');
  assert.equal(cons.f6, '2027-03-22');
  assert.equal(cons.f7, '2027-04-05');
  assert.equal(cons.castelo, null);
  assert.equal(limite, '2027-04-11');
  assert.ok(itens.every((i) => !i.estouro && !i.consEstouro));
});

test('um evento que bloqueia um dia empurra a fase e as seguintes', () => {
  const eventos = { ...cal.eventos, senac: { data: '2027-02-23', titulo: 'Evento do Senac', bloqueia: 'dia' } };
  const bloq = bloqueadosDe({ ...cal, eventos }, '1A');
  const { itens } = gerarAgenda({ fases, bimestre: cal.bimestres[0], bloqueados: bloq });
  const din = Object.fromEntries(itens.map((i) => [i.faseId, i.din]));
  assert.equal(din.f2, '2027-02-16');
  assert.equal(din.f3, '2027-03-02'); // empurrada
  assert.equal(din.f6, '2027-03-23');
});

test('o evento pode valer só para uma turma', () => {
  const eventos = { x: { data: '2027-02-16', titulo: 'Só da 1B', bloqueia: 'dia', turmas: ['1B'] } };
  assert.equal(bloqueadosDe({ ...cal, eventos }, '1A').has('2027-02-16'), false);
  assert.equal(bloqueadosDe({ ...cal, eventos }, '1B').has('2027-02-16'), true);
});

test('fixar a data de uma fase: as outras se ajustam em volta', () => {
  const bloq = bloqueadosDe(cal, '1A');
  const { itens } = gerarAgenda({ fases, bimestre: cal.bimestres[0], bloqueados: bloq, fixas: { f3: { din: '2027-03-02' } } });
  const din = Object.fromEntries(itens.map((i) => [i.faseId, i.din]));
  assert.equal(din.f2, '2027-02-16');
  assert.equal(din.f3, '2027-03-02');
  assert.equal(din.f4, '2027-03-09');
  assert.equal(itens.find((i) => i.faseId === 'f3').fixaDin, true);
});

test('quando não cabe, a fase é marcada como estouro (depois do limite)', () => {
  const bloq = bloqueadosDe(cal, '1A');
  const muitas = [...fases, { id: 'extra1' }, { id: 'extra2' }];
  const { itens } = gerarAgenda({ fases: muitas, bimestre: cal.bimestres[0], bloqueados: bloq });
  const extra = itens.find((i) => i.faseId === 'extra1');
  assert.equal(extra.estouro, true);
  assert.ok(extra.din > '2027-04-11');
});

test('dias de dinâmica livres até o limite viram sobra', () => {
  const bloq = bloqueadosDe(cal, '1A');
  const { livres } = gerarAgenda({ fases: fases.slice(0, 3), bimestre: cal.bimestres[0], bloqueados: bloq });
  assert.ok(livres.includes('2027-03-02'));
  assert.ok(!livres.includes('2027-02-09')); // carnaval
  assert.ok(!livres.includes('2027-02-02')); // usado pela fase 1
});

test('diferenças entre o plano confirmado e o sugerido', () => {
  const bloq = bloqueadosDe(cal, '1A');
  const base = gerarAgenda({ fases, bimestre: cal.bimestres[0], bloqueados: bloq }).itens;
  const confirmado = Object.fromEntries(base.map((i) => [i.faseId, { din: i.din, cons: i.cons }]));
  assert.deepEqual(diferencas(confirmado, base), []);
  const eventos = { ...cal.eventos, senac: { data: '2027-02-23', titulo: 'x', bloqueia: 'dia' } };
  const novo = gerarAgenda({ fases, bimestre: cal.bimestres[0], bloqueados: bloqueadosDe({ ...cal, eventos }, '1A') }).itens;
  const dif = diferencas(confirmado, novo);
  assert.ok(dif.length >= 5);
  assert.equal(dif[0].faseId, 'f3');
});

test('bimestre de uma data, inclusive nas férias', () => {
  assert.equal(bimestreDe(cal, '2027-03-10').id, 1);
  assert.equal(bimestreDe(cal, '2027-04-17').id, 2); // entre bimestres: o próximo
  assert.equal(bimestreDe(cal, '2026-11-18').id, 1); // antes do ano: o primeiro
});

test('montarDias: consolidação com Excel, preparação, coringa, recuperação e dias sem aula', () => {
  const bloq = bloqueadosDe(cal, '1A');
  const fasesX = [...fases, { id: 'x1', tipo: 'excel', anexaA: 'f1' }];
  const ag = gerarAgenda({ fases, bimestre: cal.bimestres[0], bloqueados: bloq });
  const dias = montarDias({ ag, fases: fasesX, bimestre: cal.bimestres[0], bloqueados: bloq, eventos: cal.eventos });
  const tipos = (d) => (dias.get(d)?.itens ?? []).map((i) => `${i.tipo}:${i.faseId ?? i.parte}`);
  assert.deepEqual(tipos('2027-02-15'), ['cons:f1', 'excel:x1']);
  assert.deepEqual(tipos('2027-02-01'), ['antes:f1']);
  assert.deepEqual(tipos('2027-03-29'), ['antes:f7']);
  assert.deepEqual(tipos('2027-03-23'), ['folga:f7']);
  assert.deepEqual(tipos('2027-04-12'), ['recup:seg']);
  assert.deepEqual(tipos('2027-04-13'), ['recup:ter']);
  assert.equal(dias.get('2027-02-09').semAula, 'Carnaval');
  assert.equal(dias.get('2027-01-26').eventos[0].titulo, 'Integração');
});

test('lembretes oficiais que não bloqueiam não aparecem nos dias', () => {
  const bloq = bloqueadosDe(cal, '1A');
  const ag = gerarAgenda({ fases, bimestre: cal.bimestres[0], bloqueados: bloq });
  const eventos = { ...cal.eventos, reuniao: { data: '2027-02-16', titulo: 'Reunião', tipo: 'oficial', bloqueia: 'nao' }, meu: { data: '2027-02-16', titulo: 'Meu evento', tipo: 'senac', bloqueia: 'nao' } };
  const dias = montarDias({ ag, fases, bimestre: cal.bimestres[0], bloqueados: bloq, eventos });
  assert.deepEqual(dias.get('2027-02-16').eventos.map((e) => e.titulo), ['Meu evento']);
});