// Importa a loja, as conquistas, os valores e as dicas das AdmBux (arquivo JSON) para o banco.
//
// Uso (no terminal, dentro da pasta site):
//   node ferramentas/importar-economia.mjs <chave.json> <economia.json>             (só mostra o que mudaria)
//   node ferramentas/importar-economia.mjs <chave.json> <economia.json> --confirmar (grava)
//
// Mudar o preço de um item não muda o que já foi comprado. Nunca toca em dados de alunos.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [chave, arquivo, flag] = process.argv.slice(2);
if (!chave || !arquivo) {
  console.error('Uso: node ferramentas/importar-economia.mjs <chave.json> <economia.json> [--confirmar]');
  process.exit(1);
}

const json = JSON.parse(readFileSync(arquivo, 'utf8'));
if (json.formato !== 1 || typeof json.loja !== 'object') { console.error('Arquivo fora do formato da economia.'); process.exit(1); }
for (const [id, i] of Object.entries(json.loja)) {
  if (!/^[a-z0-9-]{2,30}$/.test(id) || !['titulo', 'moldura', 'fundo'].includes(i.tipo) || !Number.isInteger(i.preco) || i.preco < 0 || !i.nome) {
    console.error(`Item inválido: ${id}`); process.exit(1);
  }
}

initializeApp({ credential: cert(JSON.parse(readFileSync(chave, 'utf8'))) });
const db = getFirestore();
const ref = db.collection('economia').doc('geral');
const atual = (await ref.get()).data() ?? {};

console.log(`Loja: ${Object.keys(json.loja).length} item(ns) · conquistas: ${Object.keys(json.conquistas ?? {}).length} · dicas: ${(json.dicas ?? []).length}`);
for (const [id, i] of Object.entries(json.loja)) {
  const a = atual.loja?.[id];
  const estado = !a ? 'NOVO' : JSON.stringify(a) === JSON.stringify(i) ? 'igual' : `ALTERADO${a.preco !== i.preco ? ` (preço ${a.preco} -> ${i.preco})` : ''}`;
  console.log(`  ${id.padEnd(14)} ${i.nome.padEnd(22)} ${String(i.preco).padStart(3)} ${estado}`);
}
const sumidos = Object.keys(atual.loja ?? {}).filter((id) => !json.loja[id]);
if (sumidos.length) console.log(`\n  Itens no banco que não estão no arquivo (ficam fora da venda, mas quem comprou continua com eles): ${sumidos.join(', ')}`);

if (flag !== '--confirmar') { console.log('\nNada foi gravado. Para gravar, rode de novo com --confirmar no final.'); process.exit(0); }

// item que sai do arquivo continua no banco como inativo, para o nome aparecer no extrato de quem comprou
const loja = { ...json.loja };
for (const id of sumidos) loja[id] = { ...atual.loja[id], ativo: false };
await ref.set({ valores: json.valores ?? {}, loja, conquistas: json.conquistas ?? {}, dicas: json.dicas ?? [], atualizadoEm: FieldValue.serverTimestamp() });
console.log('\nGravado.');
