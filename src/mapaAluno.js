// Mapa do mundo dentro da tela do aluno: abre por cima da lista de fases, com os estados reais da turma.
// Os segredos achados ficam no banco (segredos/{uid}); a posição, a apresentação já vista e os caminhos já
// revelados ficam só no aparelho. O Phaser só é baixado quando o aluno abre o mapa pela primeira vez.
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from './firebase.js';
import { situacao } from './fases.js';
import { FALAS_PADRAO } from './pixel/rosalina.js';

const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v === null ? padrao : JSON.parse(v); } catch { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* aparelho sem armazenamento */ } };
const ABERTA = (e) => e === 'aberta' || e === 'encerrada';

// Estados da turma, fases que o aluno concluiu e nome de cada fase, no formato que o mapa usa.
export function dadosDoMapa(st) {
  const estados = st.turma?.estadoFases ?? {};
  const concluidas = st.fases
    .filter((f) => ['concluida', 'validada'].includes(situacao(f, st.progresso[f.id], st.aval[f.id], estados[f.id] ?? 'trancada')))
    .map((f) => f.id);
  const fases = Object.fromEntries(st.fases.map((f) => [f.id, { codigo: f.codigo ?? '', nome: f.nome ?? '' }]));
  return { estados, concluidas, fases };
}

// Qual caminho revelar com animação: a primeira fase aberta desde a última visita (na primeira visita, nenhuma).
export function caminhoNovo(estados, vistas) {
  const abertas = Object.keys(estados).filter((id) => ABERTA(estados[id])).sort();
  if (vistas === null) return { revelar: null, vistas: abertas };
  const novo = abertas.find((id) => !vistas.includes(id)) ?? null;
  return { revelar: novo, vistas: [...new Set([...vistas, ...abertas])] };
}

export function criarMapaAluno({ alvo, ver, turma, aoAbrirFase, aoVoltar }) {
  const raiz = document.createElement('div');
  raiz.className = 'mapa-tela'; raiz.hidden = true;
  document.body.appendChild(raiz);
  let api = null; let carregando = false; let destruido = false; let ultimo = '';
  const chave = (k) => `admq-mapa-${k}-${alvo}`;

  async function iniciar(st) {
    carregando = true;
    raiz.innerHTML = '<p class="mapa-carregando">Abrindo o mapa da Vila...</p>';
    const [modulo, seg] = await Promise.all([
      import('./mapa/cena.js'),
      getDoc(doc(db, 'segredos', alvo)).catch(() => null),
    ]);
    if (destruido) return;
    raiz.innerHTML = '';
    const { estados, concluidas, fases } = dadosDoMapa(st);
    const m = st.mundo ?? {};
    const tx = m.mapa ?? {};
    const textos = {
      ...tx,
      rosalina: tx.rosalina ?? FALAS_PADRAO,
      placas: tx.placas ?? m.textos?.placas,
      adiada: tx.adiada ?? m.textos?.adiada,
      cancelada: tx.cancelada ?? m.textos?.cancelada,
    };
    // apresentação só na primeira vez; caminhos novos são revelados; o castelo cai quando o chefão é encerrado
    const primeiraVez = !ver && !ler(chave('intro'), false);
    if (primeiraVez) gravar(chave('intro'), true);
    const cam = caminhoNovo(estados, ver ? [] : ler(chave('vistas'), null));
    if (!ver) gravar(chave('vistas'), cam.vistas);
    const caiu = estados.m1chefao === 'encerrada';
    const viuCair = ler(chave('castelo'), false);
    if (caiu && !viuCair && !ver) gravar(chave('castelo'), true);
    api = modulo.iniciarMapa(raiz, {
      botoesBarra: '<button class="mapa-btn" id="mapa-lista" aria-label="Voltar para a lista de fases">Fases</button>',
      urls: { base: `${import.meta.env.BASE_URL}mapa/na/` },
      nomeMundo: `Mundo ${m.ordem ?? 1} · ${m.nome ?? 'Vila dos Planos'}`,
      primeiraVez,
      revelar: primeiraVez ? null : cam.revelar,
      casteloCaido: caiu && (viuCair || ver),
      derrotar: caiu && !viuCair && !ver,
      estados, concluidas, fases, textos,
      posicao: ler(chave('pos'), null),
      segredosAchados: seg?.exists() ? seg.data().achados ?? [] : [],
      aoMover: (p) => { if (!ver) gravar(chave('pos'), p); },
      aoAcharSegredo: (id) => {
        if (ver) return;
        setDoc(doc(db, 'segredos', alvo), { turma, achados: arrayUnion(id), atualizadoEm: serverTimestamp() }, { merge: true }).catch(() => {});
      },
      aoAbrirFase: (id) => aoAbrirFase(id),
      aoCasteloCair: () => { if (textos.casteloCaiu) api?.falar({ nome: textos.nomes?.barao ?? '', rosto: 'barao', texto: textos.casteloCaiu }); },
    });
    raiz.querySelector('#mapa-lista')?.addEventListener('click', () => aoVoltar());
    carregando = false;
    if (raiz.hidden) api.pausar();
  }

  return {
    // abre (ou volta) o mapa e atualiza os estados das fases
    mostrar(st) {
      const estavaEscondido = raiz.hidden;
      raiz.hidden = false;
      if (!api) { if (!carregando) iniciar(st).catch(() => { carregando = false; raiz.innerHTML = '<p class="mapa-carregando">Não consegui abrir o mapa. Confira a internet e tente de novo.</p>'; }); return; }
      if (estavaEscondido) api.retomar();
      const { estados, concluidas } = dadosDoMapa(st);
      const k = JSON.stringify([estados, concluidas]);
      if (k !== ultimo) { ultimo = k; api.atualizarEstados(estados, concluidas); }
    },
    esconder() { if (raiz.hidden) return; raiz.hidden = true; api?.pausar(); },
    destruir() { destruido = true; api?.destruir(); raiz.remove(); },
  };
}
