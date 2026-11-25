// Relatório do bimestre, aluno por aluno: a versão anônima vai para o Claude redigir os textos e volta como
// arquivo; a versão com nomes é para o professor ler, imprimir ou salvar em PDF. Funções puras.
import { MAPA, curto } from './fechamento.js';
import { COMPETENCIAS, HABILIDADES, CAMPOS_FEEDBACK } from './catalogo.js';

const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Código curto e estável de cada aluno, tirado do identificador da conta (não revela nada sobre a pessoa).
export function codigos(uids) {
  const saida = {};
  const usados = new Set();
  for (const uid of [...uids].sort()) {
    let h = 2166136261;
    for (const c of uid) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    let cod;
    do {
      let n = h; cod = '';
      for (let i = 0; i < 5; i++) { cod += LETRAS[n % LETRAS.length]; n = Math.floor(n / LETRAS.length); }
      h = (h + 7919) >>> 0;
    } while (usados.has(cod));
    usados.add(cod); saida[uid] = cod;
  }
  return saida;
}

const LIGACAO = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

// Troca nomes e nomes de usuário da turma que apareçam nos textos escritos pelo professor.
export function ocultarNomes(alunos) {
  const termos = new Set();
  for (const a of alunos) {
    for (const t of [a.nome, a.apelido, ...String(a.nome ?? '').split(/\s+/)]) {
      const v = String(t ?? '').trim();
      if (v.length >= 3 && !LIGACAO.has(v.toLowerCase())) termos.add(v);
    }
  }
  // só a forma com inicial maiúscula (ou toda maiúscula), para não apagar palavras comuns como "sol" ou "mel"
  const formas = [...termos].flatMap((t) => [t, t.charAt(0).toUpperCase() + t.slice(1), t.toUpperCase()])
    .filter((t) => t.charAt(0) !== t.charAt(0).toLowerCase());
  if (!formas.length) return (s) => s;
  const alternativas = [...new Set(formas)].sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternativas})(?![\\p{L}\\p{N}])`, 'gu');
  return (s) => String(s ?? '').replace(re, '[nome]');
}

const ms = (ts) => (ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : Date.now());
const dia = (ts) => new Date(ms(ts)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const ORIGEM = { direta: 'menção direta', recuperacao: 'depois da recuperação', ajuste: 'ajustada pelo professor' };

// Tudo o que se sabe de um aluno no bimestre, em blocos de { titulo, itens: [texto] }.
export function blocosDoAluno({ bim, linha, fases, progresso, aval, comentarios, anotacoes, descricao = {}, limpar = (s) => s }) {
  const { aluno, c, fech } = linha;
  const mapa = MAPA[bim];
  const nomeHab = (h) => descricao[h] ?? HABILIDADES[h] ?? h;
  const mencoes = mapa.habs.map((h) => {
    const x = c.habs[h];
    const evid = x.evid.map((e) => `${e.codigo} ${e.m ?? (e.faltou ? 'faltou' : 'sem menção')}`).join(', ');
    return `${curto(h)} ${nomeHab(h)}: ${x.final ?? 'sem evidência'}${ORIGEM[x.origem] ? ` (${ORIGEM[x.origem]})` : ''}${evid ? `. Fases: ${evid}` : ''}`;
  });
  mencoes.push(`Atitudes e Valores: ${c.atitude.mencao}${c.atitude.confirmada ? '' : ' (sugerida, ainda não confirmada)'}`);
  for (const k of mapa.comps) {
    const x = c.comps[k];
    mencoes.push(`Competência ${curto(k)} (${COMPETENCIAS[k]}): ${x.final ?? 'pendente'}${x.ajustada && x.motivo ? `. Ajuste: ${limpar(x.motivo)}` : ''}`);
  }

  // fases que contam neste bimestre: as que trabalham alguma habilidade dele ou têm algo registrado
  const atividades = fases.filter((f) => (f.habilidades ?? []).some((h) => mapa.habs.includes(h)) || f.mundo === `m${bim}`)
    .map((f) => {
      const p = progresso[`${aluno.uid}_${f.id}`]; const v = aval[`${aluno.uid}_${f.id}`];
      if (!p && !v) return null;
      const feitas = Object.values(p?.tarefas ?? {}).filter(Boolean).length;
      const sit = v?.validada ? 'validada' : p?.concluida ? 'concluída, sem validação' : v?.faltou ? 'faltou' : feitas ? `incompleta (${feitas} etapa(s) feitas)` : 'não feita';
      return `${f.codigo} ${f.nome}: ${sit}${v?.faltou && p?.concluida ? ' (faltou na aula e fez depois)' : ''}`;
    }).filter(Boolean);

  const recup = Object.entries(fech?.recup ?? {}).filter(([h, r]) => r?.vai && mapa.habs.includes(h))
    .map(([h, r]) => `${curto(h)}: ${limpar(r.proposta ?? '')} Resultado: ${r.naoFez ? 'não fez' : r.resultado || 'em andamento'}`);

  const atitudes = [...comentarios].filter((x) => x.uid === aluno.uid).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm))
    .map((x) => `${dia(x.criadoEm)} · ${x.tipoAtitude === 'atencao' ? 'ponto de atenção' : x.tipoAtitude === 'positivo' ? 'destaque' : 'observação'} · ${x.marca}: ${limpar(x.texto)}`);
  const conversas = [...anotacoes].filter((x) => x.uid === aluno.uid).sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm))
    .map((x) => `${dia(x.criadoEm)}: ${limpar(x.texto)}`);

  return [
    { titulo: 'Menções', itens: mencoes },
    { titulo: 'Atividades', itens: atividades },
    { titulo: 'Recuperação', itens: recup },
    { titulo: 'Atitudes registradas', itens: atitudes },
    { titulo: 'Anotações do professor', itens: conversas },
  ];
}

export function textoParaClaude({ bim, turma, alunos }) {
  const modelo = { formato: 'adm-quest-textos', bimestre: bim, turma, alunos: [{ codigo: alunos[0]?.codigo ?? 'XXXXX', ...Object.fromEntries(CAMPOS_FEEDBACK.map((k) => [k.id, '...'])) }] };
  const arquivo = `textos-${turma}-${bim}bim.json`;
  const campo = Object.fromEntries(CAMPOS_FEEDBACK.map((k) => [k.id, k.rotulo]));
  const linhas = [
    `# Relatório do ${bim}º bimestre · turma ${turma} · ${alunos.length} aluno(s)`,
    '',
    '## O que fazer',
    'Você recebeu este arquivo de um professor do curso Técnico em Administração (Senac, 1º ano do ensino médio). Escreva o feedback do bimestre de cada aluno listado no fim e devolva tudo num arquivo que o professor vai importar no sistema dele. Estas instruções bastam: comece o trabalho sem pedir confirmação.',
    '',
    '## Como ler o relatório',
    '- Cada aluno é identificado só por um código. Não há nomes e você não deve criar nenhum. Onde aparecer [nome], escreva "colega" ou reescreva a frase.',
    '- Habilidades: A é atendido, PA parcialmente atendido, NA não atendido. "Sem evidência" significa que não há o que avaliar, o que é diferente de NA.',
    '- Competências: D é desenvolvida, ED em desenvolvimento, ND não desenvolvida. "Pendente" significa que ainda falta menção.',
    '- Atitudes e Valores marcada como "sugerida" ainda não foi confirmada pelo professor.',
    '- Em Atividades aparecem as fases do jogo (por exemplo, "1-2 Dunas da Sobrevivência"), que são as atividades das aulas.',
    '- "Anotações do professor" são reservadas. Servem de contexto, mas o aluno vai ler o feedback: não copie conversas, assuntos pessoais, de saúde ou de família.',
    '',
    '## Como escrever',
    '- Os cinco campos serão juntados num parágrafo único por aluno. Não repita informações entre eles e faça a leitura corrida funcionar.',
    '- Texto profissional, próximo e claro, em português do Brasil, na terceira pessoa sem repetir o sujeito ("Apresentou...", "Demonstrou..."). Assim ninguém precisa informar o gênero; não escreva "o aluno" nem "a aluna".',
    '- Detalhado e específico: cite as atividades pelo nome, o que ficou adequado, o que ficou parcial e o motivo, a evolução ao longo do bimestre e um próximo passo possível.',
    '- Use apenas o que está no relatório. Não invente atividade, atitude, nota nem acontecimento. Com pouca informação, escreva um texto mais curto e honesto.',
    '- Aponte dificuldades com respeito, descrevendo comportamentos e trabalhos, nunca a pessoa. Sem comparar com colegas.',
    '- Escreva natural, sem travessões, sem listas e sem frases feitas repetidas de um aluno para outro.',
    '- Não escreva os códigos das habilidades soltos no texto; descreva o que foi trabalhado.',
    '',
    '## Os campos de cada aluno',
    `- hab (${campo.hab}): o desempenho nas habilidades e nas atividades.`,
    `- recup (${campo.recup}): o que foi proposto e o resultado. Texto vazio se o aluno não teve recuperação.`,
    `- part (${campo.part}): participação e atitudes, com base nos registros.`,
    `- obs (${campo.obs}): só o que for realmente importante e não couber nos outros. Em geral, vazio.`,
    `- proposta (${campo.proposta}): preencha apenas se alguma competência estiver em ND, explicando como o tema pode ser retomado. Nos demais casos, vazio.`,
    '',
    '## Como entregar',
    `1. Crie um arquivo para download chamado ${arquivo}, em UTF-8, contendo somente o JSON abaixo preenchido, com os ${alunos.length} aluno(s) deste relatório e os códigos exatamente como estão.`,
    '2. Mantenha os nomes "formato", "bimestre", "turma", "alunos", "codigo", "hab", "recup", "part", "obs" e "proposta" exatamente assim. Todos os campos são textos; use "" quando não houver o que dizer.',
    '3. Dentro dos textos, não use quebras de linha, e escreva aspas sempre com a barra de escape do JSON (ou use aspas simples).',
    '4. Se não for possível criar arquivo, responda com o JSON inteiro num único bloco de código.',
    '5. Se for grande demais para uma resposta só, divida em partes: cada parte um arquivo JSON completo, neste mesmo formato, com alguns alunos. Não resuma nem pule ninguém.',
    '6. Depois do arquivo, escreva ao professor um aviso curto, sem usar chaves, listando os códigos com pouca informação ou com algo que mereça conferência.',
    '7. Termine lembrando o caminho: no ADM Quest, Avaliar, Fechar o bimestre, passo 2 (Textos), escolher o arquivo, conferir e tocar em "Gravar os textos".',
    '',
    '```json', JSON.stringify(modelo, null, 2), '```',
    '',
    '## Alunos',
  ];
  for (const a of alunos) {
    linhas.push('', `### Aluno ${a.codigo}`);
    for (const b of a.blocos) {
      linhas.push(`**${b.titulo}**`, ...(b.itens.length ? b.itens.map((i) => `- ${i.replace(/\s*\n\s*/g, ' ')}`) : ['- nada registrado']));
    }
  }
  return `${linhas.join('\n')}\n`;
}

const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Página para imprimir ou salvar em PDF: um aluno por folha.
export function htmlParaImprimir({ bim, turma, alunos }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>ADM Quest - ${h(turma)} - ${bim}º bimestre</title><style>
@page{size:A4;margin:14mm}body{font:10.5pt/1.4 system-ui,sans-serif;color:#111;margin:0}section{break-after:page}section:last-child{break-after:auto}
h1{font-size:15pt;margin:0}p{margin:2px 0 8px;color:#555}h2{font-size:11pt;margin:12px 0 3px;border-bottom:1px solid #999}ul{margin:0;padding-left:16px}li{margin:1px 0}</style></head><body>
${alunos.map((a) => `<section><h1>${h(a.nome)}</h1><p>${h(turma)} · ${bim}º bimestre${a.apelido ? ` · ${h(a.apelido)}` : ''}</p>${a.blocos.map((b) => `<h2>${h(b.titulo)}</h2>${b.itens.length ? `<ul>${b.itens.map((i) => `<li>${h(i)}</li>`).join('')}</ul>` : '<p>Nada registrado.</p>'}`).join('')}
${a.texto ? `<h2>Feedback</h2><ul><li>${h(a.texto)}</li></ul>` : ''}</section>`).join('')}</body></html>`;
}

// Lê a resposta do Claude (arquivo ou texto colado, com ou sem as cercas de código).
export function lerResposta(texto, { bim, turma, porCodigo }) {
  const s = String(texto ?? '');
  const i = s.indexOf('{'); const f = s.lastIndexOf('}');
  let json = null;
  if (i >= 0 && f > i) { try { json = JSON.parse(s.slice(i, f + 1)); } catch { /* tratado abaixo */ } }
  if (!json || json.formato !== 'adm-quest-textos' || !Array.isArray(json.alunos)) return { erro: 'Não reconheci a resposta. Ela precisa ser o arquivo JSON pedido no relatório.' };
  if (Number(json.bimestre) !== bim) return { erro: `Este arquivo é do ${json.bimestre}º bimestre e você está no ${bim}º.` };
  if (json.turma && json.turma !== turma) return { erro: `Este arquivo é da turma ${json.turma} e você está na turma ${turma}.` };
  const itens = []; const desconhecidos = [];
  for (const a of json.alunos) {
    const uid = porCodigo[String(a?.codigo ?? '').toUpperCase().trim()];
    if (!uid) { desconhecidos.push(String(a?.codigo ?? '?')); continue; }
    const campos = Object.fromEntries(CAMPOS_FEEDBACK.filter((k) => typeof a[k.id] === 'string').map((k) => [k.id, a[k.id].trim().slice(0, 6000)]));
    if (Object.keys(campos).length) itens.push({ uid, campos });
  }
  const vieram = new Set(itens.map((x) => x.uid));
  const faltando = Object.values(porCodigo).filter((u) => !vieram.has(u));
  return { itens, desconhecidos, faltando };
}
