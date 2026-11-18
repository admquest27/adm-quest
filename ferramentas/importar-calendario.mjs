// Importa o calendário oficial (arquivo JSON) para o banco, usando a conta de serviço.
//
// Uso (no terminal, dentro da pasta site):
//   node ferramentas/importar-calendario.mjs <chave.json> <calendario.json>             (só mostra o que faria)
//   node ferramentas/importar-calendario.mjs <chave.json> <calendario.json> --confirmar (grava)
//
// Preserva os eventos que o professor criou na tela (os que não são do calendário oficial).

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [chave, arquivo, flag] = process.argv.slice(2);
if (!chave || !arquivo) {
  console.error('Uso: node ferramentas/importar-calendario.mjs <chave.json> <calendario.json> [--confirmar]');
  process.exit(1);
}

const json = JSON.parse(readFileSync(arquivo, 'utf8'));
if (json.formato !== 1 || !Array.isArray(json.bimestres) || !json.bimestres.length) {
  console.error('Arquivo fora do formato do calendário.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(chave, 'utf8'))) });
const db = getFirestore();
const ref = db.collection('calendario').doc(String(json.ano));
const atual = await ref.get();
const proprios = Object.entries(atual.exists ? atual.data().eventos ?? {} : {}).filter(([, e]) => e.tipo !== 'oficial');

console.log(`Calendário ${json.ano}: ${json.bimestres.length} bimestres, ${json.semAula?.length ?? 0} períodos sem aula, ${Object.keys(json.eventos ?? {}).length} eventos oficiais.`);
console.log(atual.exists ? `Já existe no banco; os ${proprios.length} evento(s) criados na tela serão preservados.` : 'Ainda não existe no banco.');

if (flag !== '--confirmar') {
  console.log('\nNada foi gravado. Para gravar, rode de novo com --confirmar no final.');
  process.exit(0);
}

const eventos = { ...(json.eventos ?? {}), ...Object.fromEntries(proprios) };
await ref.set({ ano: json.ano, bimestres: json.bimestres, semAula: json.semAula ?? [], eventos, atualizadoEm: FieldValue.serverTimestamp() });
console.log('\nGravado.');
