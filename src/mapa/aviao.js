// Destroços do avião da fase 1-2, em pixel art desenhada para o projeto (240 x 150, base de 7 peças): fuselagem partida
// ao meio e afundada na areia, cauda em pé, asa fincada, motor fumegando, sulco da queda, malas e peças espalhadas.
export const AVIAO_W = 240;
export const AVIAO_H = 150;
export const AVIAO_FUMACA = [[188, 70], [112, 82]]; // de onde sobe a fumaça, em pixels do desenho

const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const K = '#2b2238';

export function desenharAviao() {
  const novo = () => { const c = document.createElement('canvas'); c.width = AVIAO_W; c.height = AVIAO_H; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; return [c, g]; };
  const [cv, g] = novo();
  const r = (cor, x, y, w, h) => { g.fillStyle = cor; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const poli = (pts, cor) => { g.fillStyle = cor; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
  const oval = (x, y, rx, ry, cor, ang = 0) => { g.fillStyle = cor; g.beginPath(); g.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2); g.fill(); };
  // cada peça é desenhada numa camada própria e ganha contorno escuro antes de ir para a tela
  const peca = (fn) => {
    const [c2, g2] = novo(); const antes = g.canvas;
    g2.save(); fn(g2); g2.restore();
    const d = g2.getImageData(0, 0, AVIAO_W, AVIAO_H); const a = d.data;
    for (let i = 3; i < a.length; i += 4) a[i] = a[i] > 120 ? 255 : 0;
    const orig = new Uint8ClampedArray(a); const op = (x, y) => x >= 0 && y >= 0 && x < AVIAO_W && y < AVIAO_H && orig[(y * AVIAO_W + x) * 4 + 3] === 255;
    for (let y = 0; y < AVIAO_H; y++) for (let x = 0; x < AVIAO_W; x++) if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) { const p = (y * AVIAO_W + x) * 4; a[p] = 43; a[p + 1] = 34; a[p + 2] = 56; a[p + 3] = 255; }
    g2.putImageData(d, 0, 0); antes.getContext('2d').drawImage(c2, 0, 0);
  };
  const com = (fn) => peca((g2) => { const guarda = { fill: g.fillRect.bind(g) }; void guarda; fn(ferramentas(g2)); });
  function ferramentas(c) {
    return {
      c,
      r: (cor, x, y, w, h) => { c.fillStyle = cor; c.fillRect(Math.round(x), Math.round(y), w, h); },
      p: (pts, cor) => { c.fillStyle = cor; c.beginPath(); c.moveTo(...pts[0]); for (const q of pts.slice(1)) c.lineTo(...q); c.closePath(); c.fill(); },
      o: (x, y, rx, ry, cor, ang = 0) => { c.fillStyle = cor; c.beginPath(); c.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2); c.fill(); },
    };
  }

  // sulco e marcas na areia
  oval(122, 122, 112, 22, 'rgba(120,80,40,0.22)');
  oval(128, 124, 84, 14, 'rgba(96,62,32,0.28)');
  for (let k = 0; k < 90; k++) { const x = 6 + hash(k, 1) * 224; const y = 106 + hash(k, 2) * 38; r(hash(k, 3) < 0.5 ? 'rgba(90,56,28,0.5)' : 'rgba(255,236,190,0.7)', x, y, 3 + Math.floor(hash(k, 4) * 4), 2); }
  poli([[2, 134], [60, 112], [62, 122], [10, 142]], 'rgba(96,62,32,0.30)');
  oval(188, 106, 22, 10, 'rgba(40,24,20,0.45)');

  // asa de trás, caída
  com(({ p }) => { p([[84, 84], [58, 40], [74, 36], [112, 80]], '#9aa3b8'); p([[58, 40], [74, 36], [78, 43], [63, 48]], '#c8394a'); p([[76, 70], [100, 74], [108, 80], [84, 82]], '#7b849c'); });

  // metade de trás da fuselagem, inclinada, com a cauda em pé
  com(({ c, r: q, p, o }) => {
    p([[26, 56], [50, 22], [62, 20], [60, 70]], '#c8394a'); p([[50, 22], [62, 20], [61, 40], [44, 44]], '#e0606a'); q('#f4f1ea', 44, 36, 14, 5);
    p([[18, 74], [52, 66], [54, 76], [14, 82]], '#aeb6c8');
    c.translate(70, 86); c.rotate(0.13);
    p([[-52, -12], [34, -22], [40, -16], [34, -8], [42, -2], [33, 6], [40, 14], [30, 22], [-44, 12], [-58, 0]], '#dfe3ee');
    p([[-52, -12], [34, -22], [36, -15], [-53, -5]], '#fbfcff'); p([[-56, 4], [36, 10], [30, 22], [-44, 12]], '#a7afc4');
    p([[-54, -2], [36, -8], [35, -2], [-55, 4]], '#c8394a'); p([[-55, 4], [35, -2], [35, 0], [-54, 6]], '#8e2433');
    for (let k = 0; k < 5; k++) { const x = -34 + k * 13; o(x, -10 - k * 1.1, 4.5, 5, '#3a4a6e'); o(x - 1, -12 - k * 1.1, 2, 2, '#9fd4f4'); }
    o(34, 0, 6, 20, '#3a2f3e', -0.1); for (let k = 0; k < 7; k++) { q('#c9a24a', 28 + (k % 3) * 3, -14 + k * 5, 8, 1); }
  });

  // metade da frente, separada, com o nariz enterrado
  com(({ c, r: q, p, o }) => {
    c.translate(166, 96); c.rotate(0.24);
    p([[-34, -18], [18, -17], [40, -9], [50, 3], [44, 14], [20, 17], [-30, 17], [-24, 8], [-36, 2], [-26, -6]], '#dfe3ee');
    p([[-34, -18], [18, -17], [38, -10], [-30, -10]], '#fbfcff'); p([[-30, 8], [48, 6], [44, 14], [20, 17], [-30, 17]], '#a7afc4');
    p([[-31, 0], [49, 0], [48, 5], [-30, 6]], '#c8394a');
    p([[24, -14], [40, -6], [36, -2], [22, -5]], '#2f3f63'); p([[26, -12], [32, -9], [30, -6], [25, -7]], '#9fd4f4'); q('#4a4256', 30, -13, 2, 11);
    for (let k = 0; k < 3; k++) { const x = -18 + k * 13; o(x, -8, 4.5, 5, '#3a4a6e'); o(x - 1, -10, 2, 2, '#9fd4f4'); }
    o(-30, 0, 6, 18, '#3a2f3e', 0.1);
  });
  // areia cobrindo o nariz e a barriga
  com(({ o }) => { o(210, 120, 24, 9, '#e8c887'); o(196, 124, 18, 6, '#f4dca4'); });
  com(({ o }) => { o(52, 104, 30, 7, '#e8c887'); o(70, 108, 22, 5, '#f4dca4'); });

  // asa da frente fincada na areia, motor e hélice torta
  com(({ p, r: q }) => { p([[96, 100], [132, 98], [112, 140], [92, 138]], '#c3cadb'); p([[96, 100], [108, 99], [98, 138], [92, 138]], '#eef1f8'); p([[96, 128], [118, 128], [112, 140], [92, 138]], '#c8394a'); for (let k = 0; k < 4; k++) q('#7b849c', 100 + k * 5, 108 + k * 3, 8, 1); });
  com(({ o }) => { o(111, 142, 22, 5, '#e8c887'); });
  com(({ o, p, r: q }) => { o(188, 84, 13, 11, '#8a92aa', -0.3); o(184, 80, 8, 5, '#c3cadb', -0.3); o(197, 88, 5, 8, '#3a3248', -0.3); q('#c8394a', 178, 90, 18, 3); p([[198, 86], [222, 66], [225, 70], [202, 91]], '#5a5268'); p([[198, 90], [214, 108], [209, 110], [195, 93]], '#5a5268'); o(199, 88, 3, 3, '#efc546'); });

  // malas, roda, caixa-preta, destroços e a faixa de socorro
  const mala = (x, y, w, h, cor, luz) => com(({ r: q }) => { q(cor, x, y, w, h); q(luz, x, y, w, 3); q('#efc546', x + 3, y, 2, h); q('#efc546', x + w - 5, y, 2, h); q('#3a2f3e', x + Math.floor(w / 2) - 3, y - 3, 6, 3); });
  mala(16, 116, 18, 13, '#8a4a30', '#b5683f'); mala(30, 126, 15, 11, '#2f64a8', '#5f93d8'); mala(148, 128, 17, 12, '#7a3a78', '#a85aa6'); mala(206, 132, 14, 10, '#2c7a5a', '#4aa880');
  com(({ o }) => { o(70, 134, 10, 10, '#3a3446'); o(70, 134, 5, 5, '#9aa3b8'); o(70, 134, 2, 2, '#3a3446'); });
  com(({ r: q }) => { q('#f08a30', 172, 134, 15, 10); q('#ffb866', 172, 134, 15, 3); q('#2b2238', 175, 139, 9, 2); });
  com(({ p }) => { p([[132, 56], [146, 50], [150, 60], [138, 66]], '#dfe3ee'); }); com(({ p }) => { p([[4, 98], [20, 92], [22, 102]], '#c8394a'); });
  com(({ p }) => { p([[218, 118], [232, 112], [236, 122], [224, 128]], '#aeb6c8'); });
  com(({ r: q, p }) => { q('#8a5a30', 228, 80, 3, 40); p([[229, 80], [212, 84], [229, 93]], '#f4f1ea'); q('#c8394a', 220, 85, 5, 3); });
  // fuligem
  for (let k = 0; k < 130; k++) { const a = hash(k, 7) * 6.28; const d = Math.sqrt(hash(k, 8)); const x = 118 + Math.cos(a) * d * 26; const y = 88 + Math.sin(a) * d * 18; if (hash(k, 9) < 0.5) r('rgba(40,28,36,0.35)', x, y, 2, 2); }
  for (let k = 0; k < 60; k++) r('rgba(40,28,36,0.4)', 176 + hash(k, 11) * 24, 72 + hash(k, 12) * 22, 2, 2);
  void peca;
  return cv;
}
