// Tela de criação do avatar: prévia animada e abas Corpo, Cabelo e Roupa.
// As escolhas ficam em st.escolha (formato de avatar.js) e só vão para o banco no "Salvar".
import { catalogo, folha, normalizar, imgAvatar, PELES, CORES_CABELO, CORES_OLHOS, CORES_ROUPA } from './avatar.js';
import { esc } from './ui.js';

export const ABAS = [['corpo', 'Corpo'], ['cabelo', 'Cabelo'], ['roupa', 'Roupa']];

// Cor de amostra de cada opção (um tom do meio da rampa).
function amostra(cat, mat, id) { const r = cat.paletas[mat].cores[id]; if (!r) return '#888'; return r.length <= 3 ? r[1] : r[mat === 'cloth' ? 4 : 3]; }

function cores(cat, campo, mat, lista, atual, titulo) {
  return `<div class="av-linha"><b>${titulo}</b><div class="av-cores" role="radiogroup" aria-label="${titulo}">
    ${lista.map(([id, nome]) => `<button type="button" class="av-cor" role="radio" aria-checked="${id === atual}" aria-label="${esc(nome)}" title="${esc(nome)}" data-av-c="${campo}" data-av-v="${id}" style="background:${amostra(cat, mat, id)}"></button>`).join('')}
  </div></div>`;
}
function pecas(cat, grupo, av, titulo, modo) {
  return `<div class="av-linha"><b>${titulo}</b><div class="av-pecas av-m-${modo}" role="radiogroup" aria-label="${titulo}">
    ${cat.grupos[grupo].map((p) => `<button type="button" class="av-peca" role="radio" aria-checked="${p.id === av[grupo]}" data-av-c="${grupo}" data-av-v="${p.id}" title="${esc(p.nome)}">${imgAvatar({ ...av, [grupo]: p.id }, 'av-mini', modo)}<span>${esc(p.nome)}</span></button>`).join('')}
  </div></div>`;
}

export async function htmlCriador({ escolha, aba = 'corpo', primeiraVez, erro = '' }) {
  const cat = await catalogo();
  const av = normalizar(escolha);
  let corpo = '';
  if (aba === 'corpo') {
    corpo = cores(cat, 'pele', 'body', PELES, av.pele, 'Tom de pele')
      + pecas(cat, 'rosto', av, 'Rosto', 'rosto')
      + cores(cat, 'olhos', 'eye', CORES_OLHOS, av.olhos, 'Olhos')
      + pecas(cat, 'nariz', av, 'Nariz', 'rosto')
      + pecas(cat, 'sobrancelha', av, 'Sobrancelhas', 'rosto');
  } else if (aba === 'cabelo') {
    corpo = cores(cat, 'corCabelo', 'hair', CORES_CABELO, av.corCabelo, 'Cor do cabelo')
      + pecas(cat, 'cabelo', av, 'Corte', 'retrato');
  } else {
    corpo = pecas(cat, 'cima', av, 'Parte de cima', 'corpo') + cores(cat, 'corCima', 'cloth', CORES_ROUPA, av.corCima, 'Cor da parte de cima')
      + pecas(cat, 'baixo', av, 'Parte de baixo', 'corpo') + cores(cat, 'corBaixo', 'cloth', CORES_ROUPA, av.corBaixo, 'Cor da parte de baixo')
      + pecas(cat, 'pes', av, 'Calçado', 'corpo') + cores(cat, 'corPes', 'cloth', CORES_ROUPA, av.corPes, 'Cor do calçado');
  }
  return `<section class="cartao largo criador">
    <h1>${primeiraVez ? 'Monte o seu avatar' : 'Editar avatar'}</h1>
    <p class="sub">${primeiraVez ? 'É assim que você vai aparecer na Vila. Dá para mudar quando quiser.' : 'As mudanças só valem depois de salvar.'}</p>
    <div class="av-topo">
      <div class="av-palco"><canvas id="av-previa" width="64" height="64" aria-label="Prévia do avatar"></canvas>
        <div class="av-giro">
          <button type="button" class="botao secundario mini" data-av-giro="-1" aria-label="Virar para a esquerda">◀</button>
          <button type="button" class="botao secundario mini" data-av-pulo="1">Pular</button>
          <button type="button" class="botao secundario mini" data-av-giro="1" aria-label="Virar para a direita">▶</button>
        </div>
      </div>
      <div class="av-acoes">
        <button type="button" class="botao secundario" id="av-surpresa">🎲 Surpresa</button>
        <button type="button" class="botao" id="salvar">Salvar avatar</button>
        ${primeiraVez ? '' : '<button type="button" class="botao secundario" id="cancelar">Voltar sem salvar</button>'}
        <p class="erro" id="msg">${esc(erro)}</p>
      </div>
    </div>
    <div class="av-abas" role="tablist">
      ${ABAS.map(([id, nome]) => `<button type="button" role="tab" class="av-aba" aria-selected="${id === aba}" data-av-aba="${id}">${nome}</button>`).join('')}
    </div>
    <div class="av-painel" role="tabpanel">${corpo}</div>
  </section>`;
}

// Prévia: anda no lugar e gira; "Pular" toca o pulo uma vez.
const GIRO = [2, 1, 0, 3]; // baixo, esquerda, cima, direita
export function animarPrevia(estado) {
  const cv = document.getElementById('av-previa');
  if (!cv) return;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0;
  const passo = async () => {
    if (!cv.isConnected) return;
    t++;
    const av = estado.escolha;
    const dir = GIRO[((estado.giro % 4) + 4) % 4];
    try {
      g.clearRect(0, 0, 64, 64);
      if (estado.pulo > 0) {
        const f = await folha(av, 'jump'); const q = Math.min(4, Math.floor((24 - estado.pulo) / 5));
        g.drawImage(f, q * 64, dir * 64, 64, 64, 0, 0, 64, 64); estado.pulo--;
      } else {
        const f = await folha(av, 'walk'); const q = reduz ? 0 : 1 + (Math.floor(t / 6) % 8);
        g.drawImage(f, q * 64, dir * 64, 64, 64, 0, 0, 64, 64);
      }
    } catch { /* peça ainda carregando */ }
    requestAnimationFrame(passo);
  };
  if (!cv.dataset.anima) { cv.dataset.anima = '1'; requestAnimationFrame(passo); }
}
