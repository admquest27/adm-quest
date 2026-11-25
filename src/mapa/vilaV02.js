// Planta V02 da Vila dos Planos (reformulação em andamento): grade 88 x 50, com as posições da planta técnica.
// A geografia (rio, lagos, platô, escarpas, muralha) e a rota ficam em geografia.js; aqui estão as construções,
// os objetos (com os 12 segredos), a fazenda, a praça e os personagens, todos nos lugares da planta.
// Convenção das fases: (x, y) é o canto de cima à esquerda; a entrada fica logo abaixo da construção (y + h).
export * from './vila.js?real';
import * as geo from './geografia.js';
import { suavizar, enfeite, campo } from './vila.js?real';

export const LARG = geo.LARG;
export const ALT = geo.ALT;
export const GEO = geo.montarGeografia();
export const PONTE = geo.PONTE;
export const ESCADA = geo.ESCADA;
export const CASTELO = geo.CASTELO;
export const PORTAO = geo.PORTAO;
export const CASTELO_PROC = true; // o castelo é desenhado por castelo.js (com volume), não vem do atlas
export const FLORESTA = [];
export const MUROS = [];
export const LAGOS = [];
export const RIO = { x: 0, w: 0 };
export const DESERTO = { cx: 0, cy: 0, rx: 0, ry: 0 };
export const PRACA = { cx: 21, cy: 34, rx: 8.5, ry: 5.6 };
export const POSTES = [[13, 30], [29, 31], [13, 37], [28, 38], [21, 28], [21, 40], [17, 43], [8, 34], [34, 40], [28, 17]];
export const ESTRADAS = geo.ROTA.map((e) => ({ ...e, pontos: suavizar(e.pontos) }));
export const LOTES = geo.LOTES;
export const ENTRADAS = geo.ENTRADAS;
export const INICIO = geo.ENTRADAS.m1f1;

// Construções das fases
export const FASES = [
  { id: 'm1f1', arte: 'casaPartida', x: 8, y: 27, w: 3, h: 6, entrada: geo.ENTRADAS.m1f1 },
  { id: 'm1f2', arte: 'aviaoFase', x: 12, y: 10, w: 7, h: 4, entrada: geo.ENTRADAS.m1f2 },
  { id: 'm1f3', arte: 'oficinaV2', x: 33, y: 13, w: 3, h: 3, entrada: geo.ENTRADAS.m1f3 },
  { id: 'm1f4', arte: 'celeiroV2', x: 54, y: 31, w: 6, h: 3, entrada: geo.ENTRADAS.m1f4 },
  { id: 'm1f5', arte: 'barraca', x: 75, y: 27, w: 3, h: 3, entrada: geo.ENTRADAS.m1f5 },
  { id: 'm1f6', arte: 'arvoreDecisaoV2', x: 78, y: 15, w: 3, h: 3, entrada: geo.ENTRADAS.m1f6 },
  { id: 'm1f7', arte: 'raioXV2', x: 66, y: 15, w: 3, h: 3, entrada: geo.ENTRADAS.m1f7 },
  // castelo (castelo.js): 7 peças de largura, encostado na rocha das escarpas dos dois lados; o bloqueio vai até a escada (y 10 a 17)
  { id: 'm1chefao', arte: 'casteloProc', x: 51, y: 11, w: 7, h: 7, bloqueio: geo.CASTELO, entrada: geo.ENTRADAS.m1chefao },
];

// Enfeites. A ordem das casas define os textos (casas[i]): Dona Planilha, Seu Prazo, Juninho, Lojinha, Templo Antigo,
// casa de palha e, por último, a Sala dos Professores.
export const ENFEITES = [
  ['sobradoAzul', 18, 24], ['casaVaranda', 31, 29], ['chaleAlto', 15, 38], ['padaria', 22, 40], ['santuario', 22, 22], ['casaDiag', 10, 39], ['casaCreme', 31, 36],
  // dunas
  ['palmeira', 6, 7], ['palmeira', 21, 6], ['palmeira', 9, 12], ['palmeira', 27, 11], ['palmeira', 23, 16],
  // árvores soltas
  ['arvoreRedonda', 9, 21], ['arvoreClara', 35, 26], ['arvoreRosa', 35, 31], ['arvoreRedonda', 4, 31], ['pinheiro', 28, 41], ['arvoreClara', 4, 21],
  ['arvoreRedonda', 46, 29], ['arvoreClara', 62, 29], ['arvoreRosa', 66, 37], ['pinheiro', 72, 33], ['arvoreRedonda', 70, 41], ['arvoreClara', 82, 33],
  ['arvoreRosa', 63, 19], ['arvoreRedonda', 73, 24], ['arvoreClara', 47, 31],
  // plantação da fazenda
  ...campo(60, 39, 8, 4),
  // flores e plantas
  ['florAmarela', 12, 35], ['florVermelha', 7, 31], ['florBranca', 26, 36], ['florLaranja', 22, 21], ['florAmarela', 37, 21], ['florBranca', 62, 33], ['florVermelha', 56, 29],
  ['arbusto1', 14, 20], ['arbusto2', 28, 25], ['arbusto3', 38, 14], ['arbusto4', 70, 28], ['mato', 20, 9], ['mato', 31, 33], ['mato', 56, 38],
].map(([p, x, y]) => enfeite(p, x, y));

// Objetos desenhados para o jogo. Os que guardam segredo têm o id do segredo.
export const OBJETOS = [
  { id: 'casinha', arte: 'casinha', x: 8, y: 36, bloqueia: true },
  { id: 'impressora', arte: 'impressora', x: 12, y: 31, w: 2, h: 1, bloqueia: true, segredo: 'gato' },
  { id: 'cacto', arte: 'cacto', x: 8, y: 14, bloqueia: true, segredo: 'cacto', toques: 5 },
  { id: 'escola', arte: 'casaTorre', x: 12, y: 26, w: 2, h: 1, bloqueia: true, segredo: 'antena' },
  { id: 'coreto', arte: 'coreto', x: 24, y: 37, w: 3, h: 1, bloqueia: true },
  { id: 'feira', arte: 'feira', x: 14, y: 31, w: 2, h: 1, bloqueia: true },
  { id: 'porta', arte: 'placaCafe', x: 35, y: 38, bloqueia: true, segredo: 'professores' },
  { id: 'lapide', arte: 'lapide', x: 60, y: 20, bloqueia: true, segredo: 'lapide' },
  { id: 'placa404', arte: 'placa404', x: 6, y: 40, bloqueia: true, segredo: '404' },
  { id: 'ilha', arte: 'ilha', x: 41, y: 37, w: 3, h: 2, bloqueia: true, segredo: 'bau', alcance: 2.5 },
  { id: 'quadro', arte: 'quadroSwot', x: 80, y: 26, w: 2, h: 1, bloqueia: true, conversa: 'swot' },
  { id: 'moinho', arte: 'moinhoBase', x: 77, y: 41, w: 3, h: 2, bloqueia: true, conversa: 'moinho' },
  { id: 'portao', arte: 'portao', x: 51, y: 3, w: 6, h: 2, bloqueia: true, conversa: 'portao', alcance: 3.2 },
  { id: 'fonte', arte: 'fonte', x: 19, y: 32, w: 2, h: 2, bloqueia: true },
  { id: 'poco', arte: 'poco', x: 49, y: 29, w: 2, h: 2, bloqueia: true },
  { id: 'espantalho', arte: 'espantalho', x: 63, y: 38, bloqueia: true, segredo: 'espantalho' },
  { id: 'carroca', arte: 'carroca', x: 17, y: 36, w: 2, h: 2, bloqueia: true },
  { id: 'fardos', arte: 'fardo', x: 61, y: 32, w: 2, h: 1, bloqueia: true },
  { id: 'lenha', arte: 'lenha', x: 53, y: 32, bloqueia: true },
  // jardim do Templo Antigo (santuário em 22,22): cães guardiões, lanternas e cerejeiras
  { id: 'caoE', arte: 'cao', x: 23, y: 27, w: 2, h: 1, bloqueia: true },
  { id: 'caoD', arte: 'cao', x: 29, y: 27, w: 2, h: 1, bloqueia: true },
  { id: 'toroE', arte: 'toro', x: 21, y: 27, bloqueia: true },
  { id: 'toroD', arte: 'toro', x: 32, y: 27, bloqueia: true },
  { id: 'cerejeiraA', arte: 'cerejeira', x: 19, y: 22, w: 2, h: 1, bloqueia: true },
  { id: 'cerejeiraB', arte: 'cerejeira', x: 33, y: 23, w: 2, h: 1, bloqueia: true },
];

export const CURRAL = { x: 48, y: 38, w: 8, h: 5, abertura: { lado: 'cima', x: 51 } };
export const SAPO = [11, 44];

export const PERSONAGENS = {
  rosalina: { casa: [9, 37] },
  consultor: { pos: [13, 34], area: { x: 13, y: 33, w: 7, h: 5 } },
  barao: { pos: [55, 20], area: { x: 50, y: 19, w: 9, h: 3 } },
  aldeoes: [
    { quem: 'senhora', area: { x: 21, y: 33, w: 7, h: 4 } },
    { quem: 'crianca', area: { x: 14, y: 35, w: 8, h: 4 } },
    { quem: 'monge', area: { x: 28, y: 13, w: 8, h: 4 } },
  ],
  pombo: { area: { x: 15, y: 33, w: 7, h: 4 }, segredo: 'pombo' },
  galinhas: { area: { x: 56, y: 36, w: 6, h: 3 }, quantas: 5, segredo: 'galinhas', esbarroes: 6 },
  peixes: { rio: { x0: 0, x1: 0 }, lagos: true },
};

// Regiões com nome (aparece ao entrar). Os nomes vêm dos textos.
export const ZONAS = [
  { id: 'dunas', x: 4, y: 5, w: 26, h: 14 }, { id: 'oficina', x: 27, y: 11, w: 12, h: 9 }, { id: 'praca', x: 5, y: 25, w: 26, h: 18 },
  { id: 'rio', x: 36, y: 20, w: 12, h: 12 }, { id: 'fazenda', x: 48, y: 30, w: 36, h: 17 }, { id: 'acampamento', x: 70, y: 20, w: 14, h: 12 },
  { id: 'castelo', x: 46, y: 8, w: 18, h: 12 }, { id: 'leste', x: 60, y: 10, w: 25, h: 9 },
];
