// Rosalina, a maltês do professor: branquinha, orelhas compridas, lacinho rosa, olhos brilhantes.
// Carinhosa, ama petisco e passear, e é medrosa: tem medo das galinhas, do pombo e do Barão.
import { tela, el, ret, pon, contorno, desenha } from './formas.js';

// De frente (sentada). olhos: abertos | feliz | fechados | medo
function frente({ olhos = 'abertos', boca = 'sorriso', rabo = 0, orelha = 0, pulo = 0, petisco = false } = {}) {
  const r = tela(34, 36); const d = pulo + 2;
  el(r, 26 + rabo, 21 + d, 4, 3, 'w', { sombra: 's', borda: 'l' });
  el(r, 17, 25 + d, 9, 7, 'w', { sombra: 's' });
  el(r, 13, 31 + d, 3, 2, 'w', { borda: 'l' }); el(r, 21, 31 + d, 3, 2, 'w', { borda: 'l' });
  el(r, 8, 18 + d - orelha, 4, 9, 'c', { sombra: 'C', borda: 'l' }); el(r, 26, 18 + d - orelha, 4, 9, 'c', { sombra: 'C', borda: 'l' });
  el(r, 17, 13 + d, 10, 8.5, 'w', { sombra: 's', borda: 'l' });
  el(r, 17, 5 + d, 4, 3, 'w', { borda: 'l' });
  el(r, 13, 4 + d, 2.6, 2, 'p', { borda: 'P' }); el(r, 21, 4 + d, 2.6, 2, 'p', { borda: 'P' }); ret(r, 16, 3 + d, 2, 2, 'P');
  contorno(r, 'k');
  for (const x of [11, 12, 13, 21, 22, 23]) pon(r, x, 9 + d, 's');
  const y = 12 + d;
  if (olhos === 'abertos') { ret(r, 11, y, 3, 4, 'e'); ret(r, 20, y, 3, 4, 'e'); pon(r, 11, y, 'w'); pon(r, 20, y, 'w'); pon(r, 13, y + 2, 'l'); pon(r, 22, y + 2, 'l'); }
  else if (olhos === 'medo') { ret(r, 10, y - 1, 4, 5, 'e'); ret(r, 20, y - 1, 4, 5, 'e'); ret(r, 10, y - 1, 2, 2, 'w'); ret(r, 20, y - 1, 2, 2, 'w'); pon(r, 13, y + 3, 'w'); pon(r, 23, y + 3, 'w'); }
  else if (olhos === 'feliz') { pon(r, 11, y + 2, 'e'); pon(r, 12, y + 1, 'e'); pon(r, 13, y + 2, 'e'); pon(r, 20, y + 2, 'e'); pon(r, 21, y + 1, 'e'); pon(r, 22, y + 2, 'e'); }
  else { ret(r, 11, y + 2, 3, 1, 'e'); ret(r, 20, y + 2, 3, 1, 'e'); }
  ret(r, 9, y + 4, 2, 1, 'b'); ret(r, 24, y + 4, 2, 1, 'b');
  ret(r, 16, y + 4, 3, 2, 'e'); pon(r, 16, y + 4, 'l');
  if (petisco) { ret(r, 13, y + 7, 9, 2, 'd'); ret(r, 12, y + 6, 2, 4, 'd'); ret(r, 21, y + 6, 2, 4, 'd'); ret(r, 13, y + 7, 8, 1, 'O'); }
  else if (boca === 'aberta') { ret(r, 15, y + 7, 5, 2, 'm'); ret(r, 16, y + 8, 3, 1, 't'); }
  else if (boca === 'medo') { ret(r, 16, y + 7, 3, 1, 'l'); }
  else { pon(r, 15, y + 7, 'l'); pon(r, 16, y + 8, 'l'); pon(r, 17, y + 7, 'l'); pon(r, 18, y + 8, 'l'); pon(r, 19, y + 7, 'l'); }
  return r;
}

// De lado, olhando para a direita. cavar: traseiro para cima e patas da frente no chão
function lado({ passo = 0, rabo = 0, corda = false, orelha = 0, cavar = false } = {}) {
  const r = tela(44, 30);
  const inc = cavar ? 2 : 0; // cabeça mais baixa quando cava
  el(r, 7, 11 + rabo - inc, 4.5, 4.5, 'w', { sombra: 's', borda: 'l' });
  const pernas = cavar ? [[9, 0], [13, 0], [21, passo ? 2 : 0], [25, passo ? 0 : 2]]
    : passo ? [[9, 0], [13, 1], [20, 1], [24, 0]] : [[9, 1], [13, 0], [20, 0], [24, 1]];
  for (const [x, up] of pernas) ret(r, x, 22 - up, 3, 5, 'w');
  el(r, 16, 17 - inc / 2, 10, 6, 'w', { sombra: 's' }); el(r, 16, 20, 10, 4, 'w', { sombra: 's' });
  el(r, 29, 11 + inc, 8.5, 8, 'w', { sombra: 's', borda: 'l' });
  el(r, 37.5, 13 + inc, 3.5, 2.6, 'w', { borda: 'l' });
  el(r, 25, 15 + orelha + inc, 3, 7, 'c', { sombra: 'C', borda: 'l' });
  el(r, 27, 3 + inc, 2.3, 1.8, 'p', { borda: 'P' }); el(r, 32, 3 + inc, 2.3, 1.8, 'p', { borda: 'P' }); ret(r, 29, 2 + inc, 2, 2, 'P');
  contorno(r, 'k');
  ret(r, 32, 8 + inc, 3, 3, 'e'); pon(r, 32, 8 + inc, 'w'); ret(r, 32, 12 + inc, 2, 1, 'b');
  pon(r, 30, 6 + inc, 's'); pon(r, 31, 6 + inc, 's');
  ret(r, 40, 11 + inc, 2, 2, 'e'); pon(r, 38, 15 + inc, 'l'); pon(r, 39, 15 + inc, 'l');
  pon(r, 21, 18, 'p'); pon(r, 22, 18, 'p');
  if (corda) { ret(r, 37, 15, 2, 1, 'r'); ret(r, 39, 15, 2, 1, 'y'); ret(r, 41, 14, 2, 2, 'x'); ret(r, 35, 16, 2, 1, 'x'); }
  return r;
}

const cache = new Map();
export function quadro(tipo, op = {}) {
  const k = tipo + JSON.stringify(op);
  if (!cache.has(k)) cache.set(k, tipo === 'lado' ? lado(op) : frente(op));
  return cache.get(k);
}
export const TAMANHO = { frente: [34, 36], lado: [44, 30] };

// Poses animadas. t em milissegundos; (x, y) é o canto de cima da área de 44x38.
export const POSES = ['parada', 'anda', 'corda', 'feliz', 'latindo', 'dormindo', 'medo', 'cavando', 'petisco', 'carinho', 'pata', 'rolar', 'dancar'];
export function desenhaPose(g, pose, t, x, y, espelho = false) {
  const f = Math.floor(t / 140) % 2; const lento = Math.floor(t / 400) % 2;
  const fr = (op, dx = 5, dy = 0) => desenha(g, quadro('frente', op), x + dx, y + dy);
  switch (pose) {
    case 'anda': desenha(g, quadro('lado', { passo: f, rabo: f ? -1 : 0, orelha: f }), x, y + 6, espelho); break;
    case 'corda': desenha(g, quadro('lado', { passo: lento, rabo: f ? -1 : 0, corda: true }), x, y + 6, espelho); break;
    case 'cavando': {
      desenha(g, quadro('lado', { passo: Math.floor(t / 90) % 2, cavar: true, rabo: f ? -1 : 0 }), x, y + 6, espelho);
      g.fillStyle = '#a77b4f';
      for (let i = 0; i < 4; i++) { const k = ((t / 90) + i * 7) % 12; const px = espelho ? x + 22 + k : x + 20 - k; g.fillRect(Math.round(px), Math.round(y + 30 - Math.sin((k / 12) * Math.PI) * 8), 2, 2); }
      g.fillStyle = '#7a5533'; g.fillRect(espelho ? x + 4 : x + 30, y + 34, 10, 2);
      break;
    }
    case 'latindo': fr({ olhos: 'feliz', boca: lento ? 'aberta' : 'sorriso', rabo: f ? 2 : -1, orelha: lento }); break;
    case 'feliz': fr({ olhos: 'feliz', boca: 'aberta', rabo: f ? 2 : -1 }, 5, -Math.abs(Math.round(Math.sin(t / 160) * 3))); break;
    case 'petisco': fr({ olhos: 'feliz', petisco: true, rabo: f ? 2 : -1 }, 5, -Math.abs(Math.round(Math.sin(t / 130) * 2))); break;
    case 'carinho': {
      fr({ olhos: 'feliz', rabo: f ? 2 : -1, orelha: 1 });
      const sobe = (t / 30) % 18;
      g.fillStyle = '#ff5fa2'; const hx = x + 30; const hy = Math.round(y + 8 - sobe);
      g.fillRect(hx, hy, 2, 1); g.fillRect(hx + 3, hy, 2, 1); g.fillRect(hx, hy + 1, 5, 1); g.fillRect(hx + 1, hy + 2, 3, 1); g.fillRect(hx + 2, hy + 3, 1, 1);
      break;
    }
    case 'medo': {
      const treme = Math.floor(t / 50) % 2 ? 1 : -1;
      fr({ olhos: 'medo', boca: 'medo', orelha: -2, rabo: -3 }, 5 + treme, 0);
      g.fillStyle = '#7fc8ff'; g.fillRect(x + 32, y + 6 + (lento ? 1 : 0), 2, 3); g.fillRect(x + 33, y + 5 + (lento ? 1 : 0), 1, 1);
      break;
    }
    case 'dormindo': {
      fr({ olhos: 'fechados' });
      if (lento) { g.fillStyle = '#4b5ea8'; g.fillRect(x + 36, y + 2, 4, 1); g.fillRect(x + 38, y + 3, 1, 1); g.fillRect(x + 37, y + 4, 1, 1); g.fillRect(x + 36, y + 5, 4, 1); }
      break;
    }
    case 'pata': {
      // dá a pata: a patinha da frente sobe e desce
      fr({ olhos: 'feliz', boca: 'aberta', rabo: f ? 2 : -1 });
      const sobe = lento ? 7 : 3;
      g.fillStyle = '#2b2233'; g.fillRect(x + 9, y + 26 - sobe, 7, 7);
      g.fillStyle = '#ffffff'; g.fillRect(x + 10, y + 27 - sobe, 5, 5);
      g.fillStyle = '#ffc2d4'; g.fillRect(x + 11, y + 30 - sobe, 3, 1);
      break;
    }
    case 'rolar': {
      g.save(); g.translate(x + 22, y + 20); g.rotate(((t % 1200) / 1200) * Math.PI * 2);
      desenha(g, quadro('frente', { olhos: 'feliz', boca: 'aberta' }), -17, -20); g.restore();
      break;
    }
    case 'dancar': fr({ olhos: 'feliz', boca: 'aberta', rabo: f ? 2 : -2, orelha: lento }, 5 + Math.round(Math.sin(t / 150) * 4), -Math.abs(Math.round(Math.sin(t / 150) * 4))); break;
    default: fr({ olhos: (t % 3200) < 140 ? 'fechados' : 'abertos', rabo: f ? 1 : 0 });
  }
}

// Falas padrão (no jogo elas vêm do banco e o professor pode editar). Cada uma tem a pose e o número de latidos.
export const FALAS_PADRAO = [
  { pose: 'latindo', latidos: 2, texto: 'Au! Au! Eu sou a Rosalina, a guardiã oficial da Vila dos Planos.' },
  { pose: 'medo', latidos: 0, texto: 'Você viu as galinhas? Elas me olham de um jeito estranho. Pode ir na frente que eu vou atrás.' },
  { pose: 'petisco', latidos: 1, texto: 'Isso é um petisco? Para mim? Você é a melhor pessoa desta Vila inteira!' },
  { pose: 'corda', latidos: 1, texto: 'Eu trouxe a minha corda. Vamos brincar só um pouquinho antes da fase?' },
  { pose: 'cavando', latidos: 0, texto: 'Estou cavando para achar o planejamento do Barão. Até agora, só terra.' },
  { pose: 'carinho', latidos: 0, texto: 'Carinho atrás da orelha conta como AdmBux? Para mim conta.' },
  { pose: 'feliz', latidos: 2, texto: 'Passeio! Alguém disse passeio? Eu ouvi passeio!' },
  { pose: 'dormindo', latidos: 0, texto: 'Zzz... sonhando com uma planilha bem organizada... e com petisco... Zzz...' },
];
