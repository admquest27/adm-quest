// Ajudantes compartilhados sobre fases, progresso e avaliações.

export const MUNDO = 'm1';

export const ESTADOS = ['trancada', 'aberta', 'adiada', 'cancelada', 'encerrada'];
export const ESTADO_ROTULO = {
  trancada: 'Trancada',
  aberta: 'Aberta',
  adiada: 'Adiada',
  cancelada: 'Cancelada',
  encerrada: 'Encerrada',
};

export const SITUACAO_ROTULO = {
  validada: 'Validada',
  concluida: 'Concluída',
  afazer: 'A fazer',
  naoconcluida: 'Não concluída',
  andamento: 'Em andamento',
  inicio: 'Não iniciada',
};

export const progId = (uid, fase) => `${uid}_${fase}`;

export function contarTarefas(fase, prog) {
  const lista = fase.tarefas ?? [];
  const feitas = lista.filter((t) => prog?.tarefas?.[t.id] === true).length;
  return { total: lista.length, feitas };
}

// Situação de um aluno numa fase, a partir do que ele marcou e do que o professor registrou.
export function situacao(fase, prog, aval, estado) {
  if (aval?.validada) return 'validada';
  if (prog?.concluida) return 'concluida';
  if (estado === 'encerrada') return aval?.faltou || aval?.liberado ? 'afazer' : 'naoconcluida';
  if (aval?.faltou) return 'afazer';
  return contarTarefas(fase, prog).feitas > 0 ? 'andamento' : 'inicio';
}

// O aluno pode editar enquanto a fase está aberta. Depois de encerrada, só se faltou ou se o professor liberou.
export function podeEditar(estado, aval) {
  return estado === 'aberta' || (estado === 'encerrada' && (aval?.faltou === true || aval?.liberado === true));
}

export function textoPlaca(textos, fase) {
  const placas = textos?.placas ?? [];
  if (!placas.length) return 'Em obra.';
  return placas[((fase.ordem ?? 0) + new Date().getDate()) % placas.length];
}

// As etapas (instruções) podem ser texto simples ou objetos com "saiba mais", links e trava.
export function normInstrucoes(f) {
  return (f.instrucoes ?? []).map((x, i) => (typeof x === 'string' ? { id: `i${i + 1}`, texto: x } : { ...x, id: x.id ?? `i${i + 1}` }));
}

export function normMateriais(f) {
  return (f.materiais ?? []).map((x, i) => ({ ...x, id: x.id ?? `m${i + 1}` }));
}

// Item travado só aparece depois que o professor libera na turma.
export function liberado(turma, faseId, item, chave) {
  return item[chave] !== true || turma?.liberacoes?.[faseId]?.[item.id] === true;
}

export function urlSegura(u) {
  try {
    const x = new URL(String(u).trim());
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : '#';
  } catch { return '#'; }
}

// Texto estável (ordena as chaves) para comparar conteúdo sem depender da ordem.
export function estavel(valor) {
  if (Array.isArray(valor)) return `[${valor.map(estavel).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort().map((k) => `${JSON.stringify(k)}:${estavel(valor[k])}`).join(',')}}`;
  }
  return JSON.stringify(valor ?? null);
}

// O que o aluno pode ler de uma fase. As notas do professor ficam em outra coleção.
export function parteAluno(f, mundo) {
  return {
    mundo,
    codigo: f.codigo ?? '',
    ordem: f.ordem ?? 0,
    nome: f.nome ?? '',
    tipo: f.tipo ?? 'normal',
    essencial: f.essencial === true,
    atitude: f.atitude ?? '',
    porGrupo: f.porGrupo ?? [],
    missao: f.missao ?? '',
    instrucoes: normInstrucoes(f),
    materiais: normMateriais(f),
    tarefas: f.tarefas ?? [],
    habilidades: f.habilidades ?? [],
    evidencias: f.evidencias ?? {},
    criterios: f.criterios ?? {},
    avaliacao: f.avaliacao ?? '',
    cartaoResumo: f.cartaoResumo ?? '',
    tarefaTrilha: f.tarefaTrilha ?? '',
  };
}
