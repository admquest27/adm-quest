// Mapa do mundo (Phaser): a Vila em 16 bits com o pacote Ninja Adventure. O avatar anda tocando no cenário,
// pelo controle na tela ou pelo teclado; os pontos de fase ficam no caminho, como nos mapas de mundo clássicos.
import Phaser from 'phaser';
import * as planta from './vila.js';
import { montarTerreno, caminho, livreMaisPerto, conferirSequencia, semente2 } from './grade.js';
import { todasAsTexturas } from './texturas.js';
import { FOLHAS, ANIMADOS, PESSOAS, ROSTOS, RECORTES, DIRECOES, LINHAS } from './arte.js';
import { tela, el, emCanvas } from '../pixel/formas.js';
import { desenhaPose } from '../pixel/rosalina.js';
import {
  tocarMusica, pararMusica, alternarSom, efeitoToque, efeitoLetra, efeitoSegredo, efeitoPoof, latido, ganido, croac, cocorico,
  volumes, definirVolume,
} from '../pixel/som.js';

const P = 16;
const centro = ([x, y]) => [x * P + P / 2, y * P + P / 2];
const peca = (px, py) => [Math.floor(px / P), Math.floor(py / P)];
const VEL = 64;
const EMOTES = { susto: 1, feliz: 6, pontos: 20, ex: 21, exVermelho: 22, pergunta: 23, coracao: 27, sono: 28, estrela: 29, bravo: 9 };

// ---------- configurações do jogador (guardadas no aparelho) ----------
const CHAVE_CFG = 'admq-config';
export function config() { try { return { texto: 'normal', controles: 'auto', menosMovimento: false, ...JSON.parse(localStorage.getItem(CHAVE_CFG) || '{}') }; } catch { return { texto: 'normal', controles: 'auto', menosMovimento: false }; } }
const salvarConfig = (c) => { try { localStorage.setItem(CHAVE_CFG, JSON.stringify(c)); } catch { /* segue */ } };
const lerNum = (k, padrao = 0) => { try { return Number(localStorage.getItem(k) ?? padrao) || padrao; } catch { return padrao; } };
const guardarNum = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* segue */ } };

// ---------- estradas: pontos ao longo das polilinhas ----------
function pontosDe(linha) {
  const pts = [];
  for (let i = 0; i < linha.length - 1; i++) {
    const [ax, ay] = centro(linha[i]); const [bx, by] = centro(linha[i + 1]);
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
    for (let k = 0; k <= n; k++) pts.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return pts;
}
function canvasEstrada(pontos) {
  const r = tela(planta.LARG * P, planta.ALT * P);
  for (const [x, y] of pontos) el(r, x, y, 6, 5, '#7b4a32');
  for (const [x, y] of pontos) el(r, x, y, 5, 4, '#c98d5a');
  for (const [x, y] of pontos) if ((Math.floor(x * 7 + y * 13)) % 19 === 0) el(r, x + 1, y, 0.9, 0.7, '#a96d43');
  return emCanvas(r);
}

class MapaCena extends Phaser.Scene {
  constructor(opcoes) { super('mapa'); this.o = opcoes; }

  preload() {
    const b = this.o.urls.base;
    for (const [k, arq] of Object.entries(FOLHAS)) this.load.spritesheet(k, b + arq, { frameWidth: P, frameHeight: P });
    for (const [k, a] of Object.entries(ANIMADOS)) this.load.spritesheet(k, b + a.arq, { frameWidth: a.w, frameHeight: a.h });
    for (const [k, arq] of Object.entries(PESSOAS)) this.load.spritesheet(k, b + arq, { frameWidth: P, frameHeight: P });
    for (const n of Object.values(EMOTES)) this.load.image(`emote${n}`, `${b}emote/emote${n}.png`);
  }

  create() {
    const o = this.o;
    this.cfg = config();
    for (const [k, r] of todasAsTexturas()) this.textures.addCanvas(k, emCanvas(r));
    for (const [nome, r] of Object.entries(RECORTES)) this.textures.get(r.folha).add(nome, 0, r.x * P, r.y * P, r.w * P, r.h * P);
    this.t = montarTerreno(planta);
    const { W, H } = this.t;
    const em2D = (arr) => Array.from({ length: H }, (_, y) => arr.slice(y * W, y * W + W));
    const mChao = this.make.tilemap({ data: em2D(this.t.chao), tileWidth: P, tileHeight: P });
    mChao.createLayer(0, mChao.addTilesetImage('chao'), 0, 0).setDepth(0);
    const mAgua = this.make.tilemap({ data: em2D(this.t.molhado), tileWidth: P, tileHeight: P });
    mAgua.createLayer(0, mAgua.addTilesetImage('agua'), 0, 0).setDepth(1);

    this.anima();
    this.criarEstradas();
    this.interativos = [];
    const base = (img) => img.setDepth(100 + img.y + img.displayHeight * (1 - img.originY));

    // mata: árvores em quincôncio, com leve sorteio
    for (const a of planta.FLORESTA) for (let y = a.y - 1; y < a.y + a.h; y += 1.4) for (let x = a.x - 0.5; x < a.x + a.w; x += 1.6) {
      const s = semente2(Math.round(x * 3), Math.round(y * 5));
      const px = (x + (Math.round(y / 1.4) % 2 ? 0.8 : 0) + s * 0.4) * P; const py = (y + 2) * P;
      const [tx, ty] = peca(px, py - 4); if (this.t.agua[ty * W + tx]) continue;
      base(this.add.image(px, py, 'natureza', s < 0.62 ? 'pinheiro' : s < 0.86 ? 'arvoreRedonda' : 'arvoreClara').setOrigin(0.5, 1));
    }
    // flores animadas e matinhos
    for (let y = 2; y < H - 3; y++) for (let x = 1; x < W - 1; x++) {
      if (!this.t.passa[y * W + x] || this.t.chao[y * W + x] < 66) continue;
      const s = semente2(x * 3 + 1, y * 7 + 2); if (s > 0.07) continue;
      const [cx, cy] = centro([x, y]);
      if (this.pertoDeEstrada(cx, cy)) continue;
      if (s < 0.03) this.add.sprite(cx, cy, 'flor', 0).setDepth(3).play({ key: 'flor', startFrame: Math.floor(s * 100) % 4 });
      else this.add.image(cx, cy, 'natureza', s < 0.05 ? 'mato' : 'arbusto2').setDepth(3).setScale(0.8);
    }
    for (const e of planta.ENFEITES) base(this.add.image(e.x * P, e.y * P, RECORTES[e.peca].folha, e.peca).setOrigin(0, 0));

    // água viva: ondinhas e peixes
    this.aguas = [];
    for (let i = 0; i < W * H; i++) if (this.t.agua[i] && !(Math.floor(i / W) === planta.PONTE.y && i % W >= planta.PONTE.x0 && i % W <= planta.PONTE.x1)) this.aguas.push([i % W, Math.floor(i / W)]);
    // brilhos na água que piscam
    this.time.addEvent({ delay: 260, loop: true, callback: () => {
      if (this.cfg.menosMovimento) return;
      const [x, y] = this.aguas[Math.floor(Math.random() * this.aguas.length)]; const [cx, cy] = centro([x, y]);
      const b = this.add.rectangle(cx + Phaser.Math.Between(-5, 5), cy + Phaser.Math.Between(-5, 5), 4, 1, 0xffffff, 0).setDepth(2);
      this.tweens.add({ targets: b, fillAlpha: 0.85, duration: 500, yoyo: true, onComplete: () => b.destroy() });
    } });
    this.time.addEvent({ delay: 3800, loop: true, callback: () => this.peixePula() });

    this.criarFases();
    this.criarObjetos();
    this.criarAvatar();
    this.criarRosalina();
    this.criarGente();
    this.criarBichos();
    this.criarClima();

    // toque e clique no cenário
    this.input.on('pointerdown', (p) => {
      if (this.visaoGeral) { this.tocarVisao(p.worldX, p.worldY); return; }
      if (this.travado()) return;
      tocarMusica();
      const wx = p.worldX; const wy = p.worldY;
      const dentroDe = (spr) => spr && spr.visible && Phaser.Geom.Rectangle.Contains(spr.getBounds(), wx, wy);
      if (dentroDe(this.rosa)) { this.irAte(peca(this.rosa.x, this.rosa.y), () => this.conversarRosalina(), 1); return; }
      const npc = this.gente.find((g) => dentroDe(g.spr));
      if (npc) { this.irAte(peca(npc.spr.x, npc.spr.y), () => this.conversarCom(npc), 1); return; }
      const bicho = this.bichos.find((b) => b.tipo === 'pombo' && dentroDe(b.spr));
      if (bicho) { this.irAte(peca(bicho.spr.x, bicho.spr.y), () => this.achar('pombo'), 1); return; }
      const alvo = this.interativos.find((i) => Phaser.Geom.Rectangle.Contains(i.area, wx, wy));
      if (alvo) { this.irAte(alvo.alvo, () => this.agir(alvo)); return; }
      this.irAte(peca(wx, wy));
    });
    this.teclas = this.input.keyboard?.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');
    this.input.keyboard?.on('keydown', (ev) => {
      const m = { ArrowUp: 'cima', KeyW: 'cima', ArrowDown: 'baixo', KeyS: 'baixo', ArrowLeft: 'esq', KeyA: 'esq', ArrowRight: 'dir', KeyD: 'dir', KeyB: 'B', KeyZ: 'B', KeyE: 'A', Enter: 'A', Space: 'A', KeyX: 'A' }[ev.code];
      if (ev.code === 'Escape') { o.alternarConfig?.(); return; }
      if (ev.code === 'KeyM') { this.alternarVisao(); return; }
      if (m) { if (m === 'A' && o.dialogoAberto?.()) { o.avancarDialogo?.(); return; } this.botao(m); }
    });
    this.historico = []; this.esbarroes = 0;
  }

  // ---------- animações do pacote ----------
  anima() {
    const a = (key, folha, frames, rate, repeat = -1) => { if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(folha, { frames }), frameRate: rate, repeat }); };
    a('flor', 'flor', [0, 1, 2, 3], 4); a('ondas', 'ondas', [0, 1, 2, 3], 5); a('moinho', 'moinho', [0, 1, 2, 3], 8);
    a('bandeiraVermelha', 'bandeiraVermelha', [0, 1, 2, 3], 7); a('bandeiraBranca', 'bandeiraBranca', [0, 1, 2, 3], 7); a('bandeiraAmarela', 'bandeiraAmarela', [0, 1, 2, 3], 7);
    a('galinhaBranca', 'galinhaBranca', [0, 1], 6); a('galinhaMarrom', 'galinhaMarrom', [0, 1], 6); a('gato', 'gato', [0, 1], 2); a('sapo', 'sapo', [0, 1], 3); a('peixe', 'peixe', [0, 1], 6);
    for (const quem of Object.keys(PESSOAS)) for (const [dir, col] of Object.entries(DIRECOES)) a(`${quem}-${dir}`, quem, Array.from({ length: LINHAS[quem] ?? 4 }, (_, l) => l * 4 + col), LINHAS[quem] ? 4 : 8);
  }

  pertoDeEstrada(px, py) { return this.todosPontos?.some(([x, y]) => Math.abs(x - px) < 14 && Math.abs(y - py) < 12); }

  // Estradas: as que levam a fases abertas aparecem inteiras; as outras, só tracejadas de leve.
  criarEstradas() {
    this.todosPontos = [];
    this.estradas = planta.ESTRADAS.map((e, i) => {
      const pts = pontosDe(e.pontos); this.todosPontos.push(...pts);
      const chave = `estrada-${i}`; this.textures.addCanvas(chave, canvasEstrada(pts));
      const img = this.add.image(0, 0, chave).setOrigin(0).setDepth(2.5);
      const tracos = this.add.group();
      pts.forEach(([x, y], k) => { if (k % 5 === 0) tracos.add(this.add.circle(x, y, 1.3, 0x7b4a32, 0.55).setDepth(2.4)); });
      return { ...e, pts, img, tracos };
    });
  }

  estradaAberta(e) {
    if (!e.para) return true;
    if (e.para === 'mundo2') return false;
    const est = this.o.estados?.[e.para];
    return est === 'aberta' || est === 'encerrada' || (this.o.concluidas ?? []).includes(e.para);
  }

  // Revela o caminho até uma fase, pontinho por pontinho (quando a fase acaba de abrir para o aluno).
  revelarCaminho(faseId) {
    const e = this.estradas.find((x) => x.para === faseId); if (!e) return;
    e.img.setAlpha(0); e.tracos.setVisible(false);
    this.emCena = true; this.cameras.main.stopFollow();
    const [fx, fy] = centro(planta.FASES.find((f) => f.id === faseId).entrada);
    this.cameras.main.pan(e.pts[0][0], e.pts[0][1], 600);
    const passos = e.pts.filter((_, k) => k % 4 === 0);
    passos.forEach(([x, y], k) => this.time.delayedCall(700 + k * 45, () => {
      const d = this.add.circle(x, y, 2.5, 0xffe9a3).setDepth(2.6); this.tweens.add({ targets: d, scale: { from: 1.8, to: 1 }, duration: 200 });
      if (k % 3 === 0) efeitoLetra();
      if (k === passos.length - 1) {
        this.cameras.main.pan(fx, fy, 500);
        this.tweens.add({ targets: e.img, alpha: 1, duration: 600, delay: 300, onComplete: () => { this.cameras.main.startFollow(this.av, true, 0.12, 0.12); this.emCena = false; } });
        efeitoSegredo();
      }
    }));
  }

  // ---------- construções e pontos de fase ----------
  criarFases() {
    this.fases = {};
    for (const f of planta.FASES) {
      const cx = f.x * P + (f.w * P) / 2; const by = (f.y + f.h) * P;
      const img = f.arte === 'castelo' ? this.add.image(cx, by, 'castelo').setOrigin(0.5, 1) : this.add.image(f.x * P, f.y * P, RECORTES[f.arte].folha, f.arte).setOrigin(0, 0);
      img.setDepth(100 + by);
      const [nx, ny] = centro(f.entrada);
      const no = this.add.image(nx, ny + 2, 'no-trancado').setDepth(3);
      this.fases[f.id] = { def: f, img, no, extras: [] };
      this.interativos.push({ tipo: 'fase', id: f.id, area: new Phaser.Geom.Rectangle(f.x * P, f.y * P, f.w * P, f.h * P + 12), alvo: f.entrada });
    }
    // detalhes de cada fase
    const fx = (id) => this.fases[id];
    const arv = fx('m1f6'); this.add.image(arv.img.x + 24, arv.img.y + 4, 'organograma').setOrigin(0.5, 0).setDepth(arv.img.depth + 1).setScale(0.75);
    const torre = fx('m1f7'); this.add.image(torre.img.x + 44, torre.img.y + 30, 'lupa').setDepth(torre.img.depth + 1);
    const portal = fx('m1f4'); this.add.sprite(portal.img.x + 24, portal.img.y - 2, 'bandeiraAmarela').setOrigin(0.5, 1).setDepth(portal.img.depth + 1).play('bandeiraAmarela');
    const camp = fx('m1f5'); const fog = this.add.sprite(camp.img.x - 10, camp.img.y + 26, 'fogueira-0').setDepth(100 + camp.img.y + 30);
    this.time.addEvent({ delay: 180, loop: true, callback: () => fog.setTexture(fog.texture.key === 'fogueira-0' ? 'fogueira-1' : 'fogueira-0') });
    this.add.image(camp.img.x - 22, camp.img.y + 30, 'acampamento', 'toras').setDepth(100 + camp.img.y + 30);
    const cast = fx('m1chefao');
    for (const dx of [-17, 17]) this.add.sprite(cast.img.x + dx, cast.img.y - 39, 'bandeiraVermelha').setOrigin(0.5, 1).setDepth(cast.img.depth + 1).play({ key: 'bandeiraVermelha', delay: dx > 0 ? 200 : 0 });
    this.aplicarEstados(this.o.estados ?? {}, this.o.concluidas ?? []);
  }

  aplicarEstados(estados, concluidas) {
    this.o.estados = estados; this.o.concluidas = concluidas;
    const feitas = new Set(concluidas);
    for (const [id, f] of Object.entries(this.fases)) {
      f.extras.forEach((e) => e.destroy()); f.extras = [];
      const img = f.img; img.clearTint().setAlpha(1);
      this.tweens.killTweensOf(f.no); f.no.setScale(1);
      const estado = estados[id] ?? 'trancada';
      const add = (x) => { f.extras.push(x); return x; };
      const cx = f.def.x * P + (f.def.w * P) / 2; const by = (f.def.y + f.def.h) * P;
      if (['trancada', 'adiada', 'cancelada'].includes(estado)) {
        img.setTint(0xa9c8ff).setAlpha(0.55); // ainda é só a planta do projeto
        f.no.setTexture('no-trancado');
        if (estado === 'trancada') add(this.add.image(cx, by + 2, 'obra').setOrigin(0.5, 1).setDepth(img.depth + 1));
        if (estado === 'adiada') { const op = add(this.add.sprite(cx, by + 4, 'operarios-0').setOrigin(0.5, 1).setDepth(img.depth + 1)); add(this.time.addEvent({ delay: 400, loop: true, callback: () => op.setTexture(op.texture.key === 'operarios-0' ? 'operarios-1' : 'operarios-0') })); }
        if (estado === 'cancelada') add(this.add.image(cx, by - (f.def.h * P) / 2, 'embargo').setDepth(img.depth + 1));
      } else if (feitas.has(id)) {
        f.no.setTexture('no-feito');
        const est = add(this.add.image(f.no.x, f.no.y - 9, 'estrela').setDepth(400).setScale(0.8));
        add(this.tweens.add({ targets: est, scaleX: { from: 0.8, to: -0.8 }, duration: 900, yoyo: true, repeat: -1 }));
      } else {
        f.no.setTexture(id === 'm1chefao' ? 'no-segredo' : 'no-aberto');
        add(this.tweens.add({ targets: f.no, scale: { from: 1, to: 1.25 }, duration: 520, yoyo: true, repeat: -1 }));
      }
    }
    this.estradas?.forEach((e) => { const ab = this.estradaAberta(e); e.img.setVisible(ab).setAlpha(1); e.tracos.setVisible(!ab); });
  }

  // Castelo derrotado: treme, desmorona na poeira, o Barão foge e sobe a bandeira branca
  derrotarCastelo() {
    const f = this.fases.m1chefao; const img = f.img;
    this.emCena = true;
    this.cameras.main.stopFollow(); this.cameras.main.pan(img.x, img.y - 24, 700, 'Sine.easeInOut');
    const barao = this.gente.find((g) => g.quem === 'barao');
    this.time.delayedCall(800, () => {
      if (barao) { this.emote(barao.spr, 'susto'); barao.fugindo = true; }
      this.cameras.main.shake(2400, 0.006);
      let k = 1;
      this.time.addEvent({ delay: 380, repeat: 5, callback: () => {
        img.setTexture(`castelo-cai-${k}`); k += 1;
        for (let i = 0; i < 6; i++) { const p = this.add.circle(img.x + Phaser.Math.Between(-22, 22), img.y - Phaser.Math.Between(0, 16), Phaser.Math.Between(2, 5), 0xd8d2e6, 0.9).setDepth(900); this.tweens.add({ targets: p, y: p.y - 18, alpha: 0, scale: 2, duration: 900, onComplete: () => p.destroy() }); }
      } });
      this.time.delayedCall(2700, () => {
        const b = this.add.sprite(img.x, img.y - 6, 'bandeiraBranca').setOrigin(0.5, 1).setDepth(901).play('bandeiraBranca');
        this.tweens.add({ targets: b, y: img.y - 30, duration: 1400, ease: 'Sine.easeOut' });
        this.time.delayedCall(1800, () => { this.cameras.main.startFollow(this.av, true, 0.12, 0.12); this.emCena = false; this.o.aoCasteloCair?.(); });
      });
    });
  }

  // ---------- objetos e segredos ----------
  criarObjetos() {
    this.objetos = {};
    for (const ob of planta.OBJETOS) {
      const w = (ob.w ?? 1) * P; const h = (ob.h ?? 1) * P;
      const img = this.add.image(ob.x * P + w / 2, ob.y * P + h, ob.arte).setOrigin(0.5, 1);
      img.setDepth(100 + img.y);
      this.objetos[ob.id] = { def: ob, img, toques: 0 };
      this.interativos.push({ tipo: 'objeto', id: ob.id, area: new Phaser.Geom.Rectangle(img.x - img.width / 2 - 2, img.y - img.height - 2, img.width + 4, img.height + 4), alvo: this.alvoPerto(ob.x, ob.y, ob.w ?? 1, ob.h ?? 1, ob.alcance ?? 1) });
    }
    const m = this.objetos.moinho.img; this.add.sprite(m.x, m.y - 26, 'moinho').setScale(0.5).setDepth(m.depth + 1).play('moinho');
    this.time.addEvent({ delay: 2600, loop: true, callback: () => { const im = this.objetos.impressora.img; im.setTexture('impressora-olho'); this.time.delayedCall(260, () => im.setTexture('impressora')); } });
    this.time.addEvent({ delay: 1400, loop: true, callback: () => { const il = this.objetos.ilha.img; il.setTexture(il.texture.key === 'ilha' ? 'ilha-brilho' : 'ilha'); } });
  }

  alvoPerto(x, y, w, h, alcance = 1) {
    const { passa, W, H } = this.t; const cand = [];
    for (let yy = y - Math.ceil(alcance); yy < y + h + Math.ceil(alcance); yy++) for (let xx = x - Math.ceil(alcance); xx < x + w + Math.ceil(alcance); xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || !passa[yy * W + xx]) continue;
      const dx = Math.max(x - xx, 0, xx - (x + w - 1)); const dy = Math.max(y - yy, 0, yy - (y + h - 1));
      if (dx + dy <= alcance + 0.5) cand.push([xx, yy, dy * 2 + dx + (yy < y ? 1 : 0)]);
    }
    cand.sort((a, b) => a[2] - b[2]);
    return cand[0] ? [cand[0][0], cand[0][1]] : livreMaisPerto(passa, W, H, [x, y + h], 4);
  }

  travado() { return this.o.dialogoAberto?.() || this.emCena || this.visaoGeral; }

  irAte(alvo, aoChegar = null, folga = 0) {
    const { passa, W, H } = this.t;
    const destino = livreMaisPerto(passa, W, H, alvo, 4); if (!destino) return;
    let rota = caminho(passa, W, H, peca(this.av.x, this.av.y), destino);
    if (folga) rota = rota.length > folga ? rota.slice(0, rota.length - folga) : [];
    this.av.rota = rota; this.av.acao = aoChegar;
    if (!rota.length && aoChegar) { this.av.acao = null; aoChegar(); }
    efeitoToque();
  }

  agir(i) {
    if (i.tipo === 'fase') this.o.aoTocarFase?.(i.id);
    else this.tocarObjeto(i.id);
  }

  tocarObjeto(id) {
    const ob = this.objetos[id]; const d = ob.def;
    if (id === 'escola') { ob.img.setTexture('escola-antena'); this.tweens.add({ targets: ob.img, angle: { from: -1.5, to: 1.5 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => { ob.img.setAngle(0); ob.img.setTexture('escola'); } }); }
    if (d.toques) { ob.toques += 1; this.tweens.add({ targets: ob.img, scaleY: 0.85, duration: 70, yoyo: true }); if (ob.toques < d.toques) { efeitoToque(); return; } }
    if (d.segredo) this.achar(d.segredo);
    else if (d.conversa) this.o.falar?.({ nome: '', texto: this.o.textos?.[d.conversa] ?? '' });
  }

  achar(segredo) { this.o.aoAcharSegredo?.(segredo); }

  emote(alvo, qual, ms = 1400) {
    const e = this.add.image(alvo.x, alvo.y - 14, `emote${EMOTES[qual]}`).setOrigin(0.5, 1).setDepth(950);
    this.tweens.add({ targets: e, y: e.y - 3, duration: 200, yoyo: true });
    this.time.delayedCall(ms, () => e.destroy());
  }

  // ---------- avatar ----------
  criarAvatar() {
    const { W } = this.t; const pos = this.o.posicao;
    const ini = pos && this.t.passa[pos[1] * W + pos[0]] ? pos : planta.INICIO;
    const [ax, ay] = centro(ini);
    this.av = this.add.sprite(ax, ay, 'heroi', 0).setOrigin(0.5, 0.8);
    this.av.dir = 'baixo'; this.av.rota = []; this.av.acao = null;
    this.sombra = this.add.ellipse(ax, ay + 5, 10, 4, 0x000000, 0.25).setDepth(4);
    this.cameras.main.setBounds(0, 0, this.t.W * P, this.t.H * P).startFollow(this.av, true, 0.12, 0.12).setRoundPixels(true);
  }

  // ---------- Rosalina ----------
  criarRosalina() {
    const [x, y] = centro(planta.PERSONAGENS.rosalina.casa);
    this.rosa = this.add.sprite(x, y, 'rosa-sentada').setOrigin(0.5, 0.85).setScale(0.8);
    this.rosa.ia = { modo: 'senta', ate: 0, rota: [] };
  }

  // Medos da Rosalina: galinhas, o pombo e o Barão
  oQueAssusta() {
    const r = this.rosa;
    const perto = (spr, d) => spr && Phaser.Math.Distance.Between(r.x, r.y, spr.x, spr.y) / P < d;
    const bicho = this.bichos.find((b) => (b.tipo === 'galinha' || b.tipo === 'pombo') && perto(b.spr, 1.6));
    if (bicho) return bicho.spr;
    const barao = this.gente.find((g) => g.quem === 'barao');
    return barao && perto(barao.spr, 2.5) ? barao.spr : null;
  }

  iaRosalina(time, dt) {
    const r = this.rosa; const ia = r.ia; const { passa, W, H } = this.t;
    const passo = Math.floor(time / 150) % 2;
    const distAv = Phaser.Math.Distance.Between(r.x, r.y, this.av.x, this.av.y) / P;
    if (!['medo', 'conversa', 'corre', 'truque'].includes(ia.modo) && time > (ia.calma ?? 0)) {
      const susto = this.oQueAssusta();
      if (susto) { ia.modo = 'medo'; ia.ate = time + 1200; ia.rota = []; ia.de = [susto.x, susto.y]; ia.calma = time + 9000; ganido(); this.emote(r, 'susto'); }
    }
    if (ia.modo === 'conversa' || ia.modo === 'truque') return;
    if (ia.modo === 'medo') {
      r.setTexture(`rosa-medo-${passo}`).setFlipX(false);
      if (time > ia.ate) {
        // corre para trás do avatar
        const [mx, my] = ia.de; const ang = Math.atan2(this.av.y - my, this.av.x - mx);
        const fuga = livreMaisPerto(passa, W, H, peca(this.av.x + Math.cos(ang) * 1.5 * P, this.av.y + Math.sin(ang) * 1.5 * P), 3);
        ia.rota = fuga ? caminho(passa, W, H, peca(r.x, r.y), fuga) : []; ia.modo = 'corre'; ia.vel = 100;
      }
      return;
    }
    if (ia.rota.length) {
      const [tx, ty] = centro(ia.rota[0]);
      const v = (ia.vel ?? 42) * dt / 1000; const dx = tx - r.x; const dy = ty - r.y; const d = Math.hypot(dx, dy);
      if (d <= v) { r.setPosition(tx, ty); ia.rota.shift(); } else { r.x += (dx / d) * v; r.y += (dy / d) * v; }
      if (Math.abs(dx) > 0.5) r.setFlipX(dx < 0);
      r.setTexture(`${ia.modo === 'corda' ? 'rosa-corda' : 'rosa-anda'}-${passo}`);
      if (!ia.rota.length && ia.modo === 'corre') { ia.modo = 'senta'; ia.ate = time + 1800; this.emote(r, 'pontos'); }
      return;
    }
    ia.vel = null;
    if (time < ia.ate) {
      r.setTexture({ cava: `rosa-cava-${passo}`, senta: 'rosa-sentada', dorme: 'rosa-dorme', corda: `rosa-corda-${passo}` }[ia.modo] ?? 'rosa-sentada');
      if (ia.modo === 'cava' && Math.random() < 0.15) { const p = this.add.rectangle(r.x + (r.flipX ? 9 : -9), r.y, 2, 2, 0x8e5638).setDepth(r.depth + 1); this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-8, 8), y: p.y - 8, alpha: 0, duration: 450, onComplete: () => p.destroy() }); }
      if (ia.modo === 'dorme' && Math.random() < 0.006) this.emote(r, 'sono');
      return;
    }
    const sorte = Math.random(); const perto = distAv < 9;
    const base = perto ? peca(this.av.x, this.av.y) : planta.PERSONAGENS.rosalina.casa;
    const destino = () => { for (let i = 0; i < 10; i++) { const t = [base[0] + Phaser.Math.Between(-4, 4), base[1] + Phaser.Math.Between(-3, 3)]; if (t[0] > 0 && t[1] > 0 && t[0] < W && t[1] < H && passa[t[1] * W + t[0]]) return t; } return null; };
    const juntoDoAvatar = () => caminho(passa, W, H, peca(r.x, r.y), livreMaisPerto(passa, W, H, peca(this.av.x + 12, this.av.y), 2) ?? peca(r.x, r.y)).slice(0, 14);
    if (perto && distAv > 3.5 && sorte < 0.5) { ia.modo = 'segue'; ia.rota = juntoDoAvatar(); return; }
    if (sorte < 0.45) { const t = destino(); ia.modo = 'passeia'; ia.rota = t ? caminho(passa, W, H, peca(r.x, r.y), t).slice(0, 10) : []; return; }
    if (sorte < 0.6) { ia.modo = 'cava'; ia.ate = time + 2600; return; }
    if (sorte < 0.72 && perto) { ia.modo = 'corda'; ia.rota = juntoDoAvatar(); ia.ate = time + 4200; this.time.delayedCall(Math.max(500, ia.rota.length * 380), () => this.emote(r, 'pergunta')); return; }
    if (sorte < 0.82 && !perto) { ia.modo = 'dorme'; ia.ate = time + 7000; return; }
    if (sorte < 0.9) { ia.modo = 'senta'; ia.ate = time + 2500; latido(1); this.emote(r, 'feliz'); return; }
    ia.modo = 'senta'; ia.ate = time + 2000;
  }

  conversarRosalina() {
    const r = this.rosa; r.ia.modo = 'conversa'; r.ia.rota = []; r.setTexture('rosa-sentada'); r.setFlipX(this.av.x < r.x);
    this.o.aoTocarRosalina?.((acao) => this.acaoRosalina(acao));
  }

  // Petisco, truques aprendidos e despedida
  acaoRosalina(acao) {
    const r = this.rosa;
    if (acao === 'fim') { r.ia.modo = 'senta'; r.ia.ate = this.time.now + 1500; return; }
    if (acao === 'petisco') {
      this.emote(r, 'coracao', 1800);
      for (let i = 0; i < 4; i++) { const h = this.add.image(r.x + Phaser.Math.Between(-6, 6), r.y - 12, 'emote27').setScale(0.5).setDepth(950); this.tweens.add({ targets: h, y: h.y - 18, alpha: 0, delay: i * 160, duration: 900, onComplete: () => h.destroy() }); }
      this.tweens.add({ targets: r, y: r.y - 6, duration: 140, yoyo: true, repeat: 2 });
      return;
    }
    r.ia.modo = 'truque';
    const fim = () => { r.setAngle(0); r.ia.modo = 'senta'; r.ia.ate = this.time.now + 1200; };
    if (acao === 'pata') { r.setTexture('rosa-sentada'); this.tweens.add({ targets: r, angle: { from: 0, to: -12 }, duration: 160, yoyo: true, repeat: 2, onComplete: fim }); this.emote(r, 'feliz'); }
    else if (acao === 'rolar') { this.tweens.add({ targets: r, angle: 360, duration: 700, onComplete: fim }); }
    else if (acao === 'dancar') { this.tweens.add({ targets: r, y: r.y - 5, scaleX: { from: 0.8, to: -0.8 }, duration: 160, yoyo: true, repeat: 5, onComplete: () => { r.setScale(0.8); fim(); } }); latido(2); }
    else fim();
  }

  // ---------- pessoas da Vila ----------
  criarGente() {
    this.gente = [];
    const pessoa = (quem, [x, y], area, fala) => {
      const [cx, cy] = centro([x, y]);
      const spr = this.add.sprite(cx, cy, quem, 0).setOrigin(0.5, 0.8);
      const g = { quem, spr, area, fala, alvo: null, pausa: 0, dir: 'baixo' };
      this.gente.push(g); return g;
    };
    const c = planta.PERSONAGENS.consultor; pessoa('consultor', c.pos, c.area, 'consultor');
    const b = planta.PERSONAGENS.barao; pessoa('barao', b.pos, b.area, 'barao');
    for (const a of planta.PERSONAGENS.aldeoes) pessoa(a.quem, [a.area.x + 1, a.area.y + 1], a.area, a.quem);
  }

  moverGente(time, dt) {
    for (const g of this.gente) {
      const s = g.spr;
      if (g.fugindo) { s.x += 70 * dt / 1000; s.play(`${g.quem}-dir`, true); s.setDepth(100 + s.y); if (s.x > this.t.W * P + 20) { s.setVisible(false); g.fugindo = false; g.foi = true; } continue; }
      if (g.foi || g.parado) { s.anims.stop(); s.setFrame(DIRECOES[g.dir]); continue; }
      if (!g.alvo) {
        if (time < g.pausa) { s.anims.stop(); s.setFrame(DIRECOES[g.dir]); continue; }
        g.alvo = [(g.area.x + Math.random() * g.area.w) * P, (g.area.y + Math.random() * g.area.h) * P];
      }
      const [tx, ty] = g.alvo; const dx = tx - s.x; const dy = ty - s.y; const d = Math.hypot(dx, dy); const v = 22 * dt / 1000;
      if (d < 1) { g.alvo = null; g.pausa = time + 1200 + Math.random() * 3000; if (g.quem === 'barao' && Math.random() < 0.5) this.emote(s, Math.random() < 0.5 ? 'bravo' : 'exVermelho'); continue; }
      const [px, py] = peca(s.x + (dx / d) * 6, s.y + (dy / d) * 6);
      if (!this.t.passa[py * this.t.W + px]) { g.alvo = null; continue; }
      s.x += (dx / d) * v; s.y += (dy / d) * v;
      g.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dir' : 'esq') : (dy > 0 ? 'baixo' : 'cima');
      s.play(`${g.quem}-${g.dir}`, true); s.setDepth(100 + s.y);
    }
  }

  conversarCom(g) {
    g.parado = true;
    const dx = this.av.x - g.spr.x; const dy = this.av.y - g.spr.y;
    g.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dir' : 'esq') : (dy > 0 ? 'baixo' : 'cima');
    g.spr.anims.stop(); g.spr.setFrame(DIRECOES[g.dir]);
    if (g.quem === 'barao') this.emote(g.spr, 'bravo');
    this.o.aoConversar?.(g.fala, () => { g.parado = false; g.pausa = this.time.now + 1500; });
  }

  // ---------- bichos: galinhas, pombo, peixes e sapo ----------
  criarBichos() {
    this.bichos = [];
    const gal = planta.PERSONAGENS.galinhas; const pom = planta.PERSONAGENS.pombo;
    const nova = (tipo, area, chave) => {
      const x = (area.x + Math.random() * area.w) * P; const y = (area.y + Math.random() * area.h) * P;
      const spr = this.add.sprite(x, y, chave ?? `${tipo}-0`, 0).setOrigin(0.5, 0.85);
      const b = { tipo, chave, spr, area, alvo: null, pausa: Math.random() * 2000, toque: 0 }; this.bichos.push(b); return b;
    };
    for (let i = 0; i < gal.quantas; i++) nova('galinha', gal.area, i % 2 ? 'galinhaMarrom' : 'galinhaBranca');
    nova('pombo', pom.area);
    const [sx, sy] = centro([4, 21]); this.sapo = this.add.sprite(sx, sy, 'sapo', 0).setDepth(100 + sy).play('sapo');
    this.time.addEvent({ delay: 7000, loop: true, callback: () => { if (Phaser.Math.Distance.Between(this.sapo.x, this.sapo.y, this.av.x, this.av.y) < 120) croac(); this.tweens.add({ targets: this.sapo, y: this.sapo.y - 5, duration: 160, yoyo: true }); } });
  }

  moverBichos(time, dt) {
    for (const b of this.bichos) {
      const s = b.spr;
      if (b.persegue) {
        const ang = Math.atan2(this.av.y - s.y, this.av.x - s.x); const v = 62 * dt / 1000;
        s.x += Math.cos(ang) * v; s.y += Math.sin(ang) * v; s.setFlipX(Math.cos(ang) > 0); s.play(b.chave, true); s.setDepth(100 + s.y);
        continue;
      }
      if (!b.alvo) {
        if (time < b.pausa) {
          // parada: a galinha cisca de vez em quando
          if (b.tipo === 'galinha') { s.anims.stop(); if (!b.cisca && Math.random() < 0.01) { b.cisca = true; this.tweens.add({ targets: s, angle: s.flipX ? 25 : -25, duration: 90, yoyo: true, repeat: 2, onComplete: () => { b.cisca = false; s.setAngle(0); } }); } }
          else s.setTexture('pombo-0');
          continue;
        }
        // espalha os bichos: escolhe um ponto longe dos outros
        let melhor = null; let dist = -1;
        for (let k = 0; k < 4; k++) { const c = [(b.area.x + Math.random() * b.area.w) * P, (b.area.y + Math.random() * b.area.h) * P]; const dmin = Math.min(...this.bichos.filter((o) => o !== b).map((o) => Phaser.Math.Distance.Between(c[0], c[1], o.spr.x, o.spr.y))); if (dmin > dist) { dist = dmin; melhor = c; } }
        b.alvo = melhor;
      }
      const [tx, ty] = b.alvo; const dx = tx - s.x; const dy = ty - s.y; const d = Math.hypot(dx, dy); const v = (b.fuga ? 70 : b.tipo === 'pombo' ? 14 : 18) * dt / 1000;
      if (d < 1) { b.alvo = null; b.fuga = false; b.pausa = time + 500 + Math.random() * 2600; continue; }
      s.x += (dx / d) * v; s.y += (dy / d) * v; s.setDepth(100 + s.y);
      if (b.tipo === 'galinha') { s.setFlipX(dx > 0); s.play(b.chave, true); } else { s.setFlipX(dx < 0); s.setTexture(`pombo-${Math.floor(time / 180) % 2}`); }
      // esbarrar nas galinhas: ela pula, bate as asas, solta penas e foge
      if (b.tipo === 'galinha' && this.av.rota.length && Phaser.Math.Distance.Between(s.x, s.y, this.av.x, this.av.y) < 10 && time > b.toque) {
        b.toque = time + 1200; this.esbarroes += 1; cocorico();
        b.alvo = [s.x + (s.x - this.av.x) * 4, s.y + (s.y - this.av.y) * 4]; b.fuga = true;
        this.tweens.add({ targets: s, y: s.y - 7, scaleY: 1.15, duration: 120, yoyo: true });
        for (let i = 0; i < 3; i++) { const pena = this.add.rectangle(s.x, s.y - 6, 2, 1, 0xffffff).setDepth(950); this.tweens.add({ targets: pena, x: pena.x + Phaser.Math.Between(-10, 10), y: pena.y + Phaser.Math.Between(-10, 4), angle: 180, alpha: 0, duration: 700, onComplete: () => pena.destroy() }); }
        if (this.esbarroes === planta.PERSONAGENS.galinhas.esbarroes) this.bando();
      }
    }
  }

  bando() {
    const vista = this.cameras.main.worldView; cocorico();
    for (let i = 0; i < 10; i++) {
      const chave = i % 2 ? 'galinhaMarrom' : 'galinhaBranca';
      const spr = this.add.sprite(vista.left - 10 - i * 9, this.av.y + Phaser.Math.Between(-30, 30), chave).setOrigin(0.5, 0.85);
      const b = { tipo: 'galinha', chave, spr, area: planta.PERSONAGENS.galinhas.area, persegue: true };
      this.bichos.push(b);
      this.time.delayedCall(5000, () => { b.persegue = false; this.tweens.add({ targets: spr, alpha: 0, duration: 600, onComplete: () => { spr.destroy(); this.bichos = this.bichos.filter((x) => x !== b); } }); });
    }
    this.time.delayedCall(5200, () => this.achar('galinhas'));
  }

  peixePula() {
    if (!this.aguas.length || this.cfg.menosMovimento) return;
    const vista = this.cameras.main.worldView;
    const visiveis = this.aguas.filter(([x, y]) => vista.contains(x * P + 8, y * P + 8)); if (!visiveis.length) return;
    const [x, y] = centro(visiveis[Math.floor(Math.random() * visiveis.length)]);
    const f = this.add.sprite(x, y, 'peixe', 0).setDepth(5).play('peixe').setFlipX(Math.random() < 0.5);
    this.tweens.add({ targets: f, y: y - 14, angle: f.flipX ? 40 : -40, duration: 320, yoyo: true, ease: 'Sine.easeOut', onComplete: () => { f.destroy(); const o = this.add.ellipse(x, y + 2, 4, 2, 0xffffff, 0.8).setDepth(2); this.tweens.add({ targets: o, scaleX: 3, scaleY: 2, alpha: 0, duration: 600, onComplete: () => o.destroy() }); } });
  }

  // fumaça nas chaminés, sombras de nuvens e borboletas
  criarClima() {
    const f1 = planta.FASES[0];
    const chamines = [[f1.x * P + 38, f1.y * P + 4], ...planta.ENFEITES.filter((e) => e.peca.startsWith('casa')).map((e) => [e.x * P + e.w * P * 0.78, e.y * P + 4])];
    this.time.addEvent({ delay: 900, loop: true, callback: () => {
      if (this.cfg.menosMovimento) return;
      for (const [x, y] of chamines) { const p = this.add.circle(x, y, 2.5, 0xeeeeee, 0.7).setDepth(990); this.tweens.add({ targets: p, x: x + 6, y: y - 18, scale: 2, alpha: 0, duration: 2200, onComplete: () => p.destroy() }); }
    } });
    this.nuvens = [0, 1, 2].map((i) => this.add.ellipse(i * 300, 60 + i * 130, 140, 60, 0x10203a, 0.05).setDepth(980));
    this.borboletas = [0, 1, 2, 3].map((i) => { const [x, y] = centro([8 + i * 9, 12 + (i % 3) * 3]); return this.add.rectangle(x, y, 3, 2, i % 2 ? 0xffd23f : 0xff7eb6).setDepth(960); });
  }

  // ---------- controle ----------
  botao(nome) {
    this.historico.push(nome); if (this.historico.length > 20) this.historico.shift();
    if (conferirSequencia(this.historico)) { this.historico = []; this.danca(); return; }
    if (this.travado()) return;
    tocarMusica();
    if (nome === 'A') {
      const [ax, ay] = peca(this.av.x, this.av.y);
      if (Phaser.Math.Distance.Between(this.rosa.x, this.rosa.y, this.av.x, this.av.y) < 22) { this.conversarRosalina(); return; }
      const npc = this.gente.find((g) => g.spr.visible && Phaser.Math.Distance.Between(g.spr.x, g.spr.y, this.av.x, this.av.y) < 22);
      if (npc) { this.conversarCom(npc); return; }
      const perto = this.interativos.find((i) => Math.abs(i.alvo[0] - ax) + Math.abs(i.alvo[1] - ay) <= 1);
      if (perto) this.agir(perto);
    }
  }

  danca() {
    const c = this.add.sprite(this.av.x + 18, this.av.y, 'consultor', 0).setOrigin(0.5, 0.8).setDepth(800);
    const ev = this.time.addEvent({ delay: 160, loop: true, callback: () => { c.setFrame(Phaser.Math.Between(0, 3)); c.setFlipX(!c.flipX); } });
    this.time.delayedCall(2600, () => { ev.remove(); this.achar('konami'); this.tweens.add({ targets: c, alpha: 0, duration: 500, onComplete: () => c.destroy() }); });
  }

  // Visão do mapa inteiro (tecla M ou botão): mostra os pontos de fase; tocar num ponto aberto leva até ele.
  alternarVisao() {
    if (this.emCena) return;
    const cam = this.cameras.main;
    this.visaoGeral = !this.visaoGeral;
    if (this.visaoGeral) { cam.stopFollow(); this.zoomAntes = cam.zoom; cam.zoomTo(Math.min(cam.width / (this.t.W * P), cam.height / (this.t.H * P)), 400); cam.pan(this.t.W * P / 2, this.t.H * P / 2, 400); }
    else { cam.zoomTo(this.zoomAntes ?? 1, 300); cam.startFollow(this.av, true, 0.12, 0.12); }
    this.o.aoVisao?.(this.visaoGeral);
  }

  tocarVisao(wx, wy) {
    const f = Object.values(this.fases).find((x) => Phaser.Math.Distance.Between(x.no.x, x.no.y, wx, wy) < 20 || Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(x.def.x * P, x.def.y * P, x.def.w * P, x.def.h * P), wx, wy));
    if (!f) { this.alternarVisao(); return; }
    const est = this.o.estados?.[f.def.id];
    const pode = est === 'aberta' || est === 'encerrada' || (this.o.concluidas ?? []).includes(f.def.id);
    if (!pode) { this.o.falar?.({ nome: '', texto: this.o.textos?.viagemTrancada ?? 'Essa fase ainda está em obras.' }); return; }
    this.alternarVisao();
    this.time.delayedCall(350, () => {
      efeitoPoof();
      const poof = (x, y) => { for (let i = 0; i < 8; i++) { const p = this.add.circle(x, y, 3, 0xffffff, 0.9).setDepth(990); this.tweens.add({ targets: p, x: x + Math.cos(i) * 12, y: y + Math.sin(i) * 8, alpha: 0, duration: 400, onComplete: () => p.destroy() }); } };
      poof(this.av.x, this.av.y);
      const [nx, ny] = centro(f.def.entrada); this.av.setPosition(nx, ny); this.av.rota = [];
      const [rx, ry] = centro(livreMaisPerto(this.t.passa, this.t.W, this.t.H, [f.def.entrada[0] + 1, f.def.entrada[1]], 2) ?? f.def.entrada); this.rosa.setPosition(rx, ry);
      poof(nx, ny); this.o.aoMover?.(f.def.entrada);
    });
  }

  introducao() {
    this.emCena = true;
    const cast = this.fases.m1chefao.img;
    this.cameras.main.stopFollow(); this.cameras.main.centerOn(cast.x, cast.y);
    this.o.aoIntro?.('inicio');
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.PAN_COMPLETE, () => { this.cameras.main.startFollow(this.av, true, 0.12, 0.12); this.emCena = false; this.o.aoIntro?.('fim'); });
    this.time.delayedCall(900, () => this.cameras.main.pan(this.av.x, this.av.y, 3800, 'Sine.easeInOut', true));
  }

  // seta na borda da tela apontando a fase aberta que falta fazer
  atualizarSeta() {
    const seta = this.o.seta; if (!seta) return;
    const feitas = new Set(this.o.concluidas ?? []);
    const alvo = Object.values(this.fases).find((f) => this.o.estados?.[f.def.id] === 'aberta' && !feitas.has(f.def.id));
    const vista = this.cameras.main.worldView;
    if (!alvo || this.visaoGeral || vista.contains(alvo.no.x, alvo.no.y)) { seta.hidden = true; return; }
    const ang = Math.atan2(alvo.no.y - this.av.y, alvo.no.x - this.av.x);
    const ex = 0.5 + Math.cos(ang) * 0.46; const ey = 0.5 + Math.sin(ang) * 0.4;
    seta.hidden = false; seta.style.left = `${ex * 100}%`; seta.style.top = `${ey * 100}%`; seta.style.transform = `translate(-50%, -50%) rotate(${ang}rad)`;
  }

  update(time, dt) {
    if (!this.av) return;
    if (this.o.primeiraVez && !this.introFeita) { this.introFeita = true; this.introducao(); }
    if (this.o.revelar && !this.revelado && !this.emCena) { this.revelado = true; this.revelarCaminho(this.o.revelar); }
    const av = this.av; const k = this.teclas; const seg = this.o.segurando?.() ?? null;
    const dir = seg ?? (k ? (k.UP.isDown || k.W.isDown ? 'cima' : k.DOWN.isDown || k.S.isDown ? 'baixo' : k.LEFT.isDown || k.A.isDown ? 'esq' : k.RIGHT.isDown || k.D.isDown ? 'dir' : null) : null);
    if (dir && !av.rota.length && !this.travado()) {
      const [x, y] = peca(av.x, av.y); const [dx, dy] = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] }[dir];
      const nx = x + dx; const ny = y + dy; av.dir = dir;
      if (nx >= 0 && ny >= 0 && nx < this.t.W && ny < this.t.H && this.t.passa[ny * this.t.W + nx]) { av.rota = [[nx, ny]]; av.acao = null; }
    }
    if (av.rota.length) {
      const [tx, ty] = centro(av.rota[0]); const v = VEL * dt / 1000;
      const dx = tx - av.x; const dy = ty - av.y; const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > Math.abs(dy)) av.dir = dx > 0 ? 'dir' : 'esq'; else if (Math.abs(dy) > 0.1) av.dir = dy > 0 ? 'baixo' : 'cima';
      av.play(`heroi-${av.dir}`, true);
      if (d <= v) { av.setPosition(tx, ty); av.rota.shift(); if (!av.rota.length) { this.o.aoMover?.(peca(av.x, av.y)); if (av.acao) { const a = av.acao; av.acao = null; a(); } } }
      else { av.x += (dx / d) * v; av.y += (dy / d) * v; }
    } else { av.anims.stop(); av.setFrame(DIRECOES[av.dir]); }
    av.setDepth(100 + av.y); this.sombra.setPosition(av.x, av.y + 5);
    this.iaRosalina(time, dt); this.rosa.setDepth(100 + this.rosa.y);
    this.moverGente(time, dt); this.moverBichos(time, dt);
    if (!this.cfg.menosMovimento) {
      this.nuvens.forEach((n, i) => { n.x += (6 + i * 2) * dt / 1000; if (n.x > this.t.W * P + 100) n.x = -100; });
      this.borboletas.forEach((b, i) => { b.x += Math.sin(time / 600 + i) * 0.4; b.y += Math.cos(time / 300 + i * 2) * 0.3; b.setScale(1, Math.floor(time / 120 + i) % 2 ? 1 : 0.4); });
    }
    this.atualizarSeta();
  }
}

// ---------- interface por cima do mapa ----------
export function iniciarMapa(raiz, opcoes) {
  const cfg = config();
  raiz.classList.add('mapa');
  raiz.dataset.controles = cfg.controles;
  raiz.innerHTML = `<div class="mapa-jogo" id="mapa-jogo"></div>
    <div class="mapa-barra"><span class="mapa-mundo">${opcoes.nomeMundo ?? ''}</span>
      <span class="mapa-dir"><span class="mapa-segredos" id="mapa-segredos"></span>${opcoes.botoesBarra ?? ''}
      <button class="mapa-btn" id="mapa-visao" aria-label="Mapa inteiro (M)" title="Mapa inteiro (M)">🗺</button>
      <button class="mapa-btn" id="mapa-cfg" aria-label="Configurações (Esc)" title="Configurações (Esc)">⚙</button>
      <button class="mapa-btn" id="mapa-cheia" aria-label="Tela cheia" title="Tela cheia">⛶</button></span></div>
    <div class="mapa-seta" id="mapa-seta" hidden aria-hidden="true">➜</div>
    <div class="mapa-dpad" aria-label="Direcional">${['cima', 'esq', 'dir', 'baixo'].map((d) => `<button class="mapa-tecla ${d}" data-dir="${d}" aria-label="${d}">${{ cima: '▲', baixo: '▼', esq: '◀', dir: '▶' }[d]}</button>`).join('')}</div>
    <div class="mapa-ab"><button class="mapa-tecla b" data-bt="B" aria-label="Botão B">B</button><button class="mapa-tecla a" data-bt="A" aria-label="Botão A">A</button></div>
    <div class="mapa-dialogo" id="mapa-dialogo" hidden>
      <div class="mapa-rosto" id="mapa-rosto" hidden><img id="mapa-rosto-img" alt=""><canvas id="mapa-retrato" width="46" height="40" hidden></canvas></div>
      <div class="mapa-falas"><b id="mapa-nome"></b><span id="mapa-texto"></span><div class="mapa-opcoes" id="mapa-opcoes"></div></div><span class="mapa-seta-dlg" id="mapa-seta-dlg" hidden>▼</span></div>
    <div class="mapa-cfg" id="mapa-cfg-painel" hidden role="dialog" aria-label="Configurações">
      <div class="mapa-cfg-caixa"><h2>Configurações</h2>
        <label>Música <input type="range" min="0" max="1" step="0.05" id="cfg-musica"></label>
        <label>Efeitos <input type="range" min="0" max="1" step="0.05" id="cfg-efeitos"></label>
        <label>Velocidade do texto <select id="cfg-texto"><option value="lenta">Lenta</option><option value="normal">Normal</option><option value="rapida">Rápida</option></select></label>
        <label>Controle na tela <select id="cfg-controles"><option value="auto">Automático</option><option value="sempre">Sempre</option><option value="nunca">Nunca</option></select></label>
        <label class="check"><input type="checkbox" id="cfg-movimento"> Menos movimento na tela</label>
        <p class="mapa-cfg-dica">No computador: setas ou WASD para andar, E, Enter ou Espaço para falar, M para o mapa inteiro, Esc para este menu.</p>
        <button class="btn verde" id="cfg-fechar">Voltar ao jogo</button></div></div>
    <div class="mapa-faixa" id="mapa-faixa" hidden></div>
    <div class="mapa-girar">Deite o celular para jogar</div>`;
  const $ = (s) => raiz.querySelector(s);

  // ---------- caixa de diálogo ----------
  const caixa = $('#mapa-dialogo'); const txt = $('#mapa-texto'); const nome = $('#mapa-nome'); const seta = $('#mapa-seta-dlg'); const opcs = $('#mapa-opcoes');
  const rosto = $('#mapa-rosto'); const rostoImg = $('#mapa-rosto-img'); const retrato = $('#mapa-retrato');
  let fila = []; let atual = null; let digita = null; let retratoAnim = null;
  const VELOC = { lenta: 45, normal: 26, rapida: 10 };
  const pararRetrato = () => { if (retratoAnim) cancelAnimationFrame(retratoAnim); retratoAnim = null; };
  const mostrar = () => {
    atual = fila.shift(); if (!atual) { caixa.hidden = true; pararRetrato(); return; }
    caixa.hidden = false; nome.textContent = atual.nome ?? ''; txt.textContent = ''; opcs.innerHTML = ''; seta.hidden = true;
    pararRetrato();
    rosto.hidden = !(atual.pose || atual.rosto); retrato.hidden = !atual.pose; rostoImg.hidden = !atual.rosto;
    if (atual.rosto) rostoImg.src = `${opcoes.urls.base}${ROSTOS[atual.rosto]}`;
    if (atual.pose) { const g = retrato.getContext('2d'); const ini = performance.now(); const pinta = (t) => { g.clearRect(0, 0, 46, 40); desenhaPose(g, atual.pose, t - ini, 1, 2); retratoAnim = requestAnimationFrame(pinta); }; retratoAnim = requestAnimationFrame(pinta); }
    let i = 0; clearInterval(digita);
    digita = setInterval(() => { i += 1; txt.textContent = atual.texto.slice(0, i); if (i % 3 === 0) efeitoLetra(); if (i >= atual.texto.length) terminar(); }, VELOC[config().texto] ?? 26);
  };
  const terminar = () => {
    clearInterval(digita); digita = null; txt.textContent = atual.texto;
    if (atual.botoes?.length) opcs.innerHTML = atual.botoes.map((b, k) => `<button class="btn ${k === 0 ? 'verde' : 'claro'}" data-op="${k}">${b.rotulo}</button>`).join('');
    else seta.hidden = false;
  };
  const avancar = () => { if (digita) { terminar(); return; } if (atual?.botoes?.length) return; const fim = atual?.aoFechar; mostrar(); fim?.(); };
  caixa.addEventListener('click', (e) => {
    const b = e.target.closest('[data-op]');
    if (b) { const op = atual.botoes[Number(b.dataset.op)]; efeitoToque(); const fim = atual.aoFechar; fila = []; mostrar(); if (op.acao) op.acao(); else fim?.(); return; }
    avancar();
  });
  const falar = (...msgs) => { fila.push(...msgs.filter(Boolean)); if (!atual || caixa.hidden) mostrar(); };

  // ---------- configurações ----------
  const painel = $('#mapa-cfg-painel');
  const abrirCfg = (abrir = painel.hidden) => {
    painel.hidden = !abrir; if (!abrir) return;
    const c = config(); const v = volumes();
    $('#cfg-musica').value = v.musica; $('#cfg-efeitos').value = v.efeitos; $('#cfg-texto').value = c.texto; $('#cfg-controles').value = c.controles; $('#cfg-movimento').checked = c.menosMovimento;
  };
  $('#cfg-musica').addEventListener('input', (e) => definirVolume('musica', Number(e.target.value)));
  $('#cfg-efeitos').addEventListener('input', (e) => { definirVolume('efeitos', Number(e.target.value)); efeitoToque(); });
  painel.addEventListener('change', () => {
    const c = { texto: $('#cfg-texto').value, controles: $('#cfg-controles').value, menosMovimento: $('#cfg-movimento').checked };
    salvarConfig(c); raiz.dataset.controles = c.controles; if (cena) cena.cfg = c;
  });
  $('#cfg-fechar').addEventListener('click', () => abrirCfg(false));
  $('#mapa-cfg').addEventListener('click', () => abrirCfg());

  // ---------- controle na tela ----------
  let segurando = null; let cena = null;
  raiz.querySelectorAll('[data-dir]').forEach((b) => {
    const solta = () => { if (segurando === b.dataset.dir) segurando = null; b.classList.remove('apertada'); };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); segurando = b.dataset.dir; b.classList.add('apertada'); cena?.botao(b.dataset.dir); });
    b.addEventListener('pointerup', solta); b.addEventListener('pointerleave', solta); b.addEventListener('pointercancel', solta);
  });
  raiz.querySelectorAll('[data-bt]').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); b.classList.add('apertada'); setTimeout(() => b.classList.remove('apertada'), 120);
    if (!caixa.hidden && b.dataset.bt === 'A') { avancar(); return; }
    cena?.botao(b.dataset.bt);
  }));
  $('#mapa-visao').addEventListener('click', () => cena?.alternarVisao());
  $('#mapa-cheia').addEventListener('click', async () => {
    try { if (!document.fullscreenElement) { await raiz.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } else await document.exitFullscreen(); } catch { /* aparelho sem tela cheia */ }
  });

  // ---------- segredos ----------
  const achados = new Set(opcoes.segredosAchados ?? []);
  const placar = () => { $('#mapa-segredos').textContent = `Segredos ${achados.size}/${planta.SEGREDOS.length}`; };
  placar();
  const textos = opcoes.textos ?? {};
  const aoAcharSegredo = (id) => {
    const novo = !achados.has(id);
    if (novo) { achados.add(id); placar(); efeitoSegredo(); opcoes.aoAcharSegredo?.(id, achados.size); }
    falar({ nome: novo ? `Segredo encontrado! (${achados.size} de ${planta.SEGREDOS.length})` : 'Segredo já encontrado', texto: textos.segredos?.[id] ?? '' });
  };

  // ---------- conversas ----------
  const falasRosa = textos.rosalina ?? [];
  let iRosa = Math.floor(Math.random() * Math.max(1, falasRosa.length));
  const TRUQUES = [{ n: 3, id: 'pata', rotulo: 'Dar a pata' }, { n: 6, id: 'rolar', rotulo: 'Rolar' }, { n: 10, id: 'dancar', rotulo: 'Dançar' }];
  const aoTocarRosalina = (acao) => {
    const f = falasRosa[iRosa % Math.max(1, falasRosa.length)] ?? { texto: 'Au!', pose: 'latindo', latidos: 1 }; iRosa += 1;
    if (f.latidos) latido(f.latidos);
    const petiscos = lerNum('admq-petiscos');
    const sabidos = TRUQUES.filter((t) => petiscos >= t.n);
    const truque = sabidos.length ? sabidos[Math.floor(Math.random() * sabidos.length)] : null;
    falar({ nome: 'Rosalina', texto: f.texto, pose: f.pose, aoFechar: () => acao('fim'), botoes: [
      { rotulo: 'Dar petisco', acao: () => {
        const n = lerNum('admq-petiscos') + 1; guardarNum('admq-petiscos', n); latido(2); acao('petisco');
        const aprendeu = TRUQUES.find((t) => t.n === n);
        falar({ nome: 'Rosalina', pose: 'petisco', texto: textos.petisco ?? 'Nhac!', aoFechar: () => acao('fim') });
        if (aprendeu) falar({ nome: 'Rosalina aprendeu um truque!', pose: 'feliz', texto: `Com tantos petiscos, a Rosalina aprendeu: ${aprendeu.rotulo.toLowerCase()}. Peça na próxima conversa.`, aoFechar: () => acao('fim') });
      } },
      ...(truque ? [{ rotulo: truque.rotulo, acao: () => acao(truque.id) }] : []),
      { rotulo: 'Tchau', acao: () => acao('fim') },
    ] });
  };
  const contaFalas = {};
  const aoConversar = (quem, aoFechar) => {
    const lista = textos.pessoas?.[quem] ?? ['...'];
    const i = (contaFalas[quem] = ((contaFalas[quem] ?? (new Date().getDate())) + 1)) % lista.length;
    const nomes = textos.nomes ?? {};
    falar({ nome: nomes[quem] ?? '', rosto: ROSTOS[quem] ? quem : null, texto: lista[i], aoFechar });
  };
  const aoTocarFase = (id) => {
    const nf = opcoes.fases?.[id]; const titulo = nf ? `${nf.codigo} ${nf.nome}` : id;
    const estado = opcoes.estados?.[id] ?? 'trancada';
    const feita = (opcoes.concluidas ?? []).includes(id);
    if (estado === 'aberta' || estado === 'encerrada' || feita) {
      falar({ nome: titulo, texto: feita ? (textos.faseFeita ?? '') : (textos.faseAberta ?? ''), botoes: [{ rotulo: feita ? 'Rever a fase' : 'Entrar na fase', acao: () => opcoes.aoAbrirFase?.(id) }, { rotulo: 'Agora não' }] });
    } else {
      const placas = textos.placas ?? [];
      const t = estado === 'adiada' ? textos.adiada : estado === 'cancelada' ? textos.cancelada : placas[Math.floor(Math.random() * placas.length)];
      falar({ nome: titulo, texto: t ?? '' });
    }
  };
  const faixa = $('#mapa-faixa');
  const aoIntro = (fase) => {
    if (fase === 'inicio') { faixa.textContent = opcoes.nomeMundo ?? ''; faixa.hidden = false; }
    else { faixa.hidden = true; falar(...(textos.intro ?? []).map((t) => ({ nome: textos.nomes?.consultor ?? '', rosto: 'consultor', texto: t }))); }
  };

  const largura = () => { const r = raiz.getBoundingClientRect(); const asp = r.width && r.height ? r.width / r.height : 16 / 9; return Math.round(Math.min(480, Math.max(240, 180 * asp))); };
  const jogo = new Phaser.Game({
    type: Phaser.AUTO, parent: $('#mapa-jogo'), width: largura(), height: 180, pixelArt: true, backgroundColor: '#5a9a3c',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, input: { activePointers: 3 }, audio: { noAudio: true }, banner: false,
    scene: new MapaCena({
      ...opcoes, falar, segurando: () => segurando, dialogoAberto: () => !caixa.hidden || !painel.hidden, avancarDialogo: avancar,
      alternarConfig: () => abrirCfg(), seta: $('#mapa-seta'),
      aoAcharSegredo, aoTocarRosalina, aoConversar, aoTocarFase, aoIntro, aoVisao: (v) => raiz.classList.toggle('visao', v),
    }),
  });
  jogo.events.once('ready', () => { cena = jogo.scene.getScene('mapa'); });
  raiz.addEventListener('pointerdown', () => tocarMusica(), { once: true });
  const aoRedimensionar = () => jogo.scale.setGameSize(largura(), 180);
  window.addEventListener('resize', aoRedimensionar);

  return {
    jogo, falar, cena: () => cena,
    atualizarEstados(estados, concluidas) { opcoes.estados = estados; opcoes.concluidas = concluidas; cena?.aplicarEstados(estados, concluidas); },
    revelarCaminho(id) { cena?.revelarCaminho(id); },
    derrotarCastelo() { cena?.derrotarCastelo(); },
    destruir() { window.removeEventListener('resize', aoRedimensionar); pararMusica(); pararRetrato(); clearInterval(digita); jogo.destroy(true); raiz.innerHTML = ''; raiz.classList.remove('mapa'); },
    alternarSom,
  };
}
