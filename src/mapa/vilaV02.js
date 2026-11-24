// Planta V02 da Vila dos Planos (reformulação em andamento): a geografia nova (88 x 50) sobre os dados antigos.
// Etapa 1: só o terreno. Fases, casas, objetos e estradas ainda não foram movidos (etapas 2 e 3), por isso estão vazios aqui.
export * from './vila.js?real';
import * as geo from './geografia.js';

export const LARG = geo.LARG;
export const ALT = geo.ALT;
export const GEO = geo.montarGeografia();
export const PONTE = geo.PONTE;
export const ESCADA = geo.ESCADA;
export const CASTELO = geo.CASTELO;
export const PORTAO = geo.PORTAO;
export const FLORESTA = [];
export const MUROS = [];
export const LAGOS = [];
export const RIO = { x: 0, w: 0 };
export const DESERTO = { cx: 0, cy: 0, rx: 0, ry: 0 };
export const PRACA = { cx: 21, cy: 34, rx: 8.5, ry: 5.5 };
export const POSTES = [];
export const ESTRADAS = [];
export const FASES = [];
export const ENFEITES = [];
export const OBJETOS = [];
export const LOTES = [];
export const INICIO = [10, 33];
export const SO_TERRENO = true;
