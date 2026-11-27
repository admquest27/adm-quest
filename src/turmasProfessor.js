// Excluir, arquivar e reativar turmas.
// Turma com histórico de alunos nunca é apagada: ela é arquivada. Só se exclui uma turma sem nenhum registro
// (criada por engano) ou a turma de teste, com os alunos de teste e tudo o que eles fizeram.
import { collection, doc, getDoc, getDocs, query, where, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from './firebase.js';

// coleções cujos documentos dizem de que turma são
export const DA_TURMA = ['progresso', 'avaliacoes', 'comentarios', 'anotacoes', 'fechamentos', 'votacoes', 'votos', 'acertos', 'grupos', 'vagas', 'perfis', 'segredos', 'compras', 'carteiras', 'nomes'];
// coleções com um documento por aluno, com o id do aluno
export const DO_ALUNO = ['nomes', 'perfis', 'segredos', 'compras', 'carteiras'];
// o que conta como histórico de uma turma real
export const HISTORICO = ['progresso', 'avaliacoes', 'comentarios', 'anotacoes', 'fechamentos'];

// Pura: o que a tela oferece para a turma.
export const podeExcluir = (turma, alunos) => turma.teste === true || !alunos.some((a) => a.turma === turma.id);

const daTurma = (c, id) => getDocs(query(collection(db, c), where('turma', '==', id)));

async function apagarEmLotes(refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const lote = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => lote.delete(r));
    await lote.commit();
  }
}

// Devolve '' quando excluiu, ou o motivo para não excluir.
export async function excluirTurma(turma, alunos) {
  const daqui = alunos.filter((a) => a.turma === turma.id);
  if (!podeExcluir(turma, alunos)) return 'Esta turma tem cadastros. Use "Arquivar".';
  if (turma.teste !== true) {
    for (const c of HISTORICO) if (!(await daTurma(c, turma.id)).empty) return 'Esta turma tem registros guardados. Use "Arquivar".';
  }
  const refs = new Map();
  const juntar = (r) => refs.set(r.path, r);
  if (turma.teste === true) {
    for (const c of DA_TURMA) (await daTurma(c, turma.id)).docs.forEach((d) => juntar(d.ref));
    for (const a of daqui) {
      for (const c of DO_ALUNO) { const d = await getDoc(doc(db, c, a.uid)); if (d.exists()) juntar(d.ref); }
    }
    // os cadastros vão depois dos dados deles
    daqui.forEach((a) => juntar(doc(db, 'alunos', a.uid)));
  }
  await apagarEmLotes([...refs.values()]);
  // a turma sai por último: as regras do banco conferem nela se é de teste
  const fim = (await daTurma('codigos', turma.id)).docs.map((d) => d.ref);
  const plano = await getDoc(doc(db, 'planos', turma.id));
  if (plano.exists()) fim.push(plano.ref);
  await apagarEmLotes([...fim, doc(db, 'turmas', turma.id)]);
  return '';
}

export async function arquivarTurma(turma) {
  const lote = writeBatch(db);
  lote.update(doc(db, 'turmas', turma.id), { arquivada: true, aberta: false });
  if (turma.codigo) lote.set(doc(db, 'codigos', turma.codigo), { turma: turma.id, aberta: false });
  await lote.commit();
}

// volta fechada para cadastros: o professor abre quando quiser
export const reativarTurma = (turma) => updateDoc(doc(db, 'turmas', turma.id), { arquivada: false });
