// Tela "Sala": um cartão por aluno na fase escolhida e, ao tocar, a ficha com menção, falta, atitude e anotação.
// Feita para o celular, circulando entre as mesas; no computador a ficha abre ao lado.
import { collection, doc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc, hoje } from './ui.js';
import { progId, ESTADOS, ESTADO_ROTULO } from './fases.js';
import { MARCAS } from './registros.js';
import { temCampos } from './respostas.js';
import { planejar } from './calendario.js';
import { carteiraDoAluno } from './admbuxProfessor.js';
import { nomeDe, nomeCurto } from './alunos.js';
import { estadoDe, ativosDaTurma, rosto, resumoFase, pontoDoAluno, tagMencao, aviso } from './professorComum.js';

// atitudes de um toque; as demais frases ficam em "Todas as atitudes"
const RAPIDAS = [
  ['colaborativa', 'positivas', 0, 'Ajudou um colega'],
  ['empreendedora', 'positivas', 0, 'Teve iniciativa'],
  ['critica', 'positivas', 0, 'Argumentou bem'],
  ['tecnico', 'positivas', 0, 'Usou os conceitos'],
  ['resultados', 'atencao', 2, 'Distraído no celular'],
  ['empreendedora', 'atencao', 2, 'Demorou a começar'],
  ['colaborativa', 'atencao', 0, 'Fora do grupo'],
];
const FILTROS = [['todos', 'Todos'], ['validar', 'Para validar'], ['andando', 'Fazendo'], ['parado', 'Parados'], ['validada', 'Validadas'], ['falta', 'Faltas']];

// Fase que abre sozinha: a da aula de hoje; senão a primeira aberta; senão a última encerrada.
export function faseDaSala(st) {
  const normais = st.fases.filter((f) => !f.arquivada);
  if (st.salaFase && normais.some((f) => f.id === st.salaFase)) return st.salaFase;
  const p = st.cal && st.turma ? planejar({ ...st, calBim: null }) : null;
  const deHoje = p?.dias.get(hoje())?.itens.find((i) => i.faseId && normais.some((f) => f.id === i.faseId))?.faseId;
  if (deHoje) return deHoje;
  return (normais.find((f) => estadoDe(st, f.id) === 'aberta') ?? [...normais].reverse().find((f) => estadoDe(st, f.id) === 'encerrada') ?? normais[0])?.id ?? null;
}

const visiveis = (st, f) => ativosDaTurma(st).filter((a) => (st.salaFiltro ?? 'todos') === 'todos' || pontoDoAluno(st, f, a.uid).chave === st.salaFiltro);

function cartao(st, f, a) {
  const s = pontoDoAluno(st, f, a.uid);
  const m = Object.values(s.v?.mencoes ?? {}).filter(Boolean);
  const pct = s.total ? Math.round((100 * s.feitas) / s.total) : 0;
  return `<button type="button" class="px-al ${s.cor}" data-acao="sl-abrir" data-uid="${esc(a.uid)}" aria-pressed="${st.salaAluno === a.uid}">
    <span class="px-al-topo">${rosto(a)}<span class="px-al-nome"><strong>${esc(nomeCurto(a))}</strong><small>${esc(a.apelido)}</small></span></span>
    <span class="px-barra"><i style="width:${pct}%"></i></span>
    <span class="px-al-pe"><span class="px-tag ${s.cor}">${s.rotulo}</span>${m.length ? m.map(tagMencao).join('') : `<small>${s.feitas}/${s.total}</small>`}</span></button>`;
}

function ficha(st, f) {
  const a = st.alunos.find((x) => x.uid === st.salaAluno);
  if (!a) return '';
  const s = pontoDoAluno(st, f, a.uid);
  const habs = st.mundo?.habilidades ?? {};
  const registros = [
    ...st.comentarios.filter((c) => c.uid === a.uid).map((c) => ({ quando: c.criadoEm?.toMillis?.() ?? Date.now(), texto: c.texto, classe: c.tipoAtitude === 'atencao' ? 'ambar' : 'verde', quem: c.visivel ? 'o aluno vê' : '' })),
    ...(st.anotacoes ?? []).filter((c) => c.uid === a.uid).map((c) => ({ quando: c.criadoEm?.toMillis?.() ?? Date.now(), texto: c.texto, classe: 'azul', quem: 'só você' })),
  ].sort((x, y) => y.quando - x.quando).slice(0, 3);
  const mencoes = (f.habilidades ?? []).map((cod) => {
    const atual = s.v?.mencoes?.[cod] ?? '';
    return `<div class="px-hab"><div class="px-hab-nome"><strong>${esc(cod.replace('EMT1ADM', ''))}</strong> <span>${esc(habs[cod] ?? '')}</span></div>
      <div class="px-seg">${[['A', 'verde'], ['PA', 'ambar'], ['NA', 'verm']].map(([m, c]) => `<button type="button" class="${c}" data-acao="sl-mencao" data-uid="${esc(a.uid)}" data-h="${esc(cod)}" data-m="${m}" aria-pressed="${atual === m}">${m}</button>`).join('')}</div>
      <details class="px-crit"><summary>Critérios</summary><dl>${['A', 'PA', 'NA'].map((m) => `<dt>${m}</dt><dd>${esc(f.criterios?.[cod]?.[m] ?? '')}</dd>`).join('')}</dl></details></div>`;
  }).join('');
  return `<div class="px-veu" data-acao="sl-fechar"></div><section class="px-ficha" aria-label="Ficha de ${esc(nomeDe(a))}">
    <header>${rosto(a)}<div><h2>${esc(nomeDe(a))}</h2><p>${esc(a.apelido)}${a.numeroChamada ? ` · nº ${a.numeroChamada}` : ''} · <span class="px-tag ${s.cor}">${s.rotulo}</span> ${s.feitas}/${s.total} etapas</p></div>
      <button type="button" class="px-x" data-acao="sl-fechar" aria-label="Fechar">✕</button></header>
    ${mencoes ? `<div><h3>Menção <small>tocar já valida a fase</small></h3>${mencoes}</div>` : ''}
    <div class="px-linha">
      <button type="button" class="px-btn ${s.v?.validada ? 'verde' : 'cheio'}" data-acao="validar" data-uid="${esc(a.uid)}">${s.v?.validada ? 'Validada ✓' : 'Validar'}</button>
      <button type="button" class="px-btn ${s.v?.faltou ? 'verm' : ''}" data-acao="sl-falta" data-uid="${esc(a.uid)}">${s.v?.faltou ? 'Faltou ✓' : 'Faltou'}</button>
      ${estadoDe(st, f.id) === 'encerrada' && !s.p?.concluida ? `<button type="button" class="px-btn ${s.v?.liberado ? 'verde' : ''}" data-acao="liberar-aluno" data-uid="${esc(a.uid)}">${s.v?.liberado ? 'Liberado ✓' : 'Liberar para fazer'}</button>` : ''}
    </div>
    <div><h3>Atitude</h3>
      <div class="px-chips">${RAPIDAS.map(([marca, lista, i, rot], k) => `<button type="button" class="${lista === 'atencao' ? 'atn' : 'pos'}" data-acao="sl-atitude" data-uid="${esc(a.uid)}" data-k="${k}" title="${esc(MARCAS.find((x) => x.id === marca)[lista][i])}">${lista === 'atencao' ? '⚠️' : '👍'} ${rot}</button>`).join('')}
        <button type="button" data-acao="registros-fase" data-uid="${esc(a.uid)}">Todas as atitudes…</button></div>
      <label class="px-check"><input type="checkbox" data-sl="mostrar" ${st.salaMostrar ? 'checked' : ''}> O aluno pode ver a próxima atitude</label></div>
    <div><h3>Anotação <small>só você vê</small></h3>
      <textarea data-sl="nota" data-uid="${esc(a.uid)}" rows="2" maxlength="1000" placeholder="Dite ou escreva o que conversaram">${esc(st.salaNotas?.[a.uid] ?? '')}</textarea>
      <button type="button" class="px-btn" data-acao="sl-nota" data-uid="${esc(a.uid)}">Salvar anotação</button>
      ${registros.length ? `<ul class="px-recentes">${registros.map((r) => `<li class="${r.classe}"><small>${new Date(r.quando).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}${r.quem ? ` · ${r.quem}` : ''}</small> ${esc(r.texto)}</li>`).join('')}</ul>` : ''}</div>
    <div class="px-linha discreta">
      ${temCampos(f) ? `<button type="button" class="px-btn leve" data-acao="respostas" data-uid="${esc(a.uid)}">Respostas</button>` : ''}
      <button type="button" class="px-btn leve" data-acao="ficha-aluno" data-uid="${esc(a.uid)}">Ficha completa</button>
      <button type="button" class="px-btn leve" data-acao="admbux" data-uid="${esc(a.uid)}">🪙 ${carteiraDoAluno(st, a.uid).saldo}</button>
      <button type="button" class="px-btn leve" data-acao="ver-aluno" data-uid="${esc(a.uid)}">Ver como aluno</button>
    </div>
    <div class="px-passos"><button type="button" class="px-btn" data-acao="sl-passo" data-d="-1" aria-label="Aluno anterior">←</button><button type="button" class="px-btn cheio" data-acao="sl-passo" data-d="1">Próximo aluno →</button></div>
  </section>`;
}

export function htmlSala(st, controles) {
  if (!st.turma) return '<p class="px-vazio">Crie uma turma em Ajustes.</p>';
  const f = st.fases.find((x) => x.id === st.faseSel);
  if (!f) return '<p class="px-vazio">Ainda não há fases. Importe o conteúdo em Ajustes.</p>';
  const est = estadoDe(st, f.id);
  const r = resumoFase(st, f);
  const ativos = ativosDaTurma(st);
  const conta = (k) => (k === 'todos' ? ativos.length : ativos.filter((a) => pontoDoAluno(st, f, a.uid).chave === k).length);
  const lista = visiveis(st, f);
  const pct = r.presentes ? Math.round((100 * r.concluidas) / r.presentes) : 0;
  return `<div class="px-cab">
      <div class="px-escolha"><h1>Sala</h1>
        <select data-sl="fase" aria-label="Fase">${st.fases.filter((x) => !x.arquivada).map((x) => `<option value="${esc(x.id)}" ${x.id === f.id ? 'selected' : ''}>${esc(x.codigo)} · ${esc(x.nome)} (${ESTADO_ROTULO[estadoDe(st, x.id)].toLowerCase()})</option>`).join('')}</select>
        <select data-estado="${esc(f.id)}" aria-label="Estado da fase" class="px-estado ${est}">${ESTADOS.map((e) => `<option value="${e}" ${e === est ? 'selected' : ''}>${ESTADO_ROTULO[e]}</option>`).join('')}</select>
      </div>
      <button type="button" class="px-btn" data-acao="validar-todos" ${r.paraValidar ? '' : 'disabled'}>Validar quem concluiu (${r.paraValidar})</button>
    </div>
    <p class="px-sub">${r.concluidas} de ${r.presentes} presentes concluíram (${pct}%)${pct >= 80 ? ' · meta de 80% atingida' : ''}${r.faltas ? ` · ${r.faltas} falta(s)` : ''}</p>
    ${controles}
    <div class="px-filtros">${FILTROS.map(([id, rot]) => `<button type="button" data-acao="sl-filtro" data-v="${id}" aria-pressed="${(st.salaFiltro ?? 'todos') === id}">${rot} <b>${conta(id)}</b></button>`).join('')}</div>
    <div class="px-duas ${st.salaAluno ? 'com' : ''}">
      <div class="px-grade">${lista.map((a) => cartao(st, f, a)).join('') || `<p class="px-vazio">${ativos.length ? 'Ninguém neste filtro.' : 'Nenhum aluno ativo nesta turma ainda.'}</p>`}</div>
      ${ficha(st, f)}
    </div>`;
}

// Atitude com alguns segundos para desfazer: o registro não pode ser apagado depois de gravado.
const pendentes = new Set();
function registrarAtitude(st, uid, k) {
  const [marca, lista, i] = RAPIDAS[k];
  const m = MARCAS.find((x) => x.id === marca);
  const dados = { uid, turma: st.turma, fase: st.faseSel, marca: m.nome, tipoAtitude: lista === 'atencao' ? 'atencao' : 'positivo', texto: m[lista][i], visivel: st.salaMostrar === true };
  const gravar = () => { pendentes.delete(gravar); clearTimeout(t); addDoc(collection(db, 'comentarios'), { ...dados, criadoEm: serverTimestamp() }).catch(() => aviso('Não consegui registrar a atitude.')); };
  const t = setTimeout(gravar, 4000);
  pendentes.add(gravar);
  const a = st.alunos.find((x) => x.uid === uid);
  aviso(`${nomeCurto(a)}: ${dados.texto.toLowerCase()}`, { tempo: 4000, desfazer: () => { clearTimeout(t); pendentes.delete(gravar); aviso('Registro desfeito'); } });
  st.salaMostrar = false;
}
// grava na hora o que ainda estava esperando (ao sair do painel ou fechar a página)
export const gravarPendentes = () => [...pendentes].forEach((g) => g());

export async function tratarSala(acao, b, { st, desenhar }) {
  const uid = b.dataset.uid;
  const f = st.fases.find((x) => x.id === st.faseSel);
  const ref = () => doc(db, 'avaliacoes', progId(uid, st.faseSel));
  const base = () => ({ uid, turma: st.turma, fase: st.faseSel, atualizadoEm: serverTimestamp() });
  if (acao === 'sl-abrir') { st.salaAluno = st.salaAluno === uid ? null : uid; st.salaMostrar = false; desenhar(); }
  else if (acao === 'sl-fechar') { st.salaAluno = null; desenhar(); }
  else if (acao === 'sl-filtro') { st.salaFiltro = b.dataset.v; st.salaAluno = null; desenhar(); }
  else if (acao === 'sl-passo') {
    const todos = ativosDaTurma(st);
    const i = todos.findIndex((a) => a.uid === st.salaAluno);
    const passo = Number(b.dataset.d);
    const serve = new Set(visiveis(st, f).map((a) => a.uid));
    for (let k = 1; k <= todos.length; k++) {
      const a = todos[(i + passo * k + todos.length * k) % todos.length];
      if (serve.has(a.uid) && a.uid !== st.salaAluno) { st.salaAluno = a.uid; st.salaMostrar = false; st.salaTopo = true; desenhar(); return; }
    }
    aviso('Não há outro aluno neste filtro');
  } else if (acao === 'sl-mencao') {
    const atual = st.aval[progId(uid, st.faseSel)]?.mencoes?.[b.dataset.h] ?? '';
    const nova = atual === b.dataset.m ? null : b.dataset.m;
    const dados = { ...base(), mencoes: { [b.dataset.h]: nova } };
    if (nova) { dados.validada = true; dados.validadaEm = serverTimestamp(); dados.faltou = false; }
    setDoc(ref(), dados, { merge: true }).catch(() => aviso('Não consegui salvar a menção.'));
    aviso(nova ? `${nova} salvo e fase validada` : 'Menção retirada');
  } else if (acao === 'sl-falta') {
    const faltou = !(st.aval[progId(uid, st.faseSel)]?.faltou === true);
    setDoc(ref(), { ...base(), faltou, ...(faltou ? { validada: false, validadaEm: null } : {}) }, { merge: true }).catch(() => aviso('Não consegui salvar a falta.'));
    aviso(faltou ? 'Falta marcada' : 'Falta desfeita');
  } else if (acao === 'sl-atitude') registrarAtitude(st, uid, Number(b.dataset.k));
  else if (acao === 'sl-nota') {
    const texto = (st.salaNotas?.[uid] ?? '').trim();
    if (!texto) { aviso('Escreva a anotação primeiro'); return; }
    delete st.salaNotas[uid];
    addDoc(collection(db, 'anotacoes'), { uid, turma: st.turma, fase: st.faseSel, texto, criadoEm: serverTimestamp() }).catch(() => { st.salaNotas[uid] = texto; aviso('Não consegui salvar a anotação.'); });
    aviso('Anotação salva');
    desenhar();
  }
}
