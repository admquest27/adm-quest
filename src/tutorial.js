// Tutorial do primeiro acesso e cartões "Novidade!" quando o professor liga um recurso. Funções puras + memória no aparelho.

export const TUTORIAL = [
  { titulo: 'Cada semana é uma fase', texto: 'Na lista, toque numa fase aberta para ver a missão e as etapas. As fases "em obra" o professor ainda vai abrir.' },
  { titulo: 'Marque "Feito" em cada etapa', texto: 'Fez a etapa? Marque "Feito". A parte de segunda abre no laboratório, quando o professor liberar.' },
  { titulo: 'Conclua a fase', texto: 'Com todas as etapas feitas, toque em "Concluir a fase". O professor confere e valida.' },
];

export const NOVIDADES = {
  admbux: { titulo: 'Novidade: AdmBux!', texto: (x) => `Você ganha AdmBux quando o professor valida uma fase, quando faz um bônus e por atitudes que ele registra. Você já tem ${x.saldo}. Toque em 🪙, no topo, para ver o saldo, a loja e as conquistas.` },
  guildas: { titulo: 'Novidade: guildas!', texto: () => 'A guilda é o seu grupo fixo até o fim do mundo. Toque em "Guilda", no topo, para ver quem está com você e criar o nome e o escudo.' },
};

// Memória "já vi" no aparelho. Se o navegador não guardar, vale só nesta sessão.
const sessao = new Set();
export function jaViu(chave) {
  if (sessao.has(chave)) return true;
  try { return localStorage.getItem(chave) === '1'; } catch { return false; }
}
export function marcarVisto(chave) {
  sessao.add(chave);
  try { localStorage.setItem(chave, '1'); } catch { /* sem armazenamento: só nesta sessão */ }
}

export function htmlTutorial(passo) {
  const p = TUTORIAL[passo];
  const ultimo = passo === TUTORIAL.length - 1;
  return `<div class="tutorial" role="dialog" aria-label="Como funciona o jogo">
    <p class="nota">${passo + 1} de ${TUTORIAL.length}</p>
    <h2>${p.titulo}</h2><p>${p.texto}</p>
    <div class="linha-btn"><button class="botao" id="tut-prox">${ultimo ? 'Começar' : 'Próximo'}</button>${ultimo ? '' : '<button class="botao secundario" id="tut-pular">Pular</button>'}</div></div>`;
}

export function htmlNovidade(id, dados) {
  const n = NOVIDADES[id];
  return `<div class="novidade" role="status"><span aria-hidden="true">✨</span><div><strong>${n.titulo}</strong><p>${n.texto(dados)}</p></div><button class="mini" data-novidade="${id}">Entendi</button></div>`;
}
