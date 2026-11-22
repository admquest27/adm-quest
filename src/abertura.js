// Tela de abertura do jogo: a Vila rolando, o brasão e o letreiro caindo, a Rosalina correndo atrás de uma
// borboleta e "Toque para começar". Depois do toque, o menu principal com "Entrar no jogo".
import { app, esc } from './ui.js';
import { desenha, COR } from './pixel/formas.js';
import { letreiro, fontesProntas } from './pixel/texto.js';
import { quadro } from './pixel/rosalina.js';
import { gradeBrasao, canvasBrasao } from './pixel/brasao.js';
import { tocarMusica, pararMusica, alternarSom, somLigado, efeitoInicio, efeitoToque } from './pixel/som.js';

const W = 256; const H = 144;
const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const casa = (ctx, x, y, telhado) => {
  ctx.fillStyle = '#120f22'; ctx.fillRect(x - 1, y - 1, 16, 12); ctx.fillStyle = '#f3e2b8'; ctx.fillRect(x, y, 14, 10); ctx.fillStyle = '#d9c08c'; ctx.fillRect(x, y + 8, 14, 2);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = '#120f22'; ctx.fillRect(x - 2 + i, y - 1 - i, 18 - i * 2, 1); ctx.fillStyle = telhado; ctx.fillRect(x - 1 + i, y - 1 - i, 16 - i * 2, 1); }
  ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x + 5, y + 4, 4, 6); ctx.fillStyle = '#5fb4e8'; ctx.fillRect(x + 1, y + 2, 3, 3); ctx.fillRect(x + 10, y + 2, 3, 3);
};
const arvore = (ctx, x, y) => { ctx.fillStyle = '#6b3f1d'; ctx.fillRect(x + 3, y + 7, 2, 4); ctx.fillStyle = '#120f22'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = '#2f8a3c'; ctx.fillRect(x + 1, y + 1, 6, 6); ctx.fillStyle = '#4fbf5c'; ctx.fillRect(x + 1, y + 1, 4, 3); };
const castelo = (ctx, x, y) => {
  ctx.fillStyle = '#4a3f66'; ctx.fillRect(x, y, 26, 20); ctx.fillRect(x - 4, y - 6, 8, 26); ctx.fillRect(x + 22, y - 6, 8, 26);
  for (let i = 0; i < 3; i++) { ctx.fillRect(x - 4 + i * 3, y - 9, 2, 3); ctx.fillRect(x + 22 + i * 3, y - 9, 2, 3); }
  ctx.fillStyle = '#2a2142'; ctx.fillRect(x + 9, y + 9, 8, 11); ctx.fillStyle = '#d9503f'; ctx.fillRect(x + 25, y - 16, 1, 7); ctx.fillRect(x + 26, y - 16, 4, 3);
};
const BORBOLETA = [['.p.p.', 'ppypp', '.p.p.'], ['.....', 'pyyyp', '.....']];
const morro = (x, base, amp, comp, fase) => base - Math.round(amp * (0.5 + 0.5 * Math.sin((x + fase) / comp)));

function cena(ctx, s, brasao) {
  ctx.fillStyle = '#d4ecf8'; ctx.fillRect(0, 0, W, H);
  ['#5fb4e8', '#78c3ee', '#93d1f2', '#b3def5', '#d4ecf8'].forEach((c, i, l) => { ctx.fillStyle = c; ctx.fillRect(0, i * 18, W, 18); if (i) for (let x = i % 2; x < W; x += 2) { ctx.fillStyle = l[i - 1]; ctx.fillRect(x, i * 18, 1, 1); } });
  ctx.fillStyle = '#fff3c4'; ctx.fillRect(220, 10, 14, 14); ctx.fillStyle = '#ffe08a'; ctx.fillRect(222, 12, 10, 10);
  for (const [x0, y, v] of [[20, 20, 1], [120, 34, 0.6], [200, 14, 0.8], [300, 26, 0.7]]) {
    const x = ((x0 - s * 6 * v) % 320 + 320) % 320 - 40; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 26, 6); ctx.fillRect(x + 5, y - 4, 12, 5); ctx.fillRect(x + 14, y - 2, 8, 3); ctx.fillStyle = '#d4ecf8'; ctx.fillRect(x, y + 5, 26, 1);
  }
  for (let x = 0; x < W; x++) { const h = morro(x, 100, 18, 22, s * 5); ctx.fillStyle = '#86c9a0'; ctx.fillRect(x, h, 1, H - h); }
  castelo(ctx, Math.round(((210 - s * 5) % 400 + 400) % 400 - 60), 64);
  for (let x = 0; x < W; x++) { const h = morro(x, 110, 10, 16, s * 12 + 40); ctx.fillStyle = '#4fae5c'; ctx.fillRect(x, h, 1, H - h); ctx.fillStyle = '#7fd18a'; ctx.fillRect(x, h, 1, 1); }
  const desl = (s * 14) % 96;
  for (let i = -1; i < 4; i++) { const x = Math.round(i * 96 - desl); casa(ctx, x + 10, 98, '#d9503f'); arvore(ctx, x + 34, 99); casa(ctx, x + 50, 100, '#3b82d6'); arvore(ctx, x + 74, 101); arvore(ctx, x + 82, 98); }
  ctx.fillStyle = '#3fa34d'; ctx.fillRect(0, 112, W, 32); ctx.fillStyle = '#e8c98a'; ctx.fillRect(0, 128, W, 10); ctx.fillStyle = '#d2ad66';
  for (let x = -((s * 30) % 8); x < W; x += 8) ctx.fillRect(Math.round(x), 133, 4, 1);
  ctx.fillStyle = '#237033'; for (let x = -((s * 30) % 12); x < W; x += 12) ctx.fillRect(Math.round(x), 115, 1, 2);
  // Rosalina atrás da borboleta, com pulinhos
  const ciclo = (s * 30) % (W + 120) - 60;
  const pulo = (s % 3.2) < 0.45 ? -Math.round(Math.sin(((s % 3.2) / 0.45) * Math.PI) * 9) : 0;
  const bx = ciclo + 52 + Math.sin(s * 3) * 6; const by = 96 + Math.sin(s * 5) * 7;
  BORBOLETA[Math.floor(s * 8) % 2].forEach((l, y) => { for (let x = 0; x < l.length; x++) if (l[x] !== '.') { ctx.fillStyle = COR[l[x]]; ctx.fillRect(Math.round(bx) + x, Math.round(by) + y, 1, 1); } });
  const f = Math.floor(s * 9) % 2;
  desenha(ctx, quadro('lado', { passo: f, rabo: f ? -1 : 0, orelha: pulo ? 1 : f }), ciclo, 104 + pulo);
  // brasão e letreiro caindo e quicando
  const tl = Math.min(1, s / 1.1); const queda = tl < 1 ? -90 * (1 - tl) ** 2 : 0;
  const quique = tl >= 1 && s < 2 ? -Math.abs(Math.sin((s - 1.1) * 7)) * 6 * Math.max(0, 1 - (s - 1.1) / 0.9) : 0;
  const balanco = s > 2 && !reduz() ? Math.round(Math.sin(s * 2) * 1.5) : 0;
  const y0 = Math.round(queda + quique + balanco);
  desenha(ctx, brasao, Math.round(W / 2 - brasao.w / 2), 2 + y0);
  letreiro(ctx, 'ADM QUEST', 26, W / 2, 46 + y0, { prof: 4 });
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
      ctx.fillStyle = '#120f22'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.max(0.1, (1 - iris) * 170), 0, Math.PI * 2, true); ctx.fill();
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
  });

  return () => { ativo = false; pararMusica(); };
}

// Mensagem de erro do login dentro do menu, sem redesenhar a abertura.
export function erroAbertura(msg) {
  const el = document.getElementById('ab-erro');
  if (el) el.textContent = msg;
}
