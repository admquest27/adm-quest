// Mapa do mundo (Phaser): o avatar anda pela Vila tocando no cenário ou pelo controle na tela, entra nas
// fases, encontra segredos e convive com a Rosalina, as galinhas e o pombo. Celular deitado.
import Phaser from 'phaser';
import * as planta from './vila.js';
import { montarTerreno, caminho, livreMaisPerto, conferirSequencia, semente2 } from './grade.js';
import { todasAsTexturas } from './texturas.js';
import { tela, el, emCanvas } from '../pixel/formas.js';
import { desenhaPose } from '../pixel/rosalina.js';
import { tocarMusica, pararMusica, alternarSom, somLigado, efeitoMoeda, efeitoToque, efeitoLetra, latido, ganido } from '../pixel/som.js';

const P = 16; // tamanho da peça
const centro = ([x, y]) => [x * P + P / 2, y * P + P / 2];
const peca = (px, py) => [Math.floor(px / P), Math.floor(py / P)];
const DIR_LINHA = { baixo: 0, dir: 2, cima: 4, esq: 6 };
const VEL = 68;

// Estradas de terra desenhadas em pixel, num canvas do tamanho do mapa
function pontosEstradas() {
  const pontos = [];
  for (const linha of planta.ESTRADAS) for (let i = 0; i < linha.length - 1; i++) {
    const [ax, ay] = centro(linha[i]); const [bx, by] = centro(linha[i + 1]);
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
    for (let k = 0; k <= n; k++) pontos.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return pontos;
}
function canvasEstradas(pontos) {
  const r = tela(planta.LARG * P, planta.ALT * P);
  for (const [x, y] of pontos) el(r, x, y, 6.5, 5.5, '#b98f50');
  for (const [x, y] of pontos) el(r, x, y, 5.5, 4.5, '#e8c98a');
  for (const [x, y] of pontos) if ((Math.floor(x * 7 + y * 13)) % 23 === 0) el(r, x + 1, y, 0.8, 0.8, '#cfa968');
  return emCanvas(r);
}

class MapaCena extends Phaser.Scene {
  constructor(opcoes) { super('mapa'); this.o = opcoes; }

  preload() {
    this.load.image('tiles', this.o.urls.tileset);
    this.load.spritesheet('pecas', this.o.urls.tileset, { frameWidth: P, frameHeight: P });
    this.load.spritesheet('heroi', this.o.urls.heroi, { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    const o = this.o;
    for (const [k, r] of todasAsTexturas()) this.textures.addCanvas(k, emCanvas(r));
    const pontos = pontosEstradas();
    this.textures.addCanvas('estradas', canvasEstradas(pontos));
    this.t = montarTerreno(planta);
    const W = this.t.W; const H = this.t.H;
    const em2D = (arr) => Array.from({ length: H }, (_, y) => arr.slice(y * W, y * W + W));
    const mapaChao = this.make.tilemap({ data: em2D(this.t.chao), tileWidth: P, tileHeight: P });
    mapaChao.createLayer(0, mapaChao.addTilesetImage('tiles'), 0, 0).setDepth(0);
    this.add.image(0, 0, 'estradas').setOrigin(0).setDepth(1);
    const mapaCima = this.make.tilemap({ data: em2D(this.t.cima), tileWidth: P, tileHeight: P });
    mapaCima.createLayer(0, mapaCima.addTilesetImage('tiles'), 0, 0).setDepth(2);

    this.interativos = [];
    this.medos = []; // lugares que assustam a Rosalina
    const fundo = (spr) => spr.setDepth(100 + spr.y);
    // flores e matinhos espalhados (longe das estradas e das entradas)
    const perto = (px, py) => pontos.some(([x, y]) => Math.abs(x - px) < 14 && Math.abs(y - py) < 12);
    for (let y = 2; y < H - 3; y++) for (let x = 1; x < W - 1; x++) {
      if (!this.t.passa[y * W + x] || this.t.chao[y * W + x] > 60) continue;
      const s = semente2(x * 3 + 1, y * 7 + 2); if (s > 0.11) continue;
      const [cx, cy] = [x * P + 4 + Math.floor(s * 80) % 8, y * P + 6 + Math.floor(s * 130) % 6];
      if (perto(cx, cy)) continue;
      this.add.image(cx, cy, s < 0.035 ? 'mato' : `flor-${Math.floor(s * 1000) % 3}`).setDepth(3);
    }
    for (const e of planta.ENFEITES) fundo(this.add.image(e.x * P + 8, e.y * P + 16, 'pecas', planta.PECAS[e.peca]).setOrigin(0.5, 1));

    // construções das fases
    this.fases = {};
    for (const f of planta.FASES) {
      const x = f.x * P + (f.w * P) / 2; const y = (f.y + f.h) * P;
      const img = fundo(this.add.image(x, y, f.arte).setOrigin(0.5, 1));
      this.fases[f.id] = { def: f, img, extras: [] };
      this.interativos.push({ tipo: 'fase', id: f.id, area: new Phaser.Geom.Rectangle(img.x - img.width / 2, img.y - img.height, img.width, img.height + 6), alvo: f.entrada });
    }
    this.aplicarEstados(o.estados ?? {}, o.concluidas ?? []);

    // objetos e segredos
    this.objetos = {};
    for (const ob of planta.OBJETOS) {
      const w = (ob.w ?? 1) * P; const h = (ob.h ?? 1) * P;
      const img = fundo(this.add.image(ob.x * P + w / 2, ob.y * P + h, ob.arte).setOrigin(0.5, 1));
      this.objetos[ob.id] = { def: ob, img, toques: 0 };
      const alvo = this.alvoPerto(ob.x, ob.y, ob.w ?? 1, ob.h ?? 1, ob.alcance ?? 1);
      this.interativos.push({ tipo: 'objeto', id: ob.id, area: new Phaser.Geom.Rectangle(img.x - img.width / 2 - 2, img.y - img.height - 2, img.width + 4, img.height + 4), alvo });
      if (['placa404', 'lapide', 'portao'].includes(ob.id)) this.medos.push(centro([ob.x, ob.y]));
    }
    this.time.addEvent({ delay: 2600, loop: true, callback: () => { const im = this.objetos.impressora.img; im.setTexture('impressora-olho'); this.time.delayedCall(260, () => im.setTexture('impressora')); } });
    this.time.addEvent({ delay: 1400, loop: true, callback: () => { const il = this.objetos.ilha.img; il.setTexture(il.texture.key === 'ilha' ? 'ilha-brilho' : 'ilha'); } });

    // avatar
    for (const [nome, linha] of Object.entries(DIR_LINHA)) {
      this.anims.create({ key: `anda-${nome}`, frames: this.anims.generateFrameNumbers('heroi', { frames: [0, 1, 2, 3].map((c) => linha * 24 + c) }), frameRate: 9, repeat: -1 });
    }
    const ini = o.posicao && this.t.passa[o.posicao[1] * W + o.posicao[0]] ? o.posicao : planta.INICIO;
    const [ax, ay] = centro(ini);
    this.av = this.add.sprite(ax, ay, 'heroi', 0).setOrigin(0.5, 0.78);
    this.av.dir = 'baixo'; this.av.rota = []; this.av.acao = null;
    this.cameras.main.setBounds(0, 0, W * P, H * P).startFollow(this.av, true, 0.12, 0.12).setRoundPixels(true);

    this.criarRosalina(); this.criarBichos();

    // toque no cenário
    this.input.on('pointerdown', (p) => {
      if (this.travado()) return;
      const wx = p.worldX; const wy = p.worldY;
      if (this.rosa && Phaser.Geom.Rectangle.Contains(this.rosa.getBounds(), wx, wy)) { this.irAte(peca(this.rosa.x, this.rosa.y), () => this.conversarRosalina(), 1); return; }
      const bicho = [...this.bichos].find((b) => b.tipo === 'pombo' && Phaser.Geom.Rectangle.Contains(b.spr.getBounds(), wx, wy));
      if (bicho) { this.irAte(peca(bicho.spr.x, bicho.spr.y), () => this.achar('pombo'), 1); return; }
      const alvo = this.interativos.find((i) => Phaser.Geom.Rectangle.Contains(i.area, wx, wy));
      if (alvo) { this.irAte(alvo.alvo, () => this.agir(alvo)); return; }
      this.irAte(peca(wx, wy));
    });
    this.teclas = this.input.keyboard?.addKeys({ cima: 'UP', baixo: 'DOWN', esq: 'LEFT', dir: 'RIGHT', w: 'W', s: 'S', a: 'A', d: 'D', A: 'X', B: 'Z', entra: 'ENTER', espaco: 'SPACE' });
    this.input.keyboard?.on('keydown', (ev) => {
      const m = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esq', ArrowRight: 'dir', KeyZ: 'B', KeyX: 'A', Enter: 'A', Space: 'A' }[ev.code];
      if (m) this.botao(m);
    });
    this.historico = [];
    this.esbarroes = 0;
  }

  // Peça livre ao lado de um objeto (onde o avatar para para interagir)
  alvoPerto(x, y, w, h, alcance = 1) {
    const { passa, W, H } = this.t;
    const cand = [];
    for (let yy = y - Math.ceil(alcance); yy < y + h + Math.ceil(alcance); yy++) for (let xx = x - Math.ceil(alcance); xx < x + w + Math.ceil(alcance); xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || !passa[yy * W + xx]) continue;
      const dx = Math.max(x - xx, 0, xx - (x + w - 1)); const dy = Math.max(y - yy, 0, yy - (y + h - 1));
      if (dx + dy <= alcance + 0.5) cand.push([xx, yy, dy * 2 + dx + (yy < y ? 1 : 0)]);
    }
    cand.sort((a, b) => a[2] - b[2]);
    return cand[0] ? [cand[0][0], cand[0][1]] : livreMaisPerto(passa, W, H, [x, y + h], 4);
  }

  travado() { return this.o.dialogoAberto?.() || this.emCena; }

  irAte(alvo, aoChegar = null, folga = 0) {
    const { passa, W, H } = this.t;
    const destino = livreMaisPerto(passa, W, H, alvo, 4);
    if (!destino) return;
    const atual = peca(this.av.x, this.av.y);
    let rota = caminho(passa, W, H, atual, destino);
    if (folga && rota.length > folga) rota = rota.slice(0, rota.length - folga);
    else if (folga) rota = [];
    this.av.rota = rota; this.av.acao = aoChegar;
    if (!rota.length && aoChegar) { this.av.acao = null; aoChegar(); }
    efeitoToque();
  }

  agir(i) {
    if (i.tipo === 'fase') this.o.aoTocarFase?.(i.id, this);
    else this.tocarObjeto(i.id);
  }

  tocarObjeto(id) {
    const ob = this.objetos[id]; const d = ob.def;
    if (id === 'escola') { this.tweens.add({ targets: ob.img, angle: { from: -1, to: 1 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => ob.img.setAngle(0) }); ob.img.setTexture('escola-antena'); this.time.delayedCall(600, () => ob.img.setTexture('escola')); }
    if (d.toques) {
      ob.toques += 1;
      this.tweens.add({ targets: ob.img, scaleY: 0.9, duration: 70, yoyo: true });
      if (ob.toques < d.toques) { efeitoToque(); return; }
    }
    if (d.segredo) this.achar(d.segredo);
    else if (d.conversa) this.o.falar?.({ nome: 'Placa', texto: this.o.textos?.[d.conversa] ?? '' });
  }

  achar(segredo) { this.o.aoAcharSegredo?.(segredo); }

  // ---------- estados das fases ----------
  aplicarEstados(estados, concluidas) {
    const feitas = new Set(concluidas);
    for (const [id, f] of Object.entries(this.fases)) {
      f.extras.forEach((e) => e.destroy()); f.extras = [];
      const img = f.img; img.clearTint().setAlpha(1);
      const estado = estados[id] ?? 'trancada';
      const topo = img.y - img.height; const base = img.y;
      const add = (o) => { f.extras.push(o); return o; };
      if (estado === 'trancada' || estado === 'adiada' || estado === 'cancelada') {
        img.setTint(0x9cc4ff).setAlpha(0.6); // ainda é só uma planta (projeto azul)
        if (estado === 'trancada') add(this.add.image(img.x, base + 2, 'obra').setOrigin(0.5, 1).setDepth(101 + base));
        if (estado === 'adiada') { const op = add(this.add.sprite(img.x, base + 4, 'operarios-0').setOrigin(0.5, 1).setDepth(101 + base)); add(this.time.addEvent({ delay: 400, loop: true, callback: () => op.setTexture(op.texture.key === 'operarios-0' ? 'operarios-1' : 'operarios-0') })); }
        if (estado === 'cancelada') add(this.add.image(img.x, base - img.height / 2, 'embargo').setDepth(101 + base));
        this.medos.push([img.x, base]);
      } else if (feitas.has(id)) {
        const est = add(this.add.image(img.x, topo - 6, 'estrela').setDepth(300 + base));
        add(this.tweens.add({ targets: est, scaleX: { from: 1, to: -1 }, duration: 900, yoyo: true, repeat: -1 }));
      } else {
        const b = add(this.add.sprite(img.x + 6, topo - 2, 'bandeira-0').setOrigin(0, 1).setDepth(300 + base));
        add(this.time.addEvent({ delay: 300, loop: true, callback: () => b.setTexture(b.texture.key === 'bandeira-0' ? 'bandeira-1' : 'bandeira-0') }));
        add(this.tweens.add({ targets: img, y: { from: base, to: base - 1 }, duration: 500, yoyo: true, repeat: -1 }));
      }
    }
  }

  // Castelo derrotado: treme, desmorona numa nuvem de poeira e sobe a bandeira branca
  derrotarCastelo() {
    const f = this.fases.m1chefao; const img = f.img;
    this.emCena = true;
    this.cameras.main.stopFollow(); this.cameras.main.pan(img.x, img.y - 24, 700, 'Sine.easeInOut');
    this.time.delayedCall(800, () => {
      this.cameras.main.shake(2400, 0.006);
      let k = 1;
      this.time.addEvent({ delay: 380, repeat: 5, callback: () => {
        img.setTexture(`castelo-cai-${k}`); k += 1;
        for (let i = 0; i < 6; i++) { const p = this.add.circle(img.x + Phaser.Math.Between(-22, 22), img.y - Phaser.Math.Between(0, 16), Phaser.Math.Between(2, 5), 0xd8d2e6, 0.9).setDepth(400 + img.y); this.tweens.add({ targets: p, y: p.y - 18, alpha: 0, scale: 2, duration: 900, onComplete: () => p.destroy() }); }
      } });
      this.time.delayedCall(2700, () => {
        const b = this.add.sprite(img.x, img.y - 6, 'branca-0').setOrigin(0.5, 1).setDepth(400 + img.y);
        this.tweens.add({ targets: b, y: img.y - 30, duration: 1400, ease: 'Sine.easeOut' });
        this.time.addEvent({ delay: 280, loop: true, callback: () => b.setTexture(b.texture.key === 'branca-0' ? 'branca-1' : 'branca-0') });
        this.time.delayedCall(1800, () => { this.cameras.main.startFollow(this.av, true, 0.12, 0.12); this.emCena = false; this.o.aoCasteloCair?.(); });
      });
    });
  }

  // ---------- Rosalina ----------
  criarRosalina() {
    const [x, y] = centro(planta.PERSONAGENS.rosalina.casa);
    this.rosa = this.add.sprite(x, y, 'rosa-sentada').setOrigin(0.5, 0.85);
    this.rosa.ia = { modo: 'senta', ate: 0, rota: [], frame: 0, cooldown: new Map() };
  }

  iaRosalina(time, dt) {
    const r = this.rosa; const ia = r.ia; const { passa, W, H } = this.t;
    const passo = Math.floor(time / 150) % 2;
    const distAv = Phaser.Math.Distance.Between(r.x, r.y, this.av.x, this.av.y) / P;
    // medo: placas, obras, castelo
    if (ia.modo !== 'medo' && ia.modo !== 'conversa') {
      for (const [mx, my] of this.medos) {
        const k = `${mx},${my}`;
        if (Phaser.Math.Distance.Between(r.x, r.y, mx, my) / P < 1.8 && (ia.cooldown.get(k) ?? 0) < time) {
          ia.cooldown.set(k, time + 20000); ia.modo = 'medo'; ia.ate = time + 1500; ia.rota = []; ia.de = [mx, my]; ganido();
          this.balao(r, '!');
          break;
        }
      }
    }
    if (ia.modo === 'conversa') { r.setTexture('rosa-sentada'); return; }
    if (ia.modo === 'medo') {
      r.setTexture(`rosa-medo-${passo}`).setFlipX(false);
      if (time > ia.ate) {
        const [mx, my] = ia.de; const ang = Math.atan2(r.y - my, r.x - mx);
        const fuga = livreMaisPerto(passa, W, H, peca(r.x + Math.cos(ang) * 4 * P, r.y + Math.sin(ang) * 4 * P), 3);
        ia.rota = fuga ? caminho(passa, W, H, peca(r.x, r.y), fuga) : []; ia.modo = 'corre'; ia.vel = 95;
      }
      return;
    }
    if (ia.rota.length) {
      const [tx, ty] = centro(ia.rota[0]);
      const v = (ia.vel ?? 42) * dt / 1000; const dx = tx - r.x; const dy = ty - r.y; const d = Math.hypot(dx, dy);
      if (d <= v) { r.setPosition(tx, ty); ia.rota.shift(); } else { r.x += (dx / d) * v; r.y += (dy / d) * v; }
      if (Math.abs(dx) > 0.5) r.setFlipX(dx < 0);
      r.setTexture(`${ia.modo === 'corda' ? 'rosa-corda' : 'rosa-anda'}-${passo}`);
      return;
    }
    ia.vel = null;
    if (time < ia.ate) {
      const tex = { cava: `rosa-cava-${passo}`, senta: 'rosa-sentada', dorme: 'rosa-dorme', corda: `rosa-corda-${passo}` }[ia.modo] ?? 'rosa-sentada';
      r.setTexture(tex);
      if (ia.modo === 'cava' && Math.random() < 0.15) { const p = this.add.rectangle(r.x + (r.flipX ? 10 : -10), r.y, 2, 2, 0xa77b4f).setDepth(r.depth + 1); this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-8, 8), y: p.y - 8, alpha: 0, duration: 450, onComplete: () => p.destroy() }); }
      if (ia.modo === 'dorme' && Math.random() < 0.01) this.balao(r, 'z');
      return;
    }
    // escolhe a próxima coisa a fazer
    const sorte = Math.random();
    const perto = distAv < 9;
    const base = perto ? peca(this.av.x, this.av.y) : planta.PERSONAGENS.rosalina.casa;
    const destinoPerto = () => { for (let i = 0; i < 10; i++) { const t = [base[0] + Phaser.Math.Between(-4, 4), base[1] + Phaser.Math.Between(-3, 3)]; if (t[0] > 0 && t[1] > 0 && t[0] < W && t[1] < H && passa[t[1] * W + t[0]]) return t; } return null; };
    if (perto && distAv > 3.5 && sorte < 0.5) { ia.modo = 'segue'; ia.rota = caminho(passa, W, H, peca(r.x, r.y), livreMaisPerto(passa, W, H, peca(this.av.x + 12, this.av.y), 2) ?? peca(r.x, r.y)).slice(0, 14); return; }
    if (sorte < 0.45) { const t = destinoPerto(); ia.modo = 'passeia'; ia.rota = t ? caminho(passa, W, H, peca(r.x, r.y), t).slice(0, 10) : []; return; }
    if (sorte < 0.6) { ia.modo = 'cava'; ia.ate = time + 2600; return; }
    if (sorte < 0.72 && perto) { ia.modo = 'corda'; ia.rota = caminho(passa, W, H, peca(r.x, r.y), livreMaisPerto(passa, W, H, peca(this.av.x + 14, this.av.y), 2) ?? peca(r.x, r.y)).slice(0, 14); ia.ate = time + 4200; this.time.delayedCall(Math.max(500, ia.rota.length * 380), () => this.balao(r, '?')); return; }
    if (sorte < 0.82 && !perto) { ia.modo = 'dorme'; ia.ate = time + 7000; return; }
    if (sorte < 0.9) { ia.modo = 'senta'; ia.ate = time + 2500; latido(1); this.balao(r, 'Au!'); return; }
    ia.modo = 'senta'; ia.ate = time + 2000;
  }

  balao(alvo, texto) {
    const t = this.add.text(alvo.x, alvo.y - 20, texto, { fontFamily: '"Pixelify Sans", monospace', fontSize: '10px', color: '#120f22', backgroundColor: '#ffffff', padding: { x: 2, y: 0 }, resolution: 4 }).setOrigin(0.5, 1).setDepth(900);
    this.tweens.add({ targets: t, y: t.y - 6, alpha: { from: 1, to: 0 }, delay: 700, duration: 600, onComplete: () => t.destroy() });
  }

  conversarRosalina() {
    const r = this.rosa; r.ia.modo = 'conversa'; r.ia.rota = [];
    r.setFlipX(this.av.x < r.x);
    this.o.aoTocarRosalina?.(() => { r.ia.modo = 'senta'; r.ia.ate = this.time.now + 1500; }, (pose) => {
      if (pose === 'petisco') for (let i = 0; i < 4; i++) { const h = this.add.text(r.x + Phaser.Math.Between(-6, 6), r.y - 14, '♥', { fontSize: '9px', color: '#ff5fa2', resolution: 4 }).setOrigin(0.5).setDepth(900); this.tweens.add({ targets: h, y: h.y - 16, alpha: 0, delay: i * 180, duration: 900, onComplete: () => h.destroy() }); }
    });
  }

  // ---------- galinhas e pombo ----------
  criarBichos() {
    this.bichos = [];
    const g = planta.PERSONAGENS.galinhas; const p = planta.PERSONAGENS.pombo;
    const novo = (tipo, area) => {
      const x = (area.x + Math.random() * area.w) * P; const y = (area.y + Math.random() * area.h) * P;
      const spr = this.add.sprite(x, y, `${tipo}-0`).setOrigin(0.5, 0.9);
      const b = { tipo, spr, area, alvo: null, pausa: 0, toque: 0 }; this.bichos.push(b); return b;
    };
    for (let i = 0; i < g.quantas; i++) novo('galinha', g.area);
    novo('pombo', p.area);
  }

  moverBichos(time, dt) {
    for (const b of this.bichos) {
      const s = b.spr;
      if (b.persegue) {
        const ang = Math.atan2(this.av.y - s.y, this.av.x - s.x); const v = 58 * dt / 1000;
        s.x += Math.cos(ang) * v; s.y += Math.sin(ang) * v; s.setFlipX(Math.cos(ang) < 0);
        s.setTexture(`galinha-${Math.floor(time / 90) % 2}`); s.setDepth(100 + s.y);
        continue;
      }
      if (!b.alvo || time > b.pausa + 6000) {
        if (time < b.pausa) { s.setTexture(`${b.tipo}-0`); continue; }
        b.alvo = [(b.area.x + Math.random() * b.area.w) * P, (b.area.y + Math.random() * b.area.h) * P];
      }
      const [tx, ty] = b.alvo; const dx = tx - s.x; const dy = ty - s.y; const d = Math.hypot(dx, dy); const v = (b.tipo === 'pombo' ? 14 : 20) * dt / 1000;
      if (d < 1) { b.alvo = null; b.pausa = time + 600 + Math.random() * 2400; continue; }
      s.x += (dx / d) * v; s.y += (dy / d) * v; s.setFlipX(dx < 0); s.setTexture(`${b.tipo}-${Math.floor(time / 180) % 2}`); s.setDepth(100 + s.y);
      // esbarrar nas galinhas
      if (b.tipo === 'galinha' && this.av.rota.length && Phaser.Math.Distance.Between(s.x, s.y, this.av.x, this.av.y) < 9 && time > b.toque) {
        b.toque = time + 1200; this.esbarroes += 1;
        b.alvo = [s.x + (s.x - this.av.x) * 3, s.y + (s.y - this.av.y) * 3];
        this.tweens.add({ targets: s, y: s.y - 6, duration: 120, yoyo: true });
        if (this.esbarroes === planta.PERSONAGENS.galinhas.esbarroes) this.bando();
      }
    }
  }

  bando() {
    const vistas = this.cameras.main.worldView;
    for (let i = 0; i < 10; i++) {
      const spr = this.add.sprite(vistas.left - 10 - i * 8, this.av.y + Phaser.Math.Between(-30, 30), 'galinha-0').setOrigin(0.5, 0.9);
      const b = { tipo: 'galinha', spr, area: planta.PERSONAGENS.galinhas.area, persegue: true };
      this.bichos.push(b);
      this.time.delayedCall(5000, () => { b.persegue = false; this.tweens.add({ targets: spr, alpha: 0, duration: 600, onComplete: () => { spr.destroy(); this.bichos = this.bichos.filter((x) => x !== b); } }); });
    }
    this.time.delayedCall(5200, () => this.achar('galinhas'));
  }

  // ---------- botões do controle ----------
  botao(nome) {
    this.historico.push(nome); if (this.historico.length > 20) this.historico.shift();
    if (conferirSequencia(this.historico)) { this.historico = []; this.danca(); return; }
    if (this.travado()) return;
    if (nome === 'A') {
      const [ax, ay] = peca(this.av.x, this.av.y);
      if (Phaser.Math.Distance.Between(this.rosa.x, this.rosa.y, this.av.x, this.av.y) < 22) { this.conversarRosalina(); return; }
      const perto = this.interativos.find((i) => Math.abs(i.alvo[0] - ax) + Math.abs(i.alvo[1] - ay) <= 1);
      if (perto) this.agir(perto);
    }
  }

  danca() {
    const c = this.add.sprite(this.av.x + 18, this.av.y, 'consultor-0').setOrigin(0.5, 0.9).setDepth(800);
    const ev = this.time.addEvent({ delay: 160, loop: true, callback: () => { c.setTexture(c.texture.key === 'consultor-0' ? 'consultor-1' : 'consultor-0'); c.setFlipX(!c.flipX); } });
    this.time.delayedCall(2600, () => { ev.remove(); this.achar('konami'); this.tweens.add({ targets: c, alpha: 0, duration: 500, onComplete: () => c.destroy() }); });
  }

  introducao() {
    this.emCena = true;
    const cast = this.fases.m1chefao.img;
    this.cameras.main.stopFollow(); this.cameras.main.centerOn(cast.x, cast.y);
    this.o.aoIntro?.('inicio');
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.PAN_COMPLETE, () => {
      this.cameras.main.startFollow(this.av, true, 0.12, 0.12); this.emCena = false; this.o.aoIntro?.('fim');
    });
    this.time.delayedCall(900, () => this.cameras.main.pan(this.av.x, this.av.y, 3800, 'Sine.easeInOut', true));
  }

  update(time, dt) {
    if (!this.av) return;
    if (this.o.primeiraVez && !this.introFeita) { this.introFeita = true; this.introducao(); }
    const av = this.av;
    // controle segurado (tela ou teclado)
    const k = this.teclas; const seg = this.o.segurando?.() ?? null;
    const dir = seg ?? (k ? (k.cima.isDown || k.w.isDown ? 'cima' : k.baixo.isDown || k.s.isDown ? 'baixo' : k.esq.isDown || k.a.isDown ? 'esq' : k.dir.isDown || k.d.isDown ? 'dir' : null) : null);
    if (dir && !av.rota.length && !this.travado()) {
      const [x, y] = peca(av.x, av.y); const [dx, dy] = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] }[dir];
      const nx = x + dx; const ny = y + dy; av.dir = dir;
      if (nx >= 0 && ny >= 0 && nx < this.t.W && ny < this.t.H && this.t.passa[ny * this.t.W + nx]) { av.rota = [[nx, ny]]; av.acao = null; }
    }
    if (av.rota.length) {
      const [tx, ty] = centro(av.rota[0]); const v = VEL * dt / 1000;
      const dx = tx - av.x; const dy = ty - av.y; const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > Math.abs(dy)) av.dir = dx > 0 ? 'dir' : 'esq'; else if (Math.abs(dy) > 0.1) av.dir = dy > 0 ? 'baixo' : 'cima';
      av.anims.play(`anda-${av.dir}`, true);
      if (d <= v) {
        av.setPosition(tx, ty); av.rota.shift();
        if (!av.rota.length) { this.o.aoMover?.(peca(av.x, av.y)); if (av.acao) { const a = av.acao; av.acao = null; a(); } }
      } else { av.x += (dx / d) * v; av.y += (dy / d) * v; }
    } else { av.anims.stop(); av.setFrame(DIR_LINHA[av.dir] * 24); }
    av.setDepth(100 + av.y);
    this.iaRosalina(time, dt); this.rosa.setDepth(100 + this.rosa.y);
    this.moverBichos(time, dt);
  }
}

// ---------- interface por cima do mapa: barra, controle e caixa de diálogo ----------
export function iniciarMapa(raiz, opcoes) {
  raiz.classList.add('mapa');
  raiz.innerHTML = `<div class="mapa-jogo" id="mapa-jogo"></div>
    <div class="mapa-barra"><span class="mapa-mundo">${opcoes.nomeMundo ?? 'Mundo 1 · Vila dos Planos'}</span>
      <span class="mapa-dir"><span class="mapa-segredos" id="mapa-segredos"></span>
      ${opcoes.botoesBarra ?? ''}
      <button class="mapa-btn" id="mapa-som" aria-label="Som">${somLigado() ? '♪' : '♪̸'}</button>
      <button class="mapa-btn" id="mapa-cheia" aria-label="Tela cheia">⛶</button></span></div>
    <div class="mapa-dpad" aria-label="Direcional">${['cima', 'esq', 'dir', 'baixo'].map((d) => `<button class="mapa-tecla ${d}" data-dir="${d}" aria-label="${d}">${{ cima: '▲', baixo: '▼', esq: '◀', dir: '▶' }[d]}</button>`).join('')}</div>
    <div class="mapa-ab"><button class="mapa-tecla b" data-bt="B">B</button><button class="mapa-tecla a" data-bt="A">A</button></div>
    <div class="mapa-dialogo" id="mapa-dialogo" hidden><canvas class="mapa-retrato" id="mapa-retrato" width="46" height="40" hidden></canvas>
      <div class="mapa-falas"><b id="mapa-nome"></b><span id="mapa-texto"></span><div class="mapa-opcoes" id="mapa-opcoes"></div></div><span class="mapa-seta" id="mapa-seta" hidden>▼</span></div>
    <div class="mapa-faixa" id="mapa-faixa" hidden></div>
    <div class="mapa-girar">Deite o celular para jogar</div>`;

  // ---------- caixa de diálogo com texto letra por letra ----------
  const caixa = raiz.querySelector('#mapa-dialogo'); const txt = raiz.querySelector('#mapa-texto'); const nome = raiz.querySelector('#mapa-nome');
  const seta = raiz.querySelector('#mapa-seta'); const opcs = raiz.querySelector('#mapa-opcoes'); const retrato = raiz.querySelector('#mapa-retrato');
  let fila = []; let atual = null; let digita = null; let retratoAnim = null;
  const pararRetrato = () => { if (retratoAnim) cancelAnimationFrame(retratoAnim); retratoAnim = null; };
  const mostrar = () => {
    atual = fila.shift(); if (!atual) { caixa.hidden = true; pararRetrato(); return; }
    caixa.hidden = false; nome.textContent = atual.nome ?? ''; txt.textContent = ''; opcs.innerHTML = ''; seta.hidden = true;
    pararRetrato(); retrato.hidden = !atual.pose;
    if (atual.pose) { const g = retrato.getContext('2d'); const ini = performance.now(); const pinta = (t) => { g.clearRect(0, 0, 46, 40); desenhaPose(g, atual.pose, t - ini, 1, 2); retratoAnim = requestAnimationFrame(pinta); }; retratoAnim = requestAnimationFrame(pinta); }
    let i = 0; clearInterval(digita);
    digita = setInterval(() => { i += 1; txt.textContent = atual.texto.slice(0, i); if (i % 3 === 0) efeitoLetra(); if (i >= atual.texto.length) terminar(); }, 24);
  };
  const terminar = () => {
    clearInterval(digita); digita = null; txt.textContent = atual.texto;
    if (atual.botoes?.length) opcs.innerHTML = atual.botoes.map((b, k) => `<button class="btn ${k === 0 ? 'verde' : 'claro'}" data-op="${k}">${b.rotulo}</button>`).join('');
    else seta.hidden = false;
  };
  const avancar = () => { if (digita) { terminar(); return; } if (atual?.botoes?.length) return; const fim = atual?.aoFechar; mostrar(); fim?.(); };
  caixa.addEventListener('click', (e) => {
    const b = e.target.closest('[data-op]');
    if (b) { const op = atual.botoes[Number(b.dataset.op)]; efeitoToque(); const fim = atual.aoFechar; fila = []; mostrar(); fim?.(); op.acao?.(); return; }
    avancar();
  });
  const falar = (...msgs) => { fila.push(...msgs.filter(Boolean)); if (!atual || caixa.hidden) mostrar(); };

  // ---------- controle na tela ----------
  let segurando = null;
  let cena = null;
  raiz.querySelectorAll('[data-dir]').forEach((b) => {
    const solta = () => { if (segurando === b.dataset.dir) segurando = null; b.classList.remove('apertada'); };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); segurando = b.dataset.dir; b.classList.add('apertada'); cena?.botao(b.dataset.dir); tocarMusica(); });
    b.addEventListener('pointerup', solta); b.addEventListener('pointerleave', solta); b.addEventListener('pointercancel', solta);
  });
  raiz.querySelectorAll('[data-bt]').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); b.classList.add('apertada'); setTimeout(() => b.classList.remove('apertada'), 120);
    if (!caixa.hidden && b.dataset.bt === 'A') { avancar(); return; }
    cena?.botao(b.dataset.bt);
  }));
  raiz.querySelector('#mapa-som').addEventListener('click', (e) => { const l = alternarSom(); e.currentTarget.textContent = l ? '♪' : '♪̸'; });
  raiz.querySelector('#mapa-cheia').addEventListener('click', async () => {
    try { if (!document.fullscreenElement) { await raiz.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } else await document.exitFullscreen(); } catch { /* aparelho sem tela cheia */ }
  });

  // ---------- segredos ----------
  const achados = new Set(opcoes.segredosAchados ?? []);
  const placar = () => { raiz.querySelector('#mapa-segredos').textContent = `Segredos ${achados.size}/${planta.SEGREDOS.length}`; };
  placar();
  const textos = opcoes.textos ?? {};
  const aoAcharSegredo = (id) => {
    const novo = !achados.has(id);
    const t = textos.segredos?.[id] ?? '';
    if (novo) { achados.add(id); placar(); efeitoMoeda(); opcoes.aoAcharSegredo?.(id, achados.size); }
    falar({ nome: novo ? `Segredo encontrado! (${achados.size} de ${planta.SEGREDOS.length})` : 'Segredo já encontrado', texto: t });
  };

  // ---------- Rosalina e fases ----------
  const falas = textos.rosalina ?? [];
  let fala = Math.floor(Math.random() * Math.max(1, falas.length));
  const aoTocarRosalina = (aoFechar, efeito) => {
    if (!falas.length) { aoFechar(); return; }
    const f = falas[fala % falas.length]; fala += 1;
    if (f.latidos) latido(f.latidos);
    falar({ nome: 'Rosalina', texto: f.texto, pose: f.pose, aoFechar, botoes: [
      { rotulo: 'Dar petisco', acao: () => { latido(2); efeito('petisco'); falar({ nome: 'Rosalina', pose: 'petisco', texto: textos.petisco ?? 'Nhac!', aoFechar }); } },
      { rotulo: 'Tchau, Rosalina', acao: aoFechar },
    ] });
  };
  const aoTocarFase = (id) => {
    const nomeFase = opcoes.fases?.[id]; const titulo = nomeFase ? `${nomeFase.codigo} ${nomeFase.nome}` : id;
    const estado = opcoes.estados?.[id] ?? 'trancada';
    const feita = (opcoes.concluidas ?? []).includes(id);
    if (estado === 'aberta' || estado === 'encerrada' || feita) {
      falar({ nome: titulo, texto: feita ? (textos.faseFeita ?? 'Você já concluiu esta fase.') : (textos.faseAberta ?? 'Fase aberta.'), botoes: [{ rotulo: feita ? 'Rever a fase' : 'Entrar na fase', acao: () => opcoes.aoAbrirFase?.(id) }, { rotulo: 'Agora não' }] });
    } else {
      const placas = textos.placas ?? [];
      const t = estado === 'adiada' ? textos.adiada : estado === 'cancelada' ? textos.cancelada : placas[Math.floor(Math.random() * placas.length)];
      falar({ nome: titulo, texto: t ?? 'Em obras.' });
    }
  };

  const faixa = raiz.querySelector('#mapa-faixa');
  const aoIntro = (fase) => {
    if (fase === 'inicio') { faixa.textContent = opcoes.nomeMundo ?? ''; faixa.hidden = false; }
    else { faixa.hidden = true; falar(...(textos.intro ?? []).map((t) => ({ nome: textos.guia ?? 'Guia', texto: t }))); }
  };

  // a largura do jogo acompanha o formato da tela (sem faixas pretas); a altura fica em 180 pixels de arte
  const largura = () => { const r = raiz.getBoundingClientRect(); const asp = r.width && r.height ? r.width / r.height : 16 / 9; return Math.round(Math.min(480, Math.max(240, 180 * asp))); };
  const config = {
    type: Phaser.AUTO, parent: raiz.querySelector('#mapa-jogo'), width: largura(), height: 180, pixelArt: true, backgroundColor: '#3fa34d',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 }, audio: { noAudio: true }, banner: false,
    scene: new MapaCena({
      ...opcoes, falar, segurando: () => segurando, dialogoAberto: () => !caixa.hidden,
      aoAcharSegredo, aoTocarRosalina, aoTocarFase, aoIntro,
    }),
  };
  const jogo = new Phaser.Game(config);
  jogo.events.once('ready', () => { cena = jogo.scene.getScene('mapa'); });
  raiz.addEventListener('pointerdown', () => tocarMusica(), { once: true });
  const aoRedimensionar = () => { jogo.scale.setGameSize(largura(), 180); };
  window.addEventListener('resize', aoRedimensionar);

  return {
    jogo,
    falar,
    cena: () => cena,
    atualizarEstados(estados, concluidas) { opcoes.estados = estados; opcoes.concluidas = concluidas; cena?.aplicarEstados(estados, concluidas); },
    derrotarCastelo() { cena?.derrotarCastelo(); },
    destruir() { window.removeEventListener('resize', aoRedimensionar); pararMusica(); pararRetrato(); clearInterval(digita); jogo.destroy(true); raiz.innerHTML = ''; raiz.classList.remove('mapa'); },
  };
}
