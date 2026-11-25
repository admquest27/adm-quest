// Relatório do bimestre: códigos, ocultação de nomes e leitura da resposta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codigos, ocultarNomes, textoParaClaude, lerResposta } from '../src/relatorio.js';
import { precisaDeRecuperacao } from '../src/fechamento.js';

const uids = Array.from({ length: 60 }, (_, i) => 'conta' + i);

test('códigos são curtos, sem repetição e não mudam com a ordem', () => {
  const a = codigos(uids); const b = codigos([...uids].reverse());
  assert.deepEqual(a, b);
  assert.equal(new Set(Object.values(a)).size, 60);
  assert.ok(Object.values(a).every((c) => /^[A-Z2-9]{5}$/.test(c)));
});

test('nomes e apelidos somem dos textos, sem apagar palavras comuns', () => {
  const limpar = ocultarNomes([{ nome: 'Maria Sol de Souza', apelido: 'Mel' }]);
  assert.equal(limpar('Maria ajudou a Mel; SOUZA viu.'), '[nome] ajudou a [nome]; [nome] viu.');
  assert.equal(limpar('saiu ao sol de manhã, doce como mel'), 'saiu ao sol de manhã, doce como mel');
  assert.equal(limpar('Melhorou muito'), 'Melhorou muito');
});

test('o relatório anônimo leva o código e o formato da resposta', () => {
  const t = textoParaClaude({ bim: 1, turma: '1A', alunos: [{ codigo: 'ABCDE', blocos: [{ titulo: 'Menções', itens: ['101: A'] }] }] });
  assert.match(t, /### Aluno ABCDE/);
  assert.match(t, /adm-quest-textos/);
});

test('a resposta é lida com cercas de código; turma ou bimestre errados são recusados', () => {
  const porCodigo = { ABCDE: 'u1', FGHJK: 'u2' };
  const resp = '\u0060\u0060\u0060json\n' + JSON.stringify({ formato: 'adm-quest-textos', bimestre: 1, turma: '1A', alunos: [{ codigo: 'abcde', hab: 'Texto', extra: 'x' }, { codigo: 'ZZZZZ', hab: 'y' }] }) + '\n\u0060\u0060\u0060';
  const r = lerResposta(resp, { bim: 1, turma: '1A', porCodigo });
  assert.deepEqual(r.itens, [{ uid: 'u1', campos: { hab: 'Texto' } }]);
  assert.deepEqual(r.desconhecidos, ['ZZZZZ']);
  assert.deepEqual(r.faltando, ['u2']);
  assert.ok(lerResposta(resp, { bim: 2, turma: '1A', porCodigo }).erro);
  assert.ok(lerResposta(resp, { bim: 1, turma: '1B', porCodigo }).erro);
  assert.ok(lerResposta('oi', { bim: 1, turma: '1A', porCodigo }).erro);
});

test('quem é retirado da recuperação sai da lista, mesmo apontado pelo jogo', () => {
  const c = { habs: { EMT1ADM102: { cod: 'EMT1ADM102', avaliada: 'NA', faltas: [] } } };
  assert.equal(precisaDeRecuperacao(c, null).length, 1);
  assert.equal(precisaDeRecuperacao(c, { recup: { EMT1ADM102: { dispensado: true } } }).length, 0);
});
