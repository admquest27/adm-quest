// Mapa do mundo (Phaser): a Vila em 16 bits com o pacote Ninja Adventure. O avatar anda pelo teclado ou pelo
// controle na tela (A usa, B pula); os pontos de fase ficam no caminho, como nos mapas de mundo clássicos.
import Phaser from 'phaser';
import * as planta from './vila.js';
import { montarTerreno, caminho, livreMaisPerto, conferirSequencia, semente2 } from './grade.js';
import { todasAsTexturas, iconesBarra } from './texturas.js';
import { FOLHAS, ANIMADOS, PESSOAS, ROSTOS, RECORTES, DIRECOES, LINHAS, LPC_PECAS, LPC_ENFEITES, LPC_OBJETOS } from './arte.js';
import { desenharChao, desenharEstrada, pecasDaEstrada } from './chao.js';
import { MORADORES } from './moradores.js';
import { folha } from '../avatar.js';
import { emCanvas } from '../pixel/formas.js';
import { desenhaPose } from '../pixel/rosalina.js';
import {
  tocarMusica, pararMusica, alternarSom, efeitoToque, piado, efeitoLetra, efeitoSegredo, efeitoPoof, latido, ganido, croac, cocorico,
  volumes, definirVolume, efeitoPulo, garantirSom, somLigado, estadoSom, acabouDeLiberar,
} from '../pixel/som.js';

const P = 16; // peça da planta, em unidades do mundo (a câmera aproxima 2x)
const Q_ESCALA = 0.5; // a arte LPC tem 32 px por peça: desenhada na metade, sai com o dobro de detalhe
const ZOOM = 2;
const LINHA_LPC = { cima: 0, esq: 1, baixo: 2, dir: 3 }; // linhas da folha de caminhada LPC
const centro = ([x, y]) => [x * P + P / 2, y * P + P / 2];
const peca = (px, py) => [Math.floor(px / P), Math.floor(py / P)];
const VEL = 64;
const EMOTES = { susto: 1, feliz: 6, pontos: 20, ex: 21, exVermelho: 22, pergunta: 23, coracao: 27, sono: 28, estrela: 29, bravo: 9 };

const ICONES = { bau: 'disquete', cacto: 'cacto', lapide: 'lapide', 404: 'placa404', professores: 'placaCafe', antena: 'escola', gato: 'impressora', pombo: 'pombo-0', galinhas: 'galinhaBranca', konami: 'consultorDanca-0' };

// ---------- configurações do jogador (guardadas no aparelho) ----------
const CHAVE_CFG = 'admq-config';
const CFG_PADRAO = { texto: 'normal', controles: 'auto', menosMovimento: false, dicas: true, botoes: 'normal' };
export function config() { try { return { ...CFG_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_CFG) || '{}') }; } catch { return { ...CFG_PADRAO }; } }
// celular ou tablet sem mouse: mostra "A" nos balões; no computador, "E"
const ehToque = () => { try { return navigator.maxTouchPoints > 0 && !window.matchMedia('(any-pointer: fine)').matches; } catch { return false; } };
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
class MapaCena extends Phaser.Scene {
  constructor(opcoes) { super('mapa'); this.o = opcoes; }

  preload() {
    const b = this.o.urls.base;
    for (const [k, arq] of Object.entries(FOLHAS)) this.load.spritesheet(k, b + arq, { frameWidth: P, frameHeight: P });
    for (const [k, a] of Object.entries(ANIMADOS)) this.load.spritesheet(k, b + a.arq, { frameWidth: a.w, frameHeight: a.h });
    for (const [k, arq] of Object.entries(PESSOAS)) this.load.spritesheet(k, b + arq, { frameWidth: P, frameHeight: P });
    for (const n of Object.values(EMOTES)) this.load.image(`emote${n}`, `${b}emote/emote${n}.png`);
    const lpc = this.o.urls.lpc ?? b.replace(/na\/$/, 'lpc/');
    this.load.atlas('lpc', lpc + 'atlas.png', lpc + 'atlas.json');
    this.load.spritesheet('galinhaL', lpc + 'bichos/galinha.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('gatoL', lpc + 'bichos/gato.png', { frameWidth: 32, frameHeight: 32 });
  }

  // Construção LPC com o pé no meio da base do retângulo da planta (x, y, w, h em peças)
  imagemLPC(x, y, w, h, quadro) {
    const by = (y + h) * P;
    const img = this.add.image(x * P + (w * P) / 2, by, 'lpc', quadro).setOrigin(0.5, 1).setScale(Q_ESCALA).setDepth(100 + by);
    if (img.displayHeight > 40) (this.predios ??= []).push({ img, b: img.getBounds() });
    return img;
  }
  portaLPC(img, def) { return [img.x - img.displayWidth / 2 + def.porta[0] * Q_ESCALA, img.y - img.displayHeight + def.porta[1] * Q_ESCALA]; }

  // Posição de cada peça no atlas LPC (para o chão, que é montado num canvas)
  quadrosLPC() {
    const a = this.textures.get('lpc');
    return Object.fromEntries(a.getFrameNames().map((n) => { const f = a.get(n); return [n, { frame: { x: f.cutX, y: f.cutY, w: f.cutWidth, h: f.cutHeight } }]; }));
  }

  // Árvore LPC com o pé em (px, py): copa sobre tronco, ou pinheiro inteiro. Desenhada na metade do tamanho.
  arvoreLPC(px, py, s, tipo = null) {
    const t = tipo ?? (s < 0.45 ? 'pinho' : s < 0.85 ? 'copa' : s < 0.93 ? 'pinhoAlto' : 'outono');
    const dep = 100 + py;
    if (t === 'pinho' || t === 'pinhoAlto') {
      const nome = t === 'pinhoAlto' ? 'pinho-alto' : ['pinho-1', 'pinho-2', 'pinho-3'][Math.floor(s * 30) % 3];
      return [this.add.image(px, py + 2, 'lpc', nome).setOrigin(0.5, 1).setScale(0.5).setDepth(dep)];
    }
    const v = Math.floor(s * 40) % 3;
    const tronco = this.add.image(px, py + 4, 'lpc', ['tronco-1', 'tronco-2', 'tronco-3'][v]).setOrigin(0.5, 1).setScale(0.5).setDepth(dep);
    const copa = this.add.image(px, py + 4 - 22, 'lpc', t === 'outono' ? 'copa-outono' : ['copa-1', 'copa-2', 'copa-3'][v]).setOrigin(0.5, 1).setScale(0.5).setDepth(dep + 0.1);
    return [tronco, copa];
  }

  create() {
    const o = this.o;
    this.cfg = config();
    for (const [k, r] of todasAsTexturas()) this.textures.addCanvas(k, emCanvas(r));
    for (const [nome, r] of Object.entries(RECORTES)) this.textures.get(r.folha).add(nome, 0, r.px, r.py, r.pw, r.ph);
    this.recolorirConsultor();
    this.t = montarTerreno(planta);
    const { W, H } = this.t;
    // chão LPC (grama, areia, água) num canvas só, desenhado na metade do tamanho; a ponte vem por cima
    this.lpc = { img: this.textures.get('lpc').getSourceImage(), quadros: this.quadrosLPC() };
    const naEstrada = new Set(); for (const e of planta.ESTRADAS) for (const i of pecasDaEstrada(e.pontos, W, H)) naEstrada.add(i);
    const chao = desenharChao(this.lpc.img, this.lpc.quadros, this.t, planta, naEstrada);
    this.naAreia = chao.naAreia;
    this.textures.addCanvas('chaoLPC', chao.canvas);
    this.add.image(0, 0, 'chaoLPC').setOrigin(0).setScale(Q_ESCALA).setDepth(0);
    const pt = planta.PONTE;
    this.add.image((planta.RIO.x + planta.RIO.w / 2) * P, pt.y * P + P / 2, 'lpc', 'ponte-arco').setScale(Q_ESCALA).setDepth(1);

    this.interativos = [];
    this.anima();
    this.criarEstradas();
    const base = (img) => img.setDepth(100 + img.y + img.displayHeight * (1 - img.originY));

    // mata: árvores em quincôncio, com leve sorteio
    const bordas = [{ x: -5, y: -5, w: W + 10, h: 5 }, { x: -5, y: H, w: W + 10, h: 5 }, { x: -5, y: 0, w: 5, h: H }, { x: W, y: 0, w: 5, h: H }];
    for (const a of [...planta.FLORESTA, ...bordas]) for (let y = a.y + (a.y > H / 2 ? 1.6 : -1); y < a.y + a.h + 1; y += 1.5) for (let x = a.x - 0.5; x < a.x + a.w; x += 2.1) {
      const s = semente2(Math.round(x * 3), Math.round(y * 5));
      const px = (x + (Math.round(y / 1.5) % 2 ? 1.05 : 0) + s * 0.5) * P; const py = (y + 1) * P;
      const [tx, ty] = peca(px, py - 4); if (tx >= 0 && ty >= 0 && tx < W && ty < H && this.t.agua[ty * W + tx]) continue;
      this.arvoreLPC(px, py, s);
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
    let nCasa = 0;
    const ARVORES = { arvoreRedonda: 'copa', arvoreClara: 'copa', arvoreRosa: 'outono', pinheiro: 'pinho' };
    for (const e of planta.ENFEITES) {
      if (ARVORES[e.peca]) { this.arvoreLPC(e.x * P + P, (e.y + e.h) * P - 2, semente2(e.x, e.y), ARVORES[e.peca]); continue; }
      const lpcE = LPC_ENFEITES[e.peca];
      if (lpcE) { const q = lpcE[Math.floor(semente2(e.x * 7, e.y * 3) * lpcE.length)]; this.imagemLPC(e.x, e.y, e.w, e.h, q).setY((e.y + e.h) * P + 1); continue; }
      const lpcP = LPC_PECAS[e.peca];
      if (lpcP) {
        const img = this.imagemLPC(e.x, e.y, e.w, e.h, lpcP.quadro);
        (this.telhados ??= []).push(img.getBounds());
        const [px] = this.portaLPC(img, lpcP);
        const i = nCasa++;
        this.interativos.push({ tipo: 'casa', id: i, nome: this.o.textos?.casas?.[i]?.nome, area: img.getBounds(), alvo: [Math.floor(px / P), e.y + e.h] });
        continue;
      }
      const img = base(this.add.image(e.x * P, e.y * P, RECORTES[e.peca].folha, e.peca).setOrigin(0, 0));
      const porta = RECORTES[e.peca].porta;
      if (porta) {
        this.add.image(img.x + porta[0], img.y + porta[1] + 7, 'portaFechada').setOrigin(0.5, 1).setDepth(img.depth + 0.5);
        const i = nCasa++;
        this.interativos.push({ tipo: 'casa', id: i, nome: this.o.textos?.casas?.[i]?.nome, area: new Phaser.Geom.Rectangle(img.x, img.y, img.width, img.height), alvo: [Math.floor((img.x + porta[0]) / P), e.y + e.h] });
      }
    }

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
    this.criarAmbiente();
    if (o.casteloCaido) this.casteloCaido();

    // Andar é só pelo teclado ou pelo controle na tela. Tocar no cenário só vale na visão do mapa inteiro, para viajar.
    this.input.on('pointerdown', (p) => { if (this.visaoGeral) this.tocarVisao(p.worldX, p.worldY); });
    this.modoToque = ehToque();
    this.teclas = this.input.keyboard?.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');
    this.input.keyboard?.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.input.keyboard?.on('keydown', (ev) => {
      const m = { ArrowUp: 'cima', KeyW: 'cima', ArrowDown: 'baixo', KeyS: 'baixo', ArrowLeft: 'esq', KeyA: 'esq', ArrowRight: 'dir', KeyD: 'dir', KeyE: 'A', Enter: 'A', KeyX: 'A', KeyJ: 'A', Space: 'B', KeyB: 'B', KeyZ: 'B', KeyK: 'B' }[ev.code];
      if (ev.code === 'Escape') { o.alternarConfig?.(); return; }
      if (ev.code === 'KeyM') { this.alternarVisao(); return; }
      if (m) { this.modoToque = false; if ((m === 'A' || m === 'B') && o.dialogoAberto?.()) { o.avancarDialogo?.(); return; } this.botao(m); }
    });
    this.historico = []; this.esbarroes = 0;
    // balão com a tecla em cima do que está ao alcance, e a seta da borda da tela
    this.balao = this.add.image(0, 0, 'balaoA').setOrigin(0.5, 1).setDepth(975).setVisible(false);
    this.tweens.add({ targets: this.balao, scale: { from: 1, to: 1.12 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.setaBorda = this.add.image(0, 0, 'setaBorda').setScrollFactor(0).setDepth(995).setVisible(false);
    this.setaTexto = this.add.text(0, 0, '', { fontFamily: 'Nunito, sans-serif', fontStyle: '800', fontSize: '8px', color: '#fff3c4', stroke: '#120f22', strokeThickness: 3, resolution: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(996).setVisible(false);
  }

  // ---------- animações do pacote ----------
  anima() {
    const a = (key, folha, frames, rate, repeat = -1) => { if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(folha, { frames }), frameRate: rate, repeat }); };
    a('flor', 'flor', [0, 1, 2, 3], 4); a('ondas', 'ondas', [0, 1, 2, 3], 5); a('moinho', 'moinho', [0, 1, 2, 3], 8);
    a('bandeiraVermelha', 'bandeiraVermelha', [0, 1, 2, 3], 7); a('bandeiraBranca', 'bandeiraBranca', [0, 1, 2, 3], 7); a('bandeiraAmarela', 'bandeiraAmarela', [0, 1, 2, 3], 7);
    // galinhas LPC (andando de lado; a cena espelha para o outro lado)
    if (this.textures.exists('galinhaL')) { a('galinhaBranca', 'galinhaL', [4, 5, 6, 7], 8); a('galinhaMarrom', 'galinhaL', [4, 5, 6, 7], 8); }
    a('galinhaBranca', 'galinhaBranca', [0, 1], 6); a('galinhaMarrom', 'galinhaMarrom', [0, 1], 6); a('gato', 'gato', [0, 1], 2); a('sapo', 'sapo', [0, 1], 3); a('peixe', 'peixe', [0, 1], 6);
    for (const quem of Object.keys(PESSOAS)) for (const [dir, col] of Object.entries(DIRECOES)) a(`${quem}-${dir}`, quem, Array.from({ length: LINHAS[quem] ?? 4 }, (_, l) => l * 4 + col), LINHAS[quem] ? 4 : 8);
  }

  // Deserto com contorno ondulado: areia do pacote recortada por uma forma orgânica, com borda mais escura.
  criarDeserto() {
    const d = planta.DESERTO; const pts = [];
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const r = 1 + 0.1 * Math.sin(a * 3 + 0.6) + 0.06 * Math.sin(a * 7 + 1.3);
      pts.push(new Phaser.Math.Vector2((d.cx + Math.cos(a) * d.rx * r) * P, (d.cy + Math.sin(a) * d.ry * r) * P));
    }
    const forma = this.make.graphics({ x: 0, y: 0, add: false }); forma.fillStyle(0xffffff).fillPoints(pts, true);
    const areia = this.add.tileSprite(0, 0, this.t.W * P, this.t.H * P, 'chao', 23).setOrigin(0).setDepth(0.5);
    areia.setMask(forma.createGeometryMask());
    const borda = this.add.graphics().setDepth(0.6);
    borda.lineStyle(3, 0xc9773f, 1).strokePoints(pts, true, true); borda.lineStyle(1, 0xfbe1b2, 0.9).strokePoints(pts.map((p) => new Phaser.Math.Vector2(p.x + (d.cx * P - p.x) * 0.02, p.y + (d.cy * P - p.y) * 0.02)), true, true);
  }

  // O Consultor Cinzento com a cara do professor: cabelo grisalho e camisa azul (troca de cores do personagem do pacote)
  recolorirConsultor() {
    const troca = { '5f7160': [168, 168, 178], '8d977f': [214, 214, 222], '51614e': [124, 124, 134], '548789': [61, 127, 214], '79b8ce': [127, 181, 255] };
    const fonte = this.textures.get('consultor').getSourceImage();
    const c = document.createElement('canvas'); c.width = fonte.width; c.height = fonte.height;
    const g = c.getContext('2d'); g.drawImage(fonte, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const hex = [d.data[i], d.data[i + 1], d.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      const n = troca[hex]; if (n) [d.data[i], d.data[i + 1], d.data[i + 2]] = n;
    }
    g.putImageData(d, 0, 0);
    this.textures.addSpriteSheet('silas', c, { frameWidth: P, frameHeight: P });
    for (const [dir, col] of Object.entries(DIRECOES)) if (!this.anims.exists(`silas-${dir}`)) this.anims.create({ key: `silas-${dir}`, frames: this.anims.generateFrameNumbers('silas', { frames: [0, 1, 2, 3].map((l) => l * 4 + col) }), frameRate: 8, repeat: -1 });
  }

  pertoDeEstrada(px, py) { return this.todosPontos?.some(([x, y]) => Math.abs(x - px) < 14 && Math.abs(y - py) < 12); }

  // Estradas: as que levam a fases abertas aparecem inteiras; as outras, só tracejadas de leve.
  criarEstradas() {
    this.todosPontos = [];
    this.estradas = planta.ESTRADAS.map((e, i) => {
      const pts = pontosDe(e.pontos); this.todosPontos.push(...pts);
      const chave = `estrada-${i}`;
      const des = desenharEstrada(this.lpc.img, this.lpc.quadros, pecasDaEstrada(e.pontos, this.t.W, this.t.H), this.t.W);
      this.textures.addCanvas(chave, des.canvas);
      const img = this.add.image(des.x * P, des.y * P, chave).setOrigin(0).setScale(Q_ESCALA).setDepth(2.5);
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
      const lpcF = LPC_PECAS[f.arte];
      const img = lpcF ? this.imagemLPC(f.x, f.y, f.w, f.h, lpcF.quadro) : f.arte === 'castelo' ? this.add.image(cx, by, 'castelo').setOrigin(0.5, 1) : this.add.image(f.x * P, f.y * P, RECORTES[f.arte].folha, f.arte).setOrigin(0, 0);
      img.setDepth(100 + by);
      const [nx, ny] = centro(f.entrada);
      const no = this.add.image(nx, ny + 3, 'no-trancado').setDepth(3).setScale(0.7);
      this.fases[f.id] = { def: f, img, no, extras: [] };
      this.interativos.push({ tipo: 'fase', id: f.id, area: new Phaser.Geom.Rectangle(f.x * P, f.y * P, f.w * P, f.h * P + 12), alvo: f.entrada });
    }
    // detalhes de cada fase
    const fx = (id) => this.fases[id];
    const arv = fx('m1f6'); const ba = arv.img.getBounds(); this.add.image(ba.centerX, ba.top + 4, 'organograma').setOrigin(0.5, 0).setDepth(arv.img.depth + 1).setScale(0.75);
    const torre = fx('m1f7'); const bt = torre.img.getBounds(); const pl = this.add.image(bt.right - 8, bt.bottom + 3, 'placaLupa').setOrigin(0.5, 1); pl.setDepth(100 + pl.y);
    const portal = fx('m1f4'); const bp = portal.img.getBounds(); this.add.sprite(bp.centerX, bp.top - 2, 'bandeiraAmarela').setOrigin(0.5, 1).setDepth(portal.img.depth + 1).play('bandeiraAmarela');
    const camp = fx('m1f5'); const bc = camp.img.getBounds(); const fog = this.add.sprite(bc.left - 6, bc.bottom - 2, 'lpc', 'fogueira-0').setOrigin(0.5, 1).setScale(Q_ESCALA).setDepth(100 + bc.bottom);
    let qf = 0; this.time.addEvent({ delay: 120, loop: true, callback: () => { qf = (qf + 1) % 5; fog.setFrame('fogueira-' + qf); } });
    this.add.image(bc.left - 20, bc.bottom + 2, 'acampamento', 'toras').setDepth(100 + bc.bottom + 2);
    const cast = fx('m1chefao');
    for (const dx of [-17, 17]) this.add.sprite(cast.img.x + dx, cast.img.y - 39, 'bandeiraVermelha').setOrigin(0.5, 1).setDepth(cast.img.depth + 1).play({ key: 'bandeiraVermelha', delay: dx > 0 ? 200 : 0 });
    this.aplicarEstados(this.o.estados ?? {}, this.o.concluidas ?? []);
  }

  aplicarEstados(estados, concluidas) {
    this.o.estados = estados; this.o.concluidas = concluidas;
    const feitas = new Set(concluidas);
    for (const [id, f] of Object.entries(this.fases)) {
      f.extras.forEach((e) => e.destroy()); f.extras = [];
      this.tweens.killTweensOf(f.no); f.no.setScale(0.7).clearTint();
      const estado = estados[id] ?? 'trancada';
      const add = (x) => { f.extras.push(x); return x; };
      const img = f.img; const r = RECORTES[f.def.arte]; const lpcF = LPC_PECAS[f.def.arte];
      const larg = img.displayWidth; const alt = img.displayHeight;
      const topo = img.y - alt * img.originY; const esq = img.x - larg * img.originX;
      const cx = esq + larg / 2; const fundo = topo + alt;
      const [px, py] = lpcF ? this.portaLPC(img, lpcF).map((v, k) => v - (k ? 10 : 0)) : r?.porta ? [esq + r.porta[0], topo + r.porta[1] + 4] : [cx, fundo - 2];
      if (['trancada', 'adiada', 'cancelada'].includes(estado)) {
        f.no.setTexture('no-trancado');
        add(this.add.image(px, py, 'tabuas').setDepth(img.depth + 1));
        const cad = add(this.add.image(cx, topo - 4, 'cadeado').setDepth(img.depth + 2));
        add(this.tweens.add({ targets: cad, y: topo - 7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        if (estado === 'adiada') {
          const op = (k, x) => (this.textures.exists('mor-' + k) ? this.add.sprite(x, fundo + 4, 'mor-' + k, LINHA_LPC.baixo * 9).setScale(Q_ESCALA) : this.add.sprite(x, fundo + 4, k, 0)).setOrigin(0.5, 1).setDepth(fundo + 108);
          const ops = [add(op('operario1', cx - 26)), add(op('operario2', cx + 26))];
          add(this.time.addEvent({ delay: 2200, loop: true, callback: () => ops.forEach((o, k) => this.emote(o, (Math.floor(this.time.now / 2200) + k) % 2 ? 'sono' : 'pontos', 1600)) }));
        }
        if (estado === 'cancelada') add(this.add.image(cx, topo + alt / 2, 'embargo').setDepth(img.depth + 1));
      } else if (feitas.has(id)) {
        f.no.setTexture('no-feito');
      } else {
        f.no.setTexture(id === 'm1chefao' ? 'no-segredo' : 'no-aberto');
        const anel = add(this.add.ellipse(f.no.x, f.no.y + 1, 12, 7).setStrokeStyle(1, 0xffe9a3).setDepth(2.9));
        add(this.tweens.add({ targets: anel, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 1100, repeat: -1 }));
        const seta = add(this.add.image(f.no.x, f.no.y - 11, 'setaQuica').setDepth(960).setScale(0.8));
        add(this.tweens.add({ targets: seta, y: f.no.y - 15, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        add(this.time.addEvent({ delay: 1600, loop: true, callback: () => this.brilhar(cx + Phaser.Math.Between(-larg / 2, larg / 2), topo + Phaser.Math.Between(4, alt - 4)) }));
      }
    }
    this.estradas?.forEach((e) => { const ab = this.estradaAberta(e); e.img.setVisible(ab).setAlpha(1); e.tracos.setVisible(!ab); });
  }

  brilhar(x, y) {
    if (this.cfg?.menosMovimento) return;
    const b = this.add.image(x, y, 'brilho').setDepth(970).setScale(0.2);
    this.tweens.add({ targets: b, scale: 1, angle: 90, duration: 300, yoyo: true, onComplete: () => b.destroy() });
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
        const b = this.add.sprite(img.x, img.y + 10, 'bandeiraGrande-0').setOrigin(0.15, 1).setDepth(901);
        let fb = 0; this.time.addEvent({ delay: 200, loop: true, callback: () => { fb = (fb + 1) % 3; b.setTexture(`bandeiraGrande-${fb}`); } });
        this.tweens.add({ targets: b, y: img.y - 18, duration: 1800, ease: 'Sine.easeOut' });
        efeitoSegredo(); for (let i = 0; i < 10; i++) this.time.delayedCall(i * 140, () => this.brilhar(img.x + Phaser.Math.Between(-30, 30), img.y - Phaser.Math.Between(10, 60)));
        this.time.delayedCall(1800, () => { this.cameras.main.startFollow(this.av, true, 0.12, 0.12); this.emCena = false; this.o.aoCasteloCair?.(); });
      });
    });
  }

  // Castelo que já caiu numa visita anterior: ruínas, bandeira branca e o Barão longe dali
  casteloCaido() {
    const img = this.fases.m1chefao.img; img.setTexture('castelo-cai-6');
    const b = this.add.sprite(img.x, img.y - 18, 'bandeiraGrande-0').setOrigin(0.15, 1).setDepth(901);
    let fb = 0; this.time.addEvent({ delay: 200, loop: true, callback: () => { fb = (fb + 1) % 3; b.setTexture(`bandeiraGrande-${fb}`); } });
    const barao = this.gente.find((g) => g.quem === 'barao'); if (barao) { barao.spr.setVisible(false); barao.foi = true; }
  }

  // ---------- objetos e segredos ----------
  criarObjetos() {
    this.objetos = {};
    for (const ob of planta.OBJETOS) {
      const w = (ob.w ?? 1) * P; const h = (ob.h ?? 1) * P;
      const rec = RECORTES[ob.arte];
      const lpcO = LPC_OBJETOS[ob.id];
      const img = lpcO ? this.add.image(ob.x * P + w / 2, ob.y * P + h, 'lpc', lpcO).setOrigin(0.5, 1).setScale(Q_ESCALA) : rec ? this.add.image(ob.x * P + w / 2, ob.y * P + h, rec.folha, ob.arte).setOrigin(0.5, 1) : this.add.image(ob.x * P + w / 2, ob.y * P + h, ob.arte).setOrigin(0.5, 1);
      img.setDepth(100 + img.y);
      this.objetos[ob.id] = { def: ob, img, toques: 0 };
      const alvo = rec?.porta ? [Math.floor((img.x - img.width / 2 + rec.porta[0]) / P), ob.y + (ob.h ?? 1)] : this.alvoPerto(ob.x, ob.y, ob.w ?? 1, ob.h ?? 1, ob.alcance ?? 1);
      this.interativos.push({ tipo: 'objeto', id: ob.id, area: new Phaser.Geom.Rectangle(img.x - img.displayWidth / 2 - 2, img.y - img.displayHeight - 2, img.displayWidth + 4, img.displayHeight + 4), alvo });
    }
    this.time.addEvent({ delay: 3200, loop: true, callback: () => {
      const lista = Object.values(this.objetos).filter((o) => o.def.conversa);
      const o = lista[Math.floor(Math.random() * lista.length)]; if (!o) return;
      if (this.cameras.main.worldView.contains(o.img.x, o.img.y - 8)) this.brilhar(o.img.x + Phaser.Math.Between(-6, 6), o.img.y - o.img.displayHeight + Phaser.Math.Between(0, 8));
    } });
    const m = this.objetos.moinho.img; this.add.sprite(m.x, m.y - 26, 'moinho').setScale(0.5).setDepth(m.depth + 1).play('moinho');
    const imp = this.objetos.impressora.img;
    if (this.textures.exists('gatoL')) { const gato = this.add.sprite(imp.x, imp.y - 7, 'gatoL', 7).setOrigin(0.5, 1).setScale(Q_ESCALA).setDepth(imp.depth + 1); this.tweens.add({ targets: gato, scaleY: Q_ESCALA * 1.06, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    else this.add.sprite(imp.x, imp.y - 9, 'gato').setOrigin(0.5, 1).setDepth(imp.depth + 1).play('gato');
    const esc = this.objetos.escola.img; const be = esc.getBounds(); this.antena = this.add.image(be.centerX + 8, be.top + 6, 'antena-0').setOrigin(0.5, 1).setDepth(esc.depth + 1);
    const cafe = this.objetos.porta.img;
    this.time.addEvent({ delay: 650, loop: true, callback: () => {
      if (this.cfg.menosMovimento || !this.cameras.main.worldView.contains(cafe.x, cafe.y - 10)) return;
      const v = this.add.circle(cafe.x - 1 + Phaser.Math.Between(-1, 1), cafe.y - 18, 1, 0xffffff, 0.85).setDepth(cafe.depth + 1);
      this.tweens.add({ targets: v, y: v.y - 7, x: v.x + Phaser.Math.Between(-2, 2), alpha: 0, scale: 1.6, duration: 1000, onComplete: () => v.destroy() });
    } });
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
    else if (i.tipo === 'casa') { const c = this.o.textos?.casas?.[i.id]; this.o.falar?.({ nome: c?.nome ?? '', texto: c?.texto ?? '' }); }
    else this.tocarObjeto(i.id);
  }

  nomeDe(i) {
    if (i.tipo === 'fase') { const f = this.o.fases?.[i.id]; return f ? `${f.codigo} ${f.nome}` : ''; }
    if (i.tipo === 'casa') return this.o.textos?.casas?.[i.id]?.nome ?? '';
    return this.o.textos?.nomesObjetos?.[i.id] ?? '';
  }

  tocarObjeto(id) {
    const ob = this.objetos[id]; const d = ob.def;
    if (id === 'escola') { this.antena.setTexture('antena-1'); this.tweens.add({ targets: this.antena, angle: { from: -12, to: 12 }, duration: 80, yoyo: true, repeat: 4, onComplete: () => { this.antena.setAngle(0).setTexture('antena-0'); } }); }
    if (id === 'casinha') { this.defenderCasinha(); return; }
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
    // avatar do aluno montado em camadas LPC (64 px, desenhado na metade); sem ele, o herói antigo
    if (this.o.folhaAvatar) {
      this.textures.addSpriteSheet('heroiLPC', this.o.folhaAvatar, { frameWidth: 64, frameHeight: 64 });
      for (const [dir, lin] of Object.entries(LINHA_LPC)) if (!this.anims.exists('heroiLPC-' + dir)) this.anims.create({ key: 'heroiLPC-' + dir, frames: this.anims.generateFrameNumbers('heroiLPC', { start: lin * 9 + 1, end: lin * 9 + 8 }), frameRate: 12, repeat: -1 });
      this.av = this.add.sprite(ax, ay, 'heroiLPC', LINHA_LPC.baixo * 9).setScale(Q_ESCALA);
      this.avLPC = true; this.avOY = 0.88;
    } else { this.av = this.add.sprite(ax, ay, 'heroi', 0); this.avOY = 0.8; }
    this.av.setOrigin(0.5, this.avOY);
    this.av.dir = 'baixo'; this.av.rota = []; this.av.acao = null;
    this.sombra = this.add.ellipse(ax, ay + 5, this.avLPC ? 12 : 10, 4, 0x000000, 0.25).setDepth(4);
    this.cameras.main.setZoom(ZOOM).setBounds(0, 0, this.t.W * P, this.t.H * P).startFollow(this.av, true, 0.12, 0.12).setRoundPixels(true);
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
    if (!['medo', 'conversa', 'corre', 'truque', 'defende'].includes(ia.modo) && time > (ia.calma ?? 0)) {
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
      if (!ia.rota.length && ia.aoChegar) { const fn = ia.aoChegar; ia.aoChegar = null; fn(); return; }
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
    r.setTexture('rosa-sentada'); this.emote(r, 'coracao', 1500);
    this.tweens.add({ targets: r, y: r.y - 5, duration: 150, yoyo: true, repeat: acao === 'dancar' ? 4 : 1, onComplete: () => { r.ia.modo = 'senta'; r.ia.ate = this.time.now + 1500; } });
    if (acao === 'dancar') latido(2);
  }

  // Tocar na casinha: a Rosalina vem correndo defender a propriedade
  defenderCasinha() {
    const r = this.rosa; const { passa, W, H } = this.t; const casa = planta.PERSONAGENS.rosalina.casa;
    r.ia.modo = 'defende'; r.ia.vel = 125;
    r.ia.rota = caminho(passa, W, H, peca(r.x, r.y), livreMaisPerto(passa, W, H, casa, 2) ?? casa);
    this.emote(r, 'exVermelho', 900); latido(1);
    r.ia.aoChegar = () => {
      r.setTexture('rosa-sentada').setFlipX(this.av.x < r.x); latido(2); this.emote(r, 'bravo', 1500);
      this.o.aoCasinha?.(() => { r.ia.modo = 'senta'; r.ia.ate = this.time.now + 1500; r.ia.vel = null; });
    };
    if (!r.ia.rota.length) { const fn = r.ia.aoChegar; r.ia.aoChegar = null; fn(); }
  }

  // ---------- pessoas da Vila ----------
  criarGente() {
    this.gente = [];
    const pessoa = (quem, [x, y], area, fala) => {
      const [cx, cy] = centro([x, y]);
      const chave = quem === 'consultor' ? 'silas' : quem;
      const spr = this.add.sprite(cx, cy, chave, 0).setOrigin(0.5, 0.8);
      const sombra = this.add.ellipse(cx, cy + 4, 10, 4, 0x000000, 0.22).setDepth(4);
      const g = { quem, chave, spr, sombra, area, fala, alvo: null, pausa: 0, dir: 'baixo' };
      this.gente.push(g); return g;
    };
    const c = planta.PERSONAGENS.consultor; pessoa('consultor', c.pos, c.area, 'consultor');
    const b = planta.PERSONAGENS.barao; pessoa('barao', b.pos, b.area, 'barao');
    for (const a of planta.PERSONAGENS.aldeoes) pessoa(a.quem, [a.area.x + 1, a.area.y + 1], a.area, a.quem);
    this.trocarGente();
  }

  // Troca os moradores antigos pelos montados em LPC assim que as folhas ficam prontas
  async trocarGente() {
    for (const quem of Object.keys(MORADORES)) {
      const f = await folha(MORADORES[quem], 'walk').catch(() => null);
      if (!f || !this.sys?.textures) return;
      const k = 'mor-' + quem;
      if (!this.textures.exists(k)) {
        this.textures.addSpriteSheet(k, f, { frameWidth: 64, frameHeight: 64 });
        for (const [dir, lin] of Object.entries(LINHA_LPC)) this.anims.create({ key: k + '-' + dir, frames: this.anims.generateFrameNumbers(k, { start: lin * 9 + 1, end: lin * 9 + 8 }), frameRate: 9, repeat: -1 });
      }
      for (const g of this.gente.filter((x) => x.quem === quem)) { g.chave = k; g.lpc = true; g.spr.setTexture(k, LINHA_LPC[g.dir] * 9).setScale(Q_ESCALA).setOrigin(0.5, 0.88); g.sombra.setSize(12, 4); }
    }
  }

  // Prédio alto fica transparente quando o avatar passa atrás dele
  verAtras() {
    const { x, y } = this.av;
    for (const p of this.predios ?? []) { const atras = x > p.b.left + 3 && x < p.b.right - 3 && y < p.b.bottom - 6 && y > p.b.top + 4; const a = atras ? 0.45 : 1; if (p.img.alpha !== a) p.img.setAlpha(a); }
  }

  quadroParado(g) { return g.lpc ? LINHA_LPC[g.dir] * 9 : DIRECOES[g.dir]; }

  moverGente(time, dt) {
    for (const g of this.gente) {
      const s = g.spr; g.sombra.setPosition(s.x, s.y + 4).setVisible(s.visible);
      if (g.fugindo) { s.x += 70 * dt / 1000; s.play(`${g.chave}-dir`, true); s.setDepth(100 + s.y); if (s.x > this.t.W * P + 20) { s.setVisible(false); g.fugindo = false; g.foi = true; } continue; }
      if (g.foi || g.parado) { s.anims.stop(); s.setFrame(this.quadroParado(g)); continue; }
      if (!g.alvo) {
        if (time < g.pausa) { s.anims.stop(); s.setFrame(this.quadroParado(g)); continue; }
        g.alvo = [(g.area.x + Math.random() * g.area.w) * P, (g.area.y + Math.random() * g.area.h) * P];
      }
      const [tx, ty] = g.alvo; const dx = tx - s.x; const dy = ty - s.y; const d = Math.hypot(dx, dy); const v = 22 * dt / 1000;
      if (d < 1) { g.alvo = null; g.pausa = time + 1200 + Math.random() * 3000; if (g.quem === 'barao' && Math.random() < 0.5) this.emote(s, Math.random() < 0.5 ? 'bravo' : 'exVermelho'); continue; }
      const [px, py] = peca(s.x + (dx / d) * 6, s.y + (dy / d) * 6);
      if (!this.t.passa[py * this.t.W + px]) { g.alvo = null; continue; }
      s.x += (dx / d) * v; s.y += (dy / d) * v;
      g.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dir' : 'esq') : (dy > 0 ? 'baixo' : 'cima');
      s.play(`${g.chave}-${g.dir}`, true); s.setDepth(100 + s.y);
    }
  }

  conversarCom(g) {
    g.parado = true;
    const dx = this.av.x - g.spr.x; const dy = this.av.y - g.spr.y;
    g.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dir' : 'esq') : (dy > 0 ? 'baixo' : 'cima');
    g.spr.anims.stop(); g.spr.setFrame(this.quadroParado(g));
    if (g.quem === 'barao') this.emote(g.spr, 'bravo');
    this.o.aoConversar?.(g.fala, () => { g.parado = false; g.pausa = this.time.now + 1500; });
  }

  // ---------- bichos: galinhas, pombo, peixes e sapo ----------
  criarBichos() {
    this.bichos = [];
    const gal = planta.PERSONAGENS.galinhas; const pom = planta.PERSONAGENS.pombo;
    const nova = (tipo, area, chave) => {
      const x = (area.x + Math.random() * area.w) * P; const y = (area.y + Math.random() * area.h) * P;
      const spr = this.galinhaSprite(x, y, chave) ?? this.add.sprite(x, y, chave ?? `${tipo}-0`, 0).setOrigin(0.5, 0.85);
      const b = { tipo, chave, spr, area, alvo: null, pausa: Math.random() * 2000, toque: 0, e: spr.scaleX }; this.bichos.push(b); return b;
    };
    for (let i = 0; i < gal.quantas; i++) nova('galinha', gal.area, i % 2 ? 'galinhaMarrom' : 'galinhaBranca');
    nova('pombo', pom.area);
    const [sx, sy] = centro([4, 21]); this.sapo = this.add.sprite(sx, sy, 'sapo', 0).setDepth(100 + sy).play('sapo');
    this.sapo.casa = [sx, sy];
    this.time.addEvent({ delay: 7000, loop: true, callback: () => { if (this.sapo.mergulhou) return; if (Phaser.Math.Distance.Between(this.sapo.x, this.sapo.y, this.av.x, this.av.y) < 120) croac(); this.pulinhoSapo(); } });
  }

  // Galinha LPC (32 px, desenhada na metade); a marrom é a mesma com tom de terra
  galinhaSprite(x, y, chave) {
    if (!chave?.startsWith('galinha') || !this.textures.exists('galinhaL')) return null;
    const s = this.add.sprite(x, y, 'galinhaL', 4).setOrigin(0.5, 0.9).setScale(Q_ESCALA);
    if (chave === 'galinhaMarrom') s.setTint(0xd9a066);
    return s;
  }

  pulinhoSapo(alto = 5) {
    const s = this.sapo; if (s.pulando || s.mergulhou) return;
    s.pulando = true; this.tweens.add({ targets: s, y: s.casa[1] - alto, duration: 160, yoyo: true, onComplete: () => { s.y = s.casa[1]; s.pulando = false; } });
  }

  // Conversa com o sapo: ele fala uma frase e depois mergulha na lagoa; volta alguns segundos depois
  conversarSapo() {
    croac(); this.emote(this.sapo, 'pontos', 900);
    this.o.aoSapo?.(() => this.mergulhoSapo());
  }

  mergulhoSapo() {
    const s = this.sapo; if (s.mergulhou) return;
    s.mergulhou = true; s.pulando = true;
    const [cx, cy] = s.casa; const [lx] = centro([2, 21]);
    const arco = (para, aoFim) => { this.tweens.add({ targets: s, x: para, duration: 480 }); this.tweens.add({ targets: s, y: cy - 14, duration: 240, yoyo: true, ease: 'Sine.easeOut', onComplete: () => { s.y = cy; aoFim(); } }); };
    s.setFlipX(true); croac();
    arco(lx, () => {
      s.setVisible(false); this.respingo(lx, cy);
      this.time.delayedCall(4200, () => {
        this.respingo(lx, cy); s.setVisible(true).setFlipX(false);
        arco(cx, () => { s.mergulhou = false; s.pulando = false; croac(); });
      });
    });
  }

  respingo(x, y) {
    efeitoPoof();
    for (let i = 0; i < 6; i++) { const g = this.add.circle(x, y, 1.5, 0xffffff, 0.9).setDepth(6); this.tweens.add({ targets: g, x: x + Math.cos(i * 1.05) * 8, y: y - 5 - (i % 3) * 2, alpha: 0, duration: 450, onComplete: () => g.destroy() }); }
    const o = this.add.ellipse(x, y + 2, 6, 3).setStrokeStyle(1, 0xffffff, 0.9).setDepth(2);
    this.tweens.add({ targets: o, scaleX: 3, scaleY: 3, alpha: 0, duration: 700, onComplete: () => o.destroy() });
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
          if (b.tipo === 'galinha') {
            s.anims.stop(); s.setScale(b.e ?? 1);
            if (!b.cisca && Math.random() < 0.012) { b.cisca = true; this.tweens.add({ targets: s, angle: s.flipX ? 35 : -35, y: s.y + 1, duration: 70, yoyo: true, repeat: 2, onComplete: () => { b.cisca = false; s.setAngle(0); const p = this.add.rectangle(s.x + (s.flipX ? 5 : -5), s.y, 1, 1, 0x7b4a32).setDepth(s.depth); this.tweens.add({ targets: p, y: p.y - 3, alpha: 0, duration: 300, onComplete: () => p.destroy() }); } }); }
            else if (Math.random() < 0.002) { s.setFlipX(!s.flipX); }
            else if (Math.random() < 0.0008 && this.cameras.main.worldView.contains(s.x, s.y)) { cocorico(); this.emote(s, 'pontos', 900); }
          }
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
      if (b.tipo === 'galinha') { s.setFlipX(dx > 0); s.play(b.chave, true); s.setAngle(Math.sin(time / (b.fuga ? 40 : 90)) * (b.fuga ? 10 : 5)); if (b.fuga) s.setScale(b.e ?? 1, (b.e ?? 1) * (1 + Math.abs(Math.sin(time / 50)) * 0.15)); else s.setScale(b.e ?? 1); } else { s.setFlipX(dx < 0); s.setTexture(`pombo-${Math.floor(time / 180) % 2}`); }
      // esbarrar nas galinhas: ela pula, bate as asas, solta penas e foge
      if (b.tipo === 'galinha' && this.av.rota.length && Phaser.Math.Distance.Between(s.x, s.y, this.av.x, this.av.y) < 10 && time > b.toque) {
        b.toque = time + 1200; this.esbarroes += 1; cocorico();
        b.alvo = [s.x + (s.x - this.av.x) * 4, s.y + (s.y - this.av.y) * 4]; b.fuga = true;
        this.tweens.add({ targets: s, y: s.y - 7, scaleY: s.scaleY * 1.15, duration: 120, yoyo: true });
        for (let i = 0; i < 3; i++) { const pena = this.add.rectangle(s.x, s.y - 6, 2, 1, 0xffffff).setDepth(950); this.tweens.add({ targets: pena, x: pena.x + Phaser.Math.Between(-10, 10), y: pena.y + Phaser.Math.Between(-10, 4), angle: 180, alpha: 0, duration: 700, onComplete: () => pena.destroy() }); }
        if (this.esbarroes === planta.PERSONAGENS.galinhas.esbarroes) this.bando();
      }
    }
  }

  bando() {
    const vista = this.cameras.main.worldView; cocorico();
    for (let i = 0; i < 10; i++) {
      const chave = i % 2 ? 'galinhaMarrom' : 'galinhaBranca';
      const gx = vista.left - 10 - i * 9; const gy = this.av.y + Phaser.Math.Between(-30, 30);
      const spr = this.galinhaSprite(gx, gy, chave) ?? this.add.sprite(gx, gy, chave).setOrigin(0.5, 0.85);
      const b = { tipo: 'galinha', chave, spr, area: planta.PERSONAGENS.galinhas.area, persegue: true, e: spr.scaleX };
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
    // fumaça saindo do alto dos telhados de palha (ou das chaminés das casas antigas)
    const chamines = this.telhados?.length ? this.telhados.map((b) => [b.centerX + 9, b.top + 7]) : [[f1.x * P + 38, f1.y * P + 4], ...planta.ENFEITES.filter((e) => e.peca.startsWith('casa')).map((e) => [e.x * P + e.w * P * 0.78, e.y * P + 4])];
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
    if (nome === 'A') { const alvo = this.quemPerto(true); if (alvo) alvo.agir(); }
    if (nome === 'B') this.pular();
  }

  // O que está ao alcance do botão A, nesta ordem: Rosalina, pessoas, sapo, pombo, fases, casas e objetos
  // todos = false (para o balão e o aviso): esconde o que guarda segredo ainda não achado
  quemPerto(todos = false) {
    const av = this.av; const t = this.o.textos ?? {};
    const oculto = (seg) => !todos && seg && !this.o.segredoAchado?.(seg);
    const dist = (spr) => Phaser.Math.Distance.Between(spr.x, spr.y, av.x, av.y);
    if (this.rosa.visible && dist(this.rosa) < 22) return { x: this.rosa.x, y: this.rosa.y - 13, nome: 'Rosalina', acao: 'conversar', agir: () => this.conversarRosalina() };
    const npc = this.gente.find((g) => g.spr.visible && !g.fugindo && dist(g.spr) < 22);
    if (npc) return { x: npc.spr.x, y: npc.spr.y - 14, nome: t.nomes?.[npc.quem] ?? '', acao: 'conversar', agir: () => this.conversarCom(npc) };
    if (this.sapo.visible && !this.sapo.mergulhou && dist(this.sapo) < 22) return { x: this.sapo.x, y: this.sapo.y - 8, nome: t.nomes?.sapo ?? 'Sapo', acao: 'conversar', agir: () => this.conversarSapo() };
    const pombo = oculto('pombo') ? null : this.bichos.find((b) => b.tipo === 'pombo' && dist(b.spr) < 20);
    if (pombo) return { x: pombo.spr.x, y: pombo.spr.y - 12, nome: t.nomes?.pombo ?? 'Pombo', acao: 'conversar', agir: () => this.achar('pombo') };
    const [ax, ay] = peca(av.x, av.y);
    let i = null; let melhor = 9;
    for (const q of this.interativos) {
      if (q.tipo === 'objeto' && oculto(this.objetos[q.id].def.segredo)) continue;
      const d = Math.abs(q.alvo[0] - ax) + Math.abs(q.alvo[1] - ay); if (d <= 1 && d < melhor) { melhor = d; i = q; }
    }
    if (!i) return null;
    const fase = i.tipo === 'fase' ? i.id : null;
    const x = i.tipo === 'casa' ? centro(i.alvo)[0] : i.area.centerX;
    return { x, y: i.area.y + 2, nome: this.nomeDe(i), acao: fase ? this.acaoFase(fase) : 'olhar', fase, agir: () => this.agir(i) };
  }

  acaoFase(id) {
    if ((this.o.concluidas ?? []).includes(id)) return 'rever';
    const est = this.o.estados?.[id] ?? 'trancada';
    return est === 'aberta' || est === 'encerrada' ? 'entrar' : 'olhar';
  }

  // Balão com a tecla certa em cima do que dá para usar, e o aviso com o nome embaixo da tela
  atualizarAlcance() {
    const p = !this.travado() && this.cfg.dicas !== false ? this.quemPerto() : null;
    // o balão fica em cima da cabeça do personagem: sempre à vista, inclusive perto da barra do alto
    if (p && !this.av.pulando) this.balao.setTexture(this.modoToque ? 'balaoA' : 'balaoE').setPosition(Math.round(this.av.x), Math.round(this.av.y - 14)).setVisible(true);
    else this.balao.setVisible(false);
    const chave = p ? `${p.nome}|${p.acao}|${this.modoToque}` : '';
    if (chave !== this.alcanceAntes) { this.alcanceAntes = chave; this.o.aoAlcance?.(p ? { nome: p.nome, acao: p.acao, fase: p.fase, tecla: this.modoToque ? 'A' : 'E' } : null); }
  }

  // Botão B: pulo com achatamento na saída e na chegada, sombra que encolhe e poeirinha ao cair
  pular() {
    const av = this.av; if (av.pulando) return;
    av.pulando = true; efeitoPulo();
    const h = { v: 0 }; const base = av.displayHeight || 16; const oy = this.avOY;
    const e0 = av.scaleX; this.tweens.add({ targets: av, scaleX: e0 * 1.2, scaleY: e0 * 0.8, duration: 60, yoyo: true });
    this.tweens.add({
      targets: h, v: 12, duration: 190, delay: 50, yoyo: true, ease: 'Quad.easeOut',
      onUpdate: () => { av.setOrigin(0.5, oy + h.v / base); this.sombra.setScale(1 - h.v / 26); },
      onComplete: () => {
        av.setOrigin(0.5, oy); this.sombra.setScale(1); av.pulando = false;
        this.tweens.add({ targets: av, scaleX: e0 * 1.25, scaleY: e0 * 0.75, duration: 70, yoyo: true });
        if (!this.cfg.menosMovimento) for (const lado of [-1, 1]) { const p = this.add.circle(av.x + lado * 3, av.y + 5, 1.6, 0xd8c8a0, 0.8).setDepth(4); this.tweens.add({ targets: p, x: p.x + lado * 6, y: p.y - 2, alpha: 0, scale: 1.8, duration: 350, onComplete: () => p.destroy() }); }
        this.reagirAoPulo();
      },
    });
  }

  // Quem está perto reage ao pulo: galinhas fogem, o sapo pula junto e a Rosalina às vezes imita
  reagirAoPulo() {
    const av = this.av; const dist = (spr) => Phaser.Math.Distance.Between(spr.x, spr.y, av.x, av.y);
    let assustou = false;
    for (const b of this.bichos) {
      if (b.tipo !== 'galinha' || b.persegue || dist(b.spr) > 34) continue;
      const s = b.spr; assustou = true;
      b.alvo = [s.x + (s.x - av.x) * 3, s.y + (s.y - av.y) * 3]; b.fuga = true; b.pausa = 0;
      this.tweens.add({ targets: s, y: s.y - 6, duration: 110, yoyo: true });
    }
    if (assustou) cocorico();
    if (this.sapo.visible && dist(this.sapo) < 44) this.time.delayedCall(140, () => this.pulinhoSapo(9));
    const r = this.rosa; const ia = r.ia;
    if (dist(r) < 40 && !ia.rota.length && ['senta', 'passeia', 'segue', 'cava'].includes(ia.modo) && Math.random() < 0.6) {
      this.time.delayedCall(160, () => { this.tweens.add({ targets: r, y: r.y - 6, duration: 150, yoyo: true }); latido(1); });
    }
  }

  danca() {
    const lpcC = this.textures.exists('mor-consultor');
    const c = (lpcC ? this.add.sprite(this.av.x + 18, this.av.y, 'mor-consultor', 18).setScale(Q_ESCALA).setOrigin(0.5, 0.88) : this.add.sprite(this.av.x + 18, this.av.y, 'consultor', 0).setOrigin(0.5, 0.8)).setDepth(800);
    const ev = this.time.addEvent({ delay: 160, loop: true, callback: () => { c.setFrame(lpcC ? Phaser.Math.Between(0, 3) * 9 + Phaser.Math.Between(1, 8) : Phaser.Math.Between(0, 3)); c.setFlipX(!c.flipX); } });
    this.time.delayedCall(2600, () => { ev.remove(); this.achar('konami'); this.tweens.add({ targets: c, alpha: 0, duration: 500, onComplete: () => c.destroy() }); });
  }

  // Visão do mapa inteiro (tecla M ou botão): mostra os pontos de fase; tocar num ponto aberto leva até ele.
  alternarVisao() {
    if (this.emCena) return;
    const cam = this.cameras.main;
    this.visaoGeral = !this.visaoGeral;
    if (this.visaoGeral) { cam.stopFollow(); cam.removeBounds(); this.zoomAntes = cam.zoom; cam.zoomTo(Math.min(cam.width / (this.t.W * P), cam.height / (this.t.H * P)), 400); cam.pan(this.t.W * P / 2, this.t.H * P / 2, 400); }
    else { cam.zoomTo(this.zoomAntes ?? ZOOM, 300); cam.setBounds(0, 0, this.t.W * P, this.t.H * P); cam.startFollow(this.av, true, 0.12, 0.12); }
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
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.PAN_COMPLETE, () => { if (this.pulouIntro) return; this.cameras.main.startFollow(this.av, true, 0.12, 0.12); this.emCena = false; this.o.aoIntro?.('fim'); });
    this.time.delayedCall(900, () => this.cameras.main.pan(this.av.x, this.av.y, 3800, 'Sine.easeInOut', true));
  }

  pularIntro() {
    if (!this.emCena || this.pulouIntro) return;
    this.pulouIntro = true; this.cameras.main.panEffect.reset(); this.cameras.main.startFollow(this.av, true, 1, 1);
    this.time.delayedCall(50, () => this.cameras.main.setLerp(0.12, 0.12)); this.emCena = false; this.o.aoIntro?.('pulou');
  }

  // Imersão: nome da região, poeira dos passos, pegadas na areia, passarinhos e luz do dia conforme o horário
  imersao(time) {
    const [tx, ty] = peca(this.av.x, this.av.y);
    if (time > (this.proxZona ?? 0)) {
      this.proxZona = time + 400;
      const z = planta.ZONAS.find((q) => tx >= q.x && ty >= q.y && tx < q.x + q.w && ty < q.y + q.h);
      if ((z?.id ?? null) !== this.zona) { this.zona = z?.id ?? null; if (z) this.o.aoZona?.(z.id); }
    }
    if (this.av.rota.length && time > (this.proxPasso ?? 0)) {
      this.proxPasso = time + 230;
      const d = planta.DESERTO; const naAreia = ((this.av.x / P - d.cx) / d.rx) ** 2 + ((this.av.y / P - d.cy) / d.ry) ** 2 < 0.85;
      if (naAreia) { const m = this.add.ellipse(this.av.x + (Math.floor(time / 230) % 2 ? 2 : -2), this.av.y + 5, 3, 2, 0xb5703f, 0.6).setDepth(0.7); this.tweens.add({ targets: m, alpha: 0, delay: 1800, duration: 1500, onComplete: () => m.destroy() }); }
      else if (!this.cfg.menosMovimento) { const p = this.add.circle(this.av.x, this.av.y + 5, 1.6, 0xd8c8a0, 0.7).setDepth(4); this.tweens.add({ targets: p, y: p.y - 3, alpha: 0, scale: 1.8, duration: 400, onComplete: () => p.destroy() }); }
    }
  }

  criarAmbiente() {
    // passarinhos cruzando o céu de vez em quando, com piado
    this.time.addEvent({ delay: 11000, loop: true, callback: () => {
      if (this.cfg.menosMovimento || Math.random() < 0.35) return;
      const v = this.cameras.main.worldView; const y = v.top + 20 + Math.random() * 40;
      for (let i = 0; i < 3; i++) {
        const b = this.add.text(v.left - 10 - i * 12, y + i * 5, 'v', { fontFamily: 'monospace', fontSize: '8px', color: '#2b2233', resolution: 4 }).setDepth(985);
        this.tweens.add({ targets: b, x: v.right + 20, y: b.y - 15, duration: 6000 + i * 300, onComplete: () => b.destroy() });
        this.time.addEvent({ delay: 180, repeat: 30, callback: () => b.setScale(1, b.scaleY > 0.6 ? 0.5 : 1) });
      }
      piado();
    } });
    // luz conforme o horário real: tarde dourada e noite azulada
    const h = new Date().getHours();
    const luz = h >= 17 && h < 19 ? [0xff9a3c, 0.12] : (h >= 19 || h < 6) ? [0x1c2a6b, 0.3] : null;
    if (luz) this.add.rectangle(0, 0, 2000, 2000, luz[0], luz[1]).setOrigin(0).setScrollFactor(0).setDepth(989);
  }

  // seta na borda da tela apontando a fase aberta que falta fazer
  atualizarSeta() {
    const s = this.setaBorda; const tx = this.setaTexto;
    const feitas = new Set(this.o.concluidas ?? []);
    const alvo = Object.values(this.fases).find((f) => this.o.estados?.[f.def.id] === 'aberta' && !feitas.has(f.def.id));
    const cam = this.cameras.main; const vista = cam.worldView;
    if (!alvo || this.visaoGeral || this.emCena || vista.contains(alvo.no.x, alvo.no.y)) { s.setVisible(false); tx.setVisible(false); return; }
    const dx = alvo.no.x - vista.centerX; const dy = alvo.no.y - vista.centerY;
    const meiaL = cam.width / 2 - 12; const meiaA = dy < 0 ? cam.height / 2 - 30 : cam.height / 2 - 14;
    const k = Math.min(meiaL / Math.max(Math.abs(dx), 0.001), meiaA / Math.max(Math.abs(dy), 0.001));
    const x = Math.round(cam.width / 2 + dx * k); const y = Math.round(cam.height / 2 + dy * k); const ang = Math.atan2(dy, dx);
    s.setVisible(true).setPosition(x, y).setRotation(ang).setScale(this.cfg.menosMovimento ? 1 : 1 + Math.sin(this.time.now / 150) * 0.1);
    tx.setVisible(true).setText(this.o.fases?.[alvo.def.id]?.codigo ?? '').setPosition(Math.round(x - Math.cos(ang) * 14), Math.round(y - Math.sin(ang) * 11));
  }

  update(time, dt) {
    if (!this.av) return;
    if (this.o.primeiraVez && !this.introFeita) { this.introFeita = true; this.introducao(); }
    if (this.o.revelar && !this.revelado && !this.emCena) { this.revelado = true; this.revelarCaminho(this.o.revelar); }
    if (this.o.derrotar && !this.derrotou && !this.emCena && !this.o.dialogoAberto?.()) { this.derrotou = true; this.time.delayedCall(700, () => this.derrotarCastelo()); }
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
      av.play(this.avLPC ? `heroiLPC-${av.dir}` : `heroi-${av.dir}`, true);
      if (d <= v) { av.setPosition(tx, ty); av.rota.shift(); if (!av.rota.length) { this.o.aoMover?.(peca(av.x, av.y)); if (av.acao) { const a = av.acao; av.acao = null; a(); } } }
      else { av.x += (dx / d) * v; av.y += (dy / d) * v; }
    } else { av.anims.stop(); av.setFrame(this.avLPC ? LINHA_LPC[av.dir] * 9 : DIRECOES[av.dir]); }
    av.setDepth(100 + av.y); this.sombra.setPosition(av.x, av.y + 5);
    this.iaRosalina(time, dt); this.rosa.setDepth(100 + this.rosa.y);
    this.moverGente(time, dt); this.moverBichos(time, dt);
    if (!this.cfg.menosMovimento) {
      this.nuvens.forEach((n, i) => { n.x += (6 + i * 2) * dt / 1000; if (n.x > this.t.W * P + 100) n.x = -100; });
      this.borboletas.forEach((b, i) => { b.x += Math.sin(time / 600 + i) * 0.4; b.y += Math.cos(time / 300 + i * 2) * 0.3; b.setScale(1, Math.floor(time / 120 + i) % 2 ? 1 : 0.4); });
    }
    this.verAtras();
    this.atualizarSeta();
    this.atualizarAlcance();
    this.imersao(time);
  }
}

// ---------- interface por cima do mapa ----------
export function iniciarMapa(raiz, opcoes) {
  const cfg = config();
  raiz.classList.add('mapa');
  const aplicarCfg = (c) => { raiz.dataset.controles = c.controles; raiz.dataset.botoes = c.botoes; raiz.dataset.dicas = c.dicas ? 'sim' : 'nao'; };
  aplicarCfg(cfg);
  const ic = Object.fromEntries(Object.entries(iconesBarra()).map(([k, r]) => [k, emCanvas(r, 2).toDataURL()]));
  const icone = (k) => `<img src="${ic[k]}" alt="" width="30" height="30">`;
  raiz.innerHTML = `<div class="mapa-jogo" id="mapa-jogo"></div>
    <div class="mapa-barra"><span class="mapa-mundo">${opcoes.nomeMundo ?? ''}</span>
      <span class="mapa-dir"><button class="mapa-segredos" id="mapa-segredos" title="Álbum de segredos"></button>${opcoes.botoesBarra ?? ''}
      <button class="mapa-btn ic" id="mapa-som" aria-label="Som" title="Som">${icone('som')}</button>
      <button class="mapa-btn ic" id="mapa-visao" aria-label="Mapa inteiro (M)" title="Mapa inteiro (M)">${icone('mapa')}</button>
      <button class="mapa-btn ic" id="mapa-cfg" aria-label="Configurações (Esc)" title="Configurações (Esc)">${icone('cfg')}</button>
      <button class="mapa-btn ic" id="mapa-cheia" aria-label="Tela cheia" title="Tela cheia">${icone('cheia')}</button></span></div>
    <div class="mapa-alvo" id="mapa-alvo" hidden aria-live="polite"></div>
    <div class="mapa-dpad" aria-label="Direcional">${['cima', 'esq', 'dir', 'baixo'].map((d) => `<button class="mapa-tecla ${d}" data-dir="${d}" aria-label="${d}">${{ cima: '▲', baixo: '▼', esq: '◀', dir: '▶' }[d]}</button>`).join('')}</div>
    <div class="mapa-ab"><button class="mapa-tecla b" data-bt="B" data-rotulo="Pular" aria-label="Botão B, pular">B</button><button class="mapa-tecla a" data-bt="A" data-rotulo="Usar" aria-label="Botão A, conversar ou entrar">A</button></div>
    <div class="mapa-dialogo" id="mapa-dialogo" hidden>
      <div class="mapa-rosto" id="mapa-rosto" hidden><img id="mapa-rosto-img" alt=""><canvas id="mapa-retrato" width="46" height="40" hidden></canvas></div>
      <div class="mapa-falas"><b id="mapa-nome"></b><span id="mapa-texto"></span><div class="mapa-opcoes" id="mapa-opcoes"></div></div><span class="mapa-seta-dlg" id="mapa-seta-dlg" hidden>▼</span></div>
    <div class="mapa-cfg" id="mapa-cfg-painel" hidden role="dialog" aria-label="Configurações">
      <div class="mapa-cfg-caixa"><h2>Configurações</h2>
        <label>Música <input type="range" min="0" max="1" step="0.05" id="cfg-musica"></label>
        <label>Efeitos <input type="range" min="0" max="1" step="0.05" id="cfg-efeitos"></label>
        <label>Velocidade do texto <select id="cfg-texto"><option value="lenta">Lenta</option><option value="normal">Normal</option><option value="rapida">Rápida</option></select></label>
        <label>Controle na tela <select id="cfg-controles"><option value="auto">Automático</option><option value="sempre">Sempre</option><option value="nunca">Nunca</option></select></label>
        <label>Tamanho dos botões <select id="cfg-botoes"><option value="normal">Normal</option><option value="grande">Grande</option></select></label>
        <label class="check"><input type="checkbox" id="cfg-dicas"> Mostrar dicas dos botões</label>
        <label class="check"><input type="checkbox" id="cfg-movimento"> Menos movimento na tela</label>
        <p class="mapa-cfg-dica">No celular: direcional para andar, A para conversar ou entrar, B para pular. No computador: setas ou W A S D para andar, E ou Enter para conversar ou entrar, Espaço para pular, M para o mapa inteiro e Esc para este menu.</p>
        <button class="btn verde" id="cfg-fechar">Voltar ao jogo</button></div></div>
    <div class="mapa-cfg" id="mapa-album" hidden role="dialog" aria-label="Álbum de segredos">
      <div class="mapa-cfg-caixa"><h2>Álbum de segredos</h2><p class="mapa-cfg-dica" id="album-conta"></p><ul class="mapa-album" id="album-lista"></ul>
        <button class="btn verde" id="album-fechar">Voltar ao jogo</button></div></div>
    <div class="mapa-faixa" id="mapa-faixa" hidden></div>
    <div class="mapa-zona" id="mapa-zona" hidden></div>
    <button class="mapa-btn mapa-pular" id="mapa-pular" hidden>Pular ⏭</button>
    <div class="mapa-girar">Deite o celular para jogar</div>`;
  const $ = (s) => raiz.querySelector(s);

  // ---------- caixa de diálogo ----------
  const caixa = $('#mapa-dialogo'); const txt = $('#mapa-texto'); const nome = $('#mapa-nome'); const seta = $('#mapa-seta-dlg'); const opcs = $('#mapa-opcoes');
  const rosto = $('#mapa-rosto'); const rostoImg = $('#mapa-rosto-img'); const retrato = $('#mapa-retrato');
  let fila = []; let atual = null; let digita = null; let retratoAnim = null;
  const VELOC = { lenta: 45, normal: 26, rapida: 10 };
  const pararRetrato = () => { if (retratoAnim) cancelAnimationFrame(retratoAnim); retratoAnim = null; };
  const mostrar = () => {
    atual = fila.shift(); if (!atual) { caixa.hidden = true; pararRetrato(); if (!cena?.emCena) pular.hidden = true; return; }
    caixa.hidden = false; nome.textContent = atual.nome ?? ''; txt.textContent = ''; opcs.innerHTML = ''; seta.hidden = true;
    pular.hidden = !(fila.length > 0) && !cena?.emCena;
    pararRetrato();
    rosto.hidden = !(atual.pose || atual.rosto); retrato.hidden = !atual.pose; rostoImg.hidden = !atual.rosto;
    if (atual.rosto) { rostoImg.src = atual.rosto === 'consultor' ? (rostoSilas ?? '') : `${opcoes.urls.base}${ROSTOS[atual.rosto]}`; }
    if (atual.icone && cena) { rosto.hidden = false; rostoImg.hidden = false; rostoImg.src = imagem(atual.icone); }
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
  raiz.addEventListener('pointerdown', (e) => {
    if (caixa.hidden || e.target.closest('.mapa-dialogo, .mapa-cfg, .mapa-barra, [data-bt], [data-dir]')) return;
    e.stopPropagation(); avancar();
  }, true);

  // ---------- configurações ----------
  const painel = $('#mapa-cfg-painel');
  const abrirCfg = (abrir = painel.hidden) => {
    painel.hidden = !abrir; if (!abrir) return;
    const c = config(); const v = volumes();
    $('#cfg-musica').value = v.musica; $('#cfg-efeitos').value = v.efeitos; $('#cfg-texto').value = c.texto; $('#cfg-controles').value = c.controles; $('#cfg-movimento').checked = c.menosMovimento; $('#cfg-botoes').value = c.botoes; $('#cfg-dicas').checked = c.dicas;
  };
  $('#cfg-musica').addEventListener('input', (e) => definirVolume('musica', Number(e.target.value)));
  $('#cfg-efeitos').addEventListener('input', (e) => { definirVolume('efeitos', Number(e.target.value)); efeitoToque(); });
  painel.addEventListener('change', () => {
    const c = { texto: $('#cfg-texto').value, controles: $('#cfg-controles').value, menosMovimento: $('#cfg-movimento').checked, botoes: $('#cfg-botoes').value, dicas: $('#cfg-dicas').checked };
    salvarConfig(c); aplicarCfg(c); if (cena) cena.cfg = c;
  });
  $('#cfg-fechar').addEventListener('click', () => abrirCfg(false));
  $('#mapa-cfg').addEventListener('click', () => abrirCfg());

  // ---------- controle na tela ----------
  let segurando = null; let cena = null;
  raiz.querySelectorAll('[data-dir]').forEach((b) => {
    const solta = () => { if (segurando === b.dataset.dir) segurando = null; b.classList.remove('apertada'); };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); segurando = b.dataset.dir; b.classList.add('apertada'); if (cena) { cena.modoToque = true; cena.botao(b.dataset.dir); } });
    b.addEventListener('pointerup', solta); b.addEventListener('pointerleave', solta); b.addEventListener('pointercancel', solta);
  });
  raiz.querySelectorAll('[data-bt]').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); b.classList.add('apertada'); setTimeout(() => b.classList.remove('apertada'), 120);
    if (cena) cena.modoToque = true;
    if (!caixa.hidden) { avancar(); return; }
    cena?.botao(b.dataset.bt);
  }));
  raiz.querySelectorAll('.mapa-barra button').forEach((b) => { b.addEventListener('mousedown', (e) => e.preventDefault()); b.addEventListener('click', () => b.blur()); });
  $('#mapa-visao').addEventListener('click', () => cena?.alternarVisao());
  // botão de som: mostra se está ligado; se estiver ligado mas o navegador travou o áudio, o clique destrava
  const btSom = $('#mapa-som');
  const pintarSom = () => { const on = somLigado(); btSom.querySelector('img').src = on ? ic.som : ic.mudo; btSom.title = on ? 'Som ligado' : 'Som desligado'; btSom.setAttribute('aria-label', btSom.title); };
  pintarSom();
  btSom.addEventListener('click', () => {
    const e = estadoSom();
    if (somLigado() && (acabouDeLiberar() || !(e.estado === 'running' && e.tocando))) garantirSom();
    else { alternarSom(); if (somLigado()) garantirSom(); }
    pintarSom(); efeitoToque();
  });
  $('#mapa-cheia').addEventListener('click', async () => {
    try { if (!document.fullscreenElement) { await raiz.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } else await document.exitFullscreen(); } catch { /* aparelho sem tela cheia */ }
  });

  // ---------- segredos ----------
  const achados = new Set(opcoes.segredosAchados ?? []);
  const placar = () => { $('#mapa-segredos').textContent = `Segredos ${achados.size}/${planta.SEGREDOS.length}`; };
  placar();
  const textos = opcoes.textos ?? {};
  const album = $('#mapa-album');
  const imagem = (k) => { if (!cena || !cena.textures.exists(k)) return ''; return cena.textures.getBase64(k, cena.textures.get(k).has(0) ? 0 : undefined); };
  const abrirAlbum = (abrir = album.hidden) => {
    album.hidden = !abrir; if (!abrir) return;
    const n = planta.SEGREDOS.length;
    $('#album-conta').textContent = achados.size ? `Você encontrou ${achados.size} de ${n}. Os outros continuam escondidos pela Vila.` : 'Nenhum segredo encontrado ainda. Converse, examine e teste coisas estranhas pela Vila.';
    const ordem = [...planta.SEGREDOS].sort((a, b) => Number(achados.has(b)) - Number(achados.has(a)));
    $('#album-lista').innerHTML = ordem.map((id) => (achados.has(id)
      ? `<li class="achado"><img src="${imagem(ICONES[id] ?? 'brilho')}" alt=""><span>${esc(textos.segredos?.[id] ?? '')}</span></li>`
      : '<li class="oculto"><b>?</b><span>Ainda escondido.</span></li>')).join('');
  };
  $('#mapa-segredos').addEventListener('click', () => abrirAlbum());
  $('#album-fechar').addEventListener('click', () => abrirAlbum(false));
  const aoAcharSegredo = (id) => {
    const novo = !achados.has(id);
    if (novo) { achados.add(id); placar(); efeitoSegredo(); opcoes.aoAcharSegredo?.(id, achados.size); }
    falar({ nome: novo ? `Segredo encontrado! (${achados.size} de ${planta.SEGREDOS.length})` : 'Segredo já encontrado', texto: textos.segredos?.[id] ?? '', icone: ICONES[id] });
  };

  // ---------- conversas ----------
  let rostoSilas = null;
  (() => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height);
      const troca = { '48543d': [150, 150, 160], '2c3126': [92, 92, 104], '6f805b': [200, 200, 210], '548789': [61, 127, 214] };
      for (let i = 0; i < d.data.length; i += 4) { const h = [d.data[i], d.data[i + 1], d.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''); if (troca[h]) [d.data[i], d.data[i + 1], d.data[i + 2]] = troca[h]; }
      g.putImageData(d, 0, 0); rostoSilas = c.toDataURL();
    };
    im.src = `${opcoes.urls.base}${ROSTOS.consultor}`;
  })();
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
        pular.hidden = true;
        const n = lerNum('admq-petiscos') + 1; guardarNum('admq-petiscos', n); latido(2); acao('petisco');
        const aprendeu = TRUQUES.find((t) => t.n === n);
        falar({ nome: 'Rosalina', pose: 'petisco', texto: textos.petisco ?? 'Nhac!', aoFechar: () => acao('fim') });
        if (aprendeu) falar({ nome: 'Rosalina aprendeu um truque!', pose: 'feliz', texto: `Com tantos petiscos, a Rosalina aprendeu: ${aprendeu.rotulo.toLowerCase()}. Peça na próxima conversa.`, aoFechar: () => acao('fim') });
      } },
      ...(truque ? [{ rotulo: truque.rotulo, acao: () => { acao(truque.id); falar({ nome: 'Rosalina', pose: truque.id, texto: textos.truques?.[truque.id] ?? '', aoFechar: () => acao('fim') }); } }] : []),
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
  const pular = $('#mapa-pular');
  pular.addEventListener('click', () => { if (cena?.emCena) cena.pularIntro(); else { fila = []; avancar(); } });
  const aoIntro = (fase) => {
    if (fase === 'inicio') { faixa.textContent = opcoes.nomeMundo ?? ''; faixa.hidden = false; pular.hidden = false; }
    else if (fase === 'pulou') { faixa.hidden = true; pular.hidden = true; }
    else { faixa.hidden = true; pular.hidden = true; falar(...(textos.intro ?? []).map((t) => ({ nome: textos.nomes?.consultor ?? '', rosto: 'consultor', texto: t }))); }
    // depois da apresentação (ou do pulo dela), explica os controles do aparelho em uso
    if (fase === 'fim' || fase === 'pulou') { const t = textos.controles?.[cena?.modoToque ? 'toque' : 'teclado']; if (t) falar({ nome: 'Como jogar', texto: t }); }
  };
  // aviso embaixo da tela: o nome do que está ao alcance, o estado da fase e a tecla para usar
  const alvoEl = $('#mapa-alvo');
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ACOES = { conversar: 'Conversar', olhar: 'Olhar', entrar: 'Entrar', rever: 'Rever' };
  const aoAlcance = (p) => {
    if (!p || !p.nome) { alvoEl.hidden = true; return; }
    let est = '';
    if (p.fase) {
      const e = opcoes.estados?.[p.fase] ?? 'trancada'; const feita = (opcoes.concluidas ?? []).includes(p.fase);
      const [rot, cls] = feita ? ['Concluída', 'feita'] : e === 'aberta' ? ['Aberta', 'aberta'] : e === 'encerrada' ? ['Encerrada', 'aberta'] : e === 'adiada' ? ['Adiada', 'obra'] : e === 'cancelada' ? ['Cancelada', 'obra'] : ['Em obras', 'obra'];
      est = `<span class="est ${cls}">${rot}</span>`;
    }
    alvoEl.innerHTML = `<b>${esc(p.nome)}</b>${est}<span class="acao"><span class="tecla ${p.tecla === 'A' ? 'redonda' : ''}">${p.tecla}</span>${ACOES[p.acao] ?? ''}</span>`;
    alvoEl.hidden = false;
  };
  const falasSapo = textos.sapo ?? [];
  let iSapo = 0;
  const aoSapo = (fim) => { const t = falasSapo[iSapo % Math.max(1, falasSapo.length)] ?? 'Croac.'; iSapo += 1; falar({ nome: textos.nomes?.sapo ?? 'Sapo', icone: 'sapo', quadro: 0, texto: t, aoFechar: fim }); };

  // Escala sempre inteira em pixels reais da tela (inclusive com o zoom de 125% ou 150% do Windows): cada pixel do
  // jogo vira um quadrado do mesmo tamanho, sem pixels tortos nem borrão. A altura do jogo fica perto de 180.
  const medida = () => {
    const r = raiz.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
    const w = (r.width || 640) * dpr; const h = (r.height || 360) * dpr;
    const z = Math.max(1, Math.round(h / (180 * ZOOM)));
    return { w: Math.min(560 * ZOOM, Math.ceil(w / z)), h: Math.ceil(h / z), zoom: z / dpr };
  };
  const m0 = medida();
  const jogo = new Phaser.Game({
    type: Phaser.AUTO, parent: $('#mapa-jogo'), width: m0.w, height: m0.h, zoom: m0.zoom, pixelArt: true, backgroundColor: '#24452b',
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH }, input: { activePointers: 3 }, audio: { noAudio: true }, banner: false,
    scene: new MapaCena({
      ...opcoes, falar, segurando: () => segurando, dialogoAberto: () => !caixa.hidden || !painel.hidden || !album.hidden, avancarDialogo: avancar,
      segredoAchado: (id) => achados.has(id),
      alternarConfig: () => abrirCfg(), aoAlcance, aoSapo,
      aoAcharSegredo, aoTocarRosalina, aoConversar, aoTocarFase, aoIntro, aoVisao: (v) => raiz.classList.toggle('visao', v),
      aoCasinha: (fim) => falar({ nome: 'Rosalina', pose: 'latindo', texto: textos.casinha ?? '', aoFechar: fim }),
      aoZona: (id) => { const n = textos.zonas?.[id]; if (!n) return; const z = $('#mapa-zona'); z.textContent = n; z.hidden = false; z.classList.remove('some'); void z.offsetWidth; z.classList.add('some'); clearTimeout(z.t); z.t = setTimeout(() => { z.hidden = true; }, 2600); },
    }),
  });
  jogo.events.once('ready', () => { cena = jogo.scene.getScene('mapa'); });
  tocarMusica(); // começa no primeiro toque ou tecla do jogador
  const aoRedimensionar = () => {
    if (!raiz.getBoundingClientRect().width) return; // escondido: ajusta quando voltar
    const m = medida(); jogo.scale.setZoom(m.zoom); jogo.scale.resize(m.w, m.h);
  };
  window.addEventListener('resize', aoRedimensionar);

  return {
    jogo, falar, cena: () => cena,
    atualizarEstados(estados, concluidas) { opcoes.estados = estados; opcoes.concluidas = concluidas; cena?.aplicarEstados(estados, concluidas); },
    revelarCaminho(id) { cena?.revelarCaminho(id); },
    derrotarCastelo() { cena?.derrotarCastelo(); },
    pausar() { pararMusica(); if (jogo.input?.keyboard) jogo.input.keyboard.enabled = false; jogo.loop.sleep(); },
    retomar() { jogo.loop.wake(); if (jogo.input?.keyboard) jogo.input.keyboard.enabled = true; aoRedimensionar(); tocarMusica(); },
    destruir() { window.removeEventListener('resize', aoRedimensionar); pararMusica(); pararRetrato(); clearInterval(digita); jogo.destroy(true); raiz.innerHTML = ''; raiz.classList.remove('mapa'); },
    alternarSom,
  };
}
