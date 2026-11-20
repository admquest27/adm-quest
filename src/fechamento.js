// Fechamento do bimestre: consolida as menções de cada aluno, calcula as competências e aponta quem precisa
// de recuperação. Funções puras (o professor sempre decide; o jogo só sugere).

// Mapa de lançamento: o que entra na planilha da coordenação em cada bimestre (parte de FTP).
export const MAPA = {
  1: { habs: ['EMT1ADM101', 'EMT1ADM102', 'EMT1ADM103', 'EMT1ADM104', 'EMT1ADM105', 'EMT1ADM702'], comps: ['EMT1ADM1', 'EMT1ADM7'] },
  2: { habs: ['EMT1ADM301', 'EMT1ADM302', 'EMT1ADM401', 'EMT1ADM402', 'EMT1ADM403'], comps: ['EMT1ADM3', 'EMT1ADM4'] },
  3: { habs: ['EMT1ADM201', 'EMT1ADM202', 'EMT1ADM203', 'EMT1ADM701'], comps: ['EMT1ADM2', 'EMT1ADM7'] },
  4: { habs: ['EMT1ADM303', 'EMT1ADM304', 'EMT1ADM501', 'EMT1ADM502', 'EMT1ADM601', 'EMT1ADM602', 'EMT1ADM603'], comps: ['EMT1ADM3', 'EMT1ADM5', 'EMT1ADM6'] },
};

export const compDe = (hab) => hab.slice(0, 8); // EMT1ADM102 -> EMT1ADM1
export const curto = (cod) => cod.replace('EMT1ADM', '');
const ordemDaFase = (f) => f?.ordem ?? 0;

// Uma habilidade de um aluno: evidências das fases (a mais recente prevalece), menção direta do professor
// (por exemplo, o caderno), resultado da recuperação e ajuste manual, nesta ordem de prioridade.
export function consolidarHabilidade(cod, { fases, aval, fech, entrada, datas }) {
  const evid = fases
    .filter((f) => (f.habilidades ?? []).includes(cod))
    .filter((f) => !entrada || !datas?.[f.id]?.aberta || datas[f.id].aberta >= entrada)
    .map((f) => ({ fase: f.id, codigo: f.codigo, ordem: ordemDaFase(f), m: aval[f.id]?.mencoes?.[cod] ?? null, faltou: aval[f.id]?.faltou === true, validada: aval[f.id]?.validada === true }))
    .sort((a, b) => a.ordem - b.ordem);
  const comMencao = evid.filter((e) => e.m);
  let final = comMencao.length ? comMencao[comMencao.length - 1].m : null;
  let origem = final ? 'fase' : null;
  const direta = fech?.diretas?.[cod];
  if (direta) { final = direta; origem = 'direta'; }
  const rec = fech?.recup?.[cod];
  if (rec?.resultado) { final = rec.resultado; origem = 'recuperacao'; }
  const aj = fech?.ajustes?.[cod];
  if (aj?.mencao) { final = aj.mencao; origem = 'ajuste'; }
  return {
    cod, evid, final, origem,
    antesDaRecuperacao: rec?.resultado ? (direta ?? (comMencao.length ? comMencao[comMencao.length - 1].m : null)) : null,
    semEvidencia: !final,
    semValidacao: comMencao.some((e) => !e.validada),
    faltas: evid.filter((e) => e.faltou && !e.m).map((e) => e.codigo),
  };
}

// Regra combinada: D quando todas as habilidades estão em A; ND quando metade ou mais estão em NA; ED nos demais.
// Se faltar menção em alguma habilidade, a competência fica pendente. O professor pode ajustar por aluno.
export function regraCompetencia(mencoes) {
  if (!mencoes.length || mencoes.some((m) => !m)) return null;
  if (mencoes.every((m) => m === 'A')) return 'D';
  if (mencoes.filter((m) => m === 'NA').length * 2 >= mencoes.length) return 'ND';
  return 'ED';
}

export function consolidarAluno({ bim, fases, aval, fech, entrada, datas }) {
  const mapa = MAPA[bim];
  const habs = Object.fromEntries(mapa.habs.map((cod) => [cod, consolidarHabilidade(cod, { fases, aval, fech, entrada, datas })]));
  const comps = Object.fromEntries(mapa.comps.map((comp) => {
    const minhas = mapa.habs.filter((h) => compDe(h) === comp);
    const regra = regraCompetencia(minhas.map((h) => habs[h].final));
    const aj = fech?.compAjustes?.[comp];
    return [comp, { comp, habs: minhas, regra, final: aj?.mencao ?? regra, ajustada: Boolean(aj?.mencao), motivo: aj?.motivo ?? '' }];
  }));
  return { habs, comps, situacao: situacaoDoAluno(habs, comps), impactos: impactos(mapa, habs, comps) };
}

// Sugestão do jogo para a análise do professor.
export function situacaoDoAluno(habs, comps) {
  const lista = Object.values(habs);
  if (lista.some((h) => h.final === 'NA') || Object.values(comps).some((c) => c.final === 'ND')) return 'recuperacao';
  if (lista.some((h) => h.semEvidencia)) return 'pendente';
  if (lista.some((h) => h.final === 'PA')) return 'atencao';
  return 'ok';
}

export const SITUACAO = {
  recuperacao: { rotulo: 'Precisa de recuperação', classe: 'm-NA' },
  pendente: { rotulo: 'Sem evidência', classe: 'sem-evid' },
  atencao: { rotulo: 'Atenção', classe: 'm-PA' },
  ok: { rotulo: 'Em dia', classe: 'm-A' },
};

// "Recuperando 102 para A, a competência 1 passa de ED para D."
export function impactos(mapa, habs, comps) {
  const saida = [];
  for (const h of Object.values(habs)) {
    if (h.final !== 'PA' && h.final !== 'NA') continue;
    const comp = compDe(h.cod);
    const minhas = mapa.habs.filter((x) => compDe(x) === comp);
    const nova = regraCompetencia(minhas.map((x) => (x === h.cod ? 'A' : habs[x].final)));
    const atual = comps[comp]?.final;
    if (nova && atual && nova !== atual) saida.push({ hab: h.cod, comp, de: atual, para: nova });
  }
  return saida;
}

// Sugestão de tarefa de recuperação, a partir do critério A da fase mais recente que avaliou a habilidade.
export function sugestaoRecuperacao(cod, fases, habsDescricao) {
  const f = [...fases].filter((x) => (x.habilidades ?? []).includes(cod)).sort((a, b) => ordemDaFase(b) - ordemDaFase(a))[0];
  if (!f) return `Atividade individual de ${habsDescricao?.[cod] ? habsDescricao[cod].toLowerCase() : 'recuperação'}, com orientação do professor.`;
  const ev = f.evidencias?.[cod] ? `Refazer ${f.evidencias[cod].charAt(0).toLowerCase()}${f.evidencias[cod].slice(1)}` : `Refazer a evidência da fase ${f.codigo}`;
  const a = f.criterios?.[cod]?.A;
  return `${ev}${a ? `, atendendo ao critério: ${a.charAt(0).toLowerCase()}${a.slice(1)}` : ''}, com orientação individual.`;
}

// Texto do campo de recuperação, por exemplo: "102: refez o registro do plano a partir da SWOT. Resultado: A."
export function textoRecuperacao(habs, fech) {
  return Object.entries(fech?.recup ?? {})
    .filter(([cod, r]) => r?.vai && habs[cod])
    .map(([cod, r]) => `${cod}: ${(r.proposta ?? '').trim().replace(/\.$/, '')}.${r.resultado ? ` Resultado: ${r.resultado}.` : ' Resultado: em andamento.'}`)
    .join(' ');
}

// Linhas para colar na planilha (tabulação entre colunas), na ordem do número de chamada.
export function linhasParaColar(bim, linhas, { comNumero = true } = {}) {
  const mapa = MAPA[bim];
  return linhas.map(({ aluno, c, fech }) => [
    ...(comNumero ? [aluno.numeroChamada ?? '', aluno.apelido] : []),
    ...mapa.habs.map((h) => c.habs[h].final ?? ''),
    ...mapa.comps.map((k) => c.comps[k].final ?? ''),
    textoRecuperacao(c.habs, fech),
  ].join('\t')).join('\n');
}
