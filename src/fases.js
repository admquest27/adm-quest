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
export function situacao(fase, prog, aval) {
  if (aval?.validada) return 'validada';
  if (prog?.concluida) return 'concluida';
  if (aval?.faltou) return 'afazer';
  return contarTarefas(fase, prog).feitas > 0 ? 'andamento' : 'inicio';
}

export function textoPlaca(textos, fase) {
  const placas = textos?.placas ?? [];
  if (!placas.length) return 'Em obra.';
  return placas[((fase.ordem ?? 0) + new Date().getDate()) % placas.length];
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
    instrucoes: f.instrucoes ?? [],
    tarefas: f.tarefas ?? [],
    habilidades: f.habilidades ?? [],
    evidencias: f.evidencias ?? {},
    criterios: f.criterios ?? {},
    avaliacao: f.avaliacao ?? '',
    cartaoResumo: f.cartaoResumo ?? '',
    tarefaTrilha: f.tarefaTrilha ?? '',
  };
}
