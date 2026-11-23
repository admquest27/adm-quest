// Planta da Vila dos Planos (Mundo 1): terreno, estradas, construções das fases, enfeites, segredos e
// personagens. Só posições e ids, em peças de 16x16 (cada peça tem 32 px na arte LPC). Os textos (falas, placas,
// segredos) vêm do banco.
//
// Leitura do mapa: o rio corta o mundo na vertical. A oeste ficam as Dunas (1-2), a Oficina (1-3) e a Praça com a
// Casa de Partida (1-1). Depois da ponte, o caminho segue em volta: Fazenda (1-4), Acampamento (1-5), Árvore do
// Comando (1-6), Missão Raio-X (1-7), Castelo e, no alto, o portal do Mundo 2.
import { RECORTES, LPC_PECAS } from './arte.js';

export const LARG = 72;
export const ALT = 42;

// Áreas de mata (desenhadas com árvores) e de água
export const FLORESTA = [
  { x: 0, y: 0, w: 39, h: 2 }, { x: 47, y: 0, w: 25, h: 2 }, { x: 0, y: 39, w: 72, h: 3 }, { x: 0, y: 0, w: 1, h: 42 }, { x: 71, y: 0, w: 1, h: 42 },
  { x: 28, y: 2, w: 4, h: 4 }, { x: 19, y: 16, w: 5, h: 4 }, { x: 24, y: 26, w: 3, h: 3 }, { x: 1, y: 16, w: 3, h: 4 },
  { x: 38, y: 3, w: 3, h: 7 }, { x: 68, y: 4, w: 3, h: 32 }, { x: 59, y: 15, w: 3, h: 3 }, { x: 66, y: 2, w: 5, h: 6 },   { x: 58, y: 38, w: 12, h: 1 },
];
export const RIO = { x: 33, w: 3 };
export const LAGOS = [{ x: 2, y: 35, w: 4, h: 3 }, { x: 52, y: 4, w: 5, h: 3 }];
export const PONTE = { y: 21, x0: 31, x1: 37 };
export const DESERTO = { cx: 9, cy: 9, rx: 8, ry: 5.5 }; // forma orgânica, desenhada pela cena

// Estradas (polilinhas em peças, pelo centro de cada peça). A primeira peça de cada uma diz qual fase ela leva.
// A ordem do mundo é uma corrente: cada estrada liga a fase anterior à próxima.
export const ESTRADAS = [
  { para: 'm1f2', pontos: [[6, 27], [6, 22], [7, 16], [9, 12], [9, 9]] },
  { para: 'm1f3', pontos: [[9, 12], [14, 13], [20, 12], [25, 11]] },
  { para: 'm1f4', pontos: [[25, 11], [27, 16], [30, 21], [38, 21], [41, 24], [46, 28], [51, 30]] },
  { para: 'm1f5', pontos: [[51, 30], [56, 29], [60, 27], [62, 25]] },
  { para: 'm1f6', pontos: [[62, 25], [65, 21], [65, 17], [64, 13]] },
  { para: 'm1f7', pontos: [[64, 13], [59, 14], [54, 14]] },
  { para: 'm1chefao', pontos: [[54, 14], [50, 13], [46, 13], [44, 12]] },
  { para: 'mundo2', pontos: [[44, 12], [43, 9], [43, 7]] },
  { para: null, pontos: [[6, 27], [11, 28], [17, 29], [21, 31]] },
  { para: null, pontos: [[17, 29], [17, 34], [20, 37]] },
  { para: null, pontos: [[11, 28], [9, 33], [8, 37]] },
  { para: null, pontos: [[41, 24], [42, 18], [45, 15]] },
  { para: null, pontos: [[56, 29], [56, 34]] },
  // caminhos até os terrenos vazios
  { para: null, pontos: [[15, 18], [14, 13]] },
  { para: null, pontos: [[28, 30], [21, 31]] },
  { para: null, pontos: [[45, 20], [41, 24]] },
  { para: null, pontos: [[56, 21], [60, 27]] },
];

// Construções das fases: canto de cima à esquerda (x, y), tamanho em peças, arte e entrada (onde fica o ponto da fase).
export const FASES = [
  { id: 'm1f1', arte: 'casaPartida', x: 5, y: 24, w: 3, h: 3, entrada: [6, 27] },
  { id: 'm1f2', arte: 'casaPedra', x: 8, y: 6, w: 3, h: 3, entrada: [9, 9] },
  { id: 'm1f3', arte: 'oficina', x: 24, y: 8, w: 3, h: 3, entrada: [25, 11] },
  { id: 'm1f4', arte: 'celeiro', x: 48, y: 27, w: 6, h: 3, entrada: [51, 30] },
  { id: 'm1f5', arte: 'barraca', x: 61, y: 22, w: 3, h: 3, entrada: [62, 25] },
  { id: 'm1f6', arte: 'arvoreGrande', x: 63, y: 10, w: 3, h: 3, entrada: [64, 13] },
  { id: 'm1f7', arte: 'raioX', x: 53, y: 11, w: 3, h: 3, entrada: [54, 14] },
  { id: 'm1chefao', arte: 'castelo', x: 43, y: 9, w: 3, h: 3, entrada: [44, 12] },
];

// Terrenos vazios (placa "Vende-se"): o professor cria fases extras neles. Cada lote tem 3x3 peças e a entrada
// logo abaixo do meio. Os ids dos lotes nunca mudam.
export const LOTES = [
  { id: 'l1', x: 14, y: 15, w: 3, h: 3, entrada: [15, 18] },
  { id: 'l2', x: 27, y: 27, w: 3, h: 3, entrada: [28, 30] },
  { id: 'l3', x: 44, y: 17, w: 3, h: 3, entrada: [45, 20] },
  { id: 'l4', x: 55, y: 18, w: 3, h: 3, entrada: [56, 21] },
];

// Enfeites: peça do pacote no canto (x, y). Bloqueiam só a base (a última linha, ou todas nas casas).
const casa = new Set(['casaLaranja', 'casaBege', 'casaLaranja2', 'casaAzul', 'casaCreme', 'casaAmarela', 'casaVerde', 'casaReta', 'casaDiag', 'loja', 'lojaVerde', 'casaPedra']);
const naoBloqueia = new Set(['florAmarela', 'florLaranja', 'florVermelha', 'florBranca', 'mato', 'trigo', 'arbusto1', 'arbusto2', 'arbusto3', 'arbusto4', 'estandarte1', 'estandarte2', 'estandarte3']);
const enfeite = (peca, x, y) => {
  const r = RECORTES[peca] ?? LPC_PECAS[peca] ?? { w: 1, h: 1 }; const fh = casa.has(peca) ? r.h : 1; // casas bloqueiam inteiras (ninguém anda no telhado)
  return { peca, x, y, w: r.w, h: r.h, bloqueia: !naoBloqueia.has(peca), bx: x, by: y + r.h - fh, bw: r.w, bh: fh };
};
// Plantação de trigo em fileiras
const campo = (x0, y0, colunas, linhas) => Array.from({ length: colunas * linhas }, (_, i) => ['trigo', x0 + (i % colunas), y0 + Math.floor(i / colunas)]);
export const ENFEITES = [
  // Praça: casas de cores e telhados diferentes
  ['casaAzul', 11, 22], ['casaCreme', 17, 23], ['casaAmarela', 9, 31], ['casaLaranja', 16, 32], ['casaVerde', 2, 31],
  ['casaReta', 22, 24], ['casaDiag', 1, 22],
  // Dunas
  ['palmeira', 3, 5], ['palmeira', 15, 4], ['palmeira', 5, 11], ['palmeira', 14, 12],
  // árvores soltas
  ['arvoreRedonda', 20, 14], ['arvoreClara', 29, 14], ['arvoreRosa', 22, 20], ['arvoreRedonda', 30, 31], ['pinheiro', 26, 36], ['arvoreClara', 13, 37],
  ['arvoreRedonda', 40, 15], ['pinheiro', 47, 6], ['arvoreClara', 58, 8], ['arvoreRosa', 67, 20], ['arvoreRedonda', 60, 31], ['pinheiro', 66, 28], ['arvoreClara', 40, 28],
  ['arvoreRedonda', 50, 21], ['arvoreRosa', 52, 17], ['arvoreClara', 69, 12],
  // plantação da fazenda
  ...campo(52, 33, 6, 3),
  // flores e plantas
  ['florAmarela', 8, 26], ['florVermelha', 4, 26], ['florBranca', 14, 26], ['florLaranja', 21, 22], ['florAmarela', 39, 22], ['florBranca', 60, 24], ['florVermelha', 53, 26],
  ['arbusto1', 12, 20], ['arbusto2', 24, 22], ['arbusto3', 40, 12], ['arbusto4', 66, 18], ['mato', 20, 8], ['mato', 31, 33], ['mato', 56, 36],
].map(([p, x, y]) => enfeite(p, x, y));

// Objetos desenhados para o jogo. Os que guardam segredo têm o id do segredo.
export const OBJETOS = [
  { id: 'casinha', arte: 'casinha', x: 3, y: 28, bloqueia: true },
  { id: 'impressora', arte: 'impressora', x: 8, y: 27, bloqueia: true, segredo: 'gato' },
  { id: 'cacto', arte: 'cacto', x: 4, y: 7, bloqueia: true, segredo: 'cacto', toques: 5 },
  { id: 'aviao', arte: 'aviao', x: 12, y: 8, w: 2, h: 2, bloqueia: true, conversa: 'aviao' },
  { id: 'escola', arte: 'casaTorre', x: 21, y: 32, w: 4, h: 4, bloqueia: true, segredo: 'antena' },
  { id: 'porta', arte: 'placaCafe', x: 27, y: 36, bloqueia: true, segredo: 'professores' },
  { id: 'lapide', arte: 'lapide', x: 49, y: 10, bloqueia: true, segredo: 'lapide' },
  { id: 'placa404', arte: 'placa404', x: 8, y: 37, bloqueia: true, segredo: '404' },
  { id: 'ilha', arte: 'ilha', x: 33, y: 31, w: 2, h: 2, bloqueia: true, segredo: 'bau', alcance: 2.5 },
  { id: 'quadro', arte: 'quadroSwot', x: 66, y: 25, bloqueia: true, conversa: 'swot' },
  { id: 'moinho', arte: 'moinhoBase', x: 60, y: 35, w: 3, h: 2, bloqueia: true, conversa: 'moinho' },
  { id: 'portao', arte: 'portao', x: 41, y: 4, w: 5, h: 2, bloqueia: true, conversa: 'portao' },
  { id: 'fonte', arte: 'fonte', x: 13, y: 27, w: 2, h: 2, bloqueia: true },
  { id: 'poco', arte: 'poco', x: 46, y: 25, w: 2, h: 2, bloqueia: true },
  { id: 'espantalho', arte: 'espantalho', x: 54, y: 33, bloqueia: true, segredo: 'espantalho' },
  { id: 'carroca', arte: 'carroca', x: 19, y: 28, w: 2, h: 2, bloqueia: true },
  { id: 'fardos', arte: 'fardo', x: 56, y: 27, w: 2, h: 1, bloqueia: true },
  { id: 'lenha', arte: 'lenha', x: 46, y: 29, bloqueia: true },
];

// Curral da fazenda: cerca em volta e bichos soltos dentro
export const CURRAL = { x: 40, y: 32, w: 7, h: 5, abertura: { lado: 'cima', x: 43 } };
export const ANIMAIS = [
  { tipo: 'vaca', quantos: 2 }, { tipo: 'porco', quantos: 2 }, { tipo: 'ovelha', quantos: 3 }, { tipo: 'lhama', quantos: 1 },
];
export const SAPO = [3, 34];

// Personagens e bichos que andam sozinhos
export const PERSONAGENS = {
  rosalina: { casa: [3, 29] },
  consultor: { pos: [12, 29], area: { x: 9, y: 25, w: 8, h: 6 } },
  barao: { pos: [45, 13], area: { x: 41, y: 12, w: 7, h: 3 } },
  aldeoes: [
    { quem: 'senhora', area: { x: 14, y: 26, w: 8, h: 4 } },
    { quem: 'crianca', area: { x: 10, y: 28, w: 9, h: 5 } },
    { quem: 'monge', area: { x: 21, y: 12, w: 8, h: 4 } },
  ],
  pombo: { area: { x: 11, y: 27, w: 7, h: 4 }, segredo: 'pombo' },
  galinhas: { area: { x: 54, y: 30, w: 6, h: 3 }, quantas: 5, segredo: 'galinhas', esbarroes: 6 },
  peixes: { rio: { x0: 33, x1: 35 }, lagos: true },
};

// Regiões com nome (aparece ao entrar). Os nomes vêm dos textos.
export const ZONAS = [
  { id: 'dunas', x: 1, y: 3, w: 17, h: 12 }, { id: 'oficina', x: 19, y: 5, w: 12, h: 9 }, { id: 'praca', x: 2, y: 21, w: 26, h: 16 },
  { id: 'rio', x: 31, y: 16, w: 8, h: 11 }, { id: 'fazenda', x: 40, y: 25, w: 25, h: 14 }, { id: 'acampamento', x: 57, y: 18, w: 11, h: 9 },
  { id: 'castelo', x: 39, y: 3, w: 12, h: 13 }, { id: 'leste', x: 50, y: 4, w: 18, h: 13 },
];

export const INICIO = [6, 28];
export const SEGREDOS = ['cacto', 'galinhas', 'konami', 'lapide', 'gato', 'professores', 'pombo', 'antena', 'bau', '404', 'espantalho', 'vaca'];
