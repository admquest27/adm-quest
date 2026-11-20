import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { consolidarAluno, sugerirAtitude, rascunhoFeedback, feedbackDoAluno, paragrafoFinal } from '../src/fechamento.js';
import { gerarXlsx, gerarDocx } from '../src/arquivos.js';
import { planilhaCoordenacao, pctdFtp, verboDe } from '../src/documentos.js';

const fases = [
  { id: 'f2', codigo: '1-2', ordem: 2, habilidades: ['EMT1ADM102'] },
  { id: 'f3', codigo: '1-3', ordem: 3, habilidades: ['EMT1ADM103'] },
  { id: 'f4', codigo: '1-4', ordem: 4, habilidades: ['EMT1ADM104'] },
  { id: 'f5', codigo: '1-5', ordem: 5, habilidades: ['EMT1ADM105', 'EMT1ADM102'], evidencias: { EMT1ADM102: 'O plano 5W2H da guilda' }, criterios: { EMT1ADM102: { A: 'Liga cada ação a um ponto da SWOT' } } },
  { id: 'f6', codigo: '1-6', ordem: 6, habilidades: ['EMT1ADM103'] },
  { id: 'f7', codigo: '1-7', ordem: 7, habilidades: ['EMT1ADM101'] },
];
const todasA = { f2: { mencoes: { EMT1ADM102: 'A' }, validada: true }, f3: { mencoes: { EMT1ADM103: 'A' }, validada: true }, f4: { mencoes: { EMT1ADM104: 'A' }, validada: true }, f5: { mencoes: { EMT1ADM105: 'A', EMT1ADM102: 'A' }, validada: true }, f6: { mencoes: { EMT1ADM103: 'A' }, validada: true }, f7: { mencoes: { EMT1ADM101: 'A' }, validada: true } };
const pos = (t) => ({ tipoAtitude: 'positivo', texto: t });
const aten = (t) => ({ tipoAtitude: 'atencao', texto: t });

test('Atitudes e Valores entra na regra da competência', () => {
  assert.equal(sugerirAtitude([]).mencao, 'A');
  assert.equal(sugerirAtitude([pos('a'), pos('b'), aten('c')]).mencao, 'A');
  assert.equal(sugerirAtitude([pos('a'), aten('c')]).mencao, 'PA');
  assert.equal(sugerirAtitude([aten('c'), aten('c'), aten('d')]).mencao, 'NA');
  assert.equal(sugerirAtitude([aten('c'), aten('c'), aten('d')]).desenvolver, 'c');
  // habilidades em A e atitudes em PA: ED
  const c = consolidarAluno({ bim: 1, fases, aval: todasA, fech: { diretas: { EMT1ADM702: 'A' } }, registros: [pos('a'), aten('c')] });
  assert.equal(c.atitude.mencao, 'PA');
  assert.equal(c.atitude.confirmada, false);
  assert.equal(c.comps.EMT1ADM1.final, 'ED');
  // o professor confirma A: volta a D
  const c2 = consolidarAluno({ bim: 1, fases, aval: todasA, fech: { diretas: { EMT1ADM702: 'A' }, atitude: { mencao: 'A' } }, registros: [pos('a'), aten('c')] });
  assert.equal(c2.comps.EMT1ADM1.final, 'D');
  assert.equal(c2.comps.EMT1ADM7.final, 'D');
  // 702 em NA e atitudes em A: metade em NA, ND
  const c3 = consolidarAluno({ bim: 1, fases, aval: todasA, fech: { diretas: { EMT1ADM702: 'NA' } } });
  assert.equal(c3.comps.EMT1ADM7.final, 'ND');
});

test('rascunho de feedback com as frases da coordenação', () => {
  const aval = { ...todasA, f5: { mencoes: { EMT1ADM105: 'A', EMT1ADM102: 'NA' } } };
  const fech = { diretas: { EMT1ADM702: 'A' }, recup: { EMT1ADM102: { vai: true, proposta: 'Refazer o 5W2H.', resultado: 'A' } } };
  const c = consolidarAluno({ bim: 1, fases, aval, fech });
  const r = rascunhoFeedback(c, fech, { fases });
  assert.ok(r.hab.startsWith('Realizou as atividades avaliativas e atingiu parcialmente os objetivos propostos.'));
  assert.match(r.hab, /Precisa avançar em propor e monitorar planos de ação/);
  assert.equal(r.recup, 'Atividade proposta: refazer o 5W2H. Realizou a recuperação proposta e atingiu os objetivos que antes não tinham sido alcançados.');
  assert.ok(r.part.startsWith('Participa adequadamente'));
  assert.equal(r.proposta, '');
  // o que o professor salvou prevalece, e o parágrafo final junta os campos preenchidos
  const fb = feedbackDoAluno(c, { ...fech, feedback: { obs: 'Ótima evolução.', revisado: true } }, { fases });
  assert.equal(fb.campos.obs, 'Ótima evolução.');
  assert.equal(fb.revisado, true);
  assert.ok(paragrafoFinal(fb.campos).endsWith('Ótima evolução.'));
  // competência em ND gera a proposta para o próximo bimestre
  const c4 = consolidarAluno({ bim: 1, fases, aval: todasA, fech: { diretas: { EMT1ADM702: 'NA' } } });
  assert.match(rascunhoFeedback(c4, { diretas: { EMT1ADM702: 'NA' } }, { fases }).proposta, /^Para evidenciar a evolução na competência 7/);
});

test('planilha .xlsx no formato da coordenação', () => {
  const c = consolidarAluno({ bim: 1, fases, aval: todasA, fech: { diretas: { EMT1ADM702: 'A' } } });
  const campos = rascunhoFeedback(c, {}, { fases });
  const abas = planilhaCoordenacao({ bim: 1, turmaNome: 'Teste', linhas: [{ aluno: { numeroChamada: 1, apelido: 'Ana & Cia <3>' }, c, campos }] });
  const xlsx = unzipSync(gerarXlsx(abas));
  const folha = strFromU8(xlsx['xl/worksheets/sheet1.xml']);
  assert.ok(xlsx['xl/workbook.xml'] && xlsx['xl/styles.xml'] && xlsx['[Content_Types].xml']);
  assert.match(folha, /Ana &amp; Cia &lt;3&gt;/);
  assert.match(folha, /<c r="C3" s="9" t="inlineStr"><is><t xml:space="preserve">Habilidade 101</);
  assert.match(folha, /<c r="C4" s="3" t="inlineStr"><is><t xml:space="preserve">A</);
  assert.match(folha, /Menção Final Competência 7/);
  assert.match(folha, /<mergeCell ref="C2:H2"\/>/);
});

test('PCTD .docx com uma linha por semana', () => {
  assert.equal(verboDe('EMT1ADM102'), 'Propor e monitorar');
  assert.equal(verboDe('EMT1ADM101'), 'Analisar');
  const dias = new Map([
    ['2027-02-01', { data: '2027-02-01', itens: [{ tipo: 'antes', faseId: 'f2' }], semAula: null }],
    ['2027-02-02', { data: '2027-02-02', itens: [{ tipo: 'din', faseId: 'f2' }], semAula: null }],
    ['2027-02-08', { data: '2027-02-08', itens: [], semAula: 'Carnaval' }],
    ['2027-02-15', { data: '2027-02-15', itens: [{ tipo: 'cons', faseId: 'f2' }], semAula: null }],
    ['2027-02-22', { data: '2027-02-22', itens: [{ tipo: 'recup', parte: 'seg' }], semAula: null }],
  ]);
  const fasesP = fases.map((f) => ({ ...f, nome: `Fase ${f.codigo}`, atitude: 'colaborativa', avaliacao: 'Evidência: o registro no caderno.' }));
  const p = { b: { nome: '1º bimestre', inicio: '2027-01-26', fim: '2027-02-26', fechamento: '2027-02-26', encerramento: ['2027-02-22', '2027-02-26'] }, todas: fasesP, ag: { itens: [{ faseId: 'f2', din: '2027-02-02', cons: '2027-02-15' }] }, dias };
  const roteiro = (f, tipo) => (tipo === 'din' ? [{ titulo: 'Ordem individual' }, { titulo: 'Conversa' }] : [{ titulo: 'Conceito formal', detalhe: 'Objetivo e recursos escassos.' }]);
  const marcas = [{ id: 'colaborativa', nome: 'Atitude colaborativa', positivas: ['Ouviu as ideias do grupo', 'Dividiu as tarefas'] }];
  const blocos = pctdFtp({ bim: 1, turmaNome: 'Teste', ano: 2027, p, roteiro, marcas, cfg: { professores: 'Prof. Teste' }, mundo: { nome: 'Vila', pergunta: 'O que é administrar?' } });
  const semanas = blocos.filter((b) => b.tipo === 'tabela').at(-1).linhas;
  assert.equal(semanas.length, 1 + 5); // cabeçalho e cinco semanas (26/01 a 26/02)
  assert.match(semanas[2][4], /Terça 02\/02 \(na sala\), dinâmica da fase 1-2: Ordem individual; Conversa/);
  assert.match(semanas[3][4], /Segunda 08\/02: sem aula, Carnaval\./);
  assert.match(semanas[4][3], /Conceito da fase 1-2: Objetivo e recursos escassos/);
  assert.match(semanas[2][2], /102: Propor e monitorar/);
  assert.match(semanas[2][6], /Atitude colaborativa/);
  const docx = unzipSync(gerarDocx(blocos));
  const corpo = strFromU8(docx['word/document.xml']);
  assert.match(corpo, /Semana \/ Período/);
  assert.match(corpo, /w:orient="landscape"/);
});
