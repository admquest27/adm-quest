// Desenhos da Vila dos Planos feitos para o jogo (construções das fases, objetos, bichos e a Rosalina pequena).
// Cada função devolve uma grade do motor de formas; a cena transforma em textura.
import { tela, el, ret, poli, pon, traco, contorno, linhas } from '../pixel/formas.js';

const fim = (r) => { contorno(r, 'K'); return r; };

// ---------- construções das fases (32x32 ou 48x48) ----------
// 1-1 Casa de Partida: a casa do Consultor
function casa() {
  const r = tela(32, 32);
  ret(r, 4, 14, 24, 16, 'q'); ret(r, 4, 26, 24, 4, 'C');
  poli(r, [[1, 16], [16, 3], [31, 16]], (x, y) => (x > 16 ? 'R' : 'r'));
  ret(r, 22, 4, 4, 8, 'a'); ret(r, 21, 3, 6, 2, 'A');
  ret(r, 13, 20, 7, 10, 'o'); pon(r, 18, 25, 'g');
  ret(r, 6, 18, 5, 5, 'u'); ret(r, 22, 18, 5, 5, 'u'); pon(r, 6, 18, 'w'); pon(r, 22, 18, 'w');
  ret(r, 12, 12, 8, 2, 'G'); ret(r, 13, 12, 6, 1, 'g'); // placa da porta
  return fim(r);
}
// 1-2 Dunas da Sobrevivência: o avião caído na areia
function aviao() {
  const r = tela(32, 32);
  el(r, 16, 27, 14, 3, 'd', { sombra: 'D' });
  poli(r, [[3, 18], [26, 14], [29, 20], [6, 24]], (x, y) => (y > 20 ? 'a' : 'S'));
  poli(r, [[10, 18], [20, 6], [23, 7], [17, 19]], 'S'); poli(r, [[13, 20], [22, 26], [19, 27], [11, 22]], 'a');
  poli(r, [[3, 18], [1, 10], [5, 11], [7, 19]], 'r');
  for (const x of [11, 15, 19]) ret(r, x, 17, 2, 2, 'u');
  el(r, 28, 17, 2, 3, 'A'); traco(r, 29, 13, 31, 9, 'A', 1);
  el(r, 25, 8, 3, 3, 'l'); el(r, 28, 4, 2.5, 2.5, 's'); el(r, 23, 4, 2, 2, 'w');
  return fim(r);
}
// 1-3 Oficina dos Mestres: oficina de madeira com a engrenagem no telhado
function oficina() {
  const r = tela(32, 32);
  ret(r, 3, 14, 26, 16, 'O'); for (let y = 15; y < 30; y += 3) ret(r, 3, y, 26, 1, 'o');
  poli(r, [[1, 15], [16, 6], [31, 15]], (x) => (x > 16 ? 'D' : 'd'));
  ret(r, 10, 19, 12, 11, 'A'); for (let y = 20; y < 30; y += 2) ret(r, 10, y, 12, 1, 'a');
  el(r, 16, 7, 5, 5, 'S', { sombra: 'a' }); for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0], [-4, -4], [4, 4], [-4, 4], [4, -4]]) ret(r, 15 + dx, 6 + dy, 2, 2, 'S');
  el(r, 16, 7, 2, 2, 'A');
  ret(r, 4, 17, 4, 4, 'u'); ret(r, 24, 17, 4, 4, 'u');
  return fim(r);
}
// 1-4 Terra Nova: o morro com a bandeira de missão, visão e valores
function terraNova() {
  const r = tela(32, 32);
  el(r, 16, 27, 15, 7, 'n', { sombra: 'N' }); el(r, 10, 24, 4, 2, 'n');
  ret(r, 15, 4, 2, 22, 'o');
  ret(r, 17, 5, 12, 3, 'u'); ret(r, 17, 8, 12, 3, 'w'); ret(r, 17, 11, 12, 3, 'g');
  pon(r, 15, 3, 'g'); pon(r, 16, 3, 'g');
  el(r, 7, 28, 2, 1.5, 'y'); el(r, 25, 29, 2, 1.5, 'p');
  return fim(r);
}
// 1-5 Noite da Decisão: barraca, fogueira e o quadro da SWOT
function acampamento() {
  const r = tela(32, 32);
  poli(r, [[2, 28], [11, 10], [20, 28]], (x) => (x > 11 ? 'G' : 'x')); poli(r, [[9, 28], [11, 20], [13, 28]], 'K');
  ret(r, 22, 12, 9, 9, 'q'); ret(r, 22, 12, 4, 4, 'n'); ret(r, 27, 12, 4, 4, 'r'); ret(r, 22, 17, 4, 4, 'u'); ret(r, 27, 17, 4, 4, 'y');
  traco(r, 23, 21, 21, 29, 'o', 1); traco(r, 29, 21, 31, 29, 'o', 1);
  traco(r, 13, 30, 21, 27, 'o', 2); traco(r, 13, 27, 21, 30, 'D', 2);
  el(r, 17, 26, 3, 3, 'x'); el(r, 17, 25, 1.8, 2.2, 'y');
  return fim(r);
}
// 1-6 Árvore do Comando: copa grande com o organograma nos galhos
function arvore() {
  const r = tela(48, 48);
  ret(r, 20, 30, 8, 16, 'o'); ret(r, 20, 30, 2, 16, 'O'); poli(r, [[16, 46], [20, 40], [28, 40], [32, 46]], 'o');
  el(r, 24, 18, 22, 16, 'n', { sombra: 'N' }); el(r, 14, 14, 8, 6, 'n'); el(r, 34, 14, 8, 6, 'n');
  const caixa = (x, y) => { ret(r, x, y, 7, 5, 'w'); ret(r, x + 1, y + 1, 5, 1, 'l'); };
  traco(r, 24, 10, 24, 14, 'K'); traco(r, 12, 14, 36, 14, 'K'); for (const x of [12, 24, 36]) traco(r, x, 14, x, 18, 'K');
  caixa(21, 5); caixa(9, 18); caixa(21, 18); caixa(33, 18);
  traco(r, 12, 23, 12, 26, 'K'); traco(r, 6, 26, 18, 26, 'K'); caixa(3, 27); caixa(14, 27);
  return fim(r);
}
// 1-7 Missão Raio-X: torre com a lupa gigante
function torre() {
  const r = tela(32, 40);
  ret(r, 9, 14, 14, 24, 'S'); for (let y = 16; y < 38; y += 4) { ret(r, 9, y, 14, 1, 'a'); ret(r, (y / 4) % 2 ? 13 : 17, y - 3, 1, 3, 'a'); }
  poli(r, [[7, 15], [16, 2], [25, 15]], (x) => (x > 16 ? 'U' : 'u'));
  ret(r, 13, 30, 6, 8, 'o'); ret(r, 14, 19, 4, 5, 'K'); ret(r, 15, 20, 2, 3, 'y');
  el(r, 24, 22, 6, 6, 'g', { borda: 'G' }); el(r, 24, 22, 4, 4, 'Y'); ret(r, 22, 20, 2, 2, 'w');
  traco(r, 28, 27, 31, 31, 'o', 2);
  return fim(r);
}
// Castelo da Bagunça: castelo de chefão, com papéis voando e bandeiras tortas
function castelo({ caindo = 0 } = {}) {
  const r = tela(48, 48);
  const dy = caindo;
  const pedra = (x, y) => (y % 4 === 0 || (x + (Math.floor(y / 4) % 2 ? 3 : 0)) % 7 === 0 ? 'A' : 'a');
  ret(r, 6, 16 + dy, 36, 30 - dy, 'A'); poli(r, [[6, 16 + dy], [42, 16 + dy], [42, 46], [6, 46]], pedra);
  for (const tx of [2, 34]) { poli(r, [[tx, 8 + dy], [tx + 12, 8 + dy], [tx + 12, 46], [tx, 46]], pedra); for (let i = 0; i < 3; i++) ret(r, tx + i * 5, 4 + dy, 3, 4, 'A'); }
  for (let i = 0; i < 6; i++) ret(r, 10 + i * 5, 12 + dy, 3, 4, 'A');
  poli(r, [[18, 46], [18, 34], [24, 28], [30, 34], [30, 46]], 'K'); ret(r, 20, 36, 8, 1, 'V');
  ret(r, 6, 22 + dy, 3, 4, 'y'); ret(r, 38, 22 + dy, 3, 4, 'y'); ret(r, 22, 18 + dy, 4, 5, 'K');
  traco(r, 8, 8 + dy, 6, 0 + dy, 'K', 1); poli(r, [[6, 0 + dy], [1, 2 + dy], [6, 4 + dy]], 'r');
  traco(r, 40, 8 + dy, 43, 1 + dy, 'K', 1); poli(r, [[43, 1 + dy], [47, 4 + dy], [42, 5 + dy]], 'r');
  for (const [x, y] of [[13, 30], [33, 27], [36, 38], [10, 40]]) { ret(r, x, y + dy, 4, 3, 'w'); pon(r, x + 1, y + 1 + dy, 'l'); }
  return fim(r);
}

// ---------- objetos e segredos (16x16) ----------
function casinha() {
  const r = tela(16, 16);
  ret(r, 2, 7, 12, 8, 'q'); poli(r, [[0, 8], [8, 1], [16, 8]], 'p'); ret(r, 6, 10, 4, 5, 'K');
  el(r, 13, 14, 2.5, 1.2, 'u'); return fim(r);
}
function impressora({ olho = false } = {}) {
  const r = tela(16, 16);
  ret(r, 1, 7, 14, 8, 'S'); ret(r, 1, 7, 14, 2, 'a'); ret(r, 4, 12, 8, 3, 'w'); ret(r, 11, 9, 2, 1, 'r');
  el(r, 8, 5, 5, 2.5, 'x', { sombra: 'O' }); el(r, 3, 4, 2, 1.8, 'x'); pon(r, 2, 2, 'x'); pon(r, 4, 2, 'x');
  traco(r, 12, 5, 15, 3, 'x', 1);
  contorno(r, 'K'); if (olho) { pon(r, 3, 4, 'K'); } else { pon(r, 2, 4, 'K'); pon(r, 3, 4, 'K'); }
  return r;
}
function cacto() {
  const r = tela(16, 16);
  ret(r, 6, 2, 4, 13, 'n'); ret(r, 2, 6, 3, 4, 'n'); ret(r, 2, 9, 4, 2, 'n'); ret(r, 11, 4, 3, 5, 'n'); ret(r, 10, 8, 4, 2, 'n');
  ret(r, 8, 3, 1, 11, 'N'); el(r, 8, 15, 5, 1, 'd'); pon(r, 7, 1, 'p');
  return fim(r);
}
function escola({ antena = 0 } = {}) {
  const r = tela(32, 32);
  ret(r, 2, 12, 28, 18, 'Y'); ret(r, 2, 27, 28, 3, 'C');
  poli(r, [[0, 13], [16, 6], [32, 13]], 'r'); ret(r, 13, 20, 6, 10, 'o');
  for (const x of [4, 9, 21, 26]) { ret(r, x, 16, 3, 4, 'u'); ret(r, x, 22, 3, 3, 'u'); }
  ret(r, 12, 9, 8, 3, 'w'); ret(r, 13, 10, 6, 1, 'u');
  traco(r, 24, 9, 24, 1, 'a', 1); traco(r, 21, 2 + antena, 27, 2 - antena, 'a', 1); traco(r, 22, 4, 26, 4, 'a', 1);
  return fim(r);
}
function porta() {
  const r = tela(16, 16);
  ret(r, 2, 1, 12, 15, 'D'); ret(r, 3, 2, 10, 14, 'o'); ret(r, 4, 3, 8, 3, 'q'); ret(r, 5, 4, 6, 1, 'l');
  pon(r, 11, 10, 'g'); el(r, 12, 14, 1.6, 1.4, 'w'); pon(r, 14, 14, 'w');
  return fim(r);
}
function lapide() {
  const r = tela(16, 16);
  ret(r, 3, 4, 10, 11, 'a'); el(r, 8, 4, 5, 3, 'a'); ret(r, 3, 4, 10, 11, 'a'); ret(r, 5, 6, 6, 1, 'A'); ret(r, 5, 8, 6, 1, 'A'); ret(r, 5, 10, 4, 1, 'A');
  el(r, 8, 15, 7, 1.5, 'n'); return fim(r);
}
function placa404() {
  const r = tela(16, 16);
  ret(r, 7, 8, 2, 8, 'o'); ret(r, 1, 2, 14, 7, 'O'); ret(r, 2, 3, 12, 5, 'q');
  linhas(r, ['r.r.rrr.r.r', 'rrr.r.r.rrr', '..r.rrr...r'], 3, 4);
  return fim(r);
}
function ilha({ brilho = false } = {}) {
  const r = tela(16, 16);
  el(r, 8, 11, 7, 4, 'd', { sombra: 'D' }); ret(r, 4, 5, 8, 6, 'o'); ret(r, 4, 5, 8, 2, 'O'); ret(r, 7, 7, 2, 2, 'g');
  if (brilho) { pon(r, 13, 3, 'Y'); pon(r, 12, 4, 'Y'); pon(r, 14, 4, 'Y'); }
  return fim(r);
}
function portao() {
  const r = tela(16, 80);
  for (let y = 0; y < 80; y += 8) ret(r, 2, y, 12, 7, 'A');
  ret(r, 0, 28, 16, 3, 'y'); ret(r, 0, 44, 16, 3, 'y'); for (let x = 0; x < 16; x += 4) { ret(r, x, 28, 2, 3, 'K'); ret(r, x + 2, 44, 2, 3, 'K'); }
  ret(r, 3, 33, 10, 8, 'O'); ret(r, 4, 34, 8, 6, 'q'); ret(r, 5, 36, 6, 1, 'r'); ret(r, 5, 38, 4, 1, 'r');
  return fim(r);
}

// ---------- bichos ----------
function galinha(passo = 0) {
  const r = tela(12, 11);
  el(r, 5, 6, 4, 3, 'w', { sombra: 's' }); el(r, 9, 3, 2, 2, 'w'); pon(r, 9, 0, 'r'); pon(r, 10, 1, 'r'); ret(r, 11, 3, 1, 1, 'x');
  ret(r, passo ? 3 : 4, 9, 1, 2, 'x'); ret(r, passo ? 7 : 6, 9, 1, 2, 'x');
  contorno(r, 'K'); pon(r, 9, 2, 'K'); return r;
}
function pombo(passo = 0) {
  const r = tela(12, 10);
  el(r, 5, 6, 4, 2.5, 'a', { sombra: 'A' }); el(r, 9, 3, 2, 2, 'a'); ret(r, 11, 3, 1, 1, 'x'); ret(r, 2, 5, 3, 2, 'S');
  ret(r, passo ? 4 : 5, 8, 1, 2, 'x'); ret(r, passo ? 7 : 6, 8, 1, 2, 'x');
  contorno(r, 'K'); pon(r, 9, 2, 'K'); ret(r, 6, 6, 2, 2, 'u'); return r;
}
function consultor(passo = 0) {
  const r = tela(14, 20);
  el(r, 7, 5, 4, 4, 'c'); ret(r, 3, 1, 8, 3, 'S'); ret(r, 3, 9, 8, 7, 'a'); ret(r, 6, 9, 2, 5, 'r');
  ret(r, passo ? 2 : 0, 10, 3, 2, 'a'); ret(r, passo ? 9 : 11, passo ? 7 : 10, 3, 2, 'a');
  ret(r, 4, 16, 2, 3, 'A'); ret(r, 8, 16, 2, 3, 'A');
  contorno(r, 'K'); pon(r, 5, 5, 'K'); pon(r, 9, 5, 'K'); return r;
}

// ---------- sinais de estado ----------
function bandeira(f = 0, branca = false) {
  const r = tela(12, 16); ret(r, 1, 1, 1, 15, 'o');
  poli(r, f ? [[2, 1], [11, 2], [10, 5], [11, 8], [2, 7]] : [[2, 1], [10, 1], [11, 4], [10, 7], [2, 7]], branca ? 'w' : 'g'); if (!branca) pon(r, 5, 4, 'r');
  return fim(r);
}
function estrela() {
  const r = tela(12, 12);
  poli(r, [[6, 0], [7.6, 4], [12, 4.4], [8.6, 7.2], [9.8, 12], [6, 9.4], [2.2, 12], [3.4, 7.2], [0, 4.4], [4.4, 4]], (x, y) => (y < 5 ? 'Y' : 'g'));
  return fim(r);
}
function obra() {
  const r = tela(32, 12);
  for (let x = 0; x < 32; x += 6) ret(r, x, 3, 4, 8, 'O');
  ret(r, 0, 5, 32, 2, 'o'); ret(r, 0, 8, 32, 1, 'o');
  for (const x of [2, 26]) { poli(r, [[x, 11], [x + 2, 2], [x + 4, 11]], 'x'); ret(r, x + 1, 6, 2, 1, 'w'); }
  ret(r, 12, 0, 8, 6, 'y'); ret(r, 13, 1, 6, 1, 'K'); ret(r, 13, 3, 4, 1, 'K'); ret(r, 15, 6, 2, 5, 'o');
  return fim(r);
}
function operarios(f = 0) {
  const r = tela(24, 16);
  for (const [x, cor] of [[4, 'y'], [15, 'x']]) {
    el(r, x + 3, 7, 3, 3, 'c'); ret(r, x, 3, 7, 2, cor); ret(r, x + 1, 2, 5, 1, cor);
    ret(r, x + 1, 10, 6, 5, 'u');
  }
  ret(r, 9, 12 - f, 5, 3, 'r'); ret(r, 10, 11 - f, 3, 1, 'w');
  contorno(r, 'K'); pon(r, 6, 7, 'K'); pon(r, 17, 7, 'K'); return r;
}
function embargo() {
  const r = tela(32, 32);
  traco(r, 2, 4, 30, 28, 'y', 3); traco(r, 30, 4, 2, 28, 'y', 3);
  for (let i = 0; i < 28; i += 6) { ret(r, 2 + i, 3 + i, 2, 2, 'K'); ret(r, 28 - i, 3 + i, 2, 2, 'K'); }
  return r;
}

// ---------- Rosalina pequena (para o mapa) ----------
function rosaLado({ passo = 0, cavar = false, corda = false } = {}) {
  const r = tela(22, 16);
  const i = cavar ? 1 : 0;
  el(r, 3.5, 5 - i, 2.4, 2.4, 'w', { sombra: 's' });
  for (const [x, up] of (cavar ? [[5, 0], [7, 0], [12, passo], [14, 1 - passo]] : passo ? [[5, 0], [7, 1], [12, 1], [14, 0]] : [[5, 1], [7, 0], [12, 0], [14, 1]])) ret(r, x, 12 - up, 2, 3, 'w');
  el(r, 9, 9, 6, 3.5, 'w', { sombra: 's' });
  el(r, 16, 6 + i, 4.5, 4, 'w', { sombra: 's' }); el(r, 20, 7.5 + i, 2, 1.5, 'w');
  el(r, 13.5, 8.5 + i, 1.6, 3.4, 'c', { sombra: 'C' });
  pon(r, 15, 1 + i, 'p'); pon(r, 17, 1 + i, 'p'); pon(r, 16, 1 + i, 'P');
  contorno(r, 'k');
  pon(r, 17, 5 + i, 'e'); pon(r, 21, 6 + i, 'e'); pon(r, 18, 7 + i, 'b');
  if (corda) { pon(r, 19, 9, 'r'); pon(r, 20, 9, 'y'); pon(r, 21, 8, 'x'); }
  return r;
}
function rosaFrente({ olhos = 'abertos', treme = 0 } = {}) {
  const r = tela(16, 18);
  const x = 8 + treme;
  el(r, x, 13, 4.5, 3.5, 'w', { sombra: 's' });
  el(r, x - 4.5, 9, 2, 4, 'c', { sombra: 'C' }); el(r, x + 4.5, 9, 2, 4, 'c', { sombra: 'C' });
  el(r, x, 7, 5, 4.5, 'w', { sombra: 's' });
  pon(r, x - 2, 2, 'p'); pon(r, x + 1, 2, 'p'); pon(r, x, 2, 'P'); pon(r, x - 1, 2, 'P');
  contorno(r, 'k');
  if (olhos === 'fechados') { pon(r, x - 3, 7, 'e'); pon(r, x - 2, 7, 'e'); pon(r, x + 2, 7, 'e'); pon(r, x + 1, 7, 'e'); }
  else if (olhos === 'medo') { ret(r, x - 3, 6, 2, 2, 'e'); ret(r, x + 1, 6, 2, 2, 'e'); pon(r, x - 3, 6, 'w'); pon(r, x + 1, 6, 'w'); }
  else { ret(r, x - 3, 6, 2, 2, 'e'); ret(r, x + 1, 6, 2, 2, 'e'); pon(r, x - 3, 6, 'w'); pon(r, x + 1, 6, 'w'); }
  pon(r, x - 0.5, 9, 'e'); pon(r, x - 4, 9, 'b'); pon(r, x + 3, 9, 'b');
  return r;
}


// ---------- peças novas do mapa 2.0 ----------
// Ponto de fase no caminho, no espírito dos mapas de mundo: amarelo aberto, vermelho com segredo, cinza trancado.
function no(cor = 'y', escura = 'G', brilho = false) {
  const r = tela(16, 12);
  el(r, 8, 7, 6.5, 4, escura); el(r, 8, 6, 6, 3.6, cor); el(r, 6, 5, 2.5, 1.3, 'w');
  if (brilho) { pon(r, 13, 2, 'w'); pon(r, 2, 3, 'w'); }
  return fim(r);
}
function moinhoBase() {
  const r = tela(32, 32);
  poli(r, [[9, 31], [11, 10], [21, 10], [23, 31]], (x) => (x > 17 ? 'd' : 'q'));
  for (let y = 14; y < 31; y += 4) ret(r, 10, y, 12, 1, 'C');
  ret(r, 13, 22, 6, 9, 'o'); ret(r, 14, 14, 4, 4, 'u');
  poli(r, [[8, 11], [16, 2], [24, 11]], (x) => (x > 16 ? 'R' : 'r'));
  return fim(r);
}
function quadroSwot() {
  const r = tela(16, 16);
  traco(r, 4, 9, 2, 15, 'o', 1); traco(r, 12, 9, 14, 15, 'o', 1);
  ret(r, 1, 1, 14, 10, 'q'); ret(r, 2, 2, 6, 4, 'n'); ret(r, 8, 2, 6, 4, 'r'); ret(r, 2, 6, 6, 4, 'u'); ret(r, 8, 6, 6, 4, 'y');
  pon(r, 4, 3, 'w'); pon(r, 10, 3, 'w'); pon(r, 4, 7, 'w'); pon(r, 10, 7, 'w');
  return fim(r);
}
function fogueira(f = 0) {
  const r = tela(16, 16);
  traco(r, 2, 14, 13, 11, 'o', 2); traco(r, 2, 11, 13, 14, 'D', 2);
  el(r, 8, 9 - f, 4, 5 + f, 'x'); el(r, 8, 10, 2.4, 3 - f, 'y'); pon(r, f ? 5 : 11, 3, 'x');
  return fim(r);
}
function organograma() {
  const r = tela(48, 48);
  const caixa = (x, y) => { ret(r, x, y, 7, 5, 'w'); ret(r, x + 1, y + 1, 5, 1, 'u'); ret(r, x + 1, y + 3, 3, 1, 'l'); };
  traco(r, 24, 11, 24, 15, 'K'); traco(r, 12, 15, 36, 15, 'K'); for (const x of [12, 24, 36]) traco(r, x, 15, x, 18, 'K');
  caixa(21, 6); caixa(9, 18); caixa(21, 18); caixa(33, 18);
  contorno(r, 'K'); return r;
}
function lupa() {
  const r = tela(16, 16);
  el(r, 7, 7, 5.5, 5.5, 'g', { borda: 'G' }); el(r, 7, 7, 3.6, 3.6, 'Y'); ret(r, 5, 5, 2, 2, 'w');
  traco(r, 11, 11, 15, 15, 'o', 2);
  return fim(r);
}

export const DESENHOS = {
  casa, aviao, oficina, terraNova, acampamento, arvore, torre, castelo,
  casinha, impressora, cacto, escola, porta, lapide, placa404, ilha, portao,
  galinha, pombo, consultor, bandeira, estrela, obra, operarios, embargo,
  rosaLado, rosaFrente,
};

// Todas as texturas que a cena precisa: [chave, grade]
export function todasAsTexturas() {
  const lista = [];
  for (const nome of ['aviao', 'casinha', 'cacto', 'porta', 'lapide', 'placa404', 'portao', 'estrela', 'obra', 'embargo']) lista.push([nome, DESENHOS[nome]()]);
  lista.push(['castelo', castelo()]);
  for (let i = 1; i <= 6; i++) lista.push([`castelo-cai-${i}`, castelo({ caindo: i * 5 })]);
  lista.push(['impressora', impressora()], ['impressora-olho', impressora({ olho: true })]);
  lista.push(['escola', escola()], ['escola-antena', escola({ antena: 1 })]);
  lista.push(['ilha', ilha()], ['ilha-brilho', ilha({ brilho: true })]);
  lista.push(['no-aberto', no('y', 'G', true)], ['no-segredo', no('r', 'R', true)], ['no-trancado', no('S', 'a')], ['no-feito', no('n', 'N')]);
  lista.push(['moinhoBase', moinhoBase()], ['quadroSwot', quadroSwot()], ['organograma', organograma()], ['lupa', lupa()]);
  for (const f of [0, 1]) {
    lista.push([`pombo-${f}`, pombo(f)], [`consultorDanca-${f}`, consultor(f)], [`operarios-${f}`, operarios(f)], [`fogueira-${f}`, fogueira(f)]);
    lista.push([`rosa-anda-${f}`, rosaLado({ passo: f })], [`rosa-cava-${f}`, rosaLado({ passo: f, cavar: true })], [`rosa-corda-${f}`, rosaLado({ passo: f, corda: true })]);
    lista.push([`rosa-medo-${f}`, rosaFrente({ olhos: 'medo', treme: f ? 1 : -1 })]);
  }
  lista.push(['rosa-sentada', rosaFrente()], ['rosa-dorme', rosaFrente({ olhos: 'fechados' })]);
  return lista;
}
