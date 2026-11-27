// Moldura das telas do aluno: faixa com a Vila, painel de pergaminho e o menu fixo do jogo.
import { esc } from './ui.js';

const ICONES = {
  mapa: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
  fases: '<path d="M5 21V4M5 4h13l-3 4 3 4H5"/>',
  guilda: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
  mochila: '<path d="M6 9a6 6 0 0 1 12 0v11H6zM9 5V3h6v2M9 14h6"/>',
};
const NOMES = { mapa: 'Mapa', fases: 'Fases', guilda: 'Guilda', mochila: 'Mochila' };

// Mapa e Guilda só aparecem quando o professor liga o recurso na turma.
export function htmlMenu(aba, rec = {}, avisos = {}) {
  const itens = ['mapa', 'fases', 'guilda', 'mochila'].filter((id) => (id === 'mapa' ? rec.mapa : id === 'guilda' ? rec.guildas : true));
  return `<nav class="jg-menu" aria-label="Menu do jogo">${itens.map((id) => `<button type="button" data-nav="${id}" ${id === aba ? 'aria-current="page"' : ''}${avisos[id] ? ' class="com-aviso"' : ''}>
    <svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[id]}</svg><span>${NOMES[id]}</span></button>`).join('')}</nav>`;
}

// voltar: id do botão de voltar; direita: HTML do canto direito da faixa.
export function htmlTela({ aba, rec, avisos, selo = '', titulo, voltar = '', textoVoltar = 'Fases', direita = '', corpo }) {
  return `<div class="jg">
    <header class="jg-topo">
      <div class="jg-topo-linha">${voltar ? `<button type="button" id="${voltar}" class="jg-voltar">← ${esc(textoVoltar)}</button>` : '<span></span>'}${direita}</div>
      <div class="jg-placa">${selo ? `<span>${esc(selo)}</span>` : ''}<h1>${esc(titulo)}</h1></div>
    </header>
    <section class="jg-painel">${corpo}</section>
    ${htmlMenu(aba, rec, avisos)}
  </div>`;
}
