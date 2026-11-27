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
  return { tipo: salvo.tipo ?? base?.tipo ?? 'fase', tamanho: salvo.tamanho ?? base?.tamanho ?? 4, modo: salvo.modo ?? 'alunos', aberta: salvo.aberta === true, ...(salvo.minimo ? { minimo: salvo.minimo } : {}) };
}

export const configGuilda = (turma) => ({ tipo: 'guilda', tamanho: 4, modo: 'alunos', aberta: false, ...(turma?.atividades?.[ATV_GUILDA] ?? {}) });

// Id da atividade cujos grupos valem para a fase: a própria fase ou a guilda.
export const atividadeDaFase = (cfg, f) => (cfg?.tipo === 'guilda' ? ATV_GUILDA : f.id);

export const grupoDe = (grupos, atv, uid) => grupos.find((g) => g.atividade === atv && g.membros?.includes(uid)) ?? null;
export const convitesPara = (grupos, atv, uid) => grupos.filter((g) => g.atividade === atv && g.convites?.includes(uid));

// Tamanho que vale para um grupo. "tamanho" é o máximo da atividade; o professor pode dar a um grupo um limite
// próprio (g.limite) ou aceitar que ele fique menor que o mínimo (g.aceito). Os alunos veem só o número que vale para eles.
export function limites(cfg, g = null) {
  const padraoMax = cfg?.tamanho ?? 4;
  const padraoMin = Math.min(cfg?.minimo ?? 2, padraoMax);
  const max = g?.limite ?? padraoMax;
  const n = g?.membros?.length ?? 0;
  return { max, min: padraoMin, padraoMax, excecao: Boolean(g) && n > padraoMax, incompleto: Boolean(g) && n < padraoMin && g.aceito !== true };
}

export const textoTamanho = (min, max) => (min >= max ? `${max} pessoas` : `${min} a ${max} pessoas`);

// Sorteio: coloca o maior número possível de alunos em grupos entre o mínimo e o máximo, equilibrados.
// Quem não couber fica em "sobra", para o professor decidir.
export function distribuir(uids, min, max, aleatorio = Math.random) {
  const lista = [...uids];
  for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(aleatorio() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
  let n = 0; let cabem = 0;
  for (let k = 1; k * min <= lista.length; k++) { const c = Math.min(lista.length, k * max); if (c > cabem) { cabem = c; n = k; } }
  const grupos = Array.from({ length: n }, () => []);
  lista.slice(0, cabem).forEach((u, i) => grupos[i % n].push(u));
  return { grupos, sobra: lista.slice(cabem) };
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
