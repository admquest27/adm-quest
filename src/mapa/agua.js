// Água contínua e suave (rio e lagos da planta V02): uma forma desenhada pixel a pixel, com margem de terra molhada,
// faixa de espuma, três profundidades e brilhos. Não usa autotile, então não faz degraus nas diagonais.
import { Q } from './geografia.js';

const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

// Distância (em pixels, até 'teto') de cada pixel ao pixel mais próximo do tipo oposto. Duas passadas.
function distancia(px, PW, PH, daAgua, teto) {
  const N = PW * PH; const d = new Uint8Array(N).fill(teto);
  const alvo = daAgua ? 0 : 1; // para pixel de água, procura não-água (0); para fora, procura água (1)
  for (let i = 0; i < N; i++) if (px[i] === alvo) d[i] = 0;
  const base = daAgua ? 1 : 0;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x; if (px[i] !== base) continue;
    let v = d[i]; if (x) v = Math.min(v, d[i - 1] + 1); if (y) v = Math.min(v, d[i - PW] + 1); if (x && y) v = Math.min(v, d[i - PW - 1] + 1); if (y && x < PW - 1) v = Math.min(v, d[i - PW + 1] + 1);
    d[i] = Math.min(teto, v);
  }
  for (let y = PH - 1; y >= 0; y--) for (let x = PW - 1; x >= 0; x--) {
    const i = y * PW + x; if (px[i] !== base) continue;
    let v = d[i]; if (x < PW - 1) v = Math.min(v, d[i + 1] + 1); if (y < PH - 1) v = Math.min(v, d[i + PW] + 1); if (x < PW - 1 && y < PH - 1) v = Math.min(v, d[i + PW + 1] + 1); if (y < PH - 1 && x) v = Math.min(v, d[i + PW - 1] + 1);
    d[i] = Math.min(teto, v);
  }
  return d;
}

export function desenharAguas(g, t) {
  const { W, H, aguaPx: px } = t; const PW = W * Q; const PH = H * Q;
  const dIn = distancia(px, PW, PH, true, 40);
  const dOut = distancia(px, PW, PH, false, 6);
  const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const gc = cv.getContext('2d');
  const img = gc.createImageData(PW, PH); const o = img.data;
  const C = {
    contorno: rgb('#143f5a'), sombraTopo: rgb('#1b668f'), espuma: rgb('#a6e3ee'), raso: rgb('#43aed2'), meio: rgb('#2f95c4'), fundo: rgb('#237fb0'),
    brilho: rgb('#86d6ee'), risco: rgb('#1f6f9e'), terraMolhada: rgb('#3b2f22'), margemA: rgb('#4f7a38'), margemB: rgb('#436b31'), pedra: rgb('#9c978a'),
  };
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x; let c = null;
    if (px[i]) {
      const d = dIn[i]; const r = hash(x >> 1, y >> 1); const topo = y >= 4 && px[i - 4 * PW] === 0;
      if (d <= 1) c = C.contorno;
      else if (d <= 3) c = topo ? C.sombraTopo : (r < 0.62 ? C.espuma : C.raso);
      else if (d <= 8) c = topo && d <= 6 ? C.sombraTopo : C.raso;
      else if (d <= 16) c = C.meio;
      else c = C.fundo;
      if (d > 3) {
        if (r < 0.035) c = C.brilho;
        else if (hash((x >> 3) + (y >> 4) * 31, y >> 2) < 0.05 && (x % 8) < 6) c = C.risco; // riscos de correnteza
      }
    } else {
      const d = dOut[i];
      if (d <= 1) c = C.terraMolhada;
      else if (d <= 3) { const r = hash(x, y); c = r < 0.08 ? C.pedra : r < 0.55 ? C.margemA : C.margemB; }
    }
    if (c) { const p = i * 4; o[p] = c[0]; o[p + 1] = c[1]; o[p + 2] = c[2]; o[p + 3] = 255; }
  }
  gc.putImageData(img, 0, 0);
  g.drawImage(cv, 0, 0);
}
