// Fechamento do bimestre: consolida as menções de cada aluno, calcula as competências, aponta quem precisa
// de recuperação e monta os rascunhos de feedback. Funções puras (o professor sempre decide; o jogo só sugere).
import { FRASES, colunasPlanilha, HABILIDADES } from './catalogo.js';

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
const minuscula = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const semPonto = (s) => (s ?? '').trim().replace(/[.;]+$/, '');

// Bimestres em que uma habilidade ou competência é lançada.
export const bimestresDe = (cod) => Object.entries(MAPA).filter(([, m]) => (cod.length > 8 ? m.habs : m.comps).includes(cod)).map(([b]) => Number(b));

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
  const avaliada = final; // menção antes da recuperação e dos ajustes
  const rec = fech?.recup?.[cod];
  if (rec?.vai && rec?.resultado) { final = rec.resultado; origem = 'recuperacao'; }
  const aj = fech?.ajustes?.[cod];
  if (aj?.mencao) { final = aj.mencao; origem = 'ajuste'; }
  return {
    cod, evid, final, origem, avaliada,
    antesDaRecuperacao: rec?.vai && rec?.resultado ? avaliada : null,
    semEvidencia: !final,
    semValidacao: comMencao.some((e) => !e.validada),
    faltas: evid.filter((e) => e.faltou && !e.m).map((e) => e.codigo),
  };
}

// Regra combinada: D quando todos os itens estão em A; ND quando metade ou mais estão em NA; ED nos demais.
// Os itens são as habilidades da competência mais Atitudes e Valores. Se faltar algum, fica pendente.
export function regraCompetencia(mencoes) {
  if (!mencoes.length || mencoes.some((m) => !m)) return null;
  if (mencoes.every((m) => m === 'A')) return 'D';
  if (mencoes.filter((m) => m === 'NA').length * 2 >= mencoes.length) return 'ND';
  return 'ED';
}

// Atitudes e Valores sugeridas a partir dos registros de atitude do bimestre (o professor confirma).
// Sem pontos de atenção, ou com o dobro de positivos: A. Três ou mais pontos de atenção e mais que o dobro
// dos positivos: NA. Nos demais casos: PA.
export function sugerirAtitude(registros = []) {
  const pos = registros.filter((r) => r.tipoAtitude === 'positivo');
  const aten = registros.filter((r) => r.tipoAtitude === 'atencao');
  let mencao = 'A';
  if (aten.length >= 3 && aten.length > 2 * pos.length) mencao = 'NA';
  else if (aten.length && pos.length < 2 * aten.length) mencao = 'PA';
  const maisFrequente = (lista) => {
    const n = {};
    for (const r of lista) n[r.texto] = (n[r.texto] ?? 0) + 1;
    return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  };
  return { mencao, positivos: pos.length, atencao: aten.length, semRegistro: !registros.length, destaque: maisFrequente(pos), desenvolver: maisFrequente(aten) };
}

export function consolidarAluno({ bim, fases, aval, fech, entrada, datas, registros }) {
  const mapa = MAPA[bim];
  const habs = Object.fromEntries(mapa.habs.map((cod) => [cod, consolidarHabilidade(cod, { fases, aval, fech, entrada, datas })]));
  const sug = sugerirAtitude(registros);
  const atitude = { ...sug, sugerida: sug.mencao, mencao: fech?.atitude?.mencao || sug.mencao, confirmada: Boolean(fech?.atitude?.mencao) };
  const comps = Object.fromEntries(mapa.comps.map((comp) => {
    const minhas = mapa.habs.filter((h) => compDe(h) === comp);
    const regra = regraCompetencia([...minhas.map((h) => habs[h].final), atitude.mencao]);
    const aj = fech?.compAjustes?.[comp];
    return [comp, { comp, habs: minhas, regra, final: aj?.mencao || regra, ajustada: Boolean(aj?.mencao), motivo: aj?.motivo ?? '' }];
  }));
  return { habs, comps, atitude, situacao: situacaoDoAluno(habs, comps), impactos: impactos(mapa, habs, comps, atitude.mencao) };
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
export function impactos(mapa, habs, comps, atitude = 'A') {
  const saida = [];
  for (const h of Object.values(habs)) {
    if (h.final !== 'PA' && h.final !== 'NA') continue;
    const comp = compDe(h.cod);
    const minhas = mapa.habs.filter((x) => compDe(x) === comp);
    const nova = regraCompetencia([...minhas.map((x) => (x === h.cod ? 'A' : habs[x].final)), atitude]);
    const atual = comps[comp]?.final;
    if (nova && atual && nova !== atual) saida.push({ hab: h.cod, comp, de: atual, para: nova });
  }
  return saida;
}

// Quem entra na lista da recuperação: NA recomenda, PA é opcional (o professor decide).
export function precisaDeRecuperacao(c) {
  return Object.values(c.habs).filter((h) => ['PA', 'NA'].includes(h.avaliada) || (h.semEvidencia && h.faltas.length))
    .map((h) => ({ ...h, nivel: h.avaliada === 'NA' || !h.avaliada ? 'recomendada' : 'opcional' }));
}

// Sugestão de tarefa de recuperação, a partir do critério A da fase mais recente que avaliou a habilidade.
export function sugestaoRecuperacao(cod, fases, habsDescricao) {
  const f = [...fases].filter((x) => (x.habilidades ?? []).includes(cod)).sort((a, b) => ordemDaFase(b) - ordemDaFase(a))[0];
  if (!f) return `Atividade individual de ${habsDescricao?.[cod] ? habsDescricao[cod].toLowerCase() : 'recuperação'}, com orientação do professor.`;
  const ev = f.evidencias?.[cod] ? `Refazer ${minuscula(f.evidencias[cod])}` : `Refazer a evidência da fase ${f.codigo}`;
  const a = f.criterios?.[cod]?.A;
  return `${ev}${a ? `, atendendo ao critério: ${minuscula(a)}` : ''}, com orientação individual.`;
}

// Texto curto da recuperação, por exemplo: "102: refez o registro do plano a partir da SWOT. Resultado: A."
export function textoRecuperacao(habs, fech) {
  return Object.entries(fech?.recup ?? {})
    .filter(([cod, r]) => r?.vai && habs[cod])
    .map(([cod, r]) => `${curto(cod)}: ${semPonto(r.proposta)}.${r.resultado ? ` Resultado: ${r.resultado}.` : ' Resultado: em andamento.'}`)
    .join(' ');
}

// ---------- rascunhos de feedback (os cinco campos da planilha) ----------
const descr = (cod, desc) => minuscula(semPonto(desc?.[cod] ?? HABILIDADES[cod] ?? cod));

export function rascunhoFeedback(c, fech, { fases = [], habsDescricao } = {}) {
  const lista = Object.values(c.habs);
  const feitas = lista.filter((h) => h.avaliada);
  const todas = feitas.length === lista.length;
  const F = FRASES.avaliacao;
  let hab;
  if (!feitas.length) hab = F.nenhuma;
  else if (feitas.every((h) => h.avaliada === 'A')) hab = todas ? F.todas : F.parteAtingiu;
  else if (feitas.every((h) => h.avaliada === 'NA')) hab = todas ? F.todasNao : F.parteNao;
  else hab = todas ? F.todasParcial : F.parteParcial;
  const bem = feitas.filter((h) => h.avaliada === 'A' && feitas.some((x) => x.avaliada !== 'A'));
  const avancar = feitas.filter((h) => h.avaliada !== 'A');
  if (bem.length) hab += ` Foi bem em ${bem.map((h) => descr(h.cod, habsDescricao)).join('; ')}.`;
  if (avancar.length) hab += ` Precisa avançar em ${avancar.map((h) => descr(h.cod, habsDescricao)).join('; ')}.`;

  const recup = Object.entries(fech?.recup ?? {})
    .filter(([cod, r]) => r?.vai && c.habs[cod])
    .map(([cod, r]) => `Atividade proposta: ${minuscula(semPonto(r.proposta ?? sugestaoRecuperacao(cod, fases, habsDescricao)))}. ${r.resultado ? FRASES.recuperacao[r.resultado] : r.naoFez ? FRASES.recuperacao.nao : 'Recuperação em andamento.'}`)
    .join(' ');

  const av = c.atitude ?? { mencao: 'A' };
  let part = FRASES.participacao[av.mencao] ?? FRASES.participacao.A;
  if (av.destaque) part += ` Destaque: ${minuscula(semPonto(av.destaque))}.`;
  if (av.desenvolver && av.mencao !== 'A') part += ` Precisa desenvolver: ${minuscula(semPonto(av.desenvolver))}.`;

  const nd = Object.values(c.comps).filter((k) => k.final === 'ND');
  const proposta = nd.length
    ? nd.map((k) => {
      const fracas = k.habs.filter((h) => c.habs[h].final === 'NA' || c.habs[h].final === 'PA');
      return `Para evidenciar a evolução na competência ${curto(k.comp)} no próximo bimestre: ${fracas.map((h) => minuscula(sugestaoRecuperacao(h, fases, habsDescricao))).join(' ') || 'retomar as atividades com acompanhamento individual.'}`;
    }).join(' ')
    : '';

  return { hab, recup, part, obs: '', proposta };
}

// Valor de cada campo: o que o professor salvou ou o rascunho.
export function feedbackDoAluno(c, fech, opcoes) {
  const r = rascunhoFeedback(c, fech, opcoes);
  const salvo = fech?.feedback ?? {};
  const campos = Object.fromEntries(Object.keys(r).map((k) => [k, typeof salvo[k] === 'string' ? salvo[k] : r[k]]));
  return { campos, rascunho: r, revisado: salvo.revisado === true };
}

export const paragrafoFinal = (campos) => Object.values(campos).map((s) => (s ?? '').trim()).filter(Boolean).join(' ');

// ---------- planilha da coordenação ----------
// Uma linha da aba de Formação Técnica a partir da coluna C; o que não é do bimestre fica em branco.
export function linhaPlanilha(bim, c, campos) {
  const mapa = MAPA[bim];
  return colunasPlanilha().map((col) => {
    if (col.tipo === 'hab') return mapa.habs.includes(col.cod) ? (c.habs[col.cod]?.final ?? '') : '';
    if (col.tipo === 'av') return mapa.comps.includes(col.comp) ? (c.atitude?.mencao ?? '') : '';
    if (col.tipo === 'comp') return mapa.comps.includes(col.comp) ? (c.comps[col.comp]?.final ?? '') : '';
    if (col.tipo === 'fb') return campos?.[col.id] ?? '';
    return paragrafoFinal(campos ?? {});
  });
}

// Texto para colar (tabulação entre colunas), na ordem do número de chamada.
// parte 'mencoes': da primeira habilidade até a última competência; 'feedback': os cinco campos (sem o final,
// que a planilha calcula sozinha).
export function linhasParaColar(bim, linhas, { parte = 'mencoes', comNumero = false } = {}) {
  const cols = colunasPlanilha();
  const ini = parte === 'feedback' ? cols.findIndex((x) => x.tipo === 'fb') : 0;
  const fim = parte === 'feedback' ? cols.findIndex((x) => x.tipo === 'final') : cols.findIndex((x) => x.tipo === 'fb');
  return linhas.map(({ aluno, c, campos }) => [
    ...(comNumero ? [aluno.numeroChamada ?? '', aluno.apelido] : []),
    ...linhaPlanilha(bim, c, campos).slice(ini, fim).map((v) => String(v).replace(/[\t\r\n]+/g, ' ')),
  ].join('\t')).join('\n');
}
