// Tela de abertura do jogo: uma cena parada da própria Vila (o castelo ao entardecer), com a câmera se aproximando
// devagar, vaga-lumes, o brasão, o letreiro e "Toque para começar". Depois do toque, o menu com "Entrar no jogo".
import { app, esc } from './ui.js';
import { desenha } from './pixel/formas.js';
import { letreiro, fontesProntas } from './pixel/texto.js';
import { gradeBrasao, canvasBrasao } from './pixel/brasao.js';
import { tocarMusica, pararMusica, alternarSom, somLigado, efeitoInicio, efeitoToque } from './pixel/som.js';

const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// vaga-lumes: posição (% da tela), atraso e duração do voo
const LUZES = [[52, 78, 0, 7], [60, 62, 2.1, 9], [93, 70, 1.2, 8], [47, 40, 3.4, 10], [88, 30, 0.6, 9], [36, 86, 2.8, 8], [70, 88, 4.2, 7], [97, 52, 1.8, 11]];

// o brasão em cima e o nome do jogo embaixo, num desenho só
function desenharLogo(c) {
  const b = gradeBrasao(0.5, { faixa: false });
  c.width = 150; c.height = b.h + 36;
  const g = c.getContext('2d');
  desenha(g, b, Math.round(75 - b.w / 2), 0);
  letreiro(g, 'ADM QUEST', 26, 75, b.h + 4, { prof: 3 });
}

// Mostra a abertura. aoEntrar() é chamado no toque em "Entrar no jogo" (dentro do próprio toque, para o login abrir).
export function mostrarAbertura({ aoEntrar, logado = false, erro = '' } = {}) {
  app.className = 'abertura';
  app.innerHTML = `<div class="ab-tela" id="ab-tela" role="button" tabindex="0" aria-label="Tela de abertura: toque para começar">
      <div class="ab-fundo" aria-hidden="true"><img src="${import.meta.env.BASE_URL}abertura/vila.webp" alt=""></div>
      <div class="ab-veu" aria-hidden="true"></div>
      <div class="ab-luzes" aria-hidden="true">${LUZES.map(([x, y, a, d]) => `<i style="left:${x}%;top:${y}%;animation-delay:-${a}s;animation-duration:${d}s"></i>`).join('')}</div>
      <canvas id="ab-logo" class="ab-logo" role="img" aria-label="ADM Quest"></canvas>
      <button class="btn claro ab-som" id="ab-som" aria-pressed="${somLigado()}">${somLigado() ? '♪ Som ligado' : '♪ Som desligado'}</button>
      <div class="ab-toque" id="ab-toque" hidden>Toque para começar</div>
      <div class="ab-menu" id="ab-menu" hidden>
        <div class="ab-caixa">
          <canvas class="ab-brasao" id="ab-brasao" aria-label="Brasão do ADM Quest"></canvas>
          <button class="btn verde" id="ab-entrar">Entrar no jogo</button>
          <button class="btn claro" id="ab-creditos">Créditos</button>
          <p class="ab-nota" id="ab-texto">${logado ? 'Bem-vindo de volta!' : 'Você entra com a sua conta Google. O jogo guarda o seu nome completo, o nome de usuário, o seu progresso e o e-mail da conta. Os colegas veem só o nome de usuário.'}</p>
          <p class="ab-erro" id="ab-erro">${esc(erro)}</p>
        </div>
      </div>
    </div>
    `;
  const tela = document.getElementById('ab-tela');
  const toque = document.getElementById('ab-toque'); const menu = document.getElementById('ab-menu');
  let ativo = true; let estado = 'titulo';
  const mostrarMenu = () => { estado = 'menu'; toque.hidden = true; menu.hidden = false; tela.classList.add('no-menu'); };
  if (erro) mostrarMenu();
  const espera = setTimeout(() => { if (estado === 'titulo') toque.hidden = false; }, reduz() ? 0 : 1200);

  const abrirMenu = () => {
    if (estado !== 'titulo') return;
    tocarMusica(); efeitoInicio(); mostrarMenu();
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
    const logo = document.getElementById('ab-logo');
    desenharLogo(logo); logo.classList.add('pronto');
    const cb = canvasBrasao(1); const destino = document.getElementById('ab-brasao');
    destino.width = cb.width; destino.height = cb.height; destino.getContext('2d').drawImage(cb, 0, 0);
  });

  return () => { ativo = false; clearTimeout(espera); pararMusica(); };
}

// Mensagem de erro do login dentro do menu, sem redesenhar a abertura.
export function erroAbertura(msg) {
  const el = document.getElementById('ab-erro');
  if (el) el.textContent = msg;
}
