// Testes das regras de segurança do Firestore (rodam no emulador local, sem tocar no banco real).
// Uso: npm test
import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-adm-quest',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'turmas/1A'), {
      nome: '1º ano A', codigo: 'ABC12', aberta: true, teste: false,
      estadoFases: { m1f1: 'aberta', m1f2: 'trancada', m1f3: 'encerrada', m1f4: 'adiada', m1f5: 'aberta' },
    });
    await setDoc(doc(db, 'mundos/m1'), { nome: 'Vila dos Planos' });
    await setDoc(doc(db, 'fases/m1f1'), { mundo: 'm1', nome: 'Casa de Partida', tarefas: [{ id: 't1', texto: 'x' }] });
    await setDoc(doc(db, 'fasesProfessor/m1f1'), { mundo: 'm1', professor: { paraVoce: ['segredo'] } });
    await setDoc(doc(db, 'progresso/ativo1_m1f1'), { uid: 'ativo1', turma: '1A', fase: 'm1f1', tarefas: { t1: true }, concluida: false });
    await setDoc(doc(db, 'avaliacoes/ativo1_m1f1'), { uid: 'ativo1', turma: '1A', fase: 'm1f1', faltou: false, validada: true, mencoes: { EMT1ADM102: 'A' } });
    await setDoc(doc(db, 'avaliacoes/outro1_m1f1'), { uid: 'outro1', turma: '1B', fase: 'm1f1', faltou: true });
    await setDoc(doc(db, 'turmas/TESTE'), { nome: 'Teste', codigo: 'TST01', aberta: true, teste: true, estadoFases: {} });
    await setDoc(doc(db, 'alunos/teste1'), { turma: 'TESTE', codigo: 'TST01', apelido: 'Teste', status: 'ativo' });
    await setDoc(doc(db, 'progresso/teste1_m1f1'), { uid: 'teste1', turma: 'TESTE', fase: 'm1f1', tarefas: {}, concluida: false });
    await setDoc(doc(db, 'turmas/1B'), { nome: '1º ano B', codigo: 'XYZ99', aberta: true, teste: false });
    await setDoc(doc(db, 'turmas/FECH'), { nome: 'Fechada', codigo: 'FECH1', aberta: false, teste: false });
    await setDoc(doc(db, 'codigos/ABC12'), { turma: '1A', aberta: true });
    await setDoc(doc(db, 'codigos/XYZ99'), { turma: '1B', aberta: true });
    await setDoc(doc(db, 'codigos/FECH1'), { turma: 'FECH', aberta: false });
    await setDoc(doc(db, 'alunos/ativo1'), { turma: '1A', codigo: 'ABC12', apelido: 'Ana', status: 'ativo' });
    await setDoc(doc(db, 'alunos/pend1'), { turma: '1A', codigo: 'ABC12', apelido: 'Beto', status: 'pendente' });
    await setDoc(doc(db, 'alunos/outro1'), { turma: '1B', codigo: 'XYZ99', apelido: 'Caio', status: 'ativo' });
    await setDoc(doc(db, 'chamadas/1A_2027-02-02'), { turma: '1A', data: '2027-02-02', faltas: ['ativo1'] });
  });
});

const aluno = (uid) => env.authenticatedContext(uid).firestore();
const prof = () => env.authenticatedContext('prof', { professor: true }).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();
const novo = (extra = {}) => ({ turma: '1A', codigo: 'ABC12', apelido: 'Dani', status: 'pendente', criadoEm: serverTimestamp(), ...extra });

test('visitante sem login não lê nem escreve nada', async () => {
  await assertFails(getDoc(doc(anonimo(), 'alunos/ativo1')));
  await assertFails(getDoc(doc(anonimo(), 'codigos/ABC12')));
  await assertFails(setDoc(doc(anonimo(), 'alunos/x'), novo()));
});

test('aluno novo cria o próprio cadastro pendente com código válido', async () => {
  await assertSucceeds(setDoc(doc(aluno('novo1'), 'alunos/novo1'), novo()));
});

test('aluno não cria cadastro com código errado, de turma fechada ou de outra turma', async () => {
  await assertFails(setDoc(doc(aluno('n2'), 'alunos/n2'), novo({ codigo: 'ZZZZZ' })));
  await assertFails(setDoc(doc(aluno('n3'), 'alunos/n3'), novo({ codigo: 'FECH1', turma: 'FECH' })));
  await assertFails(setDoc(doc(aluno('n4'), 'alunos/n4'), novo({ turma: '1B' })));
});

test('aluno não cria cadastro já ativo, com campos extras, apelido inválido ou em nome de outro', async () => {
  await assertFails(setDoc(doc(aluno('n5'), 'alunos/n5'), novo({ status: 'ativo' })));
  await assertFails(setDoc(doc(aluno('n6'), 'alunos/n6'), novo({ numeroChamada: 1 })));
  await assertFails(setDoc(doc(aluno('n7'), 'alunos/n7'), novo({ apelido: 'A' })));
  await assertFails(setDoc(doc(aluno('n8'), 'alunos/n8'), novo({ apelido: 'x'.repeat(17) })));
  await assertFails(setDoc(doc(aluno('n9'), 'alunos/outro-uid'), novo()));
});

test('aluno lê só o próprio cadastro', async () => {
  await assertSucceeds(getDoc(doc(aluno('ativo1'), 'alunos/ativo1')));
  await assertFails(getDoc(doc(aluno('ativo1'), 'alunos/outro1')));
  await assertFails(getDocs(collection(aluno('ativo1'), 'alunos')));
});

test('aluno busca um código que sabe, mas não lista os códigos', async () => {
  await assertSucceeds(getDoc(doc(aluno('qualquer'), 'codigos/ABC12')));
  await assertFails(getDocs(collection(aluno('qualquer'), 'codigos')));
  await assertFails(setDoc(doc(aluno('qualquer'), 'codigos/NOVO1'), { turma: '1A', aberta: true }));
});

test('aluno lê só a turma em que está cadastrado', async () => {
  await assertSucceeds(getDoc(doc(aluno('ativo1'), 'turmas/1A')));
  await assertFails(getDoc(doc(aluno('ativo1'), 'turmas/1B')));
  await assertFails(getDoc(doc(aluno('semcadastro'), 'turmas/1A')));
  await assertFails(updateDoc(doc(aluno('ativo1'), 'turmas/1A'), { aberta: false }));
});

test('aluno ativo altera só o avatar e o último acesso', async () => {
  const ref = doc(aluno('ativo1'), 'alunos/ativo1');
  await assertSucceeds(updateDoc(ref, { avatar: { fantasia: 'heroi', tom: 2 } }));
  await assertSucceeds(updateDoc(ref, { ultimoAcesso: serverTimestamp() }));
  await assertFails(updateDoc(ref, { apelido: 'Outro' }));
  await assertFails(updateDoc(ref, { status: 'ativo', numeroChamada: 5 }));
  await assertFails(updateDoc(ref, { turma: '1B' }));
  await assertFails(updateDoc(ref, { avatar: { fantasia: 'heroi', tom: 9 } }));
  await assertFails(updateDoc(ref, { avatar: { fantasia: 'heroi', tom: 1, extra: true } }));
});

test('aluno pendente não consegue se aprovar nem mexer no avatar', async () => {
  const ref = doc(aluno('pend1'), 'alunos/pend1');
  await assertFails(updateDoc(ref, { status: 'ativo' }));
  await assertFails(updateDoc(ref, { avatar: { fantasia: 'heroi', tom: 1 } }));
});

test('aluno não lê chamadas nem escreve nelas', async () => {
  await assertFails(getDoc(doc(aluno('ativo1'), 'chamadas/1A_2027-02-02')));
  await assertFails(setDoc(doc(aluno('ativo1'), 'chamadas/1A_2027-02-03'), { faltas: [] }));
});

test('aluno não cria nem apaga nada fora do que é dele', async () => {
  await assertFails(deleteDoc(doc(aluno('ativo1'), 'alunos/ativo1')));
  await assertFails(setDoc(doc(aluno('ativo1'), 'qualquer/coisa'), { a: 1 }));
});

test('professor lê tudo e gerencia turmas, códigos e alunos', async () => {
  const db = prof();
  await assertSucceeds(getDocs(collection(db, 'alunos')));
  await assertSucceeds(getDocs(collection(db, 'codigos')));
  await assertSucceeds(setDoc(doc(db, 'turmas/TESTE'), { nome: 'Teste', codigo: 'TST01', aberta: true, teste: true }));
  await assertSucceeds(setDoc(doc(db, 'codigos/TST01'), { turma: 'TESTE', aberta: true }));
  await assertSucceeds(updateDoc(doc(db, 'alunos/pend1'), { status: 'ativo', numeroChamada: 3, dataEntrada: '2027-02-01' }));
});

test('professor recusa cadastro pendente, mas não apaga aluno ativo', async () => {
  const db = prof();
  await assertSucceeds(deleteDoc(doc(db, 'alunos/pend1')));
  await assertFails(deleteDoc(doc(db, 'alunos/ativo1')));
});

test('marca de professor falsa no cadastro não vale: só o token conta', async () => {
  await assertFails(getDoc(doc(aluno('ativo1'), 'alunos/outro1')));
  await assertFails(setDoc(doc(aluno('ativo1'), 'alunos/ativo1'), { turma: '1A', professor: true }));
});

// ---------- fases, progresso e avaliações ----------
const prog = (uid, fase, extra = {}) => ({ uid, turma: '1A', fase, tarefas: { t1: true }, concluida: false, atualizadoEm: serverTimestamp(), ...extra });

test('aluno ativo lê o conteúdo do mundo e das fases, mas não as notas do professor', async () => {
  await assertSucceeds(getDoc(doc(aluno('ativo1'), 'mundos/m1')));
  await assertSucceeds(getDoc(doc(aluno('ativo1'), 'fases/m1f1')));
  await assertSucceeds(getDocs(collection(aluno('ativo1'), 'fases')));
  await assertFails(getDoc(doc(aluno('ativo1'), 'fasesProfessor/m1f1')));
  await assertFails(getDocs(collection(aluno('ativo1'), 'fasesProfessor')));
});

test('aluno pendente e visitante não leem as fases', async () => {
  await assertFails(getDoc(doc(aluno('pend1'), 'fases/m1f1')));
  await assertFails(getDoc(doc(aluno('semcadastro'), 'fases/m1f1')));
  await assertFails(getDoc(doc(anonimo(), 'fases/m1f1')));
});

test('aluno não altera conteúdo nem estados das fases', async () => {
  await assertFails(updateDoc(doc(aluno('ativo1'), 'fases/m1f1'), { nome: 'Outro' }));
  await assertFails(updateDoc(doc(aluno('ativo1'), 'turmas/1A'), { 'estadoFases.m1f2': 'aberta' }));
  await assertFails(setDoc(doc(aluno('ativo1'), 'mundos/m2'), { nome: 'x' }));
});

test('aluno marca tarefas e conclui numa fase aberta', async () => {
  const db = aluno('ativo1');
  await assertSucceeds(updateDoc(doc(db, 'progresso/ativo1_m1f1'), { tarefas: { t1: true, t2: true }, atualizadoEm: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, 'progresso/ativo1_m1f1'), { concluida: true, concluidaEm: serverTimestamp(), atualizadoEm: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, 'progresso/ativo1_m1f1'), { concluida: false, concluidaEm: null, atualizadoEm: serverTimestamp() }));
});

test('aluno cria progresso novo só da própria turma, em fase liberada e com o id certo', async () => {
  const db = aluno('ativo1');
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f5'), prog('ativo1', 'm1f5')));
  await assertFails(setDoc(doc(db, 'progresso/ativo1_m1f2'), prog('ativo1', 'm1f2')));
  await assertFails(setDoc(doc(db, 'progresso/ativo1_m1f4'), prog('ativo1', 'm1f4')));
  await assertFails(setDoc(doc(db, 'progresso/ativo1_m1f9'), prog('ativo1', 'm1f9')));
  await assertFails(setDoc(doc(db, 'progresso/errado'), prog('ativo1', 'm1f5')));
  await assertFails(setDoc(doc(db, 'progresso/outro1_m1f3'), prog('outro1', 'm1f5')));
  await assertFails(setDoc(doc(db, 'progresso/ativo1_m1f5'), prog('ativo1', 'm1f5', { turma: '1B' })));
  await assertFails(setDoc(doc(db, 'progresso/ativo1_m1f5'), prog('ativo1', 'm1f5', { validada: true })));
});

test('aluno não mexe no progresso de fase trancada ou adiada, nem no de outro aluno', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'progresso/ativo1_m1f2'), { uid: 'ativo1', turma: '1A', fase: 'm1f2', tarefas: {}, concluida: false });
    await setDoc(doc(ctx.firestore(), 'progresso/outro1_m1f1'), { uid: 'outro1', turma: '1B', fase: 'm1f1', tarefas: {}, concluida: false });
  });
  await assertFails(updateDoc(doc(aluno('ativo1'), 'progresso/ativo1_m1f2'), { concluida: true, concluidaEm: serverTimestamp(), atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(doc(aluno('ativo1'), 'progresso/outro1_m1f1'), { concluida: true, concluidaEm: serverTimestamp(), atualizadoEm: serverTimestamp() }));
});

test('aluno não altera campos que não são dele no progresso', async () => {
  const ref = doc(aluno('ativo1'), 'progresso/ativo1_m1f1');
  await assertFails(updateDoc(ref, { turma: '1B', atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref, { uid: 'outro1', atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref, { validada: true, atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref, { concluida: 'sim', atualizadoEm: serverTimestamp() }));
  await assertFails(deleteDoc(ref));
});

test('aluno pendente não escreve progresso', async () => {
  await assertFails(setDoc(doc(aluno('pend1'), 'progresso/pend1_m1f1'), prog('pend1', 'm1f1')));
});

test('aluno lê só o próprio progresso e as próprias avaliações', async () => {
  await assertSucceeds(getDoc(doc(aluno('ativo1'), 'progresso/ativo1_m1f1')));
  await assertSucceeds(getDoc(doc(aluno('ativo1'), 'avaliacoes/ativo1_m1f1')));
  await assertFails(getDoc(doc(aluno('ativo1'), 'avaliacoes/outro1_m1f1')));
  await assertFails(getDocs(collection(aluno('ativo1'), 'avaliacoes')));
  await assertFails(getDocs(collection(aluno('ativo1'), 'progresso')));
});

test('aluno não escreve avaliações', async () => {
  await assertFails(setDoc(doc(aluno('ativo1'), 'avaliacoes/ativo1_m1f2'), { uid: 'ativo1', validada: true }));
  await assertFails(updateDoc(doc(aluno('ativo1'), 'avaliacoes/ativo1_m1f1'), { validada: false }));
  await assertFails(deleteDoc(doc(aluno('ativo1'), 'avaliacoes/ativo1_m1f1')));
});

test('professor gerencia conteúdo, estados, faltas e validações', async () => {
  const db = prof();
  await assertSucceeds(setDoc(doc(db, 'mundos/m1'), { nome: 'Vila dos Planos' }));
  await assertSucceeds(setDoc(doc(db, 'fases/m1f2'), { mundo: 'm1', nome: 'Dunas' }));
  await assertSucceeds(getDoc(doc(db, 'fasesProfessor/m1f1')));
  await assertSucceeds(setDoc(doc(db, 'fasesProfessor/m1f2'), { mundo: 'm1', professor: {} }));
  await assertSucceeds(updateDoc(doc(db, 'turmas/1A'), { 'estadoFases.m1f2': 'aberta' }));
  await assertSucceeds(setDoc(doc(db, 'avaliacoes/ativo1_m1f2'), { uid: 'ativo1', turma: '1A', fase: 'm1f2', faltou: true }, { merge: true }));
  await assertSucceeds(getDocs(collection(db, 'progresso')));
});
test('os mesmos padrões de escrita do aplicativo funcionam (primeira tarefa, concluir, desmarcar)', async () => {
  const db = aluno('ativo1');
  // primeira tarefa de uma fase ainda sem progresso (setDoc com merge cria o documento)
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f5'),
    { tarefas: { t1: true }, atualizadoEm: serverTimestamp(), uid: 'ativo1', turma: '1A', fase: 'm1f5', concluida: false }, { merge: true }));
  // segunda tarefa: documento já existe, só muda o que mudou
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f5'),
    { tarefas: { t2: true }, atualizadoEm: serverTimestamp() }, { merge: true }));
  // concluir
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f5'),
    { concluida: true, concluidaEm: serverTimestamp(), atualizadoEm: serverTimestamp() }, { merge: true }));
  // desmarcar
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f5'),
    { concluida: false, concluidaEm: null, atualizadoEm: serverTimestamp() }, { merge: true }));
});

test('concluir uma fase sem nenhuma tarefa marcada cria o progresso corretamente', async () => {
  const db = aluno('ativo1');
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f5'),
    { concluida: true, concluidaEm: serverTimestamp(), atualizadoEm: serverTimestamp(), uid: 'ativo1', turma: '1A', fase: 'm1f5', tarefas: {} }, { merge: true }));
});

test('o professor valida e o aluno enxerga a própria validação em tempo real', async () => {
  await assertSucceeds(setDoc(doc(prof(), 'avaliacoes/ativo1_m1f5'),
    { uid: 'ativo1', turma: '1A', fase: 'm1f5', validada: true, mencoes: { EMT1ADM103: 'PA' }, atualizadoEm: serverTimestamp() }, { merge: true }));
  const snap = await assertSucceeds(getDoc(doc(aluno('ativo1'), 'avaliacoes/ativo1_m1f5')));
  assert.equal(snap.data().mencoes.EMT1ADM103, 'PA');
});
// ---------- fase encerrada, liberação, respostas e limpeza ----------
test('em fase encerrada, o aluno só edita se faltou ou se o professor liberou', async () => {
  const db = aluno('ativo1');
  const dados = { tarefas: { t1: true }, atualizadoEm: serverTimestamp(), uid: 'ativo1', turma: '1A', fase: 'm1f3', concluida: false };
  await assertFails(setDoc(doc(db, 'progresso/ativo1_m1f3'), dados, { merge: true }));
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'avaliacoes/ativo1_m1f3'), { uid: 'ativo1', turma: '1A', fase: 'm1f3', faltou: true });
  });
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f3'), dados, { merge: true }));
});

test('o professor libera um aluno para fazer depois do encerramento', async () => {
  const db = aluno('ativo1');
  const dados = { tarefas: { t1: true }, atualizadoEm: serverTimestamp(), uid: 'ativo1', turma: '1A', fase: 'm1f3', concluida: false };
  await assertFails(setDoc(doc(db, 'progresso/ativo1_m1f3'), dados, { merge: true }));
  await assertSucceeds(setDoc(doc(prof(), 'avaliacoes/ativo1_m1f3'), { uid: 'ativo1', turma: '1A', fase: 'm1f3', liberado: true }, { merge: true }));
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f3'), dados, { merge: true }));
});

test('aluno escreve respostas dos campos de uma tarefa', async () => {
  const db = aluno('ativo1');
  await assertSucceeds(setDoc(doc(db, 'progresso/ativo1_m1f1'),
    { respostas: { t2: { jogos: 'Minecraft', series: 'Stranger Things' } }, atualizadoEm: serverTimestamp() }, { merge: true }));
  await assertFails(setDoc(doc(db, 'progresso/ativo1_m1f1'),
    { respostas: 'texto solto', atualizadoEm: serverTimestamp() }, { merge: true }));
});

test('professor apaga alunos e dados só na turma de teste', async () => {
  const db = prof();
  await assertSucceeds(deleteDoc(doc(db, 'progresso/teste1_m1f1')));
  await assertSucceeds(deleteDoc(doc(db, 'alunos/teste1')));
  await assertFails(deleteDoc(doc(db, 'progresso/ativo1_m1f1')));
  await assertFails(deleteDoc(doc(db, 'alunos/outro1')));
});

test('professor move um aluno de turma e libera etapas durante a aula', async () => {
  const db = prof();
  await assertSucceeds(updateDoc(doc(db, 'alunos/ativo1'), { turma: '1B' }));
  await assertSucceeds(updateDoc(doc(db, 'turmas/1A'), { 'liberacoes.m1f1.i4': true }));
  await assertSucceeds(updateDoc(doc(db, 'turmas/1A'), { 'liberacoes.m1f1.i4': false }));
});

test('aluno não altera as liberações da turma', async () => {
  await assertFails(updateDoc(doc(aluno('ativo1'), 'turmas/1A'), { 'liberacoes.m1f1.i4': true }));
});
// ---------- comentários e anotações ----------
test('aluno lê só os comentários visíveis que são dele; anotações nunca', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'comentarios/c1'), { uid: 'ativo1', turma: '1A', marca: 'Atitude colaborativa', texto: 'Ajudou um colega', visivel: true });
    await setDoc(doc(db, 'comentarios/c2'), { uid: 'ativo1', turma: '1A', marca: 'Foco em resultados', texto: 'Entregou fora do prazo', visivel: false });
    await setDoc(doc(db, 'comentarios/c3'), { uid: 'outro1', turma: '1B', marca: 'Visão crítica', texto: 'Questionou', visivel: true });
    await setDoc(doc(db, 'anotacoes/a1'), { uid: 'ativo1', turma: '1A', texto: 'Conversa sobre o grupo' });
  });
  const db = aluno('ativo1');
  await assertSucceeds(getDoc(doc(db, 'comentarios/c1')));
  await assertFails(getDoc(doc(db, 'comentarios/c2')));
  await assertFails(getDoc(doc(db, 'comentarios/c3')));
  await assertFails(getDoc(doc(db, 'anotacoes/a1')));
  await assertFails(getDocs(collection(db, 'anotacoes')));
  await assertFails(setDoc(doc(db, 'comentarios/novo'), { uid: 'ativo1', visivel: true, texto: 'x' }));
  await assertFails(updateDoc(doc(db, 'comentarios/c2'), { visivel: true }));
});

test('professor registra e lê comentários e anotações', async () => {
  const db = prof();
  await assertSucceeds(setDoc(doc(db, 'comentarios/n1'), { uid: 'ativo1', turma: '1A', marca: 'Atitude colaborativa', tipo: 'positivo', texto: 'Ajudou', visivel: false }));
  await assertSucceeds(setDoc(doc(db, 'anotacoes/n1'), { uid: 'ativo1', turma: '1A', texto: 'Conversa' }));
  await assertSucceeds(getDocs(collection(db, 'comentarios')));
  await assertSucceeds(getDocs(collection(db, 'anotacoes')));
  await assertFails(deleteDoc(doc(db, 'comentarios/n1')));
});
// ---------- calendário e plano ----------
test('calendário e plano de datas: só o professor', async () => {
  await assertSucceeds(setDoc(doc(prof(), 'calendario/2027'), { ano: 2027, bimestres: [], semAula: [], eventos: {} }));
  await assertSucceeds(updateDoc(doc(prof(), 'calendario/2027'), { 'eventos.e1': { data: '2027-02-23', titulo: 'Evento', bloqueia: 'dia' } }));
  await assertSucceeds(setDoc(doc(prof(), 'planos/1A'), { fixas: { m1f3: { din: '2027-03-02' } } }, { merge: true }));
  await assertSucceeds(getDoc(doc(prof(), 'planos/1A')));
  await assertFails(getDoc(doc(aluno('ativo1'), 'calendario/2027')));
  await assertFails(getDoc(doc(aluno('ativo1'), 'planos/1A')));
  await assertFails(setDoc(doc(aluno('ativo1'), 'planos/1A'), { fixas: {} }));
  await assertFails(getDoc(doc(anonimo(), 'calendario/2027')));
});
// ---------- AdmBux ----------
const semearLoja = () => env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'economia/geral'), { loja: { t1: { nome: 'CEO de Nada', tipo: 'titulo', preco: 30 }, m1: { nome: 'Moldura de ouro', tipo: 'moldura', preco: 60 } } });
  await setDoc(doc(db, 'carteiras/ativo1'), { uid: 'ativo1', turma: '1A', premios: [{ valor: 10, motivo: 'x', em: 1 }] });
});
const compra = (id, preco, em = 1) => ({ id, preco, em });
const baseCompras = (itens) => ({ uid: 'ativo1', turma: '1A', itens, usando: {}, atualizadoEm: serverTimestamp() });

test('AdmBux: aluno ativo lê a loja e a própria carteira; não lê a de outro nem escreve', async () => {
  await semearLoja();
  await assertSucceeds(getDoc(doc(aluno('ativo1'), 'economia/geral')));
  await assertFails(getDoc(doc(aluno('pend1'), 'economia/geral')));
  await assertSucceeds(getDoc(doc(aluno('ativo1'), 'carteiras/ativo1')));
  await assertFails(getDoc(doc(aluno('outro1'), 'carteiras/ativo1')));
  await assertFails(setDoc(doc(aluno('ativo1'), 'carteiras/ativo1'), { premios: [{ valor: 999, motivo: 'eu mesmo', em: 2 }] }));
  await assertFails(setDoc(doc(aluno('ativo1'), 'economia/geral'), { loja: {} }));
  await assertSucceeds(setDoc(doc(prof(), 'carteiras/ativo1'), { premios: [] }, { merge: true }));
});

test('AdmBux: compra com o preço da loja, um item por vez, sem apagar compras', async () => {
  await semearLoja();
  const db = aluno('ativo1');
  await assertSucceeds(setDoc(doc(db, 'compras/ativo1'), baseCompras([compra('t1', 30)])));
  await assertFails(updateDoc(doc(db, 'compras/ativo1'), { itens: [compra('t1', 30), compra('m1', 1, 2)], atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'compras/ativo1'), { itens: [compra('t1', 30), compra('m1', 60, 2), compra('m1', 60, 3)], atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'compras/ativo1'), { itens: [], atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'compras/ativo1'), { itens: [compra('t1', 30), compra('naoexiste', 0, 2)], atualizadoEm: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, 'compras/ativo1'), { itens: [compra('t1', 30), compra('m1', 60, 2)], atualizadoEm: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, 'compras/ativo1'), { usando: { titulo: 't1' }, atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'compras/ativo1'), { usando: { coroa: 'x' }, atualizadoEm: serverTimestamp() }));
  await assertFails(deleteDoc(doc(db, 'compras/ativo1')));
});

test('AdmBux: ninguém compra em nome de outro; o professor lê as compras', async () => {
  await semearLoja();
  await assertFails(setDoc(doc(aluno('outro1'), 'compras/ativo1'), baseCompras([compra('t1', 30)])));
  await assertFails(setDoc(doc(aluno('pend1'), 'compras/pend1'), { ...baseCompras([]), uid: 'pend1' }));
  await assertSucceeds(setDoc(doc(aluno('ativo1'), 'compras/ativo1'), baseCompras([])));
  await assertSucceeds(getDoc(doc(prof(), 'compras/ativo1')));
  await assertFails(getDoc(doc(aluno('outro1'), 'compras/ativo1')));
});