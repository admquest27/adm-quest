// Exportações do painel: pacote anônimo para análise e planilhas (CSV) para os seus registros.
import { hoje } from './ui.js';
import { progId, contarTarefas, situacao, etapasDe, SITUACAO_ROTULO } from './fases.js';

export function baixar(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const cel = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

function csv(cabecalho, linhas) {
  return `﻿${cabecalho.join(';')}\r\n${linhas.map((l) => l.map(cel).join(';')).join('\r\n')}`;
}

const ms = (ts) => (ts?.toMillis ? ts.toMillis() : 0);
const dia = (ts) => (ts?.toMillis ? new Date(ts.toMillis()).toISOString().slice(0, 10) : '');

function alunosDaTurma(st) {
  return st.alunos.filter((a) => a.turma === st.turma && a.status === 'ativo')
    .sort((a, b) => (a.nome || a.apelido).localeCompare(b.nome || b.apelido, 'pt-BR'));
}

// anonimizar = true usa "Aluno N" (número de chamada) no lugar do apelido
export function montarDados(st, { anonimizar, uids }) {
  const turma = st.turmas.find((t) => t.id === st.turma);
  const estados = turma?.estadoFases ?? {};
  const alunos = alunosDaTurma(st).filter((a) => !uids || uids.includes(a.uid));
  const nome = (a, i) => (anonimizar ? `Aluno ${a.numeroChamada ?? i + 1}` : a.nome || a.apelido);
  const fases = [];
  const mencoes = [];
  const atitudes = [];
  const conversas = [];
  const respostas = [];
  alunos.forEach((a, i) => {
    const n = nome(a, i);
    for (const f of st.fases) {
      const est = estados[f.id] ?? 'trancada';
      const pid = progId(a.uid, f.id);
      const p = st.progresso[pid]; const v = st.aval[pid];
      const { total, feitas } = contarTarefas(f, p);
      const sit = situacao(f, p, v, est);
      fases.push({ aluno: n, fase: f.codigo, nomeFase: f.nome, estadoFase: est, situacao: SITUACAO_ROTULO[sit], etapasFeitas: feitas, etapasTotal: total, validada: v?.validada ? 'sim' : 'não', faltou: v?.faltou ? 'sim' : 'não' });
      for (const [cod, m] of Object.entries(v?.mencoes ?? {})) if (m) mencoes.push({ aluno: n, fase: f.codigo, habilidade: cod, mencao: m, validada: v?.validada ? 'sim' : 'não', data: dia(v?.atualizadoEm) });
      for (const e of etapasDe(f)) for (const c of e.campos ?? []) {
        const r = (p?.respostas?.[e.id]?.[c.id] ?? '').trim();
        if (r) respostas.push({ aluno: n, fase: f.codigo, etapa: e.texto, campo: c.rotulo, resposta: r });
      }
    }
    for (const c of st.comentarios.filter((x) => x.uid === a.uid).sort((x, y) => ms(x.criadoEm) - ms(y.criadoEm))) {
      atitudes.push({ aluno: n, data: dia(c.criadoEm), marca: c.marca, tipo: c.tipoAtitude === 'atencao' ? 'atenção' : c.tipoAtitude === 'positivo' ? 'positivo' : 'livre', fase: st.fases.find((f) => f.id === c.fase)?.codigo ?? '', texto: c.texto, visivelAoAluno: c.visivel ? 'sim' : 'não' });
    }
    if (!anonimizar) for (const c of st.anotacoes.filter((x) => x.uid === a.uid).sort((x, y) => ms(x.criadoEm) - ms(y.criadoEm))) conversas.push({ aluno: n, data: dia(c.criadoEm), texto: c.texto });
  });
  return { turma: st.turma, geradoEm: hoje(), anonimo: anonimizar, alunos: alunos.length, fases, mencoes, atitudes, conversas, respostas };
}

export function exportarTurma(st, formato) {
  const d = montarDados(st, { anonimizar: true });
  const base = `painel-${st.turma}-${hoje()}`;
  if (formato === 'json') {
    baixar(`${base}-pacote-anonimo.json`, JSON.stringify(d, null, 2), 'application/json');
  } else if (formato === 'fases') {
    baixar(`${base}-fases.csv`, csv(['aluno', 'fase', 'nome da fase', 'estado da fase', 'situação', 'etapas feitas', 'etapas total', 'validada', 'faltou'], d.fases.map((x) => [x.aluno, x.fase, x.nomeFase, x.estadoFase, x.situacao, x.etapasFeitas, x.etapasTotal, x.validada, x.faltou])), 'text/csv;charset=utf-8');
  } else if (formato === 'mencoes') {
    baixar(`${base}-mencoes.csv`, csv(['aluno', 'fase', 'habilidade', 'menção', 'validada', 'data'], d.mencoes.map((x) => [x.aluno, x.fase, x.habilidade, x.mencao, x.validada, x.data])), 'text/csv;charset=utf-8');
  } else if (formato === 'atitudes') {
    baixar(`${base}-atitudes.csv`, csv(['aluno', 'data', 'marca', 'tipo', 'fase', 'texto', 'visível ao aluno'], d.atitudes.map((x) => [x.aluno, x.data, x.marca, x.tipo, x.fase, x.texto, x.visivelAoAluno])), 'text/csv;charset=utf-8');
  }
}

// Ficha de um aluno para os registros do professor (com apelido e conversas).
export function exportarAluno(st, uid) {
  const d = montarDados(st, { anonimizar: false, uids: [uid] });
  const a = st.alunos.find((x) => x.uid === uid);
  baixar(`ficha-${st.turma}-${String(a?.apelido ?? 'aluno').replace(/\W+/g, '')}-${hoje()}.json`, JSON.stringify({ ...d, numeroChamada: a?.numeroChamada ?? null }, null, 2), 'application/json');
}

export function abrirExportacao(st, dlg) {
  dlg.innerHTML = `
    <div class="form">
      <h2>Exportar o painel</h2>
      <p class="nota">Os arquivos desta janela são <strong>anônimos</strong>: usam o número de chamada, sem apelido e sem as conversas anotadas. Servem para levar ao Claude e para os seus registros.</p>
      <button class="botao" type="button" data-exp="json">Pacote completo para análise (.json)</button>
      <p class="nota">Fases, menções, atitudes e respostas dos alunos num arquivo só.</p>
      <div class="linha-btn">
        <button class="mini" type="button" data-exp="fases">Fases (.csv)</button>
        <button class="mini" type="button" data-exp="mencoes">Menções (.csv)</button>
        <button class="mini" type="button" data-exp="atitudes">Atitudes (.csv)</button>
      </div>
      <p class="nota">As planilhas abrem direto no Excel. A exportação para o lançamento no sistema do Senac, com feedback e recuperação, vem com o bloco de menções e fechamento.</p>
      <button class="botao secundario" type="button" data-exp="fechar">Fechar</button>
    </div>`;
  dlg.onclick = (e) => {
    const b = e.target.closest('[data-exp]');
    if (!b) return;
    if (b.dataset.exp === 'fechar') { dlg.close(); return; }
    exportarTurma(st, b.dataset.exp);
  };
  dlg.showModal();
}
