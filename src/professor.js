import { signOut } from 'firebase/auth';
import {
  collection, doc, onSnapshot, query, where, setDoc, updateDoc, deleteDoc, deleteField, getDoc, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { app, tela, esc, hoje, guardar, ler } from './ui.js';
import {
  ESTADOS, ESTADO_ROTULO, SITUACAO_ROTULO, progId, contarTarefas, situacao, estavel, parteAluno,
  etapasDe, normMateriais, liberado, COMO, DIAS_FASE, diaDe,
} from './fases.js';
import { abrirRegistros, atualizarRegistros, registrosAbertos, calcularRadar } from './registros.js';
import { htmlEstatisticas } from './estatisticas.js';
import { abrirRespostasTurma, abrirRespostasAluno, temCampos } from './respostas.js';
import { carteiraDoAluno, abrirAdmBux, htmlAdmBuxMais, pagarRendimento } from './admbuxProfessor.js';
import { htmlVotacaoProfessor, tratarVotacao } from './votacoes.js';
import { htmlFechamento, htmlAno, tratarFechamento, mudarFechamento, lerArquivoTextos } from './fechamentoProfessor.js';
import { fazerBackup, htmlSecaoBackup, lerArquivoBackup, restaurar } from './backup.js';
import { htmlCasteloProfessor, htmlProjecao, tratarCastelo } from './castelo.js';
import { htmlGrupos, htmlGruposDaFase, tratarGrupos, mudarConfigGrupos } from './gruposProfessor.js';
import { atividadeGuilda, configGuilda } from './grupos.js';
import { PRIMEIRO, mundoAtual, mundosLiberados, numeroDoMundo, fasesDoMundo } from './mundos.js';
import { podeExcluir, excluirTurma, arquivarTurma, reativarTurma } from './turmasProfessor.js';
import { htmlAgenda, tratarAgenda, importarCalendario, ligarDicas, roteiroDaFase, htmlBlocos, resumoTurmas, horarioDoTipo, ANO, planejar, seletorBimestre } from './calendario.js';
import { htmlPctd, tratarPctd, mudarPctd } from './pctdProfessor.js';
import { abrirExportacao, exportarAluno } from './exportar.js';
import { htmlTerrenos, abrirTerreno } from './terrenosProfessor.js';
import { formatar } from './agenda.js';
import { htmlSala, tratarSala, faseDaSala, gravarPendentes } from './salaProfessor.js';
import { htmlHoje } from './hojeProfessor.js';
import { nomeDe, comNomes, nomeValido, ordenarAlunos } from './alunos.js';
import { icone, abas, resumoFase, rosto, aviso } from './professorComum.js';
import './professor.css';

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROTULO = { pendente: 'Pendente', ativo: 'Ativo', saiu: 'Saiu', bloqueado: 'Bloqueado' };
const ABAS = ['hoje', 'sala', 'alunos', 'planejar', 'avaliar', 'ajustes'];

function codigoAleatorio() {
  const n = new Uint32Array(5);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join('');
}

function numeroOuNulo(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const linhasDe = (txt) => String(txt ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

function paraLinks(txt) {
  return linhasDe(txt).map((l) => {
    const [a, ...b] = l.split('|');
    const url = (b.length ? b.join('|') : a).trim();
    return { titulo: (b.length ? a : url).trim(), url };
  }).filter((l) => /^https?:\/\//i.test(l.url));
}

const deLinks = (lista) => (lista ?? []).map((l) => `${l.titulo} | ${l.url}`).join('\n');

export function iniciarProfessor(user, opcoes = {}) {
  const st = {
    aba: ABAS.includes(ler('aba')) ? ler('aba') : 'hoje',
    sub: { alunos: 'lista', planejar: 'fases', avaliar: 'turma', ajustes: 'turmas' },
    salaFase: null, salaAluno: null, salaFiltro: 'todos', salaNotas: {}, planFase: null, fichaUid: null, nomes: {},
    cal: null, plano: null, calBim: null,
    turma: ler('turma') || '',
    turmas: [], arquivadas: [], alunos: [], fases: [], mundo: null,
    progresso: {}, aval: {}, comentarios: [], anotacoes: [], profFase: null,
    faseSel: null, importacao: null, aviso: '', painelVista: null,
    carregou: { turmas: false, alunos: false },
  };
  const paradas = [];
  let paradasTurma = [];
  let turmaLigada = null;
  let paraProf = null;
  let profLigada = null;
  let dlg = document.getElementById('dlg');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'dlg';
    document.body.appendChild(dlg);
  }

  // ---------- dados em tempo real ----------
  paradas.push(onSnapshot(collection(db, 'turmas'), (s) => {
    const todas = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.id.localeCompare(b.id));
    // as arquivadas saem do seletor e das telas; aparecem só em Ajustes
    st.turmas = todas.filter((t) => t.arquivada !== true);
    st.arquivadas = todas.filter((t) => t.arquivada === true);
    if (!st.turmas.some((t) => t.id === st.turma)) st.turma = st.turmas[0]?.id ?? '';
    st.carregou.turmas = true;
    ligarTurma();
    desenhar();
  }, () => { st.aviso = 'Não consegui ler as turmas.'; desenhar(); }));

  paradas.push(onSnapshot(collection(db, 'alunos'), (s) => {
    st.alunos = comNomes(s.docs.map((d) => ({ uid: d.id, ...d.data() })), st.nomes);
    st.carregou.alunos = true;
    desenhar();
  }, () => { st.aviso = 'Não consegui ler os alunos.'; desenhar(); }));

  paradas.push(onSnapshot(collection(db, 'nomes'), (s) => {
    st.nomes = Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
    st.alunos = comNomes(st.alunos, st.nomes);
    desenhar();
  }, () => {}));

  // todas as fases de todos os mundos; as telas mostram as do mundo escolhido (ver aplicarMundo)
  st.fasesTodas = []; st.mundos = {}; st.mundoSel = null;
  paradas.push(onSnapshot(collection(db, 'fases'), (s) => { st.fasesTodas = s.docs.map((d) => ({ id: d.id, ...d.data() })); desenhar(); }, () => {}));

  paradas.push(onSnapshot(collection(db, 'mundos'), (s) => {
    st.mundos = Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
    desenhar();
  }, () => {}));

  paradas.push(onSnapshot(doc(db, 'calendario', String(ANO)), (s) => {
    st.cal = s.exists() ? s.data() : null;
    desenhar();
  }, () => {}));

  // roteiros e notas do professor de todas as fases (alimentam a Agenda)
  st.profTodas = {};
  paradas.push(onSnapshot(collection(db, 'fasesProfessor'), (s) => {
    st.profTodas = {};
    s.docs.forEach((d) => { st.profTodas[d.id] = d.data().professor ?? {}; });
    desenhar();
  }, () => {}));
  // data do último backup (aviso depois de sete dias)
  st.cfgBackup = null;
  paradas.push(onSnapshot(doc(db, 'config', 'backup'), (s) => { st.cfgBackup = s.exists() ? s.data() : null; desenhar(); }, () => {}));

  // AdmBux: loja, carteiras (prêmios e rendimentos) e compras de todos os alunos
  st.eco = null; st.carteiras = {}; st.compras = {};
  paradas.push(onSnapshot(doc(db, 'economia', 'geral'), (s) => { st.eco = s.exists() ? s.data() : null; desenhar(); }, () => {}));
  paradas.push(onSnapshot(collection(db, 'carteiras'), (s) => { st.carteiras = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); desenhar(); }, () => {}));
  paradas.push(onSnapshot(collection(db, 'compras'), (s) => { st.compras = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); desenhar(); }, () => {}));

  // planos de todas as turmas: o roteiro é um só e mostra como cabe no horário de cada turma
  st.planos = {};
  paradas.push(onSnapshot(collection(db, 'planos'), (s) => {
    st.planos = Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
    desenhar();
  }, () => {}));
  ligarDicas(app);

  // progresso, avaliações, atitudes e anotações só da turma escolhida
  function ligarTurma() {
    if (turmaLigada === st.turma) return;
    turmaLigada = st.turma;
    paradasTurma.forEach((p) => p());
    paradasTurma = [];
    st.progresso = {}; st.aval = {}; st.comentarios = []; st.anotacoes = []; st.plano = null;
    if (!st.turma) return;
    const dosAlunos = (nome, fn) => paradasTurma.push(onSnapshot(query(collection(db, nome), where('turma', '==', st.turma)), fn, () => {}));
    dosAlunos('progresso', (s) => { st.progresso = {}; s.docs.forEach((d) => { st.progresso[d.id] = d.data(); }); desenhar(); });
    dosAlunos('avaliacoes', (s) => { st.aval = {}; s.docs.forEach((d) => { st.aval[d.id] = d.data(); }); desenhar(); });
    dosAlunos('comentarios', (s) => { st.comentarios = s.docs.map((d) => ({ id: d.id, ...d.data() })); desenhar(); if (registrosAbertos()) atualizarRegistros(); });
    paradasTurma.push(onSnapshot(doc(db, 'planos', st.turma), (s) => { st.plano = s.exists() ? s.data() : null; desenhar(); }, () => {}));
    dosAlunos('anotacoes', (s) => { st.anotacoes = s.docs.map((d) => ({ id: d.id, ...d.data() })); desenhar(); if (registrosAbertos()) atualizarRegistros(); });
    dosAlunos('fechamentos', (s) => { st.fechamentos = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); desenhar(); });
    dosAlunos('votacoes', (s) => { st.votacoes = s.docs.map((d) => ({ id: d.id, ...d.data() })); desenhar(); });
    dosAlunos('votos', (s) => { st.votos = s.docs.map((d) => d.data()); desenhar(); });
    dosAlunos('acertos', (s) => { st.acertos = s.docs.map((d) => ({ id: d.id, ...d.data() })); desenhar(); });
    dosAlunos('grupos', (s) => { st.grupos = s.docs.map((d) => ({ id: d.id, ...d.data() })); desenhar(); });
  }

  // notas do professor da fase aberta no painel
  function ligarProf() {
    if (profLigada === st.faseSel) return;
    profLigada = st.faseSel;
    if (paraProf) { paraProf(); paraProf = null; }
    st.profFase = null;
    if (!st.faseSel) return;
    paraProf = onSnapshot(doc(db, 'fasesProfessor', st.faseSel), (s) => { st.profFase = s.exists() ? s.data() : null; desenhar(); }, () => {});
  }

  const turmaAtual = () => st.turmas.find((t) => t.id === st.turma);
  const estadoDe = (faseId) => turmaAtual()?.estadoFases?.[faseId] ?? 'trancada';
  const alunosDaTurma = () => ordenarAlunos(st.alunos.filter((a) => a.turma === st.turma));
  const ativosDaTurma = () => alunosDaTurma().filter((a) => a.status === 'ativo');
  const pendentesTotal = () => st.alunos.filter((a) => a.status === 'pendente' && !st.arquivadas.some((t) => t.id === a.turma)).length;

  const planoAgenda = () => (st.cal && st.turma ? planejar(st) : null);

  // ---------- telas ----------
  const SECOES = [['hoje', 'Hoje'], ['sala', 'Sala'], ['alunos', 'Alunos'], ['planejar', 'Planejar'], ['avaliar', 'Avaliar']];

  function corpoDaTela() {
    if (st.aba === 'sala') return htmlSala(st, htmlControlesSala());
    if (st.aba === 'alunos') return htmlAlunos();
    if (st.aba === 'planejar') return htmlPlanejar();
    if (st.aba === 'avaliar') return htmlAvaliar();
    if (st.aba === 'ajustes') return htmlAjustes();
    return htmlHoje(st);
  }

  // Mundo mostrado nas telas: o escolhido no seletor ou, por padrão, o atual da turma.
  const listaDeMundos = () => [...new Set([PRIMEIRO, ...Object.keys(st.mundos ?? {})])].sort((a, b) => numeroDoMundo(a) - numeroDoMundo(b));
  function aplicarMundo() {
    const lista = listaDeMundos();
    const quer = st.mundoSel ?? mundoAtual(turmaAtual());
    st.mundoId = lista.includes(quer) ? quer : PRIMEIRO;
    st.mundo = st.mundos?.[st.mundoId] ?? null;
    st.fases = fasesDoMundo(st.fasesTodas, st.mundoId);
  }

  function desenhar() {
    aplicarMundo();
    if (!st.carregou.turmas || !st.carregou.alunos) {
      tela('<p class="carregando">Conferindo a turma...</p>', 'centro');
      return;
    }
    // não redesenha enquanto o professor escreve (perderia o foco e o texto)
    const ativo = document.activeElement;
    if (ativo?.closest?.('#form-turma, .fc-edita') || ativo?.matches?.('[data-sl="nota"], #conf-rest')) { st.redesenhoPendente = true; return; }
    st.redesenhoPendente = false;
    // cada seção lembra a própria fase aberta
    if (st.aba === 'sala') st.faseSel = st.salaFase = faseDaSala(st);
    else st.faseSel = st.aba === 'planejar' && st.sub.planejar === 'fases' ? st.planFase : null;
    ligarProf();
    const faseProj = st.projetando && st.fases.find((x) => x.id === st.faseSel && x.tipo === 'chefao');
    if (faseProj) { document.body.classList.remove('prof'); tela(htmlProjecao(st, faseProj, turmaAtual()), 'pagina projetar'); return; }
    document.body.classList.add('prof');
    const pend = pendentesTotal();
    const botao = (id, rot) => `<button type="button" class="px-nav" data-acao="ir" data-v="${id}" ${st.aba === id ? 'aria-current="page"' : ''}>${icone(id)}<span>${rot}</span>${id === 'alunos' && pend ? `<b class="px-bolha">${pend}</b>` : ''}</button>`;
    const turmas = st.turmas.length > 1 && st.turmas.length <= 4
      ? `<div class="px-turmas" role="group" aria-label="Turma">${st.turmas.map((t) => `<button type="button" data-acao="turma" data-v="${esc(t.id)}" aria-pressed="${t.id === st.turma}" title="${esc(t.nome || t.id)}">${esc(t.teste ? 'Teste' : t.id)}</button>`).join('')}</div>`
      : st.turmas.length ? `<select id="sel-turma" class="px-turma-sel" aria-label="Turma">${st.turmas.map((t) => `<option value="${esc(t.id)}" ${t.id === st.turma ? 'selected' : ''}>${esc(t.nome || t.id)}${t.teste ? ' (teste)' : ''}</option>`).join('')}</select>` : '';
    const mundos = listaDeMundos();
    const seletorMundo = mundos.length > 1 ? `<select id="sel-mundo" class="px-turma-sel" aria-label="Mundo">${mundos.map((m) => `<option value="${esc(m)}" ${m === st.mundoId ? 'selected' : ''}>Mundo ${numeroDoMundo(m)}${mundosLiberados(turmaAtual()).includes(m) ? '' : ' (não liberado)'}</option>`).join('')}</select>` : '';
    // mantém a rolagem da ficha e dos filtros ao redesenhar
    const rolFicha = st.salaTopo ? 0 : app.querySelector('.px-ficha')?.scrollTop ?? 0;
    const rolFiltros = app.querySelector('.px-filtros')?.scrollLeft ?? 0;
    const abertos = new Set([...app.querySelectorAll('details[data-guarda][open]')].map((d) => d.dataset.guarda));
    st.salaTopo = false;
    tela(
      `<aside class="px-lado" aria-label="Seções"><span class="px-marca">ADM Quest</span>${SECOES.map((x) => botao(...x)).join('')}<span class="px-mola"></span>
        <button type="button" class="px-nav jogar" data-acao="jogar">${icone('jogar')}<span>Jogar como teste</span></button>${botao('ajustes', 'Ajustes')}</aside>
      <header class="px-topo"><span class="px-marca">ADM Quest</span>${seletorMundo}${turmas}
        <button type="button" class="px-ic" data-acao="jogar" aria-label="Jogar como teste" title="Jogar como teste">${icone('jogar')}</button>
        <button type="button" class="px-ic" data-acao="ir" data-v="ajustes" aria-label="Ajustes">${icone('ajustes')}</button></header>
      ${st.aviso ? `<p class="px-faixa" role="alert">${esc(st.aviso)}</p>` : ''}
      <main class="px-corpo px-${st.aba}">${corpoDaTela()}</main>
      <nav class="px-base" aria-label="Seções">${SECOES.map((x) => botao(...x)).join('')}</nav>`,
      'prof-tela'
    );
    const fichaNova = app.querySelector('.px-ficha'); if (fichaNova) fichaNova.scrollTop = rolFicha;
    const filtrosNovos = app.querySelector('.px-filtros'); if (filtrosNovos) filtrosNovos.scrollLeft = rolFiltros;
    abertos.forEach((k) => { const d = app.querySelector(`details[data-guarda="${k}"]`); if (d) d.open = true; });
  }

  // o que se libera durante a aula: a parte de segunda inteira, etapas travadas e materiais
  function htmlLiberar(f) {
    const turmaDoc = turmaAtual();
    const temSeg = etapasDe(f).some((e) => e.dia === 'seg');
    const travaveis = [
      ...(temSeg ? [{ id: 'seg', rotulo: 'Parte de segunda (laboratório)', lib: turmaDoc?.liberacoes?.[f.id]?.seg === true }] : []),
      ...etapasDe(f).map((it, i) => ({ item: it, rotulo: `Etapa ${i + 1}: ${it.texto.slice(0, 60)}${it.texto.length > 60 ? '…' : ''}`, chave: 'travada' }))
        .filter((x) => x.item.travada === true).map((x) => ({ id: x.item.id, rotulo: x.rotulo, lib: liberado(turmaDoc, f.id, x.item, 'travada') })),
      ...normMateriais(f).filter((m) => m.travado === true).map((m) => ({ id: m.id, rotulo: `Material: ${m.titulo || m.url}`, lib: liberado(turmaDoc, f.id, m, 'travado') })),
    ];
    return travaveis.length ? `<h3>Liberar durante a aula</h3>
      <ul class="lista">${travaveis.map((x) => `<li class="aluno"><span class="nome">${esc(x.rotulo)}</span><button class="mini ${x.lib ? 'ok' : ''}" data-acao="liberar" data-item="${esc(x.id)}">${x.lib ? 'Liberada ✓ (tocar para travar)' : 'Liberar para a turma'}</button></li>`).join('')}</ul>` : '';
  }

  const ferramentasDaFase = (f) => `${htmlLiberar(f)}${htmlVotacaoProfessor(st, f, ativosDaTurma())}${htmlCasteloProfessor(st, f, turmaAtual())}${htmlGruposDaFase(st, f, turmaAtual(), ativosDaTurma())}`;

  function htmlControlesSala() {
    const f = st.fases.find((x) => x.id === st.faseSel);
    if (!f) return '';
    const dentro = ferramentasDaFase(f);
    return `<details class="px-controles" data-guarda="controles"><summary>Controles da aula <small>liberar etapas, grupos${f.tipo === 'chefao' ? ', baús' : ''}, votação e respostas</small></summary>
      <div class="linha-btn">${temCampos(f) ? `<button class="mini" data-acao="respostas-turma" data-id="${esc(f.id)}">Respostas da turma</button>` : ''}
        <button class="mini" data-acao="ir-fase" data-id="${esc(f.id)}">Roteiro, material e edição</button></div>
      ${dentro}</details>`;
  }

  // ---------- alunos ----------
  function htmlAlunos() {
    if (!st.turmas.length) return '<p class="px-vazio">Crie a primeira turma em Ajustes.</p>';
    if (st.fichaUid) {
      const a = st.alunos.find((x) => x.uid === st.fichaUid);
      if (a) {
        const ficha = htmlEstatisticas({ ...st, painelVista: { tipo: 'aluno', id: a.uid } }).replace(/<button class="mini" data-acao="painel-voltar">← Painel<\/button>/, '');
        return `<div class="linha-btn"><button class="px-btn" data-acao="ficha-voltar">← Alunos</button><button class="px-btn" data-acao="editar" data-uid="${esc(a.uid)}">Editar cadastro</button><button class="px-btn" data-acao="admbux" data-uid="${esc(a.uid)}">🪙 ${carteiraDoAluno(st, a.uid).saldo} AdmBux</button></div><div class="px-card">${ficha}</div>`;
      }
      st.fichaUid = null;
    }
    const lista = alunosDaTurma();
    const ativos = ativosDaTurma();
    const pendentes = lista.filter((a) => a.status === 'pendente');
    const fora = lista.filter((a) => a.status === 'saiu' || a.status === 'bloqueado');
    const radar = new Map(calcularRadar(st).map((x) => [x.aluno.uid, x]));
    const vista = st.sub.alunos;
    const topo = `<div class="px-cab"><div><h1>Alunos</h1><p class="px-sub">${ativos.length} ativo(s)${pendentes.length ? ` · ${pendentes.length} esperando aprovação` : ''}</p></div>
      ${abas('sub', vista, [['lista', 'Turma'], ['radar', `Sem registro (${radar.size})`], ['guildas', 'Guildas']])}</div>`;
    if (vista === 'guildas') return `${topo}${htmlGrupos(st, { atv: atividadeGuilda(st.mundoId), cfg: configGuilda(turmaAtual(), st.mundoId), faseId: null, ativos, titulo: 'Guildas deste mundo' })}`;
    const estados = turmaAtual()?.estadoFases ?? {};
    const abertas = st.fases.filter((f) => !f.arquivada && ['aberta', 'encerrada'].includes(estados[f.id]));
    const outras = pendentesTotal() - pendentes.length;
    const pedidos = pendentes.map((a) => `<li class="px-pend ambar"><div><strong>${esc(nomeDe(a))}</strong><small>Quer entrar · nome de usuário: ${esc(a.apelido)}</small></div><div class="px-linha"><button class="px-btn cheio" data-acao="aprovar" data-uid="${esc(a.uid)}">Aprovar</button><button class="px-btn" data-acao="recusar" data-uid="${esc(a.uid)}">Recusar</button></div></li>`).join('');
    const mostrados = vista === 'radar' ? ativos.filter((a) => radar.has(a.uid)) : ativos;
    const linhas = mostrados.map((a) => {
      let feitas = 0; let pendencias = 0;
      for (const f of abertas) { const p = st.progresso[progId(a.uid, f.id)]; if (p?.concluida) feitas++; else if (estados[f.id] === 'encerrada' || st.aval[progId(a.uid, f.id)]?.faltou) pendencias++; }
      const r = radar.get(a.uid);
      return `<li class="px-linha-aluno">
        <button type="button" class="px-quem" data-acao="ficha-aluno" data-uid="${esc(a.uid)}">${rosto(a)}<span><strong>${esc(nomeDe(a))}</strong><small>${esc(a.apelido)}${a.numeroChamada ? ` · nº ${a.numeroChamada}` : ''}${a.nome ? '' : ' · falta o nome completo'}</small></span></button>
        <span class="px-info"><span class="px-tag">${feitas}/${abertas.length} fases</span>${pendencias ? `<span class="px-tag verm">${pendencias} pendente(s)</span>` : ''}${r ? `<span class="px-tag ambar">${r.nunca ? 'nunca registrado' : `${r.dias} dias sem registro`}</span>` : ''}</span>
        <span class="px-linha"><button class="px-btn" data-acao="registros" data-uid="${esc(a.uid)}">Registrar</button><button class="px-btn leve" data-acao="admbux" data-uid="${esc(a.uid)}" aria-label="AdmBux">🪙 ${carteiraDoAluno(st, a.uid).saldo}</button><button class="px-btn leve" data-acao="editar" data-uid="${esc(a.uid)}">Editar</button></span></li>`;
    }).join('');
    const orfaos = st.alunos.filter((a) => !a.turma);
    const simples = (a, rot) => `<li class="px-linha-aluno"><button type="button" class="px-quem" data-acao="editar" data-uid="${esc(a.uid)}">${rosto(a)}<span><strong>${esc(nomeDe(a))}</strong><small>${rot}</small></span></button></li>`;
    return `${topo}
      ${outras ? `<p class="px-faixa">Há ${outras} cadastro(s) esperando em outra turma.</p>` : ''}
      ${vista === 'lista' && pedidos ? `<ul class="px-pends">${pedidos}</ul>` : ''}
      <ul class="px-lista">${linhas || `<li class="px-vazio">${vista === 'radar' ? 'Todos têm registro recente.' : 'Nenhum aluno ainda. Passe o código da turma, em Ajustes.'}</li>`}</ul>
      ${vista === 'lista' && fora.length ? `<details data-guarda="fora"><summary>Fora da turma ou bloqueados (${fora.length})</summary><ul class="px-lista">${fora.map((a) => simples(a, ROTULO[a.status])).join('')}</ul></details>` : ''}
      ${orfaos.length ? `<h2>Cadastros sem turma (testes antigos)</h2><ul class="lista">${orfaos.map((a) => `<li class="aluno"><span class="nome">${esc(nomeDe(a) || 'Cadastro de teste')}</span><button class="mini ruim" data-acao="recusar" data-uid="${esc(a.uid)}">Apagar</button></li>`).join('')}</ul>` : ''}`;
  }

  // ---------- planejar ----------
  function htmlPlanejar() {
    if (!st.turma) return '<p class="px-vazio">Crie uma turma primeiro, em Ajustes.</p>';
    if (st.sub.planejar === 'fases' && st.planFase) return htmlPainelFase();
    const vista = st.sub.planejar;
    const topo = `<div class="px-cab"><div><h1>Planejar</h1><p class="px-sub">${esc(st.mundo?.nome ?? 'Mundo 1')}</p></div>${abas('sub', vista, [['fases', 'Fases'], ['calendario', 'Calendário'], ['pctd', 'PCTD'], ['terrenos', 'Terrenos']])}</div>`;
    if (vista === 'calendario') return `${topo}${htmlAgenda(st).replace('<h2>Agenda</h2>', '')}`;
    if (vista === 'pctd') { const p = planoAgenda(); return `${topo}${p ? `${seletorBimestre(p)}${htmlPctd(st, p)}` : '<p class="px-vazio">Carregue o calendário primeiro.</p>'}`; }
    if (vista === 'terrenos') return `${topo}${htmlTerrenos(st)}`;
    if (!st.fases.length) return `${topo}<p class="px-vazio">Ainda não há fases. Importe o conteúdo em Ajustes.</p>`;
    const p = st.cal ? planejar({ ...st, calBim: null }) : null;
    const datas = (id) => {
      const it = (t) => p?.ag.itens.find((i) => i.faseId === id && i.din)?.[t];
      return [it('din'), it('cons')].filter(Boolean).map((d) => formatar(d)).join(' e ');
    };
    const linha = (f) => {
      const est = estadoDe(f.id);
      const r = resumoFase(st, f);
      const quando = datas(f.id);
      return `<li class="px-fase ${est}"><button type="button" data-acao="ir-fase" data-id="${esc(f.id)}"><span class="px-cod">${esc(f.codigo)}</span><span><strong>${esc(f.nome)}</strong><small>${quando ? `${quando} · ` : ''}${r.concluidas} de ${r.presentes} concluíram${r.faltas ? ` · ${r.faltas} falta(s)` : ''}</small></span></button>
        <select data-estado="${esc(f.id)}" class="px-estado ${est}" aria-label="Estado da fase ${esc(f.nome)}">${ESTADOS.map((e) => `<option value="${e}" ${e === est ? 'selected' : ''}>${ESTADO_ROTULO[e]}</option>`).join('')}</select></li>`;
    };
    const visiveisFases = st.fases.filter((f) => !f.arquivada);
    return `${topo}<p class="px-sub">Só você libera as fases. O aluno vê "em obra" até você abrir. Encerrada: só edita quem faltou ou quem você liberar.</p>
      <ul class="px-lista">${visiveisFases.map(linha).join('')}</ul>`;
  }

  function htmlPainelFase() {
    const f = st.fases.find((x) => x.id === st.planFase);
    if (!f) { st.planFase = null; return htmlPlanejar(); }
    const est = estadoDe(f.id);
    const turmaDoc = turmaAtual();
    const roteiroDia = (tipo, titulo) => `<details class="roteiro" data-guarda="rot-${tipo}"><summary>${titulo}</summary>
      <ul class="nota">${resumoTurmas(st, roteiroDaFase(st, f, tipo), tipo)}</ul>
      ${htmlBlocos(roteiroDaFase(st, f, tipo), turmaDoc, horarioDoTipo(st.plano, tipo))}
      <button class="mini" data-acao="cal-roteiro" data-id="${esc(f.id)}" data-k="${tipo}">Editar este roteiro</button></details>`;
    const prof = st.profFase?.professor ?? {};
    const material = Object.entries(prof).filter(([k]) => !['cronograma', 'codigos'].includes(k)).map(([k, v]) => {
      const nome = { paraVoce: 'Notas', cartas: 'Cartas de acontecimento', dossies: 'Dossiês', cartasFuncoes: 'Cartas de funções', cartasCrise: 'Cartas de crise', baus: 'Baús e enigmas' }[k] ?? k;
      const item = (x) => (typeof x === 'string' ? esc(x) : Object.entries(x).map(([kk, vv]) => `<strong>${esc(kk)}:</strong> ${esc(vv)}`).join(' · '));
      const lista = Array.isArray(v) ? v.map((x) => `<li>${item(x)}</li>`).join('') : typeof v === 'object' ? Object.entries(v).map(([kk, vv]) => `<li><strong>${esc(kk)}:</strong> ${esc(vv)}</li>`).join('') : `<li>${esc(v)}</li>`;
      return `<h4>${esc(nome)}</h4><ul>${lista}</ul>`;
    }).join('');
    return `<div class="linha-btn"><button class="px-btn" data-acao="voltar-fases">← Fases</button></div>
      <div class="px-cab"><div><h1>${esc(f.codigo)} · ${esc(f.nome)}</h1></div>
        <div class="px-linha"><select data-estado="${esc(f.id)}" class="px-estado ${est}" aria-label="Estado da fase">${ESTADOS.map((e) => `<option value="${e}" ${e === est ? 'selected' : ''}>${ESTADO_ROTULO[e]}</option>`).join('')}</select>
        <button class="px-btn cheio" data-acao="ir-sala" data-id="${esc(f.id)}">Acompanhar na sala</button>
        <button class="px-btn" data-acao="editar-fase" data-id="${esc(f.id)}">Editar fase</button>
        ${temCampos(f) ? `<button class="px-btn" data-acao="respostas-turma" data-id="${esc(f.id)}">Respostas da turma</button>` : ''}</div></div>
      ${f.tipo === 'chefao' ? roteiroDia('din', 'Roteiro do dia do castelo') : `${roteiroDia('din', 'Roteiro da terça (dinâmica, na sala)')}${roteiroDia('cons', 'Roteiro da segunda (laboratório)')}`}
      ${material ? `<details class="roteiro" data-guarda="material"><summary>Material do professor (só você vê)</summary>${material}</details>` : ''}
      ${ferramentasDaFase(f)}`;
  }

  // ---------- avaliar ----------
  function htmlAvaliar() {
    const vista = st.sub.avaliar;
    const topo = `<div class="px-cab"><div><h1>Avaliar</h1></div>${abas('sub', vista, [['turma', 'Visão da turma'], ['fechar', 'Fechar o bimestre'], ['ano', 'Ano']])}</div>`;
    return `${topo}${vista === 'fechar' ? htmlFechamento(st, ativosDaTurma(), turmaAtual()) : vista === 'ano' ? htmlAno(st, ativosDaTurma(), turmaAtual()) : htmlEstatisticas(st)}`;
  }

  // ---------- ajustes ----------
  function htmlAjustes() {
    const vista = st.sub.ajustes;
    const topo = `<div class="px-cab"><div><h1>Ajustes</h1></div>${abas('sub', vista, [['turmas', 'Turmas'], ['recursos', 'Recursos'], ['admbux', 'AdmBux'], ['backup', 'Backup'], ['conteudo', 'Conteúdo'], ['conta', 'Teste e conta']])}</div>`;
    const teste = st.turmas.find((t) => t.teste);
    const corpo = vista === 'recursos' ? htmlRecursos() : vista === 'admbux' ? htmlAdmBuxMais(st, ativosDaTurma())
      : vista === 'backup' ? htmlSecaoBackup(st.cfgBackup, st.previaBackup) : vista === 'conteudo' ? htmlConteudo()
        : vista === 'conta' ? `<section class="px-card"><h2>Jogar como teste</h2><p class="px-sub">Você entra no jogo como um aluno da turma de teste${teste ? ` (${esc(teste.nome || teste.id)})` : ''}. O que fizer lá é gravado só nessa turma, que fica fora de relatórios e backups.</p>
            <div class="px-linha"><button class="px-btn cheio" data-acao="jogar">Jogar agora</button>${teste ? '<button class="px-btn" data-acao="zerar-teste">Zerar meu personagem de teste</button>' : ''}</div></section>
          <section class="px-card"><h2>Conta</h2><p class="px-sub">${esc(user.email ?? '')}</p><button class="px-btn" data-acao="sair">Sair da conta</button></section>` : htmlTurmas();
    return `${topo}${corpo}`;
  }

  // Recursos do jogo que aparecem aos poucos para os alunos, um de cada vez, quando você ligar.
  function htmlRecursos() {
    const r = turmaAtual()?.recursos ?? {};
    const item = (id, nome, texto) => `<li class="aluno"><div class="nome"><strong>${nome}</strong><br><span class="nota">${texto}</span></div>
      <button class="mini ${r[id] ? 'ok cheio' : ''}" data-acao="recurso" data-id="${id}">${r[id] ? 'Ligado ✓' : 'Desligado'}</button></li>`;
    return `<h2>Recursos do jogo nesta turma</h2>
      <p class="nota">Tudo é novo para os alunos. Ligue cada recurso quando a turma estiver pronta; o que acontece antes continua contando.</p>
      <ul class="lista">
        ${item('admbux', 'AdmBux, loja e conquistas', 'As moedas já são contadas desde a primeira fase validada; ao ligar, o aluno vê o saldo acumulado.')}
        ${item('guildas', 'Guildas', 'Botão "Guilda" no menu: integrantes, nome e escudo. Os grupos de cada fase funcionam mesmo desligado.')}
      </ul>`;
  }

  function htmlTurmas() {
    const cartoes = st.turmas.map((t) => `
      <li class="turma-card">
        <div><strong>${esc(t.nome || t.id)}</strong> <span class="nota">(${esc(t.id)})${t.teste ? ' · teste' : ''}</span></div>
        <div class="codigo">${esc(t.codigo)}</div>
        <div class="linha-btn">
          <button class="mini ${t.aberta ? 'ok' : 'ruim'}" data-acao="aberta" data-id="${esc(t.id)}">${t.aberta ? 'Aberta para cadastros' : 'Fechada'}</button>
          <button class="mini" data-acao="codigo" data-id="${esc(t.id)}">Trocar código</button>
          ${listaDeMundos().filter((m) => m !== PRIMEIRO).map((m) => { const ok = mundosLiberados(t).includes(m); return `<button class="mini ${ok ? 'ok cheio' : ''}" data-acao="mundo-liberar" data-id="${esc(t.id)}" data-m="${esc(m)}">${ok ? `Mundo ${numeroDoMundo(m)} liberado ✓` : `Liberar Mundo ${numeroDoMundo(m)}`}</button>`; }).join('')}
          ${podeExcluir(t, st.alunos) ? `<button class="mini ruim" data-acao="turma-excluir" data-id="${esc(t.id)}">Excluir</button>` : `<button class="mini" data-acao="turma-arquivar" data-id="${esc(t.id)}">Arquivar</button>`}
        </div>
      </li>`).join('');
    return `<h2>Turmas</h2>
      <ul class="lista">${cartoes || '<li class="vazio">Nenhuma turma ainda.</li>'}</ul>
      ${st.arquivadas.length ? `<details data-guarda="arquivadas"><summary>Turmas arquivadas (${st.arquivadas.length})</summary><ul class="lista">${st.arquivadas.map((t) => `<li class="turma-card"><div><strong>${esc(t.nome || t.id)}</strong> <span class="nota">(${esc(t.id)}) · nada foi apagado</span></div><div class="linha-btn"><button class="mini" data-acao="turma-reativar" data-id="${esc(t.id)}">Reativar</button></div></li>`).join('')}</ul></details>` : ''}
      <h2>Nova turma</h2>
      <form id="form-turma" class="form" autocomplete="off">
        <label for="t-id">Identificação (ex.: 1A)</label>
        <input id="t-id" maxlength="12" required>
        <label for="t-nome">Nome (ex.: 1º ano A)</label>
        <input id="t-nome" maxlength="40" required>
        <label for="t-codigo">Código de entrada</label>
        <input id="t-codigo" maxlength="10" value="${codigoAleatorio()}" required>
        <label class="check"><input type="checkbox" id="t-teste"> Turma de teste (fica fora de relatórios e backups)</label>
        <button class="botao" type="submit">Criar turma</button>
        <p class="erro" id="msg-turma"></p>
      </form>`;
  }

  function htmlConteudo() {
    const imp = st.importacao;
    const previa = imp ? `
      <div class="previa">
        <p><strong>${esc(imp.nome)}</strong>: mundo "${esc(imp.json.mundo?.nome ?? '')}" com ${imp.itens.length} fase(s).</p>
        <ul class="lista">${imp.itens.map((i) => `<li class="aluno"><span class="cod">${esc(i.codigo)}</span><span class="nome">${esc(i.nome)}</span><span class="chip ${i.estado === 'nova' ? 'ativo' : i.estado === 'alterada' ? 'pendente' : ''}">${i.estado === 'nova' ? 'Nova' : i.estado === 'alterada' ? 'Alterada' : 'Igual'}</span></li>`).join('')}</ul>
        <p class="nota">As fases "alteradas" terão o texto substituído pelo do arquivo, inclusive edições que você fez na tela. Os ids das fases nunca mudam. Se o formato das etapas mudou, o progresso antigo dos alunos nessas fases deixa de contar (só importa em testes).</p>
        <div class="linha-btn"><button class="botao" data-acao="gravar-import">Gravar conteúdo</button><button class="botao secundario" data-acao="descartar-import">Descartar</button></div>
      </div>` : '';
    return `<h2>Importar conteúdo</h2>
      <p class="nota">Escolha o arquivo do mundo (por exemplo, mundo-1.json). Você vê o que muda antes de gravar.</p>
      <input type="file" id="arq" accept=".json,application/json">
      ${previa}
      <h2>Exportar conteúdo</h2>
      <p class="nota">Baixa um arquivo com todas as fases, inclusive as suas notas e edições. Guarde no OneDrive.</p>
      <button class="botao secundario" data-acao="exportar">Exportar conteúdo (.json)</button>
      <p class="erro" id="msg-cont"></p>`;
  }

  // ---------- jogar como teste ----------
  // O professor ganha um personagem na turma de teste e joga de verdade, sem mexer nas turmas reais.
  async function jogarComoTeste() {
    const teste = st.turmas.find((t) => t.teste);
    if (!teste) { st.aba = 'ajustes'; st.sub.ajustes = 'turmas'; falha('Crie uma turma marcada como "Turma de teste" para poder jogar.'); return; }
    const meu = st.alunos.find((a) => a.uid === user.uid);
    if (!meu) await setDoc(doc(db, 'alunos', user.uid), { turma: teste.id, apelido: 'Professor', status: 'ativo', dataEntrada: hoje(), criadoEm: serverTimestamp() });
    else if (meu.turma !== teste.id || meu.status !== 'ativo') await updateDoc(doc(db, 'alunos', user.uid), { turma: teste.id, status: 'ativo' });
    opcoes.jogar?.();
  }

  async function zerarTeste() {
    if (!confirm('Apagar o seu personagem de teste e tudo o que ele fez? As turmas reais não são afetadas.')) return;
    const meu = st.alunos.find((a) => a.uid === user.uid);
    if (!meu) { aviso('Você ainda não tem personagem de teste.'); return; }
    if (st.turmas.find((t) => t.id === meu.turma)?.teste !== true) { falha('O seu personagem não está na turma de teste.'); return; }
    const lote = writeBatch(db);
    (await docsDoAluno(user.uid)).forEach((d) => lote.delete(d.ref));
    for (const c of ['segredos', 'compras', 'carteiras', 'perfis', 'nomes']) {
      const d = await getDoc(doc(db, c, user.uid)); if (d.exists()) lote.delete(d.ref);
    }
    lote.delete(doc(db, 'alunos', user.uid));
    await lote.commit();
    aviso('Personagem de teste zerado');
  }

  // ---------- ações ----------
  function falha(texto) {
    st.aviso = texto; desenhar();
    setTimeout(() => { if (st.aviso === texto) { st.aviso = ''; desenhar(); } }, 6000);
  }

  const refAval = (uid) => doc(db, 'avaliacoes', progId(uid, st.faseSel));
  const baseAval = (uid) => ({ uid, turma: st.turma, fase: st.faseSel, atualizadoEm: serverTimestamp() });

  async function alternarValidada(uid) {
    const atual = st.aval[progId(uid, st.faseSel)]?.validada === true;
    const a = st.alunos.find((x) => x.uid === uid);
    if (atual && !confirm(`Remover a validação de ${a?.apelido ?? 'este aluno'}?`)) return;
    await setDoc(refAval(uid), { ...baseAval(uid), validada: !atual, validadaEm: !atual ? serverTimestamp() : null }, { merge: true });
  }

  async function validarTodos() {
    const f = st.fases.find((x) => x.id === st.faseSel);
    const alvo = ativosDaTurma().filter((a) => {
      const id = progId(a.uid, f.id);
      return st.progresso[id]?.concluida === true && !st.aval[id]?.validada;
    });
    if (!alvo.length) { falha('Ninguém para validar: ou ninguém concluiu, ou todos já estão validados.'); return; }
    if (!confirm(`Validar ${alvo.length} aluno(s) que concluíram?`)) return;
    const lote = writeBatch(db);
    alvo.forEach((a) => lote.set(refAval(a.uid), { ...baseAval(a.uid), validada: true, validadaEm: serverTimestamp() }, { merge: true }));
    await lote.commit();
  }

  async function alternarLiberadoAluno(uid) {
    const atual = st.aval[progId(uid, st.faseSel)]?.liberado === true;
    await setDoc(refAval(uid), { ...baseAval(uid), liberado: !atual }, { merge: true });
  }

  async function alternarLiberacaoItem(itemId, faseId) {
    const f = st.fases.find((x) => x.id === (faseId ?? st.faseSel));
    const atual = turmaAtual()?.liberacoes?.[f.id]?.[itemId] === true;
    await updateDoc(doc(db, 'turmas', st.turma), { [`liberacoes.${f.id}.${itemId}`]: !atual });
  }

  async function mudarEstado(faseId, novo) {
    const campos = { [`estadoFases.${faseId}`]: novo };
    const anterior = turmaAtual()?.datas?.[faseId]?.[novo];
    if (!anterior || novo !== 'aberta') campos[`datas.${faseId}.${novo}`] = hoje();
    await updateDoc(doc(db, 'turmas', st.turma), campos);
  }

  const irPara = (aba, sub) => {
    gravarPendentes();
    st.aba = aba; if (sub) st.sub[aba] = sub;
    st.salaAluno = null; st.planFase = null; st.fichaUid = null; st.painelVista = null;
    guardar('aba', aba); desenhar(); window.scrollTo(0, 0);
  };

  app.onclick = async (e) => {
    // sair do campo de texto ao tocar em outra coisa, para a tela voltar a se atualizar
    const campo = document.activeElement;
    if (campo?.matches?.('[data-sl="nota"], #conf-rest') && !e.target.closest('textarea, input')) campo.blur();
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const acao = b.dataset.acao;
    try {
      if (acao.startsWith('cal-')) {
        await tratarAgenda(acao, b, { st, dlg, desenhar, mudarEstado, alternarSegunda: (id) => alternarLiberacaoItem('seg', id), irParaFase: (id) => { irPara('planejar', 'fases'); st.planFase = id; desenhar(); } });
        return;
      }
      if (acao === 'backup' || acao === 'backup-pasta') {
        try { falha(await fazerBackup({ trocarPasta: acao === 'backup-pasta' })); }
        catch (err) { falha(err?.name === 'AbortError' ? 'Backup cancelado: nenhuma pasta escolhida.' : 'Não consegui fazer o backup. Tente de novo.'); }
        return;
      }
      if (acao === 'restaurar-cancelar') { st.previaBackup = null; desenhar(); return; }
      if (acao === 'restaurar') {
        if (document.getElementById('conf-rest')?.value.trim().toUpperCase() !== 'RESTAURAR') { falha('Digite RESTAURAR para confirmar.'); return; }
        if (!confirm('Última confirmação: gravar de volta todos os documentos deste backup?')) return;
        const n = await restaurar(st.previaBackup.json);
        st.previaBackup = null;
        falha(`Backup restaurado: ${n} documento(s).`);
        return;
      }
      if (acao.startsWith('sl-')) { await tratarSala(acao, b, { st, desenhar }); return; }
      if (acao === 'sair') { signOut(auth); return; }
      if (acao === 'ir') { irPara(b.dataset.v, b.dataset.sub); return; }
      if (acao === 'sub') { st.sub[st.aba] = b.dataset.v; st.planFase = null; st.painelVista = null; desenhar(); return; }
      if (acao === 'turma') { trocarTurma(b.dataset.v); return; }
      if (acao === 'mundo-liberar') {
        const t = st.turmas.find((x) => x.id === b.dataset.id); const m = b.dataset.m; const ja = mundosLiberados(t).includes(m);
        const nome = st.mundos?.[m]?.nome ?? `Mundo ${numeroDoMundo(m)}`;
        if (!confirm(ja ? `Recolher ${nome} de ${t.nome || t.id}? Os alunos deixam de ver esse mundo; nada é apagado.` : `Liberar ${nome} para ${t.nome || t.id}? Os alunos passam a entrar nele.`)) return;
        await updateDoc(doc(db, 'turmas', t.id), { mundos: ja ? (t.mundos ?? []).filter((x) => x !== m) : [...(t.mundos ?? []), m] });
        return;
      }
      if (acao.startsWith('turma-')) { await acaoTurma(acao, b.dataset.id); return; }
      if (acao === 'ir-sala') { irPara('sala'); st.salaFase = b.dataset.id; st.salaFiltro = b.dataset.filtro ?? 'todos'; desenhar(); return; }
      if (acao === 'ir-fase') { irPara('planejar', 'fases'); st.planFase = b.dataset.id; desenhar(); return; }
      if (acao === 'ir-radar') { irPara('alunos', 'radar'); return; }
      if (acao === 'abrir-fase') { if (confirm('Abrir esta fase para a turma?')) await mudarEstado(b.dataset.id, 'aberta'); return; }
      if (acao === 'ficha-aluno') { irPara('alunos'); st.fichaUid = b.dataset.uid; desenhar(); return; }
      if (acao === 'ficha-voltar') { st.fichaUid = null; desenhar(); return; }
      if (acao === 'jogar') { await jogarComoTeste(); return; }
      if (acao === 'zerar-teste') { await zerarTeste(); return; }
      if (acao.startsWith('pc-')) { const p = planoAgenda(); if (p) await tratarPctd(acao, b, { st, p, desenhar, turma: turmaAtual() }); return; }
      if (acao.startsWith('fc-')) { await tratarFechamento(acao, b, { st, dlg, ativos: ativosDaTurma(), turma: turmaAtual(), desenhar }); return; }
      if (acao.startsWith('vt-')) { await tratarVotacao(acao, b, st); return; }
      if (acao.startsWith('cs-')) { if ((await tratarCastelo(acao, b, st, falha)) === 'desenhar') desenhar(); return; }
      if (acao.startsWith('gr-')) { await tratarGrupos(acao, b, { st, dlg, ativos: ativosDaTurma(), falha }); return; }
      if (acao === 'recurso') { const r = turmaAtual()?.recursos?.[b.dataset.id] === true; await updateDoc(doc(db, 'turmas', st.turma), { [`recursos.${b.dataset.id}`]: !r }); return; }
      if (acao === 'exportar-painel') { abrirExportacao(st, dlg); return; }
      if (acao === 'exportar-aluno') { exportarAluno(st, b.dataset.uid); return; }
      if (acao === 'aba') { irPara(b.dataset.v); }
      else if (acao === 'aprovar') { e.stopPropagation(); await updateDoc(doc(db, 'alunos', b.dataset.uid), { status: 'ativo', dataEntrada: hoje() }); }
      else if (acao === 'recusar') {
        e.stopPropagation();
        if (confirm('Recusar este cadastro? O aluno poderá se cadastrar de novo.')) { const lote = writeBatch(db); lote.delete(doc(db, 'alunos', b.dataset.uid)); if (st.nomes[b.dataset.uid]) lote.delete(doc(db, 'nomes', b.dataset.uid)); await lote.commit(); }
      }
      else if (acao === 'editar') { abrirEdicao(b.dataset.uid); }
      else if (acao === 'admbux') { e.stopPropagation(); abrirAdmBux(st, dlg, b.dataset.uid); }
      else if (acao === 'admbux-rendimento') { const m = await pagarRendimento(st, ativosDaTurma()); if (m) falha(m); }
      else if (acao === 'registros') { e.stopPropagation(); abrirRegistros(st, dlg, b.dataset.uid, null); }
      else if (acao === 'registros-fase') { abrirRegistros(st, dlg, b.dataset.uid, st.faseSel); }
      else if (acao === 'ver-aluno') { e.stopPropagation(); opcoes.verComoAluno?.(b.dataset.uid); }
      else if (acao === 'painel-ver') { st.painelVista = { tipo: b.dataset.tipo, id: b.dataset.id }; desenhar(); window.scrollTo(0, 0); }
      else if (acao === 'painel-voltar') { st.painelVista = null; desenhar(); }
      else if (acao === 'voltar-fases') { st.planFase = null; desenhar(); }
      else if (acao === 'validar') { await alternarValidada(b.dataset.uid); }
      else if (acao === 'validar-todos') { await validarTodos(); }
      else if (acao === 'respostas') { abrirRespostasAluno(st, dlg, st.faseSel, b.dataset.uid); }
      else if (acao === 'respostas-turma') { abrirRespostasTurma(st, dlg, b.dataset.id); }
      else if (acao === 'liberar') { await alternarLiberacaoItem(b.dataset.item); }
      else if (acao === 'liberar-aluno') { await alternarLiberadoAluno(b.dataset.uid); }
      else if (acao === 'editar-fase') { abrirEdicaoFase(b.dataset.id); }
      else if (acao === 'terreno') { abrirTerreno({ st, dlg, loteId: b.dataset.lote, faseId: b.dataset.fase }); }
      else if (acao === 'aberta') {
        const t = st.turmas.find((x) => x.id === b.dataset.id);
        const nova = !t.aberta;
        const lote = writeBatch(db);
        lote.update(doc(db, 'turmas', t.id), { aberta: nova });
        lote.update(doc(db, 'codigos', t.codigo), { aberta: nova });
        await lote.commit();
      }
      else if (acao === 'codigo') { await trocarCodigo(b.dataset.id); }
      else if (acao === 'exportar') { await exportarConteudo(); }
      else if (acao === 'gravar-import') { await gravarImportacao(); }
      else if (acao === 'descartar-import') { st.importacao = null; desenhar(); }
    } catch { falha('Não consegui salvar essa alteração. Tente de novo.'); }
  };

  app.onchange = async (e) => {
    try {
      if (await mudarConfigGrupos(e.target, st)) return;
      if (e.target.dataset?.pc && (await mudarPctd(e.target, st, planoAgenda()))) return;
      const fc = await mudarFechamento(e.target, st);
      if (fc) { if (fc === 'desenhar') desenhar(); return; }
      if (e.target.id === 'sel-mundo') { st.mundoSel = e.target.value; st.planFase = null; st.salaFase = null; st.salaAluno = null; st.painelVista = null; desenhar(); return; }
      if (e.target.id === 'sel-turma') { trocarTurma(e.target.value); }
      else if (e.target.dataset?.sl === 'fase') { st.salaFase = e.target.value; st.salaAluno = null; e.target.blur(); desenhar(); }
      else if (e.target.dataset?.sl === 'mostrar') { st.salaMostrar = e.target.checked; }
      else if (e.target.dataset?.estado) {
        const novo = e.target.value;
        if (novo === 'encerrada' && !confirm('Encerrar a fase? Os alunos não poderão mais editar, exceto quem faltou ou quem você liberar.')) { desenhar(); return; }
        await mudarEstado(e.target.dataset.estado, novo);
      }
      else if (e.target.id === 'arq-textos') { await lerArquivoTextos(e.target.files?.[0], st, ativosDaTurma(), turmaAtual()); e.target.blur(); desenhar(); }
      else if (e.target.id === 'arq') { await lerArquivo(e.target.files?.[0]); }
      else if (e.target.id === 'arq-backup') {
        try { st.previaBackup = await lerArquivoBackup(e.target.files[0]); desenhar(); }
        catch { falha('Esse arquivo não é um backup do ADM Quest.'); }
      }
      else if (e.target.id === 'arq-cal') { if (e.target.files?.[0]) await importarCalendario(e.target.files[0], falha); }
      else if (e.target.id === 'painel-aluno') { if (e.target.value) { st.painelVista = { tipo: 'aluno', id: e.target.value }; desenhar(); window.scrollTo(0, 0); } }
    } catch { falha('Não consegui salvar essa alteração. Tente de novo.'); }
  };

  function trocarTurma(id) {
    gravarPendentes();
    st.turma = id; guardar('turma', id);
    st.mundoSel = null;
    st.fechImport = null; st.fechFb = null;
    st.salaAluno = null; st.salaFase = null; st.planFase = null; st.fichaUid = null; st.painelVista = null;
    ligarTurma(); desenhar();
  }

  // o texto da anotação fica guardado enquanto se digita; o redesenho adiado acontece ao sair do campo
  app.oninput = (e) => { if (e.target.dataset?.sl === 'nota') st.salaNotas[e.target.dataset.uid] = e.target.value; };
  app.onfocusout = () => { setTimeout(() => { if (st.redesenhoPendente) desenhar(); }, 250); };
  window.addEventListener('pagehide', gravarPendentes);

  app.onsubmit = async (e) => {
    if (e.target.id !== 'form-turma') return;
    e.preventDefault();
    const msg = document.getElementById('msg-turma');
    const id = document.getElementById('t-id').value.trim().toUpperCase();
    const nome = document.getElementById('t-nome').value.trim();
    const codigo = document.getElementById('t-codigo').value.trim().toUpperCase();
    const teste = document.getElementById('t-teste').checked;
    if (!/^[A-Z0-9_-]{1,12}$/.test(id)) { msg.textContent = 'A identificação usa só letras, números, - ou _.'; return; }
    if (!/^[A-Z0-9]{4,10}$/.test(codigo)) { msg.textContent = 'O código tem de 4 a 10 letras ou números.'; return; }
    if (st.arquivadas.some((t) => t.id === id)) { msg.textContent = 'Há uma turma arquivada com essa identificação. Reative-a ou use outra.'; return; }
    if (st.turmas.some((t) => t.id === id)) { msg.textContent = 'Já existe uma turma com essa identificação.'; return; }
    try {
      if ((await getDoc(doc(db, 'codigos', codigo))).exists()) { msg.textContent = 'Esse código já está em uso. Escolha outro.'; return; }
      const lote = writeBatch(db);
      lote.set(doc(db, 'turmas', id), { nome, codigo, aberta: true, teste, estadoFases: {}, criadoEm: serverTimestamp() });
      lote.set(doc(db, 'codigos', codigo), { turma: id, aberta: true });
      await lote.commit();
      st.turma = id; guardar('turma', id);
    } catch { msg.textContent = 'Não consegui criar a turma agora.'; }
  };

  async function acaoTurma(acao, id) {
    const t = [...st.turmas, ...st.arquivadas].find((x) => x.id === id);
    if (!t) return;
    const nome = t.nome || t.id;
    if (acao === 'turma-reativar') { await reativarTurma(t); aviso(`${nome} reativada, fechada para cadastros`); return; }
    if (acao === 'turma-arquivar') {
      if (!confirm(`Arquivar ${nome}? Ela sai das telas e o código para de aceitar cadastros. Nada é apagado e você pode reativar.`)) return;
      await arquivarTurma(t); aviso(`${nome} arquivada`); return;
    }
    const quantos = st.alunos.filter((a) => a.turma === t.id).length;
    const unica = t.teste && st.turmas.filter((x) => x.teste).length === 1;
    const alerta = t.teste ? ` Os ${quantos} cadastro(s) de teste e tudo o que fizeram serão apagados.${unica ? ' É a única turma de teste: o "Jogar como teste" deixa de funcionar até você criar outra.' : ''}` : '';
    const digitado = prompt(`Excluir ${nome}?${alerta} Isso não pode ser desfeito.\n\nPara confirmar, digite o nome da turma: ${nome}`);
    if (digitado === null) return;
    if (digitado.trim() !== nome) { falha('O nome não confere. Nada foi excluído.'); return; }
    const motivo = await excluirTurma(t, st.alunos);
    if (motivo) falha(motivo); else aviso(`${nome} excluída`);
  }

  async function trocarCodigo(id) {
    const t = st.turmas.find((x) => x.id === id);
    const novo = (prompt('Novo código de entrada (4 a 10 letras ou números):', codigoAleatorio()) || '').trim().toUpperCase();
    if (!novo) return;
    if (!/^[A-Z0-9]{4,10}$/.test(novo)) { falha('O código precisa ter de 4 a 10 letras ou números.'); return; }
    if ((await getDoc(doc(db, 'codigos', novo))).exists()) { falha('Esse código já está em uso.'); return; }
    const lote = writeBatch(db);
    lote.delete(doc(db, 'codigos', t.codigo));
    lote.set(doc(db, 'codigos', novo), { turma: t.id, aberta: t.aberta === true });
    lote.update(doc(db, 'turmas', t.id), { codigo: novo });
    await lote.commit();
  }

  // ---------- importar e exportar conteúdo ----------
  async function lerArquivo(arquivo) {
    if (!arquivo) return;
    let json;
    try { json = JSON.parse(await arquivo.text()); } catch { falha('Esse arquivo não é um JSON válido.'); return; }
    const fases = json?.fases;
    if (json?.formato !== 1 || !json?.mundo?.id || !Array.isArray(fases) || !fases.length) { falha('Esse arquivo não está no formato de conteúdo do jogo.'); return; }
    const ids = new Set();
    for (const f of fases) {
      if (!/^[a-z0-9]{2,20}$/.test(f.id ?? '') || !f.nome || ids.has(f.id)) { falha(`Fase inválida ou repetida no arquivo: ${f.id ?? '(sem id)'}.`); return; }
      ids.add(f.id);
    }
    const existentes = new Map(st.fasesTodas.map((f) => [f.id, f]));
    const itens = fases.map((f) => {
      const atual = existentes.get(f.id);
      let estado = 'nova';
      if (atual) estado = estavel(parteAluno(atual, json.mundo.id)) === estavel(parteAluno(f, json.mundo.id)) ? 'igual' : 'alterada';
      return { id: f.id, codigo: f.codigo ?? '', nome: f.nome, estado };
    });
    st.importacao = { nome: arquivo.name, json, itens };
    desenhar();
  }

  async function gravarImportacao() {
    const imp = st.importacao;
    if (!imp) return;
    const { json } = imp;
    const m = json.mundo;
    const lote = writeBatch(db);
    lote.set(doc(db, 'mundos', m.id), {
      nome: m.nome ?? '', ordem: m.ordem ?? 1, pergunta: m.pergunta ?? '', competencias: m.competencias ?? [],
      guia: m.guia ?? '', chefao: m.chefao ?? '', habilidades: m.habilidades ?? {}, textos: m.textos ?? {}, mapa: m.mapa ?? {}, atualizadoEm: serverTimestamp(),
    });
    for (const f of json.fases) {
      lote.set(doc(db, 'fases', f.id), { ...parteAluno(f, m.id), atualizadoEm: serverTimestamp() });
      // os códigos dos baús cadastrados na tela são mantidos (o arquivo não os conhece)
      const codigos = st.profTodas?.[f.id]?.codigos;
      lote.set(doc(db, 'fasesProfessor', f.id), { mundo: m.id, professor: { ...(f.professor ?? {}), ...(codigos ? { codigos } : {}) }, atualizadoEm: serverTimestamp() });
    }
    await lote.commit();
    st.importacao = null;
    falha(`Conteúdo gravado: ${json.fases.length} fase(s).`);
  }

  async function exportarConteudo() {
    const [mundoDoc, fasesSnap, profSnap] = await Promise.all([
      getDoc(doc(db, 'mundos', st.mundoId)),
      getDocs(query(collection(db, 'fases'), where('mundo', '==', st.mundoId))),
      getDocs(collection(db, 'fasesProfessor')),
    ]);
    const prof = new Map(profSnap.docs.map((d) => [d.id, d.data().professor ?? {}]));
    const m = mundoDoc.exists() ? mundoDoc.data() : {};
    const fases = fasesSnap.docs.map((d) => ({ id: d.id, ...parteAluno(d.data(), st.mundoId), professor: prof.get(d.id) ?? {} }))
      .sort((a, b) => a.ordem - b.ordem)
      .map(({ mundo, ...resto }) => resto);
    const saida = {
      formato: 1,
      mundo: { id: st.mundoId, ordem: m.ordem ?? 1, nome: m.nome ?? '', pergunta: m.pergunta ?? '', competencias: m.competencias ?? [], guia: m.guia ?? '', chefao: m.chefao ?? '', habilidades: m.habilidades ?? {}, textos: m.textos ?? {}, mapa: m.mapa ?? {} },
      fases,
    };
    const blob = new Blob([JSON.stringify(saida, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `conteudo-${st.mundoId}-${hoje()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- janelas ----------
  async function docsDoAluno(uid) {
    const lista = await Promise.all(['progresso', 'avaliacoes', 'comentarios', 'anotacoes'].map((c) => getDocs(query(collection(db, c), where('uid', '==', uid)))));
    return lista.flatMap((s) => s.docs);
  }

  function abrirEdicao(uid) {
    const a = st.alunos.find((x) => x.uid === uid);
    if (!a) return;
    dlg.onclick = null;
    const turmaDoAluno = st.turmas.find((t) => t.id === a.turma);
    const outras = st.turmas.filter((t) => t.id !== a.turma);
    dlg.innerHTML = `
      <form method="dialog" class="form" id="form-aluno">
        <h2>${esc(nomeDe(a))}</h2>
        <label for="e-nome">Nome completo (só você vê)</label>
        <input id="e-nome" maxlength="80" value="${esc(a.nome ?? '')}" placeholder="Nome e sobrenome">
        <label for="e-apelido">Nome de usuário (o que os colegas veem)</label>
        <input id="e-apelido" maxlength="16" value="${esc(a.apelido)}" required>
        <label for="e-num">Número de chamada</label>
        <input id="e-num" type="number" min="1" inputmode="numeric" value="${a.numeroChamada ?? ''}">
        <label for="e-entrada">Data de entrada</label>
        <input id="e-entrada" type="date" value="${esc(a.dataEntrada ?? '')}">
        <label for="e-status">Situação</label>
        <select id="e-status">
          ${['pendente', 'ativo', 'bloqueado', 'saiu'].map((s) => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${ROTULO[s]}</option>`).join('')}
        </select>
        <p class="nota">Para tirar um aluno da turma sem apagar o histórico, escolha "Saiu".</p>
        <p class="erro" id="e-msg"></p>
        <div class="linha-btn">
          <button class="botao" type="submit" value="salvar">Salvar</button>
          <button class="botao secundario" type="button" id="e-cancelar">Cancelar</button>
        </div>
        ${outras.length ? `<hr><label for="e-mover">Mover para outra turma</label>
          <div class="linha-btn"><select id="e-mover">${outras.map((t) => `<option value="${esc(t.id)}">${esc(t.nome || t.id)}</option>`).join('')}</select>
          <button class="mini" type="button" id="e-mover-ok">Mover</button></div>` : ''}
        ${turmaDoAluno?.teste ? '<hr><button class="mini ruim" type="button" id="e-apagar">Apagar este aluno e os dados dele (turma de teste)</button>' : ''}
      </form>`;
    document.getElementById('e-cancelar').onclick = () => dlg.close();
    const mover = document.getElementById('e-mover-ok');
    if (mover) mover.onclick = async () => {
      const destino = document.getElementById('e-mover').value;
      if (!confirm(`Mover ${a.apelido} para a turma ${destino}? As fases dele passam a valer na nova turma.`)) return;
      try {
        const lote = writeBatch(db);
        lote.update(doc(db, 'alunos', a.uid), { turma: destino, numeroChamada: null });
        if (st.nomes[a.uid]) lote.update(doc(db, 'nomes', a.uid), { turma: destino });
        (await docsDoAluno(a.uid)).forEach((d) => lote.update(d.ref, { turma: destino }));
        await lote.commit();
        dlg.close();
      } catch { document.getElementById('e-msg').textContent = 'Não consegui mover agora.'; }
    };
    const apagar = document.getElementById('e-apagar');
    if (apagar) apagar.onclick = async () => {
      if (!confirm(`Apagar ${a.apelido} e todo o progresso dele? Isso não pode ser desfeito.`)) return;
      try {
        const lote = writeBatch(db);
        (await docsDoAluno(a.uid)).forEach((d) => lote.delete(d.ref));
        lote.delete(doc(db, 'alunos', a.uid));
        if (st.nomes[a.uid]) lote.delete(doc(db, 'nomes', a.uid));
        await lote.commit();
        dlg.close();
      } catch { document.getElementById('e-msg').textContent = 'Não consegui apagar agora.'; }
    };
    document.getElementById('form-aluno').onsubmit = async (ev) => {
      ev.preventDefault();
      const msg = document.getElementById('e-msg');
      const apelido = document.getElementById('e-apelido').value.trim();
      const numero = numeroOuNulo(document.getElementById('e-num').value);
      const status = document.getElementById('e-status').value;
      const entrada = document.getElementById('e-entrada').value;
      if (apelido.length < 2) { msg.textContent = 'O apelido precisa ter ao menos 2 letras.'; return; }
      if (numero !== null) {
        const outro = st.alunos.find((x) => x.turma === a.turma && x.uid !== a.uid && x.numeroChamada === numero);
        if (outro) { msg.textContent = `O número ${numero} já é de ${outro.apelido}.`; return; }
      }
      const nomeDigitado = document.getElementById('e-nome').value.trim();
      const nomeNovo = nomeDigitado ? nomeValido(nomeDigitado) : null;
      if (nomeDigitado && !nomeNovo) { msg.textContent = 'Escreva o nome completo, com sobrenome.'; return; }
      const campos = { apelido, status, numeroChamada: numero, dataEntrada: entrada || null };
      if (status === 'saiu' && a.status !== 'saiu') campos.dataSaida = hoje();
      try {
        const lote = writeBatch(db);
        lote.update(doc(db, 'alunos', a.uid), campos);
        if (nomeNovo && nomeNovo !== a.nome) lote.set(doc(db, 'nomes', a.uid), { nome: nomeNovo, turma: a.turma, atualizadoEm: serverTimestamp() });
        await lote.commit(); dlg.close();
      }
      catch { msg.textContent = 'Não consegui salvar agora.'; }
    };
    dlg.showModal();
  }

  // editor completo da fase: etapas (com saiba mais, links, campos e trava), materiais e roteiro
  function abrirEdicaoFase(faseId) {
    const f = st.fases.find((x) => x.id === faseId);
    if (!f) return;
    const ed = {
      nome: f.nome ?? '',
      missao: f.missao ?? '',
      etapas: etapasDe(f).map((e) => ({
        id: e.id, texto: e.texto ?? '', saibaMais: e.saibaMais ?? '', links: deLinks(e.links), travada: e.travada === true, semMarcar: e.semMarcar === true,
        dia: diaDe(e), como: e.como ?? '', opcional: e.opcional === true, excel: e.excel === true,
        campos: e.campos ?? [], camposTxt: (e.campos ?? []).map((c) => (c.dica ? `${c.rotulo} | ${c.dica}` : c.rotulo)).join('\n'),
      })),
      materiais: normMateriais(f).map((m) => ({ id: m.id, titulo: m.titulo ?? '', url: m.url ?? '', descricao: m.descricao ?? '', travado: m.travado === true })),
      roteiro: (st.profFase?.professor?.paraVoce ?? []).join('\n'),
    };

    const proximoId = (lista, prefixo) => `${prefixo}${lista.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0), 0) + 1}`;
    const botoes = (sec, i, n) => `<div class="linha-btn">
      <button type="button" class="mini" data-ed="sobe" data-sec="${sec}" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="mini" data-ed="desce" data-sec="${sec}" data-i="${i}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="mini ruim" data-ed="remove" data-sec="${sec}" data-i="${i}">Remover</button></div>`;

    function pintar() {
      dlg.innerHTML = `
        <form class="form editor" id="form-fase">
          <h2>Editar ${esc(f.codigo)}</h2>
          <label for="f-nome">Nome</label>
          <input id="f-nome" maxlength="60" value="${esc(ed.nome)}" required>
          <label for="f-missao">Missão (o que o aluno lê primeiro)</label>
          <textarea id="f-missao" rows="5">${esc(ed.missao)}</textarea>

          <h3>Passo a passo</h3>
          <p class="nota">Cada etapa é uma coisa que o aluno faz e marca como "feito". Pode ter "saiba mais", links, campos para escrever e ficar travada até você liberar.</p>
          ${ed.etapas.map((e, i) => `<fieldset class="card-ed"><legend>Etapa ${i + 1}</legend>
            <div class="linha-btn">
              <select data-sec="etapas" data-i="${i}" data-f="dia" aria-label="Dia">${Object.entries(DIAS_FASE).map(([k, r]) => `<option value="${k}" ${e.dia === k ? 'selected' : ''}>${r}</option>`).join('')}</select>
              <select data-sec="etapas" data-i="${i}" data-f="como" aria-label="Como"><option value="">Sem ícone</option>${Object.entries(COMO).map(([k, c]) => `<option value="${k}" ${e.como === k ? 'selected' : ''}>${c.icone} ${c.rotulo}</option>`).join('')}</select>
            </div>
            <textarea data-sec="etapas" data-i="${i}" data-f="texto" rows="2" placeholder="Comece com um verbo, até 15 palavras">${esc(e.texto)}</textarea>
            <label class="check"><input type="checkbox" data-sec="etapas" data-i="${i}" data-f="opcional" ${e.opcional ? 'checked' : ''}> Bônus (opcional, não impede concluir)</label>
            <label>Saiba mais (opcional)</label>
            <textarea data-sec="etapas" data-i="${i}" data-f="saibaMais" rows="3">${esc(e.saibaMais)}</textarea>
            <label>Campos para o aluno escrever (um por linha: Rótulo | dica)</label>
            <textarea data-sec="etapas" data-i="${i}" data-f="camposTxt" rows="2" placeholder="Jogos de que você gosta | de celular, de computador...">${esc(e.camposTxt)}</textarea>
            <label>Links (um por linha: Título | endereço)</label>
            <textarea data-sec="etapas" data-i="${i}" data-f="links" rows="2" placeholder="Apresentação da aula | https://...">${esc(e.links)}</textarea>
            <label class="check"><input type="checkbox" data-sec="etapas" data-i="${i}" data-f="travada" ${e.travada ? 'checked' : ''}> Só aparece depois que eu liberar</label>
            <label class="check"><input type="checkbox" data-sec="etapas" data-i="${i}" data-f="semMarcar" ${e.semMarcar ? 'checked' : ''}> Só informação (o aluno não marca "feito")</label>
            ${botoes('etapas', i, ed.etapas.length)}</fieldset>`).join('')}
          <button type="button" class="mini" data-ed="add" data-sec="etapas">+ Etapa</button>

          <h3>Material de apoio</h3>
          ${ed.materiais.map((m, i) => `<fieldset class="card-ed"><legend>Material ${i + 1}</legend>
            <input data-sec="materiais" data-i="${i}" data-f="titulo" placeholder="Título" value="${esc(m.titulo)}">
            <input data-sec="materiais" data-i="${i}" data-f="url" placeholder="https://..." value="${esc(m.url)}">
            <input data-sec="materiais" data-i="${i}" data-f="descricao" placeholder="Descrição curta (opcional)" value="${esc(m.descricao)}">
            <label class="check"><input type="checkbox" data-sec="materiais" data-i="${i}" data-f="travado" ${m.travado ? 'checked' : ''}> Só aparece depois que eu liberar</label>
            ${botoes('materiais', i, ed.materiais.length)}</fieldset>`).join('')}
          <button type="button" class="mini" data-ed="add" data-sec="materiais">+ Material</button>

          <h3>Notas do professor (só você vê)</h3>
          <p class="nota">Lembretes soltos. O roteiro da aula, com os tempos, fica no painel da fase e na Agenda ("Editar este roteiro").</p>
          <textarea id="f-roteiro" rows="5">${esc(ed.roteiro)}</textarea>
          <p class="nota">Habilidades e critérios mudam pelo arquivo de conteúdo.</p>
          <p class="erro" id="f-msg"></p>
          <div class="linha-btn">
            <button class="botao" type="submit">Salvar</button>
            <button class="botao secundario" type="button" id="f-cancelar">Cancelar</button>
          </div>
        </form>`;
    }

    function lerCampos() {
      const nome = document.getElementById('f-nome'); if (!nome) return;
      ed.nome = nome.value; ed.missao = document.getElementById('f-missao').value; ed.roteiro = document.getElementById('f-roteiro').value;
      dlg.querySelectorAll('[data-sec][data-f]').forEach((el) => {
        ed[el.dataset.sec][Number(el.dataset.i)][el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
      });
    }

    pintar();
    dlg.onclick = (ev) => {
      const b = ev.target.closest('[data-ed]');
      if (ev.target.id === 'f-cancelar') { dlg.close(); return; }
      if (!b) return;
      lerCampos();
      const sec = b.dataset.sec; const i = Number(b.dataset.i); const lista = ed[sec];
      if (b.dataset.ed === 'add') {
        if (sec === 'etapas') lista.push({ id: proximoId(lista, 'e'), texto: '', saibaMais: '', links: '', travada: false, semMarcar: false, dia: 'ter', como: '', opcional: false, excel: false, campos: [], camposTxt: '' });
        if (sec === 'materiais') lista.push({ id: proximoId(lista, 'm'), titulo: '', url: '', descricao: '', travado: false });
      } else if (b.dataset.ed === 'remove') {
        if (!confirm('Remover este item?')) return;
        lista.splice(i, 1);
      } else if (b.dataset.ed === 'sobe' && i > 0) { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; }
      else if (b.dataset.ed === 'desce' && i < lista.length - 1) { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; }
      pintar();
    };
    dlg.showModal();

    dlg.onsubmit = async (ev) => {
      if (ev.target.id !== 'form-fase') return;
      ev.preventDefault();
      lerCampos();
      const msg = document.getElementById('f-msg');
      const etapas = ed.etapas.filter((e) => e.texto.trim()).map((e) => {
        const o = { id: e.id, texto: e.texto.trim() };
        if (e.saibaMais.trim()) o.saibaMais = e.saibaMais.trim();
        const campos = linhasDe(e.camposTxt).map((l, i) => {
          const [rot, ...dica] = l.split('|');
          return { id: e.campos?.[i]?.id ?? `c${i + 1}`, rotulo: rot.trim(), ...(dica.join('|').trim() ? { dica: dica.join('|').trim() } : {}) };
        });
        if (campos.length) o.campos = campos;
        const l = paraLinks(e.links); if (l.length) o.links = l;
        if (e.travada) o.travada = true;
        if (e.semMarcar) o.semMarcar = true;
        o.dia = diaDe(e);
        if (e.como) o.como = e.como;
        if (e.opcional) o.opcional = true;
        if (e.excel) o.excel = true;
        return o;
      });
      const materiais = ed.materiais.filter((m) => /^https?:\/\//i.test(m.url.trim())).map((m) => {
        const o = { id: m.id, titulo: m.titulo.trim() || m.url.trim(), url: m.url.trim() };
        if (m.descricao.trim()) o.descricao = m.descricao.trim();
        if (m.travado) o.travado = true;
        return o;
      });
      if (!ed.nome.trim()) { msg.textContent = 'A fase precisa de um nome.'; return; }
      try {
        const lote = writeBatch(db);
        lote.update(doc(db, 'fases', f.id), {
          nome: ed.nome.trim(), missao: ed.missao.trim(), etapas, materiais,
          instrucoes: deleteField(), tarefas: deleteField(), atualizadoEm: serverTimestamp(),
        });
        lote.set(doc(db, 'fasesProfessor', f.id), { mundo: f.mundo ?? PRIMEIRO, professor: { paraVoce: linhasDe(ed.roteiro) }, atualizadoEm: serverTimestamp() }, { merge: true });
        await lote.commit();
        dlg.close();
      } catch { msg.textContent = 'Não consegui salvar agora.'; }
    };
  }

  // O evento "close" chega depois; se outra janela já abriu no lugar (Agenda → Editar o roteiro), não apaga os botões dela.
  dlg.addEventListener('close', () => { if (dlg.open) return; dlg.onclick = null; dlg.onsubmit = null; dlg.onchange = null; dlg.oninput = null; });

  desenhar();

  return () => {
    gravarPendentes();
    window.removeEventListener('pagehide', gravarPendentes);
    document.body.classList.remove('prof');
    document.getElementById('px-aviso')?.remove();
    app.oninput = null; app.onfocusout = null;
    paradas.forEach((p) => p());
    paradasTurma.forEach((p) => p());
    if (paraProf) paraProf();
    app.onclick = null; app.onchange = null; app.onsubmit = null;
    dlg.onclick = null; dlg.onsubmit = null; dlg.onchange = null;
    if (dlg.open) dlg.close();
  };
}
