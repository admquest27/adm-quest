// Lógica do calendário e do reencaixe das fases. Funções puras (sem tela, sem banco), testáveis.
// Datas sempre como texto "aaaa-mm-dd".

const DIA = 86400000;
export const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const dataDe = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDias = (s, n) => iso(new Date(dataDe(s).getTime() + n * DIA));
export const diaSemana = (s) => dataDe(s).getUTCDay();
export const segundaDa = (s) => addDias(s, -((diaSemana(s) + 6) % 7));
export const diasEntre = (a, b) => Math.round((dataDe(b).getTime() - dataDe(a).getTime()) / DIA);

export function formatar(s, comDia = true) {
  const d = dataDe(s);
  const dm = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return comDia ? `${NOMES_DIA[d.getUTCDay()]} ${dm}` : dm;
}

export function intervalo(a, b) {
  const lista = [];
  for (let d = a; d <= b; d = addDias(d, 1)) lista.push(d);
  return lista;
}

// Dias sem aula: feriados, recessos e eventos que bloqueiam o dia (da turma ou de todas).
export function bloqueadosDe(cal, turma) {
  const mapa = new Map();
  for (const s of cal?.semAula ?? []) for (const d of intervalo(s.inicio, s.fim ?? s.inicio)) mapa.set(d, s.motivo);
  for (const e of Object.values(cal?.eventos ?? {})) {
    if (e.bloqueia !== 'dia') continue;
    if (e.turmas?.length && turma && !e.turmas.includes(turma)) continue;
    for (const d of intervalo(e.data, e.fim ?? e.data)) mapa.set(d, e.titulo);
  }
  return mapa;
}

// Tudo o que entra na menção fecha na semana anterior à semana da reunião de fechamento.
export const limiteDoBimestre = (b) => addDias(segundaDa(b.fechamento), -1);

function proximoDia(desde, dow, bloq, ate) {
  for (let d = desde; d <= ate; d = addDias(d, 1)) if (diaSemana(d) === dow && !bloq.has(d)) return d;
  return null;
}

// Distribui as fases, em ordem, nos dias de dinâmica livres, e a consolidação no próximo dia de consolidação livre.
// fixas: datas que o professor fixou ({ faseId: { din, cons } }); as demais se ajustam em volta.
export function gerarAgenda({ fases, bimestre, bloqueados, fixas = {}, diaDin = 2, diaCons = 1 }) {
  const limite = limiteDoBimestre(bimestre);
  const teto = addDias(bimestre.fim, 120);
  const itens = [];
  const folgas = [];
  let cursor = bimestre.inicio;

  for (const f of fases) {
    const fx = fixas[f.id] ?? {};
    let din = fx.din ?? null;
    if (!din) {
      const pular = f.folgaAntes ?? 0;
      let desde = cursor;
      for (let k = 0; k <= pular; k++) {
        const d = proximoDia(desde, diaDin, bloqueados, teto);
        if (!d) { din = null; break; }
        if (k < pular) folgas.push(d); else din = d;
        desde = addDias(d, 1);
      }
    }
    if (din) cursor = addDias(din, 1);

    let cons = null;
    if (f.tipo !== 'chefao') cons = fx.cons ?? (din ? proximoDia(addDias(din, 1), diaCons, bloqueados, teto) : null);

    itens.push({
      faseId: f.id,
      din,
      cons,
      fixaDin: Boolean(fx.din),
      fixaCons: Boolean(fx.cons),
      estouro: Boolean(din && din > limite),
      consEstouro: Boolean(cons && cons > limite),
      foraDoBimestre: Boolean(din && din > bimestre.fim),
    });
  }

  // dias de dinâmica livres até o limite (sobra para coringa, evento ou fase bônus)
  const usados = new Set(itens.map((i) => i.din).filter(Boolean));
  const livres = intervalo(bimestre.inicio, limite).filter((d) => diaSemana(d) === diaDin && !bloqueados.has(d) && !usados.has(d));
  return { itens, limite, livres, folgas };
}

// Diferenças entre o plano confirmado e o sugerido.
export function diferencas(confirmado, itens) {
  if (!confirmado || !Object.keys(confirmado).length) return [];
  return itens.filter((i) => {
    const c = confirmado[i.faseId];
    return c && (c.din !== i.din || (c.cons ?? null) !== (i.cons ?? null));
  }).map((i) => ({ faseId: i.faseId, de: confirmado[i.faseId], para: { din: i.din, cons: i.cons } }));
}

// Bimestre que contém a data (ou o próximo, nas férias).
export function bimestreDe(cal, data) {
  const lista = cal?.bimestres ?? [];
  return lista.find((b) => data >= b.inicio && data <= b.fim) ?? lista.find((b) => b.inicio > data) ?? lista[lista.length - 1] ?? null;
}
