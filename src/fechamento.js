// Fechamento do bimestre: consolida as menções de cada aluno, calcula as competências, aponta quem precisa
// de recuperação e monta os rascunhos de feedback. Funções puras (o professor sempre decide; o jogo só sugere).
import { colunasPlanilha, HABILIDADES, TEMAS } from './catalogo.js';

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
  const maisFrequente = (lista, campo = 'texto') => {
    const n = {};
    for (const r of lista) if (r[campo]) n[r[campo]] = (n[r[campo]] ?? 0) + 1;
    return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  };
  return {
    mencao, positivos: pos.length, atencao: aten.length, semRegistro: !registros.length,
    destaque: maisFrequente(pos), desenvolver: maisFrequente(aten), marcaAtencao: maisFrequente(aten, 'marca'),
  };
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

// Quem entra na lista da recuperação: NA recomenda, PA é opcional (o professor decide). O professor também
// pode incluir qualquer aluno em qualquer habilidade ("incluída por você").
export function precisaDeRecuperacao(c, fech) {
  return Object.values(c.habs)
    .filter((h) => ['PA', 'NA'].includes(h.avaliada) || (h.semEvidencia && h.faltas.length) || fech?.recup?.[h.cod]?.vai)
    .map((h) => {
      const sugerida = ['PA', 'NA'].includes(h.avaliada) || (h.semEvidencia && h.faltas.length);
      return { ...h, nivel: !sugerida ? 'incluída por você' : h.avaliada === 'NA' || !h.avaliada ? 'recomendada' : 'opcional' };
    });
}

// Sugestão de tarefa de recuperação, a partir do critério A da fase mais recente que avaliou a habilidade.
export function sugestaoRecuperacao(cod, fases, habsDescricao) {
  const f = [...fases].filter((x) => (x.habilidades ?? []).includes(cod)).sort((a, b) => ordemDaFase(b) - ordemDaFase(a))[0];
  if (cod === 'EMT1ADM702') return 'Completar e organizar o caderno, com o registro de todas as fases do bimestre, com orientação individual.';
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
// Escritos no estilo do professor: parágrafo corrido, citando as atividades pelo nome, o que ficou adequado,
// o que ficou parcial, a evolução ao longo do bimestre e o próximo passo. Sem o nome do aluno.
const descr = (cod) => TEMAS[cod] ?? minuscula(semPonto(HABILIDADES[cod] ?? cod));
const emLista = (itens) => (itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`);
const semAcento = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// O que desenvolver, pela atitude que mais apareceu nos pontos de atenção.
const DESENVOLVER = {
  colaborativa: 'participar de forma mais ativa do grupo e dividir as responsabilidades até a conclusão',
  critica: 'justificar as escolhas com argumentos e conferir as informações antes de aceitar',
  empreendedora: 'tomar a iniciativa e persistir diante das dificuldades',
  sustentavel: 'cuidar dos materiais e do espaço coletivo',
  resultados: 'cumprir os prazos combinados e revisar as entregas antes de concluir',
  tecnico: 'usar os conceitos e o vocabulário da área com mais segurança e manter o caderno completo',
};
const desenvolverDe = (marca) => Object.entries(DESENVOLVER).find(([k]) => semAcento(marca).includes(k))?.[1]
  ?? 'aproveitar melhor o tempo de aula e cumprir os combinados';

// Como cada competência continua nos bimestres seguintes (para a proposta de quem ficou em ND).
const CONTINUA = {
  EMT1ADM1: 'o planejamento estratégico será retomado no evento do próximo mundo, com novas situações para planejar e acompanhar ações',
  EMT1ADM2: 'recrutamento e seleção voltam no guia dos calouros do último mundo',
  EMT1ADM3: 'desenvolvimento de pessoas e cargos e salários continuam no 4º bimestre',
  EMT1ADM4: 'qualidade de vida e segurança continuam presentes nas atividades práticas do ano',
  EMT1ADM5: 'as rotinas de pessoal continuam nas atividades de documentos e arquivo',
  EMT1ADM6: 'a folha de pagamento continua com o holerite e os cálculos do 4º bimestre',
  EMT1ADM7: 'o caderno e a trilha de Excel continuam o ano todo',
};

const TEXTO_DIRETA = {
  EMT1ADM702: { A: 'O caderno ficou completo e organizado.', PA: 'O caderno ficou parcialmente organizado e precisa de mais regularidade nos registros.', NA: 'O caderno ficou incompleto, sem os registros pedidos ao longo do bimestre.' },
};

export function rascunhoFeedback(c, fech, { fases = [], habsDescricao } = {}) {
  const faseDe = (id) => fases.find((f) => f.id === id);
  const nomeFase = (e) => { const f = faseDe(e.fase); return `${e.codigo}${f?.nome ? ` (${f.nome})` : ''}`; };
  const fasesTxt = (itens) => { const u = [...new Set(itens.map(nomeFase))]; return `${u.length > 1 ? 'nas fases' : 'na fase'} ${emLista(u)}`; };

  // evidências fase a fase (sem a recuperação, que tem campo próprio)
  const itens = Object.values(c.habs).flatMap((h) => h.evid.filter((e) => e.m || e.faltou).map((e) => ({ ...e, cod: h.cod })))
    .sort((a, b) => a.ordem - b.ordem);
  const ok = itens.filter((e) => e.m === 'A');
  const parc = itens.filter((e) => e.m === 'PA');
  const na = itens.filter((e) => e.m === 'NA');
  const faltou = itens.filter((e) => !e.m && e.faltou);
  const diretas = Object.values(c.habs).filter((h) => h.origem === 'direta' || (h.avaliada && !h.evid.length));
  const todasA = Object.values(c.habs).every((h) => h.avaliada === 'A');
  const frases = [];
  const total = itens.length + diretas.length;
  if (!total) frases.push('Ainda não apresentou evidências suficientes para demonstrar as habilidades do bimestre.');
  else if (todasA && !parc.length && !na.length) frases.push('Apresentou desempenho consistente em todo o percurso do bimestre.');
  else if ((na.length + faltou.length) * 2 >= total) frases.push('Não apresentou evidências suficientes para demonstrar as habilidades centrais do bimestre.');
  else if (!na.length && parc.length <= ok.length) frases.push('Apresentou bom domínio das habilidades do bimestre.');
  else frases.push('Apresentou evidências parciais das habilidades do bimestre.');

  const habsDe = (lista) => emLista([...new Set(lista.map((e) => descr(e.cod)))]);
  if (ok.length) frases.push(`Atendeu às expectativas ${fasesTxt(ok)}, demonstrando domínio de ${habsDe(ok)}.`);
  if (parc.length) frases.push(`${fasesTxt(parc).replace(/^n/, 'N')}, o resultado foi parcial em ${habsDe(parc)}, indicando oportunidade de aprofundar esse ponto.`);
  if (na.length) frases.push(`${fasesTxt(na).replace(/^n/, 'N')}, a evidência ainda não demonstrou domínio de ${habsDe(na)}.`);
  if (faltou.length) frases.push(`${fasesTxt(faltou).replace(/^n/, 'N')}, não houve evidência por causa da ausência.`);

  // evolução: começou parcial e chegou ao A numa fase seguinte
  for (const h of Object.values(c.habs)) {
    const com = h.evid.filter((e) => e.m);
    const i = com.findIndex((e) => e.m !== 'A');
    const j = com.findLastIndex((e) => e.m === 'A');
    if (i >= 0 && j > i) frases.push(`Em ${descr(h.cod)}, iniciou com resultado ${com[i].m === 'PA' ? 'parcial' : 'insuficiente'} na fase ${com[i].codigo} e avançou para um resultado adequado na fase ${com[j].codigo}, mostrando evolução.`);
  }
  for (const h of diretas) frases.push(TEXTO_DIRETA[h.cod]?.[h.avaliada] ?? `Em ${descr(h.cod)}, o resultado foi ${h.avaliada === 'A' ? 'adequado' : h.avaliada === 'PA' ? 'parcial' : 'insuficiente'}.`);

  const fraca = Object.values(c.habs).find((h) => h.avaliada === 'NA' || h.semEvidencia) ?? Object.values(c.habs).find((h) => h.avaliada === 'PA');
  if (fraca) frases.push(`O próximo passo é ganhar segurança em ${descr(fraca.cod)}.`);
  else if (total) frases.push('As evidências mostram que consegue aplicar os conceitos do bimestre em situações diferentes.');
  const hab = frases.join(' ');

  // recuperação
  const recup = Object.entries(fech?.recup ?? {})
    .filter(([cod, r]) => r?.vai && c.habs[cod])
    .map(([cod, r]) => {
      const oQue = descr(cod);
      const prop = `Foi oferecida uma atividade de recuperação: ${minuscula(semPonto(r.proposta || sugestaoRecuperacao(cod, fases, habsDescricao)))}.`;
      if (r.naoFez) return `${prop} A atividade não foi entregue, por isso não houve nova evidência para verificar a evolução em ${oQue}.`;
      if (r.resultado === 'A') return `${prop} Com ela, apresentou uma nova evidência e passou a demonstrar domínio de ${oQue}, o que antes não havia sido alcançado.`;
      if (r.resultado === 'PA') return `${prop} A nova evidência mostrou avanço parcial em ${oQue}.`;
      if (r.resultado === 'NA') return `${prop} Mesmo com a nova oportunidade, a evidência ainda não demonstrou domínio de ${oQue}.`;
      return `${prop} A recuperação está em andamento.`;
    }).join(' ');

  // participação, atitudes e valores
  const av = c.atitude ?? { mencao: 'A' };
  const part = [];
  if (av.mencao === 'NA') {
    part.push('A participação e o acompanhamento das atividades foram insuficientes para garantir a continuidade da aprendizagem.');
    part.push(`É necessário ${desenvolverDe(av.marcaAtencao)}, aproveitar de forma mais efetiva o tempo de aula e assumir uma responsabilidade concreta nas atividades em grupo.`);
  } else if (av.mencao === 'PA') {
    part.push(`A participação foi parcial${av.desenvolver ? `; houve registros como: ${minuscula(semPonto(av.desenvolver))}` : ''}.`);
    part.push(`Para avançar, precisa ${desenvolverDe(av.marcaAtencao)}.`);
  } else {
    part.push('Manteve boa participação e responsabilidade ao longo do bimestre.');
    if (av.destaque) part.push(`Um ponto forte registrado: ${minuscula(semPonto(av.destaque))}.`);
    part.push('É importante manter essa constância nas próximas propostas.');
  }

  // proposta para quem ficou em ND
  const nd = Object.values(c.comps).filter((k) => k.final === 'ND');
  const proposta = nd.length
    ? nd.map((k) => {
      const fracas = k.habs.filter((h) => c.habs[h].final === 'NA' || c.habs[h].final === 'PA' || !c.habs[h].final);
      const como = fracas.map((h) => minuscula(semPonto(sugestaoRecuperacao(h, fases, habsDescricao)))).join('; ');
      return `No próximo bimestre, haverá novas oportunidades de evidenciar a evolução na competência ${curto(k.comp)}, pois ${CONTINUA[k.comp] ?? 'o tema continua sendo trabalhado'}.${como ? ` Como primeiro passo, a proposta é: ${como}.` : ''} Essas novas etapas permitirão retomar os conteúdos, aplicá-los em situações diferentes e apresentar novas evidências de aprendizagem.`;
    }).join(' ')
    : '';

  return { hab, recup, part: part.join(' '), obs: '', proposta };
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
    ...(comNumero ? [aluno.numeroChamada ?? '', aluno.nome || aluno.apelido] : []),
    ...linhaPlanilha(bim, c, campos).slice(ini, fim).map((v) => String(v).replace(/[\t\r\n]+/g, ' ')),
  ].join('\t')).join('\n');
}
