// Conteúdo dos arquivos do fechamento: a planilha no formato da coordenação e a parte de FTP do PCTD.
// Funções puras: recebem os dados já consolidados e devolvem a estrutura que arquivos.js transforma em arquivo.
import { COMPETENCIAS, HABILIDADES, SABERES, PLANILHA, CAMPOS_FEEDBACK, colunasPlanilha, coluna } from './catalogo.js';
import { MAPA, curto, linhaPlanilha } from './fechamento.js';
import { ESTILO, estiloMencao } from './arquivos.js';
import { addDias, segundaDa, formatar, diaSemana } from './agenda.js';

// ---------- planilha ----------
export function planilhaCoordenacao({ bim, turmaNome, linhas }) {
  const mapa = MAPA[bim];
  const cols = colunasPlanilha();
  const n = cols.length + 2;
  const vazia = () => Array(n).fill(null);
  const r1 = vazia(); const r2 = vazia(); const r3 = vazia();
  const mesclas = ['A1:B1', 'A2:B2'];
  r2[0] = { v: `${bim}º Bimestre - Turma ${turmaNome}`, s: ESTILO.titulo };
  r3[0] = { v: 'N.', s: ESTILO.cabecalho };
  r3[1] = { v: 'Nome do Aluno', s: ESTILO.cabecalho };
  let k = 2;
  for (const g of PLANILHA) {
    const doBim = mapa.comps.includes(g.comp);
    const est = doBim ? ESTILO.destaque : ESTILO.cabecalho;
    const ini = k;
    for (const h of g.habs) { r2[k] = { v: k === ini ? `Competência ADM${curto(g.comp)}` : '', s: est }; r3[k] = { v: `Habilidade ${curto(h)}`, s: est }; k += 1; }
    r2[k] = { v: '', s: est }; r3[k] = { v: 'Atitudes e Valores', s: est }; k += 1;
    mesclas.push(`${coluna(ini)}2:${coluna(k - 1)}2`);
    r2[k] = { v: `Menção Final Competência ${curto(g.comp)}`, s: est }; r3[k] = { v: '', s: est };
    mesclas.push(`${coluna(k)}2:${coluna(k)}3`);
    k += 1;
  }
  const fb0 = k;
  r1[fb0] = { v: 'Feedback', s: ESTILO.titulo };
  for (const c of CAMPOS_FEEDBACK) { r2[k] = { v: c.rotulo, s: ESTILO.cabecalho }; r3[k] = { v: '', s: ESTILO.cabecalho }; mesclas.push(`${coluna(k)}2:${coluna(k)}3`); k += 1; }
  r2[k] = { v: 'Feedback Final', s: ESTILO.cabecalho }; r3[k] = { v: '', s: ESTILO.cabecalho }; mesclas.push(`${coluna(k)}2:${coluna(k)}3`);
  mesclas.push(`${coluna(fb0)}1:${coluna(k)}1`);

  const dados = linhas.map(({ aluno, c, campos }, i) => {
    const valores = linhaPlanilha(bim, c, campos);
    return [
      { v: aluno.numeroChamada ?? i + 1, s: ESTILO.centro },
      { v: aluno.apelido ?? '', s: ESTILO.celula },
      ...valores.map((v, j) => ({ v, s: cols[j].tipo === 'fb' || cols[j].tipo === 'final' ? ESTILO.texto : estiloMencao(v) })),
    ];
  });
  const larguras = [5, 22, ...cols.map((c) => ({ hab: 10, av: 11, comp: 13, fb: 45, final: 70 }[c.tipo]))];
  const primeira = coluna(2);
  const ultimaMencao = coluna(cols.findIndex((c) => c.tipo === 'fb') + 1);
  const instr = [
    ['Como usar este arquivo'],
    [''],
    ['1. Este arquivo tem as mesmas colunas da aba de Formação Técnica da planilha de feedback da coordenação.'],
    ['2. Confira se a ordem dos números de chamada é a mesma da planilha da coordenação. Os nomes aqui são os apelidos do jogo.'],
    [`3. Menções: selecione de ${primeira}4 até ${ultimaMencao}${linhas.length + 3}, copie e cole na planilha da coordenação a partir da célula ${primeira}4 (Colar valores).`],
    ['4. Feedback: selecione as cinco colunas de feedback (sem o Feedback Final, que a planilha da coordenação calcula sozinha) e cole na primeira coluna de feedback da coordenação.'],
    [`5. Só as competências do ${bim}º bimestre (em azul) vêm preenchidas; as outras ficam em branco.`],
    ['6. Este arquivo tem dados de alunos: guarde só na sua pasta do OneDrive e apague depois de lançar.'],
  ];
  return [
    { nome: 'Formação Técnica', linhas: [r1, r2, r3, ...dados], mesclas, larguras, alturas: { 2: 42, 3: 42 }, congelar: 'C4' },
    { nome: 'Como colar', linhas: instr, larguras: [120] },
  ];
}

// ---------- PCTD ----------
export function saberesPadrao(bim) {
  if (bim === 1) return [...SABERES.EMT1ADM1, SABERES.EMT1ADM7[1], SABERES.EMT1ADM7[2]];
  return MAPA[bim].comps.flatMap((k) => SABERES[k] ?? []);
}

// Verbo da habilidade: "Propor e monitorar", "Analisar".
export function verboDe(cod) {
  const p = (HABILIDADES[cod] ?? '').split(' ');
  return p[1] === 'e' && /r$/.test(p[2] ?? '') ? p.slice(0, 3).join(' ') : p[0];
}

// Tira a pontuação final, menos "?" e "!", que já fecham a frase (o ponto só é somado quando falta).
const semPonto = (s) => (s ?? '').trim().replace(/[.;:]+$/, '');
const fecha = (s) => (/[?!]$/.test(s) ? s : `${s}.`);

// A atitude da fase é texto livre ("colaborativa e sustentável"): reconhece cada marca pelo id dentro dele.
const semAcento = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const marcasDaFase = (f, marcas) => marcas.filter((m) => semAcento(f.atitude).includes(m.id));
const dm = (d) => (d ? formatar(d, false) : '');
const DIA = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };
const ONDE = { din: 'na sala', cons: 'no laboratório', antes: 'preparação', folga: 'semana coringa' };

// Uma linha por semana do bimestre, como um cronograma.
// p: plano da Agenda (planejar); roteiro(f, tipo): blocos da aula; marcas: atitudes do jogo.
// Os campos editados pelo professor (editadas[n][campo]) substituem os automáticos.
export const CAMPOS_SEMANA = [['hab', 'Habilidade (verbo)'], ['oque', 'O quê? Recorte da habilidade e saberes'], ['como', 'Como? Descrição das etapas'], ['aval', 'Avaliação (instrumentos)'], ['atit', 'Atitudes e Valores esperados']];
export function semanasDoBimestre({ p, roteiro, marcas, habsDoBim, editadas = {} }) {
  const b = p.b;
  const linhas = [];
  let n = 0;
  for (let seg = segundaDa(b.inicio); seg <= b.fim; seg = addDias(seg, 7)) {
    const sex = addDias(seg, 4);
    n += 1;
    const dias = [...p.dias.values()].filter((d) => d.data >= seg && d.data <= sex).sort((a, z) => a.data.localeCompare(z.data));
    const habs = new Set(); const oque = []; const como = []; const aval = []; const atit = new Set(); const resumo = [];
    for (const d of dias) {
      const quando = `${DIA[diaSemana(d.data)] ?? ''} ${dm(d.data)}`;
      if (d.semAula) {
        if ([p.diaDin ?? 2, p.diaCons ?? 1].includes(diaSemana(d.data))) { resumo.push(`sem aula ${dm(d.data)}`); como.push(`${quando}: sem aula, ${semPonto(d.semAula)}.`); }
        continue;
      }
      for (const it of d.itens) {
        const f = it.faseId ? p.todas.find((x) => x.id === it.faseId) : null;
        if (it.tipo === 'recup') {
          resumo.push(it.parte === 'seg' ? 'recuperação' : 'fechamento do mundo');
          como.push(`${quando}: ${it.parte === 'seg' ? 'Semana de recuperação: Missões Pessoais (recuperação individual ou missão bônus) e registro dos resultados.' : 'Fechamento do mundo: últimas entregas da recuperação e encerramento do bimestre.'}`);
          if (it.parte === 'seg') aval.push('Recuperação: Missão Pessoal individual, com o critério A da habilidade.');
          continue;
        }
        if (!f) continue;
        resumo.push(`${f.codigo} ${{ din: 'dinâmica', cons: 'consolidação', antes: 'preparação', folga: 'coringa' }[it.tipo] ?? it.tipo}`);
        if (it.tipo === 'din' || it.tipo === 'cons') {
          for (const h of f.habilidades ?? []) if (habsDoBim.includes(h)) habs.add(h);
          for (const m of marcasDaFase(f, marcas)) atit.add(`${m.nome}: ${m.positivas.slice(0, 2).map((t) => t.charAt(0).toLowerCase() + t.slice(1)).join('; ')}.`);
        }
        const blocos = roteiro(f, it.tipo) ?? [];
        const titulos = blocos.map((x) => semPonto(x.titulo)).filter(Boolean).join('; ');
        if (it.tipo === 'din') {
          const recorte = (f.habilidades ?? []).filter((h) => habsDoBim.includes(h)).map((h) => `${curto(h)}: ${semPonto(HABILIDADES[h]).split(',')[0].toLowerCase()}`).join('; ');
          oque.push(`**${f.codigo} ${f.nome}**${recorte ? `. ${recorte}.` : '.'}`);
          como.push(`${quando} (${ONDE.din}), dinâmica da fase ${f.codigo}: ${titulos}.`);
          if (f.avaliacao && (f.habilidades ?? []).some((h) => habsDoBim.includes(h))) aval.push(`${f.codigo}: ${semPonto(f.avaliacao.replace(/^Evid[eê]ncia:\s*/i, ''))}.`);
        } else if (it.tipo === 'cons') {
          const conceito = blocos.find((x) => /^Conceito/i.test(x.titulo ?? '') && !/Escreva o roteiro/.test(x.detalhe ?? ''));
          if (conceito) oque.push(`Conceito da fase ${f.codigo}: ${fecha(semPonto(conceito.detalhe))}`);
          como.push(`${quando} (${ONDE.cons}), consolidação da fase ${f.codigo}: ${titulos}.`);
        } else if (it.tipo === 'antes') {
          como.push(`${quando}: preparação para a fase ${f.codigo}.`);
        } else if (it.tipo === 'folga') {
          como.push(`${quando}: semana coringa (revisão, caderno em dia ou fase bônus).`);
        }
      }
    }
    if (!dias.length) como.push('Sem aula de FTP planejada nesta semana.');
    const auto = {
      hab: [...habs].sort().map((h) => `${curto(h)}: ${verboDe(h)}`).join('\n'),
      oque: oque.join('\n'),
      como: como.join('\n'),
      aval: aval.join('\n') || 'Formativa: registros de atitude e participação no jogo.',
      atit: [...atit].join('\n'),
    };
    const ed = editadas[n] ?? {};
    const campos = Object.fromEntries(Object.keys(auto).map((k) => [k, typeof ed[k] === 'string' ? ed[k] : auto[k]]));
    linhas.push({ n, seg, sex, periodo: `${dm(seg)} a ${dm(sex)}`, resumo: [...new Set(resumo)].join(' · ') || 'sem aula de FTP', auto, campos, editados: Object.keys(auto).filter((k) => typeof ed[k] === 'string' && ed[k] !== auto[k]) });
  }
  return linhas;
}

// Linha da FTP na Agenda Avaliativa: uma avaliação por fase com habilidade do bimestre, a integrada e a recuperação.
export function agendaAvaliativa({ p, habsDoBim, integrada }) {
  const avs = p.ag.itens
    .map((i) => ({ i, f: p.todas.find((x) => x.id === i.faseId) }))
    .filter(({ f }) => f && (f.habilidades ?? []).some((h) => habsDoBim.includes(h)))
    .map(({ i, f }) => `${f.codigo} ${f.nome}\n${semPonto((f.avaliacao ?? '').replace(/^Evid[eê]ncia:\s*/i, '')) || 'Registro da fase'}\n${dm(i.din)}`);
  const recup = [...p.dias.values()].find((d) => d.itens.some((it) => it.tipo === 'recup'));
  return { avs, integrada: integrada || '', recup: recup ? `Missões Pessoais\n${dm(recup.data)}` : '' };
}

export function pctdFtp({ bim, turmaNome, ano, p, roteiro, marcas, cfg = {}, mundo }) {
  const mapa = MAPA[bim];
  const b = p.b;
  const habsDoBim = mapa.habs;
  const professores = cfg.professores ?? '';
  const ag = agendaAvaliativa({ p, habsDoBim, integrada: cfg.integrada });
  const nAv = Math.max(ag.avs.length, 1);
  const largAv = Math.min(3.2, 19.9 / nAv);
  const encerr = Array.isArray(b.encerramento) ? `${dm(b.encerramento[0])} a ${dm(b.encerramento[1])}` : '';
  const blocos = [
    { tipo: 'titulo', texto: `PCTD · Formação Técnica e Profissional · ${b.nome ?? `${bim}º bimestre`} de ${ano}` },
    { tipo: 'p', texto: 'Gerado pelo ADM Quest a partir da Agenda e das fases. Revise e cole no PCTD da coordenação, no lugar da parte de FTP.' },
    { tipo: 'tabela', colunas: [4, 9.35, 4, 9.35], linhas: [
      [{ texto: 'Curso', negrito: true }, 'Técnico em Administração Integrado ao Ensino Médio', { texto: 'Turma', negrito: true }, turmaNome],
      [{ texto: 'Ano', negrito: true }, String(ano), { texto: 'Bimestre', negrito: true }, `${bim}º`],
      [{ texto: 'Início', negrito: true }, dm(b.inicio), { texto: 'Término', negrito: true }, dm(b.fim)],
      [{ texto: 'Semana de encerramento', negrito: true }, encerr, { texto: 'Reunião de fechamento', negrito: true }, dm(b.fechamento)],
    ] },
    { tipo: 'subtitulo', texto: 'Agenda avaliativa (linha da FTP)' },
    { tipo: 'tabela', cabecalho: 1, colunas: [1.6, ...Array(nAv).fill(largAv), 2.6, 2.6], linhas: [
      ['Área', ...ag.avs.map((_, i) => `Avaliação ${i + 1}`), 'Avaliação integrada', 'Recuperação final'],
      [{ texto: 'FTP', negrito: true }, ...(ag.avs.length ? ag.avs : ['']), ag.integrada, ag.recup],
    ] },
    { tipo: 'subtitulo', texto: 'Competências do bimestre' },
    { tipo: 'lista', itens: mapa.comps.map((k) => `**${k}**: ${COMPETENCIAS[k]}`) },
    { tipo: 'subtitulo', texto: 'Habilidades do bimestre' },
    { tipo: 'lista', itens: habsDoBim.map((h) => `**${h}**: ${HABILIDADES[h]}`) },
    ...(bim === 1 ? [{ tipo: 'p', texto: 'A trilha de Excel (EMT1ADM701) é trabalhada desde o 1º bimestre como evidência interna e lançada no 3º bimestre.' }] : []),
    { tipo: 'subtitulo', texto: 'Saberes do bimestre' },
    { tipo: 'lista', itens: (cfg.saberes?.length ? cfg.saberes : saberesPadrao(bim)) },
    { tipo: 'subtitulo', texto: 'Avaliação integrada' },
    { tipo: 'p', texto: cfg.integradaTexto || '(Descreva aqui a avaliação integrada do bimestre.)' },
    { tipo: 'subtitulo', texto: 'Situação de ensino-aprendizagem' },
    { tipo: 'tabela', colunas: [4.5, 22.2], linhas: [
      [{ texto: 'Habilidades', negrito: true }, habsDoBim.join(', ')],
      [{ texto: 'Nome', negrito: true }, cfg.situacao || `${mundo?.nome ?? 'Mundo'}: ${mundo?.pergunta ?? ''}`.trim()],
      [{ texto: 'Professores', negrito: true }, professores],
    ] },
    { tipo: 'tabela', cabecalho: 1, colunas: [2.3, 2.2, 2.8, 5.4, 7, 3.2, 3.8], linhas: [
      ['Semana / Período', 'Professor', 'Habilidade (Verbo)', 'O quê? Recorte da habilidade e saberes', 'Como? Descrição das etapas', 'Avaliação (Instrumentos)', 'Atitudes e Valores esperados'],
      ...semanasDoBimestre({ p, roteiro, marcas, habsDoBim, editadas: cfg.semanas }).map((w) => [`Semana ${w.n}\n${w.periodo}`, professores, w.campos.hab, w.campos.oque, w.campos.como, w.campos.aval, w.campos.atit]),
    ] },
  ];
  return blocos;
}


