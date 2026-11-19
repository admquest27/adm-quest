import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCarteira, itensDaLoja, podeComprar, rendimentoDe } from '../src/economia.js';

const fase = (id, ordem, extra = {}) => ({ id, codigo: `1-${ordem}`, ordem, etapas: [{ id: 'e1', texto: 'x' }, { id: 'b', texto: 'bônus', opcional: true }], ...extra });
const fases = [fase('f1', 1), fase('f2', 2), fase('f3', 3), fase('ch', 9, { tipo: 'chefao' })];

test('ganha só pelo que o professor confirmou; a menção não vale moeda', () => {
  const r = calcularCarteira({
    fases,
    progresso: { f1: { tarefas: { b: true } }, f2: { tarefas: { b: true }, concluida: true } },
    aval: { f1: { validada: true, validadaEm: 10, mencoes: { X: 'A' } }, f2: { mencoes: { X: 'A' } } },
  });
  // f1: 10 (fase) + 5 (bônus) + 15 (conquista aura). f2 sem validação não conta.
  assert.equal(r.saldo, 30);
  assert.deepEqual(r.conquistas, ['aura']);
});

test('atitude positiva visível, prêmio, rendimento e compras entram no extrato', () => {
  const r = calcularCarteira({
    fases,
    recados: [
      { tipoAtitude: 'positivo', visivel: true, marca: 'Atitude colaborativa', texto: 'Ajudou um colega', criadoEm: 5 },
      { tipoAtitude: 'atencao', visivel: true, marca: 'Foco', texto: 'x', criadoEm: 6 },
    ],
    carteira: { premios: [{ valor: 20, motivo: 'Organizou a sala', em: 7 }], rendimentos: { m1: { valor: 3, em: 8, nome: 'Mundo 1' } } },
    compras: { itens: [{ id: 't1', preco: 30, em: 9 }] },
    eco: { loja: { t1: { nome: 'CEO de Nada', preco: 30 } } },
  });
  // 5 atitude + 15 braço direito + 20 prêmio + 3 rendimento + 15 cofrinho - 30 compra
  assert.equal(r.saldo, 28);
  assert.ok(r.conquistas.includes('braco') && r.conquistas.includes('cofre'));
  assert.equal(r.linhas.at(-1).descricao, 'Compra: CEO de Nada');
});

test('conquistas de faltar e voltar, combo de bônus e vila completa', () => {
  const tudo = { tarefas: { b: true } };
  const r = calcularCarteira({
    fases,
    progresso: { f1: tudo, f2: tudo, f3: tudo },
    aval: { f1: { validada: true }, f2: { validada: true, faltou: true }, f3: { validada: true } },
  });
  assert.deepEqual(r.conquistas.sort(), ['aura', 'combo', 'exilio', 'vila']);
});

test('loja: edição limitada, item repetido e saldo insuficiente', () => {
  const eco = { loja: { a: { nome: 'A', preco: 20 }, b: { nome: 'B', preco: 50, limitado: 'm1' }, c: { nome: 'C', preco: 40, limitado: 'm2' } } };
  assert.deepEqual(itensDaLoja(eco, 'm1').map((i) => i.id), ['a', 'b']);
  assert.equal(podeComprar({ id: 'a', preco: 20 }, 10, null).motivo, 'Faltam 10 AdmBux.');
  assert.equal(podeComprar({ id: 'a', preco: 20 }, 100, { itens: [{ id: 'a' }] }).ok, false);
  assert.equal(podeComprar({ id: 'a', preco: 20 }, 20, null).ok, true);
  assert.equal(rendimentoDe(105), 10);
  assert.equal(rendimentoDe(-5), 0);
});
