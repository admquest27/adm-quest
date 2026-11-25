// Versão compacta da mansão vitoriana de Casper Nilsson (CC-BY-SA 3.0 / GPL 3.0) para a fase de partida:
// recorta o corpo central e um pedaço de cada ala do desenho de demonstração, tira um andar e fecha as laterais,
// sem encolher nenhum pixel. Gera arte/proprios/mansao.png.
// Uso: node ferramentas/mansao.mjs <pasta arte/baixados>
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const raiz = process.argv[2];
if (!raiz || !fs.existsSync(raiz)) { console.error('Informe a pasta arte/baixados.'); process.exit(1); }
const demo = 'data:image/png;base64,' + fs.readFileSync(path.join(raiz, 'lpc-novos/casper/Entry_Casper_Nilsson/Victorian house/demo.png')).toString('base64');

const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pg = await navegador.newPage();
const png = await pg.evaluate(async (src) => {
  const D = new Image(); await new Promise((ok, erro) => { D.onload = ok; D.onerror = erro; D.src = src; });
  const X0 = 262, W = 296, Y0 = 62, CORTE0 = 258, CORTE1 = 325, Y1 = 470;
  const H = (CORTE0 - Y0) + (Y1 - CORTE1);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.drawImage(D, X0, Y0, W, CORTE0 - Y0, 0, 0, W, CORTE0 - Y0);
  g.drawImage(D, X0, CORTE1, W, Y1 - CORTE1, 0, CORTE0 - Y0, W, Y1 - CORTE1);
  const base = 428 - Y0 - (CORTE1 - CORTE0); // linha do chão, no pé das paredes
  const d = g.getImageData(0, 0, W, H); const p = d.data;
  // tira o gramado e o calçamento que ficam abaixo das paredes (o mapa já tem o próprio chão)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; const r = p[i], gg = p[i + 1], b = p[i + 2];
    const grama = gg > r * 1.35 && gg > b * 1.15;
    const calcada = y > base + 4 && Math.abs(r - gg) < 14 && Math.abs(gg - b) < 14 && r > 80 && r < 175 && x > 90 && x < W - 90;
    if (grama || calcada) p[i + 3] = 0;
  }
  g.putImageData(d, 0, 0);
  // apaga os pedaços das mansardas vizinhas nas beiradas (repete o telhado ao lado) e o resto de um barril
  const yb = 234 - Y0;
  for (const [de, para] of [[24, 2], [W - 44, W - 22]]) g.drawImage(c, de, 100, 20, yb - 104, para, 100, 20, yb - 104);
  g.drawImage(c, 44, base - 18, 26, 18, W - 56, base - 18, 26, 18);
  // telhado com as quinas inclinadas, em vez de cortado reto
  const beiral = 234 - Y0;
  const topo = (x) => { const dist = Math.min(x, W - 1 - x); return Math.max(4, Math.round((84 - dist) * 0.95) + 4); };
  for (let x = 0; x < W; x++) {
    const t = topo(x); g.clearRect(x, 0, 1, t);
    if (t < beiral) { g.fillStyle = '#23232a'; g.fillRect(x, t, 1, 2); g.fillStyle = '#8c8f96'; g.fillRect(x, t + 2, 1, 2); }
  }
  g.fillStyle = '#23232a'; g.fillRect(0, topo(0), 2, beiral - topo(0)); g.fillRect(W - 2, topo(W - 1), 2, beiral - topo(W - 1));
  // pilastras claras fechando as laterais, e o beiral
  for (const x of [0, W - 12]) {
    g.fillStyle = '#6c625c'; g.fillRect(x, beiral - 1, 12, base - beiral + 1);
    g.fillStyle = '#e6dfc8'; g.fillRect(x + 1, beiral, 10, base - beiral - 1);
    g.fillStyle = '#fffbe8'; g.fillRect(x + 2, beiral, 3, base - beiral - 1);
    g.fillStyle = '#b9ad98'; g.fillRect(x + 8, beiral, 3, base - beiral - 1);
    for (let y = beiral + 18; y < base - 6; y += 20) { g.fillStyle = '#9a8e7e'; g.fillRect(x + 1, y, 10, 1); }
  }
  g.fillStyle = '#6c625c'; g.fillRect(0, beiral - 4, 52, 6); g.fillRect(W - 52, beiral - 4, 52, 6);
  g.fillStyle = '#f1ead2'; g.fillRect(1, beiral - 3, 50, 3); g.fillRect(W - 51, beiral - 3, 50, 3);
  // abaixo das paredes fica só a escada com os vasos
  const meio = 409 - X0; g.clearRect(0, base + 2, meio - 54, H); g.clearRect(meio + 54, base + 2, W, H); g.clearRect(meio - 54, base + 28, 108, H);
  g.clearRect(W - 54, base - 3, 26, 10);
  // mastros com estandarte (roxo e dourado, as cores do jogo), um de cada lado da porta; também escondem o vão onde estavam as bandeiras
  g.clearRect(0, base + 2, 70, H); g.clearRect(W - 70, base + 2, 70, H);
  const r = (cor, x, y, w, h) => { g.fillStyle = cor; g.fillRect(x, y, w, h); };
  for (const x of [23, W - 32]) {
    const alto = base - 112; const lado = x < W / 2 ? 1 : -1;
    r('#4a423c', x - 1, alto, 8, H - alto - 6); r('#e6dfc8', x, alto, 6, H - alto - 7); r('#fffbe8', x, alto, 2, H - alto - 7);
    r('#4a423c', x - 3, H - 12, 12, 8); r('#b9ad98', x - 2, H - 11, 10, 6);
    r('#3a2a10', x - 1, alto - 7, 8, 8); r('#e8b93c', x, alto - 6, 6, 6); r('#fff0a8', x + 1, alto - 5, 2, 2);
    const fx = lado > 0 ? x + 6 : x - 22;
    for (let k = 0; k < 22; k++) { const col = lado > 0 ? k : 21 - k; const onda = Math.round(Math.sin(col / 3.5) * 2); const alt = 40 - Math.round(col * 0.55);
      r('#241238', fx + k, alto + 3 + onda, 1, alt + 2); r(Math.sin(col / 3.5) > 0 ? '#8a5ce8' : '#6a40bc', fx + k, alto + 4 + onda, 1, alt); r('#f0c040', fx + k, alto + 7 + onda, 1, 3); r('#f0c040', fx + k, alto + alt - 3 + onda, 1, 3); }
    r('#f0c040', fx + 8, alto + 17, 6, 10); r('#f0c040', fx + 6, alto + 19, 10, 6); r('#fff0a8', fx + 9, alto + 19, 3, 3);
  }
  return c.toDataURL('image/png') + '|' + W + 'x' + H + ' base ' + base;
}, demo);
await navegador.close();
const [dados, info] = png.split('|');
const destino = path.join(raiz, '..', 'proprios'); fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'mansao.png'), Buffer.from(dados.split(',')[1], 'base64'));
console.log('Mansão pronta:', info);
