// Castelo da Bagunça desenhado em pixel art pelo projeto (224 x 224, 7 x 7 peças): duas torres cilíndricas com telhado cônico
// de ardósia, portão em arco com grade, brasão, faixas vermelhas e ameias com o topo da muralha à vista, em vista 3/4 com luz
// vinda da esquerda. Nas pontas a rocha continua a escarpa, para o castelo e a pedra fecharem o vão. A versão em ruínas
// mantém o arco, derruba os telhados e abre o portão. As cores da pedra vêm do tijolo do castelo (theidiotmachine, CC-BY-SA 3.0).
export const CASTELO_W = 224;
export const CASTELO_H = 224;

const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const PEDRA = ['#c4b59f', '#bcae98', '#cabca6', '#b8a994'];
const MORTEIRO = '#6b6577'; const CONTORNO = '#2b2538';
const ARDOSIA = ['#4a5b8a', '#43537f', '#516396']; const ARDOSIA_LUZ = '#7487bd'; const ARDOSIA_SOMBRA = '#2e3a63';
const VERMELHO = '#b8283a'; const VERMELHO_ESC = '#7c1a28'; const OURO = '#e9bd3f'; const OURO_ESC = '#a67a1e';

function nova() { const c = document.createElement('canvas'); c.width = CASTELO_W; c.height = CASTELO_H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }

// Parede de pedra em fiadas desencontradas dentro do retângulo (x, y, w, h)
function pedra(g, x0, y0, w, h, escuro = 1) {
  for (let r = 0, y = y0; y < y0 + h; r++, y += 9) {
    const alt = Math.min(9, y0 + h - y); const desloc = (r % 2) * 9;
    for (let x = x0 - desloc; x < x0 + w; x += 18) {
      const bx = Math.max(x, x0); const bw = Math.min(x + 18, x0 + w) - bx; if (bw <= 0) continue;
      g.fillStyle = PEDRA[Math.floor(hash(x, y) * PEDRA.length)]; g.fillRect(bx, y, bw, alt);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(bx, y, bw, 1); // quina de cima
      g.fillStyle = MORTEIRO; g.fillRect(bx, y + alt - 1, bw, 1); if (x >= x0) g.fillRect(x, y, 1, alt);
    }
  }
  if (escuro !== 1) { g.fillStyle = `rgba(30,24,50,${1 - escuro})`; g.fillRect(x0, y0, w, h); }
}

// Sombreia uma faixa com degradê horizontal (luz da esquerda): claro à esquerda, escuro à direita
function luzHorizontal(g, x0, y0, w, h, forca = 0.5) {
  const grad = g.createLinearGradient(x0, 0, x0 + w, 0);
  grad.addColorStop(0, 'rgba(255,240,210,0.30)'); grad.addColorStop(0.28, 'rgba(255,240,210,0.04)'); grad.addColorStop(0.6, 'rgba(25,20,50,0.10)'); grad.addColorStop(1, `rgba(25,20,50,${forca})`);
  g.fillStyle = grad; g.fillRect(x0, y0, w, h);
}
function luzVertical(g, x0, y0, w, h, forca = 0.4) {
  const grad = g.createLinearGradient(0, y0, 0, y0 + h);
  grad.addColorStop(0, 'rgba(25,20,50,0.0)'); grad.addColorStop(0.7, 'rgba(25,20,50,0.08)'); grad.addColorStop(1, `rgba(25,20,50,${forca})`);
  g.fillStyle = grad; g.fillRect(x0, y0, w, h);
}

// Torre cilíndrica: corpo com base elíptica e luz de lado. 'topo' é o y onde o corpo começa.
function torre(g, cx, topo, w, ruina) {
  const x0 = cx - w / 2; const base = CASTELO_H - 10; const topoReal = ruina ? topo + 46 : topo;
  g.save(); g.beginPath(); g.rect(x0, topoReal, w, base - topoReal); g.ellipse(cx, base, w / 2, 9, 0, 0, Math.PI); g.clip();
  pedra(g, x0, topoReal, w, base - topoReal + 10);
  luzHorizontal(g, x0, topoReal, w, base - topoReal + 10, 0.62); luzVertical(g, x0, topoReal, w, base - topoReal + 10, 0.4);
  // friso de pedra clara onde a torre muda de largura (anel do parapeito)
  if (!ruina) { g.fillStyle = '#d8ccb6'; g.fillRect(x0, topo + 8, w, 3); g.fillStyle = MORTEIRO; g.fillRect(x0, topo + 11, w, 1); g.fillStyle = 'rgba(25,20,50,0.35)'; g.fillRect(x0, topo + 12, w, 6); }
  g.restore();
  // seteira (janela estreita) de arqueiro
  if (!ruina) { g.fillStyle = CONTORNO; g.fillRect(cx - 4, topo + 118, 8, 22); g.fillStyle = '#12101c'; g.fillRect(cx - 3, topo + 119, 6, 20); g.fillStyle = 'rgba(255,230,180,0.25)'; g.fillRect(cx - 3, topo + 119, 1, 20); g.fillStyle = '#d8ccb6'; g.fillRect(cx - 6, topo + 117, 12, 2); g.fillRect(cx - 6, topo + 140, 12, 2); }
}

// Telhado cônico de ardósia: triângulo com beiral, metade clara e metade escura, fiadas e ponteira dourada
function telhado(g, cx, baseY, larg, alt) {
  const x0 = cx - larg / 2; const topoY = baseY - alt;
  g.save(); g.beginPath(); g.moveTo(x0, baseY); g.lineTo(cx, topoY); g.lineTo(cx + larg / 2, baseY); g.ellipse(cx, baseY, larg / 2, 7, 0, 0, Math.PI); g.closePath(); g.clip();
  for (let y = topoY; y < baseY + 8; y += 6) {
    const f = (y - topoY) / alt; const meia = (larg / 2) * Math.max(0.05, f); const desloc = (Math.floor((y - topoY) / 6) % 2) * 5;
    for (let x = cx - meia - 6; x < cx + meia + 6; x += 10) {
      const lado = x + desloc < cx - 2 ? 0 : 1; const tom = ARDOSIA[Math.floor(hash(x, y) * 3)];
      g.fillStyle = tom; g.fillRect(x + desloc, y, 10, 6);
      g.fillStyle = lado === 0 ? 'rgba(160,185,235,0.30)' : 'rgba(10,12,40,0.38)'; g.fillRect(x + desloc, y, 10, 6);
      g.fillStyle = ARDOSIA_SOMBRA; g.fillRect(x + desloc, y + 5, 10, 1); g.fillRect(x + desloc, y, 1, 6);
    }
  }
  // luz da esquerda e sombra do lado direito
  const grad = g.createLinearGradient(x0, 0, x0 + larg, 0); grad.addColorStop(0, 'rgba(200,220,255,0.30)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(10,10,40,0.35)');
  g.fillStyle = grad; g.fillRect(x0, topoY, larg, alt + 10);
  g.restore();
  // aresta clara na face da esquerda e ponteira
  g.fillStyle = ARDOSIA_LUZ; for (let i = 0; i < alt; i += 2) g.fillRect(Math.round(cx - (larg / 2) * (i / alt)), topoY + i, 2, 2);
  g.fillStyle = OURO_ESC; g.fillRect(cx - 1, topoY - 12, 3, 14); g.fillStyle = OURO; g.fillRect(cx - 3, topoY - 4, 7, 5); g.fillRect(cx - 1, topoY - 12, 2, 12);
  g.fillStyle = VERMELHO; g.fillRect(cx + 2, topoY - 12, 16, 8); g.fillStyle = VERMELHO_ESC; g.fillRect(cx + 2, topoY - 6, 16, 2); g.fillRect(cx + 15, topoY - 11, 3, 6);
  // sombra do beiral sobre a pedra
  g.fillStyle = 'rgba(25,20,50,0.5)'; g.fillRect(cx - larg / 2 + 8, baseY + 6, larg - 16, 5);
}

function faixa(g, cx, topo, alt) {
  g.fillStyle = OURO_ESC; g.fillRect(cx - 12, topo, 24, 3); g.fillStyle = OURO; g.fillRect(cx - 12, topo, 24, 1);
  g.fillStyle = VERMELHO; g.fillRect(cx - 10, topo + 3, 20, alt);
  g.fillStyle = 'rgba(255,200,200,0.18)'; g.fillRect(cx - 10, topo + 3, 4, alt); g.fillStyle = VERMELHO_ESC; g.fillRect(cx + 5, topo + 3, 5, alt);
  for (let i = 0; i < 10; i++) { g.fillStyle = VERMELHO; g.fillRect(cx - 10 + i, topo + 3 + alt + Math.abs(5 - i) - 5 + 5 - Math.abs(5 - i) + (i < 5 ? 5 - i : i - 5) * -1 + 5, 1, 1); }
  // triângulo da ponta
  g.fillStyle = VERMELHO; for (let i = 0; i < 10; i++) g.fillRect(cx - 10 + i, topo + 3 + alt, 1, 9 - Math.abs(4.5 - i) * 2 + 1);
  // emblema dourado (flor-de-lis simples)
  g.fillStyle = OURO; g.fillRect(cx - 1, topo + 12, 3, 14); g.fillRect(cx - 5, topo + 17, 11, 3); g.fillRect(cx - 4, topo + 12, 2, 5); g.fillRect(cx + 3, topo + 12, 2, 5); g.fillStyle = OURO_ESC; g.fillRect(cx + 1, topo + 12, 1, 14);
}

function brasao(g, cx, topo) {
  g.fillStyle = CONTORNO; g.fillRect(cx - 12, topo, 24, 28); g.fillRect(cx - 10, topo + 28, 20, 4); g.fillRect(cx - 7, topo + 32, 14, 3); g.fillRect(cx - 3, topo + 35, 6, 2);
  g.fillStyle = VERMELHO; g.fillRect(cx - 10, topo + 2, 20, 26); g.fillRect(cx - 8, topo + 28, 16, 3); g.fillRect(cx - 5, topo + 31, 10, 2); g.fillRect(cx - 2, topo + 33, 4, 2);
  g.fillStyle = 'rgba(255,200,200,0.2)'; g.fillRect(cx - 10, topo + 2, 4, 26);
  g.fillStyle = OURO; g.fillRect(cx - 2, topo + 6, 4, 20); g.fillRect(cx - 7, topo + 12, 14, 4); g.fillStyle = OURO_ESC; g.fillRect(cx + 2, topo + 6, 1, 20);
}

function portao(g, cx, topoArco, larg, ruina) {
  const x0 = cx - larg / 2; const base = CASTELO_H - 10; const raio = larg / 2;
  // moldura do arco (pedras claras)
  g.save(); g.beginPath(); g.rect(x0 - 6, topoArco + raio, larg + 12, base - topoArco - raio + 12); g.arc(cx, topoArco + raio, raio + 6, Math.PI, 0); g.fill(); g.restore();
  g.fillStyle = '#d6cab4'; g.beginPath(); g.rect(x0 - 6, topoArco + raio, larg + 12, base - topoArco - raio + 12); g.arc(cx, topoArco + raio, raio + 6, Math.PI, 0); g.fill();
  g.fillStyle = MORTEIRO; for (let a = 0; a <= 8; a++) { const ang = Math.PI + (a / 8) * Math.PI; g.fillRect(Math.round(cx + Math.cos(ang) * (raio + 3)) - 1, Math.round(topoArco + raio + Math.sin(ang) * (raio + 3)) - 1, 2, 5); }
  // vão escuro
  g.fillStyle = '#16121f'; g.beginPath(); g.rect(x0, topoArco + raio, larg, base - topoArco - raio + 12); g.arc(cx, topoArco + raio, raio, Math.PI, 0); g.fill();
  if (!ruina) {
    // grade (portcullis) com barras de ferro e travessas
    g.fillStyle = '#4b4658'; for (let x = x0 + 3; x < x0 + larg; x += 6) g.fillRect(x, topoArco + 6, 3, base - topoArco + 6);
    g.fillStyle = '#85809a'; for (let x = x0 + 3; x < x0 + larg; x += 6) g.fillRect(x, topoArco + 6, 1, base - topoArco + 6);
    g.fillStyle = '#3a3646'; for (let y = topoArco + raio + 6; y < base + 8; y += 18) g.fillRect(x0, y, larg, 3);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x0, topoArco + 2, larg, 8);
  }
}

// Ameias da muralha: blocos de 12 x 13 com vãos de 8 e o topo da muralha (caminho de ronda) à vista
function ameias(g, x0, w, y) {
  g.fillStyle = '#9a917f'; g.fillRect(x0, y - 6, w, 8); // topo da muralha, em perspectiva
  g.fillStyle = '#b3a995'; g.fillRect(x0, y - 6, w, 1);
  for (let x = x0; x < x0 + w; x += 20) {
    const bw = Math.min(12, x0 + w - x); g.save(); g.beginPath(); g.rect(x, y - 12, bw, 14); g.clip(); pedra(g, x, y - 12, bw, 14); g.restore();
    g.fillStyle = '#e1d7c3'; g.fillRect(x, y - 12, bw, 2); g.fillStyle = 'rgba(25,20,50,0.35)'; g.fillRect(x + bw - 3, y - 12, 3, 14);
  }
}

// Rocha nas pontas: continua a escarpa (mesmos tons) e esconde as emendas laterais
function rocha(g, lado) {
  const w = 40; const x0 = lado === 'esq' ? 0 : CASTELO_W - w;
  for (let x = 0; x < w; x++) {
    const xx = x0 + x; const dist = lado === 'esq' ? x : w - 1 - x; const topo = 96 + Math.floor(dist * 1.6) + Math.floor(hash(xx, 3) * 8);
    for (let y = topo; y < CASTELO_H - 8; y++) {
      const prof = (y - topo) / (CASTELO_H - topo); const k = 1.1 - 0.6 * prof + (x % 15 < 2 ? 0.14 : 0) - (x % 15 > 12 ? 0.18 : 0);
      const r = hash(xx, y); const base = [150, 145, 132];
      g.fillStyle = `rgb(${Math.min(255, base[0] * k) | 0},${Math.min(255, base[1] * k) | 0},${Math.min(255, base[2] * k + prof * 12) | 0})`; g.fillRect(xx, y, 1, 1);
      if (r > 0.992) { g.fillStyle = 'rgba(25,20,40,0.5)'; g.fillRect(xx, y, 1, 3); }
    }
    g.fillStyle = '#3d8f3a'; g.fillRect(xx, topo - 3, 1, 3); g.fillStyle = '#6cbb52'; if (hash(xx, 9) > 0.5) g.fillRect(xx, topo - 4, 1, 2);
  }
}

// Escombros no pé da ruína
function escombros(g) {
  for (let k = 0; k < 46; k++) {
    const x = hash(k, 6) < 0.5 ? 14 + Math.floor(hash(k, 1) * 44) : 162 + Math.floor(hash(k, 1) * 44); const y = CASTELO_H - 16 + Math.floor(hash(k, 2) * 14); const w = 4 + Math.floor(hash(k, 3) * 9); const h = 3 + Math.floor(hash(k, 4) * 6);
    g.fillStyle = hash(k, 5) > 0.5 ? '#a89d88' : '#8f8573'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, w, 1); g.fillStyle = 'rgba(20,16,36,0.45)'; g.fillRect(x, y + h - 1, w, 1);
  }
}

export function desenharCastelo(ruina = false) {
  const [cv, g] = nova();
  rocha(g, 'esq'); rocha(g, 'dir');
  const cxE = 52; const cxD = 172; const cxM = 112;
  // muralha central entre as torres, com portão em arco e brasão
  const topoMuro = ruina ? 150 : 118; const base = CASTELO_H - 10;
  if (!ruina) {
  g.save(); g.beginPath(); g.rect(40, topoMuro, 144, base - topoMuro); g.ellipse(cxM, base, 72, 9, 0, 0, Math.PI); g.clip();
  pedra(g, 40, topoMuro, 144, base - topoMuro + 10); luzVertical(g, 40, topoMuro, 144, base - topoMuro + 10, 0.45);
  g.restore();
  ameias(g, 40, 144, topoMuro);
  portao(g, cxM, 146, 44, false);
  brasao(g, cxM, 104);
  }
  // torres
  if (ruina) { torre(g, 40, 66, 44, true); torre(g, 184, 66, 44, true); } else { torre(g, cxE, 66, 64, false); torre(g, cxD, 66, 64, false); }
  if (!ruina) { telhado(g, cxE, 74, 82, 56); telhado(g, cxD, 74, 82, 56); faixa(g, cxE, 92, 46); faixa(g, cxD, 92, 46); ameias(g, 84, 0, 0); }
  else {
    // topos quebrados e rachaduras
    for (const cx of [40, 184]) { g.fillStyle = '#a89d88'; for (let x = cx - 22; x < cx + 22; x += 8) { const h = Math.floor(hash(x, 22) * 12); g.fillRect(x, 112 - h, 8, h + 3); } }
    escombros(g);
    g.clearRect(64, 100, 96, CASTELO_H - 100);
    // arco que ficou de pé: dois pilares nas beiradas do vão e a curva de pedra por cima
    for (const x of [62, 152]) { pedra(g, x, 134, 10, CASTELO_H - 146); luzHorizontal(g, x, 134, 10, CASTELO_H - 146, 0.5); g.fillStyle = '#e1d7c3'; g.fillRect(x - 1, 132, 12, 4); }
    for (let a = 0; a <= 40; a++) { const t = Math.PI + (a / 40) * Math.PI; const x = Math.round(112 + Math.cos(t) * 45); const y = Math.round(134 + Math.sin(t) * 30); g.fillStyle = a % 5 === 0 ? MORTEIRO : '#cabca6'; g.fillRect(x - 4, y - 4, 9, 9); }
  }
  // rocha na frente das pontas outra vez (esconde as emendas do muro)
  // corta o que sobrou fora do desenho e deixa as bordas sem meio-tom
  const dados = g.getImageData(0, 0, CASTELO_W, CASTELO_H); const d = dados.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
  // contorno escuro de 1 px em volta de tudo
  const copia = new Uint8ClampedArray(d);
  const op = (x, y) => x >= 0 && y >= 0 && x < CASTELO_W && y < CASTELO_H && copia[(y * CASTELO_W + x) * 4 + 3] === 255;
  for (let y = 0; y < CASTELO_H; y++) for (let x = 0; x < CASTELO_W; x++) {
    if (op(x, y)) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) { const p = (y * CASTELO_W + x) * 4; d[p] = 43; d[p + 1] = 37; d[p + 2] = 56; d[p + 3] = 255; }
  }
  g.putImageData(dados, 0, 0);
  return cv;
}
