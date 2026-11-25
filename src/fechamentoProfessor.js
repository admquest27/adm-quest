// Aba "Fechar", em quatro passos: menções (no formato da planilha da coordenação), recuperação, feedback
// e a planilha da coordenação para baixar (.xlsx) ou copiar. O PCTD fica na Agenda (é planejamento).
import { nomeDe, ordenarAlunos } from './alunos.js';
import { doc, setDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';
import {
  MAPA, consolidarAluno, curto, compDe, sugestaoRecuperacao, precisaDeRecuperacao, feedbackDoAluno, paragrafoFinal, linhasParaColar,
} from './fechamento.js';
import { COMPETENCIAS, HABILIDADES, CAMPOS_FEEDBACK } from './catalogo.js';

export const idFech = (turma, bim, uid) => `${turma}_${bim}_${uid}`;
const porFase = (mapa, uid) => Object.fromEntries(Object.values(mapa ?? {}).filter((x) => x.uid === uid).map((x) => [x.fase, x]));
const ordenar = ordenarAlunos;
const ms = (ts) => (ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : Date.now());
const bimDe = (st) => st.mundo?.ordem ?? 1;
const bimestreCal = (st, bim) => st.cal?.bimestres?.find((b) => b.id === bim) ?? null;
const descCurta = (st, h) => st.mundo?.habilidades?.[h] ?? HABILIDADES[h] ?? h;

// Registros de atitude do aluno dentro das datas do bimestre.
function registrosDoBim(st, uid, bim) {
  const b = bimestreCal(st, bim);
  const ini = b ? new Date(`${b.inicio}T00:00:00`).getTime() : 0;
  const fim = b ? new Date(`${b.fim}T23:59:59`).getTime() : Infinity;
  return (st.comentarios ?? []).filter((c) => c.uid === uid && ms(c.criadoEm) >= ini && ms(c.criadoEm) <= fim);
}

export function linhasDoFechamento(st, bim, ativos, turma) {
  return ordenar(ativos).map((aluno) => {
    const fech = st.fechamentos?.[idFech(st.turma, bim, aluno.uid)] ?? null;
    const c = consolidarAluno({ bim, fases: st.fases, aval: porFase(st.aval, aluno.uid), fech, entrada: aluno.dataEntrada, datas: turma?.datas, registros: registrosDoBim(st, aluno.uid, bim) });
    const fb = feedbackDoAluno(c, fech, { fases: st.fases, habsDescricao: st.mundo?.habilidades });
    return { aluno, c, fech, fb, campos: fb.campos };
  });
}

const chipM = (m, extra = '') => (m ? `<span class="chip m-${esc(m)} ${extra}">${esc(m)}</span>` : '<span class="chip sem-evid">?</span>');
const gravarFech = (st, bim, uid, dados) => setDoc(doc(db, 'fechamentos', idFech(st.turma, bim, uid)), { turma: st.turma, bim, uid, ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
const gruposDoBim = (bim) => MAPA[bim].comps.map((k) => ({ comp: k, habs: MAPA[bim].habs.filter((h) => compDe(h) === k) }));

// ---------- tela ----------
export function htmlFechamento(st, ativos, turma) {
  const bim = bimDe(st);
  const linhas = linhasDoFechamento(st, bim, ativos, turma);
  const passo = st.fechPasso ?? 'mencoes';
  const nRec = linhas.filter((l) => precisaDeRecuperacao(l.c, l.fech).length).length;
  const nRev = linhas.filter((l) => l.fb.revisado).length;
  const passos = [['mencoes', '1. Menções'], ['recup', `2. Recuperação${nRec ? ` (${nRec})` : ''}`], ['feedback', `3. Feedback (${nRev}/${linhas.length})`], ['baixar', '4. Baixar']];
  const corpo = passo === 'recup' ? htmlRecuperacao(st, bim, linhas) : passo === 'feedback' ? htmlFeedback(st, bim, linhas) : passo === 'baixar' ? htmlBaixar(st, bim, linhas) : htmlMencoes(st, bim, linhas);
  return `<h2>Fechamento do ${bim}º bimestre</h2>
    <div class="fc-passos" role="tablist">${passos.map(([id, r]) => `<button class="mini ${passo === id ? 'ok cheio' : ''}" data-acao="fc-passo" data-id="${id}">${r}</button>`).join('')}</div>
    ${corpo}`;
}

// ---------- passo 1: menções ----------
function htmlMencoes(st, bim, linhas) {
  const grupos = gruposDoBim(bim);
  const previsto = grupos.map((g) => `<div class="fc-comp"><p><strong>Competência ${esc(curto(g.comp))}</strong> · ${esc(COMPETENCIAS[g.comp])}</p>
      <ul class="fc-habs">${g.habs.map((h) => `<li><span class="chip">${esc(curto(h))}</span> ${esc(descCurta(st, h))}</li>`).join('')}<li><span class="chip">AV</span> Atitudes e Valores (sugerida pelos seus registros de atitude)</li></ul></div>`).join('');
  const outrosBims = Object.keys(MAPA).map(Number).filter((b) => b !== bim);
  const nOutras = outrosBims.reduce((n, b) => n + MAPA[b].habs.length, 0);
  const blocoOutras = `<details class="mais"><summary>Outros bimestres (${nOutras} habilidades)</summary>
      ${outrosBims.map((b) => `<div class="fc-outro-bim"><p><strong>${b}º bimestre</strong></p>
        ${gruposDoBim(b).map((g) => `<p class="nota"><strong>Competência ${esc(curto(g.comp))}</strong> · ${esc(COMPETENCIAS[g.comp])}</p>
          <ul class="fc-habs">${g.habs.map((h) => `<li><span class="chip">${esc(curto(h))}</span> ${esc(HABILIDADES[h])}</li>`).join('')}</ul>`).join('')}</div>`).join('')}
      <p class="nota">A trilha de Excel (701) é trabalhada desde o 1º bimestre como evidência interna e lançada no 3º.</p></details>`;
  const semValidacao = [...new Set(linhas.flatMap((l) => Object.values(l.c.habs).filter((h) => h.semValidacao).map(() => nomeDe(l.aluno))))];
  const diretas = MAPA[bim].habs.filter((h) => !st.fases.some((f) => (f.habilidades ?? []).includes(h)));
  const blocoDiretas = diretas.map((h) => `<details class="roteiro" ${linhas.some((l) => !l.c.habs[h].final) ? 'open' : ''}><summary>${esc(curto(h))} · ${esc(descCurta(st, h))}: menção direta (nenhuma fase avalia)</summary>
      <ul class="lista">${linhas.map(({ aluno, fech }) => `<li class="aluno"><span class="num">${aluno.numeroChamada ?? '—'}</span><span class="nome">${esc(nomeDe(aluno))}</span>
        <span class="mencoes-botoes">${['A', 'PA', 'NA'].map((m) => `<button class="mini ${fech?.diretas?.[h] === m ? `m-${m} sel` : ''}" data-acao="fc-direta" data-uid="${esc(aluno.uid)}" data-hab="${esc(h)}" data-m="${m}">${m}</button>`).join('')}</span></li>`).join('')}</ul></details>`).join('');
  const semAv = linhas.filter((l) => !l.c.atitude.confirmada).length;

  const cab1 = grupos.map((g) => `<th colspan="${g.habs.length + 2}" class="fc-g">Competência ${esc(curto(g.comp))}</th>`).join('');
  const cab2 = grupos.map((g) => `${g.habs.map((h) => `<th>${esc(curto(h))}</th>`).join('')}<th>AV</th><th class="fc-final">Final</th>`).join('');
  const linha = ({ aluno, c }) => `<tr data-acao="fc-aluno" data-uid="${esc(aluno.uid)}"><td class="num">${aluno.numeroChamada ?? '—'}</td><td class="fc-nome">${esc(nomeDe(aluno))}</td>
      ${grupos.map((g) => `${g.habs.map((h) => `<td>${chipM(c.habs[h].final)}${c.habs[h].origem === 'ajuste' || c.habs[h].origem === 'recuperacao' ? '<sup>*</sup>' : ''}</td>`).join('')}
        <td>${chipM(c.atitude.mencao, c.atitude.confirmada ? '' : 'sugerida')}</td><td class="fc-final">${chipM(c.comps[g.comp].final)}${c.comps[g.comp].ajustada ? '<sup>*</sup>' : ''}</td>`).join('')}</tr>`;

  return `<section class="fc-bloco"><h3>O que fecha no ${bim}º bimestre</h3>${previsto}
      <p class="nota">Regra da competência, contando as habilidades e Atitudes e Valores: D quando todos estão em A; ND quando metade ou mais estão em NA; ED nos demais casos. Você pode ajustar por aluno, com motivo.</p>
      ${blocoOutras}</section>
    ${semValidacao.length ? `<div class="alerta"><strong>Menções ainda sem validação</strong><p>${semValidacao.map(esc).join(', ')}. Valide nas fases antes de fechar.</p></div>` : ''}
    ${blocoDiretas}
    <h3>Quadro da turma</h3>
    <p class="nota">Mesmas colunas da planilha da coordenação. Toque no aluno para ver de onde veio cada menção, confirmar Atitudes e Valores ou ajustar.</p>
    <div class="fc-rolagem"><table class="fc-grade"><thead><tr><th rowspan="2">Nº</th><th rowspan="2" class="fc-nome">Aluno</th>${cab1}</tr><tr>${cab2}</tr></thead>
      <tbody>${linhas.map(linha).join('') || '<tr><td colspan="20" class="vazio">Nenhum aluno ativo.</td></tr>'}</tbody></table></div>
    <p class="nota fc-legenda">? sem evidência · <span class="chip m-A sugerida">A</span> contorno tracejado: Atitudes e Valores sugerida, ainda não confirmada · * mudou na recuperação ou por ajuste seu</p>
    ${semAv ? `<div class="linha-btn"><button class="botao secundario" data-acao="fc-confirmar-av">Confirmar as Atitudes e Valores sugeridas (${semAv})</button></div>` : ''}`;
}

// Janela do aluno: Atitudes e Valores, evidências, ajustes e competências.
export function abrirAlunoFechamento(st, dlg, uid, ativos, turma) {
  const bim = bimDe(st);
  const mapa = MAPA[bim];
  const pintar = (msg = '') => {
    const l = linhasDoFechamento(st, bim, ativos, turma).find((x) => x.aluno.uid === uid);
    if (!l) { dlg.close(); return; }
    const { aluno, c, fech } = l;
    const av = c.atitude;
    const hab = (h) => {
      const x = c.habs[h];
      return `<fieldset class="card-ed"><legend>${esc(curto(h))} · ${esc(descCurta(st, h))}</legend>
        <p>Final: ${chipM(x.final)} <span class="nota">${{ fase: 'avaliação mais recente', direta: 'menção direta', recuperacao: `depois da recuperação (antes: ${x.avaliada ?? 'sem menção'})`, ajuste: 'ajustada por você' }[x.origem] ?? 'sem evidência'}</span></p>
        <p class="nota">${x.evid.map((e) => `${esc(e.codigo)}: ${e.m ? esc(e.m) : e.faltou ? 'faltou' : 'sem menção'}${e.m && !e.validada ? ' (sem validação)' : ''}`).join(' · ') || 'Nenhuma fase avalia esta habilidade: menção direta no quadro.'}</p>
        ${x.faltas.length ? `<p class="nota">Faltou em ${x.faltas.map(esc).join(', ')}: se ainda houver tempo, faça a fase com ele antes do fechamento, ou leve para a recuperação.</p>` : ''}
        <details class="mais"><summary>Ajustar a menção final</summary>
          <select data-aj="mencao" data-hab="${esc(h)}"><option value="">sem ajuste</option>${['A', 'PA', 'NA'].map((m) => `<option ${fech?.ajustes?.[h]?.mencao === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <input data-aj="motivo" data-hab="${esc(h)}" value="${esc(fech?.ajustes?.[h]?.motivo ?? '')}" placeholder="Motivo (fica registrado)"></details></fieldset>`;
    };
    const comp = (k) => {
      const x = c.comps[k];
      return `<fieldset class="card-ed"><legend>Competência ${esc(curto(k))}</legend>
        <p>Pela regra: ${chipM(x.regra)} <span class="nota">(${x.habs.map(curto).join(', ')} e AV)</span> · Final: ${chipM(x.final)}</p>
        <select data-caj="mencao" data-comp="${esc(k)}"><option value="">seguir a regra</option>${['D', 'ED', 'ND'].map((m) => `<option ${fech?.compAjustes?.[k]?.mencao === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <input data-caj="motivo" data-comp="${esc(k)}" value="${esc(x.motivo)}" placeholder="Motivo, se for diferente da regra"></fieldset>`;
    };
    dlg.innerHTML = `<form class="form editor" id="form-fech">
      <h2>${aluno.numeroChamada ?? '—'} · ${esc(nomeDe(aluno))}</h2>
      <fieldset class="card-ed"><legend>Atitudes e Valores</legend>
        <p class="nota">${av.semRegistro ? 'Nenhum registro de atitude neste bimestre: o jogo sugere A.' : `Neste bimestre: ${av.positivos} registro(s) positivo(s) e ${av.atencao} ponto(s) de atenção. O jogo sugere ${esc(av.sugerida)}.`}${av.destaque ? ` Destaque: ${esc(av.destaque)}.` : ''}${av.desenvolver ? ` A desenvolver: ${esc(av.desenvolver)}.` : ''}</p>
        <div class="mencoes-botoes">${['A', 'PA', 'NA'].map((m) => `<label class="check"><input type="radio" name="av" value="${m}" ${av.mencao === m ? 'checked' : ''}> ${m}</label>`).join('')}</div>
        ${av.confirmada ? '' : '<p class="nota">Ainda não confirmada: salvar confirma a opção marcada.</p>'}</fieldset>
      ${mapa.habs.map(hab).join('')}
      ${mapa.comps.map(comp).join('')}
      <p class="nota">A recuperação fica no passo 2 e o feedback no passo 3.</p>
      <p class="erro" id="fc-dmsg">${esc(msg)}</p>
      <div class="linha-btn"><button class="botao" type="submit">Salvar</button><button class="botao secundario" type="button" id="fc-fechar">Fechar</button></div></form>`;
  };
  const ler = () => {
    const atual = st.fechamentos?.[idFech(st.turma, bim, uid)] ?? {};
    const ajustes = { ...(atual.ajustes ?? {}) };
    const compAjustes = { ...(atual.compAjustes ?? {}) };
    dlg.querySelectorAll('[data-aj]').forEach((el) => { const h = el.dataset.hab; ajustes[h] = { ...(ajustes[h] ?? {}), [el.dataset.aj]: el.value.trim() }; });
    dlg.querySelectorAll('[data-caj]').forEach((el) => { const k = el.dataset.comp; compAjustes[k] = { ...(compAjustes[k] ?? {}), [el.dataset.caj]: el.value.trim() }; });
    const av = dlg.querySelector('input[name="av"]:checked')?.value;
    return { ajustes, compAjustes, ...(av ? { atitude: { mencao: av } } : {}) };
  };
  pintar();
  dlg.onclick = (ev) => { if (ev.target.id === 'fc-fechar') dlg.close(); };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-fech') return;
    ev.preventDefault();
    const dados = ler();
    if ([...Object.values(dados.ajustes), ...Object.values(dados.compAjustes)].some((a) => a.mencao && !a.motivo)) { document.getElementById('fc-dmsg').textContent = 'Escreva o motivo de cada ajuste.'; return; }
    try {
      await gravarFech(st, bim, uid, dados);
      const id = idFech(st.turma, bim, uid);
      st.fechamentos = { ...st.fechamentos, [id]: { ...(st.fechamentos?.[id] ?? {}), ...dados } };
      pintar('Salvo ✓');
    } catch { document.getElementById('fc-dmsg').textContent = 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}

// ---------- passo 2: recuperação ----------
function htmlRecuperacao(st, bim, linhas) {
  const lista = linhas.map((l) => ({ ...l, itens: precisaDeRecuperacao(l.c, l.fech) })).filter((l) => l.itens.length);
  const recomendada = lista.filter((l) => l.itens.some((i) => i.nivel === 'recomendada')).length;
  const marcados = lista.filter((l) => Object.values(l.fech?.recup ?? {}).some((r) => r?.vai)).length;
  const cartao = ({ aluno, c, fech, itens }) => `<li class="fc-rec"><div class="fech-topo"><span class="num">${aluno.numeroChamada ?? '—'}</span><strong>${esc(nomeDe(aluno))}</strong>
      ${MAPA[bim].comps.map((k) => `<span class="par">C${esc(curto(k))} ${chipM(c.comps[k].final)}</span>`).join('')}</div>
      ${itens.map((h) => {
        const r = fech?.recup?.[h.cod] ?? {};
        const imp = c.impactos.find((i) => i.hab === h.cod);
        const sel = r.naoFez ? 'naofez' : (r.resultado ?? '');
        return `<div class="fc-rec-hab"><p><strong>${esc(curto(h.cod))}</strong> ${esc(descCurta(st, h.cod))} · ${h.avaliada ? chipM(h.avaliada) : '<span class="chip sem-evid">faltou</span>'} <span class="chip ${h.nivel === 'recomendada' ? 'm-NA' : ''}">${esc(h.nivel)}</span></p>
          <p class="nota">${h.evid.map((e) => `${esc(e.codigo)}: ${e.m ? esc(e.m) : e.faltou ? 'faltou' : 'sem menção'}`).join(' · ')}${imp ? ` · Se chegar a A, a competência ${esc(curto(imp.comp))} passa de ${esc(imp.de)} para ${esc(imp.para)}.` : ''}</p>
          <label class="check"><input type="checkbox" data-fc="rec-vai" data-uid="${esc(aluno.uid)}" data-hab="${esc(h.cod)}" ${r.vai ? 'checked' : ''}> Vai para a recuperação</label>
          ${r.vai ? `<label>Atividade proposta</label><textarea class="fc-edita" rows="2" data-fc="rec-proposta" data-uid="${esc(aluno.uid)}" data-hab="${esc(h.cod)}">${esc(r.proposta ?? sugestaoRecuperacao(h.cod, st.fases, st.mundo?.habilidades))}</textarea>
            <label>Resultado</label><select data-fc="rec-resultado" data-uid="${esc(aluno.uid)}" data-hab="${esc(h.cod)}"><option value="">em andamento</option>${['A', 'PA', 'NA'].map((m) => `<option ${sel === m ? 'selected' : ''}>${m}</option>`).join('')}<option value="naofez" ${sel === 'naofez' ? 'selected' : ''}>não fez</option></select>` : ''}</div>`;
      }).join('')}</li>`;
  return `<p class="nota">Aparecem aqui os alunos com PA ou NA em alguma habilidade, os que ficaram sem evidência porque faltaram e quem você incluiu. Com NA a recuperação é recomendada; com PA é opcional e você decide. A atividade proposta já vem sugerida pelo critério A da fase; edite à vontade.</p>
    <p><strong>${lista.length}</strong> aluno(s) na lista · <strong>${recomendada}</strong> com recuperação recomendada · <strong>${marcados}</strong> marcado(s) para a recuperação</p>
    <ul class="fech-lista">${lista.map(cartao).join('') || '<li class="vazio">Ninguém precisa de recuperação. 🎉</li>'}</ul>
    <section class="fc-bloco"><h3>Incluir outro aluno na recuperação</h3>
      <p class="nota">Para dar uma nova oportunidade a quem o jogo não apontou: escolha o aluno e a habilidade.</p>
      <div class="form"><label for="fc-inc-aluno">Aluno</label><select id="fc-inc-aluno">${linhas.map((l) => `<option value="${esc(l.aluno.uid)}">${l.aluno.numeroChamada ?? '—'} · ${esc(nomeDe(l.aluno))}</option>`).join('')}</select>
        <label for="fc-inc-hab">Habilidade</label><select id="fc-inc-hab">${MAPA[bim].habs.map((h) => `<option value="${esc(h)}">${esc(curto(h))} · ${esc(descCurta(st, h))}</option>`).join('')}</select></div>
      <div class="linha-btn"><button class="botao secundario" data-acao="fc-incluir">Incluir na recuperação</button></div></section>
    <p class="nota">Quando você lança o resultado, ele substitui a menção da habilidade no quadro e na planilha, e o feedback ganha o texto da recuperação.</p>`;
}

// ---------- passo 3: feedback ----------
function htmlFeedback(st, bim, linhas) {
  if (!linhas.length) return '<p class="vazio">Nenhum aluno ativo.</p>';
  const i = Math.max(0, linhas.findIndex((l) => l.aluno.uid === st.fechFb));
  const { aluno, c, fb } = linhas[i];
  const ant = linhas[i - 1]?.aluno.uid ?? '';
  const prox = linhas[i + 1]?.aluno.uid ?? '';
  const editado = (k) => fb.campos[k] !== fb.rascunho[k];
  return `<p class="nota">Os cinco campos da planilha da coordenação, já com um rascunho no seu estilo: o que ficou adequado e o que ficou parcial em cada fase, a evolução, a recuperação, a participação pelos registros de atitude e o próximo passo. Edite o que quiser: cada campo é salvo ao sair dele. O parágrafo final junta os cinco.</p>
    <div class="fc-nav"><button class="mini" data-acao="fc-fb-ir" data-uid="${esc(ant)}" ${ant ? '' : 'disabled'} aria-label="Aluno anterior">◀</button>
      <select id="fc-fb-aluno" aria-label="Aluno">${linhas.map((l) => `<option value="${esc(l.aluno.uid)}" ${l.aluno.uid === aluno.uid ? 'selected' : ''}>${l.aluno.numeroChamada ?? '—'} · ${esc(nomeDe(l.aluno))}${l.fb.revisado ? ' ✓' : ''}</option>`).join('')}</select>
      <button class="mini" data-acao="fc-fb-ir" data-uid="${esc(prox)}" ${prox ? '' : 'disabled'} aria-label="Próximo aluno">▶</button></div>
    <p>${MAPA[bim].habs.map((h) => `<span class="par">${esc(curto(h))} ${chipM(c.habs[h].final)}</span>`).join(' ')} <span class="par">AV ${chipM(c.atitude.mencao)}</span> ${MAPA[bim].comps.map((k) => `<span class="par">C${esc(curto(k))} ${chipM(c.comps[k].final)}</span>`).join(' ')}</p>
    <div class="form">${CAMPOS_FEEDBACK.map((k) => `<label for="fb-${k.id}">${esc(k.rotulo)}${editado(k.id) ? ' <span class="nota">(editado)</span>' : ''}</label>
      <textarea id="fb-${k.id}" class="fc-edita" rows="${k.id === 'obs' ? 2 : 5}" data-fc="fb" data-campo="${k.id}" data-uid="${esc(aluno.uid)}" placeholder="${k.id === 'recup' ? 'Sem recuperação neste bimestre.' : k.id === 'proposta' ? 'Só quando alguma competência ficar em ND.' : ''}">${esc(fb.campos[k.id])}</textarea>`).join('')}</div>
    <h3>Feedback final</h3>
    <p class="fc-paragrafo" id="fc-paragrafo">${esc(paragrafoFinal(fb.campos)) || '<span class="nota">Vazio.</span>'}</p>
    <div class="linha-btn"><button class="botao" data-acao="fc-fb-revisado" data-uid="${esc(aluno.uid)}" data-prox="${esc(prox)}">${fb.revisado ? 'Revisado ✓ · próximo' : 'Revisado, próximo aluno'}</button>
      <button class="botao secundario" data-acao="fc-fb-copiar">Copiar o parágrafo</button>
      <button class="mini" data-acao="fc-fb-refazer" data-uid="${esc(aluno.uid)}">Refazer o rascunho</button></div>
    <p class="nota" id="fc-msg"></p>`;
}

// ---------- passo 4: baixar ----------
function htmlBaixar(st, bim, linhas) {
  const semEvid = linhas.filter((l) => Object.values(l.c.habs).some((h) => h.semEvidencia)).length;
  const semAv = linhas.filter((l) => !l.c.atitude.confirmada).length;
  const semRev = linhas.filter((l) => !l.fb.revisado).length;
  const andamento = linhas.filter((l) => Object.values(l.fech?.recup ?? {}).some((r) => r?.vai && !r.resultado && !r.naoFez)).length;
  const pend = [
    semEvid && `${semEvid} aluno(s) com habilidade sem evidência`,
    semAv && `${semAv} aluno(s) com Atitudes e Valores ainda não confirmada`,
    andamento && `${andamento} aluno(s) com recuperação em andamento`,
    semRev && `${semRev} feedback(s) ainda não revisado(s)`,
  ].filter(Boolean);
  return `${pend.length ? `<div class="alerta"><strong>Antes de lançar</strong><p>${pend.map(esc).join('; ')}. Dá para baixar assim mesmo e conferir.</p></div>` : '<p class="nota">Tudo pronto: menções completas, atitudes confirmadas e feedbacks revisados. ✓</p>'}
    <section class="fc-bloco"><h3>Planilha da coordenação</h3>
      <p class="nota">Mesmas colunas da aba de Formação Técnica, com todas as competências de ADM na ordem (as do ${bim}º bimestre preenchidas) e os cinco campos de feedback. Confira se a ordem dos números de chamada é a mesma da planilha da coordenação antes de colar. O arquivo tem dados de alunos: guarde só no seu OneDrive.</p>
      <div class="linha-btn"><button class="botao" data-acao="fc-xlsx">Baixar planilha (.xlsx)</button></div>
      <p class="nota">Ou copie direto: clique na primeira célula de habilidade do primeiro aluno na planilha da coordenação e cole (Ctrl+V).</p>
      <div class="linha-btn"><button class="botao secundario" data-acao="fc-copiar" data-id="mencoes">Copiar as menções</button><button class="botao secundario" data-acao="fc-copiar" data-id="feedback">Copiar os feedbacks</button></div>
      <p class="nota" id="fc-msg"></p></section>
    <p class="nota">O PCTD fica em Planejar, na aba "PCTD", porque é enviado no início do bimestre.</p>`;
}

// ---------- ações ----------
export async function tratarFechamento(acao, b, ctx) {
  const { st, dlg, ativos, turma, desenhar } = ctx;
  const bim = bimDe(st);
  const msg = (t, id = 'fc-msg') => { const el = document.getElementById(id); if (el) el.textContent = t; };
  switch (acao) {
    case 'fc-passo': st.fechPasso = b.dataset.id; desenhar(); window.scrollTo(0, 0); return true;
    case 'fc-aluno': abrirAlunoFechamento(st, dlg, b.dataset.uid, ativos, turma); return true;
    case 'fc-direta': {
      const atual = st.fechamentos?.[idFech(st.turma, bim, b.dataset.uid)]?.diretas?.[b.dataset.hab];
      await gravarFech(st, bim, b.dataset.uid, { diretas: { [b.dataset.hab]: atual === b.dataset.m ? deleteField() : b.dataset.m } });
      return true;
    }
    case 'fc-confirmar-av': {
      const linhas = linhasDoFechamento(st, bim, ativos, turma).filter((l) => !l.c.atitude.confirmada);
      await Promise.all(linhas.map((l) => gravarFech(st, bim, l.aluno.uid, { atitude: { mencao: l.c.atitude.sugerida } })));
      return true;
    }
    case 'fc-incluir': {
      const uid = document.getElementById('fc-inc-aluno')?.value;
      const h = document.getElementById('fc-inc-hab')?.value;
      if (uid && h) await gravarFech(st, bim, uid, { recup: { [h]: { vai: true, incluida: true, proposta: sugestaoRecuperacao(h, st.fases, st.mundo?.habilidades) } } });
      return true;
    }
    case 'fc-fb-ir': if (b.dataset.uid) { st.fechFb = b.dataset.uid; desenhar(); } return true;
    case 'fc-fb-revisado': {
      await gravarFech(st, bim, b.dataset.uid, { feedback: { revisado: true } });
      if (b.dataset.prox) st.fechFb = b.dataset.prox;
      desenhar();
      return true;
    }
    case 'fc-fb-refazer': {
      if (!confirm('Apagar o que você escreveu nos cinco campos deste aluno e voltar ao rascunho do jogo?')) return true;
      await gravarFech(st, bim, b.dataset.uid, { feedback: deleteField() });
      return true;
    }
    case 'fc-fb-copiar': {
      const t = document.getElementById('fc-paragrafo')?.textContent ?? '';
      try { await navigator.clipboard.writeText(t); msg('Parágrafo copiado.'); } catch { msg('Não consegui copiar automaticamente neste navegador.'); }
      return true;
    }
    case 'fc-copiar': {
      const texto = linhasParaColar(bim, linhasDoFechamento(st, bim, ativos, turma), { parte: b.dataset.id });
      try { await navigator.clipboard.writeText(texto); msg(b.dataset.id === 'feedback' ? 'Feedbacks copiados. Clique na primeira coluna de feedback do primeiro aluno e cole (Ctrl+V).' : 'Menções copiadas. Clique na célula da primeira habilidade do primeiro aluno e cole (Ctrl+V).'); }
      catch { msg('Não consegui copiar automaticamente neste navegador. Use o arquivo .xlsx.'); }
      return true;
    }
    case 'fc-xlsx': {
      msg('Montando a planilha...');
      try {
        const [{ gerarXlsx, baixarArquivo, TIPO_XLSX }, { planilhaCoordenacao }] = await Promise.all([import('./arquivos.js'), import('./documentos.js')]);
        const abas = planilhaCoordenacao({ bim, turmaNome: turma?.nome || st.turma, linhas: linhasDoFechamento(st, bim, ativos, turma) });
        baixarArquivo(`ADM Quest - FTP ${bim}o bimestre - ${turma?.nome || st.turma}.xlsx`, gerarXlsx(abas), TIPO_XLSX);
        msg('Planilha baixada. Ela está na pasta de downloads.');
      } catch { msg('Não consegui montar a planilha agora.'); }
      return true;
    }
    default: return false;
  }
}

// Campos que salvam sozinhos (recuperação e feedback).
export async function mudarFechamento(el, st) {
  const tipo = el?.dataset?.fc;
  if (!tipo && el?.id !== 'fc-fb-aluno') return false;
  const bim = bimDe(st);
  if (el.id === 'fc-fb-aluno') { st.fechFb = el.value; return 'desenhar'; }
  const { uid, hab } = el.dataset;
  if (tipo === 'rec-vai') {
    await gravarFech(st, bim, uid, { recup: { [hab]: el.checked ? { vai: true, proposta: sugestaoRecuperacao(hab, st.fases, st.mundo?.habilidades) } : { vai: false } } });
  } else if (tipo === 'rec-proposta') {
    await gravarFech(st, bim, uid, { recup: { [hab]: { proposta: el.value.trim() } } });
  } else if (tipo === 'rec-resultado') {
    const v = el.value;
    await gravarFech(st, bim, uid, { recup: { [hab]: { resultado: ['A', 'PA', 'NA'].includes(v) ? v : '', naoFez: v === 'naofez' } } });
  } else if (tipo === 'fb') {
    await gravarFech(st, bim, uid, { feedback: { [el.dataset.campo]: el.value.trim() } });
  }
  return true;
}
