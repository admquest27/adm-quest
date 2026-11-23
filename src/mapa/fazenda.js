// Fazenda e terrenos vazios da Vila: curral com cerca, bichos soltos (vaca, porco, ovelha e lhama), moinho de vento
// animado e os lotes com a placa de "Vende-se". Funções que recebem a cena do mapa (cena.js) e desenham nela.
import * as planta from './vila.js';
import { mugido } from '../pixel/som.js';

const P = 16; const E = 0.5; // peça da planta e escala da arte LPC (32 px por peça, desenhada na metade)

const BICHOS = {
  vaca: { arq: 'vaca.png', vel: 9, y: 0.78 }, porco: { arq: 'porco.png', vel: 8, y: 0.74 },
  ovelha: { arq: 'ovelha.png', vel: 8, y: 0.74 }, lhama: { arq: 'lhama.png', vel: 8, y: 0.8 },
};
const LINHA = { cima: 0, esq: 1, baixo: 2, dir: 3 }; // linhas das folhas de caminhada dos bichos

export function carregarFazenda(cena, lpc) {
  for (const [tipo, b] of Object.entries(BICHOS)) cena.load.spritesheet(`${tipo}L`, lpc + 'bichos/' + b.arq, { frameWidth: 128, frameHeight: 128 });
  cena.load.spritesheet('moinhoL', lpc + 'bichos/moinho.png', { frameWidth: 224, frameHeight: 320 });
}

export function criarFazenda(cena) {
  const c = planta.CURRAL; const { passa, W } = cena.t;
  // animações dos bichos e do moinho
  for (const tipo of Object.keys(BICHOS)) for (const [dir, lin] of Object.entries(LINHA)) {
    const k = `${tipo}-${dir}`;
    if (!cena.anims.exists(k)) cena.anims.create({ key: k, frames: cena.anims.generateFrameNumbers(`${tipo}L`, { start: lin * 4, end: lin * 4 + 3 }), frameRate: 5, repeat: -1 });
  }
  if (!cena.anims.exists('moinhoL')) cena.anims.create({ key: 'moinhoL', frames: cena.anims.generateFrameNumbers('moinhoL', { start: 0, end: 11 }), frameRate: 7, repeat: -1 });

  // cerca em volta do curral, com um portão aberto em cima
  const ab = c.abertura; const x0 = c.x - 1; const x1 = c.x + c.w; const y0 = c.y - 1; const y1 = c.y + c.h;
  const poste = (px, py) => cena.add.image(px, py, 'lpc', 'poste').setOrigin(0.5, 1).setScale(E).setDepth(100 + py);
  const horizontal = (tx, ty) => { // um trecho de cerca por peça (um poste e os trilhos até o próximo)
    const py = (ty + 1) * P - 1; cena.add.image(tx * P, py, 'lpc', 'cerca-un').setOrigin(0, 1).setScale(E).setDepth(100 + py);
    passa[ty * W + tx] = 0;
  };
  for (let tx = x0; tx <= x1; tx++) { if (tx !== ab.x && tx !== ab.x + 1) horizontal(tx, y0); horizontal(tx, y1); }
  poste(x1 * P + P, (y0 + 1) * P - 1); poste(x1 * P + P, (y1 + 1) * P - 1);
  for (let ty = y0 + 1; ty < y1; ty++) {
    for (const tx of [x0, x1]) { const py = (ty + 1) * P; cena.add.image(tx * P + P / 2, py, 'lpc', 'cerca-v').setOrigin(0.5, 1).setScale(E).setDepth(100 + py); passa[ty * W + tx] = 0; }
  }
  poste(ab.x * P + 2, (y0 + 1) * P); poste((ab.x + 2) * P - 2, (y0 + 1) * P);
  // cocho com feno e cocho com água dentro do curral
  const cocho = (nome, tx, ty) => cena.add.image(tx * P, (ty + 1) * P - 2, 'lpc', nome).setOrigin(0.5, 1).setScale(E).setDepth(100 + (ty + 1) * P);
  cocho('cocho-feno', c.x + 1.2, c.y + c.h - 1); cocho('cocho-agua', c.x + c.w - 1.2, c.y + c.h - 1);

  // bichos soltos no curral
  cena.animais = [];
  const area = { x: c.x, y: c.y, w: c.w, h: c.h - 1 };
  for (const { tipo, quantos } of planta.ANIMAIS) for (let i = 0; i < quantos; i++) {
    const x = (area.x + 0.5 + Math.random() * (area.w - 1)) * P; const y = (area.y + 0.5 + Math.random() * (area.h - 1)) * P;
    const spr = cena.add.sprite(x, y, `${tipo}L`, LINHA.baixo * 4).setOrigin(0.5, BICHOS[tipo].y).setScale(E);
    cena.animais.push({ tipo, spr, area, alvo: null, pausa: Math.random() * 3000, dir: 'baixo', vel: BICHOS[tipo].vel * (0.8 + Math.random() * 0.4) });
  }

  // moinho de vento animado (o objeto 'moinho' da planta marca onde ele fica)
  const m = planta.OBJETOS.find((o) => o.id === 'moinho');
  const px = (m.x + (m.w ?? 1) / 2) * P; const py = (m.y + (m.h ?? 1)) * P;
  cena.moinho = cena.add.sprite(px, py, 'moinhoL', 0).setOrigin(0.5, 0.97).setScale(E).setDepth(100 + py);
  cena.moinho.play('moinhoL');
}

// Passeio dos bichos: andam devagar até um ponto do curral, ficam parados um pouco e escolhem outro
export function moverFazenda(cena, time, dt) {
  for (const a of cena.animais ?? []) {
    const s = a.spr;
    if (!a.alvo) {
      if (time < a.pausa) { s.anims.stop(); s.setFrame(LINHA[a.dir] * 4); continue; }
      a.alvo = [(a.area.x + 0.5 + Math.random() * (a.area.w - 1)) * P, (a.area.y + 0.5 + Math.random() * (a.area.h - 1)) * P];
    }
    const dx = a.alvo[0] - s.x; const dy = a.alvo[1] - s.y; const d = Math.hypot(dx, dy); const v = a.vel * dt / 1000;
    if (d < 1.5) { a.alvo = null; a.pausa = time + 1500 + Math.random() * 5000; continue; }
    s.x += (dx / d) * v; s.y += (dy / d) * v;
    a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dir' : 'esq') : (dy > 0 ? 'baixo' : 'cima');
    s.play(`${a.tipo}-${a.dir}`, true); s.setDepth(100 + s.y);
  }
  cena.moinho?.setDepth(cena.moinho.depth);
}

// A vaca puxa conversa: muge, faz um coração e, na primeira vez, revela o segredo dela
export function conversarVaca(cena, animal) {
  mugido(); cena.emote(animal.spr, 'coracao');
  cena.tweens.add({ targets: animal.spr, y: animal.spr.y - 3, duration: 120, yoyo: true });
  if (!cena.o.segredoAchado?.('vaca')) cena.achar('vaca');
}

// ---------- terrenos vazios ----------
// Um lote vazio mostra terra batida, quatro estacas e a placa de "Vende-se". Quando o professor cria uma fase no
// lote, a placa sai e entra a construção (cena.js usa lote.entrada como ponto da fase).
export function criarLotes(cena, ocupados = new Set()) {
  cena.lotes = {};
  for (const l of planta.LOTES) {
    if (ocupados.has(l.id)) continue;
    const base = (l.y + l.h) * P; const cx = (l.x + l.w / 2) * P; const objs = [];
    const add = (o) => { objs.push(o); return o; };
    // terra revirada
    const terra = add(cena.add.rectangle(l.x * P + 1, l.y * P + 1, l.w * P - 2, l.h * P - 2, 0xa27546, 0.55).setOrigin(0).setDepth(2.6));
    terra.setStrokeStyle(1, 0x6f4a2a, 0.8);
    for (const [dx, dy] of [[0, 0], [l.w, 0], [0, l.h], [l.w, l.h]]) add(cena.add.image(l.x * P + dx * P, l.y * P + dy * P, 'lpc', 'poste').setOrigin(0.5, 1).setScale(E).setDepth(100 + l.y * P + dy * P));
    const placa = add(cena.add.image(cx, base - 4, 'lpc', 'placa-lote').setOrigin(0.5, 1).setScale(E).setDepth(100 + base));
    add(cena.add.text(cx, base - 24, 'VENDE-SE', { fontFamily: 'Pixelify Sans, Nunito, sans-serif', fontStyle: '700', fontSize: '5px', color: '#7a2e24', resolution: 6 }).setOrigin(0.5, 0.5).setDepth(100 + base + 1));
    cena.lotes[l.id] = { def: l, objs, placa };
  }
}
export function limparLote(cena, id) { const l = cena.lotes?.[id]; if (!l) return; l.objs.forEach((o) => o.destroy()); delete cena.lotes[id]; }
