// Retratos dos moradores para a caixa de conversa, em pixel art: é o próprio personagem do mapa visto de perto
// (cabeça e ombros da folha LPC), sobre um fundo quadriculado com a cor de cada um e moldura dourada. Tudo é montado
// numa grade de 36 x 36 e ampliado sem suavizar, para os pixels ficarem nítidos.
import { MORADORES } from './moradores.js';
import { folha } from '../avatar.js';

const T = 36; const ESC = 8;
// [cor de cima, cor de baixo] do fundo de cada personagem
const FUNDOS = { consultor: ['#5b6fb8', '#2a2f66'], barao: ['#a8485a', '#451c34'], senhora: ['#a884c8', '#523a78'], crianca: ['#f0c25a', '#b8642c'], monge: ['#e89a4a', '#7c3024'], operario1: ['#7ab0c8', '#34566e'], operario2: ['#8ac08a', '#34624a'] };
const prontos = new Map();
export function retratoMorador(quem) {
  if (!prontos.has(quem)) prontos.set(quem, desenhar(quem).catch((e) => { prontos.delete(quem); throw e; }));
  return prontos.get(quem);
}

async function desenhar(quem) {
  if (!MORADORES[quem]) throw new Error('sem retrato');
  // quadro parado de frente (linha 2 da folha, 64 x 64). O enquadramento começa no alto da cabeça (ou do chapéu),
  // assim cabem o rosto e os ombros de todo mundo.
  const img = await folha(MORADORES[quem], 'walk'); if (!img) throw new Error('retrato');
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = 64; const t2 = tmp.getContext('2d', { willReadFrequently: true }); t2.drawImage(img, 0, 128, 64, 64, 0, 0, 64, 64);
  const d = t2.getImageData(0, 0, 64, 64).data; let topo = 0; while (topo < 40 && !Array.from({ length: 32 }, (_, x) => d[(topo * 64 + x + 16) * 4 + 3]).some((a) => a > 60)) topo++;
  const [alto, baixo] = FUNDOS[quem] ?? FUNDOS.crianca;
  const p = document.createElement('canvas'); p.width = p.height = T; const g = p.getContext('2d'); g.imageSmoothingEnabled = false;
  const r = (cor, x, y, w, h) => { g.fillStyle = cor; g.fillRect(x, y, w, h); };
  r(alto, 0, 0, T, T); r(baixo, 0, 20, T, T - 20);
  for (let y = 14; y < 27; y++) for (let x = (y % 2); x < T; x += 2) r(y < 20 ? baixo : alto, x, y, 1, 1);
  // clarão atrás da cabeça
  g.fillStyle = 'rgba(255,244,205,0.22)'; for (const raio of [15, 11]) { for (let y = -raio; y <= raio; y++) { const m = Math.round(Math.sqrt(raio * raio - y * y)); g.fillRect(18 - m, 16 + y, m * 2, 1); } }
  // 32 x 32 da arte a partir do alto da cabeça, com uma folga em cima
  g.drawImage(tmp, 16, Math.max(0, topo - 1) + (MORADORES[quem].chapeu === 'celeste' ? 10 : 0), 32, 32, 2, 3, 32, 32); // o chapéu de mago é alto: corta a ponta para o rosto aparecer
  r('#241a2e', 0, 0, T, 1); r('#241a2e', 0, T - 1, T, 1); r('#241a2e', 0, 0, 1, T); r('#241a2e', T - 1, 0, 1, T);
  r('#e9bd3f', 1, 1, T - 2, 1); r('#9c701a', 1, T - 2, T - 2, 1); r('#e9bd3f', 1, 1, 1, T - 2); r('#9c701a', T - 2, 1, 1, T - 2);
  for (const [x, y] of [[0, 0], [T - 3, 0], [0, T - 3], [T - 3, T - 3]]) { r('#241a2e', x, y, 3, 3); r('#ffd96a', x + 1, y + 1, 1, 1); }
  const c = document.createElement('canvas'); c.width = c.height = T * ESC; const gc = c.getContext('2d'); gc.imageSmoothingEnabled = false; gc.drawImage(p, 0, 0, T * ESC, T * ESC);
  return c.toDataURL('image/png');
}
