// Como o professor vê os alunos: pelo nome completo (que só ele lê), em ordem alfabética. Os colegas só veem o
// nome de usuário (apelido). O nome completo fica na coleção "nomes", separada do cadastro.
export const nomeDe = (a) => a?.nome || a?.apelido || '';

export function ordenarAlunos(lista) {
  return [...lista].sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), 'pt-BR', { sensitivity: 'base' }));
}

// Junta o nome completo em cada cadastro (sem gravar nada).
export const comNomes = (alunos, nomes) => alunos.map((a) => ({ ...a, nome: nomes?.[a.uid]?.nome ?? '' }));

// "Maria Clara de Souza Lima" vira "Maria Clara" quando o espaço é curto: os dois primeiros nomes, sem preposição solta.
export function nomeCurto(a) {
  if (!a?.nome) return a?.apelido ?? '';
  const p = a.nome.trim().split(/\s+/);
  if (p.length <= 2) return p.join(' ');
  return /^(de|da|do|das|dos|e)$/i.test(p[1]) ? `${p[0]} ${p[p.length - 1]}` : `${p[0]} ${p[1]}`;
}

export const nomeValido = (t) => {
  const n = String(t ?? '').trim().replace(/\s+/g, ' ');
  return n.length >= 5 && n.length <= 80 && n.includes(' ') ? n : null;
};
