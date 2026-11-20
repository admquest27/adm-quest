// Backup completo do banco pelo terminal (mesmo formato do botão da tela do professor), sem a turma de teste.
//
// Uso (dentro da pasta site):
//   node ferramentas/backup.mjs <chave.json> <arquivo-de-saida.json>
//   node ferramentas/backup.mjs <chave.json> <arquivo-de-saida.enc> --cifrar      (usa a senha da variável BACKUP_SENHA)
//   node ferramentas/backup.mjs --abrir <arquivo.enc> <arquivo-de-saida.json>      (decifra com BACKUP_SENHA)
//
// O arquivo cifrado (AES-256-GCM, chave derivada da senha com scrypt) não pode ser lido sem a senha.

import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';

const COLECOES = [
  'turmas', 'codigos', 'alunos', 'mundos', 'fases', 'fasesProfessor', 'progresso', 'avaliacoes', 'comentarios', 'anotacoes',
  'calendario', 'planos', 'economia', 'carteiras', 'compras', 'perfis', 'grupos', 'vagas', 'votacoes', 'votos', 'chaves', 'acertos', 'fechamentos',
];
const ID_E_TURMA = new Set(['turmas', 'planos']);
const args = process.argv.slice(2);

function senha() {
  const s = process.env.BACKUP_SENHA;
  if (!s || s.length < 12) { console.error('Defina BACKUP_SENHA com pelo menos 12 caracteres.'); process.exit(1); }
  return s;
}

if (args[0] === '--abrir') {
  const [, entrada, saida] = args;
  const buf = readFileSync(entrada);
  const [sal, iv, tag, dados] = [buf.subarray(0, 16), buf.subarray(16, 28), buf.subarray(28, 44), buf.subarray(44)];
  const d = createDecipheriv('aes-256-gcm', scryptSync(senha(), sal, 32), iv);
  d.setAuthTag(tag);
  writeFileSync(saida, Buffer.concat([d.update(dados), d.final()]));
  console.log(`Decifrado em ${saida}.`);
  process.exit(0);
}

const [chave, saida, flag] = args;
if (!chave || !saida) { console.error('Uso: node ferramentas/backup.mjs <chave.json> <saida> [--cifrar]'); process.exit(1); }

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
initializeApp({ credential: cert(JSON.parse(chave.trim().startsWith('{') ? chave : readFileSync(chave, 'utf8'))) });
const db = getFirestore();

const codificar = (v) => {
  if (v instanceof Timestamp) return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(codificar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, codificar(x)]));
  return v;
};

const snaps = await Promise.all(COLECOES.map((c) => db.collection(c).get()));
const teste = new Set(snaps[0].docs.filter((d) => d.data().teste === true).map((d) => d.id));
const colecoes = {};
let total = 0;
COLECOES.forEach((nome, i) => {
  colecoes[nome] = {};
  for (const d of snaps[i].docs) {
    const dados = d.data();
    if (teste.has(dados.turma) || (ID_E_TURMA.has(nome) && teste.has(d.id))) continue;
    colecoes[nome][d.id] = codificar(dados);
    total += 1;
  }
});
const texto = JSON.stringify({ formato: 1, app: 'adm-quest', geradoEm: new Date().toISOString(), total, colecoes });

if (flag === '--cifrar') {
  const sal = randomBytes(16);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', scryptSync(senha(), sal, 32), iv);
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  writeFileSync(saida, Buffer.concat([sal, iv, c.getAuthTag(), dados]));
} else {
  writeFileSync(saida, texto);
}
console.log(`Backup: ${total} documento(s) em ${saida}${flag === '--cifrar' ? ' (cifrado)' : ''}.`);
