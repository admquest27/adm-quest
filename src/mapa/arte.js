// Artes do mapa: folhas do pacote Ninja Adventure (pixel-boy e AAA, licença CC0) e recortes nomeados.
// Cada recorte é { folha, x, y, w, h } em peças de 16x16.

export const FOLHAS = {
  chao: 'chao.png', natureza: 'natureza.png', casas: 'casas.png', agua: 'agua.png', deserto: 'deserto.png',
  acampamento: 'acampamento.png', torres: 'torres.png', elementos: 'elementos.png',
};
export const COLUNAS = { chao: 22, natureza: 24, casas: 33, agua: 28, deserto: 20, acampamento: 23, torres: 24, elementos: 16 };

// Animações e personagens (folhas de quadros)
export const ANIMADOS = {
  flor: { arq: 'flor-anim.png', w: 5, h: 8 },
  ondas: { arq: 'ondas.png', w: 16, h: 16 },
  moinho: { arq: 'moinho.png', w: 64, h: 64 },
  bandeiraVermelha: { arq: 'bandeira-vermelha.png', w: 16, h: 16 },
  bandeiraBranca: { arq: 'bandeira-branca.png', w: 16, h: 16 },
  bandeiraAmarela: { arq: 'bandeira-amarela.png', w: 16, h: 16 },
  galinhaBranca: { arq: 'galinha-branca.png', w: 16, h: 16 },
  galinhaMarrom: { arq: 'galinha-marrom.png', w: 16, h: 16 },
  gato: { arq: 'gato.png', w: 22, h: 17 },
  peixe: { arq: 'peixe.png', w: 16, h: 16 },
  sapo: { arq: 'sapo.png', w: 16, h: 16 },
};
// Personagens de 4 direções (colunas: baixo, cima, esquerda, direita; linhas 0 a 3: caminhada)
export const PESSOAS = { heroi: 'heroi.png', consultor: 'consultor.png', barao: 'barao.png', senhora: 'senhora.png', crianca: 'crianca.png', monge: 'monge.png', operario1: 'operario1.png', operario2: 'operario2.png' };
export const ROSTOS = { consultor: 'consultor-rosto.png', barao: 'barao-rosto.png' };
export const DIRECOES = { baixo: 0, cima: 1, esq: 2, dir: 3 };
// quantas linhas de caminhada cada folha tem (algumas pessoas só têm duas)
export const LINHAS = { senhora: 2, crianca: 2 };

// Recorte em peças (x, y, w, h) ou em pixels (RP); w e h em peças servem para a planta (ocupação no chão).
// porta: centro da porta em pixels, a partir do canto de cima do recorte (para fechar com tábuas ou porta).
const R = (folha, x, y, w = 1, h = 1, extra = {}) => ({ folha, px: x * 16, py: y * 16, pw: w * 16, ph: h * 16, w, h, ...extra });
const RP = (folha, px, py, pw, ph, extra = {}) => ({ folha, px, py, pw, ph, w: Math.ceil(pw / 16), h: Math.ceil(ph / 16), ...extra });
export const RECORTES = {
  // árvores e natureza
  arvoreRedonda: R('natureza', 0, 0, 2, 2), pinheiro: R('natureza', 2, 0, 2, 2), arvoreSeca: R('natureza', 4, 0, 2, 2), arvoreClara: R('natureza', 16, 0, 2, 2),
  arvoreRosa: R('natureza', 14, 0, 2, 2), trioPinheiros: R('natureza', 0, 2, 4, 3), trioVerde: R('natureza', 5, 2, 3, 3), arvoreGrande: R('natureza', 3, 18, 3, 3), arvoreGrandeRosa: R('natureza', 0, 18, 3, 3),
  toco: R('natureza', 0, 8, 2, 2), arbusto1: R('natureza', 0, 10), arbusto2: R('natureza', 1, 10), arbusto3: R('natureza', 2, 10), arbusto4: R('natureza', 4, 10),
  florAmarela: R('natureza', 0, 11), florLaranja: R('natureza', 1, 11), florVermelha: R('natureza', 3, 11), florBranca: R('natureza', 6, 11),
  pedraGrande: R('natureza', 12, 8, 2, 2), trigo: R('natureza', 7, 11), mato: R('natureza', 8, 11),
  // casas da Vila (3x3)
  casaLaranja: RP('casas', 0, 0, 64, 48, { porta: [24, 41] }), casaBege: RP('casas', 64, 0, 64, 48, { porta: [23, 41] }), casaLaranja2: RP('casas', 128, 0, 64, 48, { porta: [23, 41] }),
  templo: RP('casas', 192, 0, 64, 48, { porta: [24, 41] }), loja: RP('casas', 256, 0, 48, 48, { porta: [14, 41] }), lojaVerde: RP('casas', 304, 0, 64, 48, { porta: [33, 41] }),
  casaPedra: RP('casas', 368, 0, 48, 48, { porta: [24, 41] }), casaPartida: RP('casas', 416, 0, 48, 48, { porta: [24, 41] }),
  casaTorre: RP('casas', 464, 0, 64, 64, { porta: [26, 57] }),
  estatuaMestre: R('casas', 4, 15, 1, 2), estatuaMestre2: R('casas', 5, 15, 1, 2), estatuaUrso: R('casas', 0, 15, 2, 3),
  estandarte1: R('casas', 22, 20, 1, 2), estandarte2: R('casas', 24, 20, 1, 2), estandarte3: R('casas', 26, 20, 1, 2),
  portal: R('casas', 1, 5, 3, 2),
  // deserto
  palmeira: R('deserto', 10, 4, 2, 2), casaDeserto: R('deserto', 0, 0, 2, 3), torreDeserto: R('deserto', 14, 7, 3, 4),
  // acampamento
  barraca: R('acampamento', 4, 0, 2, 2), barraca2: R('acampamento', 6, 0, 2, 2), toras: R('acampamento', 0, 0, 2, 1),
  // torres
  torreBege: R('torres', 12, 0, 2, 2), torreMarrom: R('torres', 16, 0, 2, 2), torreVerde: R('torres', 18, 0, 2, 2),
};

// Peças de chão (índice na folha "chao", 22 colunas) e de água (folha "agua", 28 colunas)
const C = (x, y) => y * 22 + x;
const A = (x, y) => y * 28 + x;
export const CHAO = {
  grama: [C(0, 12), C(0, 12), C(0, 12), C(0, 12), C(0, 12), C(0, 12), C(0, 12), C(4, 12), C(2, 12)],
  areia: { x: 0, y: 0 }, // bloco 3x3 com borda arredondada
  areiaMiolo: [C(1, 1)],
};
export const AGUA = { bloco: { x: 0, y: 6 }, miolo: A(1, 7), ponte: A(5, 13) };
export const idChao = C;
export const idAgua = A;

// Peças LPC (atlas "lpc", 32 px por peça da planta) que substituem as antigas, pelo mesmo nome da planta.
// porta: centro de baixo da porta em pixels da arte, a partir do canto de cima do quadro. w e h: tamanho em peças.
const CASA = (quadro, porta) => ({ quadro, porta, w: 3, h: 3 });
export const LPC_PECAS = {
  casaLaranja: CASA('casa-palha-bege', [81, 158]), casaBege: CASA('casa-palha-clara', [81, 158]), casaLaranja2: CASA('casa-palha-pedra', [81, 158]),
  casaReta: CASA('casa-palha-reta', [81, 158]), casaDiag: CASA('casa-palha-diag', [81, 158]),
  casaAzul: CASA('casa-azul', [72, 150]), casaCreme: CASA('casa-creme', [72, 150]), casaAmarela: CASA('casa-amarela', [72, 150]), casaVerde: CASA('casa-verde', [72, 150]),
  casaFlamV: { quadro: 'casa-flamenga-vermelha', porta: [20, 126], w: 2, h: 4 }, casaFlamC: { quadro: 'casa-flamenga-creme', porta: [44, 126], w: 2, h: 4 },
  casaPartida: { quadro: 'estalagem', porta: [72, 200], w: 3, h: 6 },
  sobradoAzul: { quadro: 'sobrado-azul', porta: [72, 200], w: 3, h: 6 }, padaria: { quadro: 'padaria', porta: [72, 156], w: 6, h: 5 },
  chaleAlto: { quadro: 'chale-alto', porta: [81, 207], w: 4, h: 6 }, casaVaranda: { quadro: 'casa-varanda', porta: [80, 152], w: 4, h: 5 },
  torreCasa: { quadro: 'casa-torre', porta: [32, 216], w: 2, h: 7 },
  casaPedra: { quadro: 'kiva', porta: [64, 96], w: 4, h: 3 },
  castelo: { quadro: 'castelo', porta: [88, 176], w: 6, h: 5 },
  casteloLargo: { quadro: 'castelo-largo', porta: [176, 190], w: 11, h: 6 },
  aviaoFase: { quadro: 'aviao-caido', porta: [104, 116], w: 7, h: 4 },
  raioX: CASA('casa-tijolo-baixa', [79, 158]),
  oficina: CASA('oficina', [73, 106]),
  barraca: CASA('tenda', [60, 158]),
  arvoreGrande: CASA('arvore-comando', [96, 214]),
  celeiro: { quadro: 'celeiro', porta: [96, 150], w: 6, h: 3 },
  // casas V02 (telhados com volume, pacote LPC Roofs v2)
  oficinaV2: { quadro: 'oficina-v2', porta: [64, 216], w: 3, h: 3 },
  celeiroV2: { quadro: 'celeiro-v2', porta: [101, 214], w: 6, h: 3 },
  arvoreDecisaoV2: { quadro: 'arvore-decisao', porta: [88, 212], w: 3, h: 3 },
  santuario: { quadro: 'santuario', porta: [160, 268], w: 10, h: 5 },
  feiraGrande: { quadro: 'feira-grande', porta: [116, 156], w: 5, h: 3 },
  raioXV2: { quadro: 'raiox-v2', porta: [64, 184], w: 3, h: 3 },
};

// Enfeites da planta trocados por peças LPC (com mais de uma opção, o sorteio fixo pela posição escolhe).
export const LPC_ENFEITES = {
  palmeira: ['palmeira-1', 'palmeira-2', 'palmeira-3', 'palmeira-4'],
  florAmarela: ['flor-amarela'], florVermelha: ['flor-vermelha'], florBranca: ['flor-branca'], florLaranja: ['flor-laranja'],
  arbusto1: ['arbusto-1'], arbusto2: ['arbusto-2'], arbusto3: ['arbusto-3'], arbusto4: ['arbusto-4'], mato: ['mato'], trigo: ['trigo'],
};
// Objetos (pelo id) que já têm versão LPC.
export const LPC_OBJETOS = {
  cacto: 'cacto', lapide: 'lapide', escola: 'torre-relogio', feira: 'feira', coreto: 'coreto', impressora: 'mesa-escriba', casinha: 'casinha-cachorro', aviao: 'aviao-caido', quadro: 'quadro-swot', placa404: 'placa-404', porta: 'placa-cafe', ilha: 'ilhota', portao: 'portal-mundo2', fonte: 'fonte-0', poco: 'poco', espantalho: 'espantalho',
  carroca: 'carroca', fardos: 'fardo', lenha: 'lenha-1',
  toriiTemplo: 'torii', bancaV: 'banca-vermelha', bancaD: 'banca-dourada', caixasM: 'caixas-mercado', palletM: 'pallet-mercado', toroE: 'toro', toroD: 'toro', caoE: 'cao-guardiao', caoD: 'cao-guardiao', cerejeiraA: 'cerejeira-a', cerejeiraB: 'cerejeira-b', toriiTemplo: 'torii',
};

// Construções que o professor pode escolher para uma fase extra num terreno vazio (id da planta e nome para a tela).
export const MODELOS_FASE = [
  ['casaAzul', 'Casa azul'], ['casaCreme', 'Casa creme'], ['casaAmarela', 'Casa amarela'], ['casaVerde', 'Casa verde'],
  ['casaLaranja', 'Casa de palha dourada'], ['casaReta', 'Casa de palha marrom'], ['casaDiag', 'Casa de palha e pedra'],
  ['oficina', 'Galpão de madeira'], ['barraca', 'Tenda de acampamento'], ['raioX', 'Casa de tijolo'], ['casaPedra', 'Cabana de adobe'], ['casaFlamV', 'Casa flamenga vermelha'], ['casaFlamC', 'Casa flamenga creme'], ['sobradoAzul', 'Sobrado azul'], ['casaVaranda', 'Casa amarela com varanda'], ['chaleAlto', 'Chalé de dois andares'], ['padaria', 'Padaria'], ['torreCasa', 'Casa-torre'],
];
