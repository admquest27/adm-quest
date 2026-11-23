// Retratos dos moradores para a caixa de conversa: o rosto do personagem montado em LPC, centralizado pela cabeça,
// sobre um cenário que combina com ele (noite estrelada do Consultor, cortina do Barão, planilha da Dona Planilha...),
// com moldura dourada e um leve escurecido nas bordas. O desenho sai em 96 por 96 px, no mesmo tamanho da caixa.
import { folha } from '../avatar.js';
import { MORADORES } from './moradores.js';

const T = 96;
const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const mistura = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a); const y = p(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; };
const degrade = (g, de, ate, passo = 4) => { for (let y = 0; y < T; y += passo) { g.fillStyle = mistura(de, ate, y / T); g.fillRect(0, y, T, passo); } };
const bloco = (g, x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(Math.round(x), Math.round(y), w, h); };

const FUNDOS = {
  // noite estrelada com lua crescente
  consultor(g) {
    degrade(g, '#141c4a', '#4560b0');
    for (let i = 0; i < 18; i++) { const x = Math.floor(hash(i, 1) * 22) * 4 + 2; const y = Math.floor(hash(i, 2) * 14) * 4 + 2; bloco(g, x, y, i % 4 ? 2 : 4, i % 4 ? 2 : 4, i % 3 ? '#fff6c8' : '#ffd86b'); }
    g.fillStyle = '#ffe28a'; g.beginPath(); g.arc(74, 20, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = mistura('#141c4a', '#4560b0', 0.2); g.beginPath(); g.arc(79, 17, 9, 0, Math.PI * 2); g.fill();
  },
  // cortina de teatro com franja dourada
  barao(g) {
    degrade(g, '#4a121a', '#962c39');
    for (let x = 0; x < T; x += 12) { bloco(g, x, 0, 3, T, 'rgba(0,0,0,0.22)'); bloco(g, x + 6, 0, 2, T, 'rgba(255,255,255,0.08)'); }
    for (let x = 0; x < T; x += 6) bloco(g, x, T - 8, 4, 8, '#d9a441');
  },
  // folha de planilha: grade verde clara, cabeçalho e uma célula marcada
  senhora(g) {
    bloco(g, 0, 0, T, T, '#e9f4e2');
    for (let x = 0; x <= T; x += 16) bloco(g, x, 0, 1, T, '#9cc59a');
    for (let y = 0; y <= T; y += 12) bloco(g, 0, y, T, 1, '#9cc59a');
    bloco(g, 0, 0, T, 12, '#5b9b5f'); bloco(g, 16, 36, 16, 12, 'rgba(255,214,80,0.55)');
  },
  // mural de recados coloridos
  crianca(g) {
    degrade(g, '#bcd8ff', '#e7f1ff');
    [[6, 8, '#ffe27a'], [70, 12, '#ff9ec4'], [10, 58, '#9be59b'], [72, 62, '#ffe27a']].forEach(([x, y, cor]) => { bloco(g, x + 2, y + 2, 18, 18, 'rgba(0,0,0,0.18)'); bloco(g, x, y, 18, 18, cor); bloco(g, x + 3, y + 5, 12, 2, 'rgba(0,0,0,0.25)'); bloco(g, x + 3, y + 10, 8, 2, 'rgba(0,0,0,0.25)'); });
  },
  // nascer do sol atrás de um templo
  monge(g) {
    degrade(g, '#ffd488', '#e8793c');
    g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(48, 64, 22, 0, Math.PI * 2); g.fill();
    bloco(g, 0, 78, T, 18, '#4a2c20'); bloco(g, 8, 70, 24, 8, '#4a2c20'); bloco(g, 14, 64, 12, 6, '#4a2c20'); bloco(g, 64, 70, 24, 8, '#4a2c20'); bloco(g, 70, 64, 12, 6, '#4a2c20');
  },
  // faixas de obra
  operario(g) {
    bloco(g, 0, 0, T, T, '#f4c430');
    for (let i = -T; i < T * 2; i += 24) { g.fillStyle = '#26232e'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 12, 0); g.lineTo(i + 12 - T, T); g.lineTo(i - T, T); g.fill(); }
  },
};

const prontos = new Map();
export function retratoMorador(quem) {
  if (!prontos.has(quem)) prontos.set(quem, desenhar(quem).catch((e) => { prontos.delete(quem); throw e; }));
  return prontos.get(quem);
}

async function desenhar(quem) {
  const av = MORADORES[quem]; const sheet = await folha(av, 'walk');
  const c = document.createElement('canvas'); c.width = c.height = T; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  (FUNDOS[quem] ?? FUNDOS[quem.startsWith('operario') ? 'operario' : 'crianca'])(g);
  // acha a cabeça (de frente, linha 2 da folha de caminhada) para centralizar
  const [fc, fg] = (() => { const k = document.createElement('canvas'); k.width = k.height = 64; const q = k.getContext('2d', { willReadFrequently: true }); q.drawImage(sheet, 0, 128, 64, 64, 0, 0, 64, 64); return [k, q]; })();
  const d = fg.getImageData(0, 0, 64, 64).data; let topo = 64;
  for (let y = 0; y < 64 && topo === 64; y++) for (let x = 0; x < 64; x++) if (d[(y * 64 + x) * 4 + 3] > 10) { topo = y; break; }
  // o rosto fica sempre no mesmo lugar da folha (olhos perto da linha 24); centraliza pela largura do rosto, não do chapéu
  let x0 = 64; let x1 = -1;
  for (let y = 20; y < 34; y++) for (let x = 0; x < 64; x++) if (d[(y * 64 + x) * 4 + 3] > 10) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const cx = (x0 + x1) / 2; const sx = Math.max(0, Math.min(32, Math.round(cx - 16))); const sy = 7;
  g.drawImage(fc, sx, sy, 32, 32, 0, 0, T, T);
  // escurecido nas bordas e moldura
  const v = g.createRadialGradient(T / 2, T / 2, T * 0.32, T / 2, T / 2, T * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,6,20,0.38)');
  g.fillStyle = v; g.fillRect(0, 0, T, T);
  bloco(g, 0, 0, T, 4, '#24160e'); bloco(g, 0, T - 4, T, 4, '#24160e'); bloco(g, 0, 0, 4, T, '#24160e'); bloco(g, T - 4, 0, 4, T, '#24160e');
  bloco(g, 4, 4, T - 8, 2, '#c89a4b'); bloco(g, 4, T - 6, T - 8, 2, '#c89a4b'); bloco(g, 4, 4, 2, T - 8, '#c89a4b'); bloco(g, T - 6, 4, 2, T - 8, '#c89a4b');
  for (const [x, y] of [[4, 4], [T - 8, 4], [4, T - 8], [T - 8, T - 8]]) bloco(g, x, y, 4, 4, '#f7c548');
  return c.toDataURL();
}
