// Tela de carregamento do mapa: a Rosalina caminhando e frases do reino. A montagem do mapa ocupa o aparelho por
// alguns segundos, por isso as animações usam só CSS (transform e opacity), que continuam rodando nesse tempo.
import { quadro } from './pixel/rosalina.js';
import { desenha } from './pixel/formas.js';

const FRASES = ['Varrendo a praça da Vila...', 'Acendendo os lampiões...', 'Enchendo o rio, balde por balde...', 'Penteando a Rosalina...', 'O Consultor Cinzento está revisando o cronograma...', 'Escondendo os segredos...'];

function passo(n) {
  const c = document.createElement('canvas'); c.width = 44; c.height = 32; desenha(c.getContext('2d'), quadro('lado', { passo: n, rabo: n ? -1 : 0, orelha: n }), 0, 1); return c.toDataURL();
}

export function htmlCarregando() {
  const frases = FRASES.map((f, k) => `<span style="animation-delay:${k * 2.4}s">${f}</span>`).join('');
  return `<div class="cg-mapa" role="status" aria-label="Abrindo o mapa da Vila">
    <p class="cg-titulo">Abrindo a Vila dos Planos</p>
    <div class="cg-pista"><div class="cg-cadela"><img src="${passo(0)}" alt=""><img src="${passo(1)}" alt=""></div></div>
    <div class="cg-barra"><i></i></div>
    <p class="cg-frases">${frases}</p>
    <button type="button" class="btn claro" data-lista>Ver como lista</button>
  </div>`;
}
