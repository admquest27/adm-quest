// Terrenos vazios do mapa: o professor cria fases extras (uma atividade integrada que surgiu no meio do bimestre, por
// exemplo) escolhendo o terreno e o desenho da construção, e pode tirar a fase do mapa quando acabar. A fase extra é
// uma fase comum (mesma coleção, mesmas regras), só com os campos "lote" e "modelo". Nada é apagado: tirar do mapa
// arquiva a fase (o histórico dos alunos fica guardado) e libera o terreno de novo.
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';
import { LOTES } from './mapa/vila.js';
import { MODELOS_FASE } from './mapa/arte.js';
import { MUNDO, parteAluno } from './fases.js';

export const NOME_LOTE = { l1: 'Terreno 1, perto das Dunas', l2: 'Terreno 2, ao sul da Praça', l3: 'Terreno 3, perto do Castelo' };
const lotes = () => LOTES.map((l) => l.id);
const doLote = (st, id) => st.fases.find((f) => f.lote === id && !f.arquivada);

export function htmlTerrenos(st) {
  const arquivadas = st.fases.filter((f) => f.arquivada);
  const linhas = lotes().map((id) => {
    const f = doLote(st, id);
    return `<li class="fase-prof">
      <span class="nome-fase"><span class="cod">${f ? esc(f.codigo) : '🪧'}</span> <strong>${esc(NOME_LOTE[id])}</strong>
        <span class="nota">${f ? `${esc(f.nome)} (${esc(MODELOS_FASE.find(([k]) => k === f.modelo)?.[1] ?? 'construção')})` : 'À venda: futuro promissor'}</span></span>
      ${f ? `<button class="mini" data-acao="terreno" data-lote="${id}" data-fase="${esc(f.id)}">Mudar terreno</button>` : `<button class="mini ok" data-acao="terreno" data-lote="${id}">Criar fase aqui</button>`}
    </li>`;
  }).join('');
  const arq = arquivadas.length ? `<h3>Fases tiradas do mapa</h3><p class="nota">O histórico dos alunos fica guardado. Para voltar, escolha um terreno livre.</p><ul class="lista">${arquivadas.map((f) => `<li class="fase-prof"><span class="nome-fase"><span class="cod">${esc(f.codigo)}</span> <strong>${esc(f.nome)}</strong></span><button class="mini" data-acao="terreno" data-fase="${esc(f.id)}">Voltar ao mapa</button></li>`).join('')}</ul>` : '';
  return `<h2>Terrenos do mapa</h2>
    <p class="nota">Três terrenos vazios esperam fases novas. Escolha o terreno e a construção, escreva a missão e pronto: a fase aparece no mapa em obras, e você libera como as outras. Depois use "Editar fase" para montar o passo a passo.</p>
    <ul class="lista">${linhas}</ul>${arq}`;
}

export function abrirTerreno({ st, dlg, loteId = '', faseId = '' }) {
  const f = faseId ? st.fases.find((x) => x.id === faseId) : null;
  const livres = lotes().filter((id) => !doLote(st, id) || doLote(st, id)?.id === f?.id);
  const escolha = f?.lote && livres.includes(f.lote) ? f.lote : (loteId && livres.includes(loteId) ? loteId : (livres[0] ?? ''));
  if (!escolha) { dlg.innerHTML = '<form method="dialog" class="form"><h2>Sem terreno livre</h2><p class="nota">Os três terrenos já têm fase. Tire uma do mapa para liberar um terreno.</p><button class="botao">Entendi</button></form>'; dlg.showModal(); return; }
  const proxima = Math.max(0, ...st.fases.map((x) => x.ordem ?? 0)) + 1;
  const numero = st.fases.filter((x) => x.extra).length + 1;
  dlg.innerHTML = `<form class="form editor" id="form-terreno">
    <h2>${f ? `Mudar ${esc(f.codigo)}` : 'Nova fase em terreno vazio'}</h2>
    <label for="t-nome">Nome da fase</label>
    <input id="t-nome" maxlength="60" value="${esc(f?.nome ?? '')}" placeholder="Ex.: Feira de Projetos" required>
    <label for="t-cod">Código no mapa (curto)</label>
    <input id="t-cod" maxlength="6" value="${esc(f?.codigo ?? `X${numero}`)}" required>
    <label for="t-missao">Missão (o que o aluno lê primeiro)</label>
    <textarea id="t-missao" rows="4" placeholder="Em até duas frases.">${esc(f?.missao ?? '')}</textarea>
    <label for="t-lote">Terreno</label>
    <select id="t-lote">${livres.map((id) => `<option value="${id}" ${id === escolha ? 'selected' : ''}>${esc(NOME_LOTE[id])}</option>`).join('')}</select>
    <label for="t-modelo">Construção</label>
    <select id="t-modelo">${MODELOS_FASE.map(([k, r]) => `<option value="${k}" ${k === (f?.modelo || 'casaAzul') ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
    <p class="erro" id="t-msg"></p>
    <div class="linha-btn">
      <button class="botao" id="t-salvar">${f ? 'Salvar' : 'Criar fase'}</button>
      <button type="button" class="botao secundario" id="t-cancelar">Cancelar</button>
      ${f && f.lote && !f.arquivada ? '<button type="button" class="mini ruim" id="t-tirar">Tirar do mapa</button>' : ''}
    </div></form>`;
  dlg.showModal();
  const msg = () => dlg.querySelector('#t-msg');
  dlg.onclick = async (e) => {
    const id = e.target.closest('button')?.id;
    if (id === 't-cancelar') { dlg.close(); return; }
    if (id === 't-tirar') {
      try { const lote = writeBatch(db); lote.update(doc(db, 'fases', f.id), { lote: '', arquivada: true, atualizadoEm: serverTimestamp() }); await lote.commit(); dlg.close(); } catch { msg().textContent = 'Não consegui tirar do mapa agora.'; }
    }
  };
  dlg.onsubmit = async (e) => {
    e.preventDefault();
    const dados = { nome: dlg.querySelector('#t-nome').value.trim(), codigo: dlg.querySelector('#t-cod').value.trim(), missao: dlg.querySelector('#t-missao').value.trim(), lote: dlg.querySelector('#t-lote').value, modelo: dlg.querySelector('#t-modelo').value };
    if (!dados.nome || !dados.codigo) { msg().textContent = 'Preencha o nome e o código.'; return; }
    try {
      const lote = writeBatch(db);
      if (f) {
        lote.update(doc(db, 'fases', f.id), { ...dados, arquivada: false, atualizadoEm: serverTimestamp() });
      } else {
        const id = `m1x${Math.max(0, ...st.fases.filter((x) => x.extra).map((x) => parseInt(String(x.id).replace(/\D/g, '').slice(2), 10) || 0)) + 1}`;
        lote.set(doc(db, 'fases', id), { ...parteAluno({ ...dados, ordem: proxima, tipo: 'normal', etapas: [] }, MUNDO), extra: true, atualizadoEm: serverTimestamp() });
        lote.set(doc(db, 'fasesProfessor', id), { mundo: MUNDO, professor: {}, atualizadoEm: serverTimestamp() });
      }
      await lote.commit(); dlg.close();
    } catch { msg().textContent = 'Não consegui salvar agora. Confira a conexão e tente de novo.'; }
  };
}
