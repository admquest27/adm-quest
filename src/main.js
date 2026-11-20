import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, provedorGoogle } from './firebase.js';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import { carregando } from './ui.js';
import { mostrarAbertura, erroAbertura } from './abertura.js';
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

// A abertura aparece para quem ainda não entrou e uma vez por sessão para o aluno. O professor vai direto ao painel.
let pararAbertura = null;
let entrouAgora = false;
const fecharAbertura = () => { if (pararAbertura) { pararAbertura(); pararAbertura = null; } };
const ABERTURA_VISTA = 'admq-abertura-vista';
const aberturaVista = () => { try { return sessionStorage.getItem(ABERTURA_VISTA) === '1'; } catch { return false; } };
const marcarAbertura = () => { try { sessionStorage.setItem(ABERTURA_VISTA, '1'); } catch { /* segue */ } };

function telaLogin(erro) {
  fecharAbertura();
  pararAbertura = mostrarAbertura({ aoEntrar: entrar, erro });
}

async function entrar() {
  entrouAgora = true;
  marcarAbertura();
  try {
    await signInWithPopup(auth, provedorGoogle);
  } catch (e) {
    entrouAgora = false;
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    if (e.code === 'auth/popup-blocked') { erroAbertura('O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.'); return; }
    if (e.code === 'auth/unauthorized-domain') { erroAbertura('Este endereço ainda não foi autorizado no Firebase. Avise o professor.'); return; }
    erroAbertura('Não deu certo entrar agora. Tente de novo em instantes.');
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
  const token = await user.getIdTokenResult(true);
  if (token.claims.professor === true) { fecharAbertura(); comoProfessor(user); return; }
  if (entrouAgora || aberturaVista()) { fecharAbertura(); entrouAgora = false; carregando('O Consultor Cinzento está chegando. Exatamente no prazo.'); parar = iniciarAluno(user); return; }
  pararAbertura = mostrarAbertura({
    logado: true,
    aoEntrar: () => { marcarAbertura(); fecharAbertura(); carregando('O Consultor Cinzento está chegando. Exatamente no prazo.'); parar = iniciarAluno(user); },
  });
});
