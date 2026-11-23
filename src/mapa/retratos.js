// Retratos dos moradores para a caixa de conversa: uma ilustração de busto de cada personagem (como nos jogos de RPG),
// desenhada em vetor sobre um cenário que combina com ele, com moldura dourada. Saem em 192 px e aparecem em 96.
import { MORADORES } from './moradores.js';

const T = 96; const ESC = 2;
const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const mistura = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a); const y = p(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; };
const degrade = (g, de, ate, passo = 4) => { for (let y = 0; y < T; y += passo) { g.fillStyle = mistura(de, ate, y / T); g.fillRect(0, y, T, passo); } };
const bloco = (g, x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(Math.round(x), Math.round(y), w, h); };

// ---------- cenários (canvas, coordenadas em 96x96) ----------
const FUNDOS = {
  consultor(g) {
    degrade(g, '#141c4a', '#4560b0');
    for (let i = 0; i < 18; i++) { const x = Math.floor(hash(i, 1) * 22) * 4 + 2; const y = Math.floor(hash(i, 2) * 14) * 4 + 2; bloco(g, x, y, i % 4 ? 2 : 4, i % 4 ? 2 : 4, i % 3 ? '#fff6c8' : '#ffd86b'); }
    g.fillStyle = '#ffe28a'; g.beginPath(); g.arc(80, 18, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = mistura('#141c4a', '#4560b0', 0.2); g.beginPath(); g.arc(84, 15, 8, 0, Math.PI * 2); g.fill();
  },
  barao(g) {
    degrade(g, '#4a121a', '#962c39');
    for (let x = 0; x < T; x += 12) { bloco(g, x, 0, 3, T, 'rgba(0,0,0,0.22)'); bloco(g, x + 6, 0, 2, T, 'rgba(255,255,255,0.08)'); }
    for (let x = 0; x < T; x += 6) bloco(g, x, 4, 4, 6, '#d9a441');
  },
  senhora(g) {
    bloco(g, 0, 0, T, T, '#e9f4e2');
    for (let x = 0; x <= T; x += 16) bloco(g, x, 0, 1, T, '#9cc59a');
    for (let y = 0; y <= T; y += 12) bloco(g, 0, y, T, 1, '#9cc59a');
    bloco(g, 0, 0, T, 12, '#5b9b5f'); bloco(g, 64, 36, 16, 12, 'rgba(255,214,80,0.55)');
  },
  crianca(g) {
    degrade(g, '#bcd8ff', '#e7f1ff');
    [[6, 10, '#ffe27a'], [72, 14, '#ff9ec4'], [6, 56, '#9be59b'], [74, 58, '#ffe27a']].forEach(([x, y, cor]) => { bloco(g, x + 2, y + 2, 16, 16, 'rgba(0,0,0,0.18)'); bloco(g, x, y, 16, 16, cor); bloco(g, x + 3, y + 5, 10, 2, 'rgba(0,0,0,0.25)'); bloco(g, x + 3, y + 10, 7, 2, 'rgba(0,0,0,0.25)'); });
  },
  monge(g) {
    degrade(g, '#ffd488', '#e8793c');
    g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(48, 60, 24, 0, Math.PI * 2); g.fill();
    bloco(g, 0, 78, T, 18, '#4a2c20'); bloco(g, 6, 70, 24, 8, '#4a2c20'); bloco(g, 12, 64, 12, 6, '#4a2c20'); bloco(g, 66, 70, 24, 8, '#4a2c20'); bloco(g, 72, 64, 12, 6, '#4a2c20');
  },
  operario(g) {
    bloco(g, 0, 0, T, T, '#f4c430');
    for (let i = -T; i < T * 2; i += 24) { g.fillStyle = '#26232e'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 12, 0); g.lineTo(i + 12 - T, T); g.lineTo(i - T, T); g.fill(); }
  },
};

// ---------- personagens (SVG em 96x96) ----------
const K = '#2d2430';
const OL = `stroke="${K}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
const olho = (x, y, cor = '#2d2430', r = 2.4) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.25}" fill="${cor}"/><circle cx="${x + 0.8}" cy="${y - 1}" r="0.9" fill="#fff"/>`;
const estrela = (x, y, r, cor = '#ffd86b') => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const q = i % 2 ? r * 0.45 : r; p.push(`${(x + Math.cos(a) * q).toFixed(1)},${(y + Math.sin(a) * q).toFixed(1)}`); } return `<polygon points="${p.join(' ')}" fill="${cor}"/>`; };
const orelhas = (pele, sombra) => `<ellipse cx="31.5" cy="47" rx="3.2" ry="5" fill="${pele}" ${OL}/><ellipse cx="64.5" cy="47" rx="3.2" ry="5" fill="${pele}" ${OL}/><ellipse cx="31.8" cy="47.5" rx="1.2" ry="2.5" fill="${sombra}"/><ellipse cx="64.2" cy="47.5" rx="1.2" ry="2.5" fill="${sombra}"/>`;
// cabeça: pescoço, rosto, bochechas e nariz
const cabeca = (pele, sombra, { rx = 16, ry = 19, cy = 46 } = {}) => `
  <path d="M40 ${cy + ry - 4} L40 ${cy + ry + 8} L56 ${cy + ry + 8} L56 ${cy + ry - 4}Z" fill="${sombra}" ${OL}/>
  ${orelhas(pele, sombra)}
  <ellipse cx="48" cy="${cy}" rx="${rx}" ry="${ry}" fill="${pele}" ${OL}/>
  <ellipse cx="38.5" cy="${cy + 6}" rx="4" ry="2.6" fill="#e58a7a" opacity="0.35"/><ellipse cx="57.5" cy="${cy + 6}" rx="4" ry="2.6" fill="#e58a7a" opacity="0.35"/>
  <path d="M48 ${cy - 1} Q45.5 ${cy + 7} 47 ${cy + 8.5} Q48 ${cy + 9.5} 49.5 ${cy + 8.5}" fill="none" stroke="${K}" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>`;

const SVG = {
  consultor: () => `
    <path d="M4 96 Q6 70 32 64 L64 64 Q90 70 92 96Z" fill="#2c3e78" ${OL}/><path d="M32 64 Q48 80 64 64 L60 66 Q48 74 36 66Z" fill="#3e56a0"/>
    <path d="M30 70 L26 96 M66 70 L70 96" stroke="#1d2a58" stroke-width="2" fill="none"/>
    ${estrela(18, 86, 3)}${estrela(80, 82, 2.4)}${estrela(70, 92, 2)}
    <path d="M25 40 Q22 62 30 78 L36 66 L34 44Z" fill="#cfd2e2" ${OL}/><path d="M71 40 Q74 62 66 78 L60 66 L62 44Z" fill="#cfd2e2" ${OL}/>
    ${cabeca('#f1c9a5', '#d9a87f')}
    <path d="M31 52 Q29 84 48 92 Q67 84 65 52 Q60 66 48 66 Q36 66 31 52Z" fill="#e7e9f4" ${OL}/>
    <path d="M40 72 Q41 82 44 86 M48 70 L48 88 M56 72 Q55 82 52 86" stroke="#b9bdd2" stroke-width="1.2" fill="none"/>
    <path d="M37 56 Q43 51 48 55 Q53 51 59 56 Q54 61 48 58 Q42 61 37 56Z" fill="#f4f5fb" ${OL}/>
    <path d="M44 62 Q48 65 52 62" fill="none" stroke="${K}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M34 41 Q40 35 46 40 L45 42 Q40 39 35 44Z" fill="#e2e4ef" ${OL}/><path d="M62 41 Q56 35 50 40 L51 42 Q56 39 61 44Z" fill="#e2e4ef" ${OL}/>
    ${olho(40, 45, '#3b5a8a')}${olho(56, 45, '#3b5a8a')}
    <path d="M13 36 Q48 22 83 36 Q48 42 13 36Z" fill="#22336a" ${OL}/>
    <path d="M27 33 Q30 12 46 8 Q58 5 70 -4 Q66 10 62 18 Q70 26 69 33 Q48 38 27 33Z" fill="#2c4290" ${OL}/>
    <path d="M27 33 Q48 38 69 33 L69 28 Q48 33 27 28Z" fill="#e6b83c" ${OL}/>
    ${estrela(40, 20, 3.4)}${estrela(56, 14, 2.6)}${estrela(60, 26, 2.2)}${estrela(34, 28, 1.8)}
    <path d="M17 26 a5 5 0 1 0 6 6 a4 4 0 1 1 -6 -6z" fill="#ffe28a" transform="translate(26 -2)"/>`,
  barao: () => `
    <path d="M2 96 Q6 70 30 64 L66 64 Q90 70 94 96Z" fill="#5a1620" ${OL}/><path d="M34 64 L48 96 L62 64 L56 64 L48 80 L40 64Z" fill="#7a2330" ${OL}/>
    <path d="M38 64 L48 88 L58 64Z" fill="#f6f0e2" ${OL}/><path d="M42 69 L48 72 L54 69 L52 76 L48 73 L44 76Z" fill="#d9a441" ${OL}/>
    <path d="M26 96 L26 74 M70 96 L70 74" stroke="#d9a441" stroke-width="2.4"/>
    ${cabeca('#f3d2b4', '#dcb08c', { rx: 15.5, ry: 20 })}
    <path d="M32 44 Q30 52 34 58 L36 50Z M64 44 Q66 52 62 58 L60 50Z" fill="#1d1a24"/>
    <path d="M36 36 Q42 32 46 37 L45 39 Q41 36 37 39Z M60 36 Q54 32 50 37 L51 39 Q55 36 59 39Z" fill="#1d1a24"/>
    ${olho(41, 44)}${olho(55, 44)}
    <circle cx="55" cy="44" r="6.4" fill="rgba(200,230,255,0.25)" stroke="#d9a441" stroke-width="1.6"/><path d="M60 48 Q66 60 62 72" fill="none" stroke="#d9a441" stroke-width="1"/>
    <path d="M36 57 Q40 53 48 56 Q56 53 60 57 Q58 62 52 60 Q48 59 44 60 Q38 62 36 57Z" fill="#1d1a24" ${OL}/><path d="M36 57 Q31 55 31 51 M60 57 Q65 55 65 51" fill="none" stroke="#1d1a24" stroke-width="2" stroke-linecap="round"/>
    <path d="M44 65 Q48 67 52 65" fill="none" stroke="${K}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="48" cy="30" rx="30" ry="7" fill="#17141f" ${OL}/>
    <path d="M29 30 L31 4 Q48 -1 65 4 L67 30 Q48 35 29 30Z" fill="#241f30" ${OL}/><path d="M29.4 25 Q48 30 66.6 25 L67 30 Q48 35 29 30Z" fill="#a8242c" ${OL}/><rect x="44" y="26" width="8" height="6" rx="1" fill="#d9a441" ${OL}/>
    <path d="M36 6 L35 24" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>`,
  senhora: () => `
    <path d="M4 96 Q6 70 30 64 L66 64 Q90 70 92 96Z" fill="#9c86d4" ${OL}/><path d="M36 64 Q48 80 60 64 Q48 70 36 64Z" fill="#f4ecff" ${OL}/><path d="M48 70 L48 96" stroke="#6e58a8" stroke-width="2"/>
    <circle cx="44" cy="72" r="1.8" fill="#f6f0e2"/><circle cx="48" cy="75" r="1.8" fill="#f6f0e2"/><circle cx="52" cy="72" r="1.8" fill="#f6f0e2"/>
    <circle cx="48" cy="14" r="9" fill="#f1f1f6" ${OL}/><path d="M41 14 Q48 8 55 14" fill="none" stroke="#c9c9d8" stroke-width="1.4"/>
    <path d="M30 40 Q28 18 48 18 Q68 18 66 40 Q60 28 48 28 Q36 28 30 40Z" fill="#f1f1f6" ${OL}/>
    ${cabeca('#c08a64', '#a06e4a', { rx: 15.5, ry: 19 })}
    <path d="M34 28 Q48 24 62 28 L63 38 Q48 28 33 38Z" fill="#f1f1f6" ${OL}/>
    <path d="M35 39 Q40 36 45 39 M51 39 Q56 36 61 39" fill="none" stroke="#c9c9d8" stroke-width="2" stroke-linecap="round"/>
    ${olho(40, 45, '#4a2c1a')}${olho(56, 45, '#4a2c1a')}
    <circle cx="40" cy="45" r="7" fill="rgba(210,235,255,0.3)" stroke="#8a5ac8" stroke-width="1.8"/><circle cx="56" cy="45" r="7" fill="rgba(210,235,255,0.3)" stroke="#8a5ac8" stroke-width="1.8"/><path d="M47 45 L49 45" stroke="#8a5ac8" stroke-width="1.8"/><path d="M33 44 L30 42 M63 44 L66 42" stroke="#8a5ac8" stroke-width="1.6"/>
    <path d="M41 58 Q48 64 55 58" fill="#a8453a" ${OL}/><path d="M43 59 Q48 62 53 59" fill="#fff" opacity="0.8"/>`,
  crianca: () => `
    <path d="M6 96 Q8 72 32 66 L64 66 Q88 72 90 96Z" fill="#f2c230" ${OL}/><path d="M38 66 Q48 76 58 66Z" fill="#c99a12" ${OL}/><text x="48" y="90" font-size="13" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#2d2430">JR</text>
    <path d="M30 34 Q10 38 12 62 Q14 72 22 72 Q22 56 30 48Z" fill="#1d1a24" ${OL}/><path d="M66 34 Q86 38 84 62 Q82 72 74 72 Q74 56 66 48Z" fill="#1d1a24" ${OL}/>
    <circle cx="20" cy="38" r="4" fill="#e0453a" ${OL}/><circle cx="76" cy="38" r="4" fill="#e0453a" ${OL}/>
    ${cabeca('#c58c5e', '#a8703f', { rx: 16.5, ry: 18.5, cy: 47 })}
    <path d="M30 42 Q30 20 48 20 Q66 20 66 42 Q60 30 48 31 Q36 30 30 42Z" fill="#1d1a24" ${OL}/><path d="M42 24 Q48 22 54 25" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/>
    <path d="M36 39 Q40 37 44 39 M52 39 Q56 37 60 39" fill="none" stroke="#1d1a24" stroke-width="1.8" stroke-linecap="round"/>
    ${olho(40, 46, '#1d1a24', 3)}${olho(56, 46, '#1d1a24', 3)}
    <path d="M39 57 Q48 67 57 57Z" fill="#a8453a" ${OL}/><path d="M42 58 L54 58 L53 61 L43 61Z" fill="#fff"/>`,
  monge: () => `
    <path d="M2 96 Q6 70 30 64 L66 64 Q90 70 94 96Z" fill="#e8892e" ${OL}/><path d="M30 64 L56 96 L48 96 L38 80Z" fill="#c96a1a" ${OL}/><path d="M66 64 L42 96 L50 96 L60 80Z" fill="#f4a24a" ${OL}/>
    <path d="M34 66 Q30 82 38 90" fill="none" stroke="#7a4a22" stroke-width="2.2" stroke-dasharray="1 4" stroke-linecap="round"/>
    ${cabeca('#a06e48', '#845636', { rx: 16.5, ry: 20, cy: 44 })}
    <path d="M38 22 Q48 14 58 22" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M35 37 Q40 34 45 37 M51 37 Q56 34 61 37" fill="none" stroke="#2a1a12" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M36 44 Q40 47 44 44 M52 44 Q56 47 60 44" fill="none" stroke="#2a1a12" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M42 57 Q48 61 54 57" fill="none" stroke="#4a2218" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="48" cy="29" r="1.6" fill="#e6b83c"/>`,
  operario1: () => operario('#d9a060', '#b8803c', '#1d1a24', true),
  operario2: () => operario('#6b4430', '#523222', '#1d1a24', false),
};
function operario(pele, sombra, cabelo, bigode) {
  return `
    <path d="M2 96 Q6 70 30 64 L66 64 Q90 70 94 96Z" fill="#f08a2a" ${OL}/><path d="M32 64 L40 96 M64 64 L56 96" stroke="#2d2430" stroke-width="2"/>
    <path d="M10 82 L86 82 M7 90 L89 90" stroke="#e8f06a" stroke-width="3.2"/><path d="M10 82 L86 82 M7 90 L89 90" stroke="#c8d04a" stroke-width="1" stroke-dasharray="5 3"/>
    ${cabeca(pele, sombra, { rx: 16, ry: 19 })}
    <path d="M35 39 Q40 36 45 39 M51 39 Q56 36 61 39" fill="none" stroke="${cabelo}" stroke-width="2.6" stroke-linecap="round"/>
    ${olho(40, 45, '#2a1a12')}${olho(56, 45, '#2a1a12')}
    ${bigode ? `<path d="M38 56 Q43 52 48 55 Q53 52 58 56 Q54 60 48 58 Q42 60 38 56Z" fill="${cabelo}" ${OL}/>` : ''}
    <path d="M42 61 Q48 65 54 61" fill="none" stroke="#4a2218" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M28 36 Q28 14 48 13 Q68 14 68 36Z" fill="#f4c430" ${OL}/><rect x="24" y="32" width="48" height="7" rx="3" fill="#e0a818" ${OL}/><path d="M48 13 L48 32" stroke="#c99a12" stroke-width="3"/><path d="M38 20 Q42 16 48 16" stroke="rgba(255,255,255,0.5)" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
}

const prontos = new Map();
export function retratoMorador(quem) {
  if (!prontos.has(quem)) prontos.set(quem, desenhar(quem).catch((e) => { prontos.delete(quem); throw e; }));
  return prontos.get(quem);
}

function carregar(svg) {
  return new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error('retrato')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
}

async function desenhar(quem) {
  if (!MORADORES[quem]) throw new Error('sem retrato');
  const c = document.createElement('canvas'); c.width = c.height = T * ESC; const g = c.getContext('2d');
  g.scale(ESC, ESC); g.imageSmoothingEnabled = false;
  (FUNDOS[quem] ?? FUNDOS[quem.startsWith('operario') ? 'operario' : 'crianca'])(g);
  const img = await carregar(`<svg xmlns="http://www.w3.org/2000/svg" width="${T * ESC}" height="${T * ESC}" viewBox="0 0 96 96">${(SVG[quem] ?? SVG.crianca)()}</svg>`);
  g.imageSmoothingEnabled = true; g.drawImage(img, 0, 0, T, T);
  // escurecido leve nas bordas e moldura dourada
  const v = g.createRadialGradient(T / 2, T / 2, T * 0.34, T / 2, T / 2, T * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,6,20,0.32)');
  g.fillStyle = v; g.fillRect(0, 0, T, T);
  bloco(g, 0, 0, T, 4, '#24160e'); bloco(g, 0, T - 4, T, 4, '#24160e'); bloco(g, 0, 0, 4, T, '#24160e'); bloco(g, T - 4, 0, 4, T, '#24160e');
  bloco(g, 4, 4, T - 8, 2, '#c89a4b'); bloco(g, 4, T - 6, T - 8, 2, '#c89a4b'); bloco(g, 4, 4, 2, T - 8, '#c89a4b'); bloco(g, T - 6, 4, 2, T - 8, '#c89a4b');
  for (const [x, y] of [[4, 4], [T - 8, 4], [4, T - 8], [T - 8, T - 8]]) bloco(g, x, y, 4, 4, '#f7c548');
  return c.toDataURL();
}
