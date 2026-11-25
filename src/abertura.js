// Tela de abertura do jogo: a Vila rolando, o brasão e o letreiro caindo, a Rosalina correndo atrás de uma
// borboleta e "Toque para começar". Depois do toque, o menu principal com "Entrar no jogo".
import { app, esc } from './ui.js';
import { desenha, COR } from './pixel/formas.js';
import { letreiro, fontesProntas } from './pixel/texto.js';
import { quadro } from './pixel/rosalina.js';
import { gradeBrasao, canvasBrasao } from './pixel/brasao.js';
import { tocarMusica, pararMusica, alternarSom, somLigado, efeitoInicio, efeitoToque } from './pixel/som.js';

// A cena é desenhada em 768 x 432: o cenário usa a arte do próprio jogo e o brasão e o letreiro são desenhados
// numa camada de 256 x 144 ampliada três vezes, com os pixels nítidos.
const W = 768; const H = 432;
const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const BORBOLETA = [['.p.p.', 'ppypp', '.p.p.'], ['.....', 'pyyyp', '.....']];
const CAMADA = document.createElement('canvas'); CAMADA.width = 256; CAMADA.height = 144;
const CADELA = document.createElement('canvas'); CADELA.width = 44; CADELA.height = 32;

// Arte do jogo: chega aos poucos; enquanto isso aparecem o céu e o letreiro.
const arte = {};
function carregarArte() {
  const base = import.meta.env.BASE_URL + 'mapa/lpc/';
  const img = (a) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = base + a; });
  return Promise.all([img('atlas.png'), fetch(base + 'atlas.json').then((r) => r.json()), img('rochas.png'), img('terra.png'), img('tijolo.png'), import('./mapa/castelo.js')])
    .then(([atlas, j, rochas, terra, tijolo, c]) => { Object.assign(arte, { atlas, quadros: j.frames, rochas, terra, castelo: c.desenharCastelo(false, tijolo) }); });
}
// construções que passam pela estrada, da esquerda para a direita, com o espaço depois de cada uma
const DESFILE = [['casa-v2-hipped', 14], ['cerejeira-a', 10], ['casa-v2-rosa', 26], ['feira-grande', 22], ['cerejeira-b', 18], ['casa-v2-gambrel', 30], ['coreto', 20], ['fonte-0', 24], ['casa-v2-planilha', 22], ['banca-vermelha', 30]];

function cena(ctx, s, brasao) {
  ctx.imageSmoothingEnabled = false;
  const r = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  ['#4fa8e4', '#68b8ea', '#85c8ef', '#a8d9f4', '#cdeaf8'].forEach((c, i) => r(c, 0, i * 56, W, 60));
  r('#fff3c4', 660, 34, 44, 44); r('#ffe08a', 668, 42, 28, 28);
  for (const [x0, y, v] of [[60, 60, 1], [360, 104, 0.6], [600, 40, 0.8], [880, 82, 0.7]]) {
    const x = ((x0 - s * 14 * v) % 960 + 960) % 960 - 120; r('#ffffff', x, y, 78, 18); r('#ffffff', x + 15, y - 12, 36, 14); r('#ffffff', x + 42, y - 6, 24, 9); r('#d4ecf8', x, y + 15, 78, 3);
  }
  for (let x = 0; x < W; x += 3) { const h = 236 - Math.round(34 * (0.5 + 0.5 * Math.sin((x + s * 6) / 70))); r('#7fc29a', x, h, 3, H - h); }
  if (arte.atlas) {
    // paredão de rocha com o Castelo da Bagunça ao fundo, andando devagar
    const dr = (s * 8) % 48;
    for (let x = -48 - dr; x < W + 48; x += 40) { const sx = [28, 60, 92, 214, 238][Math.abs(Math.round((x + dr + s * 8) / 40)) % 5]; ctx.drawImage(arte.rochas, sx, 168, 48, 64, Math.round(x), 232, 48, 64); }
    r('#3d8f3a', 0, 228, W, 8); r('#6cbb52', 0, 228, W, 3);
    // o castelo fica parado no meio, logo abaixo do letreiro
    ctx.drawImage(arte.castelo, W / 2 - 75, 204, 150, 181);
  }
  r('#3fa34d', 0, 292, W, H - 292); r('#2f8136', 0, 292, W, 4);
  if (arte.atlas) {
    const pecas = DESFILE.map(([n, folga]) => ({ f: arte.quadros[n]?.frame, folga })).filter((p) => p.f);
    const total = pecas.reduce((t, p) => t + p.f.w * 0.4 + p.folga, 0);
    let x = -((s * 34) % total);
    while (x < W) for (const p of pecas) { const w = p.f.w * 0.4; const h = p.f.h * 0.4; if (x + w > 0 && x < W) { r('rgba(10,30,15,0.28)', x + 6, 370, w - 8, 7); ctx.drawImage(arte.atlas, p.f.x, p.f.y, p.f.w, p.f.h, Math.round(x), Math.round(374 - h), w, h); } x += w + p.folga; }
    const dt = Math.round((s * 90) % 32);
    for (let x2 = -dt; x2 < W; x2 += 32) { ctx.drawImage(arte.terra, 64, 160, 32, 32, x2, 386, 32, 32); ctx.drawImage(arte.terra, 64, 160, 32, 10, x2, 418, 32, 10); }
    r('#7a5530', 0, 384, W, 3); r('#7a5530', 0, 427, W, 3);
  } else r('#e8c98a', 0, 376, W, 46);

  const g = CAMADA.getContext('2d'); g.clearRect(0, 0, 256, 144);
  // Rosalina atrás da borboleta, com pulinhos
  const ciclo = (s * 60) % (W + 240) - 120;
  const pulo = (s % 3.2) < 0.45 ? -Math.round(Math.sin(((s % 3.2) / 0.45) * Math.PI) * 18) : 0;
  const bx = ciclo + 112 + Math.sin(s * 3) * 12; const by = 350 + Math.sin(s * 5) * 14;
  BORBOLETA[Math.floor(s * 8) % 2].forEach((l, y) => { for (let x = 0; x < l.length; x++) if (l[x] !== '.') { ctx.fillStyle = COR[l[x]]; ctx.fillRect(Math.round(bx) + x * 3, Math.round(by) + y * 3, 3, 3); } });
  // a Rosalina na estrada, no dobro do tamanho
  const f = Math.floor(s * 9) % 2; CADELA.getContext('2d').clearRect(0, 0, 44, 32); desenha(CADELA.getContext('2d'), quadro('lado', { passo: f, rabo: f ? -1 : 0, orelha: pulo ? 1 : f }), 0, 1);
  ctx.drawImage(CADELA, Math.round(ciclo), 360 + pulo, 88, 64);
  // brasão e letreiro caindo e quicando
  const tl = Math.min(1, s / 1.1); const queda = tl < 1 ? -90 * (1 - tl) ** 2 : 0;
  const quique = tl >= 1 && s < 2 ? -Math.abs(Math.sin((s - 1.1) * 7)) * 6 * Math.max(0, 1 - (s - 1.1) / 0.9) : 0;
  const balanco = s > 2 && !reduz() ? Math.round(Math.sin(s * 2) * 1.5) : 0;
  const y0 = Math.round(queda + quique + balanco);
  desenha(g, brasao, Math.round(128 - brasao.w / 2), 2 + y0);
  letreiro(g, 'ADM QUEST', 26, 128, 44 + y0, { prof: 4 });
  ctx.drawImage(CAMADA, 0, 0, W, H);
}

// Mostra a abertura. aoEntrar() é chamado no toque em "Entrar no jogo" (dentro do próprio toque, para o login abrir).
export function mostrarAbertura({ aoEntrar, logado = false, erro = '' } = {}) {
  app.className = 'abertura';
  app.innerHTML = `<div class="ab-tela" id="ab-tela" role="button" tabindex="0" aria-label="Tela de abertura: toque para começar">
      <canvas id="ab-cv" width="${W}" height="${H}"></canvas>
      <button class="btn claro ab-som" id="ab-som" aria-pressed="${somLigado()}">${somLigado() ? '♪ Som ligado' : '♪ Som desligado'}</button>
      <div class="ab-toque" id="ab-toque" hidden>Toque para começar</div>
      <div class="ab-menu" id="ab-menu" hidden>
        <div class="ab-caixa">
          <canvas class="ab-brasao" id="ab-brasao" aria-label="Brasão do ADM Quest"></canvas>
          <button class="btn verde" id="ab-entrar">Entrar no jogo</button>
          <button class="btn claro" id="ab-creditos">Créditos</button>
          <p class="ab-nota" id="ab-texto">${logado ? 'Bem-vindo de volta!' : 'Você entra com a sua conta Google. O jogo guarda só o seu apelido, o seu progresso e o e-mail da conta; só o professor vê esses dados.'}</p>
          <p class="ab-erro" id="ab-erro">${esc(erro)}</p>
        </div>
      </div>
    </div>
    <p class="ab-girar">Para jogar, deite o celular.</p>`;
  const cv = document.getElementById('ab-cv'); const ctx = cv.getContext('2d');
  const toque = document.getElementById('ab-toque'); const menu = document.getElementById('ab-menu');
  let ativo = true; let estado = erro ? 'menu' : 'titulo'; let iris = 0; let irisDir = 0; let brasao = null;
  const t0 = performance.now();

  const quadroCena = (t) => {
    const s = (t - t0) / 1000;
    cena(ctx, reduz() ? 6 : s, brasao);
    toque.hidden = estado !== 'titulo' || s < 2;
    if (irisDir || iris > 0) {
      iris = Math.max(0, Math.min(1, iris + irisDir * 0.05));
      ctx.fillStyle = '#120f22'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.max(0.1, (1 - iris) * 510), 0, Math.PI * 2, true); ctx.fill();
      if (iris >= 1 && irisDir > 0) { irisDir = 0; menu.hidden = false; estado = 'menu'; }
      if (iris <= 0 && irisDir < 0) irisDir = 0;
    }
    if (ativo && !reduz()) requestAnimationFrame(quadroCena);
  };

  const abrirMenu = () => {
    if (estado !== 'titulo') return;
    tocarMusica(); efeitoInicio();
    estado = 'saindo'; irisDir = 1;
    if (reduz()) { iris = 1; irisDir = 0; menu.hidden = false; estado = 'menu'; quadroCena(performance.now()); }
  };

  document.getElementById('ab-tela').addEventListener('click', (e) => {
    if (e.target.closest('#ab-som')) {
      const ligado = alternarSom(); const b = document.getElementById('ab-som');
      b.textContent = ligado ? '♪ Som ligado' : '♪ Som desligado'; b.setAttribute('aria-pressed', String(ligado));
      return;
    }
    if (e.target.closest('#ab-entrar')) { efeitoToque(); aoEntrar?.(); return; }
    if (e.target.closest('#ab-creditos')) {
      efeitoToque();
      const el = document.getElementById('ab-texto');
      el.textContent = 'ADM Quest, criado pelo professor Silas para o Técnico em Administração do Senac Campinas, 2027. Fontes Pixelify Sans e Nunito (licença OFL). Mapa e avatares com a arte do Liberated Pixel Cup (LPC) e de artistas compatíveis, como Lanea Zimmerman (Sharm), bluecarrot16, Daniel Eddeland e Casper Nilsson, licenças CC-BY-SA 3.0, GPL 3.0, OGA-BY 3.0, CC-BY e CC0 (lista completa no arquivo mapa/lpc/CREDITOS.txt do site), e algumas peças do pacote Ninja Adventure (Pixel-boy e AAA, CC0). Música, sons e desenhos feitos para o jogo.';
      fetch(import.meta.env.BASE_URL + 'lpc/creditos-avatar.json').then((r) => r.json()).then((lista) => {
        const vistos = new Map();
        for (const c of lista) for (const a of c.autores) { const n = a.trim(); if (n && !/^\?+$/.test(n) && !vistos.has(n.toLowerCase())) vistos.set(n.toLowerCase(), n); }
        el.textContent += ' Artistas do LPC: ' + [...vistos.values()].join(', ') + '.';
      }).catch(() => {});
      return;
    }
    if (e.target.closest('.ab-caixa')) return;
    abrirMenu();
  });
  document.getElementById('ab-tela').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'ab-tela') { e.preventDefault(); abrirMenu(); } });

  fontesProntas().then(() => {
    if (!ativo) return;
    brasao = gradeBrasao(0.5, { faixa: false });
    const cb = canvasBrasao(1); const destino = document.getElementById('ab-brasao');
    destino.width = cb.width; destino.height = cb.height; destino.getContext('2d').drawImage(cb, 0, 0);
    if (estado === 'menu') { menu.hidden = false; iris = 1; }
    requestAnimationFrame(quadroCena);
    carregarArte().then(() => { if (ativo && reduz()) requestAnimationFrame(quadroCena); }).catch(() => {});
  });

  return () => { ativo = false; pararMusica(); };
}

// Mensagem de erro do login dentro do menu, sem redesenhar a abertura.
export function erroAbertura(msg) {
  const el = document.getElementById('ab-erro');
  if (el) el.textContent = msg;
}
