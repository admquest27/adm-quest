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
  const linhas = [
    `# Relatório do ${bim}º bimestre · turma ${turma}`,
    '',
    '## Pedido',
    'Escreva o feedback de cada aluno abaixo para a planilha da coordenação do curso Técnico em Administração (Senac, 1º ano do ensino médio).',
    'Use só o que está no relatório. Não use nome (cada aluno é identificado por um código). Parágrafos corridos, em português claro, citando as atividades pelo nome, o que ficou adequado e o que ficou parcial, a evolução, a participação e o próximo passo.',
    'Campos de cada aluno:',
    ...CAMPOS_FEEDBACK.map((k) => `- ${k.id}: ${k.rotulo}${k.id === 'recup' ? ' (vazio se não houve recuperação)' : k.id === 'obs' ? ' (vazio se não houver nada importante)' : k.id === 'proposta' ? ' (só quando alguma competência for ND)' : ''}`),
    '',
    'Responda com um único arquivo JSON, sem texto antes ou depois, neste formato, com todos os alunos:',
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
