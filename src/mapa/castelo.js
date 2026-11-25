// Castelo da Bagunça em pixel art do projeto (224 x 270, base de 7 peças): torre central alta atrás da casa do portão,
// duas torres redondas, muralha com ameias sobre cachorros de pedra, portão de madeira com grade, brasão, faixas e janelas.
// A pedra é o mesmo tijolo da muralha do Mundo 2 (theidiotmachine, CC-BY-SA 3.0), para os dois parecerem uma obra só.
// Nas ruínas, os telhados e a torre central caem, as torres ficam quebradas e sobra um arco por onde se passa.
export const CASTELO_W = 224;
export const CASTELO_H = 270;
// Pontos que acendem à noite [x, y, raio, tipo] e pontas dos mastros [x, y], em pixels do desenho
export const CASTELO_LUZES = [[112, 108, 22], [112, 142, 18], [40, 172, 20], [184, 172, 20], [76, 220, 34, 'luz-lampiao'], [148, 220, 34, 'luz-lampiao']];
export const CASTELO_MASTROS = [[112, 6], [40, 60], [184, 60]];

const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const CONTORNO = '#241d33'; const CLARA = '#e4dac4'; const MEDIA = '#b7ac96'; const ESCURA = '#756b60';
const VERMELHO = '#c22d40'; const VERMELHO_ESC = '#7c1a28'; const OURO = '#efc546'; const OURO_ESC = '#9c701a';
const BASE = CASTELO_H - 12;

export function desenharCastelo(ruina = false, tijolo = null) {
  const cv = document.createElement('canvas'); cv.width = CASTELO_W; cv.height = CASTELO_H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const r = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  // parede de tijolo dentro de um recorte, com um tom por cima
  const pedra = (x, y, w, h, tom = 0) => {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (tijolo) { for (let yy = y; yy < y + h; yy += 32) for (let xx = x - (x % 32); xx < x + w; xx += 32) g.drawImage(tijolo, xx, yy); } else r(MEDIA, x, y, w, h);
    r('rgba(214,196,160,0.16)', x, y, w, h);
    if (tom > 0) r(`rgba(30,20,55,${tom})`, x, y, w, h);
    g.restore();
  };
  const sombraV = (x, y, w, h, forca) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,238,200,0.10)'); gr.addColorStop(0.55, 'rgba(25,18,50,0.05)'); gr.addColorStop(1, `rgba(25,18,50,${forca})`); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  const cilindro = (cx, w, topo, base) => {
    g.save(); g.beginPath(); g.rect(cx - w / 2, topo, w, base - topo); g.ellipse(cx, base, w / 2, 9, 0, 0, Math.PI); g.clip();
    pedra(cx - w / 2, topo, w, base - topo + 12);
    const gr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    gr.addColorStop(0, 'rgba(30,20,55,0.25)'); gr.addColorStop(0.18, 'rgba(255,238,200,0.30)'); gr.addColorStop(0.45, 'rgba(255,238,200,0)'); gr.addColorStop(1, 'rgba(22,14,48,0.70)');
    g.fillStyle = gr; g.fillRect(cx - w / 2, topo, w, base - topo + 12); sombraV(cx - w / 2, topo, w, base - topo + 12, 0.35);
    r('rgba(255,238,200,0.18)', cx - w / 2, base - 12, w, 3); r('rgba(25,18,50,0.35)', cx - w / 2, base - 9, w, 20);
    g.restore();
    r(CONTORNO, cx - w / 2 - 1, topo, 2, base - topo); r(CONTORNO, cx + w / 2 - 1, topo, 2, base - topo);
    g.strokeStyle = CONTORNO; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, base, w / 2, 9, 0, 0, Math.PI); g.stroke();
  };
  // ameias sobre um beiral de pedra sustentado por cachorros
  const parapeito = (x, y, w) => {
    r(CONTORNO, x - 1, y - 1, w + 2, 14); r(MEDIA, x, y, w, 12); r(CLARA, x, y, w, 3); r(ESCURA, x, y + 9, w, 3);
    for (let xx = x + 4; xx < x + w - 5; xx += 12) { r(CONTORNO, xx, y + 12, 7, 9); r(MEDIA, xx + 1, y + 12, 5, 5); r(ESCURA, xx + 2, y + 17, 3, 3); }
    const n = Math.max(2, Math.floor((w + 6) / 18)); const passo = (w - 12) / (n - 1);
    for (let k = 0; k < n; k++) { const xx = Math.round(x + k * passo); r(CONTORNO, xx - 1, y - 14, 14, 14); r(MEDIA, xx, y - 13, 12, 13); r(CLARA, xx, y - 13, 12, 3); r(ESCURA, xx + 9, y - 10, 3, 10); }
  };
  // telhado cônico de ardósia em escamas, com beiral curvo e ponteira
  const cone = (cx, baseY, larg, alt) => {
    const topo = baseY - alt;
    const lados = () => { g.moveTo(cx - larg / 2, baseY); g.quadraticCurveTo(cx - larg * 0.17, baseY - alt * 0.42, cx, topo); g.quadraticCurveTo(cx + larg * 0.17, baseY - alt * 0.42, cx + larg / 2, baseY); g.ellipse(cx, baseY, larg / 2, 8, 0, 0, Math.PI); };
    g.save(); g.beginPath(); lados(); g.closePath(); g.clip();
    r('#47598c', cx - larg / 2, topo, larg, alt + 10);
    for (let y = topo, n = 0; y < baseY + 10; y += 6, n++) for (let x = cx - larg / 2 - (n % 2) * 4; x < cx + larg / 2; x += 8) {
      r(hash(x, y) < 0.3 ? '#54689d' : hash(y, x) < 0.2 ? '#3b4a78' : '#47598c', x, y, 8, 6); r('#2a3458', x, y + 5, 8, 1); r('#2a3458', x, y + 2, 1, 3); r('#7388bd', x + 2, y, 4, 1);
    }
    const gr = g.createLinearGradient(cx - larg / 2, 0, cx + larg / 2, 0); gr.addColorStop(0, 'rgba(10,10,40,0.15)'); gr.addColorStop(0.25, 'rgba(210,228,255,0.34)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(8,8,36,0.55)');
    g.fillStyle = gr; g.fillRect(cx - larg / 2, topo, larg, alt + 10); g.restore();
    g.strokeStyle = CONTORNO; g.lineWidth = 2; g.beginPath(); lados(); g.stroke();
    g.strokeStyle = OURO_ESC; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, baseY, larg / 2 - 2, 7, 0, 0.1, Math.PI - 0.1); g.stroke(); g.strokeStyle = OURO; g.lineWidth = 1; g.stroke();
    r(CONTORNO, cx - 2, topo - 5, 4, 9); r(OURO, cx - 1, topo - 4, 2, 7); r(CONTORNO, cx - 4, topo + 1, 8, 7); r(OURO, cx - 3, topo + 2, 6, 5); r('#fff0a8', cx - 2, topo + 3, 2, 2);
    r('rgba(20,12,40,0.45)', cx - larg / 2 + 10, baseY + 9, larg - 20, 5);
  };
  const janela = (cx, y, w, h) => {
    r(CLARA, cx - w / 2 - 3, y + w / 2 - 1, w + 6, h - w / 2 + 3); g.fillStyle = CLARA; g.beginPath(); g.arc(cx, y + w / 2, w / 2 + 3, Math.PI, 0); g.fill();
    g.fillStyle = '#2a2140'; g.beginPath(); g.rect(cx - w / 2, y + w / 2, w, h - w / 2); g.arc(cx, y + w / 2, w / 2, Math.PI, 0); g.fill();
    r('#e9a94a', cx - w / 2 + 1, y + h - Math.floor(h * 0.55), w - 2, Math.floor(h * 0.5)); r('#ffd98a', cx - w / 2 + 2, y + h - Math.floor(h * 0.5), Math.max(1, Math.floor(w / 3)), Math.floor(h * 0.4));
    r(CONTORNO, cx - 1, y + 2, 2, h - 2); r(CONTORNO, cx - w / 2, y + Math.floor(h * 0.58), w, 2); r(ESCURA, cx - w / 2 - 4, y + h, w + 8, 3); r(CLARA, cx - w / 2 - 4, y + h, w + 8, 1);
  };
  // emblema do castelo: losango dourado com miolo claro
  const losango = (cx, cy, raio) => { for (let d = -raio; d <= raio; d++) { const m = Math.round((raio - Math.abs(d)) * 0.8); r(OURO, cx - m, cy + d, m + 1, 1); r(OURO_ESC, cx + 1, cy + d, m, 1); } r('#fff0a8', cx - 1, cy - 2, 2, 3); };
  const faixa = (cx, y, w, alt) => {
    r(CONTORNO, cx - w / 2 - 3, y - 2, w + 6, 5); r(OURO, cx - w / 2 - 2, y - 1, w + 4, 2);
    for (let x = 0; x < w; x++) { const ponta = Math.round(8 - Math.abs(x - (w - 1) / 2) * (16 / w)); const h = alt + ponta; const dobra = Math.sin(x / 2.6);
      r(CONTORNO, cx - w / 2 + x, y + 3, 1, h + 1); r(dobra > 0.35 ? '#e0485a' : dobra < -0.45 ? VERMELHO_ESC : VERMELHO, cx - w / 2 + x, y + 3, 1, h); r(OURO, cx - w / 2 + x, y + h, 1, 2); }
    r(CONTORNO, cx - w / 2 - 1, y + 3, 1, alt); r(CONTORNO, cx + w / 2, y + 3, 1, alt);
    losango(cx, y + Math.floor(alt / 2) + 2, 6);
  };
  const hera = (x, y, n) => { for (let i = 0; i < n; i++) r(hash(i, x) < 0.5 ? '#3f7d34' : hash(x, i) < 0.5 ? '#5b9c44' : '#2c5e2a', x + Math.floor(hash(i, y) * 16) - 8, y - Math.floor(hash(y, i) * n * 0.8), 4, 3); };
  const tocha = (x, y) => { r(CONTORNO, x - 3, y, 6, 12); r('#7a4c28', x - 2, y + 4, 4, 8); r('#4b4658', x - 4, y + 2, 8, 3); r('#e8602c', x - 4, y - 8, 8, 10); r('#ffb23e', x - 2, y - 10, 5, 10); r('#fff0a8', x - 1, y - 4, 2, 5); };

  if (!ruina) {
    // torre central, mais ao fundo
    pedra(80, 82, 64, 110, 0.12); const gr = g.createLinearGradient(80, 0, 144, 0); gr.addColorStop(0, 'rgba(255,238,200,0.22)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(22,14,48,0.5)'); g.fillStyle = gr; g.fillRect(80, 82, 64, 110);
    r(CONTORNO, 79, 82, 2, 110); r(CONTORNO, 143, 82, 2, 110); r(CLARA, 80, 128, 64, 3); r(ESCURA, 80, 131, 64, 2);
    parapeito(74, 84, 76); cone(112, 72, 72, 58);
    janela(112, 98, 14, 24); janela(97, 135, 8, 14); janela(127, 135, 8, 14); janela(112, 135, 8, 14);
    // muralha
    pedra(52, 168, 120, BASE - 168); sombraV(52, 168, 120, BASE - 168, 0.45); r(CONTORNO, 52, BASE, 120, 2);
    parapeito(54, 160, 116);
    // corpo saliente do portão, com frontão
    pedra(78, 170, 68, BASE - 166); sombraV(78, 170, 68, BASE - 166, 0.35); r(CONTORNO, 77, 170, 2, BASE - 166); r(CONTORNO, 145, 170, 2, BASE - 166); r('rgba(255,238,200,0.18)', 79, 170, 6, BASE - 168); r('rgba(22,14,48,0.35)', 139, 170, 6, BASE - 168);
    r('rgba(22,14,48,0.35)', 146, 176, 7, BASE - 176);
    const tri = (cor, meia, y0, y1) => { g.fillStyle = cor; g.beginPath(); g.moveTo(112, y0); g.lineTo(112 + meia, y1); g.lineTo(112 - meia, y1); g.closePath(); g.fill(); };
    tri(CONTORNO, 39, 145, 174); tri('#47598c', 34, 149, 172); tri(CLARA, 25, 155, 172); r(OURO_ESC, 76, 172, 72, 4); r(OURO, 76, 172, 72, 2);
    // brasão
    r(CONTORNO, 103, 160, 18, 20); r(CONTORNO, 106, 180, 12, 4); r(VERMELHO, 105, 162, 14, 18); r(VERMELHO, 108, 180, 8, 2); losango(112, 171, 7);
    // arco, portas de madeira e grade levantada
    const arco = (raio, cor, topo) => { g.fillStyle = cor; g.beginPath(); g.rect(112 - raio, topo + raio, raio * 2, BASE - topo - raio + 1); g.arc(112, topo + raio, raio, Math.PI, 0); g.fill(); };
    arco(28, CONTORNO, 185); arco(26, CLARA, 187);
    for (let a = 0; a <= 8; a++) { const t = Math.PI + (a / 8) * Math.PI; r(ESCURA, Math.round(112 + Math.cos(t) * 23) - 1, Math.round(213 + Math.sin(t) * 23) - 1, 2, 4); }
    arco(21, CONTORNO, 192); arco(19, '#7a4c28', 194);
    g.save(); g.beginPath(); g.rect(93, 213, 38, BASE - 212); g.arc(112, 213, 19, Math.PI, 0); g.clip();
    for (let x = 93; x < 131; x += 7) { r('#8f5c31', x, 192, 5, BASE - 192); r('#a8743f', x, 192, 1, BASE - 192); r('#4a2c16', x + 6, 192, 1, BASE - 192); }
    for (const y of [218, 240]) { r('#2f2b3a', 93, y, 38, 5); r('#716c86', 93, y, 38, 1); for (let x = 96; x < 130; x += 8) r('#c9c4da', x, y + 2, 2, 2); }
    r(CONTORNO, 111, 192, 2, BASE - 192); r(OURO, 104, 229, 4, 5); r(OURO, 116, 229, 4, 5);
    for (let x = 95; x < 131; x += 7) { r('#3a3646', x, 192, 3, 16); r('#85809a', x, 192, 1, 16); r('#3a3646', x + 1, 208, 1, 4); }
    r('#3a3646', 93, 200, 38, 3); g.restore();
    for (let k = 0; k < 3; k++) { r(CONTORNO, 84 - k * 3, BASE + k * 4 - 1, 56 + k * 6, 5); r(k % 2 ? MEDIA : CLARA, 85 - k * 3, BASE + k * 4, 54 + k * 6, 3); }
    // torres da frente
    for (const cx of [40, 184]) { cilindro(cx, 58, 130, BASE); parapeito(cx - 33, 128, 66); cone(cx, 116, 70, 52); janela(cx, 162, 10, 20); }
    faixa(40, 188, 18, 34); faixa(184, 188, 18, 34);
    tocha(76, 220); tocha(148, 220);
    hera(18, BASE + 2, 46); hera(204, BASE, 34); hera(66, BASE + 1, 16); hera(139, 104, 14);
  } else {
    // torres quebradas, com o topo dentado
    for (const [cx, topo] of [[34, 168], [190, 150]]) {
      cilindro(cx, 46, topo + 12, BASE);
      for (let x = cx - 23; x < cx + 23; x += 6) { const h = Math.floor(hash(x, 22) * 20); pedra(x, topo + 12 - h, 6, h + 1, 0.15); r(CONTORNO, x, topo + 11 - h, 6, 2); r(CLARA, x, topo + 13 - h, 6, 1); }
      let x = cx - 6; for (let y = topo + 22; y < topo + 62; y += 4) { x += Math.floor(hash(y, cx) * 5) - 2; r(CONTORNO, x, y, 2, 5); }
      r(CONTORNO, cx + 3, BASE - 46, 9, 20); r('#12101c', cx + 4, BASE - 45, 7, 18);
    }
    // arco de pedra que ficou de pé
    for (const x of [56, 156]) { r(CONTORNO, x - 1, 192, 14, BASE - 190); pedra(x, 194, 12, BASE - 194); r('rgba(255,238,200,0.22)', x, 194, 4, BASE - 194); r('rgba(22,14,48,0.35)', x + 8, 194, 4, BASE - 194); r(CONTORNO, x - 3, 188, 18, 8); r(CLARA, x - 2, 189, 16, 5); }
    for (const passo of [0, 1]) for (let a = 0; a <= 60; a++) {
      if (a > 40 && a < 46) continue; const t = Math.PI + (a / 60) * Math.PI; const x = Math.round(112 + Math.cos(t) * 50); const y = Math.round(192 + Math.sin(t) * 34);
      if (!passo) r(CONTORNO, x - 6, y - 6, 12, 12); else { r(a % 6 === 0 ? ESCURA : MEDIA, x - 4, y - 4, 8, 8); r(CLARA, x - 4, y - 4, 8, 2); }
    }
    // escombros e um telhado caído, só nos lados
    for (let k = 0; k < 70; k++) {
      const x = hash(k, 6) < 0.5 ? 4 + Math.floor(hash(k, 1) * 48) : 168 + Math.floor(hash(k, 1) * 46); const y = BASE - 12 + Math.floor(hash(k, 2) * 20); const w = 4 + Math.floor(hash(k, 3) * 9); const h = 3 + Math.floor(hash(k, 4) * 6);
      r(CONTORNO, x - 1, y - 1, w + 2, h + 2); r(k % 9 === 0 ? '#47598c' : hash(k, 5) > 0.5 ? MEDIA : '#968b78', x, y, w, h); r('rgba(255,255,255,0.3)', x, y, w, 1);
    }
    g.save(); g.translate(28, BASE + 2); g.rotate(-1.15); g.fillStyle = CONTORNO; g.beginPath(); g.moveTo(-17, 0); g.lineTo(0, -40); g.lineTo(17, 0); g.fill(); g.fillStyle = '#47598c'; g.beginPath(); g.moveTo(-14, -2); g.lineTo(0, -35); g.lineTo(14, -2); g.fill(); g.restore();
    faixa(190, 192, 12, 20); hera(20, BASE + 4, 30); hera(200, BASE + 4, 24);
  }
  // bordas sem meio-tom
  const dados = g.getImageData(0, 0, CASTELO_W, CASTELO_H); const d = dados.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
  g.putImageData(dados, 0, 0);
  return cv;
}
