// Backup completo do banco, gravado pelo professor numa pasta do OneDrive (ou baixado), e restauração.
// A turma de teste fica de fora. Datas do Firestore viram { __ts: milissegundos } e voltam na restauração.
import { collection, doc, getDocs, setDoc, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';

export const COLECOES = [
  'turmas', 'codigos', 'alunos', 'mundos', 'fases', 'fasesProfessor', 'progresso', 'avaliacoes', 'comentarios', 'anotacoes',
  'calendario', 'planos', 'economia', 'carteiras', 'compras', 'perfis', 'grupos', 'vagas', 'votacoes', 'votos', 'chaves', 'acertos',
];
// coleções em que o id do documento é a própria turma
const ID_E_TURMA = new Set(['turmas', 'planos']);

const codificar = (v) => {
  if (v instanceof Timestamp) return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(codificar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, codificar(x)]));
  return v;
};
const decodificar = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.__ts === 'number') return Timestamp.fromMillis(v.__ts);
  if (Array.isArray(v)) return v.map(decodificar);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decodificar(x)]));
  return v;
};

export async function gerarBackup() {
  const snaps = await Promise.all(COLECOES.map((c) => getDocs(collection(db, c))));
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
  return { formato: 1, app: 'adm-quest', geradoEm: new Date().toISOString(), total, colecoes };
}

// ---------- pasta do OneDrive (Chrome e Edge no computador) ----------
const temPasta = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

function idb(modo, fn) {
  return new Promise((ok, erro) => {
    const r = indexedDB.open('admq-backup', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('pasta');
    r.onerror = () => erro(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction('pasta', modo);
      const req = fn(tx.objectStore('pasta'));
      tx.oncomplete = () => ok(req?.result);
      tx.onerror = () => erro(tx.error);
    };
  });
}
const lerPasta = () => idb('readonly', (s) => s.get('pasta')).catch(() => null);
const guardarPasta = (h) => idb('readwrite', (s) => s.put(h, 'pasta')).catch(() => null);

async function pastaComPermissao(trocar = false) {
  let h = trocar ? null : await lerPasta();
  if (h && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await h.requestPermission({ mode: 'readwrite' })) !== 'granted') h = null;
  if (!h) {
    h = await window.showDirectoryPicker({ id: 'admq-backup', mode: 'readwrite', startIn: 'documents' });
    await guardarPasta(h);
  }
  return h;
}

const nomeArquivo = () => `adm-quest-backup-${new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', 'h')}.json`;

// Gera, grava e registra a data. Devolve a mensagem para a tela.
export async function fazerBackup({ trocarPasta = false } = {}) {
  // a pasta vem primeiro: o navegador só abre o seletor logo depois do toque
  const pasta = temPasta() ? await pastaComPermissao(trocarPasta) : null;
  const b = await gerarBackup();
  const texto = JSON.stringify(b);
  const nome = nomeArquivo();
  let onde;
  if (pasta) {
    const arq = await pasta.getFileHandle(nome, { create: true });
    const w = await arq.createWritable();
    await w.write(texto);
    await w.close();
    onde = `na pasta "${pasta.name}"`;
  } else {
    const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    onde = 'nos downloads (mova o arquivo para o OneDrive)';
  }
  await setDoc(doc(db, 'config', 'backup'), { ultimo: serverTimestamp(), documentos: b.total }, { merge: true });
  return `Backup feito: ${b.total} documento(s) ${onde}.`;
}

export function diasDesde(ts) {
  if (!ts?.toMillis) return null;
  return Math.floor((Date.now() - ts.toMillis()) / 86400000);
}

export function htmlAvisoBackup(cfg) {
  const d = diasDesde(cfg?.ultimo);
  if (d !== null && d <= 7) return '';
  return `<p class="aviso-backup">${d === null ? 'Nenhum backup feito ainda.' : `O último backup foi há ${d} dias.`} <button class="mini" data-acao="backup">Fazer agora</button></p>`;
}

export function htmlSecaoBackup(cfg, previa) {
  const d = diasDesde(cfg?.ultimo);
  return `<h2>Backup</h2>
    <p class="nota">${d === null ? 'Nenhum backup feito ainda.' : `Último backup: há ${d} dia(s), com ${cfg.documentos ?? '?'} documento(s).`} Faça pelo menos um por semana. A turma de teste fica de fora.</p>
    <p class="nota">${temPasta() ? 'No computador (Chrome ou Edge), o arquivo vai direto para a pasta que você escolher uma vez, por exemplo uma pasta "ADM Quest backups" no OneDrive.' : 'Neste aparelho, o arquivo vai para os downloads. Para gravar direto no OneDrive, use o computador com Chrome ou Edge.'}</p>
    <div class="linha-btn"><button class="botao" data-acao="backup">Fazer backup agora</button>${temPasta() ? '<button class="mini" data-acao="backup-pasta">Escolher outra pasta</button>' : ''}</div>
    <h3>Restaurar</h3>
    <p class="nota">Só em caso de problema. Grava de volta todos os documentos do arquivo; o que foi criado depois do backup continua no banco.</p>
    <input type="file" id="arq-backup" accept=".json,application/json">
    ${previa ? `<div class="previa"><p><strong>${esc(previa.nome)}</strong>: backup de ${esc(new Date(previa.json.geradoEm).toLocaleString('pt-BR'))}, ${previa.json.total} documento(s).</p>
      <ul class="nota">${Object.entries(previa.json.colecoes).filter(([, v]) => Object.keys(v).length).map(([k, v]) => `<li>${esc(k)}: ${Object.keys(v).length}</li>`).join('')}</ul>
      <label for="conf-rest">Para confirmar, digite RESTAURAR</label><input id="conf-rest" autocomplete="off">
      <div class="linha-btn"><button class="botao ruim-fundo" data-acao="restaurar">Restaurar este backup</button><button class="botao secundario" data-acao="restaurar-cancelar">Cancelar</button></div></div>` : ''}`;
}

export async function lerArquivoBackup(arquivo) {
  const json = JSON.parse(await arquivo.text());
  if (json?.formato !== 1 || json.app !== 'adm-quest' || typeof json.colecoes !== 'object') throw new Error('formato');
  return { nome: arquivo.name, json };
}

export async function restaurar(json) {
  let lote = writeBatch(db);
  let n = 0;
  let total = 0;
  for (const [nome, docs] of Object.entries(json.colecoes)) {
    if (!COLECOES.includes(nome)) continue;
    for (const [id, dados] of Object.entries(docs)) {
      lote.set(doc(db, nome, id), decodificar(dados));
      n += 1; total += 1;
      if (n === 450) { await lote.commit(); lote = writeBatch(db); n = 0; }
    }
  }
  if (n) await lote.commit();
  return total;
}
