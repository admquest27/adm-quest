import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getCountFromServer, collection } from 'firebase/firestore';
import { auth, db, provedorGoogle } from './firebase.js';

const app = document.getElementById('app');

function tela(html) {
  app.innerHTML = html;
}

function telaLogin(erro) {
  tela(`
    <section class="cartao">
      <h1>ADM Quest</h1>
      <p class="sub">Vila dos Planos</p>
      <button id="entrar" class="botao">Entrar com Google</button>
      ${erro ? `<p class="erro">${erro}</p>` : ''}
      <p class="nota">O jogo guarda só o seu apelido, o seu progresso e o e-mail da conta. Só o professor vê esses dados.</p>
    </section>
  `);
  document.getElementById('entrar').addEventListener('click', entrar);
}

async function entrar() {
  try {
    await signInWithPopup(auth, provedorGoogle);
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    if (e.code === 'auth/popup-blocked') {
      telaLogin('O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.');
      return;
    }
    if (e.code === 'auth/unauthorized-domain') {
      telaLogin('Este endereço ainda não foi autorizado no Firebase. Avise o professor.');
      return;
    }
    telaLogin('Não deu certo entrar agora. Tente de novo em instantes.');
  }
}

function botaoSair() {
  const b = document.getElementById('sair');
  if (b) b.addEventListener('click', () => signOut(auth));
}

async function telaProfessor() {
  tela(`
    <section class="cartao">
      <h1>Olá, professor!</h1>
      <p>As regras de segurança reconheceram a sua conta. Tudo certo por aqui.</p>
      <p id="contagem" class="nota">Conferindo o banco de dados...</p>
      <button id="sair" class="botao secundario">Sair</button>
    </section>
  `);
  botaoSair();
  try {
    const total = await getCountFromServer(collection(db, 'alunos'));
    document.getElementById('contagem').textContent =
      `Cadastros de alunos no banco: ${total.data().count}.`;
  } catch {
    document.getElementById('contagem').textContent =
      'Não consegui ler o banco. Confira as regras de segurança.';
  }
}

async function telaAluno(user) {
  const ref = doc(db, 'alunos', user.uid);
  let status = 'pendente';
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      status = snap.data().status ?? 'pendente';
    } else {
      await setDoc(ref, { status: 'pendente', criadoEm: serverTimestamp() });
    }
  } catch {
    telaLogin('Não consegui registrar o seu cadastro. Tente de novo em instantes.');
    return;
  }
  const mensagens = {
    pendente: 'Cadastro recebido! O professor precisa aprovar a sua entrada. Volte daqui a pouco.',
    ativo: 'Cadastro aprovado. O mapa chega nas próximas etapas.',
    saiu: 'Obrigado pela jornada. Até a próxima aventura!',
  };
  tela(`
    <section class="cartao">
      <h1>Quase lá</h1>
      <p>${mensagens[status] ?? mensagens.pendente}</p>
      <button id="sair" class="botao secundario">Sair</button>
    </section>
  `);
  botaoSair();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    telaLogin();
    return;
  }
  tela('<p class="carregando">O Consultor Cinzento está chegando. Exatamente no prazo.</p>');
  const token = await user.getIdTokenResult(true);
  if (token.claims.professor === true) {
    await telaProfessor();
  } else {
    await telaAluno(user);
  }
});
