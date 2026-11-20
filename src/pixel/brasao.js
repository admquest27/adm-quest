// O brasão alado do ADM Quest: escudo real com asas e coroa, a espada do herói, um gráfico de barras subindo
// e uma moeda; faixa vermelha com o letreiro dourado. Desenhado em qualquer escala (k = 1 tem 160x120).
import { tela, el, ret, poli, contorno, desenha } from './formas.js';
import { letreiro } from './texto.js';

export function gradeBrasao(k = 1, { faixa = true } = {}) {
  const S = (v) => v * k;
  const r = tela(Math.round(160 * k), Math.round((faixa ? 120 : 96) * k));
  for (const sx of [-1, 1]) {
    el(r, S(80 + sx * 40), S(30), S(16), S(6), 'w', { sombra: 's', borda: 'l' });
    for (let i = 0; i < 5; i++) el(r, S(80 + sx * (34 + i * 3)), S(37 + i * 6), S(13 - i * 1.6), Math.max(1.5, S(3.6)), 'w', { sombra: 's', borda: 'l' });
  }
  poli(r, [[52, 26], [108, 26], [108, 62], [80, 92], [52, 62]].map(([x, y]) => [S(x), S(y)]), 'g');
  poli(r, [[56, 30], [104, 30], [104, 61], [80, 86], [56, 61]].map(([x, y]) => [S(x), S(y)]), (x, y) => ((x < S(80)) === (y < S(56)) ? 'U' : 'V'));
  for (const [x, y] of [[54, 28], [106, 28], [54, 60], [106, 60]]) ret(r, Math.round(S(x) - 1), Math.round(S(y) - 1), Math.max(1, Math.round(S(2))), Math.max(1, Math.round(S(2))), 'Y');
  poli(r, [[60, 26], [60, 14], [67, 20], [73, 9], [80, 17], [87, 9], [93, 20], [100, 14], [100, 26]].map(([x, y]) => [S(x), S(y)]), (x, y) => (y > S(22) ? 'G' : 'g'));
  ret(r, Math.round(S(72)), Math.round(S(11)), Math.max(1, Math.round(S(2))), Math.max(1, Math.round(S(2))), 'r');
  ret(r, Math.round(S(86)), Math.round(S(11)), Math.max(1, Math.round(S(2))), Math.max(1, Math.round(S(2))), 'r');
  // espada do herói
  ret(r, Math.round(S(78)), Math.round(S(34)), Math.max(2, Math.round(S(4))), Math.round(S(34)), 'S');
  ret(r, Math.round(S(78)), Math.round(S(34)), 1, Math.round(S(34)), 'w');
  poli(r, [[78, 34], [82, 34], [80, 28]].map(([x, y]) => [S(x), S(y)]), 'S');
  ret(r, Math.round(S(70)), Math.round(S(66)), Math.round(S(20)), Math.max(2, Math.round(S(3))), 'g');
  ret(r, Math.round(S(78)), Math.round(S(69)), Math.max(2, Math.round(S(4))), Math.round(S(8)), 'o');
  el(r, S(80), S(79), Math.max(1.2, S(2.6)), Math.max(1.2, S(2.4)), 'g');
  // gráfico subindo e moeda
  for (const [x, h] of [[60, 6], [65, 10], [70, 15]]) ret(r, Math.round(S(x)), Math.round(S(62 - h)), Math.max(2, Math.round(S(4))), Math.round(S(h)), 'y');
  el(r, S(93), S(50), S(5), S(5), 'g', { sombra: 'G', borda: 'G' });
  if (k >= 0.8) { ret(r, Math.round(S(91)), Math.round(S(48)), 1, Math.round(S(5)), 'G'); ret(r, Math.round(S(95)), Math.round(S(48)), 1, Math.round(S(5)), 'G'); ret(r, Math.round(S(92)), Math.round(S(47)), Math.round(S(3)), 1, 'Y'); ret(r, Math.round(S(92)), Math.round(S(50)), Math.round(S(3)), 1, 'G'); }
  if (faixa) {
    poli(r, [[14, 94], [32, 94], [32, 112], [14, 112], [21, 103]].map(([x, y]) => [S(x), S(y)]), 'R');
    poli(r, [[146, 94], [128, 94], [128, 112], [146, 112], [139, 103]].map(([x, y]) => [S(x), S(y)]), 'R');
    ret(r, Math.round(S(28)), Math.round(S(90)), Math.round(S(104)), Math.round(S(20)), 'r');
    ret(r, Math.round(S(28)), Math.round(S(107)), Math.round(S(104)), Math.max(1, Math.round(S(3))), 'R');
  }
  contorno(r, 'K');
  return r;
}

// Canvas do brasão em tamanho real (pixels de arte), pronto para ampliar com image-rendering: pixelated.
export function canvasBrasao(k = 1, { faixa = true, texto = true } = {}) {
  const r = gradeBrasao(k, { faixa });
  const c = document.createElement('canvas');
  c.width = r.w; c.height = r.h;
  const g = c.getContext('2d');
  desenha(g, r);
  if (faixa && texto) letreiro(g, 'ADM QUEST', Math.round(20 * k), Math.round(80 * k), Math.round(88 * k), { prof: Math.max(1, Math.round(2 * k)) });
  return c;
}
