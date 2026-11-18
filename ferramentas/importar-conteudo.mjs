// Importa o conteúdo de um mundo (arquivo JSON) para o banco, usando a conta de serviço.
//
// Uso (no terminal, dentro da pasta site):
//   node ferramentas/importar-conteudo.mjs <chave.json> <conteudo.json>             (só mostra o que mudaria)
//   node ferramentas/importar-conteudo.mjs <chave.json> <conteudo.json> --confirmar (grava)
//
// A chave da conta de serviço fica FORA do repositório (por exemplo, C:\dev\segredos\).
// Só escreve conteúdo (mundo, fases e notas do professor). Nunca toca em dados de alunos.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { parteAluno, estavel } from '../src/fases.js';

const [chave, arquivo, flag] = process.argv.slice(2);
if (!chave || !arquivo) {
  console.error('Uso: node ferramentas/importar-conteudo.mjs <chave.json> <conteudo.json> [--confirmar]');
  process.exit(1);
}

const json = JSON.parse(readFileSync(arquivo, 'utf8'));
if (json.formato !== 1 || !json.mundo?.id || !Array.isArray(json.fases) || !json.fases.length) {
  console.error('Arquivo fora do formato de conteúdo do jogo.');
  process.exit(1);
}
const ids = new Set();
for (const f of json.fases) {
  if (!/^[a-z0-9]{2,20}$/.test(f.id ?? '') || !f.nome || ids.has(f.id)) { console.error(`Fase inválida ou repetida: ${f.id}`); process.exit(1); }
  ids.add(f.id);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(chave, 'utf8'))) });
const db = getFirestore();
const mundoId = json.mundo.id;

console.log(`Mundo: ${json.mundo.nome} (${mundoId}) · ${json.fases.length} fase(s)\n`);
for (const f of json.fases) {
  const atual = await db.collection('fases').doc(f.id).get();
  let estado = 'NOVA';
  if (atual.exists) estado = estavel(parteAluno(atual.data(), mundoId)) === estavel(parteAluno(f, mundoId)) ? 'igual' : 'ALTERADA';
  const novas = parteAluno(f, mundoId).etapas.length;
  const antigas = atual.exists ? parteAluno(atual.data(), mundoId).etapas.length : 0;
  console.log(`  ${f.id.padEnd(9)} ${f.nome.padEnd(26)} ${estado.padEnd(8)} etapas: ${antigas} -> ${novas}`);
}

if (flag !== '--confirmar') {
  console.log('\nNada foi gravado. Para gravar, rode de novo com --confirmar no final.');
  process.exit(0);
}

const m = json.mundo;
const lote = db.batch();
lote.set(db.collection('mundos').doc(mundoId), {
  nome: m.nome ?? '', ordem: m.ordem ?? 1, pergunta: m.pergunta ?? '', competencias: m.competencias ?? [],
  guia: m.guia ?? '', chefao: m.chefao ?? '', habilidades: m.habilidades ?? {}, textos: m.textos ?? {}, atualizadoEm: FieldValue.serverTimestamp(),
});
for (const f of json.fases) {
  // set sem merge: substitui o documento inteiro, removendo campos antigos (instrucoes, tarefas)
  lote.set(db.collection('fases').doc(f.id), { ...parteAluno(f, mundoId), atualizadoEm: FieldValue.serverTimestamp() });
  lote.set(db.collection('fasesProfessor').doc(f.id), { mundo: mundoId, professor: f.professor ?? {}, atualizadoEm: FieldValue.serverTimestamp() });
}
await lote.commit();
console.log(`\nGravado: ${json.fases.length} fase(s).`);
