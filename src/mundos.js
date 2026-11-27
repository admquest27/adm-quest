// Mundos (um por bimestre). O Mundo 1 vale para toda turma; os seguintes o professor libera turma por turma,
// no campo "mundos". Funções puras.
export const PRIMEIRO = 'm1';

export const numeroDoMundo = (id) => Number(String(id ?? '').replace(/\D/g, '')) || 0;
const emOrdem = (ids) => [...new Set(ids)].sort((a, b) => numeroDoMundo(a) - numeroDoMundo(b));

export const mundosLiberados = (turma) => emOrdem([PRIMEIRO, ...(turma?.mundos ?? []).filter((m) => /^m\d{1,2}$/.test(m))]);
export const mundoAtual = (turma) => mundosLiberados(turma).at(-1);

// O mapa desenhado existe só para estes mundos; os outros funcionam pela lista de fases.
export const COM_MAPA = [PRIMEIRO];
export const temMapa = (id) => COM_MAPA.includes(id);

export const fasesDoMundo = (fases, id) => (fases ?? []).filter((f) => (f.mundo ?? PRIMEIRO) === id).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
