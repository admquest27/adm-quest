import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { app, tela, esc, carregando } from './ui.js';
import { FANTASIAS, TONS, imgAvatar } from './avatar.js';
import { htmlCartao } from './cartao.js';
import {
  MUNDO, SITUACAO_ROTULO, progId, contarTarefas, situacao, podeEditar, textoPlaca, etapasDe, etapaLiberada,
} from './fases.js';

// opcoes.uid + opcoes.aoSair: o professor vê o jogo como um aluno (somente leitura).
export function iniciarAluno(user, opcoes = {}) {
  const alvo = opcoes.uid ?? user.uid;
  const ver = Boolean(opcoes.uid);
  const ref = doc(db, 'alunos', alvo);
  const st = {
    dados: null, editandoAvatar: false, acesso: false, escolha: { fantasia: 'heroi', tom: 2 },
    turma: null, fases: [], mundo: null, progresso: {}, aval: {}, recados: [], faseAberta: null, aviso: '',
  };
  let paradasAtivo = [];

  const faixa = () => (ver ? `<div class="ver-faixa">Vendo como <strong>${esc(st.dados?.apelido ?? 'aluno')}</strong> (somente leitura) <button id="sair-ver" class="mini">Voltar ao painel</button></div>` : '');
  const mostrar = (html, classe) => tela(faixa() + html, classe);

  carregando('Procurando o cadastro...');

  const parar = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) { st.dados = null; pararDados(); telaPrimeiroAcesso(); return; }
      st.dados = snap.data();
      desenhar();
    },
    () => telaErro('Não consegui ler o cadastro. Tente de novo em instantes.')
  );

  // ---------- dados do jogo (só para aluno ativo) ----------
  function ligarDados() {
    if (paradasAtivo.length) return;
    const redesenha = () => { if (st.dados?.status === 'ativo') desenhar(); };
    const turma = st.dados.turma;
    paradasAtivo = [
      onSnapshot(doc(db, 'turmas', turma), (s) => { st.turma = s.exists() ? s.data() : null; redesenha(); }, () => {}),
      onSnapshot(doc(db, 'mundos', MUNDO), (s) => { st.mundo = s.exists() ? s.data() : null; redesenha(); }, () => {}),
      onSnapshot(query(collection(db, 'fases'), where('mundo', '==', MUNDO)), (s) => {
        st.fases = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.ordem - b.ordem);
        redesenha();
      }, () => {}),
      onSnapshot(query(collection(db, 'progresso'), where('uid', '==', alvo)), (s) => {
        st.progresso = {};
        s.docs.forEach((d) => { st.progresso[d.data().fase] = d.data(); });
        redesenha();
      }, () => {}),
      onSnapshot(query(collection(db, 'avaliacoes'), where('uid', '==', alvo)), (s) => {
        st.aval = {};
        s.docs.forEach((d) => { st.aval[d.data().fase] = d.data(); });
        redesenha();
      }, () => {}),
      onSnapshot(query(collection(db, 'comentarios'), where('uid', '==', alvo), where('visivel', '==', true)), (s) => {
        st.recados = s.docs.map((d) => d.data()).sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0));
        redesenha();
      }, () => {}),
    ];
  }

  function pararDados() {
    paradasAtivo.forEach((p) => p());
    paradasAtivo = [];
  }

  // ---------- telas ----------
  function telaErro(texto) {
    mostrar(`<section class="cartao"><h1>Ops</h1><p>${esc(texto)}</p><button id="sair" class="botao secundario">Sair</button></section>`, 'centro');
  }

  function telaPrimeiroAcesso(mensagem = '') {
    if (ver) { mostrar('<section class="cartao"><h1>Sem cadastro</h1><p>Este aluno ainda não tem cadastro.</p></section>', 'centro'); return; }
    mostrar(
      `<section class="cartao">
        <h1>Bem-vindo!</h1>
        <p class="sub">Digite o código da turma e escolha o seu apelido no jogo.</p>
        <form id="form-entrada" autocomplete="off">
          <label for="codigo">Código da turma</label>
          <input id="codigo" name="codigo" maxlength="10" autocapitalize="characters" required>
          <label for="apelido">Apelido (2 a 16 letras)</label>
          <input id="apelido" name="apelido" minlength="2" maxlength="16" required>
          <button class="botao" type="submit">Entrar na turma</button>
        </form>
        <p class="erro" id="msg">${esc(mensagem)}</p>
        <p class="nota">O jogo guarda só o seu apelido, o seu progresso e o e-mail da conta. Só o professor vê esses dados.</p>
        <button id="sair" class="botao secundario">Sair</button>
      </section>`,
      'centro'
    );
  }

  function desenhar() {
    const d = st.dados;
    if (!d) return;
    if (d.status !== 'ativo') pararDados();
    switch (d.status) {
      case 'ativo': return telaAtivo();
      case 'saiu':
        return mostrar('<section class="cartao"><h1>Até a próxima!</h1><p>Obrigado pela jornada. Foi bom ter você por aqui.</p><button id="sair" class="botao secundario">Sair</button></section>', 'centro');
      case 'bloqueado':
        return mostrar('<section class="cartao"><h1>Acesso pausado</h1><p>Converse com o professor para voltar ao jogo.</p><button id="sair" class="botao secundario">Sair</button></section>', 'centro');
      default:
        return mostrar(
          `<section class="cartao">
            <h1>Quase lá</h1>
            <p>Cadastro recebido, <strong>${esc(d.apelido)}</strong>! O professor precisa aprovar a sua entrada. Esta tela muda sozinha quando isso acontecer.</p>
            <button id="sair" class="botao secundario">Sair</button>
          </section>`,
          'centro'
        );
    }
  }

  function telaAtivo() {
    if (!st.acesso && !ver) {
      st.acesso = true;
      updateDoc(ref, { ultimoAcesso: serverTimestamp() }).catch(() => {});
    }
    ligarDados();
    if ((!st.dados.avatar || st.editandoAvatar) && !ver) return telaAvatar();
    if (st.faseAberta) return telaCartao();
    return telaLista();
  }

  const dataCurta = (ts) => (ts?.toMillis ? new Date(ts.toMillis()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');

  function telaLista() {
    const estados = st.turma?.estadoFases ?? {};
    const textos = st.mundo?.textos ?? {};
    const linha = (f) => {
      const est = estados[f.id] ?? 'trancada';
      const cod = `<span class="cod">${esc(f.codigo)}</span><span class="nm">${esc(f.nome)}</span>`;
      if (est === 'aberta' || est === 'encerrada') {
        const p = st.progresso[f.id];
        const sit = situacao(f, p, st.aval[f.id], est);
        const { total, feitas } = contarTarefas(f, p);
        const cont = ['andamento', 'afazer', 'naoconcluida'].includes(sit) && total ? ` ${feitas}/${total}` : '';
        return `<li><button class="fase ${sit === 'afazer' ? 'afazer' : ''}" data-fase="${esc(f.id)}">${cod}<span class="chip sit-${sit}">${SITUACAO_ROTULO[sit]}${cont}</span></button></li>`;
      }
      const placa = est === 'adiada' ? textos.adiada : est === 'cancelada' ? textos.cancelada : textoPlaca(textos, f);
      return `<li><div class="fase obra e-${est}">${cod}<span class="placa">${esc(placa ?? 'Em obra.')}</span></div></li>`;
    };
    const itens = st.fases.filter((f) => f.tipo !== 'excel').map(linha).join('');
    const excelAbertos = st.fases.filter((f) => f.tipo === 'excel' && ['aberta', 'encerrada'].includes(estados[f.id] ?? 'trancada')).map(linha).join('');
    const gerais = st.recados.filter((r) => !r.fase);
    const recados = gerais.length ? `<h2>Recados do professor</h2><ul class="lista">${gerais.map((r) => `<li class="reg ${r.tipoAtitude === 'atencao' ? 'atencao' : ''}"><span class="nota">${dataCurta(r.criadoEm)} · ${esc(r.marca)}</span><p>${esc(r.texto)}</p></li>`).join('')}</ul>` : '';
    mostrar(
      `<section class="cartao largo">
        <div class="cab-aluno">
          ${imgAvatar(st.dados.avatar, 'avatar p')}
          <div><strong>${esc(st.dados.apelido)}</strong><br><span class="nota">${esc(st.turma?.nome ?? '')}</span></div>
          ${ver ? '' : '<button id="trocar" class="mini">Avatar</button>'}
        </div>
        <h2>${esc(st.mundo?.nome ?? 'Vila dos Planos')}</h2>
        <ul class="lista">${itens || '<li class="vazio">As fases ainda estão sendo preparadas.</li>'}</ul>
        ${excelAbertos ? `<h2>Trilha de Excel</h2><ul class="lista">${excelAbertos}</ul>` : ''}
        ${recados}
        ${ver ? '' : '<button id="sair" class="botao secundario">Sair</button>'}
      </section>`,
      'centro alto'
    );
  }

  function telaCartao() {
    const f = st.fases.find((x) => x.id === st.faseAberta);
    const est = st.turma?.estadoFases?.[st.faseAberta];
    if (!f || !(est === 'aberta' || est === 'encerrada')) { st.faseAberta = null; return telaLista(); }
    const a = st.aval[f.id];
    mostrar(htmlCartao({
      f, p: st.progresso[f.id], a, est, turma: st.turma, mundo: st.mundo, recados: st.recados, ver,
      editavel: !ver && podeEditar(est, a), aviso: st.aviso,
    }), 'centro alto');
  }

  function telaAvatar() {
    const mestre = st.escolha.fantasia === 'mestre';
    mostrar(
      `<section class="cartao largo">
        <h1>Escolha o seu avatar</h1>
        <div class="avatar-grande">${imgAvatar(st.escolha, 'avatar g')}</div>
        <p class="sub">${esc(FANTASIAS.find((f) => f.id === st.escolha.fantasia)?.nome ?? '')}</p>
        <div class="grade-avatar" role="radiogroup" aria-label="Fantasia">
          ${FANTASIAS.map((f) => `<button type="button" class="opcao ${f.id === st.escolha.fantasia ? 'sel' : ''}" data-f="${f.id}" aria-label="${esc(f.nome)}">${imgAvatar({ fantasia: f.id, tom: st.escolha.tom }, 'avatar')}</button>`).join('')}
        </div>
        ${mestre ? '<p class="nota">Esta fantasia tem pele própria.</p>' : `
        <p class="sub">Cor da pele</p>
        <div class="tons" role="radiogroup" aria-label="Cor da pele">
          ${TONS.map((c, i) => `<button type="button" class="tom ${i === st.escolha.tom ? 'sel' : ''}" data-t="${i}" style="background:${c}" aria-label="Tom ${i + 1}"></button>`).join('')}
        </div>`}
        <p class="erro" id="msg"></p>
        <button id="salvar" class="botao">Salvar avatar</button>
        ${st.dados.avatar ? '<button id="cancelar" class="botao secundario">Voltar</button>' : ''}
      </section>`,
      'centro alto'
    );
  }

  // ---------- ações (um único ouvinte para a tela inteira) ----------
  function aviso(texto) {
    st.aviso = texto;
    const el = document.getElementById('msg');
    if (el) el.textContent = texto;
  }

  const refProg = (faseId) => doc(db, 'progresso', progId(alvo, faseId));
  const baseNova = (faseId) => ({ uid: alvo, turma: st.dados.turma, fase: faseId });

  async function marcarTarefa(faseId, etapaId, valor) {
    const p = st.progresso[faseId];
    const dados = { tarefas: { [etapaId]: valor }, atualizadoEm: serverTimestamp() };
    if (!p) Object.assign(dados, baseNova(faseId), { concluida: false });
    await setDoc(refProg(faseId), dados, { merge: true });
  }

  async function marcarResposta(faseId, etapaId, campoId, valor) {
    const p = st.progresso[faseId];
    const dados = { respostas: { [etapaId]: { [campoId]: valor } }, atualizadoEm: serverTimestamp() };
    if (!p) Object.assign(dados, baseNova(faseId), { tarefas: {}, concluida: false });
    await setDoc(refProg(faseId), dados, { merge: true });
  }

  async function alternarConcluida(faseId) {
    const f = st.fases.find((x) => x.id === faseId);
    const p = st.progresso[faseId];
    const nova = !p?.concluida;
    if (nova && f) {
      const todas = etapasDe(f);
      const pend = todas.filter((e) => e.semMarcar !== true && p?.tarefas?.[e.id] !== true);
      if (pend.length) {
        const visiveis = todas.map((e, i) => ({ e, n: i + 1 })).filter((x) => pend.includes(x.e) && etapaLiberada(st.turma, f.id, x.e));
        const travadas = pend.length - visiveis.length;
        aviso(`Ainda falta concluir ${pend.length} etapa(s)${visiveis.length ? ` (etapa ${visiveis.map((x) => x.n).join(', ')})` : ''}${travadas ? `. Há ${travadas} etapa(s) que o professor ainda vai liberar` : ''}.`);
        const lis = document.querySelectorAll('.etapa:not(.feita):not(.trava)');
        lis.forEach((li) => li.classList.add('destaque'));
        (lis[0] ?? document.getElementById('msg'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => lis.forEach((li) => li.classList.remove('destaque')), 3500);
        return;
      }
    }
    const dados = { concluida: nova, concluidaEm: nova ? serverTimestamp() : null, atualizadoEm: serverTimestamp() };
    if (!p) Object.assign(dados, baseNova(faseId), { tarefas: {} });
    await setDoc(refProg(faseId), dados, { merge: true });
  }

  app.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.id === 'sair') { signOut(auth); return; }
      if (b.id === 'sair-ver') { opcoes.aoSair?.(); return; }
      if (b.dataset.fase) { st.faseAberta = b.dataset.fase; st.aviso = ''; desenhar(); return; }
      if (b.id === 'voltar') { st.faseAberta = null; st.aviso = ''; desenhar(); return; }
      if (ver) return;
      if (b.id === 'concluir') { await alternarConcluida(st.faseAberta); return; }
      if (b.id === 'trocar') { st.escolha = { ...st.dados.avatar }; st.editandoAvatar = true; desenhar(); return; }
      if (b.dataset.f) { st.escolha.fantasia = b.dataset.f; telaAvatar(); return; }
      if (b.dataset.t) { st.escolha.tom = Number(b.dataset.t); telaAvatar(); return; }
      if (b.id === 'cancelar') { st.editandoAvatar = false; desenhar(); return; }
      if (b.id === 'salvar') {
        const eraEdicao = st.editandoAvatar;
        st.editandoAvatar = false;
        try {
          await updateDoc(ref, { avatar: { fantasia: st.escolha.fantasia, tom: st.escolha.tom } });
        } catch {
          st.editandoAvatar = eraEdicao;
          aviso('Não consegui salvar agora. Tente de novo.');
        }
      }
    } catch {
      aviso('Não consegui salvar agora. Confira a conexão e tente de novo.');
    }
  };

  app.onchange = async (e) => {
    if (ver) return;
    const r = e.target.closest('textarea[data-resp]');
    if (r) {
      try { await marcarResposta(st.faseAberta, r.dataset.resp, r.dataset.campo, r.value.trim()); aviso(''); }
      catch { aviso('Não consegui salvar a resposta. Tente de novo.'); }
      return;
    }
    const c = e.target.closest('input[data-tarefa]');
    if (!c) return;
    try { await marcarTarefa(st.faseAberta, c.dataset.tarefa, c.checked); }
    catch { c.checked = !c.checked; aviso('Não consegui salvar. Tente de novo.'); }
  };

  app.oninput = (e) => {
    if (e.target.id === 'codigo') e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  app.onsubmit = async (e) => {
    if (e.target.id !== 'form-entrada') return;
    e.preventDefault();
    const msg = document.getElementById('msg');
    const cod = document.getElementById('codigo').value.trim().toUpperCase();
    const apelido = document.getElementById('apelido').value.trim();
    if (!/^[A-Z0-9]{4,10}$/.test(cod)) { msg.textContent = 'O código tem de 4 a 10 letras ou números.'; return; }
    if (apelido.length < 2 || apelido.length > 16) { msg.textContent = 'O apelido precisa ter de 2 a 16 letras.'; return; }
    msg.textContent = 'Conferindo o código...';
    try {
      const c = await getDoc(doc(db, 'codigos', cod));
      if (!c.exists()) { msg.textContent = 'Não encontrei esse código. Confira com o professor.'; return; }
      if (c.data().aberta !== true) { msg.textContent = 'Esta turma não está recebendo cadastros agora.'; return; }
      await setDoc(ref, { turma: c.data().turma, codigo: cod, apelido, status: 'pendente', criadoEm: serverTimestamp() });
    } catch {
      msg.textContent = 'Não deu certo. Confira o código e tente de novo.';
    }
  };

  return () => {
    parar();
    pararDados();
    app.onclick = null; app.onchange = null; app.oninput = null; app.onsubmit = null;
  };
}