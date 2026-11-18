// Aba Agenda do professor: calendário oficial, eventos, plano das fases e reencaixe com autorização.
import { doc, setDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc, hoje } from './ui.js';
import { ESTADO_ROTULO } from './fases.js';
import {
  addDias, diaSemana, segundaDa, diasEntre, formatar, bloqueadosDe, limiteDoBimestre, gerarAgenda, diferencas, bimestreDe, NOMES_DIA, dataDe,
} from './agenda.js';

export const ANO = 2027;
const TIPOS = { senac: 'Evento do Senac', pessoal: 'Pessoal', outro: 'Outro', oficial: 'Calendário oficial' };

// ---------- planejamento ----------
export function planejar(st) {
  const cal = st.cal;
  if (!cal?.bimestres?.length) return null;
  const alvo = st.calBim ?? bimestreDe(cal, hoje())?.id;
  const b = cal.bimestres.find((x) => x.id === alvo) ?? cal.bimestres[0];
  const bloq = bloqueadosDe(cal, st.turma);
  const plano = st.plano ?? {};
  const fases = st.mundo?.ordem === b.id ? st.fases : [];
  const diaDin = plano.diaDin ?? 2;
  const diaCons = plano.diaCons ?? 1;
  const ag = fases.length
    ? gerarAgenda({ fases, bimestre: b, bloqueados: bloq, fixas: plano.fixas ?? {}, diaDin, diaCons })
    : { itens: [], limite: limiteDoBimestre(b), livres: [], folgas: [] };
  return { cal, b, bloq, plano, fases, ag, diaDin, diaCons, dif: diferencas(plano.confirmado, ag.itens) };
}

const faseDe = (p, id) => p.fases.find((f) => f.id === id);
const item = (p, id) => p.ag.itens.find((i) => i.faseId === id);

// ---------- peças da tela ----------
function seletorBimestre(p) {
  return `<div class="marcas">${p.cal.bimestres.map((b) => `<button class="mini ${b.id === p.b.id ? 'ok cheio' : ''}" data-acao="cal-bim" data-id="${b.id}">${esc(b.nome)}</button>`).join('')}</div>
    <p class="nota">${formatar(p.b.inicio)} a ${formatar(p.b.fim)} · reunião de fechamento ${formatar(p.b.fechamento)} · as tarefas terminam até ${formatar(p.ag.limite)} (semana anterior ao fechamento)</p>`;
}

function cartaoHoje(p, st) {
  const h = hoje();
  const motivo = p.bloq.get(h);
  const doDia = p.ag.itens.filter((i) => i.din === h || i.cons === h);
  const futuras = p.ag.itens.flatMap((i) => [i.din && i.din > h ? { d: i.din, tipo: 'Dinâmica', id: i.faseId } : null, i.cons && i.cons > h ? { d: i.cons, tipo: 'Consolidação', id: i.faseId } : null]).filter(Boolean).sort((a, b) => a.d.localeCompare(b.d));
  const prox = futuras[0];
  const estados = st.turmas.find((t) => t.id === st.turma)?.estadoFases ?? {};
  const linhas = doDia.map((i) => {
    const f = faseDe(p, i.faseId);
    const din = i.din === h;
    const aberta = (estados[i.faseId] ?? 'trancada') === 'aberta';
    return `<li class="aluno"><span class="nome">${din ? 'Dinâmica' : 'Consolidação'}: <strong>${esc(f.codigo)} ${esc(f.nome)}</strong></span>
      ${din && !aberta ? `<button class="mini ok" data-acao="cal-abrir" data-id="${esc(f.id)}">Abrir a fase</button>` : din ? '<span class="chip ativo">Aberta</span>' : ''}</li>`;
  }).join('');
  return `<section class="cal-hoje"><h3>Hoje, ${formatar(h)}</h3>
    ${motivo ? `<p>Sem aula: ${esc(motivo)}.</p>` : linhas ? `<ul class="lista">${linhas}</ul>` : '<p class="nota">Nenhuma fase planejada para hoje.</p>'}
    ${prox ? `<p class="nota">Próximo: ${formatar(prox.d)} · ${prox.tipo} da ${esc(faseDe(p, prox.id).codigo)} ${esc(faseDe(p, prox.id).nome)}</p>` : ''}</section>`;
}

function alertas(p) {
  const partes = [];
  const est = p.ag.itens.filter((i) => i.estouro);
  const cEst = p.ag.itens.filter((i) => i.consEstouro && !i.estouro);
  if (est.length) {
    partes.push(`<div class="alerta ruim"><strong>Não cabe no bimestre</strong><p>${est.map((i) => `${esc(faseDe(p, i.faseId).codigo)} ${esc(faseDe(p, i.faseId).nome)} ficaria em ${formatar(i.din)}`).join('; ')}. O limite é ${formatar(p.ag.limite)}. Você pode cortar uma fase, usar uma sobra ou fixar datas.</p></div>`);
  }
  if (cEst.length) {
    partes.push(`<div class="alerta"><strong>Consolidação depois do limite</strong><p>${cEst.map((i) => `${esc(faseDe(p, i.faseId).codigo)} em ${formatar(i.cons)}`).join('; ')}.</p></div>`);
  }
  if (!p.fases.length) {
    partes.push('<div class="alerta"><strong>Sem fases neste bimestre</strong><p>Ainda não há conteúdo de fases para este bimestre. O calendário mostra só as datas oficiais e os seus eventos.</p></div>');
  } else if (!Object.keys(p.plano.confirmado ?? {}).length) {
    partes.push('<div class="alerta"><strong>Plano ainda não confirmado</strong><p>Este é o plano sugerido pelo calendário. Confirme para o sistema avisar quando algo mudar.</p><button class="mini ok" data-acao="cal-confirmar">Confirmar este plano</button></div>');
  } else if (p.dif.length) {
    partes.push(`<div class="alerta mudou"><strong>O plano sugerido mudou</strong><p>Por causa de eventos, bloqueios ou datas fixadas, ${p.dif.length} fase(s) mudariam de data:</p>
      <ul>${p.dif.map((d) => `<li>${esc(faseDe(p, d.faseId).codigo)}: dinâmica ${d.de.din ? formatar(d.de.din) : '—'} → <strong>${d.para.din ? formatar(d.para.din) : '—'}</strong>${(d.de.cons ?? null) !== (d.para.cons ?? null) ? `; consolidação ${d.de.cons ? formatar(d.de.cons) : '—'} → <strong>${d.para.cons ? formatar(d.para.cons) : '—'}</strong>` : ''}</li>`).join('')}</ul>
      <button class="mini ok" data-acao="cal-confirmar">Aceitar o novo plano</button></div>`);
  } else {
    partes.push('<div class="alerta ok"><strong>Plano confirmado em dia</strong><p>Nada mudou desde que você confirmou.</p></div>');
  }
  if (p.fases.length && p.ag.livres.length) {
    partes.push(`<div class="alerta"><strong>Sobram ${p.ag.livres.length} dia(s) de dinâmica livres até o limite</strong><p>${p.ag.livres.map((d) => formatar(d)).join(', ')}. Use como semana coringa, revisão ou fase bônus.</p></div>`);
  }
  return partes.join('');
}

// linha do tempo do bimestre: fases (dinâmica e consolidação), dias sem aula, eventos, fechamento e o realizado
function linhaDoTempo(p, st) {
  if (!p.fases.length) return '';
  const { b } = p;
  const W = 520, esq = 40, dir = 8, topo = 28, h = 26;
  const total = Math.max(1, diasEntre(b.inicio, b.fim));
  const util = W - esq - dir;
  const x = (d) => esq + (Math.max(0, Math.min(total, diasEntre(b.inicio, d))) / total) * util;
  const larg = Math.max(3, util / total);
  const H = topo + p.fases.length * h + 22;
  const turma = st.turmas.find((t) => t.id === st.turma);
  let faixas = '';
  for (const [d, motivo] of p.bloq) {
    if (d < b.inicio || d > b.fim) continue;
    const dow = diaSemana(d);
    if (dow === 0 || dow === 6) continue;
    faixas += `<rect class="g-semaula" x="${x(d)}" y="${topo}" width="${larg}" height="${p.fases.length * h}"><title>${esc(formatar(d))}: ${esc(motivo)}</title></rect>`;
  }
  for (const e of Object.values(p.cal.eventos ?? {})) {
    if (e.tipo === 'oficial' || e.data < b.inicio || e.data > b.fim) continue;
    faixas += `<rect class="g-evento" x="${x(e.data)}" y="${topo}" width="${larg}" height="${p.fases.length * h}"><title>${esc(formatar(e.data))}: ${esc(e.titulo)}</title></rect>`;
  }
  let meses = '';
  for (let d = b.inicio; d <= b.fim; d = addDias(d, 1)) {
    if (d === b.inicio || d.endsWith('-01')) {
      meses += `<line class="g-eixo" x1="${x(d)}" x2="${x(d)}" y1="${topo - 6}" y2="${H - 22}"/><text class="g-mes" x="${x(d) + 3}" y="${topo - 10}">${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][dataDe(d).getUTCMonth()]}</text>`;
    }
  }
  const linhas = p.fases.map((f, r) => {
    const i = item(p, f.id);
    const y = topo + r * h + 5;
    const datas = turma?.datas?.[f.id] ?? {};
    let s = `<text class="g-rot" x="4" y="${y + 12}">${esc(f.codigo)}</text>`;
    if (i?.din) {
      if (i.cons) s += `<line class="g-lig" x1="${x(i.din)}" x2="${x(i.cons)}" y1="${y + 8}" y2="${y + 8}"/>`;
      s += `<rect class="g-din ${i.estouro ? 'g-estouro' : ''} ${i.fixaDin ? 'g-fixa' : ''}" x="${x(i.din) - 1}" y="${y}" width="${larg + 2}" height="16" rx="3"><title>${esc(f.nome)} · dinâmica ${formatar(i.din)}</title></rect>`;
      if (i.cons) s += `<rect class="g-cons ${i.consEstouro ? 'g-estouro' : ''}" x="${x(i.cons) - 1}" y="${y}" width="${larg + 2}" height="16" rx="3"><title>${esc(f.nome)} · consolidação ${formatar(i.cons)}</title></rect>`;
    }
    if (datas.aberta) s += `<path class="g-real" d="M${x(datas.aberta)} ${y + 20} l-4 6 h8 z"><title>Aberta em ${formatar(datas.aberta)}</title></path>`;
    return s;
  }).join('');
  const lim = x(p.ag.limite);
  const fech = x(p.b.fechamento);
  return `<h3>Linha do tempo</h3>
    <div class="rolagem-x"><svg class="gantt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Linha do tempo das fases do bimestre">
      ${faixas}${meses}${linhas}
      <line class="g-limite" x1="${lim}" x2="${lim}" y1="${topo - 6}" y2="${H - 20}"/>
      <line class="g-fecha" x1="${fech}" x2="${fech}" y1="${topo - 6}" y2="${H - 20}"/>
      <text class="g-mes" x="${Math.min(lim, W - 70)}" y="${H - 6}">limite das tarefas</text>
    </svg></div>
    <p class="legenda-gantt"><span class="lg g-din"></span> dinâmica <span class="lg g-cons"></span> consolidação <span class="lg g-semaula"></span> sem aula <span class="lg g-evento"></span> seu evento <span class="lg g-estouro"></span> não cabe <span class="lg g-real"></span> aberta de fato</p>`;
}

function previstoRealizado(p, st) {
  const turma = st.turmas.find((t) => t.id === st.turma);
  const linhas = p.fases.map((f) => {
    const i = item(p, f.id);
    const ab = turma?.datas?.[f.id]?.aberta;
    if (!i?.din || !ab) return '';
    const dif = diasEntre(i.din, ab);
    const classe = dif <= 0 ? 'm-A' : dif <= 6 ? 'm-PA' : 'm-NA';
    const txt = dif === 0 ? 'no dia previsto' : dif > 0 ? `${dif} dia(s) depois` : `${-dif} dia(s) antes`;
    return `<li class="aluno"><span class="cod">${esc(f.codigo)}</span><span class="nome">${esc(f.nome)}</span><span class="nota">previsto ${formatar(i.din)} · aberta ${formatar(ab)}</span><span class="chip ${classe}">${txt}</span></li>`;
  }).join('');
  if (!linhas) return '';
  return `<h3>Previsto e realizado</h3><ul class="lista">${linhas}</ul>`;
}

function semanas(p, st) {
  if (!p.fases.length && !Object.keys(p.cal.eventos ?? {}).length) return '';
  const h = hoje();
  const cartoes = [];
  const eventos = Object.entries(p.cal.eventos ?? {}).map(([id, e]) => ({ id, ...e }));
  for (let seg = segundaDa(p.b.inicio); seg <= p.b.fim; seg = addDias(seg, 7)) {
    const dias = [0, 1, 2, 3, 4].map((k) => addDias(seg, k));
    const linhas = dias.map((d) => {
      const dow = diaSemana(d);
      const motivo = p.bloq.get(d);
      const itensDia = [];
      for (const i of p.ag.itens) {
        const f = faseDe(p, i.faseId);
        if (i.din === d) itensDia.push(`<button class="cal-item din ${i.estouro ? 'estouro' : ''}" data-acao="cal-fase" data-id="${esc(f.id)}">${i.fixaDin ? '📌 ' : ''}${esc(f.codigo)} ${esc(f.nome)} <small>dinâmica</small></button>`);
        if (i.cons === d) itensDia.push(`<button class="cal-item cons ${i.consEstouro ? 'estouro' : ''}" data-acao="cal-fase" data-id="${esc(f.id)}">${i.fixaCons ? '📌 ' : ''}Consolida ${esc(f.codigo)}</button>`);
      }
      const evs = eventos.filter((e) => d >= e.data && d <= (e.fim ?? e.data));
      const chips = evs.map((e) => `<button class="cal-ev ${e.tipo === 'oficial' ? 'oficial' : ''} ${e.bloqueia === 'dia' ? 'bloq' : ''}" data-acao="cal-evento" data-id="${esc(e.id)}">${esc(e.titulo)}</button>`).join('');
      const ehAula = dow === p.diaDin || dow === p.diaCons;
      if (!ehAula && !motivo && !chips) return '';
      return `<div class="cal-dia ${d === h ? 'hoje' : ''} ${motivo ? 'sem-aula' : ''}"><span class="cal-d">${formatar(d)}</span><div class="cal-itens">${motivo ? `<span class="cal-motivo">Sem aula: ${esc(motivo)}</span>` : ''}${itensDia.join('')}${chips}${!motivo && ehAula && !itensDia.length ? '<span class="nota">livre</span>' : ''}</div></div>`;
    }).join('');
    cartoes.push(`<div class="cal-semana"><h4>Semana de ${formatar(seg, false)}</h4>${linhas || '<p class="nota">Sem aulas nem eventos.</p>'}</div>`);
  }
  return `<h3>Semana a semana</h3><p class="nota">Toque numa fase para ver ou fixar a data (📌 = fixada por você), ou num evento para editar.</p>${cartoes.join('')}`;
}

function listaEventos(p) {
  const evs = Object.entries(p.cal.eventos ?? {}).map(([id, e]) => ({ id, ...e }))
    .filter((e) => e.data >= p.b.inicio && e.data <= p.b.fim).sort((a, b) => a.data.localeCompare(b.data));
  return `<h3>Eventos</h3><button class="mini ok" data-acao="cal-evento" data-id="">+ Evento</button>
    <ul class="lista">${evs.map((e) => `<li class="aluno" data-acao="cal-evento" data-id="${esc(e.id)}"><span class="nome">${formatar(e.data)}${e.fim ? ` a ${formatar(e.fim)}` : ''} · ${esc(e.titulo)}</span><span class="chip ${e.bloqueia === 'dia' ? 'm-NA' : ''}">${e.bloqueia === 'dia' ? 'sem aula' : TIPOS[e.tipo] ?? 'lembrete'}</span></li>`).join('') || '<li class="vazio">Nenhum evento neste bimestre.</li>'}</ul>`;
}

function configurar(p) {
  const opcoes = (sel) => NOMES_DIA.slice(1, 6).map((n, k) => `<option value="${k + 1}" ${k + 1 === sel ? 'selected' : ''}>${n}</option>`).join('');
  return `<details class="mais"><summary>Dias de aula desta turma</summary>
    <label for="cal-din">Dia da dinâmica (sala)</label><select id="cal-din">${opcoes(p.diaDin)}</select>
    <label for="cal-cons">Dia da consolidação (laboratório)</label><select id="cal-cons">${opcoes(p.diaCons)}</select>
    <button class="mini" data-acao="cal-config">Salvar</button></details>`;
}

export function htmlAgenda(st) {
  if (!st.turma) return '<p class="vazio">Crie uma turma primeiro, na aba Mais.</p>';
  if (!st.cal) {
    return `<h2>Agenda</h2><div class="alerta"><strong>Calendário oficial ainda não carregado</strong>
      <p>Escolha o arquivo do calendário (por exemplo, calendario-2027.json).</p><input type="file" id="arq-cal" accept=".json,application/json"></div>`;
  }
  const p = planejar(st);
  return `<h2>Agenda</h2>${seletorBimestre(p)}${cartaoHoje(p, st)}${alertas(p)}${linhaDoTempo(p, st)}${previstoRealizado(p, st)}${semanas(p, st)}${listaEventos(p)}${configurar(p)}`;
}

// ---------- janelas ----------
const refCal = () => doc(db, 'calendario', String(ANO));
const refPlano = (turma) => doc(db, 'planos', turma);

function dialogoEvento(st, dlg, id) {
  const e = id ? st.cal.eventos?.[id] : null;
  if (e?.tipo === 'oficial') {
    dlg.innerHTML = `<div class="form"><h2>${esc(e.titulo)}</h2><p>${formatar(e.data)}${e.fim ? ` a ${formatar(e.fim)}` : ''}</p><p class="nota">Evento do calendário oficial do Senac. ${e.bloqueia === 'dia' ? 'Não há aula neste dia.' : 'Não bloqueia a aula.'}</p><button class="botao" type="button" id="ev-fechar">Fechar</button></div>`;
    dlg.onclick = (ev) => { if (ev.target.id === 'ev-fechar') dlg.close(); };
    dlg.showModal();
    return;
  }
  dlg.innerHTML = `
    <form class="form" id="form-evento">
      <h2>${id ? 'Editar evento' : 'Novo evento'}</h2>
      <label for="ev-titulo">O que é</label>
      <input id="ev-titulo" maxlength="80" value="${esc(e?.titulo ?? '')}" required>
      <label for="ev-data">Dia</label>
      <input id="ev-data" type="date" value="${esc(e?.data ?? hoje())}" required>
      <label for="ev-fim">Até (se durar mais de um dia)</label>
      <input id="ev-fim" type="date" value="${esc(e?.fim ?? '')}">
      <label for="ev-tipo">Tipo</label>
      <select id="ev-tipo">${['senac', 'pessoal', 'outro'].map((t) => `<option value="${t}" ${(e?.tipo ?? 'senac') === t ? 'selected' : ''}>${TIPOS[t]}</option>`).join('')}</select>
      <label for="ev-bloq">Efeito nas aulas</label>
      <select id="ev-bloq"><option value="nao" ${e?.bloqueia !== 'dia' ? 'selected' : ''}>Só um lembrete (as aulas continuam)</option><option value="dia" ${e?.bloqueia === 'dia' ? 'selected' : ''}>Não há aula nesse(s) dia(s)</option></select>
      <label for="ev-turmas">Vale para</label>
      <select id="ev-turmas"><option value="todas" ${!e?.turmas?.length ? 'selected' : ''}>Todas as turmas</option><option value="esta" ${e?.turmas?.length ? 'selected' : ''}>Só a turma ${esc(st.turma)}</option></select>
      <p class="erro" id="ev-msg"></p>
      <div class="linha-btn"><button class="botao" type="submit">Salvar</button><button class="botao secundario" type="button" id="ev-cancelar">Cancelar</button></div>
      ${id ? '<hr><button class="mini ruim" type="button" id="ev-apagar">Apagar evento</button>' : ''}
    </form>`;
  dlg.onclick = (ev) => {
    if (ev.target.id === 'ev-cancelar') dlg.close();
    if (ev.target.id === 'ev-apagar' && confirm('Apagar este evento?')) {
      updateDoc(refCal(), { [`eventos.${id}`]: deleteField() }).then(() => dlg.close()).catch(() => { document.getElementById('ev-msg').textContent = 'Não consegui apagar agora.'; });
    }
  };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-evento') return;
    ev.preventDefault();
    const data = document.getElementById('ev-data').value;
    const fim = document.getElementById('ev-fim').value;
    if (fim && fim < data) { document.getElementById('ev-msg').textContent = 'O fim não pode ser antes do início.'; return; }
    const novo = {
      data, titulo: document.getElementById('ev-titulo').value.trim(), tipo: document.getElementById('ev-tipo').value,
      bloqueia: document.getElementById('ev-bloq').value,
    };
    if (fim) novo.fim = fim;
    if (document.getElementById('ev-turmas').value === 'esta') novo.turmas = [st.turma];
    const eid = id || `e${Date.now().toString(36)}`;
    try { await updateDoc(refCal(), { [`eventos.${eid}`]: novo }); dlg.close(); }
    catch { document.getElementById('ev-msg').textContent = 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}

function dialogoFase(st, dlg, faseId) {
  const p = planejar(st);
  const f = faseDe(p, faseId);
  const i = item(p, faseId);
  if (!f || !i) return;
  const confirmada = p.plano.confirmado?.[faseId];
  const turma = st.turmas.find((t) => t.id === st.turma);
  const datas = turma?.datas?.[faseId] ?? {};
  dlg.innerHTML = `
    <form class="form" id="form-cal-fase">
      <h2>${esc(f.codigo)} · ${esc(f.nome)}</h2>
      <p class="nota">Estado: ${esc(ESTADO_ROTULO[turma?.estadoFases?.[faseId] ?? 'trancada'])}${datas.aberta ? ` · aberta em ${formatar(datas.aberta)}` : ''}${datas.encerrada ? ` · encerrada em ${formatar(datas.encerrada)}` : ''}</p>
      ${confirmada ? `<p class="nota">Plano confirmado: dinâmica ${confirmada.din ? formatar(confirmada.din) : '—'}${confirmada.cons ? `, consolidação ${formatar(confirmada.cons)}` : ''}</p>` : ''}
      <label for="cf-din">Dinâmica (sala)</label>
      <input id="cf-din" type="date" value="${esc(i.din ?? '')}" required>
      ${f.tipo === 'chefao' ? '' : `<label for="cf-cons">Consolidação (laboratório)</label><input id="cf-cons" type="date" value="${esc(i.cons ?? '')}">`}
      <p class="nota">Ao fixar, as outras fases se reorganizam em volta, e você confirma o novo plano. ${i.fixaDin || i.fixaCons ? 'Esta fase está fixada.' : ''}</p>
      <p class="erro" id="cf-msg"></p>
      <div class="linha-btn"><button class="botao" type="submit">Fixar estas datas</button>
        ${i.fixaDin || i.fixaCons ? '<button class="botao secundario" type="button" id="cf-solta">Voltar ao automático</button>' : ''}
        <button class="botao secundario" type="button" id="cf-cancelar">Cancelar</button></div>
    </form>`;
  dlg.onclick = async (ev) => {
    if (ev.target.id === 'cf-cancelar') dlg.close();
    if (ev.target.id === 'cf-solta') {
      try { await updateDoc(refPlano(st.turma), { [`fixas.${faseId}`]: deleteField() }); dlg.close(); }
      catch { document.getElementById('cf-msg').textContent = 'Não consegui agora.'; }
    }
  };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-cal-fase') return;
    ev.preventDefault();
    const din = document.getElementById('cf-din').value;
    const consEl = document.getElementById('cf-cons');
    const cons = consEl ? consEl.value : '';
    if (cons && cons <= din) { document.getElementById('cf-msg').textContent = 'A consolidação deve ser depois da dinâmica.'; return; }
    const fx = { din };
    if (cons) fx.cons = cons;
    try { await setDoc(refPlano(st.turma), { turma: st.turma, fixas: { [faseId]: fx }, atualizadoEm: serverTimestamp() }, { merge: true }); dlg.close(); }
    catch { document.getElementById('cf-msg').textContent = 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}

// ---------- ações da aba ----------
// Devolve true quando tratou a ação.
export async function tratarAgenda(acao, b, ctx) {
  const { st, dlg, desenhar, mudarEstado } = ctx;
  switch (acao) {
    case 'cal-bim': st.calBim = Number(b.dataset.id); desenhar(); return true;
    case 'cal-evento': dialogoEvento(st, dlg, b.dataset.id || ''); return true;
    case 'cal-fase': dialogoFase(st, dlg, b.dataset.id); return true;
    case 'cal-abrir':
      if (confirm('Abrir esta fase para a turma agora?')) await mudarEstado(b.dataset.id, 'aberta');
      return true;
    case 'cal-confirmar': {
      const p = planejar(st);
      const mapa = Object.fromEntries(p.ag.itens.filter((i) => i.din).map((i) => [i.faseId, { din: i.din, cons: i.cons ?? null }]));
      await setDoc(refPlano(st.turma), { turma: st.turma, confirmado: mapa, confirmadoEm: serverTimestamp() }, { merge: true });
      return true;
    }
    case 'cal-config': {
      await setDoc(refPlano(st.turma), {
        turma: st.turma, diaDin: Number(document.getElementById('cal-din').value), diaCons: Number(document.getElementById('cal-cons').value), atualizadoEm: serverTimestamp(),
      }, { merge: true });
      return true;
    }
    default: return false;
  }
}

// Importa o calendário oficial (arquivo JSON) para o banco.
export async function importarCalendario(arquivo, falha) {
  let json;
  try { json = JSON.parse(await arquivo.text()); } catch { falha('Esse arquivo não é um JSON válido.'); return; }
  if (json?.formato !== 1 || !Array.isArray(json.bimestres) || !json.bimestres.length) { falha('Esse arquivo não está no formato do calendário.'); return; }
  await setDoc(doc(db, 'calendario', String(json.ano ?? ANO)), {
    ano: json.ano ?? ANO, bimestres: json.bimestres, semAula: json.semAula ?? [], eventos: json.eventos ?? {}, atualizadoEm: serverTimestamp(),
  });
  falha('Calendário carregado.');
}
