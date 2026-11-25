// Monta o atlas da Vila: recorta das folhas LPC só as peças listadas em lpc-mapa.json (e as composições,
// como casas montadas com telhado, parede, porta e janela) e junta tudo numa imagem só.
// Uso: node ferramentas/lpc-mapa.mjs <pasta arte/baixados>
// Nas composições, uma camada ["cor", "#hex", x, y, largura, altura] pinta um retângulo (trilhos, grades, sombras).
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
  const tinge = (g, im, x, y, w, h, dx, dy, dh, ds, dl) => { // troca a cor só do tijolo vermelho (matiz perto do vermelho), sem mexer no telhado de outra cor
    const t = document.createElement('canvas'); t.width = w; t.height = h; const tg = t.getContext('2d'); tg.drawImage(im, x, y, w, h, 0, 0, w, h);
    const d = tg.getImageData(0, 0, w, h); const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); const l = (mx + mn) / 2; const dd = mx - mn; if (!dd) continue;
      const sat = dd / (1 - Math.abs(2 * l - 1)); let hh = mx === r ? ((gg - b) / dd + 6) % 6 : mx === gg ? (b - r) / dd + 2 : (r - gg) / dd + 4; hh /= 6;
      if (!((hh < 0.04 || hh > 0.96) && sat > 0.2 && l > 0.2)) continue;
      const h2 = (hh + dh / 360 + 1) % 1, s2 = Math.max(0, Math.min(1, sat + ds)), l2 = Math.max(0, Math.min(1, l + dl));
      const q = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2, pp = 2 * l2 - q; const f = (tt) => { tt = (tt + 1) % 1; return tt < 1 / 6 ? pp + (q - pp) * 6 * tt : tt < 1 / 2 ? q : tt < 2 / 3 ? pp + (q - pp) * (2 / 3 - tt) * 6 : pp; };
      p[i] = Math.round(f(h2 + 1 / 3) * 255); p[i + 1] = Math.round(f(h2) * 255); p[i + 2] = Math.round(f(h2 - 1 / 3) * 255);
    }
    tg.putImageData(d, 0, 0); g.drawImage(t, dx, dy);
  };
  const pintaComposto = (c, noite) => (g, dx, dy) => { g.save(); g.beginPath(); g.rect(dx, dy, c.w, c.h); g.clip(); /* nada vaza para a peça vizinha */ for (const l of c.camadas) { if (l[0] === 'cor') { g.fillStyle = l[1]; g.fillRect(dx + l[2], dy + l[3], l[4], l[5]); } else if (l[0] === 'tinge') { tinge(g, imgs[l[1]], l[2], l[3], l[4], l[5], dx + l[6], dy + l[7], l[8], l[9], l[10]); } else { const [f, x, y, w, h, ox, oy] = l; g.drawImage(imgs[f], x, y + (noite && f === 'janelas' ? 96 : 0), w, h, dx + ox, dy + oy, w, h); } } g.restore(); };
  for (const [nome, c] of Object.entries(compostos)) {
    itens.push({ nome, w: c.w, h: c.h, pinta: pintaComposto(c, false) });
    // toda composição com janela ganha a versão de noite, com a janela acesa (fica 96 px abaixo na folha de janelas)
    if (c.camadas.some((l) => l[0] === 'janelas') && !nome.endsWith('-noite') && !(nome + '-noite' in compostos)) itens.push({ nome: nome + '-noite', w: c.w, h: c.h, pinta: pintaComposto(c, true) });
  }
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
