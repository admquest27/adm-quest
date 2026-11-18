// Estatísticas da turma: fases, menções, pendências e atitudes. Só para o professor.
import { esc } from './ui.js';
import { progId, contarTarefas, situacao } from './fases.js';
import { MARCAS } from './registros.js';

const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);

function barra(partes) {
  const total = partes.reduce((s, p) => s + p.n, 0);
  if (!total) return '<div class="barra vazia"></div>';
  return `<div class="barra">${partes.filter((p) => p.n).map((p) => `<span class="${p.classe}" style="width:${(100 * p.n) / total}%" title="${esc(p.rotulo)}: ${p.n}">${p.n}</span>`).join('')}</div>`;
}

export function htmlEstatisticas(st) {
  const turma = st.turmas.find((t) => t.id === st.turma);
  if (!turma) return '<p class="vazio">Crie uma turma primeiro.</p>';
  const ativos = st.alunos.filter((a) => a.turma === st.turma && a.status === 'ativo');
  if (!ativos.length) return '<p class="vazio">Ainda não há alunos ativos nesta turma.</p>';
  const estados = turma.estadoFases ?? {};
  const fases = st.fases.filter((f) => ['aberta', 'encerrada'].includes(estados[f.id] ?? 'trancada'));

  // por fase
  const linhasFase = fases.map((f) => {
    const est = estados[f.id];
    let concl = 0, val = 0, falt = 0, nao = 0, pres = 0, sumFeitas = 0, sumTotal = 0;
    for (const a of ativos) {
      const id = progId(a.uid, f.id);
      const p = st.progresso[id]; const v = st.aval[id];
      const sit = situacao(f, p, v, est);
      if (p?.concluida) concl++;
      if (v?.validada) val++;
      if (v?.faltou) falt++;
      if (sit === 'naoconcluida') nao++;
      if (!v?.faltou || p?.concluida) pres++;
      const { total, feitas } = contarTarefas(f, p);
      sumTotal += total; sumFeitas += feitas;
    }
    return `<li class="est-fase">
      <div><strong>${esc(f.codigo)}</strong> ${esc(f.nome)} <span class="chip">${est === 'encerrada' ? 'Encerrada' : 'Aberta'}</span></div>
      ${barra([
        { n: val, classe: 'b-ok', rotulo: 'Validadas' },
        { n: concl - val, classe: 'b-info', rotulo: 'Concluídas, sem validar' },
        { n: Math.max(0, ativos.length - concl - falt - nao), classe: 'b-meio', rotulo: 'Em andamento ou não iniciadas' },
        { n: nao, classe: 'b-aten', rotulo: 'Não concluídas (encerrada)' },
        { n: falt, classe: 'b-falta', rotulo: 'Faltaram' },
      ])}
      <p class="nota">${concl} de ${pres} presentes concluíram (${pct(concl, pres)}%) · ${val} validadas · ${falt} faltaram${nao ? ` · ${nao} não concluíram` : ''} · etapas feitas: ${pct(sumFeitas, sumTotal)}%</p>
    </li>`;
  }).join('');

  // menções por habilidade
  const habs = st.mundo?.habilidades ?? {};
  const cont = {};
  for (const a of ativos) {
    for (const f of st.fases) {
      const v = st.aval[progId(a.uid, f.id)];
      for (const [cod, m] of Object.entries(v?.mencoes ?? {})) {
        if (!m) continue;
        cont[cod] = cont[cod] ?? { A: 0, PA: 0, NA: 0 };
        cont[cod][m] = (cont[cod][m] ?? 0) + 1;
      }
    }
  }
  const linhasHab = Object.keys(habs).filter((c) => cont[c]).map((cod) => `<li class="est-fase">
      <div><strong>${esc(cod)}</strong> <span class="nota">${esc(habs[cod])}</span></div>
      ${barra([{ n: cont[cod].A, classe: 'b-ok', rotulo: 'A' }, { n: cont[cod].PA, classe: 'b-pa', rotulo: 'PA' }, { n: cont[cod].NA, classe: 'b-na', rotulo: 'NA' }])}
      <p class="nota"><span class="chip m-A">A ${cont[cod].A}</span> <span class="chip m-PA">PA ${cont[cod].PA}</span> <span class="chip m-NA">NA ${cont[cod].NA}</span></p>
    </li>`).join('');

  // alunos para olhar
  const olhar = [];
  for (const a of ativos) {
    let nas = 0, pend = 0;
    for (const f of st.fases) {
      const id = progId(a.uid, f.id);
      const v = st.aval[id];
      nas += Object.values(v?.mencoes ?? {}).filter((m) => m === 'NA').length;
      const sit = situacao(f, st.progresso[id], v, estados[f.id]);
      if (sit === 'naoconcluida' || sit === 'afazer') pend++;
    }
    if (nas || pend) olhar.push({ a, nas, pend });
  }
  olhar.sort((x, y) => (y.nas * 3 + y.pend) - (x.nas * 3 + x.pend));

  // atitudes
  const marcas = MARCAS.map((m) => {
    const lista = st.comentarios.filter((c) => c.marca === m.nome && ativos.some((a) => a.uid === c.uid));
    return { nome: m.nome, pos: lista.filter((c) => c.tipoAtitude !== 'atencao').length, atn: lista.filter((c) => c.tipoAtitude === 'atencao').length };
  });

  return `<h2>Estatísticas da turma</h2>
    <p class="nota">${ativos.length} aluno(s) ativo(s). Só você vê esta tela.</p>
    <h3>Por fase</h3>
    <ul class="lista">${linhasFase || '<li class="vazio">Nenhuma fase aberta ainda.</li>'}</ul>
    <h3>Menções por habilidade</h3>
    <ul class="lista">${linhasHab || '<li class="vazio">Nenhuma menção registrada ainda.</li>'}</ul>
    <h3>Para olhar com atenção</h3>
    <ul class="lista">${olhar.length ? olhar.map((o) => `<li class="aluno"><span class="num">${o.a.numeroChamada ?? '—'}</span><span class="nome">${esc(o.a.apelido)}</span>${o.nas ? `<span class="chip m-NA">${o.nas} NA</span>` : ''}${o.pend ? `<span class="chip sit-naoconcluida">${o.pend} fase(s) pendente(s)</span>` : ''}</li>`).join('') : '<li class="vazio">Ninguém com NA ou fase pendente.</li>'}</ul>
    <h3>Atitudes registradas</h3>
    <ul class="lista">${marcas.map((m) => `<li class="aluno"><span class="nome">${esc(m.nome)}</span><span class="chip m-A">${m.pos} positivas</span><span class="chip m-PA">${m.atn} de atenção</span></li>`).join('')}</ul>`;
}
