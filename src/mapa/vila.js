// Planta da Vila dos Planos (Mundo 1): terreno, estradas, construções das fases, enfeites, segredos e
// personagens. Só posições e ids, em peças de 16x16. Os textos (falas, placas, segredos) vêm do banco.
import { RECORTES } from './arte.js';

export const LARG = 48;
export const ALT = 27;

// Áreas de mata (desenhadas com árvores) e de água
export const FLORESTA = [
  { x: 0, y: 0, w: 48, h: 2 }, { x: 0, y: 24, w: 48, h: 3 }, { x: 0, y: 0, w: 1, h: 27 },
  { x: 47, y: 0, w: 1, h: 11 }, { x: 47, y: 16, w: 1, h: 11 }, { x: 40, y: 0, w: 8, h: 3 },
  { x: 19, y: 2, w: 5, h: 2 }, { x: 36, y: 22, w: 6, h: 2 }, { x: 1, y: 2, w: 2, h: 4 },
];
export const RIO = { x: 27, w: 3 };
export const LAGOS = [{ x: 36, y: 3, w: 4, h: 3 }, { x: 1, y: 20, w: 3, h: 3 }];
export const PONTE = { y: 13, x0: 26, x1: 30 };
export const DESERTO = { cx: 8.6, cy: 6.9, rx: 6.4, ry: 4.4 }; // forma orgânica, desenhada pela cena

// Estradas (polilinhas em peças). A primeira peça de cada uma diz qual fase ela leva (para revelar o caminho).
export const ESTRADAS = [
  { para: 'm1f2', pontos: [[5, 16.5], [5, 12], [8, 10], [9, 10]] },
  { para: 'm1f3', pontos: [[9, 10], [13, 10], [17, 10]] },
  { para: 'm1f4', pontos: [[17, 10], [18, 12], [22, 13], [31, 13], [33, 10], [33, 8.5]] },
  { para: 'm1f5', pontos: [[31, 13], [34, 15], [35, 17.5]] },
  { para: 'm1f6', pontos: [[33, 10], [37, 10.5], [40, 11.5]] },
  { para: 'm1f7', pontos: [[35, 17.5], [39, 18.5], [43, 18.5]] },
  { para: 'm1chefao', pontos: [[40, 11.5], [42, 9], [43, 7.5]] },
  { para: 'mundo2', pontos: [[43, 7.5], [46, 11], [47, 13]] },
  { para: null, pontos: [[43, 18.5], [46, 15], [47, 13]] },
  { para: null, pontos: [[5, 16.5], [10, 18], [13, 18], [19, 18]] },
  { para: null, pontos: [[13, 18], [13, 21], [12, 23]] },
];

// Construções das fases: canto de cima à esquerda (x, y), tamanho, arte e entrada (onde fica o ponto da fase).
const fase = (id, arte, x, y, entrada) => ({ id, arte, x, y, w: RECORTES[arte]?.w ?? 2, h: RECORTES[arte]?.h ?? 2, entrada });
export const FASES = [
  fase('m1f1', 'casaPartida', 4, 13, [5, 16]),
  fase('m1f2', 'casaPedra', 8, 6, [9, 9]),
  fase('m1f3', 'lojaVerde', 15, 6, [17, 9]),
  fase('m1f4', 'portal', 32, 6, [33, 8]),
  fase('m1f5', 'barraca', 34, 15, [35, 17]),
  fase('m1f6', 'arvoreGrande', 39, 8, [40, 11]),
  fase('m1f7', 'casaBege', 42, 15, [43, 18]),
  { id: 'm1chefao', arte: 'castelo', x: 42, y: 4, w: 3, h: 3, entrada: [43, 7] },
];

// Enfeites: peça do pacote no canto (x, y). Bloqueiam só a base (a última linha, ou as duas de baixo nas casas).
const casa = new Set(['casaLaranja', 'casaBege', 'casaLaranja2', 'loja', 'lojaVerde', 'casaPedra']);
const naoBloqueia = new Set(['florAmarela', 'florLaranja', 'florVermelha', 'florBranca', 'mato', 'trigo', 'arbusto1', 'arbusto2', 'arbusto3', 'arbusto4', 'estandarte1', 'estandarte2', 'estandarte3']);
const enfeite = (peca, x, y) => {
  const r = RECORTES[peca]; const fh = casa.has(peca) ? r.h : 1; // casas bloqueiam inteiras (ninguém anda no telhado)
  return { peca, x, y, w: r.w, h: r.h, bloqueia: !naoBloqueia.has(peca), bx: x, by: y + r.h - fh, bw: r.w, bh: fh };
};
export const ENFEITES = [
  // Vila
  ['casaLaranja', 8, 13], ['casaBege', 16, 13], ['casaLaranja2', 8, 21], ['loja', 14, 20], ['templo', 1, 9],
  ['arvoreRedonda', 2, 12], ['arvoreClara', 12, 11], ['arvoreRosa', 20, 14], ['arvoreRedonda', 24, 9], ['arvoreClara', 24, 16],
  // deserto
  ['palmeira', 4, 4], ['palmeira', 11, 4], ['palmeira', 6, 8], ['palmeira', 12, 8],
  // leste
  ['arvoreRedonda', 30, 3], ['pinheiro', 30, 9], ['arvoreClara', 37, 13], ['arvoreRosa', 31, 19], ['arvoreRedonda', 38, 20], ['pinheiro', 45, 20], ['arvoreClara', 25, 20],
  ['estandarte1', 31, 6], ['estandarte2', 35, 6], ['estandarte3', 36, 7],
  // flores e plantas
  ['trigo', 22, 19], ['trigo', 23, 19], ['trigo', 24, 19], ['trigo', 22, 20], ['trigo', 23, 20], ['trigo', 24, 20],
  ['florAmarela', 7, 17], ['florVermelha', 2, 18], ['florBranca', 12, 16], ['florLaranja', 20, 11], ['florAmarela', 30, 16], ['florBranca', 38, 16], ['florVermelha', 44, 11],
  ['arbusto1', 10, 11], ['arbusto2', 22, 15], ['arbusto3', 33, 12], ['arbusto4', 41, 21], ['mato', 19, 9], ['mato', 29, 20],
].map(([p, x, y]) => enfeite(p, x, y));

// Objetos desenhados para o jogo. Os que guardam segredo têm o id do segredo.
export const OBJETOS = [
  { id: 'casinha', arte: 'casinha', x: 3, y: 16, bloqueia: true },
  { id: 'impressora', arte: 'impressora', x: 7, y: 15, bloqueia: true, segredo: 'gato' },
  { id: 'cacto', arte: 'cacto', x: 6, y: 5, bloqueia: true, segredo: 'cacto', toques: 5 },
  { id: 'aviao', arte: 'aviao', x: 11, y: 6, w: 2, h: 2, bloqueia: true, conversa: 'aviao' },
  { id: 'escola', arte: 'casaTorre', x: 17, y: 19, w: 4, h: 4, bloqueia: true, segredo: 'antena' },
  { id: 'porta', arte: 'placaCafe', x: 21, y: 22, bloqueia: true, segredo: 'professores' },
  { id: 'lapide', arte: 'lapide', x: 46, y: 5, bloqueia: true, segredo: 'lapide' },
  { id: 'placa404', arte: 'placa404', x: 11, y: 23, bloqueia: true, segredo: '404' },
  { id: 'ilha', arte: 'ilha', x: 28, y: 21, bloqueia: true, segredo: 'bau', alcance: 2.5 },
  { id: 'quadro', arte: 'quadroSwot', x: 36, y: 16, bloqueia: true, conversa: 'swot' },
  { id: 'moinho', arte: 'moinhoBase', x: 25, y: 18, w: 2, h: 2, bloqueia: true, conversa: 'moinho' },
  { id: 'portao', arte: 'portao', x: 47, y: 11, w: 1, h: 5, bloqueia: true, conversa: 'portao' },
];

// Personagens e bichos que andam sozinhos
export const PERSONAGENS = {
  rosalina: { casa: [3, 17] },
  consultor: { pos: [7, 17], area: { x: 6, y: 16, w: 4, h: 3 } },
  barao: { pos: [43, 8], area: { x: 41, y: 7, w: 5, h: 2 } },
  aldeoes: [
    { quem: 'senhora', area: { x: 9, y: 16, w: 6, h: 3 } },
    { quem: 'crianca', area: { x: 11, y: 17, w: 7, h: 4 } },
    { quem: 'monge', area: { x: 14, y: 9, w: 6, h: 3 } },
  ],
  pombo: { area: { x: 11, y: 17, w: 4, h: 3 }, segredo: 'pombo' },
  galinhas: { area: { x: 21, y: 15, w: 5, h: 3 }, quantas: 5, segredo: 'galinhas', esbarroes: 6 },
  peixes: { rio: { x0: 27, x1: 29 }, lagos: true },
};

// Regiões com nome (aparece ao entrar). Os nomes vêm dos textos.
export const ZONAS = [
  { id: 'praca', x: 6, y: 15, w: 13, h: 8 }, { id: 'dunas', x: 3, y: 3, w: 11, h: 8 }, { id: 'fazenda', x: 19, y: 15, w: 8, h: 8 },
  { id: 'rio', x: 25, y: 10, w: 7, h: 6 }, { id: 'leste', x: 31, y: 3, w: 9, h: 11 }, { id: 'acampamento', x: 32, y: 14, w: 9, h: 8 },
  { id: 'castelo', x: 40, y: 3, w: 7, h: 8 }, { id: 'oficina', x: 14, y: 5, w: 6, h: 6 },
];

export const INICIO = [5, 17];
// Lampiões ao lado das estradas (acendem no fim da tarde e à noite)
export const LAMPIOES = [[12, 16], [20, 17], [25, 12], [30, 11], [37, 12], [41, 17], [45, 13], [14, 11], [11, 19], [34, 9]];
export const SEGREDOS = ['cacto', 'galinhas', 'konami', 'lapide', 'gato', 'professores', 'pombo', 'antena', 'bau', '404'];
