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
    await setDoc(doc(db, 'turmas/1A'), { nome: '1º ano A', codigo: 'ABC12', aberta: true, teste: false });
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
  await assertSucceeds(setDoc(doc(db, 'chamadas/1A_2027-02-09'), { turma: '1A', data: '2027-02-09', faltas: [] }));
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
