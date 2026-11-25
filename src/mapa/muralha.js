// Muralha do Mundo 2 com profundidade: caminho de ronda visto de cima, ameias na frente e no fundo, face de pedra com
// contrafortes salientes e torres redondas com telhado. É uma camada própria, para esconder as árvores que ficam atrás.
// A pedra é o tijolo do castelo (theidiotmachine, CC-BY-SA 3.0); o resto é desenho do projeto.
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };

export function desenharMuralha(m, Q, tijolo, vao) {
  const W = m.w * Q; const topo = 70; const H = topo + 3 * Q + 26;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const r = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const base = topo + 3 * Q; const face = base - 52; // topo da face de pedra
  const ameia = (x, y, alt) => { r('#2b2538', x - 1, y - 1, 16, alt + 2); r('#b9ad97', x, y, 14, alt); r('#ded4bd', x, y, 14, 4); r('#8d8372', x + 10, y + 4, 4, alt - 4); };
  // parapeito do fundo e caminho de ronda
  for (let x = 4; x < W; x += 24) ameia(x, face - 40, 12);
  r('#2b2538', 0, face - 29, W, 2); r('#8f8674', 0, face - 27, W, 27);
  for (let y = face - 24, i = 0; y < face - 2; y += 8, i++) for (let x = (i % 2) * 11; x < W; x += 22) { r('#a69c88', x + 1, y, 20, 7); r('#bcb29d', x + 1, y, 20, 1); }
  r('rgba(20,16,40,0.35)', 0, face - 27, W, 6);
  // face de pedra
  for (let x = 0; x < W; x += Q) for (let y = face; y < base; y += Q) g.drawImage(tijolo, 0, 0, Q, Math.min(Q, base - y), x, y, Q, Math.min(Q, base - y));
  const grad = g.createLinearGradient(0, face, 0, base); grad.addColorStop(0, 'rgba(255,240,210,0.10)'); grad.addColorStop(0.55, 'rgba(30,22,55,0.18)'); grad.addColorStop(1, 'rgba(30,22,55,0.5)'); g.fillStyle = grad; g.fillRect(0, face, W, base - face);
  r('#2b2538', 0, face, W, 2); r('#d9cfb8', 0, face + 2, W, 3); r('rgba(20,16,40,0.45)', 0, face + 5, W, 5);
  for (let x = 12; x < W; x += 24) ameia(x, face - 12, 15);
  // musgo e hera
  for (let k = 0; k < W / 38; k++) { const x = Math.floor(hash(k, 1) * W); const n = 6 + Math.floor(hash(k, 2) * 26); for (let i = 0; i < n; i++) r(hash(k, i) < 0.5 ? '#3f7d34' : '#5b9c44', x + Math.floor(hash(i, k) * 12) - 6, base - Math.floor(hash(k + i, 5) * n) - 3, 4, 3); }
  // contrafortes salientes
  for (let x = 76; x < W - 30; x += 168) {
    r('#2b2538', x - 2, face - 4, 26, base - face + 12); r('#a89d88', x, face - 2, 22, base - face + 8); r('#cfc5ae', x, face - 2, 8, base - face + 8); r('#7d7364', x + 16, face - 2, 6, base - face + 8);
    for (let y = face + 10; y < base + 4; y += 12) r('#6a6270', x, y, 22, 2);
    r('#e1d8c2', x - 3, face - 6, 28, 6);
  }
  r('rgba(15,12,30,0.35)', 0, base, W, 8); r('rgba(15,12,30,0.18)', 0, base + 8, W, 10);
  // torres redondas com telhado cônico (fora do vão do portão)
  const torre = (cx) => {
    const w = 56; const y0 = face - 30;
    g.save(); g.beginPath(); g.rect(cx - w / 2, y0, w, base - y0 + 2); g.ellipse(cx, base + 2, w / 2, 8, 0, 0, Math.PI); g.clip();
    for (let x = cx - w / 2; x < cx + w / 2; x += Q) for (let y = y0; y < base + 12; y += Q) g.drawImage(tijolo, x, y);
    const lg = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); lg.addColorStop(0, 'rgba(255,240,210,0.28)'); lg.addColorStop(0.35, 'rgba(255,240,210,0)'); lg.addColorStop(1, 'rgba(20,14,45,0.65)'); g.fillStyle = lg; g.fillRect(cx - w / 2, y0, w, base - y0 + 14); g.restore();
    r('#2b2538', cx - w / 2 - 1, y0, 2, base - y0); r('#2b2538', cx + w / 2 - 1, y0, 2, base - y0);
    r('#2b2538', cx - 4, face + 8, 8, 18); r('#f2c860', cx - 2, face + 10, 4, 14);
    for (let y = 2; y < y0 + 8; y++) { const meia = Math.round(((y - 2) / (y0 + 6)) * (w / 2 + 6)); r('#2b2538', cx - meia - 1, y, meia * 2 + 2, 1); r((y % 6 === 0) ? '#2e3a63' : '#5a6da0', cx - meia, y, meia, 1); r((y % 6 === 0) ? '#222a4a' : '#3c4a78', cx, y, meia, 1); }
    r('#2b2538', cx - w / 2 - 6, y0 + 7, w + 12, 4); r('#a67a1e', cx - 1, 0, 3, 6); r('#e9bd3f', cx - 3, 0, 7, 3);
  };
  for (const cx of [60, 400, W - 400, W - 60]) if (cx + 40 < vao.x0 || cx - 40 > vao.x1) torre(cx);
  return { canvas: cv, deslocY: topo };
}
