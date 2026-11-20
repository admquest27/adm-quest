// Aba "Fechar": menções consolidadas por aluno, análise de recuperação, menções diretas (caderno),
// ajustes com motivo e cópia para a planilha da coordenação.
import { doc, setDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';
import { MAPA, consolidarAluno, SITUACAO, curto, sugestaoRecuperacao, textoRecuperacao, linhasParaColar } from './fechamento.js';

export const idFech = (turma, bim, uid) => `${turma}_${bim}_${uid}`;
const porFase = (mapa, uid) => Object.fromEntries(Object.values(mapa ?? {}).filter((x) => x.uid === uid).map((x) => [x.fase, x]));
const ordenar = (lista) => [...lista].sort((a, b) => (a.numeroChamada ?? 999) - (b.numeroChamada ?? 999) || a.apelido.localeCompare(b.apelido, 'pt-BR'));

export function linhasDoFechamento(st, bim, ativos, turma) {
  return ordenar(ativos).map((aluno) => {
    const fech = st.fechamentos?.[idFech(st.turma, bim, aluno.uid)] ?? null;
    const c = consolidarAluno({ bim, fases: st.fases, aval: porFase(st.aval, aluno.uid), fech, entrada: aluno.dataEntrada, datas: turma?.datas });
    return { aluno, c, fech };
  });
}

const chipM = (m) => (m ? `<span class="chip m-${esc(m)}">${esc(m)}</span>` : '<span class="chip sem-evid">?</span>');

export function htmlFechamento(st, ativos, turma) {
  const bim = st.mundo?.ordem ?? 1;
  const mapa = MAPA[bim];
  const linhas = linhasDoFechamento(st, bim, ativos, turma);
  const filtro = st.fechFiltro ?? 'todos';
  const contagem = Object.fromEntries(Object.keys(SITUACAO).map((k) => [k, linhas.filter((l) => l.c.situacao === k).length]));
  const semValidacao = linhas.flatMap((l) => Object.values(l.c.habs).filter((h) => h.semValidacao).map(() => l.aluno.apelido));
  // habilidades que nenhuma fase avalia (o caderno): menção direta para a turma toda
  const diretas = mapa.habs.filter((h) => !st.fases.some((f) => (f.habilidades ?? []).includes(h)));
  const blocoDiretas = diretas.map((h) => `<details class="roteiro" ${linhas.some((l) => !l.c.habs[h].final) ? 'open' : ''}><summary>${esc(curto(h))} · ${esc(st.mundo?.habilidades?.[h] ?? h)} (menção direta)</summary>
      <ul class="lista">${linhas.map(({ aluno, fech }) => `<li class="aluno"><span class="num">${aluno.numeroChamada ?? '—'}</span><span class="nome">${esc(aluno.apelido)}</span>
        <span class="mencoes-botoes">${['A', 'PA', 'NA'].map((m) => `<button class="mini ${fech?.diretas?.[h] === m ? `m-${m} sel` : ''}" data-acao="fc-direta" data-uid="${esc(aluno.uid)}" data-hab="${esc(h)}" data-m="${m}">${m}</button>`).join('')}</span></li>`).join('')}</ul></details>`).join('');

  const visiveis = linhas.filter((l) => filtro === 'todos' || l.c.situacao === filtro);
  const cartao = ({ aluno, c, fech }) => {
    const s = SITUACAO[c.situacao];
    return `<li class="fech-aluno" data-acao="fc-aluno" data-uid="${esc(aluno.uid)}">
      <div class="fech-topo"><span class="num">${aluno.numeroChamada ?? '—'}</span><strong>${esc(aluno.apelido)}</strong><span class="chip ${s.classe}">${s.rotulo}</span>${fech?.recup && Object.values(fech.recup).some((r) => r?.vai) ? '<span class="chip">em recuperação</span>' : ''}</div>
      <div class="fech-mencoes">${mapa.habs.map((h) => `<span class="par">${esc(curto(h))} ${chipM(c.habs[h].final)}</span>`).join('')}
        <span class="sep"></span>${mapa.comps.map((k) => `<span class="par">C${esc(curto(k))} ${chipM(c.comps[k].final)}${c.comps[k].ajustada ? '*' : ''}</span>`).join('')}</div></li>`;
  };

  return `<h2>Fechamento do ${bim}º bimestre</h2>
    <p class="nota">O jogo junta as menções de cada aluno (a avaliação mais recente prevalece, falta não rebaixa) e sugere a competência pela regra: D quando todas as habilidades estão em A; ND quando metade ou mais estão em NA; ED nos demais casos. Você ajusta o que quiser, com motivo.</p>
    ${semValidacao.length ? `<div class="alerta"><strong>Menções ainda sem validação</strong><p>${[...new Set(semValidacao)].map(esc).join(', ')}. Valide nas fases antes de fechar.</p></div>` : ''}
    ${blocoDiretas}
    <div class="marcas">${[['todos', `Todos (${linhas.length})`], ...Object.entries(SITUACAO).map(([k, v]) => [k, `${v.rotulo} (${contagem[k]})`])].map(([k, r]) => `<button class="mini ${filtro === k ? 'ok cheio' : ''}" data-acao="fc-filtro" data-id="${k}">${r}</button>`).join('')}</div>
    <ul class="fech-lista">${visiveis.map(cartao).join('') || '<li class="vazio">Ninguém nesta situação.</li>'}</ul>
    <h3>Copiar para a planilha da coordenação</h3>
    <p class="nota">Antes de colar, confira se a ordem dos números de chamada é a mesma da planilha. As colunas saem nesta ordem: ${mapa.habs.map(curto).join(', ')}, competências ${mapa.comps.map((k) => curto(k)).join(' e ')} e o texto da recuperação.</p>
    <div class="linha-btn"><button class="botao" data-acao="fc-copiar" data-id="so">Copiar só as menções</button><button class="botao secundario" data-acao="fc-copiar" data-id="com">Copiar com número e apelido</button></div>
    <p class="nota" id="fc-msg"></p>`;
}

// Janela do aluno: evidências, ajustes, recuperação e competências.
export function abrirAlunoFechamento(st, dlg, uid, ativos, turma) {
  const bim = st.mundo?.ordem ?? 1;
  const mapa = MAPA[bim];
  const pintar = (msg = '') => {
    const l = linhasDoFechamento(st, bim, ativos, turma).find((x) => x.aluno.uid === uid);
    if (!l) { dlg.close(); return; }
    const { aluno, c, fech } = l;
    const hab = (h) => {
      const x = c.habs[h];
      const r = fech?.recup?.[h] ?? {};
      const precisa = ['PA', 'NA'].includes(x.final) || r.vai;
      return `<fieldset class="card-ed"><legend>${esc(curto(h))} · ${esc(st.mundo?.habilidades?.[h] ?? '')}</legend>
        <p>Final: ${chipM(x.final)} <span class="nota">${{ fase: 'avaliação mais recente', direta: 'menção direta', recuperacao: 'depois da recuperação', ajuste: 'ajustada por você' }[x.origem] ?? 'sem evidência'}</span></p>
        <p class="nota">${x.evid.map((e) => `${esc(e.codigo)}: ${e.m ? esc(e.m) : e.faltou ? 'faltou' : 'sem menção'}${e.m && !e.validada ? ' (sem validação)' : ''}`).join(' · ') || 'Nenhuma fase avalia esta habilidade.'}</p>
        ${x.faltas.length ? `<p class="nota">Faltou em ${x.faltas.map(esc).join(', ')}: se ainda houver tempo, ele pode fazer a fase antes do fechamento.</p>` : ''}
        ${precisa ? `<label class="check"><input type="checkbox" data-rec="vai" data-hab="${esc(h)}" ${r.vai ? 'checked' : ''}> Vai para a recuperação</label>
          ${r.vai ? `<label>Proposta de recuperação</label><textarea rows="2" data-rec="proposta" data-hab="${esc(h)}">${esc(r.proposta ?? sugestaoRecuperacao(h, st.fases, st.mundo?.habilidades))}</textarea>
          <label>Resultado</label><select data-rec="resultado" data-hab="${esc(h)}"><option value="">em andamento</option>${['A', 'PA', 'NA'].map((m) => `<option ${r.resultado === m ? 'selected' : ''}>${m}</option>`).join('')}</select>` : ''}` : ''}
        <details class="mais"><summary>Ajustar a menção final</summary>
          <select data-aj="mencao" data-hab="${esc(h)}"><option value="">sem ajuste</option>${['A', 'PA', 'NA'].map((m) => `<option ${fech?.ajustes?.[h]?.mencao === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <input data-aj="motivo" data-hab="${esc(h)}" value="${esc(fech?.ajustes?.[h]?.motivo ?? '')}" placeholder="Motivo (fica registrado)"></details></fieldset>`;
    };
    const comp = (k) => {
      const x = c.comps[k];
      return `<fieldset class="card-ed"><legend>Competência ${esc(curto(k))}</legend>
        <p>Pela regra: ${chipM(x.regra)} (habilidades ${x.habs.map(curto).join(', ')}) · Final: ${chipM(x.final)}</p>
        <select data-caj="mencao" data-comp="${esc(k)}"><option value="">seguir a regra</option>${['D', 'ED', 'ND'].map((m) => `<option ${fech?.compAjustes?.[k]?.mencao === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <input data-caj="motivo" data-comp="${esc(k)}" value="${esc(x.motivo)}" placeholder="Motivo, se for diferente da regra"></fieldset>`;
    };
    const s = SITUACAO[c.situacao];
    dlg.innerHTML = `<form class="form editor" id="form-fech">
      <h2>${aluno.numeroChamada ?? '—'} · ${esc(aluno.apelido)}</h2>
      <p><span class="chip ${s.classe}">${s.rotulo}</span></p>
      ${c.impactos.length ? `<div class="alerta"><strong>Impacto da recuperação</strong><p>${c.impactos.map((i) => `Recuperando ${esc(curto(i.hab))} para A, a competência ${esc(curto(i.comp))} passa de ${esc(i.de)} para ${esc(i.para)}.`).join(' ')}</p></div>` : ''}
      ${mapa.habs.map(hab).join('')}
      ${mapa.comps.map(comp).join('')}
      ${textoRecuperacao(c.habs, fech) ? `<p class="nota"><strong>Texto da recuperação:</strong> ${esc(textoRecuperacao(c.habs, fech))}</p>` : ''}
      <p class="erro" id="fc-dmsg">${esc(msg)}</p>
      <div class="linha-btn"><button class="botao" type="submit">Salvar</button><button class="botao secundario" type="button" id="fc-fechar">Fechar</button></div></form>`;
  };
  const ler = () => {
    const atual = st.fechamentos?.[idFech(st.turma, bim, uid)] ?? {};
    const recup = { ...(atual.recup ?? {}) };
    const ajustes = { ...(atual.ajustes ?? {}) };
    const compAjustes = { ...(atual.compAjustes ?? {}) };
    dlg.querySelectorAll('[data-rec]').forEach((el) => {
      const h = el.dataset.hab;
      recup[h] = { ...(recup[h] ?? {}) };
      recup[h][el.dataset.rec] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    dlg.querySelectorAll('[data-aj]').forEach((el) => { const h = el.dataset.hab; ajustes[h] = { ...(ajustes[h] ?? {}), [el.dataset.aj]: el.value.trim() }; });
    dlg.querySelectorAll('[data-caj]').forEach((el) => { const k = el.dataset.comp; compAjustes[k] = { ...(compAjustes[k] ?? {}), [el.dataset.caj]: el.value.trim() }; });
    return { recup, ajustes, compAjustes };
  };
  const gravar = async () => {
    const dados = ler();
    for (const [, a] of Object.entries(dados.ajustes)) if (a.mencao && !a.motivo) throw new Error('motivo');
    for (const [, a] of Object.entries(dados.compAjustes)) if (a.mencao && !a.motivo) throw new Error('motivo');
    await setDoc(doc(db, 'fechamentos', idFech(st.turma, bim, uid)), { turma: st.turma, bim, uid, ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
    st.fechamentos = { ...st.fechamentos, [idFech(st.turma, bim, uid)]: { ...(st.fechamentos?.[idFech(st.turma, bim, uid)] ?? {}), ...dados } };
  };
  pintar();
  dlg.onclick = (ev) => { if (ev.target.id === 'fc-fechar') dlg.close(); };
  // marcar "vai para a recuperação" mostra os campos na hora
  dlg.onchange = async (ev) => {
    if (ev.target.dataset?.rec !== 'vai') return;
    try { await gravar(); pintar(); } catch { /* o motivo é cobrado ao salvar */ }
  };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-fech') return;
    ev.preventDefault();
    try { await gravar(); pintar('Salvo ✓'); }
    catch (e) { document.getElementById('fc-dmsg').textContent = e.message === 'motivo' ? 'Escreva o motivo de cada ajuste.' : 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}

export async function tratarFechamento(acao, b, ctx) {
  const { st, dlg, ativos, turma, desenhar } = ctx;
  const bim = st.mundo?.ordem ?? 1;
  switch (acao) {
    case 'fc-filtro': st.fechFiltro = b.dataset.id; desenhar(); return true;
    case 'fc-aluno': abrirAlunoFechamento(st, dlg, b.dataset.uid, ativos, turma); return true;
    case 'fc-direta': {
      const id = idFech(st.turma, bim, b.dataset.uid);
      const atual = st.fechamentos?.[id]?.diretas?.[b.dataset.hab];
      const valor = atual === b.dataset.m ? deleteField() : b.dataset.m;
      await setDoc(doc(db, 'fechamentos', id), { turma: st.turma, bim, uid: b.dataset.uid, diretas: { [b.dataset.hab]: valor }, atualizadoEm: serverTimestamp() }, { merge: true });
      return true;
    }
    case 'fc-copiar': {
      const texto = linhasParaColar(bim, linhasDoFechamento(st, bim, ativos, turma), { comNumero: b.dataset.id === 'com' });
      try { await navigator.clipboard.writeText(texto); document.getElementById('fc-msg').textContent = 'Copiado. Clique na primeira célula da planilha e cole (Ctrl+V).'; }
      catch { document.getElementById('fc-msg').textContent = 'Não consegui copiar automaticamente neste navegador.'; }
      return true;
    }
    default: return false;
  }
}
