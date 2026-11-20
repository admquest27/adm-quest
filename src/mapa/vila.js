// Planta da Vila dos Planos (Mundo 1): terreno, caminhos, construções das fases, enfeites e segredos.
// Só posições e ids, em peças de 16x16. Os textos (falas, placas, segredos) vêm do banco.

export const LARG = 48;
export const ALT = 27;

// Áreas de terreno
export const FLORESTA = [
  { x: 0, y: 0, w: 48, h: 2 }, { x: 0, y: 24, w: 48, h: 3 }, { x: 0, y: 0, w: 1, h: 27 },
  { x: 47, y: 0, w: 1, h: 11 }, { x: 47, y: 16, w: 1, h: 11 }, { x: 41, y: 0, w: 7, h: 3 },
  { x: 19, y: 2, w: 5, h: 2 }, { x: 36, y: 22, w: 6, h: 2 }, { x: 1, y: 2, w: 2, h: 4 },
];
export const RIO = { x: 27, w: 3 }; // de cima a baixo
export const LAGOS = [{ x: 37, y: 2, w: 4, h: 3 }, { x: 1, y: 21, w: 3, h: 2 }];
export const PONTE = { y: 13, x0: 26, x1: 30 };
export const DESERTO = { x: 4, y: 3, w: 10, h: 8 };

// Estradas de terra (polilinhas em peças); só enfeite, o gramado também é caminhável.
export const ESTRADAS = [
  [[6, 17], [6, 12], [8, 9.5], [9, 9.5]],
  [[9, 9.5], [13, 9.5], [16, 9.5]],
  [[16, 9.5], [18, 12], [22, 13], [31, 13]],
  [[31, 13], [33, 10], [33, 8.5]],
  [[31, 13], [34, 15], [35, 17.5]],
  [[33, 10], [37, 10.5], [40, 11.5]],
  [[35, 17.5], [39, 17.5], [43, 18.5]],
  [[40, 11.5], [42, 8.5], [44, 7.5]],
  [[44, 7.5], [46, 11], [47, 13]],
  [[43, 18.5], [46, 15], [47, 13]],
  [[6, 17], [10, 18], [13, 18], [18, 18]],
  [[13, 18], [13, 21], [12, 23]],
];

// Construções das fases: canto de cima à esquerda (x, y), tamanho em peças e a entrada (onde o avatar para).
export const FASES = [
  { id: 'm1f1', arte: 'casa', x: 5, y: 14, w: 2, h: 2, entrada: [6, 16] },
  { id: 'm1f2', arte: 'aviao', x: 8, y: 7, w: 2, h: 2, entrada: [9, 9] },
  { id: 'm1f3', arte: 'oficina', x: 15, y: 7, w: 2, h: 2, entrada: [16, 9] },
  { id: 'm1f4', arte: 'terraNova', x: 32, y: 6, w: 2, h: 2, entrada: [33, 8] },
  { id: 'm1f5', arte: 'acampamento', x: 34, y: 15, w: 2, h: 2, entrada: [35, 17] },
  { id: 'm1f6', arte: 'arvore', x: 39, y: 8, w: 3, h: 3, entrada: [40, 11] },
  { id: 'm1f7', arte: 'torre', x: 42, y: 16, w: 2, h: 2, entrada: [43, 18] },
  { id: 'm1chefao', arte: 'castelo', x: 43, y: 4, w: 3, h: 3, entrada: [44, 7] },
];

// Enfeites do tileset (coluna, linha no tileset) e se bloqueiam a passagem.
const T = (c, r) => r * 27 + c;
export const PECAS = {
  casaVermelha: T(16, 34), casaAzul: T(7, 34), casaLaranja: T(7, 27), casaVerde: T(4, 34),
  poco: T(4, 30), placa: T(9, 30), arvoreRedonda: T(3, 26), arvoreFruta: T(2, 26), pinheiro: T(0, 29),
  palmeira: T(2, 28), trigo: T(0, 28), pedra: T(0, 26), arbusto: T(1, 26), toco: T(1, 27), bau: T(2, 29), mesa: T(4, 31),
};
export const ENFEITES = [
  ['casaVermelha', 9, 16], ['casaAzul', 11, 15], ['casaLaranja', 15, 16], ['casaVerde', 10, 20], ['casaVermelha', 15, 20], ['casaAzul', 8, 21],
  ['poco', 12, 19], ['arvoreRedonda', 3, 12], ['arvoreFruta', 4, 20], ['arvoreRedonda', 8, 13], ['pinheiro', 19, 5], ['pinheiro', 21, 6],
  ['arvoreRedonda', 23, 9], ['arvoreFruta', 24, 17], ['arvoreRedonda', 31, 4], ['pinheiro', 36, 5], ['arvoreRedonda', 38, 14], ['pinheiro', 31, 20],
  ['arvoreFruta', 37, 21], ['arvoreRedonda', 45, 21], ['pinheiro', 25, 21], ['arvoreRedonda', 20, 14],
  ['palmeira', 5, 4], ['palmeira', 12, 4], ['palmeira', 6, 9], ['pedra', 10, 5], ['pedra', 34, 12], ['arbusto', 30, 9], ['arbusto', 24, 4],
  ['trigo', 21, 20], ['trigo', 22, 20], ['trigo', 23, 20], ['trigo', 21, 21], ['trigo', 22, 21], ['trigo', 23, 21],
  ['toco', 38, 19], ['placa', 32, 13], ['mesa', 36, 17],
].map(([peca, x, y]) => ({ peca, x, y, bloqueia: !['trigo', 'arbusto'].includes(peca) }));

// Objetos desenhados para o jogo (sem fase). Os que guardam segredo têm o id do segredo.
export const OBJETOS = [
  { id: 'casinha', arte: 'casinha', x: 4, y: 16, bloqueia: true },
  { id: 'impressora', arte: 'impressora', x: 7, y: 15, bloqueia: true, segredo: 'gato' },
  { id: 'cacto', arte: 'cacto', x: 11, y: 7, bloqueia: true, segredo: 'cacto', toques: 5 },
  { id: 'escola', arte: 'escola', x: 17, y: 20, w: 2, h: 2, bloqueia: true, segredo: 'antena' },
  { id: 'porta', arte: 'porta', x: 20, y: 21, bloqueia: true, segredo: 'professores' },
  { id: 'lapide', arte: 'lapide', x: 46, y: 3, bloqueia: true, segredo: 'lapide' },
  { id: 'placa404', arte: 'placa404', x: 11, y: 23, bloqueia: true, segredo: '404' },
  { id: 'ilha', arte: 'ilha', x: 28, y: 21, bloqueia: true, segredo: 'bau', alcance: 2.5 },
  { id: 'portao', arte: 'portao', x: 47, y: 11, w: 1, h: 5, bloqueia: true, conversa: 'portao' },
];

// Personagens que andam sozinhos
export const PERSONAGENS = {
  rosalina: { casa: [4, 17] },
  pombo: { area: { x: 11, y: 17, w: 4, h: 3 }, segredo: 'pombo' },
  galinhas: { area: { x: 19, y: 17, w: 6, h: 3 }, quantas: 4, segredo: 'galinhas', esbarroes: 6 },
};

export const INICIO = [6, 17]; // onde o avatar aparece na primeira vez
export const SEGREDOS = ['cacto', 'galinhas', 'konami', 'lapide', 'gato', 'professores', 'pombo', 'antena', 'bau', '404'];
