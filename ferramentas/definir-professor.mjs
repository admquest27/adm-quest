// Marca uma conta como "professor" no Firebase (custom claim).
//
// Uso (no terminal, dentro da pasta site):
//   node ferramentas/definir-professor.mjs <e-mail-da-conta> <caminho-da-chave.json>
//
// A chave da conta de serviço fica FORA do repositório (por exemplo, C:\dev\segredos\).
// O e-mail é digitado no comando e não é gravado em nenhum arquivo.

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [email, caminhoChave] = process.argv.slice(2);

if (!email || !caminhoChave) {
  console.error('Uso: node ferramentas/definir-professor.mjs <e-mail> <caminho-da-chave.json>');
  process.exit(1);
}

const chave = JSON.parse(readFileSync(caminhoChave, 'utf8'));
initializeApp({ credential: cert(chave) });
const auth = getAuth();

let usuario;
try {
  usuario = await auth.getUserByEmail(email);
} catch {
  console.error('Não achei essa conta. Entre uma vez no jogo com ela e tente de novo.');
  process.exit(1);
}

console.log(`Projeto: ${chave.project_id}`);
console.log(`Conta encontrada: ${usuario.email}`);
console.log('Vou marcar esta conta como PROFESSOR (acesso total ao banco).');

const leitor = createInterface({ input: process.stdin, output: process.stdout });
const resposta = (await leitor.question('Confirma? (digite sim): ')).trim().toLowerCase();
leitor.close();

if (resposta !== 'sim') {
  console.log('Cancelado. Nada foi alterado.');
  process.exit(0);
}

await auth.setCustomUserClaims(usuario.uid, { professor: true });
console.log('Pronto. Saia do jogo e entre de novo para a marca valer.');
