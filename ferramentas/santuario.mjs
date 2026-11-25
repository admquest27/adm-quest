// Monta o santuário do Templo Antigo: a fachada vem do pacote de Casper Nilsson (CC-BY-SA 3.0 / GPL 3.0)
// e o telhado curvo, em estilo japonês, é desenhado aqui. Gera arte/proprios/santuario.png, usado pelo atlas.
// Uso: node ferramentas/santuario.mjs <pasta arte/baixados>
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const raiz = process.argv[2];
if (!raiz || !fs.existsSync(raiz)) { console.error('Informe a pasta arte/baixados.'); process.exit(1); }
const pasta = path.join(raiz, 'lpc-novos/casper/Entry_Casper_Nilsson/Asian theme');
const url = (a) => 'data:image/png;base64,' + fs.readFileSync(path.join(pasta, a)).toString('base64');

const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pg = await navegador.newPage();
const png = await pg.evaluate(async ({ demo, pecas }) => {
  const carrega = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
  const [D, S] = await Promise.all([carrega(demo), carrega(pecas)]);
  const W = 320, H = 272;
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const [c, g] = tela(W, H);

  // 1. fachada (portas, paredes, guarda-corpo e escada), sem o gramado em volta
  const FX = 130, FY = 232, FW = 285, FH = 181;
  const [fc, fg] = tela(FW, FH); fg.drawImage(D, FX, FY, FW, FH, 0, 0, FW, FH);
  const d = fg.getImageData(0, 0, FW, FH); const p = d.data;
  for (let i = 0; i < p.length; i += 4) { const r = p[i], gg = p[i + 1], b = p[i + 2]; if (gg > r * 1.08 && gg > b * 1.08) p[i + 3] = 0; }
  fg.putImageData(d, 0, 0);
  const ox = Math.round((W - FW) / 2), oy = H - FH;
  g.drawImage(fc, ox, oy);
  // colunas vermelhas nos cantos, para a fachada fechar dos lados
  for (const x of [ox, ox + FW - 10]) { g.fillStyle = '#3d1716'; g.fillRect(x - 1, oy + 10, 12, 108); g.fillStyle = '#86322a'; g.fillRect(x, oy + 10, 10, 107); g.fillStyle = '#c06038'; g.fillRect(x + 1, oy + 10, 3, 107); for (const y of [oy + 48, oy + 84]) { g.fillStyle = '#3d1716'; g.fillRect(x, y, 10, 2); } }
  // sombra do beiral sobre a fachada
  g.globalCompositeOperation = 'source-atop';
  for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(20,8,14,0.20)'; g.fillRect(0, oy, W, 34 - k * 7); }
  g.globalCompositeOperation = 'source-over';

  // 2. telhados curvos, desenhados pixel a pixel
  const telhado = ({ topo, base, meiaTopo, meiaBase, ponta }) => {
    const cx = W / 2; const alt = base - topo;
    for (let x = Math.ceil(cx - meiaBase); x < cx + meiaBase; x++) {
      const dx = Math.abs(x + 0.5 - cx); const lado = x < cx ? 0 : 1;
      // borda de baixo: sobe nas pontas
      const q = Math.max(0, (dx - meiaBase * 0.55) / (meiaBase * 0.45));
      const yBaixo = Math.round(base - ponta * q * q);
      // borda de cima: reta na cumeeira e depois côncava até a ponta
      const u = Math.max(0, (dx - meiaTopo) / (meiaBase - meiaTopo));
      const yCima = Math.round(topo + (alt - ponta - 5) * (1 - Math.pow(1 - u, 1.7)));
      for (let y = yCima; y < yBaixo; y++) {
        const v = (y - topo) / alt;
        // telhas em colunas que se abrem para baixo
        const col = (x + 0.5 - cx) / (0.72 + 0.34 * v); const fase = ((col % 9) + 9) % 9;
        let tom = fase < 1.4 ? 0 : fase < 3.4 ? 3 : fase < 6.4 ? 2 : 1;
        if ((y + (fase > 4 ? 1 : 0)) % 8 === 0) tom = 0;
        const claro = ['#26262e', '#4d4e58', '#656773', '#838593'], escuro = ['#1d1c25', '#383843', '#4a4b57', '#5f606d'];
        let cor = (lado ? escuro : claro)[tom];
        if (y - yCima < 2) cor = lado ? '#6b6c79' : '#9a9cab';
        g.fillStyle = cor; g.fillRect(x, y, 1, 1);
      }
      // espigões nas quinas
      if (u > 0 && u < 1) { g.fillStyle = '#17161d'; g.fillRect(x, yCima - 1, 1, 1); g.fillStyle = lado ? '#555663' : '#8f91a0'; g.fillRect(x, yCima, 1, 3); g.fillStyle = '#17161d'; g.fillRect(x, yCima + 3, 1, 1); }
      else { g.fillStyle = '#17161d'; g.fillRect(x, yCima - 1, 1, 1); }
      // beiral: pontas redondas das telhas, madeira vermelha e sombra
      g.fillStyle = '#17161d'; g.fillRect(x, yBaixo, 1, 1);
      const bola = ((x % 8) + 8) % 8;
      g.fillStyle = bola < 5 ? (bola === 1 ? '#b4b6c4' : '#6d6f7c') : '#2a2932'; g.fillRect(x, yBaixo + 1, 1, bola === 0 || bola === 4 ? 2 : 3);
      g.fillStyle = '#c06038'; g.fillRect(x, yBaixo + 4, 1, 2);
      g.fillStyle = '#86322a'; g.fillRect(x, yBaixo + 6, 1, 4);
      g.fillStyle = '#3d1716'; g.fillRect(x, yBaixo + 10, 1, 2);
    }
    // pontas douradas
    for (const s of [-1, 1]) { const x = Math.round(cx + s * (meiaBase - 3)); const y = base - ponta; g.fillStyle = '#3a2a10'; g.fillRect(x - 3, y - 7, 6, 8); g.fillStyle = '#e8b93c'; g.fillRect(x - 2, y - 6, 4, 6); g.fillStyle = '#fff0a8'; g.fillRect(x - 1, y - 5, 1, 3); }
  };
  const cumeeira = (y, meia) => {
    const cx = W / 2;
    g.fillStyle = '#17161d'; g.fillRect(cx - meia - 3, y - 7, meia * 2 + 6, 10);
    g.fillStyle = '#5b5c69'; g.fillRect(cx - meia - 2, y - 6, meia * 2 + 4, 8);
    g.fillStyle = '#9a9cab'; g.fillRect(cx - meia - 2, y - 6, meia * 2 + 4, 2);
    g.fillStyle = '#2d2c36'; for (let x = cx - meia + 2; x < cx + meia; x += 8) g.fillRect(x, y - 3, 3, 4);
    for (const s of [-1, 1]) { const x = cx + s * (meia + 1); g.fillStyle = '#3a2a10'; g.fillRect(x - 5, y - 17, 10, 14); g.fillStyle = '#e8b93c'; g.fillRect(x - 4, y - 16, 8, 12); g.fillStyle = '#3a2a10'; g.fillRect(x - 1 + s * 3, y - 16, 4, 6); g.fillStyle = '#fff0a8'; g.fillRect(x - 2, y - 13, 2, 6); }
  };
  // telhado de baixo (grande)
  telhado({ topo: 66, base: 108, meiaTopo: 96, meiaBase: 158, ponta: 16 });
  // andar de cima: parede clara com colunas vermelhas e janelas de treliça
  const ax = W / 2 - 66;
  g.fillStyle = '#3d1716'; g.fillRect(ax - 2, 38, 136, 32);
  g.fillStyle = '#aea294'; g.fillRect(ax, 40, 132, 28);
  g.fillStyle = '#8d8277'; g.fillRect(ax, 40, 132, 7);
  for (const x of [0, 26, 53, 75, 102, 126]) { g.fillStyle = '#86322a'; g.fillRect(ax + x, 40, 6, 28); g.fillStyle = '#c06038'; g.fillRect(ax + x, 40, 2, 28); }
  for (const x of [34, 83]) { g.fillStyle = '#3a2f2c'; g.fillRect(ax + x, 48, 15, 14); g.fillStyle = '#8a7a6a'; for (let k = 2; k < 15; k += 4) g.fillRect(ax + x + k, 48, 1, 14); for (let k = 3; k < 14; k += 4) g.fillRect(ax + x, 48 + k, 15, 1); }
  g.fillStyle = '#c06038'; g.fillRect(ax, 62, 132, 2); g.fillStyle = '#86322a'; g.fillRect(ax, 64, 132, 3);
  // telhado de cima
  telhado({ topo: 20, base: 42, meiaTopo: 54, meiaBase: 98, ponta: 11 });
  cumeeira(20, 54);
  // frontão central com o emblema dourado
  const cx = W / 2;
  const tri = (cor, meia, y0, y1) => { g.fillStyle = cor; g.beginPath(); g.moveTo(cx, y0); g.lineTo(cx + meia, y1); g.lineTo(cx - meia, y1); g.closePath(); g.fill(); };
  tri('#17161d', 47, 70, 106); tri('#6d6f7c', 44, 73, 105); tri('#86322a', 36, 79, 105); tri('#c06038', 31, 83, 104); tri('#d9cfc0', 28, 85, 103);
  g.fillStyle = '#3a2a10'; g.fillRect(cx - 7, 91, 14, 11); g.fillStyle = '#e8b93c'; g.fillRect(cx - 5, 92, 10, 9); g.fillStyle = '#86322a'; g.fillRect(cx - 2, 94, 4, 5); g.fillStyle = '#fff0a8'; g.fillRect(cx - 4, 93, 3, 2);
  g.fillStyle = '#e8b93c'; g.fillRect(cx - 3, 66, 6, 7); g.fillStyle = '#fff0a8'; g.fillRect(cx - 2, 67, 2, 4);

  // 3. lanternas vermelhas penduradas no beiral (peça do pacote)
  for (const x of [ox + 40, ox + FW - 72]) g.drawImage(S, 32, 352, 32, 58, x, 111, 32, 58);

  return c.toDataURL('image/png');
}, { demo: url('shrine demo without roof.png'), pecas: url('shrine.png') });
await navegador.close();

const destino = path.join(raiz, '..', 'proprios'); fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'santuario.png'), Buffer.from(png.split(',')[1], 'base64'));
console.log('Santuário pronto:', path.join(destino, 'santuario.png'));
