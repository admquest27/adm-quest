// Escarpas do platô, muralha de tijolos do limite norte e escada de pedra atrás do castelo. Tudo desenhado direto no
// canvas do chão. A escarpa é arte original do projeto: um penhasco de colunas de rocha com a borda ondulada, luz vinda
// da esquerda, capa de grama, musgo, raízes, pedregulhos no pé e sombra grande no chão. Onde toca o rio, a água manda.
// A muralha usa o tijolo do castelo (theidiotmachine, CC-BY-SA 3.0) com ameias recortadas.
import { Q, ESCARPA_TRECHOS, ESCARPA_ALTURA, bordaEscarpa, alturaExtraEscarpa } from './geografia.js';
import { semente2 } from './grade.js';

const hash = (x, y) => semente2(x * 1.7 + 11, y * 2.3 + 5);
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
// ruído suave em uma dimensão (interpola valores sorteados a cada 'passo' pixels)
const ruido = (x, passo, sem) => { const a = Math.floor(x / passo); const f = x / passo - a; const u = f * f * (3 - 2 * f); return hash(a, sem) * (1 - u) + hash(a + 1, sem) * u; };

const TONS = ['#aaa395', '#958f82', '#847e72'].map(rgb);
const GRAMA = { contorno: rgb('#1d5a27'), escura: rgb('#2c7a31'), media: rgb('#3d8f3a'), clara: rgb('#6cbb52'), brilho: rgb('#9bd96c') };
const MUSGO = rgb('#4f8c3b'); const RAIZ = rgb('#5d4632');

// Topo (em pixels do mundo) da parede na coluna x de pixels. A borda ondula e ganha um tremido miúdo.
const topoPx = (x) => bordaEscarpa(x / Q) * Q + Math.round((ruido(x, 7, 21) - 0.5) * 5);

function desenharTrecho(g, t, tr) {
  const PWm = t.W * Q; const agua = t.aguaPx;
  const xa = tr.x0 * Q; const xb = Math.min(t.W, tr.x1) * Q; const PW = xb - xa;
  let minTopo = 1e9; let maxFundo = 0;
  for (let x = xa; x < xb; x++) { const tp = topoPx(x); minTopo = Math.min(minTopo, tp); maxFundo = Math.max(maxFundo, tp + (ESCARPA_ALTURA + alturaExtraEscarpa(x / Q)) * Q); }
  const Y0 = Math.floor(minTopo) - 16; const PH = Math.ceil(maxFundo) + 30 - Y0;
  const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const gc = cv.getContext('2d');
  const img = gc.createImageData(PW, PH); const o = img.data;
  const pintar = (x, y, c, a = 255) => {
    if (x < 0 || y < 0 || x >= PW || y >= PH) return;
    if (agua && agua[(Y0 + y) * PWm + xa + x]) return; // o rio passa por cima: nada de pedra dentro d'água
    const p = (y * PW + x) * 4; o[p] = c[0]; o[p + 1] = c[1]; o[p + 2] = c[2]; o[p + 3] = a;
  };
  const lum = (c, k) => [Math.min(255, Math.round(c[0] * k)), Math.min(255, Math.round(c[1] * k)), Math.min(255, Math.round(c[2] * k))];
  // colunas de rocha: larguras e tons sorteados; cada uma tem as suas fraturas e um recuo próprio no pé
  const colunas = []; const colDe = new Int16Array(PW);
  { let x = 0; let k = 0; while (x < PW) { const w = 14 + Math.floor(hash(k + tr.x0, 3) * 20); colunas.push({ x0: x, w, tom: TONS[Math.floor(hash(k + tr.x0, 9) * 3)], quebras: [0.18 + hash(k + tr.x0, 5) * 0.22, 0.5 + hash(k + tr.x0, 6) * 0.3].map((q) => q), folga: Math.floor(hash(k + tr.x0, 7) * 6), recuo: Math.floor(hash(k + tr.x0, 8) * 7) }); for (let i = x; i < Math.min(PW, x + w); i++) colDe[i] = k; x += w; k++; } }
  const tops = new Float32Array(PW); const fundos = new Float32Array(PW);
  for (let x = 0; x < PW; x++) {
    const lip = topoPx(xa + x) - Y0; tops[x] = lip;
    const col = colunas[colDe[x]]; const dx = x - col.x0;
    const pe = lip + (ESCARPA_ALTURA + alturaExtraEscarpa((xa + x) / Q)) * Q - 14 - col.recuo * 0.6 + Math.round(ruido(x, 13, 8) * 4); fundos[x] = pe;
    const alt = Math.max(1, pe - lip);
    // capa de grama que sobra por cima da parede, com tufos pendurados e um fio de luz no alto
    for (let y = Math.floor(lip) - 8; y < Math.floor(lip) + (hash(x >> 1, 77) < 0.28 ? 3 : 0); y++) {
      const dd = lip - y; const r = hash(x >> 1, y);
      pintar(x, y, dd <= 0 ? GRAMA.escura : dd < 1.5 ? GRAMA.contorno : dd <= 3 ? (r < 0.5 ? GRAMA.escura : GRAMA.media) : dd >= 7 ? GRAMA.brilho : (r < 0.35 ? GRAMA.clara : GRAMA.media));
    }
    // face de pedra: luz da esquerda em cada coluna, fraturas horizontais, sombra sob a grama e escuro no fundo
    for (let y = Math.floor(lip); y < pe; y++) {
      let k;
      if (dx === 0) k = 0.5; else if (dx === 1) k = 1.24; else if (dx === 2) k = 1.1; else if (dx >= col.w - 3) k = 0.72; else k = 1 - 0.2 * (dx / col.w);
      const prof = (y - lip) / alt;
      k *= 1.14 - 0.62 * Math.pow(prof, 1.25); if (y - lip < 6) k *= 0.6 + 0.067 * (y - lip);
      for (const q of col.quebras) { const yq = Math.floor(lip + q * alt) + col.folga; if (y === yq && dx > 0 && dx < col.w - 1) k *= 0.48; else if (y === yq + 1 && dx > 1) k *= 1.18; }
      const r = hash(x, y); if (r < 0.014) k *= 1.15; else if (r > 0.99) k *= 0.86;
      const fria = Math.max(0, prof - 0.35) * 0.5; pintar(x, y, [Math.min(255, Math.round(col.tom[0] * k * (1 - fria * 0.5))), Math.min(255, Math.round(col.tom[1] * k * (1 - fria * 0.2))), Math.min(255, Math.round(col.tom[2] * k * (1 + fria * 0.35)))]);
    }
    // musgo em manchas, nos trechos mais úmidos (perto do pé)
    if (hash(x >> 2, 91) < 0.34) { const my = Math.floor(lip + (0.45 + hash(x >> 2, 92) * 0.4) * alt); for (let d = 0; d < 3 + Math.floor(hash(x, 93) * 4); d++) pintar(x, my + d, MUSGO, d === 0 ? 150 : 210); }
    // raízes que descem da grama
    if (hash(x, 94) < 0.045) { const n = 8 + Math.floor(hash(x, 95) * 18); for (let d = 0; d < n; d++) pintar(x + Math.round(Math.sin(d * 0.6) * 1), Math.floor(lip) + 2 + d, RAIZ); }
    // pé da parede: base escura, pedregulhos e capim
    for (let y = Math.floor(pe); y < pe + 8; y++) {
      const dd = y - pe; const r = hash(x >> 1, y + 40);
      if (dd < 2) pintar(x, y, [50, 46, 42]); else if (r < 0.22 && dd < 6) pintar(x, y, rgb('#a29c8c')); else if (dd < 5) pintar(x, y, rgb(r < 0.6 ? '#4a463f' : '#5c574e')); else if (r < 0.5 && dd < 7) pintar(x, y, GRAMA.escura);
    }
  }
  // pedregulhos soltos ao pé da parede
  for (let k = 0; k < PW / 52; k++) {
    const x = Math.floor((k + hash(k + tr.x0, 61)) * 52); if (x >= PW - 8 || x < 8) continue;
    const y = Math.floor(fundos[x]) + 6; const rx = 5 + Math.floor(hash(k, 62) * 4); const ry = 3 + Math.floor(hash(k, 63) * 3);
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1) continue;
      const luz = dy < -ry * 0.3 ? 1.22 : dy > ry * 0.4 ? 0.62 : 0.95; pintar(x + dx, y + dy, lum(TONS[1], luz * (dx < -rx * 0.4 ? 1.1 : 1)));
    }
  }
  // arbustos na beirada de cima, passando um pouco por cima da borda
  for (let k = 0; k < PW / 44; k++) {
    const x = Math.floor((k + hash(k + tr.x0, 71)) * 44); if (x >= PW - 8 || x < 8) continue;
    const y = Math.floor(tops[x]) - 3; const rx = 5 + Math.floor(hash(k, 72) * 3);
    for (let dy = -5; dy <= 2; dy++) for (let dx = -rx; dx <= rx; dx++) { if ((dx * dx) / (rx * rx) + (dy * dy) / 21 > 1) continue; pintar(x + dx, y + dy, dy < -2 ? GRAMA.clara : dy > 0 ? GRAMA.contorno : GRAMA.media); }
  }
  gc.putImageData(img, 0, 0);
  g.drawImage(cv, xa, Y0);
  // sombra grande projetada no chão, abaixo do pé, em três degraus; e o topo do platô um pouco mais claro
  for (let x = 0; x < PW; x++) {
    if (agua && agua[Math.floor(fundos[x] + Y0 + 8) * PWm + xa + x]) continue;
    const pe = Math.floor(fundos[x] + Y0);
    g.fillStyle = 'rgba(15,12,30,0.40)'; g.fillRect(xa + x, pe + 5, 1, 8);
    g.fillStyle = 'rgba(15,12,30,0.26)'; g.fillRect(xa + x, pe + 13, 1, 9);
    g.fillStyle = 'rgba(15,12,30,0.13)'; g.fillRect(xa + x, pe + 22, 1, 10);
    g.fillStyle = 'rgba(15,12,30,0.05)'; g.fillRect(xa + x, pe + 32, 1, 8);
    const topo = Math.floor(tops[x] + Y0); const ini = 5 * Q;
    if (topo > ini) { g.fillStyle = 'rgba(255,244,190,0.045)'; g.fillRect(xa + x, ini, 1, topo - ini - 8); }
  }
}

// Paredão com a rocha desenhada do pacote LPC Mountains (cinza, com mato), em fatias que acompanham a borda ondulada.
// Dois patamares: a fatia de cima, um degrau de grama no meio e a fatia de baixo. 'rochas' é o recorte do pacote.
function trechoTexturizado(g, t, tr, rochas) {
  const PWm = t.W * Q; const agua = t.aguaPx;
  const xa = tr.x0 * Q; const xb = Math.min(t.W, tr.x1) * Q; const PW = xb - xa;
  const fundoPx = (x) => topoPx(x) + (ESCARPA_ALTURA + alturaExtraEscarpa(x / Q)) * Q;
  const Y0 = (8 - 3) * Q - 24; const PH = 16 * Q;
  const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const FONTES = [28, 60, 92, 214, 238];
  // uma faixa de rocha: fatias de 48 px com 16 de sobreposição, cada uma na altura da borda naquele ponto
  const faixa = (desl, alt, sem, escuro) => {
    for (let k = -1, x = -16; x < PW; k++, x += 34) {
      const meio = xa + Math.max(0, Math.min(PW - 1, x + 24));
      const total = fundoPx(meio) - topoPx(meio); const y = Math.round(topoPx(meio) + total * desl - Y0 + (hash(k, sem) - 0.5) * 8);
      const sx = FONTES[Math.floor(hash(k + tr.x0, sem + 1) * FONTES.length)];
      const h = Math.round(total * alt) + 6;
      // a parte iluminada da rocha repete se a parede for mais alta que o recorte; o pé (com mato) fica sempre embaixo
      // um friso claro no alto e a face escura com mato repetida até o pé (paredes altas ganham mais fiadas de pedra)
      c.drawImage(rochas, sx, 136, 48, 30, x, y, 48, 30);
      for (let feito = 18, n = 0; feito < h - 62; feito += 38, n++) c.drawImage(rochas, FONTES[(k + n * 2 + 7) % FONTES.length], 172, 48, 56, x + ((n % 2) * 12 - 6), y + feito, 48, 56);
      c.drawImage(rochas, sx, 168, 48, 64, x, y + Math.max(14, h - 62), 48, 64);
    }
    if (escuro) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(35,25,60,' + escuro + ')'; c.fillRect(0, 0, PW, PH); c.globalCompositeOperation = 'source-over'; }
  };
  faixa(0.5, 0.5, 31, 0.2);
  // degrau do meio: beirada de grama sobre a faixa de baixo
  const grama = (desl, sem) => {
    for (let x = 0; x < PW; x++) {
      const total = fundoPx(xa + x) - topoPx(xa + x); const y = Math.round(topoPx(xa + x) + total * desl - Y0 + (ruido(x, 11, sem) - 0.5) * 7);
      const cai = 3 + Math.round(hash(x >> 1, sem) * 5);
      c.fillStyle = '#9bd96c'; c.fillRect(x, y - 5, 1, 1); c.fillStyle = hash(x >> 1, sem + 3) < 0.4 ? '#6cbb52' : '#3d8f3a'; c.fillRect(x, y - 4, 1, 6);
      c.fillStyle = '#2c7a31'; c.fillRect(x, y + 2, 1, cai - 2); c.fillStyle = '#1d4a27'; c.fillRect(x, y + cai, 1, 2);
    }
  };
  grama(0.52, 41);
  faixa(-0.02, 0.5, 11, 0);
  grama(0, 51);
  // tira o que cair dentro do rio
  if (agua) { const d = c.getImageData(0, 0, PW, PH); for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (agua[(Y0 + y) * PWm + xa + x]) d.data[(y * PW + x) * 4 + 3] = 0; c.putImageData(d, 0, 0); }
  // sombra no chão e platô mais claro
  for (let x = 0; x < PW; x++) {
    const pe = Math.floor(fundoPx(xa + x)) - 4;
    if (!(agua && agua[(pe + 14) * PWm + xa + x])) { for (const [d, h, a] of [[4, 10, 0.4], [14, 10, 0.25], [24, 10, 0.12]]) { g.fillStyle = 'rgba(15,12,30,' + a + ')'; g.fillRect(xa + x, pe + d, 1, h); } }
    const topo = Math.floor(topoPx(xa + x)); g.fillStyle = 'rgba(255,244,190,0.09)'; g.fillRect(xa + x, 5 * Q, 1, Math.max(0, topo - 5 * Q - 4));
  }
  g.drawImage(cv, xa, Y0);
  // cerca de madeira na beirada do alto
  for (let x = xa + 6; x < xb - 6; x += 22) {
    const y = Math.round(topoPx(x) - 8); const y2 = Math.round(topoPx(x + 22) - 8);
    if (agua && (agua[y * PWm + x] || agua[y2 * PWm + x + 22])) continue;
    if (x + 22 < xb - 6) for (const alt of [11, 6]) { g.strokeStyle = '#4a2c14'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 2, y - alt); g.lineTo(x + 24, y2 - alt); g.stroke(); g.strokeStyle = '#b07c40'; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = '#3a2210'; g.fillRect(x - 1, y - 16, 7, 18); g.fillStyle = '#9a6a32'; g.fillRect(x, y - 15, 5, 16); g.fillStyle = '#d8a860'; g.fillRect(x, y - 15, 5, 2); g.fillRect(x, y - 15, 2, 16);
  }
}

export function desenharEscarpas(g, t, rochas) {
  for (const tr of ESCARPA_TRECHOS) { if (rochas) trechoTexturizado(g, t, tr, rochas); else desenharTrecho(g, t, tr); }
  void ESCARPA_ALTURA;
}

// Muralha: três fileiras de tijolo do castelo (a de baixo é a que bloqueia). A de cima ganha ameias recortadas,
// a de baixo, uma sombra no chão. Sem desenho em volta: o tijolo já tem o contorno.
export function desenharMuralha(g, t, tijolo) {
  const { W, H, muralha } = t;
  const tmp = document.createElement('canvas'); tmp.width = Q; tmp.height = Q; const gt = tmp.getContext('2d'); gt.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!muralha[y * W + x]) continue;
    const x0 = x * Q; const y0 = y * Q;
    g.drawImage(tijolo, 0, 0, Q, Q, x0, y0, Q, Q);
    g.fillStyle = 'rgba(52,44,70,0.20)'; g.fillRect(x0, y0, Q, Q);
    g.fillStyle = 'rgba(20,16,40,0.18)'; g.fillRect(x0, y0 + Q - 8, Q, 8);
    // fileira do meio: só tijolo, com um pouco menos de luz que a de baixo
    g.drawImage(tijolo, 0, 0, Q, Q, x0, y0 - Q, Q, Q);
    g.fillStyle = 'rgba(52,44,70,0.12)'; g.fillRect(x0, y0 - Q, Q, Q);
    // fileira de cima: tijolo com ameias (blocos de 10 px, vãos de 6 px)
    gt.clearRect(0, 0, Q, Q); gt.drawImage(tijolo, 0, 0, Q, Q, 0, 0, Q, Q);
    for (let k = 0; k < 2; k++) gt.clearRect(k * 16 + 10, 0, 6, 11);
    gt.fillStyle = '#d6cdb8'; for (let k = 0; k < 2; k++) gt.fillRect(k * 16, 11, 10, 2);
    gt.fillStyle = '#4a4658'; for (let k = 0; k < 2; k++) { gt.fillRect(k * 16 + 10, 11, 6, 1); }
    gt.fillStyle = 'rgba(20,16,40,0.12)'; gt.fillRect(0, 13, Q, 3);
    g.drawImage(tmp, x0, y0 - 2 * Q);
    // sombra projetada no chão, ao sul
    g.fillStyle = 'rgba(15,12,30,0.24)'; g.fillRect(x0, y0 + Q, Q, 6); g.fillStyle = 'rgba(15,12,30,0.1)'; g.fillRect(x0, y0 + Q + 6, Q, 4);
  }
}

// Escada de pedra entre os dois paredões: degraus com quina iluminada e pedras irregulares, muretas dos lados com
// pilaretes e um braseiro no alto de cada lado.
export function desenharEscada(g, e) {
  const x0 = e.x * Q; const w = e.w * Q; const y0 = e.y * Q; const h = e.h * Q + 10;
  const r = (cor, x, y, lw, lh) => { g.fillStyle = cor; g.fillRect(x, y, lw, lh); };
  r('#2b2538', x0 - 4, y0, w + 8, h);
  // calçamento do pé da escada até a estrada, por baixo do arco do castelo
  for (let y = y0 + h, i = 0; y < y0 + h + 6 * Q - 10; y += 10, i++) for (let x = x0 + 4 - (i % 2) * 9; x < x0 + w - 4; x += 18) { const bx = Math.max(x, x0 + 4); const bw = Math.min(x + 17, x0 + w - 4) - bx; if (bw < 3) continue; r('#5d5560', bx, y, bw, 9); r(hash(i, x) < 0.5 ? '#a89e8b' : '#988e7d', bx + 1, y + 1, bw - 2, 7); r('#c3baa6', bx + 1, y + 1, bw - 2, 2); }
  for (let y = y0, i = 0; y < y0 + h; y += 12, i++) {
    r('#d9d0bc', x0, y, w, 2); r('#b3a994', x0, y + 2, w, 5); r('#7b7263', x0, y + 7, w, 3); r('#4a4350', x0, y + 10, w, 2);
    for (let x = x0 + ((i % 2) ? 9 : 21); x < x0 + w - 3; x += 25 + Math.floor(hash(i, x) * 8)) { r('#8a8171', x, y + 1, 1, 9); r('#c9c0aa', x + 1, y + 2, 1, 5); }
    if (hash(i, 7) < 0.45) r('#4f8c3b', x0 + Math.floor(hash(i, 8) * (w - 12)), y + 8, 8, 3);
  }
  r('rgba(20,16,40,0.28)', x0, y0, 7, h); r('rgba(20,16,40,0.28)', x0 + w - 7, y0, 7, h);
  for (const lado of [x0 - 12, x0 + w]) {
    r('#2b2538', lado, y0 - 2, 12, h + 2); r('#a49a87', lado + 1, y0 - 1, 10, h);
    r('#cfc5b0', lado + 1, y0 - 1, 4, h);
    for (let y = y0 + 8; y < y0 + h; y += 14) r('#6b6272', lado + 1, y, 10, 2);
    for (const py of [y0 - 6, y0 + Math.floor(h / 2), y0 + h - 14]) { r('#2b2538', lado - 2, py - 2, 16, 18); r('#bdb39e', lado - 1, py - 1, 14, 15); r('#e6ddc8', lado - 1, py - 1, 14, 4); r('#7b7263', lado - 1, py + 10, 14, 4); }
    // braseiro no alto
    r('#2b2538', lado + 1, y0 - 22, 10, 16); r('#4b4658', lado + 2, y0 - 12, 8, 6); r('#e8602c', lado + 2, y0 - 20, 8, 9); r('#ffb23e', lado + 4, y0 - 21, 4, 9); r('#fff0a8', lado + 5, y0 - 16, 2, 4);
  }
}
