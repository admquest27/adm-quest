import { signOut } from 'firebase/auth';
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, writeBatch,
  arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { app, tela, esc, hoje, guardar, ler } from './ui.js';
import { imgAvatar } from './avatar.js';

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROTULO = { pendente: 'Pendente', ativo: 'Ativo', saiu: 'Saiu', bloqueado: 'Bloqueado' };

function codigoAleatorio() {
  const n = new Uint32Array(5);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join('');
}

function numeroOuNulo(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function ordenar(alunos) {
  const peso = { pendente: 0, ativo: 1, bloqueado: 2, saiu: 3 };
  return [...alunos].sort((a, b) =>
    (peso[a.status] ?? 9) - (peso[b.status] ?? 9)
    || (a.numeroChamada ?? 999) - (b.numeroChamada ?? 999)
    || String(a.apelido).localeCompare(String(b.apelido), 'pt-BR'));
}

export function iniciarProfessor() {
  const st = {
    aba: ler('aba') || 'turma',
    turma: ler('turma') || '',
    turmas: [],
    alunos: [],
    data: hoje(),
    chamada: [],
    aviso: '',
    carregou: { turmas: false, alunos: false },
  };
  const paradas = [];
  let paraChamada = null;
  let dlg = document.getElementById('dlg');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'dlg';
    document.body.appendChild(dlg);
  }

  // ---------- dados em tempo real ----------
  paradas.push(onSnapshot(collection(db, 'turmas'), (s) => {
    st.turmas = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.id.localeCompare(b.id));
    if (!st.turmas.some((t) => t.id === st.turma)) st.turma = st.turmas[0]?.id ?? '';
    st.carregou.turmas = true;
    assinarChamada();
    desenhar();
  }, () => { st.aviso = 'Não consegui ler as turmas.'; desenhar(); }));

  paradas.push(onSnapshot(collection(db, 'alunos'), (s) => {
    st.alunos = s.docs.map((d) => ({ uid: d.id, ...d.data() }));
    st.carregou.alunos = true;
    desenhar();
  }, () => { st.aviso = 'Não consegui ler os alunos.'; desenhar(); }));

  function assinarChamada() {
    if (paraChamada) { paraChamada(); paraChamada = null; }
    if (!st.turma) { st.chamada = []; return; }
    paraChamada = onSnapshot(doc(db, 'chamadas', `${st.turma}_${st.data}`), (s) => {
      st.chamada = s.exists() ? (s.data().faltas ?? []) : [];
      if (st.aba === 'chamada') desenhar();
    }, () => {});
  }

  // ---------- telas ----------
  const pendentesTotal = () => st.alunos.filter((a) => a.status === 'pendente').length;

  function desenhar() {
    if (!st.carregou.turmas || !st.carregou.alunos) {
      tela('<p class="carregando">Conferindo a turma...</p>', 'centro');
      return;
    }
    // não apaga o que o professor está digitando no formulário de nova turma
    const ativo = document.activeElement;
    if (st.aba === 'turmas' && ativo && ativo.closest && ativo.closest('#form-turma')) return;
    const pend = pendentesTotal();
    const aba = st.aba;
    tela(
      `<header class="topo">
        <strong>ADM Quest</strong>
        <select id="sel-turma" aria-label="Turma">
          ${st.turmas.length ? st.turmas.map((t) => `<option value="${esc(t.id)}" ${t.id === st.turma ? 'selected' : ''}>${esc(t.nome || t.id)}${t.teste ? ' (teste)' : ''}</option>`).join('') : '<option value="">Sem turmas</option>'}
        </select>
        <button id="sair" class="mini">Sair</button>
      </header>
      ${st.aviso ? `<p class="aviso">${esc(st.aviso)}</p>` : ''}
      <main class="corpo">${aba === 'turma' ? htmlTurma() : aba === 'chamada' ? htmlChamada() : htmlTurmas()}</main>
      <nav class="abas" aria-label="Seções">
        <button data-acao="aba" data-v="turma" class="${aba === 'turma' ? 'sel' : ''}">Turma${pend ? ` <span class="bolha">${pend}</span>` : ''}</button>
        <button data-acao="aba" data-v="chamada" class="${aba === 'chamada' ? 'sel' : ''}">Chamada</button>
        <button data-acao="aba" data-v="turmas" class="${aba === 'turmas' ? 'sel' : ''}">Turmas</button>
      </nav>`,
      'pagina'
    );
  }

  function alunosDaTurma() {
    return ordenar(st.alunos.filter((a) => a.turma === st.turma));
  }

  function htmlTurma() {
    if (!st.turmas.length) return '<p class="vazio">Você ainda não tem turmas. Crie a primeira na aba Turmas.</p>';
    const lista = alunosDaTurma();
    const ativos = lista.filter((a) => a.status === 'ativo').length;
    const linhas = lista.map((a) => `
      <li class="aluno" data-acao="editar" data-uid="${esc(a.uid)}">
        <span class="num">${a.numeroChamada ?? '—'}</span>
        ${a.avatar ? imgAvatar(a.avatar, 'avatar p') : '<span class="avatar p vazio-av"></span>'}
        <span class="nome">${esc(a.apelido)}</span>
        <span class="chip ${esc(a.status)}">${esc(ROTULO[a.status] ?? a.status)}</span>
        ${a.status === 'pendente' ? `<button class="mini ok" data-acao="aprovar" data-uid="${esc(a.uid)}">Aprovar</button><button class="mini ruim" data-acao="recusar" data-uid="${esc(a.uid)}">Recusar</button>` : ''}
      </li>`).join('');
    const orfaos = st.alunos.filter((a) => !a.turma);
    const htmlOrfaos = orfaos.length ? `<h2>Cadastros sem turma (testes antigos)</h2>
      <ul class="lista">${orfaos.map((a) => `<li class="aluno"><span class="nome">Cadastro de teste</span><span class="chip">${esc(ROTULO[a.status] ?? a.status)}</span><button class="mini ruim" data-acao="recusar" data-uid="${esc(a.uid)}">Apagar</button></li>`).join('')}</ul>` : '';
    return `<h2>${lista.length} cadastro(s) · ${ativos} ativo(s)</h2>
      <ul class="lista">${linhas || '<li class="vazio">Nenhum aluno ainda. Passe o código da turma.</li>'}</ul>${htmlOrfaos}`;
  }

  function htmlChamada() {
    if (!st.turma) return '<p class="vazio">Crie uma turma primeiro.</p>';
    const lista = alunosDaTurma().filter((a) => a.status === 'ativo');
    const faltas = st.chamada.filter((u) => lista.some((a) => a.uid === u)).length;
    const linhas = lista.map((a) => {
      const falta = st.chamada.includes(a.uid);
      return `<li><button class="falta ${falta ? 'sim' : ''}" data-acao="falta" data-uid="${esc(a.uid)}">
        <span class="num">${a.numeroChamada ?? '—'}</span><span class="nome">${esc(a.apelido)}</span><span class="marca">${falta ? 'Faltou' : 'Presente'}</span></button></li>`;
    }).join('');
    return `<div class="linha-data"><label for="data">Dia</label><input type="date" id="data" value="${esc(st.data)}"></div>
      <h2>${faltas} falta(s) de ${lista.length}</h2>
      <p class="nota">Toque só em quem faltou.</p>
      <ul class="lista">${linhas || '<li class="vazio">Nenhum aluno ativo nesta turma.</li>'}</ul>`;
  }

  function htmlTurmas() {
    const cartoes = st.turmas.map((t) => `
      <li class="turma-card">
        <div><strong>${esc(t.nome || t.id)}</strong> <span class="nota">(${esc(t.id)})${t.teste ? ' · teste' : ''}</span></div>
        <div class="codigo">${esc(t.codigo)}</div>
        <div class="linha-btn">
          <button class="mini ${t.aberta ? 'ok' : 'ruim'}" data-acao="aberta" data-id="${esc(t.id)}">${t.aberta ? 'Aberta para cadastros' : 'Fechada'}</button>
          <button class="mini" data-acao="codigo" data-id="${esc(t.id)}">Trocar código</button>
        </div>
      </li>`).join('');
    return `<h2>Turmas</h2>
      <ul class="lista">${cartoes || '<li class="vazio">Nenhuma turma ainda.</li>'}</ul>
      <h2>Nova turma</h2>
      <form id="form-turma" class="form" autocomplete="off">
        <label for="t-id">Identificação (ex.: 1A)</label>
        <input id="t-id" maxlength="12" required>
        <label for="t-nome">Nome (ex.: 1º ano A)</label>
        <input id="t-nome" maxlength="40" required>
        <label for="t-codigo">Código de entrada</label>
        <input id="t-codigo" maxlength="10" value="${codigoAleatorio()}" required>
        <label class="check"><input type="checkbox" id="t-teste"> Turma de teste (fica fora de relatórios e backups)</label>
        <button class="botao" type="submit">Criar turma</button>
        <p class="erro" id="msg-turma"></p>
      </form>`;
  }

  // ---------- ações ----------
  function falha(texto) { st.aviso = texto; desenhar(); setTimeout(() => { if (st.aviso === texto) { st.aviso = ''; desenhar(); } }, 6000); }

  app.onclick = async (e) => {
    if (e.target.id === 'sair') { signOut(auth); return; }
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const acao = b.dataset.acao;
    try {
      if (acao === 'aba') { st.aba = b.dataset.v; guardar('aba', st.aba); desenhar(); }
      else if (acao === 'aprovar') { e.stopPropagation(); await updateDoc(doc(db, 'alunos', b.dataset.uid), { status: 'ativo', dataEntrada: hoje() }); }
      else if (acao === 'recusar') {
        e.stopPropagation();
        if (confirm('Recusar este cadastro? O aluno poderá se cadastrar de novo.')) await deleteDoc(doc(db, 'alunos', b.dataset.uid));
      }
      else if (acao === 'editar') { abrirEdicao(b.dataset.uid); }
      else if (acao === 'falta') {
        const uid = b.dataset.uid;
        const ref = doc(db, 'chamadas', `${st.turma}_${st.data}`);
        const faltou = st.chamada.includes(uid);
        await setDoc(ref, { turma: st.turma, data: st.data, faltas: faltou ? arrayRemove(uid) : arrayUnion(uid) }, { merge: true });
      }
      else if (acao === 'aberta') {
        const t = st.turmas.find((x) => x.id === b.dataset.id);
        const nova = !t.aberta;
        const lote = writeBatch(db);
        lote.update(doc(db, 'turmas', t.id), { aberta: nova });
        lote.update(doc(db, 'codigos', t.codigo), { aberta: nova });
        await lote.commit();
      }
      else if (acao === 'codigo') { await trocarCodigo(b.dataset.id); }
    } catch { falha('Não consegui salvar essa alteração. Tente de novo.'); }
  };

  app.onchange = (e) => {
    if (e.target.id === 'sel-turma') { st.turma = e.target.value; guardar('turma', st.turma); assinarChamada(); desenhar(); }
    else if (e.target.id === 'data') { if (e.target.value) { st.data = e.target.value; assinarChamada(); desenhar(); } }
  };

  app.onsubmit = async (e) => {
    if (e.target.id !== 'form-turma') return;
    e.preventDefault();
    const msg = document.getElementById('msg-turma');
    const id = document.getElementById('t-id').value.trim().toUpperCase();
    const nome = document.getElementById('t-nome').value.trim();
    const codigo = document.getElementById('t-codigo').value.trim().toUpperCase();
    const teste = document.getElementById('t-teste').checked;
    if (!/^[A-Z0-9_-]{1,12}$/.test(id)) { msg.textContent = 'A identificação usa só letras, números, - ou _.'; return; }
    if (!/^[A-Z0-9]{4,10}$/.test(codigo)) { msg.textContent = 'O código tem de 4 a 10 letras ou números.'; return; }
    if (st.turmas.some((t) => t.id === id)) { msg.textContent = 'Já existe uma turma com essa identificação.'; return; }
    try {
      if ((await getDoc(doc(db, 'codigos', codigo))).exists()) { msg.textContent = 'Esse código já está em uso. Escolha outro.'; return; }
      const lote = writeBatch(db);
      lote.set(doc(db, 'turmas', id), { nome, codigo, aberta: true, teste, criadoEm: serverTimestamp() });
      lote.set(doc(db, 'codigos', codigo), { turma: id, aberta: true });
      await lote.commit();
      st.turma = id; guardar('turma', id);
    } catch { msg.textContent = 'Não consegui criar a turma agora.'; }
  };

  async function trocarCodigo(id) {
    const t = st.turmas.find((x) => x.id === id);
    const novo = (prompt('Novo código de entrada (4 a 10 letras ou números):', codigoAleatorio()) || '').trim().toUpperCase();
    if (!novo) return;
    if (!/^[A-Z0-9]{4,10}$/.test(novo)) { falha('O código precisa ter de 4 a 10 letras ou números.'); return; }
    if ((await getDoc(doc(db, 'codigos', novo))).exists()) { falha('Esse código já está em uso.'); return; }
    const lote = writeBatch(db);
    lote.delete(doc(db, 'codigos', t.codigo));
    lote.set(doc(db, 'codigos', novo), { turma: t.id, aberta: t.aberta === true });
    lote.update(doc(db, 'turmas', t.id), { codigo: novo });
    await lote.commit();
  }

  function abrirEdicao(uid) {
    const a = st.alunos.find((x) => x.uid === uid);
    if (!a) return;
    dlg.innerHTML = `
      <form method="dialog" class="form" id="form-aluno">
        <h2>${esc(a.apelido)}</h2>
        <label for="e-apelido">Apelido</label>
        <input id="e-apelido" maxlength="16" value="${esc(a.apelido)}" required>
        <label for="e-num">Número de chamada</label>
        <input id="e-num" type="number" min="1" inputmode="numeric" value="${a.numeroChamada ?? ''}">
        <label for="e-entrada">Data de entrada</label>
        <input id="e-entrada" type="date" value="${esc(a.dataEntrada ?? '')}">
        <label for="e-status">Situação</label>
        <select id="e-status">
          ${['pendente', 'ativo', 'bloqueado', 'saiu'].map((s) => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${ROTULO[s]}</option>`).join('')}
        </select>
        <p class="erro" id="e-msg"></p>
        <div class="linha-btn">
          <button class="botao" type="submit" value="salvar">Salvar</button>
          <button class="botao secundario" type="button" id="e-cancelar">Cancelar</button>
        </div>
      </form>`;
    document.getElementById('e-cancelar').onclick = () => dlg.close();
    document.getElementById('form-aluno').onsubmit = async (ev) => {
      ev.preventDefault();
      const msg = document.getElementById('e-msg');
      const apelido = document.getElementById('e-apelido').value.trim();
      const numero = numeroOuNulo(document.getElementById('e-num').value);
      const status = document.getElementById('e-status').value;
      const entrada = document.getElementById('e-entrada').value;
      if (apelido.length < 2) { msg.textContent = 'O apelido precisa ter ao menos 2 letras.'; return; }
      if (numero !== null) {
        const outro = st.alunos.find((x) => x.turma === a.turma && x.uid !== a.uid && x.numeroChamada === numero);
        if (outro) { msg.textContent = `O número ${numero} já é de ${outro.apelido}.`; return; }
      }
      const campos = { apelido, status, numeroChamada: numero, dataEntrada: entrada || null };
      if (status === 'saiu' && a.status !== 'saiu') campos.dataSaida = hoje();
      try { await updateDoc(doc(db, 'alunos', a.uid), campos); dlg.close(); }
      catch { msg.textContent = 'Não consegui salvar agora.'; }
    };
    dlg.showModal();
  }

  return () => {
    paradas.forEach((p) => p());
    if (paraChamada) paraChamada();
    app.onclick = null; app.onchange = null; app.onsubmit = null;
    if (dlg.open) dlg.close();
  };
}
