// AdmBux: a moeda do jogo. Funções puras.
//
// O saldo nunca é gravado: é calculado a partir do que o professor confirmou (fases validadas, atitudes
// visíveis, prêmios e rendimentos na carteira) menos as compras do aluno. Assim ninguém dá moeda para si mesmo.
// A menção nunca vale moeda.
import { etapasDe } from './fases.js';

export const VALORES_PADRAO = { fase: 10, bonus: 5, atitude: 5, conquista: 15, rendimento: 0.1 };

// Conquistas: a lógica fica aqui; nome e texto vêm do banco (economia/geral), com estes como reserva.
export const CONQUISTAS = {
  aura: { nome: 'Aura farmada', texto: 'Primeira fase validada. O começo de uma carreira brilhante.' },
  exilio: { nome: 'Voltou do exílio', texto: 'Faltou na dinâmica, mas voltou e terminou a fase.' },
  combo: { nome: 'Combo de bônus', texto: 'Fez o bônus em três fases.' },
  braco: { nome: 'Braço direito', texto: 'O professor registrou a sua colaboração com a turma.' },
  vila: { nome: 'Vila completa', texto: 'Todas as fases do mundo validadas.' },
  cofre: { nome: 'Cofrinho de ouro', texto: 'Recebeu o rendimento da poupança. O dinheiro trabalhou por você.' },
};

// Itens da loja: o "estilo" aponta para uma classe visual que existe no código.
export const ESTILOS = {
  moldura: ['madeira', 'pedra', 'ouro', 'neon', 'arco', 'barao'],
  fundo: ['deserto', 'noite', 'floresta', 'oceano', 'lava'],
};

const ms = (ts) => (ts?.toMillis ? ts.toMillis() : typeof ts === 'number' ? ts : 0);
export const temConcluir = (f) => f.tipo !== 'chefao' && f.tipo !== 'excel';

// Entrada: dados de UM aluno. progresso e aval indexados pela fase.
export function calcularCarteira({ fases = [], progresso = {}, aval = {}, recados = [], carteira = null, compras = null, eco = null }) {
  const V = { ...VALORES_PADRAO, ...(eco?.valores ?? {}) };
  const linhas = [];
  const add = (quando, descricao, valor, tipo) => linhas.push({ quando, descricao, valor, tipo });
  const ordenadas = fases.filter(temConcluir).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  let primeira = null;
  let exilio = null;
  const comBonus = [];
  for (const f of ordenadas) {
    const a = aval[f.id];
    if (!a?.validada) continue;
    const quando = ms(a.validadaEm) || ms(a.atualizadoEm);
    add(quando, `Fase ${f.codigo} validada`, V.fase, 'fase');
    if (!primeira) primeira = quando;
    if (a.faltou && !exilio) exilio = quando;
    const bonus = etapasDe(f).filter((e) => e.opcional && progresso[f.id]?.tarefas?.[e.id] === true);
    if (bonus.length) {
      add(quando, `Bônus da fase ${f.codigo}`, V.bonus * bonus.length, 'bonus');
      comBonus.push(quando);
    }
  }

  let braco = null;
  for (const r of recados) {
    if (r.tipoAtitude !== 'positivo' || r.visivel === false) continue;
    const quando = ms(r.criadoEm);
    add(quando, `Atitude: ${r.texto}`, V.atitude, 'atitude');
    if (!braco && /colaborativa/i.test(r.marca ?? '')) braco = quando;
  }

  for (const p of carteira?.premios ?? []) add(ms(p.em), p.motivo || 'Prêmio do professor', Number(p.valor) || 0, 'premio');
  let cofre = null;
  for (const [mundo, r] of Object.entries(carteira?.rendimentos ?? {})) {
    add(ms(r.em), `Rendimento da poupança (${r.nome ?? mundo})`, Number(r.valor) || 0, 'rendimento');
    if (!cofre) cofre = ms(r.em);
  }

  // conquistas
  const ganhas = {};
  if (primeira !== null) ganhas.aura = primeira;
  if (exilio !== null) ganhas.exilio = exilio;
  if (comBonus.length >= 3) ganhas.combo = comBonus[2];
  if (braco !== null) ganhas.braco = braco;
  if (ordenadas.length && ordenadas.every((f) => aval[f.id]?.validada)) ganhas.vila = Math.max(...ordenadas.map((f) => ms(aval[f.id].validadaEm) || ms(aval[f.id].atualizadoEm)));
  if (cofre !== null) ganhas.cofre = cofre;
  const textos = { ...CONQUISTAS, ...(eco?.conquistas ?? {}) };
  for (const [id, quando] of Object.entries(ganhas)) add(quando, `Conquista: ${textos[id]?.nome ?? id}`, V.conquista, 'conquista');

  // compras
  const loja = eco?.loja ?? {};
  for (const c of compras?.itens ?? []) add(ms(c.em), `Compra: ${loja[c.id]?.nome ?? c.id}`, -(Number(c.preco) || 0), 'compra');

  linhas.sort((a, b) => a.quando - b.quando);
  const entradas = linhas.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const saidas = -linhas.filter((l) => l.valor < 0).reduce((s, l) => s + l.valor, 0);
  return { linhas, entradas, saidas, saldo: entradas - saidas, conquistas: Object.keys(ganhas), V };
}

// Itens à venda agora: os de edição limitada só aparecem no mundo deles.
export function itensDaLoja(eco, mundoAtual) {
  return Object.entries(eco?.loja ?? {})
    .map(([id, i]) => ({ id, ...i }))
    .filter((i) => i.ativo !== false && (!i.limitado || i.limitado === mundoAtual))
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.preco - b.preco);
}

export function podeComprar(item, saldo, compras) {
  if ((compras?.itens ?? []).some((c) => c.id === item.id)) return { ok: false, motivo: 'Você já tem este item.' };
  if (saldo < item.preco) return { ok: false, motivo: `Faltam ${item.preco - saldo} AdmBux.` };
  return { ok: true };
}

export const rendimentoDe = (saldo, taxa = VALORES_PADRAO.rendimento) => (saldo > 0 ? Math.floor(saldo * taxa) : 0);
