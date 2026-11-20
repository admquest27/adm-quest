import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consolidarAluno, regraCompetencia, textoRecuperacao, linhasParaColar, sugestaoRecuperacao, compDe } from '../src/fechamento.js';

const fases = [
  { id: 'f2', codigo: '1-2', ordem: 2, habilidades: ['EMT1ADM102'] },
  { id: 'f3', codigo: '1-3', ordem: 3, habilidades: ['EMT1ADM103'] },
  { id: 'f4', codigo: '1-4', ordem: 4, habilidades: ['EMT1ADM104'] },
  { id: 'f5', codigo: '1-5', ordem: 5, habilidades: ['EMT1ADM105', 'EMT1ADM102'], evidencias: { EMT1ADM102: 'O plano 5W2H da guilda' }, criterios: { EMT1ADM102: { A: 'Liga cada ação a um ponto da SWOT' } } },
  { id: 'f6', codigo: '1-6', ordem: 6, habilidades: ['EMT1ADM103'] },
  { id: 'f7', codigo: '1-7', ordem: 7, habilidades: ['EMT1ADM101'] },
];
const todasA = { f2: { mencoes: { EMT1ADM102: 'A' }, validada: true }, f3: { mencoes: { EMT1ADM103: 'A' }, validada: true }, f4: { mencoes: { EMT1ADM104: 'A' }, validada: true }, f5: { mencoes: { EMT1ADM105: 'A', EMT1ADM102: 'A' }, validada: true }, f6: { mencoes: { EMT1ADM103: 'A' }, validada: true }, f7: { mencoes: { EMT1ADM101: 'A' }, validada: true } };

test('regra da competência', () => {
  assert.equal(regraCompetencia(['A', 'A', 'A']), 'D');
  assert.equal(regraCompetencia(['A', 'PA', 'A']), 'ED');
  assert.equal(regraCompetencia(['NA', 'A', 'NA', 'A']), 'ND');
  assert.equal(regraCompetencia(['A', null]), null);
  assert.equal(compDe('EMT1ADM702'), 'EMT1ADM7');
});

test('a avaliação mais recente prevalece; o caderno (702) vem da menção direta', () => {
  const aval = { ...todasA, f2: { mencoes: { EMT1ADM102: 'NA' }, validada: true } };
  const c = consolidarAluno({ bim: 1, fases, aval, fech: { diretas: { EMT1ADM702: 'A' } } });
  assert.equal(c.habs.EMT1ADM102.final, 'A'); // 1-5 é mais recente que 1-2
  assert.equal(c.habs.EMT1ADM702.final, 'A');
  assert.equal(c.comps.EMT1ADM1.final, 'D');
  assert.equal(c.comps.EMT1ADM7.final, 'D');
  assert.equal(c.situacao, 'ok');
});

test('falta não rebaixa; sem evidência fica pendente; NA sugere recuperação com impacto', () => {
  const aval = { ...todasA, f6: { faltou: true }, f5: { mencoes: { EMT1ADM105: 'A', EMT1ADM102: 'NA' }, validada: false } };
  const c = consolidarAluno({ bim: 1, fases, aval, fech: {} });
  assert.equal(c.habs.EMT1ADM103.final, 'A'); // a falta na 1-6 não apaga o A da 1-3
  assert.equal(c.habs.EMT1ADM102.final, 'NA');
  assert.equal(c.habs.EMT1ADM102.semValidacao, true);
  assert.equal(c.habs.EMT1ADM702.semEvidencia, true);
  assert.equal(c.comps.EMT1ADM7.final, null);
  assert.equal(c.situacao, 'recuperacao');
  assert.deepEqual(c.impactos, [{ hab: 'EMT1ADM102', comp: 'EMT1ADM1', de: 'ED', para: 'D' }]);
});

test('recuperação e ajuste do professor', () => {
  const aval = { ...todasA, f5: { mencoes: { EMT1ADM105: 'A', EMT1ADM102: 'NA' } } };
  const fech = { diretas: { EMT1ADM702: 'PA' }, recup: { EMT1ADM102: { vai: true, proposta: 'Refez o plano a partir da SWOT.', resultado: 'A' } }, compAjustes: { EMT1ADM7: { mencao: 'D', motivo: 'Caderno completo depois da conferência' } } };
  const c = consolidarAluno({ bim: 1, fases, aval, fech });
  assert.equal(c.habs.EMT1ADM102.final, 'A');
  assert.equal(c.habs.EMT1ADM102.origem, 'recuperacao');
  assert.equal(c.comps.EMT1ADM1.final, 'D');
  assert.equal(c.comps.EMT1ADM7.regra, 'ED');
  assert.equal(c.comps.EMT1ADM7.final, 'D');
  assert.equal(textoRecuperacao(c.habs, fech), 'EMT1ADM102: Refez o plano a partir da SWOT. Resultado: A.');
  const linha = linhasParaColar(1, [{ aluno: { numeroChamada: 3, apelido: 'Ana' }, c, fech }]);
  assert.equal(linha.split('\t').length, 11);
  assert.ok(linha.startsWith('3\tAna\tA\tA\tA\tA\tA\tPA\tD\tD\t'));
});

test('quem entrou depois só conta o que veio a partir da entrada', () => {
  const aval = { ...todasA, f2: { mencoes: { EMT1ADM102: 'NA' } }, f5: {} };
  const c = consolidarAluno({ bim: 1, fases, aval, fech: {}, entrada: '2027-03-01', datas: { f2: { aberta: '2027-02-16' }, f5: { aberta: '2027-03-16' } } });
  assert.equal(c.habs.EMT1ADM102.final, null); // o NA de antes da entrada não conta
});

test('sugestão de recuperação a partir do critério', () => {
  assert.equal(sugestaoRecuperacao('EMT1ADM102', fases), 'Refazer o plano 5W2H da guilda, atendendo ao critério: liga cada ação a um ponto da SWOT, com orientação individual.');
});
