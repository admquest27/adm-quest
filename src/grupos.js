// Guildas e grupos de atividade: o que é comum ao aluno e ao professor. Funções puras.
import { MUNDO } from './fases.js';

// escape local (ui.js mexe na página e não roda nos testes)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A guilda é a "atividade" do mundo inteiro; os grupos de uma fase usam o id da fase.
export const ATV_GUILDA = `guilda-${MUNDO}`;
export const MODOS = { alunos: 'Os alunos montam', sorteio: 'Sorteio', professor: 'Você monta' };

// Configuração de uma fase nesta turma: o que o professor definiu, ou o padrão do conteúdo.
export function configDaFase(turma, f) {
  const base = f?.grupo ?? null;
  const salvo = turma?.atividades?.[f?.id] ?? {};
  if ((!base && !salvo.tipo) || salvo.tipo === 'nenhum') return null;
  return { tipo: salvo.tipo ?? base?.tipo ?? 'fase', tamanho: salvo.tamanho ?? base?.tamanho ?? 4, modo: salvo.modo ?? 'alunos', aberta: salvo.aberta === true };
}

export const configGuilda = (turma) => ({ tipo: 'guilda', tamanho: 4, modo: 'alunos', aberta: false, ...(turma?.atividades?.[ATV_GUILDA] ?? {}) });

// Id da atividade cujos grupos valem para a fase: a própria fase ou a guilda.
export const atividadeDaFase = (cfg, f) => (cfg?.tipo === 'guilda' ? ATV_GUILDA : f.id);

export const grupoDe = (grupos, atv, uid) => grupos.find((g) => g.atividade === atv && g.membros?.includes(uid)) ?? null;
export const convitesPara = (grupos, atv, uid) => grupos.filter((g) => g.atividade === atv && g.convites?.includes(uid));

// Sorteio: grupos do tamanho pedido; o resto é distribuído nos grupos já formados (nunca um grupo de 1).
export function sortear(uids, tamanho, aleatorio = Math.random) {
  const lista = [...uids];
  for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(aleatorio() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
  if (lista.length <= tamanho) return lista.length ? [lista] : [];
  const n = Math.max(1, Math.floor(lista.length / tamanho));
  const grupos = Array.from({ length: n }, () => []);
  lista.forEach((u, i) => grupos[i % n].push(u));
  return grupos;
}

// ---------- escudo da guilda ----------
export const FORMAS = {
  classico: 'M4 4 H60 V30 C60 50 44 60 32 66 C20 60 4 50 4 30 Z',
  redondo: 'M32 4 A30 30 0 1 1 31.9 4 Z',
  bandeira: 'M6 4 H58 V64 L32 52 L6 64 Z',
  diamante: 'M32 2 L62 34 L32 66 L2 34 Z',
};
export const CORES = ['#3b5bdb', '#1a7f4b', '#b42318', '#e0a800', '#7a42c8', '#0f8b8d', '#e8590c', '#1f2a44', '#f4f1ea', '#d6336c'];
export const SIMBOLOS = ['🦉', '🐉', '🦁', '🐺', '🦊', '🌵', '🔥', '⚡', '⭐', '🌙', '👑', '⚔️', '🧭', '📈', '💡', '🍀'];

export function svgEscudo(escudo, tam = 64) {
  const e = { forma: 'classico', cor1: CORES[0], cor2: CORES[3], simbolo: '⭐', ...(escudo ?? {}) };
  const d = FORMAS[e.forma] ?? FORMAS.classico;
  const id = `c${Math.random().toString(36).slice(2, 8)}`;
  const cor = (c) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : CORES[0]);
  return `<svg class="escudo" width="${tam}" height="${tam * 1.06}" viewBox="0 0 64 68" role="img" aria-label="Escudo da guilda">
    <defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>
    <path d="${d}" fill="${cor(e.cor1)}"/>
    <rect x="32" y="0" width="32" height="68" fill="${cor(e.cor2)}" clip-path="url(#${id})"/>
    <path d="${d}" fill="none" stroke="#1f2a44" stroke-width="3"/>
    <text x="32" y="40" text-anchor="middle" font-size="24">${esc(e.simbolo)}</text></svg>`;
}

export const nomeGuilda = (g) => g?.nome || 'Guilda sem nome';
