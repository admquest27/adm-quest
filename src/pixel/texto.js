// Letras em pixel: a Pixelify Sans desenhada pequena e "binarizada" (sem meio-tom), para ficar nítida ampliada.

export const OURO = ['#fff6cf', '#ffe17a', '#f7c548', '#ec9a22', '#c96a12'];
export const PEDRA = ['#f2f0f8', '#cfcade', '#a6a0ba', '#7d7795', '#5d5873'];
const TINTA = '#120f22';

export function mascara(txt, tam) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `700 ${tam}px "Pixelify Sans", monospace`;
  const w = Math.ceil(g.measureText(txt).width) + 4;
  const h = Math.ceil(tam * 1.35);
  c.width = w; c.height = h;
  g.font = `700 ${tam}px "Pixelify Sans", monospace`;
  g.textBaseline = 'top'; g.fillStyle = '#000'; g.fillText(txt, 2, 1);
  const d = g.getImageData(0, 0, w, h).data;
  const m = new Uint8Array(w * h);
  let topo = h; let base = 0;
  for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] > 110) { m[i] = 1; const yy = Math.floor(i / w); topo = Math.min(topo, yy); base = Math.max(base, yy); }
  return { w, h, m, topo, base };
}

export function pintaMascara(ctx, mk, x, y, cor) {
  for (let yy = 0; yy < mk.h; yy++) for (let xx = 0; xx < mk.w; xx++) {
    if (!mk.m[yy * mk.w + xx]) continue;
    ctx.fillStyle = typeof cor === 'function' ? cor(yy, mk) : cor;
    ctx.fillRect(x + xx, y + yy, 1, 1);
  }
}

// Letreiro: sombra em degrau, contorno escuro e preenchimento em faixas (ouro ou pedra).
export function letreiro(ctx, txt, tam, cx, y, { prof = 3, faixas = OURO, lateral = '#7a3f12' } = {}) {
  const mk = mascara(txt, tam);
  const x = Math.round(cx - mk.w / 2);
  for (let d = prof; d >= 1; d--) pintaMascara(ctx, mk, x + Math.ceil(d / 2), y + d, d === prof ? TINTA : lateral);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) pintaMascara(ctx, mk, x + dx, y + dy, TINTA);
  const alt = Math.max(1, mk.base - mk.topo + 1);
  pintaMascara(ctx, mk, x, y, (yy) => faixas[Math.min(faixas.length - 1, Math.floor(((yy - mk.topo) / alt) * faixas.length))]);
  return mk;
}

// As fontes vêm junto com o site; o canvas só desenha com elas depois de carregadas.
export const fontesProntas = () => Promise.all([
  document.fonts.load('700 16px "Pixelify Sans"'),
  document.fonts.load('400 16px "Nunito"'),
]).catch(() => {});
