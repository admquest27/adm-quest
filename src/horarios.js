// Horários reais de cada turma e encaixe do roteiro da aula dentro deles. Funções puras.
//
// Um dia de aula é uma lista de encontros. Cada encontro é uma ida da turma à sala, com um ou mais
// trechos (um trecho por bloco contínuo, separados por intervalo). Exemplo: [{ trechos: [{ ini: '09:40',
// fim: '10:27' }, { ini: '10:55', fim: '11:30' }] }]. "foco" marca a hora em que a atenção cai.
// Todo encontro começa com a chamada (10 min) e termina com o encerramento (5 min).

export const CHAMADA = 10;
export const ENCERRAMENTO = 5;

const paraMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
export const hhmm = (x) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;

// O horário de cada turma fica só no banco (planos), nunca aqui: o código é público.

// Texto que o professor escreve: uma linha por encontro, trechos separados por vírgula,
// e "atenção até HH:MM" quando a turma cansa antes do fim. Aceita 9:40 ou 9h40.
export function lerHorario(texto) {
  const encontros = [];
  for (const linha of String(texto ?? '').split(/\n/)) {
    const [antes, depois] = linha.toLowerCase().split(/aten[cç][aã]o/);
    const horas = [...antes.matchAll(/(\d{1,2})\s*[:h]\s*(\d{2})/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
    const trechos = [];
    for (let i = 0; i + 1 < horas.length; i += 2) if (paraMin(horas[i + 1]) > paraMin(horas[i])) trechos.push({ ini: horas[i], fim: horas[i + 1] });
    if (!trechos.length) continue;
    const enc = { trechos };
    const f = depois?.match(/(\d{1,2})\s*[:h]\s*(\d{2})/);
    if (f) enc.foco = `${f[1].padStart(2, '0')}:${f[2]}`;
    encontros.push(enc);
  }
  return encontros;
}

export const escreverHorario = (encontros) => (encontros ?? [])
  .map((e) => e.trechos.map((t) => `${t.ini}-${t.fim}`).join(', ') + (e.foco ? ` atenção até ${e.foco}` : '')).join('\n');

// Horário de um dia da semana (1 = segunda) no plano da turma. Sem horário: uma aula de "minutos" a partir de 00:00.
export function horarioDoDia(plano, dow) {
  const h = plano?.horarios?.[String(dow)];
  if (h?.length) return { encontros: h, relativo: false };
  return { encontros: [{ trechos: [{ ini: '00:00', fim: hhmm(plano?.minutosDia ?? 100) }] }], relativo: true };
}

// Janelas úteis (sem chamada e encerramento), marcando o tempo depois do "foco" como turma cansada.
export function janelas(encontros) {
  return (encontros ?? []).map((e, k) => {
    const tr = (e.trechos ?? []).map((t) => ({ ini: paraMin(t.ini), fim: paraMin(t.fim) })).filter((t) => t.fim > t.ini);
    if (!tr.length) return null;
    const chamada = { ini: tr[0].ini, fim: Math.min(tr[0].ini + CHAMADA, tr[0].fim) };
    const ult = tr[tr.length - 1];
    const encerra = { ini: Math.max(ult.fim - ENCERRAMENTO, ult.ini), fim: ult.fim };
    const foco = e.foco ? paraMin(e.foco) : null;
    const uteis = [];
    tr.forEach((t, i) => {
      const a = i === 0 ? chamada.fim : t.ini;
      const b = i === tr.length - 1 ? encerra.ini : t.fim;
      if (b <= a) return;
      if (foco != null && foco > a && foco < b) { uteis.push({ k, ini: a, fim: foco }); uteis.push({ k, ini: foco, fim: b, cansado: true }); }
      else uteis.push({ k, ini: a, fim: b, cansado: foco != null && a >= foco });
    });
    return { k, trechos: tr, chamada, encerra, uteis, util: uteis.reduce((s, w) => s + w.fim - w.ini, 0), foco };
  }).filter(Boolean);
}

export const tempoUtil = (encontros) => janelas(encontros).map((e) => e.util);

function colocar(blocos, enc) {
  const W = enc.flatMap((e) => e.uteis);
  const pecas = [];
  const fora = [];
  let wi = 0;
  let t = W[0]?.ini ?? 0;
  blocos.forEach((b, bi) => {
    // "quebra": se a aula do dia for dividida, este bloco começa no encontro seguinte
    if (b.quebra && W[wi]) {
      const k = W[wi].k;
      const prox = W.findIndex((w) => w.k > k);
      if (prox >= 0 && pecas.some((p) => p.k === k)) { wi = prox; t = W[wi].ini; }
    }
    let resta = Number(b.min) || 0;
    let parte = 0;
    while (resta > 0 && wi < W.length) {
      const livre = W[wi].fim - t;
      if (livre <= 0) { wi += 1; t = W[wi]?.ini ?? t; continue; }
      const usa = Math.min(resta, livre);
      const ant = pecas[pecas.length - 1];
      // a linha da atenção não corta o bloco em dois: emenda no pedaço anterior
      if (ant && ant.bi === bi && ant.fim === t) ant.fim = t + usa;
      else { pecas.push({ bi, k: W[wi].k, ini: t, fim: t + usa, cansado: !!W[wi].cansado, parte }); parte += 1; }
      t += usa; resta -= usa;
    }
    if (resta > 0) fora.push({ bi, min: resta });
  });
  return { pecas, fora };
}

// Encaixa o roteiro no horário. Se não couber, tira primeiro os blocos marcados "pode cortar", do último para o primeiro.
export function encaixar(blocos, encontros) {
  const enc = janelas(encontros);
  const ativos = blocos.map((b, i) => ({ ...b, i }));
  const cortados = [];
  let r = colocar(ativos, enc);
  while (r.fora.length) {
    const idx = ativos.map((b) => b.corta === true).lastIndexOf(true);
    if (idx < 0) break;
    cortados.unshift(ativos[idx]);
    ativos.splice(idx, 1);
    r = colocar(ativos, enc);
  }
  const util = enc.reduce((s, e) => s + e.util, 0);
  const usado = r.pecas.reduce((s, p) => s + p.fim - p.ini, 0);
  return {
    enc, blocos: ativos, pecas: r.pecas, fora: r.fora.map((f) => ({ ...f, bloco: ativos[f.bi] })), cortados,
    util, usado, sobra: util - usado, falta: r.fora.reduce((s, f) => s + f.min, 0),
  };
}

// Resumo curto para uma turma: "75 min úteis · cabe" ou "32 + 32 min úteis · corta Conversa".
export function resumoEncaixe(blocos, encontros) {
  const r = encaixar(blocos, encontros);
  const util = r.enc.map((e) => e.util).join(' + ');
  const partes = [`${util} min úteis`];
  if (r.falta) partes.push(`passa ${r.falta} min`);
  else if (r.sobra > 0) partes.push(`sobram ${r.sobra} min`);
  else partes.push('cabe certinho');
  if (r.cortados.length) partes.push(`fica de fora: ${r.cortados.map((b) => b.titulo).join(', ')}`);
  return { texto: partes.join(' · '), ruim: r.falta > 0, r };
}
