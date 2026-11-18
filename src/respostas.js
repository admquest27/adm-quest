// Respostas dos alunos aos campos das etapas: leitura da turma e arquivo anônimo para análise.
import { esc, hoje } from './ui.js';
import { etapasDe, progId } from './fases.js';

function ordenar(alunos) {
  return [...alunos].sort((a, b) => (a.numeroChamada ?? 999) - (b.numeroChamada ?? 999) || String(a.apelido).localeCompare(String(b.apelido), 'pt-BR'));
}

function coletar(st, f) {
  const alunos = ordenar(st.alunos.filter((a) => a.turma === st.turma && a.status === 'ativo'));
  const campos = etapasDe(f).filter((e) => e.campos?.length).flatMap((e) => e.campos.map((c) => ({ etapa: e, campo: c })));
  const linhas = [];
  alunos.forEach((a, i) => {
    const p = st.progresso[progId(a.uid, f.id)];
    for (const { etapa, campo } of campos) {
      const resp = (p?.respostas?.[etapa.id]?.[campo.id] ?? '').trim();
      linhas.push({ anonimo: `Aluno ${a.numeroChamada ?? i + 1}`, apelido: a.apelido, etapa: etapa.texto, campo: campo.rotulo, resposta: resp });
    }
  });
  return { campos, linhas, alunos };
}

function baixar(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const csvCel = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

export function temCampos(f) {
  return etapasDe(f).some((e) => e.campos?.length);
}

export function abrirRespostasTurma(st, dlg, faseId) {
  const f = st.fases.find((x) => x.id === faseId);
  if (!f) return;
  const { campos, linhas } = coletar(st, f);
  const blocos = campos.map(({ etapa, campo }) => {
    const itens = linhas.filter((l) => l.campo === campo.rotulo && l.etapa === etapa.texto);
    const respondidas = itens.filter((l) => l.resposta).length;
    return `<h3>${esc(campo.rotulo)} <span class="nota">${respondidas} de ${itens.length} responderam</span></h3>
      <ul class="lista">${itens.map((l) => `<li class="resp"><strong>${esc(l.apelido)}</strong> ${l.resposta ? esc(l.resposta) : '<span class="nota">(sem resposta)</span>'}</li>`).join('')}</ul>`;
  }).join('');
  dlg.innerHTML = `
    <div class="form respostas">
      <h2>${esc(f.codigo)} · respostas da turma</h2>
      ${blocos || '<p class="nota">Esta fase não tem campos de resposta.</p>'}
      <p class="nota">Os arquivos para baixar são anônimos: usam o número de chamada, sem o apelido, e podem ser levados ao Claude para análise.</p>
      <div class="linha-btn">
        <button class="mini" type="button" data-resp="csv">Baixar planilha (.csv)</button>
        <button class="mini" type="button" data-resp="json">Baixar texto (.json)</button>
      </div>
      <button class="botao" type="button" data-resp="fechar">Fechar</button>
    </div>`;
  dlg.onclick = (e) => {
    const b = e.target.closest('[data-resp]');
    if (!b) return;
    if (b.dataset.resp === 'fechar') { dlg.close(); return; }
    const base = `respostas-${f.codigo}-${st.turma}-${hoje()}`;
    if (b.dataset.resp === 'csv') {
      const cab = ['aluno', 'fase', 'etapa', 'campo', 'resposta'].join(';');
      const corpo = linhas.map((l) => [l.anonimo, f.codigo, l.etapa, l.campo, l.resposta].map(csvCel).join(';')).join('\r\n');
      baixar(`${base}.csv`, `﻿${cab}\r\n${corpo}`, 'text/csv;charset=utf-8');
    } else {
      const dados = { fase: f.codigo, nome: f.nome, turma: st.turma, respostas: linhas.map((l) => ({ aluno: l.anonimo, etapa: l.etapa, campo: l.campo, resposta: l.resposta })) };
      baixar(`${base}.json`, JSON.stringify(dados, null, 2), 'application/json');
    }
  };
  dlg.showModal();
}

export function abrirRespostasAluno(st, dlg, faseId, uid) {
  const f = st.fases.find((x) => x.id === faseId);
  const a = st.alunos.find((x) => x.uid === uid);
  const p = st.progresso[progId(uid, faseId)];
  const blocos = etapasDe(f).filter((e) => e.campos?.length).map((e) => `
    <h3>${esc(e.texto)}</h3>
    ${e.campos.map((c) => `<p><strong>${esc(c.rotulo)}</strong><br>${esc(p?.respostas?.[e.id]?.[c.id] || '(sem resposta)')}</p>`).join('')}`).join('');
  dlg.innerHTML = `<div class="form"><h2>${esc(a?.apelido ?? '')} · respostas</h2>${blocos || '<p class="nota">Esta fase não tem campos de resposta.</p>'}<button class="botao" type="button" id="r-fechar">Fechar</button></div>`;
  dlg.onclick = (e) => { if (e.target.id === 'r-fechar') dlg.close(); };
  dlg.showModal();
}
