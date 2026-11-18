import { signOut } from 'firebase/auth';
import {
  collection, doc, onSnapshot, query, where, setDoc, updateDoc, deleteDoc, getDoc, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { app, tela, esc, hoje, guardar, ler } from './ui.js';
import { imgAvatar } from './avatar.js';
import {
  MUNDO, ESTADOS, ESTADO_ROTULO, SITUACAO_ROTULO, progId, contarTarefas, situacao, estavel, parteAluno,
  normInstrucoes, normMateriais, liberado,
} from './fases.js';

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROTULO = { pendente: 'Pendente', ativo: 'Ativo', saiu: 'Saiu', bloqueado: 'Bloqueado' };
const ABAS = ['turma', 'fases', 'turmas', 'conteudo'];

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

const linhasDe = (txt) => String(txt ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

function paraLinks(txt) {
  return linhasDe(txt).map((l) => {
    const [a, ...b] = l.split('|');
    const url = (b.length ? b.join('|') : a).trim();
    return { titulo: (b.length ? a : url).trim(), url };
  }).filter((l) => /^https?:\/\//i.test(l.url));
}

const deLinks = (lista) => (lista ?? []).map((l) => `${l.titulo} | ${l.url}`).join('\n');

export function iniciarProfessor() {
  const st = {
    aba: ABAS.includes(ler('aba')) ? ler('aba') : 'turma',
    turma: ler('turma') || '',
    turmas: [], alunos: [], fases: [], mundo: null,
    progresso: {}, aval: {}, profFase: null,
    faseSel: null, importacao: null, aviso: '',
    carregou: { turmas: false, alunos: false },
  };
  const paradas = [];
  let paradasTurma = [];
  let turmaLigada = null;
  let paraProf = null;
  let profLigada = null;
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
    ligarTurma();
    desenhar();
  }, () => { st.aviso = 'Não consegui ler as turmas.'; desenhar(); }));

  paradas.push(onSnapshot(collection(db, 'alunos'), (s) => {
    st.alunos = s.docs.map((d) => ({ uid: d.id, ...d.data() }));
    st.carregou.alunos = true;
    desenhar();
  }, () => { st.aviso = 'Não consegui ler os alunos.'; desenhar(); }));

  paradas.push(onSnapshot(query(collection(db, 'fases'), where('mundo', '==', MUNDO)), (s) => {
    st.fases = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.ordem - b.ordem);
    desenhar();
  }, () => {}));

  paradas.push(onSnapshot(doc(db, 'mundos', MUNDO), (s) => {
    st.mundo = s.exists() ? s.data() : null;
    desenhar();
  }, () => {}));

  function ligarTurma() {
    if (turmaLigada === st.turma) return;
    turmaLigada = st.turma;
    paradasTurma.forEach((p) => p());
    paradasTurma = [];
    st.progresso = {}; st.aval = {};
    if (!st.turma) return;
    paradasTurma.push(onSnapshot(query(collection(db, 'progresso'), where('turma', '==', st.turma)), (s) => {
      st.progresso = {}; s.docs.forEach((d) => { st.progresso[d.id] = d.data(); }); desenhar();
    }, () => {}));
    paradasTurma.push(onSnapshot(query(collection(db, 'avaliacoes'), where('turma', '==', st.turma)), (s) => {
      st.aval = {}; s.docs.forEach((d) => { st.aval[d.id] = d.data(); }); desenhar();
    }, () => {}));
  }

  // notas do professor da fase aberta no painel
  function ligarProf() {
    if (profLigada === st.faseSel) return;
    profLigada = st.faseSel;
    if (paraProf) { paraProf(); paraProf = null; }
    st.profFase = null;
    if (!st.faseSel) return;
    paraProf = onSnapshot(doc(db, 'fasesProfessor', st.faseSel), (s) => { st.profFase = s.exists() ? s.data() : null; desenhar(); }, () => {});
  }

  const turmaAtual = () => st.turmas.find((t) => t.id === st.turma);
  const estadoDe = (faseId) => turmaAtual()?.estadoFases?.[faseId] ?? 'trancada';
  const alunosDaTurma = () => ordenar(st.alunos.filter((a) => a.turma === st.turma));
  const ativosDaTurma = () => alunosDaTurma().filter((a) => a.status === 'ativo');
  const pendentesTotal = () => st.alunos.filter((a) => a.status === 'pendente').length;

  // ---------- telas ----------
  function desenhar() {
    if (!st.carregou.turmas || !st.carregou.alunos) {
      tela('<p class="carregando">Conferindo a turma...</p>', 'centro');
      return;
    }
    const ativo = document.activeElement;
    if (st.aba === 'turmas' && ativo && ativo.closest && ativo.closest('#form-turma')) return;
    const pend = pendentesTotal();
    const aba = st.aba;
    const corpo = aba === 'turma' ? htmlTurma() : aba === 'fases' ? htmlFases() : aba === 'turmas' ? htmlTurmas() : htmlConteudo();
    tela(
      `<header class="topo">
        <strong>ADM Quest</strong>
        <select id="sel-turma" aria-label="Turma">
          ${st.turmas.length ? st.turmas.map((t) => `<option value="${esc(t.id)}" ${t.id === st.turma ? 'selected' : ''}>${esc(t.nome || t.id)}${t.teste ? ' (teste)' : ''}</option>`).join('') : '<option value="">Sem turmas</option>'}
        </select>
        <button id="sair" class="mini">Sair</button>
      </header>
      ${st.aviso ? `<p class="aviso">${esc(st.aviso)}</p>` : ''}
      <main class="corpo">${corpo}</main>
      <nav class="abas" aria-label="Seções">
        <button data-acao="aba" data-v="turma" class="${aba === 'turma' ? 'sel' : ''}">Turma${pend ? ` <span class="bolha">${pend}</span>` : ''}</button>
        <button data-acao="aba" data-v="fases" class="${aba === 'fases' ? 'sel' : ''}">Fases</button>
        <button data-acao="aba" data-v="turmas" class="${aba === 'turmas' ? 'sel' : ''}">Turmas</button>
        <button data-acao="aba" data-v="conteudo" class="${aba === 'conteudo' ? 'sel' : ''}">Conteúdo</button>
      </nav>`,
      'pagina'
    );
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
      <p class="nota">Toque no aluno para editar, mover de turma ou marcar que saiu.</p>
      <ul class="lista">${linhas || '<li class="vazio">Nenhum aluno ainda. Passe o código da turma.</li>'}</ul>${htmlOrfaos}`;
  }

  function resumoFase(f) {
    const ativos = ativosDaTurma();
    let concluidas = 0, faltas = 0, validadas = 0, presentes = 0;
    for (const a of ativos) {
      const id = progId(a.uid, f.id);
      const concluiu = st.progresso[id]?.concluida === true;
      const faltou = st.aval[id]?.faltou === true;
      if (concluiu) concluidas++;
      if (faltou) faltas++;
      if (st.aval[id]?.validada) validadas++;
      if (!faltou || concluiu) presentes++;
    }
    return { total: ativos.length, concluidas, faltas, validadas, presentes };
  }

  function htmlFases() {
    if (!st.turma) return '<p class="vazio">Crie uma turma primeiro, na aba Turmas.</p>';
    if (!st.fases.length) return '<p class="vazio">Ainda não há fases. Importe o conteúdo do Mundo 1 na aba Conteúdo.</p>';
    ligarProf();
    if (st.faseSel) return htmlPainelFase();
    const itens = st.fases.map((f) => {
      const est = estadoDe(f.id);
      const r = resumoFase(f);
      return `<li class="fase-prof">
        <button class="nome-fase" data-acao="fase" data-id="${esc(f.id)}">
          <span class="cod">${esc(f.codigo)}</span> <strong>${esc(f.nome)}</strong>
          <span class="nota">${r.concluidas} de ${r.presentes} concluíram${r.faltas ? ` · ${r.faltas} faltou` : ''}</span>
        </button>
        <select data-estado="${esc(f.id)}" aria-label="Estado da fase ${esc(f.nome)}">
          ${ESTADOS.map((e) => `<option value="${e}" ${e === est ? 'selected' : ''}>${ESTADO_ROTULO[e]}</option>`).join('')}
        </select>
      </li>`;
    }).join('');
    return `<h2>${esc(st.mundo?.nome ?? 'Mundo 1')}</h2>
      <p class="nota">Só você libera as fases. O aluno vê "em obra" até você abrir. Aberta: os alunos trabalham. Encerrada: ninguém edita, só quem faltou ou quem você liberar.</p>
      <ul class="lista">${itens}</ul>`;
  }

  function htmlPainelFase() {
    const f = st.fases.find((x) => x.id === st.faseSel);
    if (!f) { st.faseSel = null; return htmlFases(); }
    const est = estadoDe(f.id);
    const r = resumoFase(f);
    const pct = r.presentes ? Math.round((100 * r.concluidas) / r.presentes) : 0;
    const roteiro = st.profFase?.professor?.paraVoce ?? [];
    const turmaDoc = turmaAtual();

    const travaveis = [
      ...normInstrucoes(f).map((it, i) => ({ item: it, rotulo: `Etapa ${i + 1}: ${it.texto.slice(0, 60)}${it.texto.length > 60 ? '…' : ''}`, chave: 'travada' })),
      ...normMateriais(f).map((m) => ({ item: m, rotulo: `Material: ${m.titulo || m.url}`, chave: 'travado' })),
    ].filter((x) => x.item[x.chave] === true);
    const htmlLiberar = travaveis.length ? `<h2>Liberar durante a aula</h2>
      <ul class="lista">${travaveis.map((x) => {
        const lib = liberado(turmaDoc, f.id, x.item, x.chave);
        return `<li class="aluno"><span class="nome">${esc(x.rotulo)}</span><button class="mini ${lib ? 'ok' : ''}" data-acao="liberar" data-item="${esc(x.item.id)}">${lib ? 'Liberada ✓ (tocar para travar)' : 'Liberar para a turma'}</button></li>`;
      }).join('')}</ul>` : '';

    const temCampos = (f.tarefas ?? []).some((t) => t.campos?.length);
    const linhas = ativosDaTurma().map((a) => {
      const id = progId(a.uid, f.id);
      const p = st.progresso[id];
      const v = st.aval[id];
      const sit = situacao(f, p, v, est);
      const { total, feitas } = contarTarefas(f, p);
      const mencoes = Object.entries(v?.mencoes ?? {}).filter(([, m]) => m).map(([c, m]) => `${c.replace('EMT1ADM', '')}: ${m}`).join(' · ');
      return `<li class="aluno">
        <span class="num">${a.numeroChamada ?? '—'}</span>
        ${a.avatar ? imgAvatar(a.avatar, 'avatar p') : '<span class="avatar p vazio-av"></span>'}
        <span class="nome">${esc(a.apelido)}</span>
        <span class="chip sit-${sit}">${SITUACAO_ROTULO[sit]}${total && sit === 'andamento' ? ` ${feitas}/${total}` : ''}</span>
        <div class="acoes-aluno">
          <button class="mini ${v?.faltou ? 'ruim' : ''}" data-acao="faltou" data-uid="${esc(a.uid)}">${v?.faltou ? 'Faltou ✓' : 'Faltou?'}</button>
          <button class="mini ${v?.validada ? 'ok cheio' : ''}" data-acao="validar" data-uid="${esc(a.uid)}">${v?.validada ? 'Validada ✓' : 'Validar'}</button>
          ${(f.habilidades ?? []).length ? `<button class="mini" data-acao="mencao" data-uid="${esc(a.uid)}">${mencoes ? esc(mencoes) : 'Menção'}</button>` : ''}
          ${est === 'encerrada' && !p?.concluida ? `<button class="mini ${v?.liberado ? 'ok' : ''}" data-acao="liberar-aluno" data-uid="${esc(a.uid)}">${v?.liberado ? 'Liberado ✓' : 'Liberar p/ fazer'}</button>` : ''}
          ${temCampos ? `<button class="mini" data-acao="respostas" data-uid="${esc(a.uid)}">Respostas</button>` : ''}
        </div>
      </li>`;
    }).join('');

    return `<button class="mini" data-acao="voltar-fases">← Fases</button>
      <h2>${esc(f.codigo)} · ${esc(f.nome)}</h2>
      <div class="linha-btn">
        <select data-estado="${esc(f.id)}" aria-label="Estado da fase">
          ${ESTADOS.map((e) => `<option value="${e}" ${e === est ? 'selected' : ''}>${ESTADO_ROTULO[e]}</option>`).join('')}
        </select>
        <button class="mini" data-acao="editar-fase" data-id="${esc(f.id)}">Editar fase</button>
      </div>
      <details class="roteiro"><summary>Roteiro da aula (só você vê)</summary>
        ${roteiro.length ? `<ul>${roteiro.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '<p class="nota">Sem roteiro. Escreva um em "Editar fase".</p>'}
      </details>
      ${htmlLiberar}
      <p class="resumo"><strong>${r.concluidas}</strong> de <strong>${r.presentes}</strong> presentes concluíram (${pct}%)${pct >= 80 ? ' · meta de 80% atingida' : ''}<br>
        <span class="nota">${r.validadas} validada(s) · ${r.faltas} faltou · ${r.total} aluno(s) ativo(s)</span></p>
      <button class="mini" data-acao="validar-todos">Validar todos que concluíram</button>
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

  function htmlConteudo() {
    const imp = st.importacao;
    const previa = imp ? `
      <div class="previa">
        <p><strong>${esc(imp.nome)}</strong>: mundo "${esc(imp.json.mundo?.nome ?? '')}" com ${imp.itens.length} fase(s).</p>
        <ul class="lista">${imp.itens.map((i) => `<li class="aluno"><span class="cod">${esc(i.codigo)}</span><span class="nome">${esc(i.nome)}</span><span class="chip ${i.estado === 'nova' ? 'ativo' : i.estado === 'alterada' ? 'pendente' : ''}">${i.estado === 'nova' ? 'Nova' : i.estado === 'alterada' ? 'Alterada' : 'Igual'}</span></li>`).join('')}</ul>
        <p class="nota">As fases "alteradas" terão o texto substituído pelo do arquivo, inclusive edições que você fez na tela. Os ids das fases nunca mudam, e o progresso dos alunos é mantido.</p>
        <div class="linha-btn"><button class="botao" data-acao="gravar-import">Gravar conteúdo</button><button class="botao secundario" data-acao="descartar-import">Descartar</button></div>
      </div>` : '';
    return `<h2>Importar conteúdo</h2>
      <p class="nota">Escolha o arquivo do mundo (por exemplo, mundo-1.json). Você vê o que muda antes de gravar.</p>
      <input type="file" id="arq" accept=".json,application/json">
      ${previa}
      <h2>Exportar conteúdo</h2>
      <p class="nota">Baixa um arquivo com todas as fases, inclusive as suas notas e edições. Guarde no OneDrive.</p>
      <button class="botao secundario" data-acao="exportar">Exportar conteúdo (.json)</button>
      <p class="erro" id="msg-cont"></p>`;
  }

  // ---------- ações ----------
  function falha(texto) {
    st.aviso = texto; desenhar();
    setTimeout(() => { if (st.aviso === texto) { st.aviso = ''; desenhar(); } }, 6000);
  }

  const refAval = (uid) => doc(db, 'avaliacoes', progId(uid, st.faseSel));
  const baseAval = (uid) => ({ uid, turma: st.turma, fase: st.faseSel, atualizadoEm: serverTimestamp() });

  async function alternarValidada(uid) {
    const atual = st.aval[progId(uid, st.faseSel)]?.validada === true;
    const a = st.alunos.find((x) => x.uid === uid);
    if (atual && !confirm(`Remover a validação de ${a?.apelido ?? 'este aluno'}?`)) return;
    await setDoc(refAval(uid), { ...baseAval(uid), validada: !atual }, { merge: true });
  }

  async function validarTodos() {
    const f = st.fases.find((x) => x.id === st.faseSel);
    const alvo = ativosDaTurma().filter((a) => {
      const id = progId(a.uid, f.id);
      return st.progresso[id]?.concluida === true && !st.aval[id]?.validada;
    });
    if (!alvo.length) { falha('Ninguém para validar: ou ninguém concluiu, ou todos já estão validados.'); return; }
    if (!confirm(`Validar ${alvo.length} aluno(s) que concluíram?`)) return;
    const lote = writeBatch(db);
    alvo.forEach((a) => lote.set(refAval(a.uid), { ...baseAval(a.uid), validada: true }, { merge: true }));
    await lote.commit();
  }

  async function alternarLiberadoAluno(uid) {
    const atual = st.aval[progId(uid, st.faseSel)]?.liberado === true;
    await setDoc(refAval(uid), { ...baseAval(uid), liberado: !atual }, { merge: true });
  }

  async function alternarFalta(uid) {
    const atual = st.aval[progId(uid, st.faseSel)]?.faltou === true;
    await setDoc(refAval(uid), { ...baseAval(uid), faltou: !atual }, { merge: true });
  }

  async function alternarLiberacaoItem(itemId) {
    const f = st.fases.find((x) => x.id === st.faseSel);
    const atual = turmaAtual()?.liberacoes?.[f.id]?.[itemId] === true;
    await updateDoc(doc(db, 'turmas', st.turma), { [`liberacoes.${f.id}.${itemId}`]: !atual });
  }

  app.onclick = async (e) => {
    if (e.target.id === 'sair') { signOut(auth); return; }
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const acao = b.dataset.acao;
    try {
      if (acao === 'aba') { st.aba = b.dataset.v; st.faseSel = null; guardar('aba', st.aba); desenhar(); }
      else if (acao === 'aprovar') { e.stopPropagation(); await updateDoc(doc(db, 'alunos', b.dataset.uid), { status: 'ativo', dataEntrada: hoje() }); }
      else if (acao === 'recusar') {
        e.stopPropagation();
        if (confirm('Recusar este cadastro? O aluno poderá se cadastrar de novo.')) await deleteDoc(doc(db, 'alunos', b.dataset.uid));
      }
      else if (acao === 'editar') { abrirEdicao(b.dataset.uid); }
      else if (acao === 'fase') { st.faseSel = b.dataset.id; ligarProf(); desenhar(); }
      else if (acao === 'voltar-fases') { st.faseSel = null; ligarProf(); desenhar(); }
      else if (acao === 'faltou') { await alternarFalta(b.dataset.uid); }
      else if (acao === 'validar') { await alternarValidada(b.dataset.uid); }
      else if (acao === 'validar-todos') { await validarTodos(); }
      else if (acao === 'mencao') { abrirMencao(b.dataset.uid); }
      else if (acao === 'respostas') { abrirRespostas(b.dataset.uid); }
      else if (acao === 'liberar') { await alternarLiberacaoItem(b.dataset.item); }
      else if (acao === 'liberar-aluno') { await alternarLiberadoAluno(b.dataset.uid); }
      else if (acao === 'editar-fase') { abrirEdicaoFase(b.dataset.id); }
      else if (acao === 'aberta') {
        const t = st.turmas.find((x) => x.id === b.dataset.id);
        const nova = !t.aberta;
        const lote = writeBatch(db);
        lote.update(doc(db, 'turmas', t.id), { aberta: nova });
        lote.update(doc(db, 'codigos', t.codigo), { aberta: nova });
        await lote.commit();
      }
      else if (acao === 'codigo') { await trocarCodigo(b.dataset.id); }
      else if (acao === 'exportar') { await exportarConteudo(); }
      else if (acao === 'gravar-import') { await gravarImportacao(); }
      else if (acao === 'descartar-import') { st.importacao = null; desenhar(); }
    } catch { falha('Não consegui salvar essa alteração. Tente de novo.'); }
  };

  app.onchange = async (e) => {
    try {
      if (e.target.id === 'sel-turma') { st.turma = e.target.value; guardar('turma', st.turma); st.faseSel = null; ligarTurma(); ligarProf(); desenhar(); }
      else if (e.target.dataset?.estado) {
        const novo = e.target.value;
        if (novo === 'encerrada' && !confirm('Encerrar a fase? Os alunos não poderão mais editar, exceto quem faltou ou quem você liberar.')) { desenhar(); return; }
        await updateDoc(doc(db, 'turmas', st.turma), { [`estadoFases.${e.target.dataset.estado}`]: novo });
      }
      else if (e.target.id === 'arq') { await lerArquivo(e.target.files?.[0]); }
    } catch { falha('Não consegui salvar essa alteração. Tente de novo.'); }
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
      lote.set(doc(db, 'turmas', id), { nome, codigo, aberta: true, teste, estadoFases: {}, criadoEm: serverTimestamp() });
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

  // ---------- importar e exportar conteúdo ----------
  async function lerArquivo(arquivo) {
    if (!arquivo) return;
    let json;
    try { json = JSON.parse(await arquivo.text()); } catch { falha('Esse arquivo não é um JSON válido.'); return; }
    const fases = json?.fases;
    if (json?.formato !== 1 || !json?.mundo?.id || !Array.isArray(fases) || !fases.length) { falha('Esse arquivo não está no formato de conteúdo do jogo.'); return; }
    const ids = new Set();
    for (const f of fases) {
      if (!/^[a-z0-9]{2,20}$/.test(f.id ?? '') || !f.nome || ids.has(f.id)) { falha(`Fase inválida ou repetida no arquivo: ${f.id ?? '(sem id)'}.`); return; }
      ids.add(f.id);
    }
    const existentes = new Map(st.fases.map((f) => [f.id, f]));
    const itens = fases.map((f) => {
      const atual = existentes.get(f.id);
      let estado = 'nova';
      if (atual) estado = estavel(parteAluno(atual, json.mundo.id)) === estavel(parteAluno(f, json.mundo.id)) ? 'igual' : 'alterada';
      return { id: f.id, codigo: f.codigo ?? '', nome: f.nome, estado };
    });
    st.importacao = { nome: arquivo.name, json, itens };
    desenhar();
  }

  async function gravarImportacao() {
    const imp = st.importacao;
    if (!imp) return;
    const { json } = imp;
    const m = json.mundo;
    const lote = writeBatch(db);
    lote.set(doc(db, 'mundos', m.id), {
      nome: m.nome ?? '', ordem: m.ordem ?? 1, pergunta: m.pergunta ?? '', competencias: m.competencias ?? [],
      guia: m.guia ?? '', chefao: m.chefao ?? '', habilidades: m.habilidades ?? {}, textos: m.textos ?? {}, atualizadoEm: serverTimestamp(),
    });
    for (const f of json.fases) {
      lote.set(doc(db, 'fases', f.id), { ...parteAluno(f, m.id), atualizadoEm: serverTimestamp() });
      lote.set(doc(db, 'fasesProfessor', f.id), { mundo: m.id, professor: f.professor ?? {}, atualizadoEm: serverTimestamp() });
    }
    await lote.commit();
    st.importacao = null;
    falha(`Conteúdo gravado: ${json.fases.length} fase(s).`);
  }

  async function exportarConteudo() {
    const [mundoDoc, fasesSnap, profSnap] = await Promise.all([
      getDoc(doc(db, 'mundos', MUNDO)),
      getDocs(query(collection(db, 'fases'), where('mundo', '==', MUNDO))),
      getDocs(collection(db, 'fasesProfessor')),
    ]);
    const prof = new Map(profSnap.docs.map((d) => [d.id, d.data().professor ?? {}]));
    const m = mundoDoc.exists() ? mundoDoc.data() : {};
    const fases = fasesSnap.docs.map((d) => ({ id: d.id, ...parteAluno(d.data(), MUNDO), professor: prof.get(d.id) ?? {} }))
      .sort((a, b) => a.ordem - b.ordem)
      .map(({ mundo, ...resto }) => resto);
    const saida = {
      formato: 1,
      mundo: { id: MUNDO, ordem: m.ordem ?? 1, nome: m.nome ?? '', pergunta: m.pergunta ?? '', competencias: m.competencias ?? [], guia: m.guia ?? '', chefao: m.chefao ?? '', habilidades: m.habilidades ?? {}, textos: m.textos ?? {} },
      fases,
    };
    const blob = new Blob([JSON.stringify(saida, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `conteudo-${MUNDO}-${hoje()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- janelas ----------
  async function docsDoAluno(uid) {
    const [p, v] = await Promise.all([
      getDocs(query(collection(db, 'progresso'), where('uid', '==', uid))),
      getDocs(query(collection(db, 'avaliacoes'), where('uid', '==', uid))),
    ]);
    return [...p.docs, ...v.docs];
  }

  function abrirEdicao(uid) {
    const a = st.alunos.find((x) => x.uid === uid);
    if (!a) return;
    const turmaDoAluno = st.turmas.find((t) => t.id === a.turma);
    const outras = st.turmas.filter((t) => t.id !== a.turma);
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
        <p class="nota">Para tirar um aluno da turma sem apagar o histórico, escolha "Saiu".</p>
        <p class="erro" id="e-msg"></p>
        <div class="linha-btn">
          <button class="botao" type="submit" value="salvar">Salvar</button>
          <button class="botao secundario" type="button" id="e-cancelar">Cancelar</button>
        </div>
        ${outras.length ? `<hr><label for="e-mover">Mover para outra turma</label>
          <div class="linha-btn"><select id="e-mover">${outras.map((t) => `<option value="${esc(t.id)}">${esc(t.nome || t.id)}</option>`).join('')}</select>
          <button class="mini" type="button" id="e-mover-ok">Mover</button></div>` : ''}
        ${turmaDoAluno?.teste ? '<hr><button class="mini ruim" type="button" id="e-apagar">Apagar este aluno e os dados dele (turma de teste)</button>' : ''}
      </form>`;
    document.getElementById('e-cancelar').onclick = () => dlg.close();
    const mover = document.getElementById('e-mover-ok');
    if (mover) mover.onclick = async () => {
      const destino = document.getElementById('e-mover').value;
      if (!confirm(`Mover ${a.apelido} para a turma ${destino}? As fases dele passam a valer na nova turma.`)) return;
      try {
        const lote = writeBatch(db);
        lote.update(doc(db, 'alunos', a.uid), { turma: destino, numeroChamada: null });
        (await docsDoAluno(a.uid)).forEach((d) => lote.update(d.ref, { turma: destino }));
        await lote.commit();
        dlg.close();
      } catch { document.getElementById('e-msg').textContent = 'Não consegui mover agora.'; }
    };
    const apagar = document.getElementById('e-apagar');
    if (apagar) apagar.onclick = async () => {
      if (!confirm(`Apagar ${a.apelido} e todo o progresso dele? Isso não pode ser desfeito.`)) return;
      try {
        const lote = writeBatch(db);
        (await docsDoAluno(a.uid)).forEach((d) => lote.delete(d.ref));
        lote.delete(doc(db, 'alunos', a.uid));
        await lote.commit();
        dlg.close();
      } catch { document.getElementById('e-msg').textContent = 'Não consegui apagar agora.'; }
    };
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

  // menção: cada escolha é salva na hora, sem botão de salvar
  function abrirMencao(uid) {
    const f = st.fases.find((x) => x.id === st.faseSel);
    const a = st.alunos.find((x) => x.uid === uid);
    if (!f || !a) return;
    const v = st.aval[progId(uid, f.id)] ?? {};
    const habs = st.mundo?.habilidades ?? {};
    const campos = (f.habilidades ?? []).map((cod) => `
      <label for="m-${esc(cod)}">${esc(cod)} <span class="nota">${esc(habs[cod] ?? '')}${(f.porGrupo ?? []).includes(cod) ? ' · menção de grupo' : ''}</span></label>
      <select id="m-${esc(cod)}" data-hab="${esc(cod)}">
        ${['', 'A', 'PA', 'NA'].map((o) => `<option value="${o}" ${(v.mencoes?.[cod] ?? '') === o ? 'selected' : ''}>${o || 'Sem menção ainda'}</option>`).join('')}
      </select>
      <details class="mais"><summary>Critérios</summary><dl><dt>A</dt><dd>${esc(f.criterios?.[cod]?.A ?? '')}</dd><dt>PA</dt><dd>${esc(f.criterios?.[cod]?.PA ?? '')}</dd><dt>NA</dt><dd>${esc(f.criterios?.[cod]?.NA ?? '')}</dd></dl></details>`).join('');
    dlg.innerHTML = `
      <div class="form">
        <h2>${esc(a.apelido)} · ${esc(f.codigo)}</h2>
        ${campos}
        <p class="nota" id="m-estado">Cada escolha é salva na hora.</p>
        <button class="botao" type="button" id="m-fechar">Fechar</button>
      </div>`;
    document.getElementById('m-fechar').onclick = () => dlg.close();
    dlg.querySelectorAll('[data-hab]').forEach((s) => {
      s.onchange = async () => {
        const out = document.getElementById('m-estado');
        try {
          await setDoc(refAval(uid), { ...baseAval(uid), mencoes: { [s.dataset.hab]: s.value || null } }, { merge: true });
          out.textContent = 'Salvo ✓';
        } catch { out.textContent = 'Não consegui salvar.'; }
      };
    });
    dlg.showModal();
  }

  function abrirRespostas(uid) {
    const f = st.fases.find((x) => x.id === st.faseSel);
    const a = st.alunos.find((x) => x.uid === uid);
    const p = st.progresso[progId(uid, f.id)];
    const blocos = (f.tarefas ?? []).filter((t) => t.campos?.length).map((t) => `
      <h3>${esc(t.texto)}</h3>
      ${t.campos.map((c) => `<p><strong>${esc(c.rotulo)}</strong><br>${esc(p?.respostas?.[t.id]?.[c.id] || '(sem resposta)')}</p>`).join('')}`).join('');
    dlg.innerHTML = `<div class="form"><h2>${esc(a?.apelido ?? '')} · respostas</h2>${blocos || '<p class="nota">Esta fase não tem campos de resposta.</p>'}<button class="botao" type="button" id="r-fechar">Fechar</button></div>`;
    document.getElementById('r-fechar').onclick = () => dlg.close();
    dlg.showModal();
  }

  // editor completo da fase: etapas, materiais, tarefas e roteiro
  function abrirEdicaoFase(faseId) {
    const f = st.fases.find((x) => x.id === faseId);
    if (!f) return;
    const ed = {
      nome: f.nome ?? '',
      missao: f.missao ?? '',
      etapas: normInstrucoes(f).map((i) => ({ id: i.id, texto: i.texto ?? '', saibaMais: i.saibaMais ?? '', links: deLinks(i.links), travada: i.travada === true })),
      materiais: normMateriais(f).map((m) => ({ id: m.id, titulo: m.titulo ?? '', url: m.url ?? '', descricao: m.descricao ?? '', travado: m.travado === true })),
      tarefas: (f.tarefas ?? []).map((t) => ({ id: t.id, texto: t.texto ?? '', saibaMais: t.saibaMais ?? '', campos: t.campos ?? [], camposTxt: (t.campos ?? []).map((c) => (c.dica ? `${c.rotulo} | ${c.dica}` : c.rotulo)).join('\n') })),
      roteiro: (st.profFase?.professor?.paraVoce ?? []).join('\n'),
    };

    const proximoId = (lista, prefixo) => `${prefixo}${lista.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0), 0) + 1}`;
    const botoes = (sec, i, n) => `<div class="linha-btn">
      <button type="button" class="mini" data-ed="sobe" data-sec="${sec}" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="mini" data-ed="desce" data-sec="${sec}" data-i="${i}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="mini ruim" data-ed="remove" data-sec="${sec}" data-i="${i}">Remover</button></div>`;

    function pintar() {
      dlg.innerHTML = `
        <form class="form editor" id="form-fase">
          <h2>Editar ${esc(f.codigo)}</h2>
          <label for="f-nome">Nome</label>
          <input id="f-nome" maxlength="60" value="${esc(ed.nome)}" required>
          <label for="f-missao">Missão (o que o aluno lê primeiro)</label>
          <textarea id="f-missao" rows="5">${esc(ed.missao)}</textarea>

          <h3>Passo a passo (etapas)</h3>
          <p class="nota">Cada etapa pode ter "saiba mais", links e ficar travada até você liberar durante a aula.</p>
          ${ed.etapas.map((e, i) => `<fieldset class="card-ed"><legend>Etapa ${i + 1}</legend>
            <textarea data-sec="etapas" data-i="${i}" data-f="texto" rows="3" placeholder="O que o aluno deve fazer">${esc(e.texto)}</textarea>
            <label>Saiba mais (opcional)</label>
            <textarea data-sec="etapas" data-i="${i}" data-f="saibaMais" rows="3">${esc(e.saibaMais)}</textarea>
            <label>Links (um por linha: Título | endereço)</label>
            <textarea data-sec="etapas" data-i="${i}" data-f="links" rows="2" placeholder="Apresentação da aula | https://...">${esc(e.links)}</textarea>
            <label class="check"><input type="checkbox" data-sec="etapas" data-i="${i}" data-f="travada" ${e.travada ? 'checked' : ''}> Só aparece depois que eu liberar</label>
            ${botoes('etapas', i, ed.etapas.length)}</fieldset>`).join('')}
          <button type="button" class="mini" data-ed="add" data-sec="etapas">+ Etapa</button>

          <h3>Material de apoio</h3>
          ${ed.materiais.map((m, i) => `<fieldset class="card-ed"><legend>Material ${i + 1}</legend>
            <input data-sec="materiais" data-i="${i}" data-f="titulo" placeholder="Título" value="${esc(m.titulo)}">
            <input data-sec="materiais" data-i="${i}" data-f="url" placeholder="https://..." value="${esc(m.url)}">
            <input data-sec="materiais" data-i="${i}" data-f="descricao" placeholder="Descrição curta (opcional)" value="${esc(m.descricao)}">
            <label class="check"><input type="checkbox" data-sec="materiais" data-i="${i}" data-f="travado" ${m.travado ? 'checked' : ''}> Só aparece depois que eu liberar</label>
            ${botoes('materiais', i, ed.materiais.length)}</fieldset>`).join('')}
          <button type="button" class="mini" data-ed="add" data-sec="materiais">+ Material</button>

          <h3>Tarefas do aluno</h3>
          ${ed.tarefas.map((t, i) => `<fieldset class="card-ed"><legend>Tarefa ${i + 1}</legend>
            <textarea data-sec="tarefas" data-i="${i}" data-f="texto" rows="2">${esc(t.texto)}</textarea>
            <label>Saiba mais (opcional)</label>
            <textarea data-sec="tarefas" data-i="${i}" data-f="saibaMais" rows="3">${esc(t.saibaMais)}</textarea>
            <label>Campos para o aluno escrever (um por linha: Rótulo | dica)</label>
            <textarea data-sec="tarefas" data-i="${i}" data-f="camposTxt" rows="2" placeholder="Jogos de que você gosta">${esc(t.camposTxt)}</textarea>
            ${botoes('tarefas', i, ed.tarefas.length)}</fieldset>`).join('')}
          <button type="button" class="mini" data-ed="add" data-sec="tarefas">+ Tarefa</button>

          <h3>Roteiro da aula (só você vê)</h3>
          <textarea id="f-roteiro" rows="6">${esc(ed.roteiro)}</textarea>
          <p class="nota">Habilidades e critérios mudam pelo arquivo de conteúdo.</p>
          <p class="erro" id="f-msg"></p>
          <div class="linha-btn">
            <button class="botao" type="submit">Salvar</button>
            <button class="botao secundario" type="button" id="f-cancelar">Cancelar</button>
          </div>
        </form>`;
    }

    function lerCampos() {
      const nome = document.getElementById('f-nome'); if (!nome) return;
      ed.nome = nome.value; ed.missao = document.getElementById('f-missao').value; ed.roteiro = document.getElementById('f-roteiro').value;
      dlg.querySelectorAll('[data-sec][data-f]').forEach((el) => {
        ed[el.dataset.sec][Number(el.dataset.i)][el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
      });
    }

    pintar();
    dlg.onclick = (ev) => {
      const b = ev.target.closest('[data-ed]');
      if (ev.target.id === 'f-cancelar') { dlg.onclick = null; dlg.close(); return; }
      if (!b) return;
      lerCampos();
      const sec = b.dataset.sec; const i = Number(b.dataset.i); const lista = ed[sec];
      if (b.dataset.ed === 'add') {
        if (sec === 'etapas') lista.push({ id: proximoId(lista, 'i'), texto: '', saibaMais: '', links: '', travada: false });
        if (sec === 'materiais') lista.push({ id: proximoId(lista, 'm'), titulo: '', url: '', descricao: '', travado: false });
        if (sec === 'tarefas') lista.push({ id: proximoId(lista, 't'), texto: '', saibaMais: '', campos: [], camposTxt: '' });
      } else if (b.dataset.ed === 'remove') {
        if (!confirm('Remover este item?')) return;
        lista.splice(i, 1);
      } else if (b.dataset.ed === 'sobe' && i > 0) { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; }
      else if (b.dataset.ed === 'desce' && i < lista.length - 1) { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; }
      pintar();
    };
    dlg.addEventListener('close', () => { dlg.onclick = null; }, { once: true });
    dlg.showModal();

    dlg.onsubmit = async (ev) => {
      if (ev.target.id !== 'form-fase') return;
      ev.preventDefault();
      lerCampos();
      const msg = document.getElementById('f-msg');
      const instrucoes = ed.etapas.filter((e) => e.texto.trim()).map((e) => {
        const o = { id: e.id, texto: e.texto.trim() };
        if (e.saibaMais.trim()) o.saibaMais = e.saibaMais.trim();
        const l = paraLinks(e.links); if (l.length) o.links = l;
        if (e.travada) o.travada = true;
        return o;
      });
      const materiais = ed.materiais.filter((m) => /^https?:\/\//i.test(m.url.trim())).map((m) => {
        const o = { id: m.id, titulo: m.titulo.trim() || m.url.trim(), url: m.url.trim() };
        if (m.descricao.trim()) o.descricao = m.descricao.trim();
        if (m.travado) o.travado = true;
        return o;
      });
      const tarefas = ed.tarefas.filter((t) => t.texto.trim()).map((t) => {
        const o = { id: t.id, texto: t.texto.trim() };
        if (t.saibaMais.trim()) o.saibaMais = t.saibaMais.trim();
        const campos = linhasDe(t.camposTxt).map((l, i) => {
          const [rot, ...dica] = l.split('|');
          return { id: t.campos?.[i]?.id ?? `c${i + 1}`, rotulo: rot.trim(), ...(dica.join('|').trim() ? { dica: dica.join('|').trim() } : {}) };
        });
        if (campos.length) o.campos = campos;
        return o;
      });
      if (!ed.nome.trim()) { msg.textContent = 'A fase precisa de um nome.'; return; }
      try {
        const lote = writeBatch(db);
        lote.update(doc(db, 'fases', f.id), { nome: ed.nome.trim(), missao: ed.missao.trim(), instrucoes, materiais, tarefas, atualizadoEm: serverTimestamp() });
        lote.set(doc(db, 'fasesProfessor', f.id), { mundo: MUNDO, professor: { paraVoce: linhasDe(ed.roteiro) }, atualizadoEm: serverTimestamp() }, { merge: true });
        await lote.commit();
        dlg.onclick = null; dlg.onsubmit = null; dlg.close();
      } catch { msg.textContent = 'Não consegui salvar agora.'; }
    };
  }

  return () => {
    paradas.forEach((p) => p());
    paradasTurma.forEach((p) => p());
    if (paraProf) paraProf();
    app.onclick = null; app.onchange = null; app.onsubmit = null;
    dlg.onclick = null; dlg.onsubmit = null;
    if (dlg.open) dlg.close();
  };
}
