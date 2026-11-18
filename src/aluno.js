import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { app, tela, esc, carregando } from './ui.js';
import { FANTASIAS, TONS, imgAvatar } from './avatar.js';
import { MUNDO, SITUACAO_ROTULO, progId, contarTarefas, situacao, textoPlaca } from './fases.js';

export function iniciarAluno(user) {
  const ref = doc(db, 'alunos', user.uid);
  const st = {
    dados: null, editandoAvatar: false, acesso: false, escolha: { fantasia: 'heroi', tom: 2 },
    turma: null, fases: [], mundo: null, progresso: {}, aval: {}, faseAberta: null, aviso: '',
  };
  let paradasAtivo = [];

  carregando('Procurando o seu cadastro...');

  const parar = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) { st.dados = null; pararDados(); telaPrimeiroAcesso(); return; }
      st.dados = snap.data();
      desenhar();
    },
    () => telaErro('Não consegui ler o seu cadastro. Tente de novo em instantes.')
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
      onSnapshot(query(collection(db, 'progresso'), where('uid', '==', user.uid)), (s) => {
        st.progresso = {};
        s.docs.forEach((d) => { st.progresso[d.data().fase] = d.data(); });
        redesenha();
      }, () => {}),
      onSnapshot(query(collection(db, 'avaliacoes'), where('uid', '==', user.uid)), (s) => {
        st.aval = {};
        s.docs.forEach((d) => { st.aval[d.data().fase] = d.data(); });
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
    tela(`<section class="cartao"><h1>Ops</h1><p>${esc(texto)}</p><button id="sair" class="botao secundario">Sair</button></section>`, 'centro');
  }

  function telaPrimeiroAcesso(mensagem = '') {
    tela(
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
        return tela('<section class="cartao"><h1>Até a próxima!</h1><p>Obrigado pela jornada. Foi bom ter você por aqui.</p><button id="sair" class="botao secundario">Sair</button></section>', 'centro');
      case 'bloqueado':
        return tela('<section class="cartao"><h1>Acesso pausado</h1><p>Converse com o professor para voltar ao jogo.</p><button id="sair" class="botao secundario">Sair</button></section>', 'centro');
      default:
        return tela(
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
    if (!st.acesso) {
      st.acesso = true;
      updateDoc(ref, { ultimoAcesso: serverTimestamp() }).catch(() => {});
    }
    ligarDados();
    if (!st.dados.avatar || st.editandoAvatar) return telaAvatar();
    if (st.faseAberta) return telaCartao();
    return telaLista();
  }

  const nomeTurma = () => st.turma?.nome ?? '';

  function telaLista() {
    const estados = st.turma?.estadoFases ?? {};
    const textos = st.mundo?.textos ?? {};
    const itens = st.fases.map((f) => {
      const est = estados[f.id] ?? 'trancada';
      const cod = `<span class="cod">${esc(f.codigo)}</span><span class="nm">${esc(f.nome)}</span>`;
      if (est === 'aberta' || est === 'encerrada') {
        const sit = situacao(f, st.progresso[f.id], st.aval[f.id]);
        return `<li><button class="fase ${sit === 'afazer' ? 'afazer' : ''}" data-fase="${esc(f.id)}">${cod}<span class="chip sit-${sit}">${SITUACAO_ROTULO[sit]}</span></button></li>`;
      }
      const placa = est === 'adiada' ? textos.adiada : est === 'cancelada' ? textos.cancelada : textoPlaca(textos, f);
      return `<li><div class="fase obra e-${est}">${cod}<span class="placa">${esc(placa ?? 'Em obra.')}</span></div></li>`;
    }).join('');
    tela(
      `<section class="cartao largo">
        <div class="cab-aluno">
          ${imgAvatar(st.dados.avatar, 'avatar p')}
          <div><strong>${esc(st.dados.apelido)}</strong><br><span class="nota">${esc(nomeTurma())}</span></div>
          <button id="trocar" class="mini">Avatar</button>
        </div>
        <h2>${esc(st.mundo?.nome ?? 'Vila dos Planos')}</h2>
        <ul class="lista">${itens || '<li class="vazio">As fases ainda estão sendo preparadas.</li>'}</ul>
        <button id="sair" class="botao secundario">Sair</button>
      </section>`,
      'centro alto'
    );
  }

  function telaCartao() {
    const f = st.fases.find((x) => x.id === st.faseAberta);
    const est = st.turma?.estadoFases?.[st.faseAberta];
    if (!f || !(est === 'aberta' || est === 'encerrada')) { st.faseAberta = null; return telaLista(); }
    const p = st.progresso[f.id];
    const a = st.aval[f.id];
    const sit = situacao(f, p, a);
    const { total, feitas } = contarTarefas(f, p);
    const habs = st.mundo?.habilidades ?? {};

    const criterios = (f.habilidades ?? []).map((cod) => {
      const c = f.criterios?.[cod] ?? {};
      return `<div class="crit"><strong>${esc(cod)}</strong> <span class="nota">${esc(habs[cod] ?? '')}</span>
        ${f.evidencias?.[cod] ? `<p class="nota">Evidência: ${esc(f.evidencias[cod])}</p>` : ''}
        <dl><dt>A</dt><dd>${esc(c.A ?? '')}</dd><dt>PA</dt><dd>${esc(c.PA ?? '')}</dd><dt>NA</dt><dd>${esc(c.NA ?? '')}</dd></dl></div>`;
    }).join('');

    const mencoes = a?.validada && a.mencoes && Object.keys(a.mencoes).length
      ? `<div class="mencoes"><strong>Sua menção nesta fase</strong>${Object.entries(a.mencoes).filter(([, v]) => v).map(([cod, v]) => `<p>${esc(cod)}: <span class="chip m-${esc(v)}">${esc(v)}</span></p>`).join('')}</div>`
      : '';

    tela(
      `<section class="cartao largo esq">
        <button id="voltar" class="mini">← Fases</button>
        <h1>${esc(f.codigo)} · ${esc(f.nome)}</h1>
        <p class="centro-txt"><span class="chip sit-${sit}">${SITUACAO_ROTULO[sit]}</span>${est === 'encerrada' ? ' <span class="chip">Fase encerrada</span>' : ''}</p>
        ${a?.faltou && !p?.concluida ? '<p class="banner">Você não estava na dinâmica desta fase, então ela ficou <strong>a fazer</strong>. Leia a missão, faça as tarefas (peça ajuda ao professor ou aos colegas) e marque como concluída quando terminar.</p>' : ''}
        ${mencoes}
        <h2>Missão</h2>
        <p>${esc(f.missao)}</p>
        <h2>O que fazer</h2>
        <ol>${(f.instrucoes ?? []).map((i) => `<li>${esc(i)}</li>`).join('')}</ol>
        ${total ? `<h2>Minhas tarefas <span class="nota">(${feitas} de ${total})</span></h2>
          <ul class="tarefas">${f.tarefas.map((t) => `<li><label class="check"><input type="checkbox" data-tarefa="${esc(t.id)}" ${p?.tarefas?.[t.id] ? 'checked' : ''}> ${esc(t.texto)}</label></li>`).join('')}</ul>` : ''}
        ${criterios ? `<details><summary>Como serei avaliado</summary>${criterios}</details>` : f.avaliacao ? `<p class="nota">${esc(f.avaliacao)}</p>` : ''}
        ${f.cartaoResumo ? `<details><summary>Resumo da fase</summary><p>${esc(f.cartaoResumo)}</p></details>` : ''}
        <p class="erro" id="msg">${esc(st.aviso)}</p>
        ${f.tipo === 'chefao' ? '' : `<button id="concluir" class="botao ${p?.concluida ? 'secundario' : ''}">${p?.concluida ? 'Desmarcar como concluída' : 'Marcar a fase como concluída'}</button>`}
      </section>`,
      'centro alto'
    );
  }

  function telaAvatar() {
    const mestre = st.escolha.fantasia === 'mestre';
    tela(
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

  async function marcarTarefa(faseId, tarefaId, valor) {
    const p = st.progresso[faseId];
    const dados = { tarefas: { [tarefaId]: valor }, atualizadoEm: serverTimestamp() };
    if (!p) Object.assign(dados, { uid: user.uid, turma: st.dados.turma, fase: faseId, concluida: false });
    await setDoc(doc(db, 'progresso', progId(user.uid, faseId)), dados, { merge: true });
  }

  async function alternarConcluida(faseId) {
    const f = st.fases.find((x) => x.id === faseId);
    const p = st.progresso[faseId];
    const nova = !p?.concluida;
    if (nova && f) {
      const { total, feitas } = contarTarefas(f, p);
      if (feitas < total && !confirm(`Ainda faltam ${total - feitas} tarefa(s). Marcar a fase como concluída mesmo assim?`)) return;
    }
    const dados = { concluida: nova, concluidaEm: nova ? serverTimestamp() : null, atualizadoEm: serverTimestamp() };
    if (!p) Object.assign(dados, { uid: user.uid, turma: st.dados.turma, fase: faseId, tarefas: {} });
    await setDoc(doc(db, 'progresso', progId(user.uid, faseId)), dados, { merge: true });
  }

  app.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.id === 'sair') { signOut(auth); return; }
      if (b.dataset.fase) { st.faseAberta = b.dataset.fase; st.aviso = ''; desenhar(); return; }
      if (b.id === 'voltar') { st.faseAberta = null; st.aviso = ''; desenhar(); return; }
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
    const c = e.target.closest('input[data-tarefa]');
    if (!c) return;
    try { await marcarTarefa(st.faseAberta, c.dataset.tarefa, c.checked); }
    catch { c.checked = !c.checked; aviso('Não consegui salvar a tarefa. Tente de novo.'); }
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
