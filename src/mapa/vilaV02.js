// Planta V02 da Vila dos Planos (reformulação em andamento): grade 88 x 50, com as posições da planta técnica.
// A geografia (rio, lagos, platô, escarpas, muralha) e a rota ficam em geografia.js; aqui estão as construções,
// os objetos (com os 12 segredos), a fazenda, a praça e os personagens, todos nos lugares da planta.
// Convenção das fases: (x, y) é o canto de cima à esquerda; a entrada fica logo abaixo da construção (y + h).
export * from './vilaBase.js';
import * as geo from './geografia.js';
import { suavizar, enfeite, campo } from './vilaBase.js';

export const LARG = geo.LARG;
export const ALT = geo.ALT;
export const GEO = geo.montarGeografia();
export const PONTE = geo.PONTE;
export const ESCADA = geo.ESCADA;
export const CASTELO = geo.CASTELO;
export const PORTAO = geo.PORTAO;
export const MURALHA = geo.MURALHA;
export const CACHOEIRA = geo.CACHOEIRA;
export const CASTELO_PROC = true; // o castelo é desenhado por castelo.js (com volume), não vem do atlas
export const FLORESTA = [];
export const MUROS = [];
export const LAGOS = [];
export const RIO = { x: 0, w: 0 };
export const DESERTO = { cx: 0, cy: 0, rx: 0, ry: 0 };
export const PRACA = { cx: 19.5, cy: 35.5, rx: 7.6, ry: 4.4 };
// caminhos de pedra que ligam cada porta à praça, pátios, e o que enfeita o chão
// onde a vila é de pedra a estrada de terra não é desenhada (a pedra assume o caminho)
export const SEM_TERRA = [[4.5, 29.8, 14.5, 33.5]];
// trecho de passagem entre a terra e a pedra: [x0, y0 (só terra), x1, y1 (só pedra)]
export const TRANSICAO = [4.2, 25.6, 10.5, 30.2];
export const POSTES_FIXOS = true;
export const ATALHO = geo.ATALHO;
export const TRILHAS = [
  [[6.5, 29.7], [6.9, 30.8], [9, 31.7], [11.2, 31.4], [12.6, 30.6]],
  [[12.5, 30.4], [13.4, 32.2], [15.5, 33.6]], [[19.5, 31], [19.5, 32.5]], [[27, 28.2], [26, 30.4], [23.6, 32.8]],
  [[8, 38.8], [11, 38.8], [13.5, 36.8]], [[25.5, 34], [29, 34.6], [33.5, 34.8]], [[24.5, 38], [27.5, 41.6], [31.5, 41.8]],
  [[20.2, 39.2], [19.9, 43], [20, 46.2]], [[20, 46.2], [18, 46.8], [15.6, 46.5]], [[20, 46.2], [22.2, 46.8], [25, 46.5]], [[31.5, 41.8], [33.6, 42.4], [35.6, 41.4]],
];
export const TANQUE = [19.5, 36, 2.45, 1.35];
export const BLOQUEIOS = [{ x: 18, y: 37, w: 3, h: 1 }]; // beirada de baixo do tanque da fonte
// o coreto fica num jardim, com a entrada voltada para o caminho que vem da praça
export const JARDIM = [36.5, 41.2, 3.3, 2.5, 3.5];
export const PATIOS = [[36.5, 41.3, 2, 1.3]];
export const CANTEIROS = [[14.6, 31.8, 2], [22.6, 31.8, 2], [11.4, 40.4, 1.6], [25.8, 39.2, 1.6]];
export const SEBES = [];
export const BANCOS = [[13.4, 35.2], [24.2, 35.2], [36.6, 43.2]];
// lampiões escolhidos um a um: praça, portas, esquinas da estrada, ponte e cantos escuros. Não bloqueiam a passagem.
export const POSTES = [
  [14, 33], [25, 33], [14, 39], [25, 39], [21, 29], [34, 28], [31, 43], [10, 43],
  [4, 22], [10, 19], [21, 14], [29, 18], [37, 18], [38, 26], [48, 27],
  [59, 19], [64, 19], [73, 19], [76, 17], [84, 22], [84, 27],
  [79, 32], [68, 31], [61, 33], [51, 34], [47, 41], [58, 43], [74, 43],
];
export const ESTRADAS = geo.ROTA.map((e) => ({ ...e, pontos: suavizar(e.pontos) }));
export const LOTES = geo.LOTES;
export const ENTRADAS = geo.ENTRADAS;
export const INICIO = geo.ENTRADAS.m1f1;

// Construções das fases
export const FASES = [
  { id: 'm1f1', arte: 'mansaoPartida', x: 8, y: 25, w: 9, h: 5, entrada: geo.ENTRADAS.m1f1 },
  { id: 'm1f2', arte: 'aviaoProc', x: 12, y: 9, w: 7, h: 4, entrada: geo.ENTRADAS.m1f2 },
  { id: 'm1f3', arte: 'oficinaV3', x: 32, y: 13, w: 5, h: 3, entrada: geo.ENTRADAS.m1f3 },
  { id: 'm1f4', arte: 'celeiroFazenda', x: 54, y: 31, w: 8, h: 3, entrada: geo.ENTRADAS.m1f4 },
  { id: 'm1f5', arte: 'feiraGrande', x: 74, y: 27, w: 5, h: 3, entrada: geo.ENTRADAS.m1f5 },
  { id: 'm1f6', arte: 'arvoreDecisaoV2', x: 78, y: 15, w: 3, h: 3, entrada: geo.ENTRADAS.m1f6 },
  { id: 'm1f7', arte: 'raioXV3', x: 65, y: 15, w: 5, h: 3, entrada: geo.ENTRADAS.m1f7 },
  // castelo (castelo.js): 7 peças de largura, encostado na rocha das escarpas dos dois lados; o bloqueio vai até a escada (y 10 a 17)
  { id: 'm1chefao', arte: 'casteloProc', x: 51, y: 11, w: 7, h: 7, bloqueio: geo.CASTELO, passagem: { x: geo.ESCADA.x, w: geo.ESCADA.w }, entrada: geo.ENTRADAS.m1chefao },
];

// Enfeites. A ordem das casas define os textos (casas[i]): Dona Planilha, Seu Prazo, Juninho, Lojinha, Templo Antigo,
// casa de palha e, por último, a Sala dos Professores.
export const ENFEITES = [
  ['casaPlanilhaV2', 5, 33], ['casaMostardaV2', 31, 29], ['casaLilasV2', 13, 40], ['padaria', 22, 41], ['santuario', 22, 22], ['casaDiag', 70, 41], ['salaProfessoresV2', 29, 37],
  // dunas
  ['palmeira', 6, 9], ['palmeira', 29, 11], ['palmeira', 9, 12], ['palmeira', 27, 11], ['palmeira', 23, 16],
  // árvores soltas
  ['arvoreRedonda', 9, 21], ['arvoreClara', 35, 26], ['arvoreRosa', 37, 27], ['arvoreRedonda', 4, 31], ['pinheiro', 28, 41], ['arvoreClara', 4, 21],
  ['arvoreRedonda', 46, 29], ['arvoreClara', 62, 29], ['arvoreRosa', 66, 37], ['pinheiro', 72, 33], ['arvoreClara', 82, 33],
  ['arvoreRosa', 63, 19], ['arvoreRedonda', 73, 24], ['arvoreClara', 47, 31],
  // plantação da fazenda
  ...campo(60, 39, 8, 4),
  // flores e plantas
  ['florAmarela', 12, 35], ['florVermelha', 7, 31], ['florBranca', 26, 36], ['florLaranja', 22, 21], ['florAmarela', 37, 21], ['florBranca', 62, 33], ['florVermelha', 56, 29],
  ['arbusto1', 3, 24], ['arbusto2', 28, 25], ['arbusto3', 38, 14], ['arbusto4', 70, 28], ['mato', 20, 9], ['mato', 31, 33], ['mato', 56, 38],
].map(([p, x, y]) => enfeite(p, x, y));

// Objetos desenhados para o jogo. Os que guardam segredo têm o id do segredo.
export const OBJETOS = [
  { id: 'casinha', arte: 'casinha', x: 10, y: 35, w: 3, h: 1, bloqueia: true },
  { id: 'impressora', arte: 'impressora', x: 29, y: 31, w: 2, h: 1, bloqueia: true, segredo: 'gato' },
  { id: 'cacto', arte: 'cacto', x: 8, y: 14, bloqueia: true, segredo: 'cacto', toques: 5 },
  { id: 'escola', arte: 'casaTorre', x: 18, y: 30, w: 3, h: 1, bloqueia: true, segredo: 'antena' },
  { id: 'coreto', arte: 'coreto', x: 35, y: 40, w: 3, h: 1, bloqueia: true },
  { id: 'porta', arte: 'placaCafe', x: 34, y: 38, bloqueia: true, segredo: 'professores' },
  { id: 'lapide', arte: 'lapide', x: 60, y: 20, bloqueia: true, segredo: 'lapide' },
  { id: 'placa404', arte: 'placa404', x: 6, y: 40, bloqueia: true, segredo: '404' },
  { id: 'ilha', arte: 'ilha', x: 41, y: 37, w: 3, h: 2, bloqueia: true, segredo: 'bau', alcance: 2.5 },
  { id: 'quadro', arte: 'quadroSwot', x: 80, y: 26, w: 2, h: 1, bloqueia: true, conversa: 'swot' },
  { id: 'moinho', arte: 'moinhoBase', x: 77, y: 41, w: 3, h: 2, bloqueia: true, conversa: 'moinho' },
  { id: 'portao', arte: 'portao', x: 51, y: 3, w: 6, h: 2, bloqueia: true, conversa: 'portao', alcance: 3.2 },
  { id: 'fonte', arte: 'fonte', x: 17, y: 35, w: 5, h: 2, bloqueia: true },
  { id: 'poco', arte: 'poco', x: 49, y: 29, w: 2, h: 2, bloqueia: true },
  { id: 'espantalho', arte: 'espantalho', x: 63, y: 38, bloqueia: true, segredo: 'espantalho' },
  { id: 'carroca', arte: 'carroca', x: 9, y: 45, w: 2, h: 2, bloqueia: true },
  { id: 'fardos', arte: 'fardo', x: 63, y: 32, w: 2, h: 1, bloqueia: true },
  { id: 'lenha', arte: 'lenha', x: 53, y: 32, bloqueia: true },
  // jardim do Templo Antigo (santuário em 22,22): cães guardiões, lanternas e cerejeiras
  // feira do acampamento: bancas e mercadorias ao redor da barraca grande
  { id: 'bancaV', arte: 'banca', x: 69, y: 28, w: 3, h: 1, bloqueia: true },
  { id: 'bancaD', arte: 'banca', x: 70, y: 35, w: 3, h: 1, bloqueia: true },
  { id: 'caixasM', arte: 'caixas', x: 72, y: 29, w: 2, h: 1, bloqueia: true },
  { id: 'palletM', arte: 'caixas', x: 68, y: 35, w: 2, h: 1, bloqueia: true },
  { id: 'cerejeiraC', arte: 'cerejeira', x: 36, y: 37, w: 2, h: 1, bloqueia: true },
  { id: 'cerejeiraD', arte: 'cerejeira', x: 33, y: 45, w: 2, h: 1, bloqueia: true },
  { id: 'caoE', arte: 'cao', x: 23, y: 27, w: 2, h: 1, bloqueia: true },
  { id: 'caoD', arte: 'cao', x: 29, y: 27, w: 2, h: 1, bloqueia: true },
  { id: 'toroE', arte: 'toro', x: 21, y: 27, bloqueia: true },
  { id: 'toroD', arte: 'toro', x: 32, y: 27, bloqueia: true },
  { id: 'cerejeiraA', arte: 'cerejeira', x: 20, y: 26, w: 2, h: 1, bloqueia: true },
  { id: 'cerejeiraB', arte: 'cerejeira', x: 33, y: 23, w: 2, h: 1, bloqueia: true },
];

export const CURRAL = { x: 48, y: 38, w: 8, h: 5, abertura: { lado: 'cima', x: 51 } };
export const SAPO = [11, 44];

export const PERSONAGENS = {
  rosalina: { casa: [11, 37] },
  consultor: { pos: [13, 34], area: { x: 13, y: 33, w: 7, h: 5 } },
  barao: { pos: [55, 20], area: { x: 50, y: 19, w: 9, h: 3 } },
  aldeoes: [
    { quem: 'senhora', area: { x: 21, y: 33, w: 7, h: 4 } },
    { quem: 'crianca', area: { x: 14, y: 35, w: 8, h: 4 } },
    { quem: 'monge', area: { x: 28, y: 13, w: 8, h: 4 } },
  ],
  pombo: { area: { x: 15, y: 32.5, w: 9, h: 2 }, segredo: 'pombo' }, // passeia acima da fonte, sempre em chão onde o aluno chega
  galinhas: { area: { x: 56, y: 36, w: 6, h: 3 }, quantas: 5, segredo: 'galinhas', esbarroes: 6 },
  peixes: { rio: { x0: 0, x1: 0 }, lagos: true },
};

// Regiões com nome (aparece ao entrar). Os nomes vêm dos textos.
export const ZONAS = [
  { id: 'dunas', x: 4, y: 5, w: 26, h: 14 }, { id: 'oficina', x: 27, y: 11, w: 12, h: 9 }, { id: 'praca', x: 5, y: 25, w: 26, h: 18 },
  { id: 'rio', x: 36, y: 20, w: 12, h: 12 }, { id: 'fazenda', x: 48, y: 30, w: 36, h: 17 }, { id: 'acampamento', x: 70, y: 20, w: 14, h: 12 },
  { id: 'castelo', x: 46, y: 8, w: 18, h: 12 }, { id: 'leste', x: 60, y: 10, w: 25, h: 9 },
];
