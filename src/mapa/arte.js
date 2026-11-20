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
export const PESSOAS = { heroi: 'heroi.png', consultor: 'consultor.png', barao: 'barao.png', senhora: 'senhora.png', crianca: 'crianca.png', monge: 'monge.png' };
export const ROSTOS = { consultor: 'consultor-rosto.png', barao: 'barao-rosto.png' };
export const DIRECOES = { baixo: 0, cima: 1, esq: 2, dir: 3 };
// quantas linhas de caminhada cada folha tem (algumas pessoas só têm duas)
export const LINHAS = { senhora: 2, crianca: 2 };

const R = (folha, x, y, w = 1, h = 1) => ({ folha, x, y, w, h });
export const RECORTES = {
  // árvores e natureza
  arvoreRedonda: R('natureza', 0, 0, 2, 2), pinheiro: R('natureza', 2, 0, 2, 2), arvoreSeca: R('natureza', 4, 0, 2, 2), arvoreClara: R('natureza', 16, 0, 2, 2),
  arvoreRosa: R('natureza', 14, 0, 2, 2), trioPinheiros: R('natureza', 0, 2, 4, 3), trioVerde: R('natureza', 5, 2, 3, 3), arvoreGrande: R('natureza', 3, 18, 3, 3), arvoreGrandeRosa: R('natureza', 0, 18, 3, 3),
  toco: R('natureza', 0, 8, 2, 2), arbusto1: R('natureza', 0, 10), arbusto2: R('natureza', 1, 10), arbusto3: R('natureza', 2, 10), arbusto4: R('natureza', 4, 10),
  florAmarela: R('natureza', 0, 11), florLaranja: R('natureza', 1, 11), florVermelha: R('natureza', 3, 11), florBranca: R('natureza', 6, 11),
  pedraGrande: R('natureza', 12, 8, 2, 2), trigo: R('natureza', 7, 11), mato: R('natureza', 8, 11),
  // casas da Vila (3x3)
  casaLaranja: R('casas', 0, 0, 3, 3), casaBege: R('casas', 4, 0, 3, 3), casaLaranja2: R('casas', 8, 0, 3, 3), templo: R('casas', 12, 0, 3, 3),
  loja: R('casas', 16, 0, 3, 3), lojaVerde: R('casas', 19, 0, 4, 3), casaPedra: R('casas', 23, 0, 3, 3), casaPartida: R('casas', 26, 0, 3, 3),
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
