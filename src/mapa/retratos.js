// Retratos dos moradores para a caixa de conversa: ilustrações de busto no estilo de RPG (luz suave, degradês, olhos
// detalhados), cada uma sobre um cenário pintado que combina com o personagem, com moldura de madeira e ouro.
// Tudo é vetor (SVG), desenhado em 96x96 e rasterizado em 288 px; a caixa de conversa mostra em 120.
import { MORADORES } from './moradores.js';

const T = 96; const ESC = 3;

// ---------- peças de desenho ----------
const grad = (id, de, ate, x1 = 0, y1 = 0, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${de}"/><stop offset="1" stop-color="${ate}"/></linearGradient>`;
const radial = (id, de, ate, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${de}"/><stop offset="1" stop-color="${ate}"/></radialGradient>`;
const estrela = (x, y, r, cor = '#ffe9a0', op = 1) => { const p = []; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 4; const q = i % 2 ? r * 0.28 : r; p.push(`${(x + Math.cos(a) * q).toFixed(1)},${(y + Math.sin(a) * q).toFixed(1)}`); } return `<polygon points="${p.join(' ')}" fill="${cor}" opacity="${op}"/>`; };
const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const DEFS_COMUNS = `<filter id="mole" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter><filter id="mole2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter><filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// Rosto de frente, com pescoço, orelhas, olhos, sobrancelhas, nariz e boca. Cada personagem escolhe as cores.
function rosto({ id, pele: [claro, medio, escuro], iris = '#5a3a22', sobr = '#2a1a12', labio = '#b0524a', bochecha = '#e88a78', olhosFechados = false, sorriso = 1, sobrAng = 0, rugas = false, largura = 1 }) {
  const w = 17.5 * largura;
  const rostoPath = `M${48 - w} 38 C${48 - w} 24 39 17.5 48 17.5 C57 17.5 ${48 + w} 24 ${48 + w} 38 C${48 + w} 50 60.5 61 53 64.5 C50.5 65.6 45.5 65.6 43 64.5 C35.5 61 ${48 - w} 50 ${48 - w} 38Z`;
  const olho = (cx, esq) => {
    const s = esq ? -1 : 1;
    if (olhosFechados) return `<path d="M${cx - 5.4} 42.2 Q${cx} ${45.4} ${cx + 5.4} 42.2" fill="none" stroke="#2a1a12" stroke-width="1.5" stroke-linecap="round"/><path d="M${cx - 5.4} 42.4 Q${cx - 6.2} 43.6 ${cx - 6.8} 44" fill="none" stroke="#2a1a12" stroke-width="0.9" stroke-linecap="round"/>`;
    return `<path d="M${cx - 5.4} 42 Q${cx} 38.4 ${cx + 5.4} 42 Q${cx} 45.2 ${cx - 5.4} 42Z" fill="#f1e9de"/>
      <circle cx="${cx + s * 0.2}" cy="42" r="3.5" fill="url(#iris-${id})"/><circle cx="${cx + s * 0.2}" cy="42" r="1.6" fill="#140c0a"/>
      <circle cx="${cx + 1}" cy="40.8" r="0.95" fill="#fff"/><circle cx="${cx - 0.9}" cy="43.1" r="0.45" fill="#fff" opacity="0.8"/>
      <path d="M${cx - 6.1} 42.2 Q${cx - 0.5} 37 ${cx + 6.2} 41.8" fill="none" stroke="#24150f" stroke-width="1.15" stroke-linecap="round"/>
      <path d="M${cx - 6.1} 42.2 Q${cx - 7} 41.2 ${cx - 7.4} 40" fill="none" stroke="#24150f" stroke-width="0.9" stroke-linecap="round"/>
      <path d="M${cx - 4.8} 44.6 Q${cx} 46.3 ${cx + 4.8} 44.4" fill="none" stroke="${escuro}" stroke-width="0.7" opacity="0.6"/>`;
  };
  const brow = (cx, esq) => { const s = esq ? 1 : -1; const a = sobrAng; return `<path d="M${cx - 6.4 * s} ${36.6 + a * s} Q${cx} ${33.6 - a} ${cx + 6.4 * s} ${35.6 - a * s}" fill="none" stroke="${sobr}" stroke-width="1.5" stroke-linecap="round"/>`; };
  return `
    <defs>
      ${grad(`pele-${id}`, claro, medio, 0.15, 0, 0.85, 1)}${radial(`iris-${id}`, '#ffffff', iris, 0.5, 0.5, 0.9)}${radial(`bo-${id}`, bochecha, bochecha)}${grad(`pescoco-${id}`, medio, escuro, 0, 0, 0, 1)}
    </defs>
    <path d="M40.5 58 L40.5 76 Q48 80 55.5 76 L55.5 58Z" fill="url(#pescoco-${id})"/>
    <ellipse cx="${48 - w - 0.6}" cy="43.5" rx="3" ry="5.2" fill="${medio}"/><ellipse cx="${48 + w + 0.6}" cy="43.5" rx="3" ry="5.2" fill="${medio}"/>
    <ellipse cx="${48 - w - 0.4}" cy="43.8" rx="1.2" ry="2.8" fill="${escuro}" opacity="0.55"/><ellipse cx="${48 + w + 0.4}" cy="43.8" rx="1.2" ry="2.8" fill="${escuro}" opacity="0.55"/>
    <path d="${rostoPath}" fill="url(#pele-${id})"/>
    <path d="${rostoPath}" fill="none" stroke="${escuro}" stroke-width="0.9" opacity="0.5"/>
    <path d="M${48 + w - 4} 30 Q${48 + w + 1} 46 ${48 + w - 8} 60 Q${48 + w - 2} 48 ${48 + w - 4} 30Z" fill="${escuro}" opacity="0.28" filter="url(#mole)"/>
    <ellipse cx="38" cy="50.5" rx="4.6" ry="3" fill="url(#bo-${id})" opacity="0.42" filter="url(#mole)"/><ellipse cx="58" cy="50.5" rx="4.6" ry="3" fill="url(#bo-${id})" opacity="0.42" filter="url(#mole)"/>
    ${rugas ? `<path d="M37 30 Q48 27.5 59 30 M38 32.6 Q48 30.4 58 32.6" fill="none" stroke="${escuro}" stroke-width="0.7" opacity="0.5"/><path d="M33 43 q-2 1.6 -2.4 3.6 M63 43 q2 1.6 2.4 3.6" fill="none" stroke="${escuro}" stroke-width="0.7" opacity="0.5"/>` : ''}
    ${olho(40, true)}${olho(56, false)}${brow(40, true)}${brow(56, false)}
    <path d="M47.6 41 Q46 48.5 45.6 51 Q48 53.3 50.4 51 Q50 48.6 49.4 45" fill="none" stroke="${escuro}" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
    <path d="M50.2 44 Q51.6 49 50.4 51.4 Q52 51.2 52.4 50.4 Q51.8 47 50.6 43.4Z" fill="${escuro}" opacity="0.2"/><ellipse cx="47.6" cy="50.4" rx="1.1" ry="0.7" fill="#fff" opacity="0.4"/>
    <path d="M42.4 ${57.2 - sorriso * 0.4} Q48 ${58.4 + sorriso * 3} 53.6 ${57.2 - sorriso * 0.4}" fill="none" stroke="#5a2420" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M43.4 57.6 Q48 ${59.2 + sorriso * 4} 52.6 57.6 Q48 ${58.6 + sorriso * 1.4} 43.4 57.6Z" fill="${labio}"/>
    <ellipse cx="47.6" cy="${59.6 + sorriso * 0.6}" rx="1.6" ry="0.5" fill="#fff" opacity="0.35"/>`;
}

// ---------- cenários ----------
const FUNDOS = {
  consultor: () => `
    <defs>${grad('f', '#0d1238', '#3c55a8', 0, 0, 0, 1)}${radial('lua', '#fff3c0', 'rgba(255,243,192,0)')}</defs>
    <rect width="96" height="96" fill="url(#f)"/>
    <circle cx="76" cy="20" r="16" fill="url(#lua)"/>
    ${Array.from({ length: 34 }, (_, i) => estrela(hash(i, 1) * 96, hash(i, 2) * 62, 0.8 + hash(i, 3) * 1.6, '#fff6d0', 0.4 + hash(i, 4) * 0.6)).join('')}
    <path d="M70 14 a8 8 0 1 0 8 10 a6.4 6.4 0 1 1 -8 -10z" fill="#ffe9a0"/>
    <path d="M0 84 L12 68 L22 78 L36 62 L50 80 L64 66 L80 80 L96 70 L96 96 L0 96Z" fill="#141a48" opacity="0.8"/>`,
  barao: () => `
    <defs>${grad('f', '#3a0d14', '#8e222e', 0, 0, 0, 1)}${radial('luz', 'rgba(255,215,140,0.55)', 'rgba(255,215,140,0)', 0.5, 0.42, 0.55)}</defs>
    <rect width="96" height="96" fill="url(#f)"/>
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 12} 0 Q${i * 12 + 6} 48 ${i * 12} 96 L${i * 12 + 7} 96 Q${i * 12 + 13} 48 ${i * 12 + 7} 0Z" fill="${i % 2 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.07)'}"/>`).join('')}
    <rect width="96" height="96" fill="url(#luz)"/>
    <rect y="0" width="96" height="9" fill="#d9a441"/><rect y="9" width="96" height="2" fill="#7a5418"/>
    ${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 6} 11 L${i * 6 + 3} 17 L${i * 6 + 6} 11Z" fill="#d9a441"/>`).join('')}`,
  senhora: () => `
    <defs>${grad('f', '#f4f8ee', '#dcebd4', 0, 0, 0, 1)}</defs>
    <rect width="96" height="96" fill="url(#f)"/>
    ${Array.from({ length: 7 }, (_, i) => `<path d="M${i * 16} 0 V96" stroke="#a8cfa4" stroke-width="0.8"/>`).join('')}${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${i * 12} H96" stroke="#a8cfa4" stroke-width="0.8"/>`).join('')}
    <rect width="96" height="12" fill="#4f9a5c"/><rect x="66" y="26" width="16" height="12" fill="#ffd650" opacity="0.5"/>
    <rect x="6" y="58" width="9" height="28" fill="#6cb87a" opacity="0.55"/><rect x="18" y="48" width="9" height="38" fill="#6cb87a" opacity="0.5"/><rect x="72" y="52" width="9" height="34" fill="#6cb87a" opacity="0.55"/><rect x="84" y="62" width="9" height="24" fill="#6cb87a" opacity="0.5"/>
    <rect width="96" height="96" fill="rgba(255,255,255,0.18)" filter="url(#mole2)"/>`,
  crianca: () => `
    <defs>${grad('f', '#b9d6ff', '#eaf3ff', 0, 0, 0, 1)}</defs>
    <rect width="96" height="96" fill="url(#f)"/>
    ${[[6, 8, '#ffe27a', -6], [70, 10, '#ff9ec4', 7], [4, 52, '#9be59b', 5], [72, 56, '#ffe27a', -4], [78, 30, '#9ed0ff', 3]].map(([x, y, c, r]) => `<g transform="rotate(${r} ${x + 9} ${y + 9})"><rect x="${x + 1.5}" y="${y + 2}" width="18" height="18" fill="rgba(0,0,0,0.16)"/><rect x="${x}" y="${y}" width="18" height="18" fill="${c}"/><rect x="${x + 3}" y="${y + 5}" width="11" height="1.6" fill="rgba(0,0,0,0.25)"/><rect x="${x + 3}" y="${y + 9}" width="8" height="1.6" fill="rgba(0,0,0,0.25)"/></g>`).join('')}`,
  monge: () => `
    <defs>${grad('f', '#ffdc9a', '#ea7b3c', 0, 0, 0, 1)}${radial('sol', '#fffbe0', 'rgba(255,240,170,0)', 0.5, 0.5, 0.5)}</defs>
    <rect width="96" height="96" fill="url(#f)"/>
    <circle cx="48" cy="56" r="34" fill="url(#sol)"/><circle cx="48" cy="56" r="20" fill="#fff3bf"/>
    <path d="M0 80 L0 70 L10 70 L14 62 L18 70 L28 70 L28 80Z M66 80 L66 70 L76 70 L80 60 L84 70 L96 70 L96 80Z" fill="#6a3a24" opacity="0.8"/>
    <rect y="80" width="96" height="16" fill="#4a2a1c"/><ellipse cx="48" cy="82" rx="60" ry="5" fill="rgba(255,255,255,0.25)" filter="url(#mole2)"/>`,
  operario: () => `
    <defs>${grad('f', '#f9cf4a', '#ec9a28', 0, 0, 0, 1)}</defs>
    <rect width="96" height="96" fill="url(#f)"/>
    <path d="M10 0 V96 M34 0 V96 M62 0 V96 M86 0 V96" stroke="rgba(90,60,10,0.35)" stroke-width="3"/><path d="M0 22 H96 M0 54 H96" stroke="rgba(90,60,10,0.3)" stroke-width="3"/>
    <rect width="96" height="96" fill="rgba(255,235,160,0.3)" filter="url(#mole2)"/>
    ${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 16 - 6} 96 L${i * 16 + 4} 80 L${i * 16 + 12} 80 L${i * 16 + 2} 96Z" fill="#26232e"/>`).join('')}`,
};

// ---------- personagens ----------
const CAB = (id, claro, escuro) => grad(`h-${id}`, claro, escuro, 0, 0, 0.4, 1);
const fio = (d, cor, op = 0.55, w = 0.7) => `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;

const SVG = {
  consultor: () => `
    <defs>${CAB('co', '#f6f7ff', '#b9bddb')}${grad('rb', '#3c54a8', '#17224f', 0, 0, 0, 1)}${grad('ch', '#3d5bb8', '#1b2a66', 0.1, 0, 0.9, 1)}${grad('barba', '#fbfbff', '#c4c8e0', 0, 0, 0, 1)}</defs>
    <path d="M2 96 Q4 70 30 64 L66 64 Q92 70 94 96Z" fill="url(#rb)"/>
    <path d="M30 64 Q48 82 66 64 Q58 69 48 70 Q38 69 30 64Z" fill="#e6b83c"/><path d="M33 65 Q48 79 63 65" fill="none" stroke="#fff0a8" stroke-width="0.8" opacity="0.7"/>
    ${[[14, 84], [26, 90], [74, 86], [84, 78], [60, 92]].map(([x, y], i) => estrela(x, y, 2.4 + (i % 2), '#ffe28a', 0.85)).join('')}
    <path d="M18 96 Q22 78 34 70 M78 96 Q74 78 62 70" fill="none" stroke="#0f1840" stroke-width="1.4" opacity="0.5"/>
    <path d="M28 36 Q22 60 28 80 Q34 72 36 60 L34 40Z" fill="url(#h-co)"/><path d="M68 36 Q74 60 68 80 Q62 72 60 60 L62 40Z" fill="url(#h-co)"/>
    ${rosto({ id: 'co', pele: ['#f7d9bd', '#e6b891', '#b98660'], iris: '#4a7cc0', sobr: '#e9ebf6', labio: '#b45f58', rugas: true, sorriso: 0.6 })}
    <path d="M31.5 52 Q29 86 48 94 Q67 86 64.5 52 Q60 66 48 67 Q36 66 31.5 52Z" fill="url(#barba)"/>
    ${fio('M38 70 Q40 82 44 90 M48 68 L48 92 M58 70 Q56 82 52 90 M34 62 Q34 76 40 86 M62 62 Q62 76 56 86', '#9a9fc0', 0.7)}
    <path d="M36 56 Q42 51.6 48 55.4 Q54 51.6 60 56 Q55 61.6 48 59 Q41 61.6 36 56Z" fill="url(#barba)"/>${fio('M38 56.4 Q42 54.4 46 56.6 M58 56.4 Q54 54.4 50 56.6', '#9a9fc0', 0.7)}
    <path d="M33.4 38.4 Q39.4 31.6 46 37.2 L45.4 40 Q40 36.4 34.6 41.4Z" fill="#f0f2fb"/><path d="M62.6 38.4 Q56.6 31.6 50 37.2 L50.6 40 Q56 36.4 61.4 41.4Z" fill="#f0f2fb"/>
    <ellipse cx="48" cy="36.5" rx="31" ry="6.4" fill="rgba(8,12,40,0.45)" filter="url(#mole)"/>
    <ellipse cx="48" cy="31.6" rx="33" ry="7.4" fill="#1d2c6e"/><ellipse cx="48" cy="30.4" rx="33" ry="6.6" fill="url(#ch)"/>
    <path d="M26 30.4 Q28 10 44 5.6 Q58 2.4 72 -6 Q66 8 63 17 Q69 24 70 31 Q48 36 26 30.4Z" fill="url(#ch)"/>
    <path d="M28 27 Q48 32.6 69 27 L69.4 31 Q48 36.6 27.6 31Z" fill="#e6b83c"/><path d="M28 27.4 Q48 32.6 69 27.4" fill="none" stroke="#fff0a8" stroke-width="0.7"/>
    <path d="M32 24 Q36 10 46 7.4" fill="none" stroke="#8aa4ee" stroke-width="1.4" opacity="0.5"/>
    <g filter="url(#brilho)">${estrela(40, 19, 3.6, '#ffe9a0')}${estrela(55, 12, 2.8, '#ffe9a0')}${estrela(60, 23, 2.2, '#ffe9a0')}${estrela(34, 27, 1.8, '#ffe9a0')}${estrela(66, 4, 1.8, '#ffe9a0')}</g>
    <path d="M50 17 a4.4 4.4 0 1 0 4.4 5.6 a3.4 3.4 0 1 1 -4.4 -5.6z" fill="#ffe28a" opacity="0.9"/>`,
  barao: () => `
    <defs>${CAB('ba', '#2c2a34', '#0e0d14')}${grad('ca', '#9a2a38', '#4a0f1a', 0, 0, 0, 1)}${grad('cha', '#3a3646', '#12101a', 0, 0, 1, 1)}</defs>
    <path d="M0 96 Q4 70 30 64 L66 64 Q92 70 96 96Z" fill="url(#ca)"/>
    <path d="M34 64 L48 98 L62 64 L56 64 L48 82 L40 64Z" fill="#c8404e"/><path d="M38 64 L48 90 L58 64Z" fill="#f8f2e4"/>
    ${fio('M44 68 L48 86 M52 68 L48 86', '#c9bfa8', 0.6)}
    <path d="M42 66 L48 70 L54 66 L53 75 L48 72 L43 75Z" fill="#d9a441"/><path d="M43 67 L48 70.4 L53 67" fill="none" stroke="#fff0a8" stroke-width="0.6"/>
    <circle cx="28" cy="84" r="1.8" fill="#e6b83c"/><circle cx="68" cy="84" r="1.8" fill="#e6b83c"/><circle cx="26" cy="92" r="1.8" fill="#e6b83c"/><circle cx="70" cy="92" r="1.8" fill="#e6b83c"/>
    ${fio('M14 84 Q20 76 30 72 M82 84 Q76 76 66 72', '#e6b83c', 0.8, 1.2)}
    <path d="M30 34 Q28 50 33 58 L35.4 46Z M66 34 Q68 50 63 58 L60.6 46Z" fill="#14121a"/>
    ${rosto({ id: 'ba', pele: ['#fbe3cc', '#eec1a0', '#c08e6e'], iris: '#5a6a7a', sobr: '#14121a', labio: '#c0645c', sobrAng: 1.2, sorriso: 0.2, largura: 0.96 })}
    <path d="M30 32 Q48 14 66 32 Q60 24 48 24 Q36 24 30 32Z" fill="url(#h-ba)"/>
    <path d="M35.6 55.4 Q41 51.4 48 54.6 Q55 51.4 60.4 55.4 Q58 61 52 59.2 Q48 58.4 44 59.2 Q38 61 35.6 55.4Z" fill="#14121a"/>
    <path d="M36 55.6 Q30.4 56 30 51.6 Q32 53.4 35 52.6 M60 55.6 Q65.6 56 66 51.6 Q64 53.4 61 52.6" fill="none" stroke="#14121a" stroke-width="1.8" stroke-linecap="round"/>
    ${fio('M40 55.4 Q44 54 47 55.4 M56 55.4 Q52 54 49 55.4', '#5a5668', 0.7)}
    <circle cx="56" cy="42" r="7.4" fill="rgba(210,235,255,0.2)" stroke="#e6b83c" stroke-width="1.4"/><path d="M50.8 38 Q54 36.4 57 36.8" fill="none" stroke="#fff" stroke-width="0.9" opacity="0.8"/>
    <path d="M63 46 Q68 58 62 74" fill="none" stroke="#e6b83c" stroke-width="0.9"/>
    <ellipse cx="48" cy="29.6" rx="31" ry="7.4" fill="#0e0d14"/><ellipse cx="48" cy="28.6" rx="31" ry="6.6" fill="url(#cha)"/>
    <path d="M30 28 L31.6 3.6 Q48 -1 64.4 3.6 L66 28 Q48 33.4 30 28Z" fill="url(#cha)"/>
    <path d="M30.2 22 Q48 28.4 65.8 22 L66 28 Q48 33.4 30 28Z" fill="#a8242c"/><path d="M30.4 23 Q48 29 65.6 23" fill="none" stroke="#e08080" stroke-width="0.6" opacity="0.7"/>
    <rect x="43.4" y="23.2" width="9.2" height="6.6" rx="1.2" fill="#e6b83c" stroke="#7a5418" stroke-width="0.6"/><rect x="46" y="25" width="4" height="3" fill="#a87820"/>
    <path d="M36 6 Q35 16 36.4 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.2" filter="url(#mole)"/>`,
  senhora: () => `
    <defs>${CAB('se', '#ffffff', '#cfcfe0')}${grad('ca', '#b5a2e6', '#6f58b0', 0, 0, 0, 1)}</defs>
    <path d="M2 96 Q6 70 30 64 L66 64 Q90 70 94 96Z" fill="url(#ca)"/>
    <path d="M36 64 Q48 82 60 64 Q54 68 48 69 Q42 68 36 64Z" fill="#f4ecff"/><path d="M48 70 L48 96" stroke="#5c4592" stroke-width="1.2"/>
    ${fio('M24 96 Q26 82 34 74 M72 96 Q70 82 62 74', '#4a3678', 0.45, 1.2)}
    ${Array.from({ length: 9 }, (_, i) => { const a = 0.15 + (i / 8) * 0.7; return `<circle cx="${(48 - 10 * Math.cos(a * Math.PI)).toFixed(1)}" cy="${(70 + 8 * Math.sin(a * Math.PI)).toFixed(1)}" r="1.5" fill="#fbf6ee" stroke="#c9bfa8" stroke-width="0.3"/>`; }).join('')}
    <circle cx="48" cy="12" r="9.5" fill="url(#h-se)"/>${fio('M41 14 Q48 6 55 14 M43 10 Q48 7 53 10', '#b8b8cc', 0.7)}
    <path d="M52 8 L66 -2" stroke="#e6b83c" stroke-width="1.6" stroke-linecap="round"/><path d="M52 8 L54 6" stroke="#c0453a" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M29 42 Q24 18 48 17 Q72 18 67 42 Q60 28 48 28 Q36 28 29 42Z" fill="url(#h-se)"/>
    ${rosto({ id: 'se', pele: ['#d9a07a', '#bd8060', '#8a5a40'], iris: '#4a2c1a', sobr: '#cfcfe0', labio: '#a8453a', bochecha: '#e07868', sorriso: 1.3, rugas: false })}
    <path d="M33 26 Q48 20.4 63 26 L64 36 Q48 26.4 32 36Z" fill="url(#h-se)"/>${fio('M36 24 Q48 20 60 24 M34 30 Q40 25 46 24', '#ffffff', 0.9, 1)}
    ${fio('M36 37 Q40 32.6 45 36 M51 36 Q56 32.6 60 37', '#b8b8cc', 0.9, 2)}
    <circle cx="40" cy="42" r="7.6" fill="rgba(215,238,255,0.22)" stroke="#8a5ac8" stroke-width="1.5"/><circle cx="56" cy="42" r="7.6" fill="rgba(215,238,255,0.22)" stroke="#8a5ac8" stroke-width="1.5"/>
    <path d="M47.6 41 Q48 40 48.4 41" fill="none" stroke="#8a5ac8" stroke-width="1.5"/><path d="M32.4 41 L29.6 39.4 M63.6 41 L66.4 39.4" stroke="#8a5ac8" stroke-width="1.3"/>
    <path d="M34.6 37.4 Q38 35.6 41 36.4 M51.6 36.2 Q54.6 35.6 58 37.4" fill="none" stroke="#fff" stroke-width="0.9" opacity="0.75"/>`,
  crianca: () => `
    <defs>${CAB('cr', '#3a3140', '#0f0c14')}${grad('ca', '#f6cb3c', '#d19c14', 0, 0, 0, 1)}</defs>
    <path d="M4 96 Q8 72 32 66 L64 66 Q88 72 92 96Z" fill="url(#ca)"/>
    <path d="M38 66 Q48 75 58 66 Q54 70 48 71 Q42 70 38 66Z" fill="#c4900c"/>
    ${fio('M16 96 Q20 82 30 74 M80 96 Q76 82 66 74', '#a8780c', 0.5, 1.2)}
    <path d="M44 66 L44 82 L52 82 L52 66" fill="#2f6fb8" opacity="0.95"/><rect x="40.4" y="80" width="15.2" height="11" rx="1.4" fill="#fff" stroke="#6a8ab8" stroke-width="0.7"/><rect x="43" y="82.6" width="10" height="1.6" fill="#2f6fb8"/><rect x="43" y="86" width="7" height="1.2" fill="#9aa8c0"/>
    <path d="M27 42 Q20 18 40 13 Q54 9 66 15 Q78 24 69 42 Q68 30 61 26 Q54 33 48 28 Q42 33 35 26 Q28 30 27 42Z" fill="url(#h-cr)"/>
    ${rosto({ id: 'cr', pele: ['#d9a070', '#bd8352', '#8a5832'], iris: '#2a1a12', sobr: '#1a1218', labio: '#b0524a', bochecha: '#f08a70', sorriso: 1.6, largura: 0.98 })}
    <path d="M30 36 Q30 22 44 20 Q38 26 40 33 Q44 27 50 27 Q58 27 62 34 Q64 24 54 20 Q68 22 66 36 Q62 28 56 26 Q48 30 40 26 Q33 29 30 36Z" fill="url(#h-cr)"/>
    ${fio('M40 22 Q46 20 52 22 M36 27 Q40 24 44 24', '#8a7a98', 0.9, 1.2)}
    <path d="M43 56.4 Q48 59 53 56.4 L52.4 58.8 Q48 60.4 43.6 58.8Z" fill="#fff"/>`,
  monge: () => `
    <defs>${grad('ro', '#f0963a', '#b9561a', 0, 0, 0, 1)}${grad('ro2', '#c96a1a', '#8c3c0c', 0, 0, 1, 1)}</defs>
    <path d="M0 96 Q4 70 30 64 L66 64 Q92 70 96 96Z" fill="url(#ro)"/>
    <path d="M30 64 L58 98 L48 98 L36 78Z" fill="url(#ro2)"/><path d="M66 64 L40 98 L50 98 L62 78Z" fill="#f6a850"/>
    ${fio('M24 96 Q28 82 36 74 M72 96 Q68 82 60 74', '#8c3c0c', 0.5, 1.2)}
    ${Array.from({ length: 13 }, (_, i) => `<circle cx="${(34 - Math.sin((i / 12) * 2.4) * 0 + 0 + i * 0.2).toFixed(1)}" cy="${(66 + i * 2.4).toFixed(1)}" r="1.6" fill="#6a3a22" stroke="#3a1e10" stroke-width="0.3"/>`).join('')}
    ${rosto({ id: 'mo', pele: ['#c08a5e', '#a06c46', '#744a2c'], iris: '#3a2416', sobr: '#241410', labio: '#9a4a3c', olhosFechados: true, sorriso: 0.8, largura: 1.02 })}
    <path d="M32 24 Q48 10 64 24 Q56 16 48 16 Q40 16 32 24Z" fill="#fff" opacity="0.18" filter="url(#mole)"/>
    <circle cx="48" cy="27" r="1.8" fill="#e6b83c" filter="url(#brilho)"/>
    <path d="M44 20 Q48 18 52 20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.25" filter="url(#mole)"/>`,
  operario1: () => operario('o1', ['#e6b384', '#c98f5c', '#96663a'], '#3a2a1c', true),
  operario2: () => operario('o2', ['#8a5a3e', '#6b432c', '#46291a'], '#14100e', false),
};
function operario(id, pele, cabelo, bigode) {
  return `
    <defs>${grad(`co-${id}`, '#ffd84a', '#e0a010', 0, 0, 0, 1)}${grad(`ve-${id}`, '#f69a38', '#d4651a', 0, 0, 0, 1)}</defs>
    <path d="M0 96 Q4 70 30 64 L66 64 Q92 70 96 96Z" fill="url(#ve-${id})"/>
    <path d="M32 64 L40 96 M64 64 L56 96" stroke="#7a3a10" stroke-width="1.4" opacity="0.6"/>
    <path d="M6 86 L90 86 M3 94 L93 94" stroke="#eef56a" stroke-width="3.4"/><path d="M6 86 L90 86 M3 94 L93 94" stroke="#fffde0" stroke-width="0.8" stroke-dasharray="4 3" opacity="0.8"/>
    ${rosto({ id, pele, iris: '#3a2416', sobr: cabelo, sorriso: 0.9, sobrAng: 0.6 })}
    ${bigode ? `<path d="M37 55.4 Q42 51.6 48 54.4 Q54 51.6 59 55.4 Q55 60.4 48 58.2 Q41 60.4 37 55.4Z" fill="${cabelo}"/>` : `<path d="M34 54 Q36 64 48 66 Q60 64 62 54 Q58 62 48 62.4 Q38 62 34 54Z" fill="${cabelo}" opacity="0.5"/>`}
    <ellipse cx="48" cy="36" rx="22" ry="3.4" fill="rgba(0,0,0,0.22)" filter="url(#mole)"/>
    <path d="M27 36 Q27 12 48 11 Q69 12 69 36Z" fill="url(#co-${id})"/><rect x="23" y="31.4" width="50" height="7" rx="3.4" fill="#d89410"/><rect x="23" y="31.4" width="50" height="2.2" rx="1.1" fill="#ffe27a"/>
    <path d="M48 11 L48 32" stroke="#c88a0c" stroke-width="3.4"/><path d="M36 20 Q41 14 49 14.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>
    <rect x="44" y="21" width="8" height="6" rx="1" fill="#26232e"/><path d="M46 24 h4 M48 22 v4" stroke="#f4c430" stroke-width="1"/>`;
}

// ---------- montagem ----------
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
  const chave = FUNDOS[quem] ? quem : quem.startsWith('operario') ? 'operario' : 'crianca';
  const corpo = `<svg xmlns="http://www.w3.org/2000/svg" width="${T * ESC}" height="${T * ESC}" viewBox="0 0 96 96"><defs>${DEFS_COMUNS}</defs>
    ${FUNDOS[chave]()}
    ${(SVG[quem] ?? SVG.crianca)()}
    <defs>${radial('vig', 'rgba(0,0,0,0)', 'rgba(8,4,18,0.45)', 0.5, 0.46, 0.72)}</defs><rect width="96" height="96" fill="url(#vig)"/></svg>`;
  const img = await carregar(corpo);
  const c = document.createElement('canvas'); c.width = c.height = T * ESC; const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, T * ESC, T * ESC);
  // moldura: madeira escura por fora, fio de ouro por dentro e cantos dourados
  const m = (v) => v * ESC;
  g.lineWidth = m(4); g.strokeStyle = '#2a1810'; g.strokeRect(m(2), m(2), m(T - 4), m(T - 4));
  g.lineWidth = m(1.4); g.strokeStyle = '#d6a64e'; g.strokeRect(m(4.4), m(4.4), m(T - 8.8), m(T - 8.8));
  g.lineWidth = m(0.6); g.strokeStyle = '#fff1b8'; g.strokeRect(m(5.4), m(5.4), m(T - 10.8), m(T - 10.8));
  for (const [x, y] of [[4.4, 4.4], [T - 4.4, 4.4], [4.4, T - 4.4], [T - 4.4, T - 4.4]]) { g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(m(x), m(y), m(2.2), 0, Math.PI * 2); g.fill(); g.fillStyle = '#7a5418'; g.beginPath(); g.arc(m(x), m(y), m(0.9), 0, Math.PI * 2); g.fill(); }
  return c.toDataURL();
}
