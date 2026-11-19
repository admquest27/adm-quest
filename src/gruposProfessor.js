// Guildas e grupos do lado do professor: configurar a atividade, sortear, montar, corrigir,
// menção e registro para o grupo inteiro, e aprovar nome e escudo das guildas.
import { doc, collection, writeBatch, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';
import { progId } from './fases.js';
import { MARCAS } from './registros.js';
import { MODOS, ATV_GUILDA, configDaFase, configGuilda, atividadeDaFase, sortear, svgEscudo, nomeGuilda } from './grupos.js';

const apelido = (st, uid) => st.alunos.find((a) => a.uid === uid)?.apelido ?? '(saiu)';
const grupos = (st, atv) => (st.grupos ?? []).filter((g) => g.atividade === atv);
const semGrupo = (st, atv, ativos) => {
  const dentro = new Set(grupos(st, atv).flatMap((g) => g.membros));
  return ativos.filter((a) => !dentro.has(a.uid));
};

// Seção de grupos de uma atividade. faseId: fase em que a menção é dada (null na seção das guildas).
export function htmlGrupos(st, { atv, cfg, faseId, ativos, titulo, mostrarConfig = true }) {
  const lista = grupos(st, atv);
  const sem = semGrupo(st, atv, ativos);
  const ehGuilda = atv === ATV_GUILDA;
  const cartaoGrupo = (g, i) => {
    const p = g.proposta;
    const todos = p && g.membros.every((u) => p.confirmacoes.includes(u));
    return `<li class="grupo-card">
      <div class="grupo-topo">${ehGuilda && g.escudo ? svgEscudo(g.escudo, 32) : ''}<strong>${ehGuilda ? esc(nomeGuilda(g)) : `Grupo ${i + 1}`}</strong> <span class="nota">${g.membros.length} integrante(s)</span></div>
      <div class="chips-membros">${g.membros.map((u) => `<span class="chip">${esc(apelido(st, u))} <button class="x" data-acao="gr-tirar" data-g="${esc(g.id)}" data-uid="${esc(u)}" aria-label="Tirar ${esc(apelido(st, u))} do grupo">×</button></span>`).join('')}
        ${(g.convites ?? []).map((u) => `<span class="chip pendente">${esc(apelido(st, u))} (convidado)</span>`).join('')}</div>
      ${ehGuilda && p ? `<div class="proposta"><span class="nota">Proposta:</span> ${svgEscudo(p.escudo, 28)} <strong>${esc(p.nome)}</strong> <span class="nota">${p.confirmacoes.length}/${g.membros.length} confirmaram${todos ? '' : ' (dá para aprovar mesmo assim)'}</span>
        <div class="linha-btn"><button class="mini ok" data-acao="gr-aprovar" data-g="${esc(g.id)}">Aprovar nome e escudo</button><button class="mini" data-acao="gr-recusar-prop" data-g="${esc(g.id)}">Recusar</button></div></div>` : ''}
      <div class="linha-btn">
        ${faseId ? `<button class="mini" data-acao="gr-mencao" data-g="${esc(g.id)}" data-fase="${esc(faseId)}">Menção do grupo</button>` : ''}
        <button class="mini" data-acao="gr-registro" data-g="${esc(g.id)}" data-fase="${esc(faseId ?? '')}">Registro do grupo</button>
        <button class="mini" data-acao="gr-juntar" data-g="${esc(g.id)}" data-atv="${esc(atv)}">+ marcados</button>
        <button class="mini ruim" data-acao="gr-desfazer" data-g="${esc(g.id)}">Desfazer</button></div></li>`;
  };
  const config = mostrarConfig ? `<div class="gr-config">
      <label>Quem monta <select data-gr-cfg="modo" data-atv="${esc(atv)}">${Object.entries(MODOS).map(([k, r]) => `<option value="${k}" ${cfg.modo === k ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label>Tamanho <select data-gr-cfg="tamanho" data-atv="${esc(atv)}">${[2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${cfg.tamanho === n ? 'selected' : ''}>${n === 2 ? 'dupla' : n === 3 ? 'trio' : `${n} pessoas`}</option>`).join('')}</select></label>
      ${cfg.modo === 'alunos' ? `<button class="mini ${cfg.aberta ? 'ok' : ''}" data-acao="gr-aberta" data-atv="${esc(atv)}">${cfg.aberta ? 'Alunos montando agora ✓ (tocar para fechar)' : 'Abrir para os alunos montarem'}</button>` : ''}
    </div>` : '';
  return `<details class="roteiro grupos" ${lista.length || cfg.aberta ? 'open' : ''}><summary>${titulo} · ${lista.length} grupo(s)${sem.length ? ` · ${sem.length} sem grupo` : ''}</summary>
    ${config}
    <ul class="lista grupos-lista">${lista.map(cartaoGrupo).join('') || '<li class="vazio">Nenhum grupo ainda.</li>'}</ul>
    ${sem.length ? `<h4>Sem grupo <span class="nota">(só você vê)</span></h4>
      <ul class="sem-grupo">${sem.map((a) => `<li><label class="check"><input type="checkbox" data-semgrupo="${esc(atv)}" value="${esc(a.uid)}"> ${esc(a.apelido)}</label></li>`).join('')}</ul>
      <div class="linha-btn"><button class="mini ok" data-acao="gr-sortear" data-atv="${esc(atv)}">Sortear grupos com quem está sem grupo</button><button class="mini" data-acao="gr-novo" data-atv="${esc(atv)}">Novo grupo com os marcados</button></div>
      <p class="nota">Marque alunos e use "+ marcados" num grupo para completar.</p>` : ''}</details>`;
}

// Seção de grupos dentro do painel da fase.
export function htmlGruposDaFase(st, f, turma, ativos) {
  const cfg = configDaFase(turma, f);
  const tipoSel = `<label class="gr-tipo">Esta fase trabalha com <select data-gr-tipo="${esc(f.id)}"><option value="">sem grupos</option><option value="guilda" ${cfg?.tipo === 'guilda' ? 'selected' : ''}>as guildas do mundo</option><option value="fase" ${cfg?.tipo === 'fase' ? 'selected' : ''}>grupos só desta fase</option></select></label>`;
  if (!cfg) return `<h2>Grupos</h2>${tipoSel}`;
  if (cfg.tipo === 'guilda') {
    return `<h2>Grupos</h2>${tipoSel}${htmlGrupos(st, { atv: ATV_GUILDA, cfg: configGuilda(turma), faseId: f.id, ativos, titulo: 'Guildas nesta fase', mostrarConfig: false })}
      <p class="nota">As guildas são montadas na aba Turma.</p>`;
  }
  return `<h2>Grupos</h2>${tipoSel}${htmlGrupos(st, { atv: atividadeDaFase(cfg, f), cfg, faseId: f.id, ativos, titulo: 'Grupos desta fase' })}`;
}

// ---------- ações ----------
const marcados = (atv) => [...document.querySelectorAll(`[data-semgrupo="${atv}"]:checked`)].map((el) => el.value);

function novoGrupo(lote, st, atv, membros) {
  const ref = doc(collection(db, 'grupos'));
  lote.set(ref, { turma: st.turma, atividade: atv, membros, convites: [], criador: 'professor', criadoEm: serverTimestamp() });
  for (const u of membros) lote.set(doc(db, 'vagas', `${atv}_${u}`), { uid: u, turma: st.turma, atividade: atv, grupo: ref.id });
}

export async function tratarGrupos(acao, b, ctx) {
  const { st, dlg, ativos, falha } = ctx;
  const g = (st.grupos ?? []).find((x) => x.id === b.dataset.g);
  const refTurma = doc(db, 'turmas', st.turma);
  const atual = (atv) => st.turmas.find((t) => t.id === st.turma)?.atividades?.[atv] ?? {};
  switch (acao) {
    case 'gr-aberta': {
      const atv = b.dataset.atv;
      const f = st.fases.find((x) => x.id === atv);
      const base = atv === ATV_GUILDA ? configGuilda(st.turmas.find((t) => t.id === st.turma)) : configDaFase(st.turmas.find((t) => t.id === st.turma), f);
      await updateDoc(refTurma, { [`atividades.${atv}`]: { ...base, ...atual(atv), aberta: !base.aberta } });
      return true;
    }
    case 'gr-sortear': {
      const atv = b.dataset.atv;
      const f = st.fases.find((x) => x.id === atv);
      const t = st.turmas.find((x) => x.id === st.turma);
      const tam = (atv === ATV_GUILDA ? configGuilda(t) : configDaFase(t, f))?.tamanho ?? 4;
      const livres = semGrupo(st, atv, ativos).map((a) => a.uid);
      const novos = sortear(livres, tam);
      if (!novos.length) return true;
      if (!confirm(`Sortear ${livres.length} aluno(s) em ${novos.length} grupo(s)?`)) return true;
      const lote = writeBatch(db);
      novos.forEach((m) => novoGrupo(lote, st, atv, m));
      await lote.commit();
      return true;
    }
    case 'gr-novo': {
      const atv = b.dataset.atv;
      const sel = marcados(atv);
      if (!sel.length) { falha('Marque os alunos do novo grupo.'); return true; }
      const lote = writeBatch(db);
      novoGrupo(lote, st, atv, sel);
      await lote.commit();
      return true;
    }
    case 'gr-juntar': {
      const sel = marcados(b.dataset.atv);
      if (!sel.length) { falha('Marque, na lista "Sem grupo", quem vai entrar neste grupo.'); return true; }
      const lote = writeBatch(db);
      lote.update(doc(db, 'grupos', g.id), { membros: [...g.membros, ...sel], convites: (g.convites ?? []).filter((u) => !sel.includes(u)) });
      for (const u of sel) lote.set(doc(db, 'vagas', `${g.atividade}_${u}`), { uid: u, turma: st.turma, atividade: g.atividade, grupo: g.id });
      await lote.commit();
      return true;
    }
    case 'gr-tirar': {
      const u = b.dataset.uid;
      if (!confirm(`Tirar ${apelido(st, u)} deste grupo?`)) return true;
      const lote = writeBatch(db);
      const membros = g.membros.filter((x) => x !== u);
      lote.update(doc(db, 'grupos', g.id), { membros, ...(g.criador === u ? { criador: 'professor' } : {}) });
      lote.delete(doc(db, 'vagas', `${g.atividade}_${u}`));
      await lote.commit();
      return true;
    }
    case 'gr-desfazer': {
      if (!confirm('Desfazer este grupo? Os integrantes voltam para "Sem grupo". As menções já dadas continuam.')) return true;
      const lote = writeBatch(db);
      lote.delete(doc(db, 'grupos', g.id));
      for (const u of g.membros) lote.delete(doc(db, 'vagas', `${g.atividade}_${u}`));
      await lote.commit();
      return true;
    }
    case 'gr-aprovar':
      await updateDoc(doc(db, 'grupos', g.id), { nome: g.proposta.nome, escudo: g.proposta.escudo, proposta: deleteField(), aprovadoEm: serverTimestamp() });
      return true;
    case 'gr-recusar-prop':
      if (confirm('Recusar esta proposta? A guilda pode propor de novo.')) await updateDoc(doc(db, 'grupos', g.id), { proposta: deleteField() });
      return true;
    case 'gr-mencao': dialogoMencao(st, dlg, g, b.dataset.fase); return true;
    case 'gr-registro': dialogoRegistro(st, dlg, g, b.dataset.fase || null); return true;
    default: return false;
  }
}

// Mudanças nos seletores de configuração (quem monta, tamanho, tipo da fase).
export async function mudarConfigGrupos(el, st) {
  const refTurma = doc(db, 'turmas', st.turma);
  const t = st.turmas.find((x) => x.id === st.turma);
  if (el.dataset.grTipo !== undefined) {
    const f = st.fases.find((x) => x.id === el.dataset.grTipo);
    const base = configDaFase(t, f) ?? { tamanho: f.grupo?.tamanho ?? 4, modo: 'alunos', aberta: false };
    await updateDoc(refTurma, { [`atividades.${f.id}`]: el.value ? { ...base, tipo: el.value } : { ...base, tipo: 'nenhum' } });
    return true;
  }
  if (el.dataset.grCfg) {
    const atv = el.dataset.atv;
    const f = st.fases.find((x) => x.id === atv);
    const base = atv === ATV_GUILDA ? configGuilda(t) : configDaFase(t, f);
    const valor = el.dataset.grCfg === 'tamanho' ? Number(el.value) : el.value;
    await updateDoc(refTurma, { [`atividades.${atv}`]: { ...base, [el.dataset.grCfg]: valor, ...(el.dataset.grCfg === 'modo' && valor !== 'alunos' ? { aberta: false } : {}) } });
    return true;
  }
  return false;
}

function dialogoMencao(st, dlg, g, faseId) {
  const f = st.fases.find((x) => x.id === faseId);
  const habs = f?.habilidades ?? [];
  const presentes = g.membros.filter((u) => st.aval[progId(u, faseId)]?.faltou !== true);
  const ausentes = g.membros.filter((u) => !presentes.includes(u));
  const escolha = {};
  const pintar = () => {
    dlg.innerHTML = `<div class="form"><h2>Menção do grupo · ${esc(f?.codigo ?? '')}</h2>
      <p>Vale para: ${presentes.map((u) => esc(apelido(st, u))).join(', ') || 'ninguém presente'}.</p>
      ${ausentes.length ? `<p class="nota">Fica de fora quem faltou: ${ausentes.map((u) => esc(apelido(st, u))).join(', ')}.</p>` : ''}
      ${habs.map((cod) => `<p><strong>${esc(cod)}</strong>${(f.porGrupo ?? []).includes(cod) ? ' <span class="chip">avaliada em grupo</span>' : ''}</p>
        <div class="mencoes-botoes">${['A', 'PA', 'NA'].map((m) => `<button type="button" class="mini ${escolha[cod] === m ? `m-${m} cheio` : ''}" data-hab="${esc(cod)}" data-m="${m}">${m}</button>`).join('')}</div>`).join('')}
      <p class="nota">Depois, dá para mudar a menção de um aluno só, pelo botão Menção dele.</p>
      <p class="erro" id="gm-msg"></p>
      <div class="linha-btn"><button class="botao" id="gm-ok" ${Object.keys(escolha).length && presentes.length ? '' : 'disabled'}>Aplicar a ${presentes.length} aluno(s)</button><button class="botao secundario" id="gm-fechar">Fechar</button></div></div>`;
  };
  pintar();
  dlg.onclick = async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'gm-fechar') { dlg.close(); return; }
    if (b.dataset.hab) { escolha[b.dataset.hab] = escolha[b.dataset.hab] === b.dataset.m ? undefined : b.dataset.m; if (!escolha[b.dataset.hab]) delete escolha[b.dataset.hab]; pintar(); return; }
    if (b.id === 'gm-ok') {
      const lote = writeBatch(db);
      for (const u of presentes) lote.set(doc(db, 'avaliacoes', progId(u, faseId)), { uid: u, turma: st.turma, fase: faseId, mencoes: escolha, atualizadoEm: serverTimestamp() }, { merge: true });
      try { await lote.commit(); dlg.close(); } catch { document.getElementById('gm-msg').textContent = 'Não consegui salvar agora.'; }
    }
  };
  dlg.showModal();
}

function dialogoRegistro(st, dlg, g, faseId) {
  dlg.innerHTML = `<form class="form" id="form-gr-reg"><h2>Registro do grupo</h2>
    <p>Vale para: ${g.membros.map((u) => esc(apelido(st, u))).join(', ')}.</p>
    <label for="gr-marca">Marca</label><select id="gr-marca">${MARCAS.map((m) => `<option value="${esc(m.nome)}">${esc(m.nome)}</option>`).join('')}</select>
    <label for="gr-tipo">Tipo</label><select id="gr-tipo"><option value="positivo">Positivo</option><option value="atencao">Ponto de atenção</option><option value="livre">Observação</option></select>
    <label for="gr-texto">O que aconteceu</label><textarea id="gr-texto" rows="3" maxlength="300" required></textarea>
    <label class="check"><input type="checkbox" id="gr-visivel"> Mostrar aos alunos do grupo</label>
    <p class="nota">Cada integrante recebe o registro na própria ficha. Um registro positivo e visível vale AdmBux para cada um.</p>
    <p class="erro" id="gr-msg"></p>
    <div class="linha-btn"><button class="botao" type="submit">Registrar</button><button class="botao secundario" type="button" id="gr-fechar">Fechar</button></div></form>`;
  dlg.onclick = (ev) => { if (ev.target.id === 'gr-fechar') dlg.close(); };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-gr-reg') return;
    ev.preventDefault();
    const texto = document.getElementById('gr-texto').value.trim();
    if (!texto) return;
    const lote = writeBatch(db);
    for (const u of g.membros) {
      lote.set(doc(collection(db, 'comentarios')), {
        uid: u, turma: st.turma, fase: faseId, criadoEm: serverTimestamp(), marca: document.getElementById('gr-marca').value,
        tipoAtitude: document.getElementById('gr-tipo').value, texto, visivel: document.getElementById('gr-visivel').checked,
      });
    }
    try { await lote.commit(); dlg.close(); } catch { document.getElementById('gr-msg').textContent = 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}
