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

// Uma fase é uma lista única de etapas. Cada etapa pode ter "saiba mais", links, campos de resposta
// e ficar travada até o professor liberar. Fases antigas (instruções separadas) continuam funcionando.
export function etapasDe(f) {
  if (Array.isArray(f.etapas)) return f.etapas.map((e, i) => ({ ...e, id: e.id ?? `e${i + 1}` }));
  return (f.instrucoes ?? []).map((x, i) => (typeof x === 'string' ? { id: `i${i + 1}`, texto: x } : { ...x, id: x.id ?? `i${i + 1}` }));
}

// Etapas que o aluno precisa marcar para concluir (as só de informação e os bônus não contam).
export const marcaveis = (f) => etapasDe(f).filter((e) => e.semMarcar !== true && e.opcional !== true);
export const ehExcel = (f) => f.tipo === 'excel';

export function normMateriais(f) {
  return (f.materiais ?? []).map((x, i) => ({ ...x, id: x.id ?? `m${i + 1}` }));
}

// Item travado só aparece depois que o professor libera na turma.
export function liberado(turma, faseId, item, chave) {
  return item[chave] !== true || turma?.liberacoes?.[faseId]?.[item.id] === true;
}

export function contarTarefas(fase, prog) {
  const lista = marcaveis(fase);
  const feitas = lista.filter((e) => prog?.tarefas?.[e.id] === true).length;
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
    etapas: etapasDe(f),
    materiais: normMateriais(f),
    habilidades: f.habilidades ?? [],
    evidencias: f.evidencias ?? {},
    criterios: f.criterios ?? {},
    avaliacao: f.avaliacao ?? '',
    cartaoResumo: f.cartaoResumo ?? '',
    tarefaTrilha: f.tarefaTrilha ?? '',
    folgaAntes: f.folgaAntes ?? 0,
    anexaA: f.anexaA ?? '',
    // como a fase trabalha em grupo: { tipo: 'guilda' | 'fase', tamanho } (o professor ajusta por turma)
    grupo: f.grupo ?? null,
  };
}

// Como a etapa é feita: ícone fixo, o mesmo em todo o jogo.
export const COMO = {
  grupo: { icone: '👥', rotulo: 'Em grupo' },
  sozinho: { icone: '✍️', rotulo: 'Sozinho' },
  caderno: { icone: '📓', rotulo: 'No caderno' },
  jogo: { icone: '📱', rotulo: 'No jogo' },
  lab: { icone: '💻', rotulo: 'No computador' },
};

// "pre": o que se faz antes da terça da fase (entrada no jogo, entrevista do Raio-X).
export const DIAS_FASE = { pre: 'Antes da terça · preparação', ter: 'Terça · na sala', seg: 'Segunda · no laboratório' };
export const diaDe = (e) => (e.dia === 'seg' || e.dia === 'pre' ? e.dia : 'ter');

// A parte de segunda abre quando o professor libera; etapas travadas, quando ele libera cada uma.
export function etapaLiberada(turma, faseId, e) {
  if (diaDe(e) === 'seg' && turma?.liberacoes?.[faseId]?.seg !== true) return false;
  return liberado(turma, faseId, e, 'travada');
}