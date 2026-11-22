// Monta o atlas da Vila: recorta das folhas LPC só as peças listadas em lpc-mapa.json (e as composições,
// como casas montadas com telhado, parede, porta e janela) e junta tudo numa imagem só.
// Uso: node ferramentas/lpc-mapa.mjs <pasta arte/baixados>
// Saída: public/mapa/lpc/atlas.png e atlas.json (formato de atlas do Phaser, em pixels da arte LPC).
// Usa o Chrome do computador (puppeteer-core) só para recortar e colar imagens.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(aqui, '..');
const raiz = process.argv[2];
if (!raiz || !fs.existsSync(raiz)) { console.error('Informe a pasta arte/baixados.'); process.exit(1); }
const def = JSON.parse(fs.readFileSync(path.join(aqui, 'lpc-mapa.json'), 'utf8'));
const destino = path.join(site, 'public', 'mapa', 'lpc');
fs.mkdirSync(destino, { recursive: true });

// imagens das folhas como data URL (evita depender de arquivo local no navegador)
const folhas = {};
for (const [k, arq] of Object.entries(def.folhas)) folhas[k] = 'data:image/png;base64,' + fs.readFileSync(path.join(raiz, arq)).toString('base64');

const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pg = await navegador.newPage();
const resultado = await pg.evaluate(async ({ folhas, pecas, compostos, largura }) => {
  const imgs = {};
  await Promise.all(Object.entries(folhas).map(([k, src]) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => { imgs[k] = i; ok(); }; i.onerror = () => erro(new Error(k)); i.src = src; })));
  const itens = [];
  for (const [nome, [f, x, y, w, h]] of Object.entries(pecas)) itens.push({ nome, w, h, pinta: (g, dx, dy) => g.drawImage(imgs[f], x, y, w, h, dx, dy, w, h) });
  for (const [nome, c] of Object.entries(compostos)) itens.push({ nome, w: c.w, h: c.h, pinta: (g, dx, dy) => { for (const [f, x, y, w, h, ox, oy] of c.camadas) g.drawImage(imgs[f], x, y, w, h, dx + ox, dy + oy, w, h); } });
  // empacotamento em prateleiras, das peças mais altas para as mais baixas, com 2 px de folga
  itens.sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0, y = 0, alturaLinha = 0; const frames = {};
  for (const it of itens) {
    if (x + it.w > largura) { x = 0; y += alturaLinha + 2; alturaLinha = 0; }
    it.x = x; it.y = y; x += it.w + 2; alturaLinha = Math.max(alturaLinha, it.h);
    frames[it.nome] = { frame: { x: it.x, y: it.y, w: it.w, h: it.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: it.w, h: it.h }, sourceSize: { w: it.w, h: it.h } };
  }
  const alt = y + alturaLinha;
  const c = document.createElement('canvas'); c.width = largura; c.height = alt;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (const it of itens) it.pinta(g, it.x, it.y);
  return { png: c.toDataURL('image/png'), frames, w: largura, h: alt };
}, { folhas, pecas: def.pecas, compostos: def.compostos ?? {}, largura: def.largura ?? 2048 });
await navegador.close();

fs.writeFileSync(path.join(destino, 'atlas.png'), Buffer.from(resultado.png.split(',')[1], 'base64'));
fs.writeFileSync(path.join(destino, 'atlas.json'), JSON.stringify({ frames: resultado.frames, meta: { image: 'atlas.png', size: { w: resultado.w, h: resultado.h }, scale: '1' } }));
console.log('Atlas pronto:', Object.keys(resultado.frames).length, 'peças,', resultado.w + 'x' + resultado.h, Math.round(fs.statSync(path.join(destino, 'atlas.png')).size / 1024) + ' KB');
