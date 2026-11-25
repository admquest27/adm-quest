// Tela de carregamento: fundo escuro e calmo, com a Rosalina trotando no canto. A montagem do mapa ocupa o
// aparelho por alguns segundos, por isso as animações usam só CSS (transform e opacity), que continuam rodando.
import { quadro } from './pixel/rosalina.js';
import { desenha } from './pixel/formas.js';

let passos = null;
function passo(n) {
  const c = document.createElement('canvas'); c.width = 44; c.height = 32; desenha(c.getContext('2d'), quadro('lado', { passo: n, rabo: n ? -1 : 0, orelha: n }), 0, 1); return c.toDataURL();
}

// botaoLista: oferece o caminho pela lista para quem estiver com a internet fraca (aparece depois de alguns segundos)
export function htmlCarregando({ botaoLista = false } = {}) {
  passos ??= [passo(0), passo(1)];
  return `<div class="cg-mapa" role="status" aria-label="Carregando">
    ${botaoLista ? '<button type="button" class="cg-lista" data-lista>Ver como lista</button>' : ''}
    <div class="cg-canto" aria-hidden="true">
      <div class="cg-cadela"><img src="${passos[0]}" alt=""><img src="${passos[1]}" alt=""></div>
      <span>Carregando<b>.</b><b>.</b><b>.</b></span>
    </div>
  </div>`;
}
