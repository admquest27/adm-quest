import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, provedorGoogle } from './firebase.js';
import { tela, esc, carregando } from './ui.js';
import { iniciarAluno } from './aluno.js';
import { iniciarProfessor } from './professor.js';

let parar = null;

// Avisa quando existe uma versão nova do site, para ninguém ficar com uma versão antiga na memória do navegador.
function mostrarAvisoVersao() {
  if (document.getElementById('aviso-versao')) return;
  const d = document.createElement('div');
  d.id = 'aviso-versao';
  d.className = 'aviso-versao';
  d.innerHTML = 'Há uma versão nova do jogo. <button type="button" class="mini">Atualizar agora</button>';
  d.querySelector('button').onclick = () => location.reload();
  document.body.appendChild(d);
}

async function verificarVersao() {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}versao.txt?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const nova = (await r.text()).trim();
    if (nova && nova !== __VERSAO__) mostrarAvisoVersao();
  } catch { /* sem rede: tenta de novo depois */ }
}
verificarVersao();
setInterval(verificarVersao, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) verificarVersao(); });

function telaLogin(erro) {
  tela(
    `<section class="cartao">
      <h1>ADM Quest</h1>
      <p class="sub">Vila dos Planos</p>
      <button id="entrar" class="botao">Entrar com Google</button>
      ${erro ? `<p class="erro">${esc(erro)}</p>` : ''}
      <p class="nota">O jogo guarda só o seu apelido, o seu progresso e o e-mail da conta. Só o professor vê esses dados.</p>
    </section>`,
    'centro'
  );
  document.getElementById('entrar').addEventListener('click', entrar);
}

async function entrar() {
  try {
    await signInWithPopup(auth, provedorGoogle);
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    if (e.code === 'auth/popup-blocked') { telaLogin('O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.'); return; }
    if (e.code === 'auth/unauthorized-domain') { telaLogin('Este endereço ainda não foi autorizado no Firebase. Avise o professor.'); return; }
    telaLogin('Não deu certo entrar agora. Tente de novo em instantes.');
  }
}

// O professor pode ver o jogo como um aluno (somente leitura) e voltar ao painel.
function comoProfessor(user) {
  if (parar) parar();
  parar = iniciarProfessor(user, {
    verComoAluno: (uid) => {
      if (parar) parar();
      parar = iniciarAluno(user, { uid, aoSair: () => comoProfessor(user) });
    },
  });
}

onAuthStateChanged(auth, async (user) => {
  if (parar) { parar(); parar = null; }
  if (!user) { telaLogin(); return; }
  carregando('O Consultor Cinzento está chegando. Exatamente no prazo.');
  const token = await user.getIdTokenResult(true);
  if (token.claims.professor === true) comoProfessor(user);
  else parar = iniciarAluno(user);
});
