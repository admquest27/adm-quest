import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { app, tela, esc, carregando } from './ui.js';
import { FANTASIAS, TONS, imgAvatar } from './avatar.js';

export function iniciarAluno(user) {
  const ref = doc(db, 'alunos', user.uid);
  let dados = null;
  let editandoAvatar = false;
  let acessoRegistrado = false;
  let escolha = { fantasia: 'heroi', tom: 2 };

  carregando('Procurando o seu cadastro...');

  const parar = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        dados = null;
        telaPrimeiroAcesso();
        return;
      }
      dados = snap.data();
      desenhar();
    },
    () => telaErro('Não consegui ler o seu cadastro. Tente de novo em instantes.')
  );

  function ligarSair() {
    const b = document.getElementById('sair');
    if (b) b.onclick = () => signOut(auth);
  }

  function telaErro(texto) {
    tela(`<section class="cartao"><h1>Ops</h1><p>${esc(texto)}</p><button id="sair" class="botao secundario">Sair</button></section>`, 'centro');
    ligarSair();
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
    ligarSair();
    const codigo = document.getElementById('codigo');
    codigo.addEventListener('input', () => { codigo.value = codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    document.getElementById('form-entrada').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('msg');
      const cod = codigo.value.trim().toUpperCase();
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
  }

  function desenhar() {
    switch (dados.status) {
      case 'ativo':
        if (!acessoRegistrado) {
          acessoRegistrado = true;
          updateDoc(ref, { ultimoAcesso: serverTimestamp() }).catch(() => {});
        }
        if (!dados.avatar || editandoAvatar) telaAvatar();
        else telaInicio();
        break;
      case 'saiu':
        tela(`<section class="cartao"><h1>Até a próxima!</h1><p>Obrigado pela jornada. Foi bom ter você por aqui.</p><button id="sair" class="botao secundario">Sair</button></section>`, 'centro');
        ligarSair();
        break;
      case 'bloqueado':
        tela(`<section class="cartao"><h1>Acesso pausado</h1><p>Converse com o professor para voltar ao jogo.</p><button id="sair" class="botao secundario">Sair</button></section>`, 'centro');
        ligarSair();
        break;
      default:
        tela(
          `<section class="cartao">
            <h1>Quase lá</h1>
            <p>Cadastro recebido, <strong>${esc(dados.apelido)}</strong>! O professor precisa aprovar a sua entrada. Esta tela muda sozinha quando isso acontecer.</p>
            <button id="sair" class="botao secundario">Sair</button>
          </section>`,
          'centro'
        );
        ligarSair();
    }
  }

  function telaInicio() {
    tela(
      `<section class="cartao">
        <div class="avatar-grande">${imgAvatar(dados.avatar, 'avatar g')}</div>
        <h1>Olá, ${esc(dados.apelido)}!</h1>
        <p class="sub" id="nome-turma">Vila dos Planos</p>
        <p>O mapa da Vila dos Planos chega nas próximas etapas. Por enquanto, você já pode escolher o seu avatar.</p>
        <button id="trocar" class="botao">Trocar avatar</button>
        <button id="sair" class="botao secundario">Sair</button>
      </section>`,
      'centro'
    );
    ligarSair();
    document.getElementById('trocar').onclick = () => { escolha = { ...dados.avatar }; editandoAvatar = true; desenhar(); };
    getDoc(doc(db, 'turmas', dados.turma)).then((t) => {
      const el = document.getElementById('nome-turma');
      if (el && t.exists()) el.textContent = `${t.data().nome} · Vila dos Planos`;
    }).catch(() => {});
  }

  function telaAvatar() {
    if (dados.avatar && !editandoAvatar) escolha = { ...dados.avatar };
    const mestre = escolha.fantasia === 'mestre';
    tela(
      `<section class="cartao largo">
        <h1>Escolha o seu avatar</h1>
        <div class="avatar-grande">${imgAvatar(escolha, 'avatar g')}</div>
        <p class="sub">${esc(FANTASIAS.find((f) => f.id === escolha.fantasia)?.nome ?? '')}</p>
        <div class="grade-avatar" role="radiogroup" aria-label="Fantasia">
          ${FANTASIAS.map((f) => `<button type="button" class="opcao ${f.id === escolha.fantasia ? 'sel' : ''}" data-f="${f.id}" aria-label="${esc(f.nome)}">${imgAvatar({ fantasia: f.id, tom: escolha.tom }, 'avatar')}</button>`).join('')}
        </div>
        ${mestre ? '<p class="nota">Esta fantasia tem pele própria.</p>' : `
        <p class="sub">Cor da pele</p>
        <div class="tons" role="radiogroup" aria-label="Cor da pele">
          ${TONS.map((c, i) => `<button type="button" class="tom ${i === escolha.tom ? 'sel' : ''}" data-t="${i}" style="background:${c}" aria-label="Tom ${i + 1}"></button>`).join('')}
        </div>`}
        <p class="erro" id="msg"></p>
        <button id="salvar" class="botao">Salvar avatar</button>
        ${dados.avatar ? '<button id="cancelar" class="botao secundario">Voltar</button>' : ''}
      </section>`,
      'centro'
    );
    app.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { escolha.fantasia = b.dataset.f; telaAvatar(); }; });
    app.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { escolha.tom = Number(b.dataset.t); telaAvatar(); }; });
    const cancelar = document.getElementById('cancelar');
    if (cancelar) cancelar.onclick = () => { editandoAvatar = false; desenhar(); };
    document.getElementById('salvar').onclick = async () => {
      const eraEdicao = editandoAvatar;
      editandoAvatar = false;
      try {
        await updateDoc(ref, { avatar: { fantasia: escolha.fantasia, tom: escolha.tom } });
      } catch {
        editandoAvatar = eraEdicao;
        const msg = document.getElementById('msg');
        if (msg) msg.textContent = 'Não consegui salvar agora. Tente de novo.';
      }
    };
  }

  return parar;
}
